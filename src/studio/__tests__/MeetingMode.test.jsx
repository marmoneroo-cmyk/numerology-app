// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import MeetingMode from "../MeetingMode.jsx";

const READING = {
  person: "רחל כהן",
  main: { value: 7, label: "מספר מסלול החיים" },
  numbers: [
    { value: 3, label: "ביטוי" },
    { value: 5, label: "נשמה" },
    { value: 9, label: "שנה אישית" },
  ],
  text: "מסלול 7 הוא מסלול של חיפוש אחר אמת ועומק. הכוח שלו נמצא בשקט ובהתבוננות.",
};
const CLOSE = "סיום הפגישה (Esc)";
const OPENER = "פתיחת הפגישה";

/** The device's reduced-motion setting. */
const motion = (reduce) =>
  vi.stubGlobal("matchMedia", vi.fn((q) => ({ matches: reduce && q.includes("reduce"), addEventListener() {}, removeEventListener() {} })));

/** Meeting mode over a page with a button behind it, as on the reading screen. */
function Page({ open, onClose = () => {}, ...props }) {
  return (
    <>
      <button type="button">{OPENER}</button>
      <MeetingMode open={open} onClose={onClose} he {...READING} {...props} />
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.style.overflow = "";
});

describe("MeetingMode", () => {
  it("renders nothing while closed", () => {
    const { container } = render(<MeetingMode open={false} onClose={() => {}} he {...READING} />);
    expect(container.innerHTML).toBe("");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a modal dialog of its own, outside the page's containers", () => {
    const { container } = render(<Page open />);
    const dialog = screen.getByRole("dialog", { name: "מצב פגישה" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.parentElement).toBe(document.body);
    expect(container.contains(dialog)).toBe(false);
    expect(dialog.classList.contains("st-root")).toBe(true);
    expect(dialog.getAttribute("dir")).toBe("rtl");
    expect(dialog.getAttribute("lang")).toBe("he");
  });

  it("shows the name, the main number with its label, the other numbers and the meaning", () => {
    render(<Page open />);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("heading", { name: "רחל כהן" })).toBeTruthy();
    expect(dialog.getByText("7")).toBeTruthy();
    expect(dialog.getByText("מספר מסלול החיים")).toBeTruthy();
    const chips = dialog.getAllByRole("listitem").map((li) => [...li.children].map((el) => el.textContent));
    expect(chips).toEqual([["3", "ביטוי"], ["5", "נשמה"], ["9", "שנה אישית"]]);
    expect(dialog.getByText(READING.text)).toBeTruthy();
  });

  it("titles the reading as a numerology map unless told otherwise", () => {
    const { rerender } = render(<Page open />);
    expect(screen.getByText("מפת נומרולוגיה")).toBeTruthy();
    rerender(<Page open eyebrow="קריאה שנתית" />);
    expect(screen.getByText("קריאה שנתית")).toBeTruthy();
    expect(screen.queryByText("מפת נומרולוגיה")).toBeNull();
  });

  it("shows master numbers and compound values exactly as given", () => {
    render(<Page open main={{ value: 11, label: "מספר מסלול החיים" }} numbers={[{ value: 22, label: "ביטוי" }, { value: "33/6", label: "נשמה" }]} />);
    expect(screen.getByText("11")).toBeTruthy();
    expect(screen.getByText("22")).toBeTruthy();
    expect(screen.getByText("33/6")).toBeTruthy();
  });

  it("moves the focus to the close button, which takes the gold press", () => {
    render(<Page open />);
    const close = screen.getByRole("button", { name: CLOSE });
    expect(document.activeElement).toBe(close);
    expect(close.classList.contains("fx")).toBe(true);
  });

  it("closes on Escape from anywhere and on the button, and not on other keys", () => {
    const onClose = vi.fn();
    render(<Page open onClose={onClose} />);
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: CLOSE }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("keeps the focus on its one button when Tab is pressed", () => {
    render(<Page open />);
    const close = screen.getByRole("button", { name: CLOSE });
    screen.getByRole("button", { name: OPENER }).focus();
    expect(fireEvent.keyDown(document.activeElement, { key: "Tab", shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(close);
    expect(fireEvent.keyDown(close, { key: "Tab" })).toBe(false);
    expect(document.activeElement).toBe(close);
  });

  it("gives the focus back to where it was after closing", () => {
    const { rerender } = render(<Page open={false} />);
    const opener = screen.getByRole("button", { name: OPENER });
    opener.focus();
    rerender(<Page open />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: CLOSE }));
    rerender(<Page open={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("stops the page behind from scrolling while open, and restores it after closing or unmounting", () => {
    const page = document.documentElement;
    page.style.overflow = "auto";
    const { rerender, unmount } = render(<Page open={false} />);
    expect(page.style.overflow).toBe("auto");
    rerender(<Page open />);
    expect(page.style.overflow).toBe("hidden");
    // <html> scrolls the window in the app; a locked <body> would only become a scroll box
    expect(document.body.style.overflow).toBe("");
    rerender(<Page open={false} />);
    expect(page.style.overflow).toBe("auto");
    rerender(<Page open />);
    expect(page.style.overflow).toBe("hidden");
    unmount();
    expect(page.style.overflow).toBe("auto");
  });

  it("lets go of the keyboard once closed", () => {
    const onClose = vi.fn();
    const { rerender } = render(<Page open onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<Page open={false} onClose={onClose} />);
    // fireEvent returns false only when a listener called preventDefault
    expect(fireEvent.keyDown(document, { key: "Tab" })).toBe(true);
    expect(fireEvent.keyDown(document, { key: "Escape" })).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not reach for an element that has left the page", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const focus = vi.spyOn(opener, "focus");
    const { rerender } = render(<MeetingMode open onClose={() => {}} he {...READING} />);
    opener.remove();
    rerender(<MeetingMode open={false} onClose={() => {}} he {...READING} />);
    expect(focus).not.toHaveBeenCalled();
  });

  it("brings the main number in with motion, and shows it at once under reduced motion", () => {
    motion(false);
    const { unmount } = render(<Page open />);
    expect(screen.getByRole("dialog").classList.contains("st-meet-enter")).toBe(true);
    unmount();
    motion(true);
    render(<Page open />);
    expect(screen.getByRole("dialog").classList.contains("st-meet-enter")).toBe(false);
    expect(screen.getByText("7")).toBeTruthy();
  });

  it("speaks English", () => {
    render(<MeetingMode open onClose={() => {}} he={false} person="Rachel Cohen" main={{ value: 7, label: "Life path number" }} />);
    const dialog = screen.getByRole("dialog", { name: "Meeting mode" });
    expect(dialog.getAttribute("dir")).toBe("ltr");
    expect(dialog.getAttribute("lang")).toBe("en");
    expect(within(dialog).getByRole("button", { name: "End the meeting (Esc)" })).toBeTruthy();
    expect(within(dialog).getByText("Numerology map")).toBeTruthy();
    expect(within(dialog).getByRole("heading", { name: "Rachel Cohen" })).toBeTruthy();
    expect(within(dialog).queryByRole("list")).toBeNull();
    expect(dialog.querySelector(".st-meet-text")).toBeNull();
  });
});
