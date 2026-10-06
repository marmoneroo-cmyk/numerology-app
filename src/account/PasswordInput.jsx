/**
 * A password input with an eye button that shows or hides what was typed.
 * Field passes `aria-invalid` and `aria-describedby` in; they go to the input.
 */
import { useState } from "react";

function EyeIcon({ crossed }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M4 4l16 16" />}
    </svg>
  );
}

export default function PasswordInput({ he, c, inputRef, ...input }) {
  const [shown, setShown] = useState(false);
  // the text is left-to-right, so in Hebrew the eye sits on the left, where the field ends visually
  const side = he ? "left" : "right";
  return (
    <div style={{ position: "relative" }}>
      <input
        {...input}
        ref={inputRef}
        className="gi"
        type={shown ? "text" : "password"}
        dir="ltr"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        style={{ [side === "left" ? "paddingLeft" : "paddingRight"]: 52 }}
      />
      <button
        type="button"
        onClick={() => setShown(!shown)}
        aria-pressed={shown}
        aria-label={he ? "הצגת הסיסמה" : "Show password"}
        title={shown ? (he ? "הסתרת הסיסמה" : "Hide password") : he ? "הצגת הסיסמה" : "Show password"}
        style={{
          position: "absolute",
          [side]: 8,
          top: "50%",
          transform: "translateY(-50%)",
          display: "inline-flex",
          padding: 8,
          border: "none",
          borderRadius: 10,
          background: "transparent",
          color: c.ac,
          cursor: "pointer",
        }}
      >
        <EyeIcon crossed={shown} />
      </button>
    </div>
  );
}
