// @vitest-environment jsdom
/* The newer calculators: practical numbers, and two or three spellings of a name side by side. */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import PracticalNumbers from "../PracticalNumbers.jsx";
import NameCompare from "../NameCompare.jsx";

afterEach(cleanup);

const TITLES = { 1: "המנהיג", 4: "הבונה", 8: "המצליח", 22: "הבנאי הגדול" };
const numberTitle = (n) => TITLES[n] || "";

describe("practical numbers", () => {
  it("works out a phone number as it is typed, with its title and how it was calculated", () => {
    render(<PracticalNumbers he numberTitle={numberTitle} />);
    expect(screen.queryByTestId("practical-number")).toBeNull();
    fireEvent.change(screen.getByLabelText("מספר הטלפון"), { target: { value: "052-1234567" } });
    expect(screen.getByTestId("practical-number").textContent).toBe("8"); // 35 -> 8
    expect(screen.getByText("המצליח")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "איך זה חושב: טלפון" }));
    expect(within(screen.getByRole("dialog")).getByText("0+5+2+1+2+3+4+5+6+7 = 35")).toBeTruthy();
  });

  it("counts an address's letters too, keeping a master number", () => {
    render(<PracticalNumbers he numberTitle={numberTitle} />);
    fireEvent.click(screen.getByRole("button", { name: "כתובת" }));
    expect(screen.getByRole("button", { name: "כתובת" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.change(screen.getByLabelText("הכתובת"), { target: { value: "הרצל 12" } });
    expect(screen.getByTestId("practical-number").textContent).toBe("22");
  });

  it("speaks English", () => {
    render(<PracticalNumbers he={false} numberTitle={() => ""} />);
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "111" } });
    expect(screen.getByTestId("practical-number").textContent).toBe("3");
  });
});

describe("name comparison", () => {
  it("shows each spelling's numbers side by side and marks what differs from the first", () => {
    render(<NameCompare he numberTitle={numberTitle} />);
    fireEvent.change(screen.getByLabelText("השם הנוכחי"), { target: { value: "שני כהן" } });
    fireEvent.change(screen.getByLabelText("שם מוצע"), { target: { value: "שני כהן אזולאי" } });
    // שני כהן: 3+5+1+2+5+5 = 21 -> 3; with אזולאי: 40 -> 4
    expect(screen.getByTestId("compare-nv-0").querySelector(".calc-value").textContent).toBe("3");
    expect(screen.getByTestId("compare-nv-1").querySelector(".calc-value").textContent).toBe("4");
    expect(screen.getByTestId("compare-nv-1").className).toBe("calc-differs");
    expect(screen.getByTestId("compare-nv-0").className).toBe("");
    expect(screen.queryByTestId("compare-mat-0")).toBeNull(); // no date, no maturity
  });

  it("adds maturity once there is a birth date, and explains any cell", () => {
    render(<NameCompare he numberTitle={numberTitle} />);
    fireEvent.change(screen.getByLabelText("השם הנוכחי"), { target: { value: "שני כהן אזולאי" } });
    fireEvent.change(screen.getByLabelText("תאריך לידה (לא חובה)"), { target: { value: "15.08.1990" } });
    expect(screen.getByText(/שביל הגורל: 33/)).toBeTruthy();
    expect(screen.getByTestId("compare-mat-0").querySelector(".calc-value").textContent).toBe("1"); // 33 + 4 = 37 -> 1
    fireEvent.click(screen.getByRole("button", { name: "איך זה חושב: מספר הבגרות: שני כהן אזולאי" }));
    expect(within(screen.getByRole("dialog")).getByText("33+4 = 37")).toBeTruthy();
  });

  it("ignores a date that is not real", () => {
    render(<NameCompare he numberTitle={numberTitle} />);
    fireEvent.change(screen.getByLabelText("השם הנוכחי"), { target: { value: "שני" } });
    fireEvent.change(screen.getByLabelText("תאריך לידה (לא חובה)"), { target: { value: "31.02.1990" } });
    expect(screen.queryByTestId("compare-mat-0")).toBeNull();
  });
});
