// @vitest-environment jsdom
/*
 * Attacks on the browser side of accounts and sessions. Every test asserts the SECURE behaviour.
 *
 * Fixed on 2026-10-07 (migration 20261007120000_security_fixes.sql and the app): every weakness this file
 * found now runs as a plain `it` that guards its fix; the comment above each test says what it was.
 *
 * `it.fails(...)` marks a real weakness found by the audit: the secure behaviour does not hold today, so the
 * test is expected to fail. When the fix lands Vitest reports that it now passes; drop `.fails` then, so the
 * test keeps guarding the fix. The fix is in the VULN comment above each one.
 *
 * Most tests run the app's own code over the REAL supabase-js (the version in node_modules) with only the
 * network replaced: a stand-in for Supabase Auth and PostgREST that records every request. So what is asserted
 * is what supabase-js really sends and stores, not what a mock was told. Nothing leaves the process.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../config.js";
import AdminScreen from "../AdminScreen.jsx";
import { AccountProvider, AccountGate } from "../AccountContext.jsx";
import { handleRequest } from "../../../supabase/functions/admin-accounts/handler.js";

// ---------- the network stand-in ----------

/** Every client the app builds goes through here, so its fetch is ours and its options can be read back. */
const net = vi.hoisted(() => ({ fetch: null, options: [] }));
vi.mock("@supabase/supabase-js", async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    createClient: (url, key, options = {}) => {
      net.options.push({ url, key, auth: options.auth });
      return real.createClient(url, key, { ...options, global: { ...options.global, fetch: (...args) => net.fetch(...args) } });
    },
  };
});

const USER_ID = "7d444840-9dc0-11d1-b245-5ffdce74fad2";
const SESSION_ID = "a3b9c1d2-0000-4000-8000-000000000001";
const FACTOR_ID = "f0000000-0000-4000-8000-0000000000f1";
const PASSWORD = "correct-horse-battery-staple";
const PROFILE = { id: USER_ID, email: "dana@example.com", fullName: "דנה לוי", phone: "052-1234567", role: "subscriber", plan: "pro", deviceLimit: 2 };
const VERIFIED_FACTOR = { id: FACTOR_ID, friendly_name: "Studio", factor_type: "totp", status: "verified", created_at: "2026-10-01T08:00:00Z", updated_at: "2026-10-01T08:00:00Z" };

const b64 = (value) => btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const jwt = (claims) => `${b64({ alg: "ES256", typ: "JWT", kid: "test-key" })}.${b64({ sub: USER_ID, aud: "authenticated", role: "authenticated", session_id: SESSION_ID, ...claims })}.c2lnbmF0dXJl`;
const claimsOf = (token) => JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));

/**
 * Supabase Auth and PostgREST as far as the app talks to them, over fetch. `log` holds "METHOD /path?query",
 * `requests` the same with headers and body. `rpc` is what each database function answers; `failLogout` makes
 * the sign-out calls of those scopes fail like a dropped connection; `loggedOut` lists the scopes that arrived.
 */
