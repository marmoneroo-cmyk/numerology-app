// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import AdminScreen from "../AdminScreen.jsx";
import { AccountError } from "../service.js";

const ME = { id: "admin-1", email: "shlomi@example.com", fullName: "שלומי", role: "admin" };
const ACCOUNTS = [
  { id: "admin-1", email: "shlomi@example.com", fullName: "שלומי", phone: "", role: "admin", status: "active", plan: "pro", deviceLimit: 2, createdAt: "2026-10-05T08:00:00Z", lastSeenAt: "2026-10-05T09:00:00Z", devices: 1, clients: 0, readings: 0 },
  { id: "u1", email: "dana@example.com", fullName: "דנה לוי", phone: "052-1234567", role: "subscriber", status: "active", plan: "founder", deviceLimit: 2, createdAt: "2026-10-05T08:30:00Z", lastSeenAt: "2026-10-05T10:00:00Z", devices: 2, clients: 14, readings: 31 },
  { id: "u2", email: "rina@example.com", fullName: "רינה", phone: "", role: "subscriber", status: "suspended", plan: "basic", deviceLimit: 1, createdAt: "2026-10-04T08:30:00Z", lastSeenAt: null, devices: 0, clients: 0, readings: 0 },
];

function setup(overrides = {}) {
  const admin = {
    listAccounts: vi.fn(async () => ACCOUNTS),
    createAccount: vi.fn(async () => ({ userId: "u9" })),
    updateAccount: vi.fn(async () => ({ status: "ok" })),
    setPassword: vi.fn(async () => ({ status: "ok" })),
    listDevices: vi.fn(async () => [
      { id: "d1", label: "Chrome · Windows", status: "approved", createdAt: "2026-10-05T08:30:00Z", lastSeenAt: "2026-10-05T10:00:00Z", current: true },
      { id: "d2", label: "Safari · iPhone", status: "approved", createdAt: "2026-10-05T09:00:00Z", lastSeenAt: "2026-10-05T09:30:00Z", current: false },
    ]),
    revokeDevice: vi.fn(async () => ({ status: "ok" })),
    audit: vi.fn(async () => [
      { id: 2, action: "device_added", detail: { label: "Safari · iPhone" }, at: "2026-10-05T09:00:00Z" },
      { id: 1, action: "account_created", detail: {}, at: "2026-10-05T08:30:00Z" },
    ]),
    ...overrides,
  };
  render(<AdminScreen account={{ profile: ME, service: { admin } }} he dk />);
  return admin;
}
const openAccount = async (name) => fireEvent.click(await screen.findByRole("button", { name: new RegExp(name) }));

afterEach(() => {
  cleanup();
  delete navigator.clipboard;
});

