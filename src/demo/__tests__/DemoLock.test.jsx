// @vitest-environment jsdom
/* The demo's lock on interpretations: blurred, and the real words are nowhere in the page. */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Locked, { DemoLockContext, scramble, textOf } from "../DemoLock.jsx";

afterEach(cleanup);

const MEANING = "שנת התחלות חדשות. הזמן לפעול.";

describe("scramble", () => {
  it("keeps the length, the spaces and the punctuation, and changes the letters", () => {
    const out = scramble(MEANING);
    expect(out).toHaveLength(MEANING.length);
    expect(out.split("").filter((ch) => ch === " " || ch === ".").length).toBe(MEANING.split("").filter((ch) => ch === " " || ch === ".").length);
    expect(out).not.toBe(MEANING);
    for (const word of ["שנת", "התחלות", "חדשות", "הזמן", "לפעול"]) expect(out).not.toContain(word);
  });

  it("is the same every time, and keeps Latin capitals capital", () => {
    expect(scramble(MEANING)).toBe(scramble(MEANING));
    const latin = scramble("Year of New Beginnings");
    expect(latin[0]).toMatch(/[A-Z]/);
    expect(latin).not.toContain("Year");
  });
});

describe("textOf", () => {
  it("collects the words through elements", () => {
    expect(textOf(["א", 1, <b key="b">ב</b>, null, false])).toBe("א1ב");
  });
});

describe("Locked", () => {
  it("shows the interpretation as it is outside the demo", () => {
    render(<Locked>{MEANING}</Locked>);
    expect(screen.getByText(MEANING)).toBeTruthy();
  });

  it("in the demo, blurs it and keeps the real words out of the page", () => {
    const { container } = render(
      <DemoLockContext.Provider value>
        <p>
          <Locked chip>{MEANING}</Locked>
        </p>
      </DemoLockContext.Provider>,
    );
    expect(container.textContent).not.toContain("התחלות");
    expect(container.querySelector(".demo-locked").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("הפירוש המלא נפתח במנוי")).toBeTruthy();
    expect(container.querySelector(".demo-lock-chip")).toBeTruthy();
  });

  it("speaks English, and leaves an empty text alone", () => {
    const { container } = render(
      <DemoLockContext.Provider value>
        <Locked he={false}>Year of new beginnings.</Locked>
        <Locked>{""}</Locked>
      </DemoLockContext.Provider>,
    );
    expect(screen.getByText("The full reading opens with a subscription")).toBeTruthy();
    expect(container.querySelectorAll(".demo-lock")).toHaveLength(1);
  });
});