function fakeNetwork({ factors = [] } = {}) {
  const origin = new URL(SUPABASE_URL).origin;
  const state = {
    log: [],
    requests: [],
    unexpected: [],
    loggedOut: [],
    failLogout: new Set(),
    factors,
    rpc: {
      claim_session: { status: "ok", deviceId: "d1", profile: PROFILE },
      session_status: { status: "ok" },
      log_event: { status: "ok" },
    },
  };
  let issued = 0;
  const user = () => ({
    id: USER_ID, aud: "authenticated", role: "authenticated", email: PROFILE.email, factors: state.factors,
    app_metadata: { provider: "email", providers: ["email"], provisioned: true }, user_metadata: {},
    created_at: "2026-10-05T08:00:00Z", updated_at: "2026-10-05T08:00:00Z",
  });
  const tokens = (aal) => {
    const now = Math.floor(Date.now() / 1000);
    issued += 1;
    const amr = [...(aal === "aal2" ? [{ method: "totp", timestamp: now }] : []), { method: "password", timestamp: now }];
    return { access_token: jwt({ aal, amr, exp: now + 3600, iat: now, jti: `token-${issued}` }), token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: `refresh-${issued}`, user: user() };
  };
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  state.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : (input.url ?? String(input)));
    const method = (init.method || "GET").toUpperCase();
    const headers = new Headers(init.headers);
    const body = typeof init.body === "string" && init.body ? JSON.parse(init.body) : null;
    const path = url.pathname;
    state.log.push(`${method} ${path}${url.search}`);
    state.requests.push({ method, path, search: url.search, origin: url.origin, headers, body });
    if (url.origin !== origin) {
      state.unexpected.push(`${method} ${url.href}`);
      throw new TypeError("blocked: not the Supabase host");
    }
    if (method === "POST" && path === "/auth/v1/token") return json(tokens("aal1"));
    if (path === "/auth/v1/user") return json(user());
    if (method === "POST" && path === "/auth/v1/logout") {
      const scope = url.searchParams.get("scope");
      if (state.failLogout.has(scope)) throw new TypeError("Failed to fetch");
      state.loggedOut.push(scope);
      return new Response(null, { status: 204 });
    }
    if (method === "POST" && path === "/auth/v1/recover") return json({});
    if (method === "POST" && path === "/functions/v1/admin-accounts") return json({ userId: "u9", warnings: [] });
    if (method === "POST" && /\/auth\/v1\/factors\/[^/]+\/challenge$/.test(path)) return json({ id: "challenge-1", type: "totp", expires_at: Math.floor(Date.now() / 1000) + 300 });
    if (method === "POST" && /\/auth\/v1\/factors\/[^/]+\/verify$/.test(path)) {
      return body?.code === "123456" ? json(tokens("aal2")) : json({ code: 400, error_code: "mfa_verification_failed", msg: "Invalid TOTP code entered" }, 400);
    }
    if (method === "POST" && path.startsWith("/rest/v1/rpc/")) {
      const answer = state.rpc[path.split("/").pop()];
      if (answer) return json(answer);
    }
    state.unexpected.push(`${method} ${path}${url.search}`);
    return json({ message: "unexpected request" }, 404);
  };
  return state;
}

/** Opens the Studio gate over the app's real account service (fresh module state: a fresh client). */
let current = null;
async function openApp(network, { url = "/" } = {}) {
  net.fetch = network.fetch;
  window.history.replaceState(null, "", url);
  vi.resetModules();
  const { AccountProvider: Provider, AccountGate: Gate, useAccount: useCurrent } = await import("../AccountContext.jsx");
  const seen = { account: null };
  const Probe = () => {
    seen.account = useCurrent();
    return null;
  };
  render(
    <Provider active>
      <Probe />
      <Gate he dk onLeave={() => {}}><p>studio-is-open</p></Gate>
    </Provider>,
  );
  current = seen;
  await waitFor(() => expect(seen.account.state).toBe("signed_out"));
  return seen;
}
async function signIn(seen, password = PASSWORD) {
  let problem;
  await act(async () => {
    problem = await seen.account.signIn("dana@example.com", password);
  });
  return problem;
}
const savedLogins = () => Object.keys(localStorage).filter((k) => /^sb-.+-auth-token$/.test(k));

// every test builds a new client under the same storage key; supabase-js says so, once per client: not news here
const realWarn = console.warn;
beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation((...args) => {
    if (!String(args[0]).includes("Multiple GoTrueClient instances")) realWarn(...args);
  });
  // the only fetch supabase-js gets is net.fetch; anything else that reaches for the network fails loudly
  vi.stubGlobal("fetch", async () => {
    throw new TypeError("blocked: these tests never touch the network");
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await current?.account?.service?.client?.auth?.stopAutoRefresh?.();
  current = null;
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  net.fetch = null;
  net.options.length = 0;
});

