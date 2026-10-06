// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import PasswordInput from "../PasswordInput.jsx";
import { Field, colors } from "../../workspace/ui.jsx";

afterEach(cleanup);

describe("the password field's eye", () => {
  it("shows and hides the password, and keeps the field's label and error wiring", () => {
    const c = colors(true);
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Field label="סיסמה" error="הסיסמה קצרה מדי" c={c}>
          {(id) => <PasswordInput id={id} he c={c} autoComplete="current-password" value="secret-pass" onChange={() => {}} />}
        </Field>
      </form>,
    );
    const input = screen.getByLabelText("סיסמה");
    expect(input.type).toBe("password");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(input.getAttribute("aria-describedby")).textContent).toBe("הסיסמה קצרה מדי");
    expect(input.getAttribute("autocomplete")).toBe("current-password");
    const eye = screen.getByRole("button", { name: "הצגת הסיסמה" });
    expect(eye.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(eye);
    expect(input.type).toBe("text");
    expect(eye.getAttribute("aria-pressed")).toBe("true");
    expect(eye.title).toBe("הסתרת הסיסמה");
    fireEvent.click(eye);
    expect(input.type).toBe("password");
    // the eye never sends the form it sits in
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("speaks English too", () => {
    render(<PasswordInput he={false} c={colors(false)} aria-label="Password" value="" onChange={() => {}} />);
    const eye = screen.getByRole("button", { name: "Show password" });
    expect(eye.title).toBe("Show password");
    fireEvent.click(eye);
    expect(eye.title).toBe("Hide password");
    expect(screen.getByLabelText("Password").type).toBe("text");
  });
});
