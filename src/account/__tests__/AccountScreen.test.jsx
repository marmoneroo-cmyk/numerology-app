// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import AccountScreen from "../AccountScreen.jsx";

const PROFILE = { id: "u1", email: "dana@example.com", fullName: "דנה לוי", phone: "052-1234567", role: "subscriber", plan: "pro", deviceLimit: 2 };
const DEVICES = [
  { id: "d2", label: "Safari · iPhone", status: "approved", createdAt: "2026-10-02T10:00:00Z", lastSeenAt: "2026-10-04T10:00:00Z", current: false },
  { id: "d1", label: "Chrome · Windows", status: "approved", createdAt: "2026-10-01T10:00:00Z", lastSeenAt: "2026-10-05T10:00:00Z", current: true },
  { id: "d0", label: "Firefox · Linux", status: "revoked", createdAt: "2026-09-01T10:00:00Z", lastSeenAt: "2026-09-02T10:00:00Z", current: false },
];

function setup({ service: overrides = {}, aal = "aal1" } = {}) {
  const service = {
    updateProfile: vi.fn(async () => ({ status: "ok" })),
    changePassword: vi.fn(async () => {}),
    myDevices: vi.fn(async () => DEVICES),
    revokeMyDevice: vi.fn(async () => ({ status: "ok" })),
    mfaState: vi.fn(async () => ({ level: aal, needsCode: false, factorId: aal === "aal2" ? "f1" : null })),
    mfaEnroll: vi.fn(async () => ({ factorId: "f9", qr: "data:image/svg+xml;utf-8,%3Csvg%2F%3E", secret: "JBSWY3DPEHPK3PXP" })),
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

  it("sets up two-step verification: the QR code, then a code from the app, and this session counts as verified", async () => {
    const { service, account } = setup();
    fireEvent.click(await screen.findByRole("button", { name: "הפעלת אימות דו-שלבי" }));
    expect(await screen.findByAltText("קוד QR לאפליקציית האימות")).toBeTruthy();
    expect(screen.getByText("JBSWY3DPEHPK3PXP")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("קוד מהאפליקציה"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "אישור" }));
    expect(await screen.findByText("האימות הדו-שלבי פעיל")).toBeTruthy();
    expect(service.mfaVerify).toHaveBeenCalledWith("f9", "123456");
    expect(account.refreshAal).toHaveBeenCalled();
  });

  it("shows two-step verification as on when it is", async () => {
    setup({ aal: "aal2" });
    expect(await screen.findByText("האימות הדו-שלבי פעיל")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "הפעלת אימות דו-שלבי" })).toBeNull();
  });
});