// ---------- where the login lives, and where it goes ----------

describe("the saved login", () => {
  it("lives in localStorage, readable by any script on the page, and goes only to the Supabase host (the page's CSP is what guards it)", async () => {
    const network = fakeNetwork();
    const seen = await openApp(network);
    expect(await signIn(seen)).toBeNull();
    await waitFor(() => expect(seen.account.state).toBe("ready"));
    expect(screen.getByText("studio-is-open")).toBeTruthy();
    // the client is the public one: the publishable key, set to keep a login, refresh it, and never read one from the address
    expect(net.options.at(-1)).toEqual({ url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY, auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    expect(SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")).toBe(true);
    // access and refresh token, in plain localStorage (what an XSS could read, and why script-src 'self' matters)
    expect(savedLogins()).toEqual([`sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`]);
    const saved = JSON.parse(localStorage.getItem(savedLogins()[0]));
    expect(saved.access_token.split(".")).toHaveLength(3);
    expect(saved.refresh_token).toMatch(/^refresh-/);
    // the device key sits beside it, and is no secret
    expect(localStorage.getItem("numerology_device_key")).toMatch(/^[0-9a-f]{32}$/);
    // the password is typed once, reaches only the token endpoint, and is kept nowhere
    const stored = [localStorage, sessionStorage].flatMap((s) => Object.keys(s).map((k) => s.getItem(k))).join("\n");
    expect(stored).not.toContain(PASSWORD);
    expect(network.requests.filter((r) => JSON.stringify(r.body ?? "").includes(PASSWORD)).map((r) => `${r.method} ${r.path}`)).toEqual(["POST /auth/v1/token"]);
    // every request, bearer token included, stayed on the Supabase host
    expect(network.requests.every((r) => r.origin === new URL(SUPABASE_URL).origin)).toBe(true);
    expect(network.unexpected).toEqual([]);
  });

  it("is claimed on the server before the Studio opens, and the other logins are ended by one client call right after (the only thing that ends them)", async () => {
    const network = fakeNetwork();
    const seen = await openApp(network);
    await signIn(seen);
    await waitFor(() => expect(seen.account.state).toBe("ready"));
    const order = network.log.filter((l) => /token|claim_session|logout/.test(l));
    expect(order).toEqual(["POST /auth/v1/token?grant_type=password", "POST /rest/v1/rpc/claim_session", "POST /auth/v1/logout?scope=others"]);
    const claimRequest = network.requests.find((r) => r.path.endsWith("/claim_session"));
    expect(claimRequest.body).toEqual({ p_device_key: localStorage.getItem("numerology_device_key"), p_label: expect.any(String) });
  });

  it("never adopts a login from the page address: a link with tokens in it signs nobody in", async () => {
    const attacker = jwt({ aal: "aal1", exp: Math.floor(Date.now() / 1000) + 3600, jti: "planted" });
    const url = `/?code=planted-code#access_token=${attacker}&refresh_token=planted-refresh&token_type=bearer&expires_in=3600&type=recovery`;
    const network = fakeNetwork();
    const seen = await openApp(network, { url });
    expect(seen.account.state).toBe("signed_out");
    expect(savedLogins()).toEqual([]);
    expect(network.log.filter((l) => /\/auth\/v1\/(user|token)/.test(l))).toEqual([]);
    // control: a client left at supabase-js's own default WOULD take it, so the check above can tell
    const { createClient } = await import("@supabase/supabase-js");
    const control = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: true } });
    expect((await control.auth.getSession()).data.session?.refresh_token).toBe("planted-refresh");
  });

  it.each([false, true])("signing out ends this login on the server and wipes it here (server unreachable: %s)", async (unreachable) => {
    const network = fakeNetwork();
    const seen = await openApp(network);
    await signIn(seen);
    await waitFor(() => expect(seen.account.state).toBe("ready"));
    if (unreachable) network.failLogout.add("local");
    network.log.length = 0;
    network.loggedOut.length = 0;
    await act(async () => {
      await seen.account.signOut();
    });
    expect(seen.account.state).toBe("signed_out");
    expect(screen.queryByText("studio-is-open")).toBeNull();
    expect(network.log).toEqual(["POST /rest/v1/rpc/log_event", "POST /auth/v1/logout?scope=local"]);
    // gone from this browser either way (the installed auth-js removes it even when the server call fails)
    expect(savedLogins()).toEqual([]);
    // reached the server only when the server could be reached: an offline sign-out leaves the session alive there
    expect(network.loggedOut).toEqual(unreachable ? [] : ["local"]);
  });

  it.each([
    ["replaced", "replaced"],
    ["suspended", "blocked"],
    ["device_revoked", "blocked"],
  ])("a session the server calls %s closes the Studio at the next check and wipes the saved login", async (answer, locks) => {
    const network = fakeNetwork();
    const seen = await openApp(network);
    await signIn(seen);
    await waitFor(() => expect(seen.account.state).toBe("ready"));
    network.rpc.session_status = { status: answer };
    await act(async () => {
      await seen.account.check();
    });
    expect(seen.account.state).toBe(locks);
    expect(screen.queryByText("studio-is-open")).toBeNull();
    expect(savedLogins()).toEqual([]);
    expect(network.loggedOut).toContain("local");
  });

  it("keeps working while the status check cannot reach the server (and asks again), instead of locking a good session out", async () => {
    const network = fakeNetwork();
    const seen = await openApp(network);
    await signIn(seen);
    await waitFor(() => expect(seen.account.state).toBe("ready"));
    const down = network.fetch;
    net.fetch = async (input, init) => {
      if (String(input).includes("session_status")) throw new TypeError("Failed to fetch");
      return down(input, init);
    };
    await act(async () => {
      expect(await seen.account.check()).toBe(false);
    });
    expect(seen.account.state).toBe("ready");
    expect(savedLogins()).toHaveLength(1);
  });
});

