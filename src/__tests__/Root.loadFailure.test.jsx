// @vitest-environment jsdom
/* Root when the app cannot load (offline, or a deploy that no longer has its files): a way to try again. */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("../AppWorld.jsx", () => {
  throw new Error("a chunk this deploy no longer has");
});
const { default: Root } = await import("../Root.jsx");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  history.replaceState(null, "", "/");
});

describe("Root when the app cannot load", () => {
  it("says so and offers a reload, instead of a blank page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // React reports the caught error
    history.replaceState(null, "", "/#studio");
    render(<Root storage={null} />);
    expect((await screen.findByRole("alert")).textContent).toContain("לא הצלחנו לטעון");
    expect(screen.getByRole("button", { name: "רענון" })).toBeTruthy();
  });
});
