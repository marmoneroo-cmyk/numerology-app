// @vitest-environment jsdom
/*
 * The account screens in English (the Studio's other language), over the same
 * stand-ins as the Hebrew tests.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { AccountProvider, AccountGate } from "../AccountContext.jsx";
import AccountScreen from "../AccountScreen.jsx";
import AdminScreen from "../AdminScreen.jsx";
import { AccountError } from "../service.js";
import { auditLine, planLabel, statusLabel, dateTime } from "../labels.js";

const PROFILE = { id: "u1", email: "dana@example.com", fullName: "Dana Levi", phone: "", role: "subscriber", plan: "basic", deviceLimit: 1 };

function gateService(overrides = {}) {
  const service = {
    savedSession: vi.fn(async () => ({ access_token: "jwt" })),
    signIn: vi.fn(async () => ({ error: "unavailable" })),
    claim: vi.fn(async () => ({ status: "device_limit", limit: 1 })),
    status: vi.fn(async () => ({ status: "ok" })),
    signOut: vi.fn(async () => {}),
    forget: vi.fn(async () => {}),
    mfaState: vi.fn(async () => ({ level: "aal1", needsCode: false, factorId: null })),
    mfaVerify: vi.fn(async () => {}),
    watch: vi.fn(() => () => {}),
    onSignedOut: vi.fn(() => () => {}),
    ...overrides,
  };
  return service;
}
const gate = (service) =>
  render(
    <AccountProvider active loadService={async () => service} selfServiceReset>
      <AccountGate he={false} dk={false} onLeave={() => {}}><p>studio</p></AccountGate>
    </AccountProvider>,
  );

afterEach(() => {
  cleanup();
});

describe("the account screens in English", () => {
  it("explains a device limit of one, then signs in and reports an outage", async () => {
    const service = gateService();
    gate(service);
    expect(await screen.findByText(/already used on 1 device, its maximum/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back to sign in" }));
    fireEvent.change(await screen.findByLabelText("Email"), { target: { value: "dana@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "pw-pw-pw-pw" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("No connection right now. Try again in a moment.")).toBeTruthy();
  });

  it("says why other accounts cannot open, and asks for the second step", async () => {
    for (const [claim, text] of [
      [{ status: "suspended" }, /This account is suspended/],
      [{ status: "device_changes" }, /Too many new devices/],
      [{ status: "device_revoked" }, /This device was removed/],
    ]) {
      gate(gateService({ claim: vi.fn(async () => claim) }));
      expect(await screen.findByText(text)).toBeTruthy();
      cleanup();
    }
    const service = gateService({ mfaState: vi.fn(async () => ({ level: "aal1", needsCode: true, factorId: "f1" })) });
    service.mfaVerify.mockRejectedValueOnce(new AccountError("unavailable"));
    gate(service);
    fireEvent.change(await screen.findByLabelText("Code from the app"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByText("No connection right now. Try again in a moment.")).toBeTruthy();
  });

  it("shows replaced and unreachable accounts", async () => {
    const replaced = gateService({ claim: vi.fn(async () => ({ status: "ok", profile: PROFILE, deviceId: "d1" })), status: vi.fn(async () => ({ status: "replaced" })) });
    gate(replaced);
    await screen.findByText("studio");
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(await screen.findByRole("heading", { name: "The account was opened on another device" })).toBeTruthy();
    cleanup();
    gate(gateService({ claim: vi.fn(async () => { throw new Error("Failed to fetch"); }) }));
    expect(await screen.findByText("The account cannot be reached right now.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("my account: details, a password that is too short, two-step setup and a failed start", async () => {
    const service = {
      updateProfile: vi.fn(async () => { throw new Error("offline"); }),
      changePassword: vi.fn(async () => { throw new AccountError("weak_password"); }),
      myDevices: vi.fn(async () => [{ id: "d1", label: "Firefox · Linux", status: "approved", createdAt: "2026-10-01T10:00:00Z", lastSeenAt: "2026-10-05T10:00:00Z", current: true }]),
      revokeMyDevice: vi.fn(),
      mfaState: vi.fn(async () => ({ level: "aal1", needsCode: false, factorId: null })),
      mfaEnroll: vi.fn(async () => { throw new AccountError("unavailable"); }),
      mfaVerify: vi.fn(),
    };
    render(<AccountScreen account={{ profile: PROFILE, aal: "aal1", service, updateProfile: vi.fn(), signOut: vi.fn(), refreshAal: vi.fn() }} he={false} dk={false} />);
    expect(await screen.findByText(/Plan: Basic · up to 1 device/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(await screen.findByText("Saving failed. Try again.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("At least 10 characters")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "a-long-password" } });
    fireEvent.change(screen.getByLabelText("The new password again"), { target: { value: "a-long-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Changing failed. Try again.")).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: "Turn on two-step verification" }));
    expect(await screen.findByText("Cannot start right now. Try again.")).toBeTruthy();
    expect(screen.getByText(/Firefox · Linux · this device/)).toBeTruthy();
  });

  it("my account: the two-step setup screen", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const service = {
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
      myDevices: vi.fn(async () => []),
      revokeMyDevice: vi.fn(),
      mfaState: vi.fn(async () => ({ level: "aal1", needsCode: false, factorId: null })),
      mfaEnroll: vi.fn(async () => ({ factorId: "f9", qr: "data:image/svg+xml;utf-8,%3Csvg%2F%3E", secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://totp/studio:noa%40example.com?secret=JBSWY3DPEHPK3PXP" })),
      mfaVerify: vi.fn(),
    };
    render(<AccountScreen account={{ profile: PROFILE, aal: "aal1", service, updateProfile: vi.fn(), signOut: vi.fn(), refreshAal: vi.fn() }} he={false} dk={false} />);
    fireEvent.click(await screen.findByRole("button", { name: "Turn on two-step verification" }));
    expect(await screen.findByRole("img", { name: "QR code for the authenticator app" })).toBeTruthy();
    expect(screen.getByText("Cannot scan? Type the key instead:")).toBeTruthy();
    expect(screen.getByRole("link", { name: "On your phone? Open it in the authenticator app" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy the key" }));
    expect(await screen.findByText("Key copied")).toBeTruthy();
    writeText.mockRejectedValueOnce(new Error("denied"));
    fireEvent.click(screen.getByRole("button", { name: "Copy the key" }));
    expect(await screen.findByText("Copying failed. Select the key and copy it.")).toBeTruthy();
    service.mfaVerify.mockImplementationOnce(async () => {
      throw new AccountError("setup_expired");
    });
    fireEvent.change(screen.getByLabelText("Code from the app"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText("This setup is no longer valid, perhaps because one was started on another device. Start again.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Turn on two-step verification" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("button", { name: "Turn on two-step verification" })).toBeTruthy();
  });

  it("a forgotten password: the address, the emailed code, the new password and their errors", async () => {
    const service = gateService({
      savedSession: vi.fn(async () => null),
      requestPasswordReset: vi.fn(async () => {}),
      verifyResetCode: vi.fn(async () => {}),
      changePassword: vi.fn(async () => {}),
      claim: vi.fn(async () => ({ status: "ok", profile: PROFILE, deviceId: "d1" })),
    });
    service.requestPasswordReset.mockRejectedValueOnce(new AccountError("rate_limited"));
    service.verifyResetCode.mockRejectedValueOnce(new AccountError("wrong_code"));
    service.changePassword.mockRejectedValueOnce(new AccountError("same_password")).mockRejectedValueOnce(new AccountError("weak_password")).mockRejectedValueOnce(new Error("offline"));
    gate(service);
    fireEvent.click(await screen.findByRole("button", { name: "Forgot password" }));
    expect(screen.getByText("We email you a 6-digit code, and with it you choose a new password.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "dana@" } });
    fireEvent.click(screen.getByRole("button", { name: "Send a code" }));
    expect(await screen.findByText("Not a valid email address.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "dana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send a code" }));
    expect(await screen.findByText("Too many requests in a short time. Try again in a few minutes.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Send a code" }));
    expect(await screen.findByText(/has an account, a 6-digit code is on its way to it/)).toBeTruthy();
    expect(screen.getByText("Nothing after a few minutes? Check the spam folder, ask for a new code, or contact the administrator.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Code from the email"), { target: { value: "111111" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("The code is wrong or has expired. You can ask for a new one.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));
    expect(await screen.findByText("A new code was sent")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Code from the email"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    const type = (first, second = first) => {
      fireEvent.change(screen.getByLabelText("New password"), { target: { value: first } });
      fireEvent.change(screen.getByLabelText("The new password again"), { target: { value: second } });
      fireEvent.click(screen.getByRole("button", { name: "Save and sign in" }));
    };
    expect(await screen.findByText("At least 10 characters")).toBeTruthy();
    type("short");
    expect(await screen.findByText("At least 10 characters.")).toBeTruthy();
    type("x".repeat(73));
    expect(await screen.findByText("At most 72 characters.")).toBeTruthy();
    type("a-new-password", "another-one");
    expect(await screen.findByText("The passwords differ.")).toBeTruthy();
    type("a-new-password");
    expect(await screen.findByText("That is the current password. Choose another one.")).toBeTruthy();
    type("a-new-password");
    expect(await screen.findByText("The password is too weak. Try a longer one.")).toBeTruthy();
    type("a-new-password");
    expect(await screen.findByText("Saving failed. Try again.")).toBeTruthy();
    type("a-new-password");
    expect(await screen.findByText("studio")).toBeTruthy();
  });

  it("accounts: the new-account checks", async () => {
    const admin = {
      listAccounts: vi.fn(async () => [{ id: "u2", email: "noa@example.com", fullName: "", phone: "", role: "subscriber", status: "active", plan: "trial", deviceLimit: 2, createdAt: "2026-10-05T08:00:00Z", lastSeenAt: null, devices: 0, clients: 0, readings: 0 }]),
      createAccount: vi.fn(async () => ({ userId: "u9" })),
    };
    render(<AdminScreen account={{ profile: PROFILE, aal: "aal2", service: { admin } }} he={false} dk={false} />);
    fireEvent.click(await screen.findByRole("button", { name: "New account" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "noa@" } });
    fireEvent.click(screen.getByRole("button", { name: "Open the account" }));
    expect(await screen.findByText("Not a valid email address, e.g. name@example.com")).toBeTruthy();
    expect(screen.getByText("A full name is needed: it appears in the watermark and on reports.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "" } });
    expect(screen.getByText("An email address is needed.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "NOA@example.com" } });
    expect(screen.getByText("This address already has an account.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Phone (optional)"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("First password"), { target: { value: "short" } });
    expect(screen.getByText("Not a valid phone number: 9 to 15 digits (+ - and spaces are fine).")).toBeTruthy();
    expect(screen.getByText("At least 10 characters.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("First password"), { target: { value: "y".repeat(73) } });
    expect(screen.getByText("At most 72 characters.")).toBeTruthy();
    expect(admin.createAccount).not.toHaveBeenCalled();
  });

  it("accounts: asks for two-step first, then lists and opens an account", async () => {
    const admin = {
      listAccounts: vi.fn(async () => [{ id: "u2", email: "noa@example.com", fullName: "", phone: "", role: "subscriber", status: "suspended", plan: "trial", deviceLimit: 2, createdAt: "2026-10-05T08:00:00Z", lastSeenAt: null, devices: 0, clients: 1, readings: 1 }]),
      listDevices: vi.fn(async () => []),
      audit: vi.fn(async () => []),
      createAccount: vi.fn(async () => { throw new AccountError("invalid_email"); }),
      updateAccount: vi.fn(),
      setPassword: vi.fn(),
      revokeDevice: vi.fn(),
    };
    const { unmount } = render(<AdminScreen account={{ profile: { id: "me" }, aal: "aal1", service: { admin } }} he={false} dk={false} />);
    expect(screen.getByText(/Managing accounts needs two-step verification/)).toBeTruthy();
    unmount();
    render(<AdminScreen account={{ profile: { id: "me" }, aal: "aal2", service: { admin } }} he={false} dk={false} />);
    const row = await screen.findByRole("button", { name: /noa@example.com/ });
    expect(row.textContent).toContain("Trial · Suspended · 0 devices · 1 client · never signed in");
    fireEvent.click(screen.getByRole("button", { name: "New account" }));
    // details that pass the screen's checks, refused by the server's own
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "maya@example.com" } });
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Maya" } });
    fireEvent.click(screen.getByRole("button", { name: "Open the account" }));
    expect(await screen.findByText("Invalid email address.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back to accounts" }));
    fireEvent.click(await screen.findByRole("button", { name: /noa@example.com/ }));
    expect(await screen.findByText("No device has signed in yet.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Activate the account again" })).toBeTruthy();
  });

  it("labels: plans, statuses, audit lines and dates", () => {
    expect([planLabel("founder", false), planLabel("odd", false), statusLabel("active", false)]).toEqual(["Founder", "odd", "Active"]);
    expect(auditLine({ action: "session_claimed", detail: { replaced: true } }, false)).toBe("Signed in (signed the previous device out)");
    expect(auditLine({ action: "device_refused", detail: { label: "Edge · Mac", reason: "changes" } }, true)).toBe("מכשיר נחסם · Edge · Mac · יותר מדי מכשירים חדשים");
    expect(auditLine({ action: "account_updated", detail: { plan: "pro" } }, false)).toBe("Account changed · plan: pro");
    expect(auditLine({ action: "something_new", detail: {} }, false)).toBe("something_new");
    expect([dateTime(null), dateTime("not a date")]).toEqual(["", ""]);
  });
});