// ---------- two-step verification, as the browser runs it ----------

describe("two-step verification in the browser", () => {
  it("asks for the code before claiming anything, claims with the verified (aal2) token, and a wrong code claims nothing", async () => {
    const network = fakeNetwork({ factors: [VERIFIED_FACTOR] });
    const seen = await openApp(network);
    expect(await signIn(seen)).toBeNull();
    // password accepted, but the account is not open: the code screen, and no claim yet
    await waitFor(() => expect(seen.account.state).toBe("code"));
    expect(screen.queryByText("studio-is-open")).toBeNull();
    expect(network.log.some((l) => l.includes("claim_session"))).toBe(false);
    // a wrong code: refused by Auth, still no claim, still on the code screen
    await act(async () => {
      expect(await seen.account.verifyCode("000000")).toBe("wrong_code");
    });
    expect(seen.account.state).toBe("code");
    expect(network.log.some((l) => l.includes("claim_session"))).toBe(false);
    // the right code (with stray spaces): challenge, verify, and only then the claim, with the upgraded token
    await act(async () => {
      expect(await seen.account.verifyCode(" 123456 ")).toBeNull();
    });
    await waitFor(() => expect(seen.account.state).toBe("ready"));
    const order = network.log.filter((l) => /challenge|verify|claim_session/.test(l));
    expect(order).toEqual([
      `POST /auth/v1/factors/${FACTOR_ID}/challenge`,
      `POST /auth/v1/factors/${FACTOR_ID}/verify`, // the wrong code
      `POST /auth/v1/factors/${FACTOR_ID}/challenge`,
      `POST /auth/v1/factors/${FACTOR_ID}/verify`,
      "POST /rest/v1/rpc/claim_session",
    ]);
    expect(network.requests.filter((r) => r.path.endsWith("/verify")).map((r) => r.body.code)).toEqual(["000000", "123456"]);
    const claim = network.requests.find((r) => r.path.endsWith("/claim_session"));
    expect(claimsOf(claim.headers.get("Authorization").replace("Bearer ", "")).aal).toBe("aal2");
    expect(seen.account.aal).toBe("aal2");
  });

  // FIXED after the 2026-10-07 audit; was (LOW; defence in depth, the server is not the guard here: see the HIGH finding in handler.attack.test.js).
  // src/account/AccountContext.jsx:119 (proceed) and :104 (claim). When the second-step state cannot be read
  // (a failed request, a malformed token), mfaState() rejects and `.catch(() => ({ needsCode: false }))` turns
  // that into "no code needed": the account is claimed and opened without asking for the code. A guard that
  // opens when it cannot look is not a guard. Fix: let the failure reach the retry screen:
  //   const mfa = await svc.mfaState();            // no catch: start()'s catch shows the "problem" screen with Try again
  //   and in signIn(): try { await proceed(svc); } catch { setState({ name: "problem", retry: "start" }); }
  it("when the second-step state cannot be read, the Studio stays closed (retry screen, no claim)", async () => {
    const service = {
      savedSession: vi.fn(async () => ({ access_token: "saved" })),
      mfaState: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
      claim: vi.fn(async () => ({ status: "ok", profile: PROFILE, deviceId: "d1" })),
      status: vi.fn(async () => ({ status: "ok" })),
      forget: vi.fn(async () => {}),
      signOut: vi.fn(async () => {}),
      watch: vi.fn(() => () => {}),
      onSignedOut: vi.fn(() => () => {}),
    };
    render(
      <AccountProvider active loadService={async () => service}>
        <AccountGate he dk onLeave={() => {}}><p>studio-is-open</p></AccountGate>
      </AccountProvider>,
    );
    await waitFor(() => expect(service.mfaState).toHaveBeenCalled());
    await act(async () => {});
    expect(service.claim).not.toHaveBeenCalled();
    expect(screen.queryByText("studio-is-open")).toBeNull();
  });
});

