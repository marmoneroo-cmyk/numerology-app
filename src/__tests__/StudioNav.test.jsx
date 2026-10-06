// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import StudioNav from "../StudioNav.jsx";

const TABS = [
  { k: "clients", l: "לקוחות" },
  { k: "reading", l: "קריאה" },
  { k: "account", l: "החשבון שלי" },
  { k: "admin", l: "חשבונות" },
];

afterEach(cleanup);

describe("the Studio's tools", () => {
  it("are buttons in one labelled block, the open one marked, and a click opens another", () => {
    const onSelect = vi.fn();
    render(<StudioNav label="כלי הסטודיו" active="reading" onSelect={onSelect} tabs={TABS} />);
    const nav = screen.getByRole("navigation", { name: "כלי הסטודיו" });
    const buttons = within(nav).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["לקוחות", "קריאה", "החשבון שלי", "חשבונות"]);
    // real buttons: reachable by keyboard, and never submitting a form around them
    expect(buttons.every((b) => b.type === "button")).toBe(true);
    expect(screen.getByRole("button", { name: "קריאה" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "לקוחות" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("button", { name: "קריאה" }).className).toContain("act");
    fireEvent.click(screen.getByRole("button", { name: "חשבונות" }));
    expect(onSelect).toHaveBeenCalledWith("admin");
  });

  it("lays the tools out in rows rather than one sideways-scrolling strip", () => {
    render(<StudioNav label="Studio tools" active="clients" onSelect={() => {}} tabs={TABS} />);
    // the grid and its wrapping live in App.jsx's .snav styles; the block carries that class, not the old strip's
    const nav = screen.getByRole("navigation", { name: "Studio tools" });
    expect(nav.className).toBe("snav");
  });
});
