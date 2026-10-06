// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import AccountScreen from "../AccountScreen.jsx";
import { AccountError } from "../service.js";
import { decodeDrawn } from "./qrPixels.js";

const PROFILE = { id: "u1", email: "dana@example.com", fullName: "דנה לוי", phone: "052-1234567", role: "subscriber", plan: "pro", deviceLimit: 2 };
const DEVICES = [
  { id: "d2", label: "Safari · iPhone", status: "approved", createdAt: "2026-10-02T10:00:00Z", lastSeenAt: "2026-10-04T10:00:00Z", current: false },
  { id: "d1", label: "Chrome · Windows", status: "approved", createdAt: "2026-10-01T10:00:00Z", lastSeenAt: "2026-10-05T10:00:00Z", current: true },
  { id: "d0", label: "Firefox · Linux", status: "revoked", createdAt: "2026-09-01T10:00:00Z", lastSeenAt: "2026-09-02T10:00:00Z", current: false },
];
const SERVER_QR = "data:image/svg+xml;utf-8,%3Csvg%2F%3E";
// the shape of the link Supabase returns
const APP_LINK = "otpauth://totp/numerology-app-orcin.vercel.app:dana%40example.com?algorithm=SHA1&digits=6&issuer=numerology-app-orcin.vercel.app&period=30&secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