describe("accounts (admin)", () => {
  it("lists the accounts with plan, status and numbers, and filters them", async () => {
    setup();
    const dana = await screen.findByRole("button", { name: /דנה לוי/ });
    expect(dana.textContent).toContain("מייסדים");
    expect(dana.textContent).toContain("14 לקוחות");
    expect((await screen.findByRole("button", { name: /רינה/ })).textContent).toContain("מושהה");
    fireEvent.change(screen.getByLabelText("חיפוש חשבונות"), { target: { value: "rina" } });
    await waitFor(() => expect(screen.queryByRole("button", { name: /דנה לוי/ })).toBeNull());
  });

  it("opens an account with a generated first password, and shows what to hand over", async () => {
    const admin = setup();
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn(async () => {}) }, configurable: true });
    fireEvent.click(await screen.findByRole("button", { name: "חשבון חדש" }));
    fireEvent.change(screen.getByLabelText("אימייל"), { target: { value: "noa@example.com" } });
    fireEvent.change(screen.getByLabelText("שם מלא"), { target: { value: "נועה" } });
    fireEvent.change(screen.getByLabelText("מסלול"), { target: { value: "founder" } });
    const password = screen.getByLabelText("סיסמה ראשונה").value;
    expect(password).toMatch(/^[a-zA-Z2-9]{14}$/);
    fireEvent.click(screen.getByRole("button", { name: "פתיחת החשבון" }));
    expect(await screen.findByText("החשבון נפתח")).toBeTruthy();
    expect(admin.createAccount).toHaveBeenCalledWith({ email: "noa@example.com", fullName: "נועה", phone: "", plan: "founder", password });
    const handover = screen.getByTestId("handover");
    expect(handover.textContent).toContain("noa@example.com");
    expect(handover.textContent).toContain(password);
    fireEvent.click(screen.getByRole("button", { name: "העתקת פרטי הכניסה" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    expect(navigator.clipboard.writeText.mock.calls[0][0]).toContain(password);
  });

  it("says when an address already has an account", async () => {
    setup({ createAccount: vi.fn(async () => { throw new AccountError("email_taken"); }) });
    fireEvent.click(await screen.findByRole("button", { name: "חשבון חדש" }));
    fireEvent.change(screen.getByLabelText("אימייל"), { target: { value: "dana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "פתיחת החשבון" }));
    expect(await screen.findByText("לכתובת הזאת כבר יש חשבון.")).toBeTruthy();
  });

  it("changes an account's plan and device limit", async () => {
    const admin = setup();
    await openAccount("דנה לוי");
    fireEvent.change(await screen.findByLabelText("מסלול"), { target: { value: "studio" } });
    fireEvent.change(screen.getByLabelText("מכשירים מותרים"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "שמירת השינויים" }));
    await waitFor(() => expect(admin.updateAccount).toHaveBeenCalledWith("u1", { plan: "studio", deviceLimit: 3 }));
  });

  it("suspends an account after a confirmation, and activates it again", async () => {
    const admin = setup();
    await openAccount("דנה לוי");
    fireEvent.click(await screen.findByRole("button", { name: "השהיית החשבון" }));
    fireEvent.click(screen.getByRole("button", { name: "כן, להשהות" }));
    await waitFor(() => expect(admin.updateAccount).toHaveBeenCalledWith("u1", { status: "suspended" }));
    cleanup();
    const again = setup();
    await openAccount("רינה");
    fireEvent.click(await screen.findByRole("button", { name: "הפעלת החשבון מחדש" }));
    await waitFor(() => expect(again.updateAccount).toHaveBeenCalledWith("u2", { status: "active" }));
  });

  it("sets a new password and shows it once", async () => {
    const admin = setup();
    await openAccount("דנה לוי");
    fireEvent.click(await screen.findByRole("button", { name: "קביעת סיסמה חדשה" }));
    fireEvent.click(screen.getByRole("button", { name: "כן, לקבוע סיסמה חדשה" }));
    await waitFor(() => expect(admin.setPassword).toHaveBeenCalled());
    const [userId, password] = admin.setPassword.mock.calls[0];
    expect(userId).toBe("u1");
    expect((await screen.findByTestId("handover")).textContent).toContain(password);
  });

  it("revokes a device after a confirmation, and shows the account's log", async () => {
    const admin = setup();
    await openAccount("דנה לוי");
    const devices = await screen.findByRole("list", { name: "מכשירים" });
    fireEvent.click(within(devices).getByRole("button", { name: "ביטול Safari · iPhone" }));
    fireEvent.click(screen.getByRole("button", { name: "כן, לבטל את Safari · iPhone" }));
    await waitFor(() => expect(admin.revokeDevice).toHaveBeenCalledWith("d2"));
    const log = screen.getByRole("list", { name: "יומן פעולות" });
    expect(within(log).getByText(/מכשיר חדש נוסף · Safari · iPhone/)).toBeTruthy();
    expect(within(log).getByText(/החשבון נפתח/)).toBeTruthy();
  });

  it("never offers to suspend or demote one's own account", async () => {
    setup();
    await openAccount("שלומי");
    await screen.findByRole("list", { name: "מכשירים" });
    expect(screen.queryByRole("button", { name: "השהיית החשבון" })).toBeNull();
    expect(screen.queryByLabelText("תפקיד")).toBeNull();
  });
});
