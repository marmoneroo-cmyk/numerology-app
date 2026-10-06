/**
 * The account in front of the Studio. AccountProvider loads the account
 * machinery only once the Studio opens (the public site never loads it) and
 * runs the session's life: checking a saved login, signing in, the second
 * step of two-step verification, claiming this device's session, watching
 * that it is still the account's active one, and signing out. AccountGate
 * shows the Studio only when the account is ready, and otherwise the screen
 * that says why not.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SessionError } from "../data/serverBackend.js";
import { SignInScreen, CodeScreen, BlockedScreen, ReplacedScreen, WaitScreen, ProblemScreen, ForgotScreen, ResetScreen, NewPasswordScreen } from "./screens.jsx";

const AccountContext = createContext(null);

/** {state, profile, aal, service, activate, signIn, verifyCode, signOut, check, refreshAal, updateProfile, toSignIn, retry} */
export const useAccount = () => useContext(AccountContext);

/** How often a ready session asks whether it is still the account's active one. */
const WATCH_MS = 60000;

/** The account service over the real Supabase client, created once per page (again after a failed load). */
let shared;
function loadAccountService() {
  shared ??= (async () => {
    const [{ createClient }, config, device, { createAccountService }] = await Promise.all([
      import("@supabase/supabase-js"),
      import("./config.js"),
      import("./device.js"),
      import("./service.js"),
    ]);
    // the app's own URLs use #studio / #customer: never read a login out of them
    const client = createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    return createAccountService({ client, deviceKey: device.deviceKey(), deviceLabel: device.deviceLabel() });
  })().catch((e) => {
    shared = null; // offline, or a chunk missing after a deploy: the next try loads again
    throw e;
  });
  return shared;
}

/**
 * @param {{active?: boolean, loadService?: () => Promise<object>}} props
 *   `active`: the Studio is open; without it, the app calls activate() when
 *   the Studio first opens. `loadService` is injectable for tests.
 */
