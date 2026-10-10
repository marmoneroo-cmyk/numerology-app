// @vitest-environment jsdom
/*
 * The account gate in front of the Studio, over a stand-in account service:
 * signing in, the reasons an account may be refused, a session replaced by a
 * sign-in elsewhere, and signing out.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { AccountProvider, AccountGate, useAccount } from "../AccountContext.jsx";
import { AccountError } from "../service.js";
import { SessionError } from "../../data/serverBackend.js";

const PROFILE = { id: "u1", email: "dana@example.com", fullName: "דנה לוי", phone: "052-1234567", role: "subscriber", plan: "pro", deviceLimit: 2 };

function fakeService({ saved = null, signIn = { ok: true }, claim = { status: "ok", profile: PROFILE, deviceId: "d1" }, status = { status: "ok" }, mfa = { level: "aal1", needsCode: false, factorId: null } } = {}) {
  const service = {
    savedSession: vi.fn(async () => saved),
    signIn: vi.fn(async () => signIn),
    claim: vi.fn(async () => (typeof claim === "function" ? claim() : claim)),
    status: vi.fn(async () => (typeof status === "function" ? status() : status)),
    signOut: vi.fn(async () => {}),
    forget: vi.fn(async () => {}),
    mfaState: vi.fn(async () => (typeof mfa === "function" ? mfa() : mfa)),
    mfaVerify: vi.fn(async () => {}),
    requestPasswordReset: vi.fn(async () => {}),
    verifyResetCode: vi.fn(async () => {}),
    changePassword: vi.fn(async () => {}),
    // what the provider hooks into: the store's and screens' refusals, and supabase-js dropping the login
    watch: vi.fn((fn) => {
      service.lost = fn;
      return () => {};
    }),
    onSignedOut: vi.fn((fn) => {
      service.droppedLogin = fn;
      return () => {};
    }),
  };
  return service;
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

function setup(service, { active = true, selfServiceReset = true } = {}) {
  const loadService = vi.fn(async () => service);
  const onLeave = vi.fn();
  const ui = (isActive) => (
    <AccountProvider active={isActive} loadService={loadService} selfServiceReset={selfServiceReset}>
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

  it("a saved login the server already ended (signed in elsewhere) says so instead of looping on retry", async () => {
    const service = fakeService({ saved: { access_token: "jwt" }, claim: () => { throw Object.assign(new Error("not signed in"), { code: "28000" }); }, status: { status: "replaced" } });
    setup(service);
    expect(await screen.findByRole("heading", { name: "החשבון נפתח במכשיר אחר" })).toBeTruthy();
    expect(service.forget).toHaveBeenCalled();
  });

  it("closes the Studio when the login lapsed while the device slept (the server no longer takes it)", async () => {
    let answer = { status: "ok" };
    const service = fakeService({ saved: { access_token: "jwt" }, status: () => {
      if (answer === "lapsed") throw new SessionError();
      return answer;
    } });
    setup(service);
    await screen.findByText("הסטודיו של דנה לוי");
    answer = "lapsed";
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(await screen.findByLabelText("סיסמה")).toBeTruthy();
  });

  it("closes the Studio when supabase-js drops the login by itself", async () => {
    const service = fakeService({ saved: { access_token: "jwt" } });
    setup(service);
    await screen.findByText("הסטודיו של דנה לוי");
    await act(async () => service.droppedLogin());
    expect(await screen.findByLabelText("סיסמה")).toBeTruthy();
  });

  it("checks at once when the workspace or a screen is refused, instead of waiting a minute", async () => {
    let answer = { status: "ok" };
    const service = fakeService({ saved: { access_token: "jwt" }, status: () => answer });
    setup(service);
    await screen.findByText("הסטודיו של דנה לוי");
    answer = { status: "replaced" };
    await act(async () => service.lost());
    expect(await screen.findByRole("heading", { name: "החשבון נפתח במכשיר אחר" })).toBeTruthy();
  });

  it("asks for the authenticator code after the password when two-step verification is on", async () => {
    let level = { level: "aal1", needsCode: true, factorId: "f1" };
    const service = fakeService({ mfa: () => level });
    service.mfaVerify.mockImplementationOnce(async () => { throw new AccountError("wrong_code"); });
    service.mfaVerify.mockImplementation(async () => {
      level = { level: "aal2", needsCode: false, factorId: "f1" };
    });
    setup(service);
    await signInWith("dana@example.com", "secret-pass");
    const code = await screen.findByLabelText("קוד מהאפליקציה");
    expect(service.claim).not.toHaveBeenCalled();
    fireEvent.change(code, { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "אימות" }));
    expect(await screen.findByText("הקוד שגוי. נסו את הקוד הנוכחי באפליקציה.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("קוד מהאפליקציה"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "אימות" }));
    expect(await screen.findByText("הסטודיו של דנה לוי")).toBeTruthy();
    expect(service.mfaVerify).toHaveBeenLastCalledWith("f1", "123456");
  });

  it("offers a way back to sign-in when the account service keeps failing", async () => {
    const service = fakeService({ saved: { access_token: "jwt" }, claim: () => { throw new Error("Failed to fetch"); } });
    setup(service);
    fireEvent.click(await screen.findByRole("button", { name: "חזרה למסך הכניסה" }));
    expect(await screen.findByLabelText("סיסמה")).toBeTruthy();
    expect(service.forget).toHaveBeenCalled();
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

describe("a forgotten password", () => {
  it("is not offered until Supabase can email a code (custom SMTP): the administrator sets a new one", async () => {
    render(
      <AccountProvider active loadService={async () => fakeService()}>
        <AccountGate he dk onLeave={() => {}}><Studio /></AccountGate>
      </AccountProvider>,
    );
    expect(await screen.findByText("שכחתם את הסיסמה? פנו למנהלת המערכת, והיא תקבע לכם סיסמה חדשה.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "שכחתי סיסמה" })).toBeNull();
  });

  const typeNewPassword = async (first, second = first) => {
    fireEvent.change(await screen.findByLabelText("סיסמה חדשה"), { target: { value: first } });
    fireEvent.change(screen.getByLabelText("הסיסמה החדשה שוב"), { target: { value: second } });
    fireEvent.click(screen.getByRole("button", { name: "שמירה וכניסה" }));
  };

  it("goes from the address to the emailed code to a new password, then into the Studio", async () => {
    const service = fakeService();
    setup(service);
    fireEvent.change(await screen.findByLabelText("אימייל"), { target: { value: "Dana@Example.com " } });
    fireEvent.click(screen.getByRole("button", { name: "שכחתי סיסמה" }));
    // what was typed on the sign-in screen comes along
    expect((await screen.findByLabelText("אימייל")).value).toBe("Dana@Example.com");
    fireEvent.click(screen.getByRole("button", { name: "שליחת קוד" }));
    expect(await screen.findByText("dana@example.com")).toBeTruthy();
    expect(service.requestPasswordReset).toHaveBeenCalledWith("Dana@Example.com");
    const code = screen.getByLabelText("הקוד מהאימייל");
    fireEvent.change(code, { target: { value: "12 34-5a6" } });
    expect(code.value).toBe("123456");
    fireEvent.click(screen.getByRole("button", { name: "המשך" }));
    await typeNewPassword("a-new-password");
    expect(await screen.findByText("הסטודיו של דנה לוי")).toBeTruthy();
    expect(service.verifyResetCode).toHaveBeenCalledWith("dana@example.com", "123456");
    expect(service.changePassword).toHaveBeenCalledWith("a-new-password");
    expect(service.claim).toHaveBeenCalledTimes(1);
  });

  it("asks for the authenticator code before the new password when the account has two-step verification", async () => {
    let verified = false;
    const service = fakeService({ mfa: () => (verified ? { level: "aal2", needsCode: false, factorId: "f1" } : { level: "aal1", needsCode: true, factorId: "f1" }) });
    service.mfaVerify.mockImplementation(async () => {
      verified = true;
    });
    setup(service);
    fireEvent.click(await screen.findByRole("button", { name: "שכחתי סיסמה" }));
    fireEvent.change(screen.getByLabelText("אימייל"), { target: { value: "dana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "שליחת קוד" }));
    fireEvent.change(await screen.findByLabelText("הקוד מהאימייל"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "המשך" }));
    fireEvent.change(await screen.findByLabelText("קוד מהאפליקציה"), { target: { value: "654321" } });
    expect(service.changePassword).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "אימות" }));
    await typeNewPassword("a-new-password");
    expect(await screen.findByText("הסטודיו של דנה לוי")).toBeTruthy();
    expect(service.mfaVerify).toHaveBeenCalledWith("f1", "654321");
    expect(service.changePassword).toHaveBeenCalledWith("a-new-password");
  });

  it("refuses an invalid address, and says when too many codes were asked for", async () => {
    const service = fakeService();
    service.requestPasswordReset.mockRejectedValueOnce(new AccountError("rate_limited"));
    setup(service);
    fireEvent.click(await screen.findByRole("button", { name: "שכחתי סיסמה" }));
    fireEvent.change(screen.getByLabelText("אימייל"), { target: { value: "dana@example" } });
    fireEvent.click(screen.getByRole("button", { name: "שליחת קוד" }));
    expect(await screen.findByText("כתובת אימייל לא תקינה.")).toBeTruthy();
    expect(service.requestPasswordReset).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("אימייל"), { target: { value: "dana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "שליחת קוד" }));
    expect(await screen.findByText("נשלחו יותר מדי בקשות בזמן קצר. נסו שוב בעוד כמה דקות.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "חזרה למסך הכניסה" }));
    expect(await screen.findByRole("button", { name: "כניסה" })).toBeTruthy();
  });

  it("says when the emailed code is wrong, and sends a new one", async () => {
    const service = fakeService();
    service.verifyResetCode.mockRejectedValueOnce(new AccountError("wrong_code"));
    setup(service);
    fireEvent.click(await screen.findByRole("button", { name: "שכחתי סיסמה" }));
    fireEvent.change(screen.getByLabelText("אימייל"), { target: { value: "dana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "שליחת קוד" }));
    fireEvent.change(await screen.findByLabelText("הקוד מהאימייל"), { target: { value: "111111" } });
    fireEvent.click(screen.getByRole("button", { name: "המשך" }));
    expect(await screen.findByText("הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש.")).toBeTruthy();
    expect(screen.getByLabelText("הקוד מהאימייל").value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "שליחת קוד חדש" }));
    expect(await screen.findByText("נשלח קוד חדש")).toBeTruthy();
    expect(service.requestPasswordReset).toHaveBeenCalledTimes(2);
    service.requestPasswordReset.mockRejectedValueOnce(new Error("Failed to fetch"));
    fireEvent.click(screen.getByRole("button", { name: "שליחת קוד חדש" }));
    expect(await screen.findByText("אין חיבור כרגע. נסו שוב בעוד רגע.")).toBeTruthy();
  });

  it("checks the new password: long enough, typed the same twice, not the current one", async () => {
    const service = fakeService();
    service.changePassword.mockRejectedValueOnce(new AccountError("same_password"));
    setup(service);
    fireEvent.click(await screen.findByRole("button", { name: "שכחתי סיסמה" }));
    fireEvent.change(screen.getByLabelText("אימייל"), { target: { value: "dana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "שליחת קוד" }));
    fireEvent.change(await screen.findByLabelText("הקוד מהאימייל"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "המשך" }));
    await typeNewPassword("short");
    expect(await screen.findByText("לפחות 10 תווים.")).toBeTruthy();
    await typeNewPassword("x".repeat(73));
    expect(await screen.findByText("עד 72 תווים.")).toBeTruthy();
    await typeNewPassword("a-new-password", "a-new-passw0rd");
    expect(await screen.findByText("הסיסמאות לא זהות.")).toBeTruthy();
    expect(service.changePassword).not.toHaveBeenCalled();
    await typeNewPassword("the-old-password");
    expect(await screen.findByText("זו הסיסמה הנוכחית. בחרו סיסמה אחרת.")).toBeTruthy();
    service.changePassword.mockRejectedValueOnce(new AccountError("weak_password"));
    await typeNewPassword("aaaaaaaaaa");
    expect(await screen.findByText("הסיסמה חלשה מדי. נסו סיסמה ארוכה יותר.")).toBeTruthy();
    // cancelling signs the code's login out on this device
    fireEvent.click(screen.getByRole("button", { name: "ביטול" }));
    expect(await screen.findByRole("button", { name: "כניסה" })).toBeTruthy();
    expect(service.forget).toHaveBeenCalled();
  });
});

describe("the provider and the account service, which lives for the whole page", () => {
  it("stops listening to the service when it goes away, so entering the Studio again adds no second listener", async () => {
    const service = fakeService();
    const stopWatching = vi.fn();
    const stopSignedOut = vi.fn();
    service.watch.mockImplementation(() => stopWatching);
    service.onSignedOut.mockImplementation(() => stopSignedOut);
    const view = render(
      <AccountProvider active loadService={async () => service}>
        <AccountGate he dk onLeave={() => {}}>
          <Studio />
        </AccountGate>
      </AccountProvider>,
    );
    expect(await screen.findByLabelText("אימייל")).toBeTruthy(); // signed out: the service is loaded and listened to
    expect(service.watch).toHaveBeenCalledTimes(1);
    expect(service.onSignedOut).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(stopWatching).toHaveBeenCalledTimes(1);
    expect(stopSignedOut).toHaveBeenCalledTimes(1);
  });
});