// ---------- changing the password, and replacing a login ----------

describe("changing the password", () => {
  it("PINNED: needs no current password, only the open login: one PUT /user carrying the new password", async () => {
    const network = fakeNetwork();
    const seen = await openApp(network);
    await signIn(seen);
    await waitFor(() => expect(seen.account.state).toBe("ready"));
    network.log.length = 0;
    network.requests.length = 0;
    await act(async () => {
      await seen.account.service.changePassword("a-brand-new-password");
    });
    const puts = network.requests.filter((r) => r.method === "PUT");
    expect(puts.map((r) => r.path)).toEqual(["/auth/v1/user"]);
    expect(puts[0].body.password).toBe("a-brand-new-password");
    // no current password, and none of Auth's re-authentication nonce (the project's "secure password change" is off or unused)
    expect(Object.keys(puts[0].body).filter((k) => /current|old|nonce/i.test(k))).toEqual([]);
  });

  // FIXED after the 2026-10-07 audit; was (MEDIUM): src/account/service.js:141-144, used by AccountScreen.jsx:80 and AccountContext.jsx:216.
  // changePassword() is one updateUser({password}) and nothing else. Whether Supabase Auth ends the account's
  // other logins when a password changes is a project setting and a version detail the app does not check
  // (Not verified: live Auth), and the database does not end them either (migration :233-237). So a login made
  // with the old password, or a refresh token copied from this browser, can go on working, and can claim the
  // account back. The very login that changed the password is the one a copied token still belongs to.
  // Fix: end every login, this one too, then sign in again with the new password:
  //   async changePassword(password) {
  //     const { error } = await client.auth.updateUser({ password });
  //     if (error) throw new AccountError(error.code || "unavailable");
  //     await client.auth.signOut({ scope: "global" });   // and AccountScreen shows the sign-in screen: "Sign in with the new password"
  //   }
  // (setNewPassword in AccountContext then signs in again instead of claiming). The minimum that still helps is scope "others".
  it("changing the password signs the other logins out (scope 'global' or 'others')", async () => {
    const network = fakeNetwork();
    const seen = await openApp(network);
    await signIn(seen);
    await waitFor(() => expect(seen.account.state).toBe("ready"));
    network.log.length = 0;
    await act(async () => {
      await seen.account.service.changePassword("a-brand-new-password");
    });
    expect(network.log).toEqual(expect.arrayContaining([expect.stringMatching(/^POST \/auth\/v1\/logout\?scope=(global|others)$/)]));
  });

  // FIXED after the 2026-10-07 audit; was (MEDIUM): src/account/service.js:121-124. The claim ends the other logins with
  // client.auth.signOut({ scope: "others" }) and drops the answer: supabase-js returns the failure instead of
  // throwing, so a dropped connection at that moment leaves the replaced logins alive while claim() says "ok".
  // The database does not end them either (migration :233-237), so each can claim the account back.
  // Fix (client): const { error } = await client.auth.signOut({ scope: "others" }); if (error) throw error;
  // (the provider then shows the retry screen, and the retry claims again). Better still, in the database:
  // claim_session deletes the other rows of auth.sessions itself (see handler.attack.test.js).
  it("claim() does not answer 'ok' when it could not end the other logins", async () => {
    const network = fakeNetwork();
    const seen = await openApp(network);
    await signIn(seen);
    await waitFor(() => expect(seen.account.state).toBe("ready"));
    network.failLogout.add("others");
    const result = await seen.account.service.claim().catch((error) => ({ status: "refused", error }));
    expect(result.status).not.toBe("ok");
  });
});