export function AccountProvider({ active, loadService = loadAccountService, children }) {
  // idle | checking | signed_out | code | claiming | ready | blocked | replaced | problem,
  // and for a forgotten password: forgot (the email) | reset (the emailed code) | new_password
  const [state, setState] = useState({ name: "idle" });
  const [activated, setActivated] = useState(false);
  const isActive = active ?? activated;
  const serviceRef = useRef(null);

  /**
   * Acts on the server's word about this session. Anything but "ok" closes the
   * Studio, saying why. Returns false when there was nothing to act on (ok, or
   * no answer at all: offline, so it keeps working and asks again later).
   */
  const settle = useCallback(async (svc) => {
    let answer;
    try {
      answer = (await svc.status()).status;
    } catch (e) {
      if (!(e instanceof SessionError)) return false;
      answer = "signed_out"; // the server does not even take the login any more
    }
    if (answer === "ok") return false;
    await svc.forget().catch(() => {});
    if (answer === "replaced") setState({ name: "replaced" });
    else if (answer === "signed_out") setState({ name: "signed_out" });
    else setState({ name: "blocked", reason: answer });
    return true;
  }, []);

  const check = useCallback(() => (serviceRef.current ? settle(serviceRef.current) : Promise.resolve(false)), [settle]);

  const service = async () => {
    if (serviceRef.current) return serviceRef.current;
    const svc = await loadService();
    if (!serviceRef.current) {
      serviceRef.current = svc;
      svc.watch?.(() => check()); // the workspace or a screen was refused: ask why at once
      svc.onSignedOut?.(() => setState((s) => (s.name === "ready" ? { name: "signed_out" } : s)));
    }
    return serviceRef.current;
  };

  const claim = useCallback(async (svc) => {
    setState({ name: "claiming" });
    try {
      const result = await svc.claim();
      if (result.status === "ok") {
        const { level } = await svc.mfaState().catch(() => ({ level: "aal1" }));
        setState({ name: "ready", profile: result.profile, deviceId: result.deviceId, aal: level });
        return;
      }
      await svc.forget(); // this device's login can do nothing now
      setState({ name: "blocked", reason: result.status, limit: result.limit });
    } catch (e) {
      // a saved login the server already ended (signed in elsewhere, or lapsed): ask why, then start over
      if ((e instanceof SessionError || e.code === "28000") && (await settle(svc))) return;
      setState({ name: "problem", retry: "claim" });
    }
  }, [settle]);

  /** After the password: the code from the authenticator app when the account has one; then the claim. */
  const proceed = useCallback(async (svc) => {
    const mfa = await svc.mfaState().catch(() => ({ needsCode: false }));
    if (mfa.needsCode) setState({ name: "code", factorId: mfa.factorId });
    else await claim(svc);
  }, [claim]);

  const start = useCallback(async () => {
    setState({ name: "checking" });
    try {
      const svc = await service();
      if (await svc.savedSession()) await proceed(svc);
      else setState({ name: "signed_out" });
    } catch {
      setState({ name: "problem", retry: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proceed]);

  useEffect(() => {
    if (isActive) start();
  }, [isActive, start]);

  useEffect(() => {
    if (state.name !== "ready") return undefined;
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    const timer = setInterval(check, WATCH_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      clearInterval(timer);
    };
  }, [state.name, check]);

  const value = useMemo(() => ({
    state: state.name,
    reason: state.reason,
    limit: state.limit,
    /** The address a forgotten-password code goes to. */
    email: state.email || "",
    profile: state.profile || null,
    aal: state.aal || "aal1",
    service: serviceRef.current,
    /** Starts the account machinery (the Studio opened). Calling it again does nothing. */
    activate: () => setActivated(true),
    /** @returns {Promise<string|null>} an error code for the sign-in screen, or null */
    async signIn(email, password) {
      const svc = await service();
      const result = await svc.signIn(email, password);
      if (result.error) return result.error;
      await proceed(svc);
      return null;
    },
    /** The authenticator code (second step). @returns {Promise<string|null>} an error code, or null */
    async verifyCode(code) {
      const svc = serviceRef.current;
      try {
        await svc.mfaVerify(state.factorId, code);
      } catch (e) {
        return e.code || "unavailable";
      }
      // a forgotten password: the authenticator code comes before the new password, not instead of it
      if (state.next === "new_password") setState({ name: "new_password" });
      else await claim(svc);
      return null;
    },
    /** "Forgot password", from the sign-in screen (with what was typed there). */
    toForgot: (email = "") => setState({ name: "forgot", email: email.trim() }),
    /** Emails a code for a new password. @returns {Promise<string|null>} an error code, or null */
    async requestReset(email) {
      try {
        await (await service()).requestPasswordReset(email);
      } catch (e) {
        return e.code || "unavailable";
      }
      setState({ name: "reset", email: email.trim().toLowerCase() });
      return null;
    },
    /** The emailed code; then the authenticator code if the account has one, then the new password. */
    async verifyResetCode(code) {
      const svc = serviceRef.current;
      try {
        await svc.verifyResetCode(state.email, code);
      } catch (e) {
        return e.code || "unavailable";
      }
      const mfa = await svc.mfaState().catch(() => ({ needsCode: false }));
      setState(mfa.needsCode ? { name: "code", factorId: mfa.factorId, next: "new_password" } : { name: "new_password" });
      return null;
    },
    /** Sets the new password, then opens the Studio. @returns {Promise<string|null>} an error code, or null */
    async setNewPassword(password) {
      const svc = serviceRef.current;
      try {
        await svc.changePassword(password);
      } catch (e) {
        return e.code || "unavailable";
      }
      await claim(svc);
      return null;
    },
    async signOut() {
      await serviceRef.current?.signOut().catch(() => {});
      setState({ name: "signed_out" });
    },
    check,
    /** After setting up two-step verification here, this session is verified too. */
    async refreshAal() {
      const { level } = await serviceRef.current.mfaState();
      setState((s) => (s.name === "ready" ? { ...s, aal: level } : s));
    },
    retry: () => (state.retry === "claim" && serviceRef.current ? claim(serviceRef.current) : start()),
    async toSignIn() {
      await serviceRef.current?.forget().catch(() => {});
      setState({ name: "signed_out" });
    },
    /** The profile after the subscriber edited their name or phone. */
    updateProfile: (patch) => setState((s) => (s.name === "ready" ? { ...s, profile: { ...s.profile, ...patch } } : s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state, claim, start, check, proceed]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

/** The Studio when the account is ready; otherwise the screen for where the account stands. */
export function AccountGate({ he, dk, onLeave, children }) {
  const account = useAccount();
  const props = { he, dk, account, onLeave };
  switch (account.state) {
    case "ready":
      return children;
    case "signed_out":
      return <SignInScreen {...props} />;
    case "code":
      return <CodeScreen {...props} />;
    case "blocked":
      return <BlockedScreen {...props} />;
    case "replaced":
      return <ReplacedScreen {...props} />;
    case "problem":
      return <ProblemScreen {...props} />;
    case "forgot":
      return <ForgotScreen {...props} />;
    case "reset":
      return <ResetScreen {...props} />;
    case "new_password":
      return <NewPasswordScreen {...props} />;
    default:
      return <WaitScreen {...props} />;
  }
}
