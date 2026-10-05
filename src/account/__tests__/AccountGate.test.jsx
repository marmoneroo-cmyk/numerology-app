// @vitest-environment jsdom
/*
 * The account gate in front of the Studio, over a stand-in account service:
 * signing in, the reasons an account may be refused, a session replaced by a
 * sign-in elsewhere, and signing out.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { AccountProvider, AccountGate, useAccount } from "../AccountContext.jsx";

const PROFILE = { id: "u1", email: "dana@example.com", fullName: "דנה לוי", phone: "052-1234567", role: "subscriber", plan: "pro", deviceLimit: 2 };

function fakeService({ saved = null, signIn = { ok: true }, claim = { status: "ok", profile: PROFILE, deviceId: "d1" }, status = { status: "ok" } } = {}) {
  return {
    savedSession: vi.fn(async () => saved),
    signIn: vi.fn(async () => signIn),
    claim: vi.fn(async () => claim),
    status: vi.fn(async () => (typeof status === "function" ? status() : status)),
    signOut: vi.fn(async () => {}),
    forget: vi.fn(async () => {}),
  };
}

function Studio() {
  const account = useAccount();
  return (
    <div>
      <p>{`הסטודיו של ${account.profile.fullName}`}</p>
      <button onClick={account.signOut}>יציאה</button>
    </div>
  );
}

function setup(service, { active = true } = {}) {
  const loadService = vi.fn(async () => service);
  const onLeave = vi.fn();
  const ui = (isActive) => (
    <AccountProvider active={isActive} loadService={loadService}>
      <AccountGate he dk onLeave={onLeave}>
        <Studio />
      </AccountGate>
    </AccountProvider>
  );
  const view = render(ui(active));
  return { loadService, onLeave, rerender: (a) => view.rerender(ui(a)) };
}

const signInWith = async (email, password) => {
  fireEvent.change(await screen.findByLabelText("אימייל"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("סיסמה"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "כניסה" }));
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("account gate", () => {
  it("loads nothing while the Studio is closed", async () => {
    const { loadService } = setup(fakeService(), { active: false });
    await act(async () => {});
    expect(loadService).not.toHaveBeenCalled();
  });

  it("waits for the app to activate it when no `active` prop is given", async () => {
    const service = fakeService({ saved: { access_token: "jwt" } });
    const loadService = vi.fn(async () => service);
    function OpenStudio() {
      const account = useAccount();
      return account.state === "idle" ? <button onClick={account.activate}>לסטודיו</button> : null;
    }
    render(
      <AccountProvider loadService={loadService}>
        <OpenStudio />
        <AccountGate he dk onLeave={() => {}}><Studio /></AccountGate>
      </AccountProvider>,
    );
    await act(async () => {});
    expect(loadService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "לסטודיו" }));
    expect(await screen.findByText("הסטודיו של דנה לוי")).toBeTruthy();
  });

  it("asks to sign in, then claims this device's session and opens the Studio", async () => {
    const service = fakeService();
    setup(service);
    await signInWith(" dana@example.com", "secret-pass");
    expect(await screen.findByText("הסטודיו של דנה לוי")).toBeTruthy();
    // an email field drops surrounding spaces itself
    expect(service.signIn).toHaveBeenCalledWith("dana@example.com", "secret-pass");
    expect(service.claim).toHaveBeenCalledTimes(1);
  });

  it("says when the email or password is wrong, and stays on the sign-in screen", async () => {
    setup(fakeService({ signIn: { error: "invalid_credentials" } }));
    await signInWith("dana@example.com", "nope");
    expect(await screen.findByText("האימייל או הסיסמה שגויים.")).toBeTruthy();
    expect(screen.getByLabelText("סיסמה")).toBeTruthy();
  });

  it("opens straight away with a saved login", async () => {
    setup(fakeService({ saved: { access_token: "jwt" } }));
    expect(await screen.findByText("הסטודיו של דנה לוי")).toBeTruthy();
  });

  it("explains a refused device and forgets this device's login", async () => {
    const service = fakeService({ saved: { access_token: "jwt" }, claim: { status: "device_limit", limit: 2 } });
    setup(service);
    expect(await screen.findByText(/כבר פעיל ב-2 מכשירים/)).toBeTruthy();
    expect(service.forget).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "חזרה למסך הכניסה" }));
    expect(await screen.findByLabelText("סיסמה")).toBeTruthy();
  });

  it("explains a suspended account", async () => {
    setup(fakeService({ saved: { access_token: "jwt" }, claim: { status: "suspended" } }));
    expect(await screen.findByText(/החשבון מושהה/)).toBeTruthy();
  });

  it("closes the Studio when the account is opened on another device", async () => {
    let answer = { status: "ok" };
    const service = fakeService({ saved: { access_token: "jwt" }, status: () => answer });
    setup(service);
    await screen.findByText("הסטודיו של דנה לוי");
    answer = { status: "replaced" };
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(await screen.findByRole("heading", { name: "החשבון נפתח במכשיר אחר" })).toBeTruthy();
    expect(screen.queryByText("הסטודיו של דנה לוי")).toBeNull();
    expect(service.forget).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "כניסה מחדש כאן" }));
    expect(await screen.findByLabelText("סיסמה")).toBeTruthy();
  });

  it("checks the session every minute, and keeps working while offline", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let answer = { status: "ok" };
    const service = fakeService({ saved: { access_token: "jwt" }, status: () => {
      if (answer === "offline") throw new Error("Failed to fetch");
      return answer;
    } });
    setup(service);
    await screen.findByText("הסטודיו של דנה לוי");
    answer = "offline";
    await act(async () => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByText("הסטודיו של דנה לוי")).toBeTruthy();
    answer = { status: "suspended" };
    await act(async () => {
      vi.advanceTimersByTime(60000);
    });
    expect(await screen.findByText(/החשבון מושהה/)).toBeTruthy();
  });

  it("signs out to the sign-in screen", async () => {
    const service = fakeService({ saved: { access_token: "jwt" } });
    setup(service);
    fireEvent.click(await screen.findByRole("button", { name: "יציאה" }));
    expect(await screen.findByLabelText("סיסמה")).toBeTruthy();
    expect(service.signOut).toHaveBeenCalled();
  });

  it("can leave the sign-in screen back to the public site", async () => {
    const { onLeave } = setup(fakeService());
    fireEvent.click(await screen.findByRole("button", { name: "חזרה לאתר" }));
    expect(onLeave).toHaveBeenCalled();
  });

  it("offers a retry when the account service cannot be reached", async () => {
    const service = fakeService({ saved: { access_token: "jwt" } });
    service.claim.mockRejectedValueOnce(new Error("Failed to fetch"));
    setup(service);
    fireEvent.click(await screen.findByRole("button", { name: "לנסות שוב" }));
    expect(await screen.findByText("הסטודיו של דנה לוי")).toBeTruthy();
    await waitFor(() => expect(service.claim).toHaveBeenCalledTimes(2));
  });
});
