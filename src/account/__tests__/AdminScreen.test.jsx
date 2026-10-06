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
  render(<AdminScreen account={{ profile: ME, aal: overrides.aal || "aal2", service: { admin } }} he dk />);
  return admin;
}
const openAccount = async (name) => fireEvent.click(await screen.findByRole("button", { name: new RegExp(name) }));

afterEach(() => {
  cleanup();
  delete navigator.clipboard;
});

describe("accounts on a computer", () => {
  it("keeps the account list beside the open account, and marks which one is open", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation((q) => ({
      matches: !q.includes("reduce") && 1300 >= Number((q.match(/min-width: ([0-9]+)px/) || [])[1] || 0),
      addEventListener() {},
      removeEventListener() {},
    }));
    try {
      const admin = setup();
      const list = await screen.findByRole("region", { name: "רשימת החשבונות" });
      const open = screen.getByRole("region", { name: "החשבון הפתוח" });
      expect(within(open).getByText("בחרו חשבון מהרשימה, או פתחו חשבון חדש.")).toBeTruthy();
      fireEvent.click(await within(list).findByRole("button", { name: /דנה לוי/ }));
      expect(await within(open).findByRole("heading", { name: "דנה לוי" })).toBeTruthy();
      expect(within(list).getByRole("button", { name: /דנה לוי/ }).getAttribute("aria-current")).toBe("true");
      // a change reloads the list beside it
      const loads = admin.listAccounts.mock.calls.length;
      fireEvent.click(within(open).getByRole("button", { name: "השהיית החשבון" }));
      fireEvent.click(await within(open).findByRole("button", { name: "כן, להשהות" }));
      await waitFor(() => expect(admin.listAccounts.mock.calls.length).toBeGreaterThan(loads + 1));
      fireEvent.click(within(list).getByRole("button", { name: "חשבון חדש" }));
      expect(await within(open).findByRole("heading", { name: "חשבון חדש" })).toBeTruthy();
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe("accounts (admin)", () => {
  it("first asks for two-step verification, without which the database refuses admin work anyway", async () => {
    const admin = setup({ aal: "aal1" });
    expect(await screen.findByText(/כדי לנהל חשבונות צריך אימות דו-שלבי/)).toBeTruthy();
    expect(admin.listAccounts).not.toHaveBeenCalled();
  });

  it("writes counts in natural Hebrew", async () => {
    setup();
    expect((await screen.findByRole("button", { name: /שלומי/ })).textContent).toContain("מכשיר אחד");
  });

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

  it("says when the server finds the address already has an account", async () => {
    const admin = setup({ createAccount: vi.fn(async () => { throw new AccountError("email_taken"); }) });
    fireEvent.click(await screen.findByRole("button", { name: "חשבון חדש" }));
    fireEvent.change(screen.getByLabelText("אימייל"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("שם מלא"), { target: { value: "נועה" } });
    fireEvent.click(screen.getByRole("button", { name: "פתיחת החשבון" }));
    expect(await screen.findByText("לכתובת הזאת כבר יש חשבון.")).toBeTruthy();
    expect(admin.createAccount).toHaveBeenCalledTimes(1);
  });

  it("checks the details before opening: the address, one already in the list, the name, the phone and the password", async () => {
    const admin = setup();
    fireEvent.click(await screen.findByRole("button", { name: "חשבון חדש" }));
    const email = screen.getByLabelText("אימייל");
    const INVALID = "כתובת אימייל לא תקינה, למשל name@example.com";
    // nothing is flagged while typing; a field is checked once it is left
    fireEvent.change(email, { target: { value: "noa@example" } });
    expect(screen.queryByText(INVALID)).toBeNull();
    fireEvent.blur(email);
    expect(await screen.findByText(INVALID)).toBeTruthy();
    expect(email.getAttribute("aria-invalid")).toBe("true");
    for (const bad of ["noa example.com", "noa@@example.com", ".noa@example.com", "noa..levi@example.com", "noa@example.c", "noa@-example.com", "noa@example.com."]) {
      fireEvent.change(email, { target: { value: bad } });
      expect(screen.getByText(INVALID)).toBeTruthy();
    }
    // an address already in the list, whatever its case: no round trip needed
    fireEvent.change(email, { target: { value: "Dana@Example.com" } });
    expect(screen.getByText("לכתובת הזאת כבר יש חשבון.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("טלפון (לא חובה)"), { target: { value: "052-12ab" } });
    fireEvent.change(screen.getByLabelText("סיסמה ראשונה"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "פתיחת החשבון" }));
    // every problem shows, the first field gets the focus, and nothing is sent
    expect(await screen.findByText("צריך שם מלא: הוא מופיע בסימן המים ועל הדוחות.")).toBeTruthy();
    expect(screen.getByText("מספר טלפון לא תקין: 9 עד 15 ספרות (אפשר גם + - ורווחים).")).toBeTruthy();
    expect(screen.getByText("לפחות 10 תווים.")).toBeTruthy();
    expect(document.activeElement).toBe(email);
    expect(admin.createAccount).not.toHaveBeenCalled();
    // corrected, it opens, with the address trimmed and in lower case
    fireEvent.change(email, { target: { value: " Noa.Levi+studio@Example.co.il " } });
    fireEvent.change(screen.getByLabelText("שם מלא"), { target: { value: " נועה לוי " } });
    fireEvent.change(screen.getByLabelText("טלפון (לא חובה)"), { target: { value: "+972 52-123-4567" } });
    fireEvent.change(screen.getByLabelText("סיסמה ראשונה"), { target: { value: "a-long-password" } });
    fireEvent.click(screen.getByRole("button", { name: "פתיחת החשבון" }));
    expect(await screen.findByText("החשבון נפתח")).toBeTruthy();
    expect(admin.createAccount).toHaveBeenCalledWith({ email: "noa.levi+studio@example.co.il", fullName: "נועה לוי", phone: "+972 52-123-4567", plan: "pro", password: "a-long-password" });
  });

  it("focuses the first field with a problem, and still opens when the account list could not load", async () => {
    const admin = setup({ listAccounts: vi.fn(async () => { throw new Error("offline"); }) });
    fireEvent.click(await screen.findByRole("button", { name: "חשבון חדש" }));
    fireEvent.change(screen.getByLabelText("אימייל"), { target: { value: "noa@example.com" } });
    fireEvent.change(screen.getByLabelText("סיסמה ראשונה"), { target: { value: "x".repeat(73) } });
    fireEvent.click(screen.getByRole("button", { name: "פתיחת החשבון" }));
    expect(await screen.findByText("עד 72 תווים.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("שם מלא"));
    fireEvent.change(screen.getByLabelText("שם מלא"), { target: { value: "נועה" } });
    fireEvent.change(screen.getByLabelText("סיסמה ראשונה"), { target: { value: "a-long-password" } });
    fireEvent.click(screen.getByRole("button", { name: "פתיחת החשבון" }));
    expect(await screen.findByText("החשבון נפתח")).toBeTruthy();
    expect(admin.createAccount).toHaveBeenCalledTimes(1);
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
