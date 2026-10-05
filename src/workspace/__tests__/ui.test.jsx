// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, renderHook, act, waitFor, screen, cleanup } from "@testing-library/react";
import { useLoad, Field, ScreenBoundary } from "../ui.jsx";
import { colors } from "../ui.jsx";

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useLoad", () => {
  it("keeps the answer to the latest request when an older one arrives late", async () => {
    const calls = {};
    const { result, rerender } = renderHook(({ q }) => useLoad(() => (calls[q] = deferred()).promise, [q]), { initialProps: { q: "ל" } });
    rerender({ q: "לוי" });
    await act(async () => calls["לוי"].resolve(["רחל לוי"]));
    await act(async () => calls["ל"].resolve(["רחל לוי", "משה לב"]));
    expect(result.current).toMatchObject({ loading: false, data: ["רחל לוי"], error: null });
  });

  it("reports a failure", async () => {
    const { result } = renderHook(() => useLoad(() => Promise.reject(new Error("offline")), []));
    await waitFor(() => expect(result.current.error?.message).toBe("offline"));
    expect(result.current.loading).toBe(false);
  });
});

describe("Field", () => {
  const c = colors(true);

  it("ties the control to its error, or else to its hint", () => {
    const { rerender } = render(<Field label="שם" hint="כפי שבתעודה" c={c}>{(id) => <input id={id} />}</Field>);
    const input = screen.getByLabelText("שם");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(document.getElementById(input.getAttribute("aria-describedby")).textContent).toBe("כפי שבתעודה");
    rerender(<Field label="שם" hint="כפי שבתעודה" error="חובה למלא שם" c={c}>{(id) => <input id={id} />}</Field>);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(input.getAttribute("aria-describedby")).textContent).toBe("חובה למלא שם");
  });
});

describe("ScreenBoundary", () => {
  it("shows the fallback instead of a crashed screen", () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // React reports the caught error
    const Broken = () => {
      throw new Error("bad snapshot");
    };
    render(<ScreenBoundary fallback={<p>משהו השתבש</p>}><Broken /></ScreenBoundary>);
    expect(screen.getByText("משהו השתבש")).toBeTruthy();
  });
});
