/**
 * The account in front of the Studio. AccountProvider loads the account
 * machinery only while the Studio is open (the public site never loads it)
 * and runs the session's life: checking a saved login, signing in, claiming
 * this device's session, watching that it is still the account's active one,
 * and signing out. AccountGate shows the Studio only when the account is
 * ready, and otherwise the screen that says why not.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SignInScreen, BlockedScreen, ReplacedScreen, WaitScreen, ProblemScreen } from "./screens.jsx";

const AccountContext = createContext(null);

/** {state, profile, service, signIn, signOut, check, updateProfile, toSignIn} */
export const useAccount = () => useContext(AccountContext);

/** How often a ready session asks whether it is still the account's active one. */
const WATCH_MS = 60000;

/** The account service over the real Supabase client, created once per page. */
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
  })();
  return shared;
}

/**
 * @param {{active?: boolean, loadService?: () => Promise<object>}} props
 *   `active`: the Studio is open; without it, the app calls activate() when
 *   the Studio first opens. `loadService` is injectable for tests.
 */
export function AccountProvider({ active, loadService = loadAccountService, children }) {
  // idle | checking | signed_out | claiming | ready | blocked | replaced | problem
  const [state, setState] = useState({ name: "idle" });
  const [activated, setActivated] = useState(false);
  const isActive = active ?? activated;
  const serviceRef = useRef(null);
  const service = async () => (serviceRef.current ??= await loadService());

  const claim = useCallback(async (svc) => {
    setState({ name: "claiming" });
    try {
      const result = await svc.claim();
      if (result.status === "ok") {
        setState({ name: "ready", profile: result.profile, deviceId: result.deviceId });
        return;
      }
      await svc.forget(); // this device's login can do nothing now
      setState({ name: "blocked", reason: result.status, limit: result.limit });
    } catch {
      setState({ name: "problem", retry: "claim" });
    }
  }, []);

  const start = useCallback(async () => {
    setState({ name: "checking" });
    try {
      const svc = await service();
      if (await svc.savedSession()) await claim(svc);
      else setState({ name: "signed_out" });
    } catch {
      setState({ name: "problem", retry: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim]);

  useEffect(() => {
    if (isActive) start();
  }, [isActive, start]);

  /** Asks whether this session still works; acts on the answer. Offline, it keeps working and asks again later. */
  const check = useCallback(async () => {
    const svc = serviceRef.current;
    if (!svc) return;
    let answer;
    try {
      answer = (await svc.status()).status;
    } catch {
      return;
    }
    if (answer === "ok") return;
    await svc.forget().catch(() => {});
    if (answer === "replaced") setState({ name: "replaced" });
    else if (answer === "signed_out") setState({ name: "signed_out" });
    else setState({ name: "blocked", reason: answer });
  }, []);

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
    profile: state.profile || null,
    service: serviceRef.current,
    /** Starts the account machinery (the Studio opened). Calling it again does nothing. */
    activate: () => setActivated(true),
    /** @returns {Promise<string|null>} an error code for the sign-in screen, or null */
    async signIn(email, password) {
      const svc = await service();
      const result = await svc.signIn(email, password);
      if (result.error) return result.error;
      await claim(svc);
      return null;
    },
    async signOut() {
      await serviceRef.current?.signOut().catch(() => {});
      setState({ name: "signed_out" });
    },
    check,
    retry: () => (state.retry === "claim" && serviceRef.current ? claim(serviceRef.current) : start()),
    toSignIn: () => setState({ name: "signed_out" }),
    /** The profile after the subscriber edited their name or phone. */
    updateProfile: (patch) => setState((s) => (s.name === "ready" ? { ...s, profile: { ...s.profile, ...patch } } : s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state, claim, start, check]);

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
    case "blocked":
      return <BlockedScreen {...props} />;
    case "replaced":
      return <ReplacedScreen {...props} />;
    case "problem":
      return <ProblemScreen {...props} />;
    default:
      return <WaitScreen {...props} />;
  }
}
