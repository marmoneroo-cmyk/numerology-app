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
    <AccountProvider active loadService={async () => service}>
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