function setup({ service: overrides = {}, aal = "aal1" } = {}) {
  const service = {
    updateProfile: vi.fn(async () => ({ status: "ok" })),
    changePassword: vi.fn(async () => {}),
    myDevices: vi.fn(async () => DEVICES),
    revokeMyDevice: vi.fn(async () => ({ status: "ok" })),
    mfaState: vi.fn(async () => ({ level: aal, needsCode: false, factorId: aal === "aal2" ? "f1" : null })),
    mfaEnroll: vi.fn(async () => ({ factorId: "f9", qr: SERVER_QR, secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP", uri: APP_LINK })),
    mfaVerify: vi.fn(async () => {}),
    ...overrides,
  };
  const account = { profile: PROFILE, aal, service, updateProfile: vi.fn(), signOut: vi.fn(), refreshAal: vi.fn(async () => {}) };
  render(<AccountScreen account={account} he dk />);
  return { service, account };
}

afterEach(cleanup);

describe("my account", () => {
  it("saves the name and phone, and updates the open profile", async () => {
    const { service, account } = setup();
    fireEvent.change(await screen.findByLabelText("שם מלא"), { target: { value: "דנה לוי-כהן" } });
    fireEvent.click(screen.getByRole("button", { name: "שמירת הפרטים" }));
    expect(await screen.findByText("הפרטים נשמרו")).toBeTruthy();
    expect(service.updateProfile).toHaveBeenCalledWith("דנה לוי-כהן", "052-1234567");
    expect(account.updateProfile).toHaveBeenCalledWith({ fullName: "דנה לוי-כהן", phone: "052-1234567" });
  });

  it("changes the password only when it is long enough and typed twice the same", async () => {
    const { service } = setup();
    const change = (a, b) => {
      fireEvent.change(screen.getByLabelText("סיסמה חדשה"), { target: { value: a } });
      fireEvent.change(screen.getByLabelText("הסיסמה החדשה שוב"), { target: { value: b } });
      fireEvent.click(screen.getByRole("button", { name: "החלפת סיסמה" }));
    };
    await screen.findByLabelText("סיסמה חדשה");
    change("short", "short");
    expect(await screen.findByText("לפחות 10 תווים")).toBeTruthy();
    change("a-long-password", "a-long-passw0rd");
    expect(await screen.findByText("הסיסמאות לא זהות")).toBeTruthy();
    expect(service.changePassword).not.toHaveBeenCalled();
    change("a-long-password", "a-long-password");
    expect(await screen.findByText("הסיסמה הוחלפה")).toBeTruthy();
    expect(service.changePassword).toHaveBeenCalledWith("a-long-password");
  });

  it("lists the devices, marks this one, and removes another after a confirmation", async () => {
    const { service } = setup();
    const list = await screen.findByRole("list", { name: "המכשירים בחשבון" });
    expect(within(list).getByText(/Chrome · Windows/).textContent).toContain("המכשיר הזה");
    expect(within(list).queryByText(/Firefox · Linux/)).toBeNull(); // removed devices are not listed
    fireEvent.click(within(list).getByRole("button", { name: "הסרת Safari · iPhone" }));
    fireEvent.click(screen.getByRole("button", { name: "כן, להסיר את Safari · iPhone" }));
    await waitFor(() => expect(service.revokeMyDevice).toHaveBeenCalledWith("d2"));
    expect(screen.queryByRole("button", { name: "הסרת Chrome · Windows" })).toBeNull();
  });

  it("shows the plan and the device limit", async () => {
    setup();
    expect(await screen.findByText(/מסלול: מקצועי/)).toBeTruthy();
    expect(screen.getByText(/עד 2 מכשירים/)).toBeTruthy();
  });

  it("says when removing a device failed", async () => {
    setup({ service: { revokeMyDevice: vi.fn(async () => { throw new Error("offline"); }) } });
    const list = await screen.findByRole("list", { name: "המכשירים בחשבון" });
    fireEvent.click(within(list).getByRole("button", { name: "הסרת Safari · iPhone" }));
    fireEvent.click(screen.getByRole("button", { name: "כן, להסיר את Safari · iPhone" }));
    expect(await screen.findByText("ההסרה נכשלה. נסו שוב.")).toBeTruthy();
  });

  it("changes the password with Enter as well", async () => {
    const { service } = setup();
    fireEvent.change(await screen.findByLabelText("סיסמה חדשה"), { target: { value: "a-long-password" } });
    fireEvent.change(screen.getByLabelText("הסיסמה החדשה שוב"), { target: { value: "a-long-password" } });
    fireEvent.submit(screen.getByLabelText("הסיסמה החדשה שוב").closest("form"));
    await waitFor(() => expect(service.changePassword).toHaveBeenCalledWith("a-long-password"));
  });

  it("sets up two-step verification: a sparse QR code, the key and the phone link, then a code from the app, and this session counts as verified", async () => {
    const { service, account } = setup();
    fireEvent.click(await screen.findByRole("button", { name: "הפעלת אימות דו-שלבי" }));
    const qr = await screen.findByRole("img", { name: "קוד QR לאפליקציית האימות" });
    // drawn here from the link, not the server's dense image: what it paints decodes back to the link,
    // black on white, a whole number of pixels per cell
    expect(qr.tagName.toLowerCase()).toBe("svg");
    const [, , cells, cellsHigh] = qr.getAttribute("viewBox").split(" ").map(Number);
    expect(cellsHigh).toBe(cells);
    expect(cells).toBeLessThanOrEqual(61);
    expect(Number(qr.getAttribute("width")) % cells).toBe(0);
    expect(Number(qr.getAttribute("width"))).toBeGreaterThanOrEqual(200);
    expect(qr.querySelector("rect").getAttribute("fill")).toBe("#fff");
    expect(qr.querySelector("path").getAttribute("fill")).toBe("#000");
    expect(decodeDrawn(qr.querySelector("path").getAttribute("d"), cells)).toBe(APP_LINK);
    // the focus moves to the start of what appeared, so the code is in view first
    await waitFor(() => expect(document.activeElement?.textContent).toContain("באפליקציית האימות בטלפון מוסיפים חשבון"));
    expect(screen.getByText("JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP")).toBeTruthy();
    expect(screen.getByRole("link", { name: "בטלפון? פתיחה ישירה באפליקציית האימות" }).getAttribute("href")).toBe(APP_LINK);
    fireEvent.change(screen.getByLabelText("קוד מהאפליקציה"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "אישור" }));
    expect(await screen.findByText("האימות הדו-שלבי פעיל")).toBeTruthy();
    expect(service.mfaVerify).toHaveBeenCalledWith("f9", "123456");
    expect(account.refreshAal).toHaveBeenCalled();
  });

  it("copies the key for typing into the app, and says when copying fails", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "הפעלת אימות דו-שלבי" }));
    expect(await screen.findByText("לא מצליחים לסרוק? מקלידים את המפתח:")).toBeTruthy();
    // the announcement area is in the page before anything is copied, so screen readers hear what lands in it
    const live = screen.getByRole("button", { name: "העתקת המפתח" }).parentElement.querySelector('[role="status"]');
    expect(live.textContent).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "העתקת המפתח" }));
    await waitFor(() => expect(live.textContent).toBe("המפתח הועתק"));
    expect(writeText).toHaveBeenCalledWith("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
    writeText.mockRejectedValueOnce(new Error("denied"));
    fireEvent.click(screen.getByRole("button", { name: "העתקת המפתח" }));
    await waitFor(() => expect(live.textContent).toBe("ההעתקה לא הצליחה. אפשר לסמן את המפתח ולהעתיק."));
  });

  it("goes back with cancel, the focus returning to the start button, and can start again", async () => {
    const { service } = setup();
    fireEvent.click(await screen.findByRole("button", { name: "הפעלת אימות דו-שלבי" }));
    fireEvent.change(await screen.findByLabelText("קוד מהאפליקציה"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "ביטול" }));
    const start = await screen.findByRole("button", { name: "הפעלת אימות דו-שלבי" });
    await waitFor(() => expect(document.activeElement).toBe(start));
    fireEvent.click(start);
    expect((await screen.findByLabelText("קוד מהאפליקציה")).value).toBe("");
    expect(service.mfaEnroll).toHaveBeenCalledTimes(2);
  });

  it("does not start twice while a start is on its way", async () => {
    let finish;
    const mfaEnroll = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    setup({ service: { mfaEnroll } });
    const start = await screen.findByRole("button", { name: "הפעלת אימות דו-שלבי" });
    fireEvent.click(start);
    await waitFor(() => expect(start.disabled).toBe(true));
    fireEvent.click(start);
    expect(mfaEnroll).toHaveBeenCalledTimes(1);
    finish({ factorId: "f9", qr: SERVER_QR, secret: "JBSWY3DPEHPK3PXP", uri: APP_LINK });
    expect(await screen.findByLabelText("קוד מהאפליקציה")).toBeTruthy();
  });

  it("starts over when the setup was replaced by one started elsewhere", async () => {
    setup({ service: { mfaVerify: vi.fn(async () => { throw new AccountError("setup_expired"); }) } });
    fireEvent.click(await screen.findByRole("button", { name: "הפעלת אימות דו-שלבי" }));
    fireEvent.change(await screen.findByLabelText("קוד מהאפליקציה"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "אישור" }));
    expect(await screen.findByText("ההגדרה הזאת כבר לא בתוקף, אולי כי התחילה הגדרה במכשיר אחר. מתחילים מחדש.")).toBeTruthy();
    const start = screen.getByRole("button", { name: "הפעלת אימות דו-שלבי" });
    await waitFor(() => expect(document.activeElement).toBe(start));
  });

  it("shows the server's QR image when it cannot draw its own, and the phone link only for an authenticator link", async () => {
    setup({ service: { mfaEnroll: vi.fn(async () => ({ factorId: "f9", qr: SERVER_QR, secret: "JBSWY3DPEHPK3PXP", uri: `otpauth://totp/x?secret=${"A".repeat(4000)}` })) } });
    fireEvent.click(await screen.findByRole("button", { name: "הפעלת אימות דו-שלבי" }));
    const qr = await screen.findByRole("img", { name: "קוד QR לאפליקציית האימות" });
    expect(qr.tagName.toLowerCase()).toBe("img");
    expect(qr.getAttribute("src")).toBe(SERVER_QR);
    cleanup();
    setup({ service: { mfaEnroll: vi.fn(async () => ({ factorId: "f9", qr: SERVER_QR, secret: "JBSWY3DPEHPK3PXP" })) } });
    fireEvent.click(await screen.findByRole("button", { name: "הפעלת אימות דו-שלבי" }));
    expect((await screen.findByRole("img", { name: "קוד QR לאפליקציית האימות" })).getAttribute("src")).toBe(SERVER_QR);
    expect(screen.queryByRole("link", { name: "בטלפון? פתיחה ישירה באפליקציית האימות" })).toBeNull();
    cleanup();
    setup({ service: { mfaEnroll: vi.fn(async () => ({ factorId: "f9", qr: SERVER_QR, secret: "JBSWY3DPEHPK3PXP", uri: "javascript:alert(1)" })) } });
    fireEvent.click(await screen.findByRole("button", { name: "הפעלת אימות דו-שלבי" }));
    expect(await screen.findByRole("img", { name: "קוד QR לאפליקציית האימות" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "בטלפון? פתיחה ישירה באפליקציית האימות" })).toBeNull();
  });

  it("shows two-step verification as on when it is", async () => {
    setup({ aal: "aal2" });
    expect(await screen.findByText("האימות הדו-שלבי פעיל")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "הפעלת אימות דו-שלבי" })).toBeNull();
  });
});