// ---------- the password reset that the flag only hides ----------

describe("forgotten password", () => {
  it("is switched off only on screen: the client code behind the button still runs, and reaches Auth's recover endpoint", async () => {
    const network = fakeNetwork();
    const seen = await openApp(network);
    expect(seen.account.selfServiceReset).toBe(false);
    expect(screen.queryByRole("button", { name: "שכחתי סיסמה" })).toBeNull();
    await act(async () => {
      expect(await seen.account.requestReset(" Dana@Example.COM ")).toBeNull();
    });
    expect(network.requests.filter((r) => r.path === "/auth/v1/recover").map((r) => r.body.email)).toEqual(["dana@example.com"]);
    // And nothing here stops anyone calling the same Auth endpoints with the public key from their own page: see "Not verified".
    expect(seen.account.state).toBe("reset");
  });
});

// ---------- the call to the admin Edge Function, as the browser makes it ----------

describe("the call to the admin function", () => {
  it("carries the admin's own user token (never the publishable key), and passes the function's CORS preflight as the function is written", async () => {
    const network = fakeNetwork();
    const seen = await openApp(network);
    await signIn(seen);
    await waitFor(() => expect(seen.account.state).toBe("ready"));
    network.requests.length = 0;
    const fields = { email: "noa@example.com", fullName: "נועה", phone: "", plan: "pro", password: "a-good-password" };
    await act(async () => {
      await seen.account.service.admin.createAccount(fields);
    });
    const sent = network.requests.find((r) => r.path === "/functions/v1/admin-accounts");
    expect(sent.method).toBe("POST");
    expect(sent.body).toEqual({ action: "create", ...fields });
    const bearer = sent.headers.get("authorization");
    expect(bearer).toMatch(/^Bearer [^ .]+\.[^ .]+\.[^ .]+$/); // a JWT, so the function's "Bearer " check and the database's token check both see the user
    expect(claimsOf(bearer.slice("Bearer ".length)).sub).toBe(USER_ID);
    expect(sent.headers.get("apikey")).toBe(SUPABASE_PUBLISHABLE_KEY);
    // the preflight a browser sends for exactly these headers (all but the CORS-safelisted ones)
    const asked = [...sent.headers.keys()].filter((h) => !["accept", "accept-language", "content-language"].includes(h));
    expect(asked).toEqual(expect.arrayContaining(["authorization", "apikey", "content-type"]));
    const origin = "https://numerology-app-orcin.vercel.app";
    const preflight = await handleRequest(
      new Request(`${SUPABASE_URL}/functions/v1/admin-accounts`, { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": asked.join(", ") } }),
      { url: SUPABASE_URL, publishableKey: "unused", secretKey: "unused", allowedOrigins: [origin], createClient: () => { throw new Error("a preflight needs no client"); } },
    );
    const allowed = preflight.headers.get("Access-Control-Allow-Headers").split(",").map((h) => h.trim().toLowerCase());
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(asked.filter((h) => !allowed.includes(h))).toEqual([]);
  });
});

// ---------- the admin screen, which only asks ----------

describe("admin screen", () => {
  const ME = { id: "admin-1", email: "shlomi@example.com", fullName: "שלומי", role: "admin" };
  const DANA = { id: "u1", email: "dana@example.com", fullName: "דנה לוי", phone: "052-1234567", role: "subscriber", status: "active", plan: "founder", deviceLimit: 2, createdAt: "2026-10-05T08:30:00Z", lastSeenAt: "2026-10-05T10:00:00Z", devices: 2, clients: 14, readings: 31 };
  const adminSetup = (overrides) => {
    const admin = {
      listAccounts: vi.fn(async () => [DANA]),
      createAccount: vi.fn(async () => ({ userId: "u9", warnings: [] })),
      setPassword: vi.fn(async () => ({ status: "ok", warnings: [] })),
      updateAccount: vi.fn(async () => ({ status: "ok" })),
      listDevices: vi.fn(async () => []),
      revokeDevice: vi.fn(async () => ({ status: "ok" })),
      audit: vi.fn(async () => []),
      ...overrides,
    };
    render(<AdminScreen account={{ profile: ME, aal: "aal2", service: { admin } }} he dk />);
    return admin;
  };

  // FIXED after the 2026-10-07 audit; was (LOW): src/account/AdminScreen.jsx:246-247 and :177-178. The Edge Function answers 200 with
  // warnings (sessions_not_ended, not_logged, plan_not_set) when a follow-up step failed after the password
  // was set or the account opened. The screen discards the answer, shows the hand-over as if all went well, and
  // the question it asked said "every device of the account is signed out". After a compromise, that false
  // assurance is the dangerous part. Fix: keep what the call returns and show it:
  //   const result = await admin.setPassword(a.id, password); setHandover({ email: a.email, password, warnings: result?.warnings ?? [] });
  //   ... {handover.warnings.length > 0 && <p role="alert">...the sessions were NOT ended: try again...</p>}
  it("a new password whose sessions were not ended says so", async () => {
    adminSetup({ setPassword: vi.fn(async () => ({ status: "ok", warnings: ["sessions_not_ended"] })) });
    fireEvent.click(await screen.findByRole("button", { name: /דנה לוי/ }));
    fireEvent.click(await screen.findByRole("button", { name: "קביעת סיסמה חדשה" }));
    fireEvent.click(screen.getByRole("button", { name: "כן, לקבוע סיסמה חדשה" }));
    await screen.findByTestId("handover");
    expect(screen.queryByRole("alert")).not.toBeNull();
  });

  it("an account opened without its plan or its log entry says so", async () => {
    adminSetup({ createAccount: vi.fn(async () => ({ userId: "u9", warnings: ["plan_not_set", "not_logged"] })) });
    fireEvent.click(await screen.findByRole("button", { name: "חשבון חדש" }));
    fireEvent.change(screen.getByLabelText("אימייל"), { target: { value: "noa@example.com" } });
    fireEvent.change(screen.getByLabelText("שם מלא"), { target: { value: "נועה" } });
    fireEvent.click(screen.getByRole("button", { name: "פתיחת החשבון" }));
    await screen.findByText("החשבון נפתח");
    expect(screen.queryByRole("alert")).not.toBeNull();
  });
});
