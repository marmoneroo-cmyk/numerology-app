// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { ToastProvider, useToast } from "../Toasts.jsx";

function Saver({ text = "נשמר" }) {
  const toast = useToast();
  return <button onClick={() => toast(text)}>save</button>;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("toasts", () => {
  it("shows a short message in a live region, then removes it", () => {
    vi.useFakeTimers();
    render(<ToastProvider duration={2000}><Saver /></ToastProvider>);
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    expect(region.textContent).toBe("נשמר");
    act(() => vi.advanceTimersByTime(1999));
    expect(region.textContent).toBe("נשמר");
    act(() => vi.advanceTimersByTime(1));
    expect(region.textContent).toBe("");
  });

  it("keeps only the last three", () => {
    vi.useFakeTimers();
    function Many() {
      const toast = useToast();
      return <button onClick={() => ["1", "2", "3", "4", "5"].forEach((t) => toast(t))}>many</button>;
    }
    render(<ToastProvider><Many /></ToastProvider>);
    fireEvent.click(screen.getByRole("button", { name: "many" }));
    expect([...screen.getByRole("status").children].map((el) => el.textContent)).toEqual(["3", "4", "5"]);
  });

  it("does nothing outside a provider", () => {
    render(<Saver />);
    expect(() => fireEvent.click(screen.getByRole("button", { name: "save" }))).not.toThrow();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
