/* How the sales page (and the demo's banner) reach the owner. */
import { describe, it, expect } from "vitest";
import { contactLink } from "../config.js";

describe("how the sales page reaches the owner", () => {
  it("uses WhatsApp when there is a well-formed number, with a short Hebrew or English opening line", () => {
    const he = contactLink(true, { whatsapp: "972501234567", email: "a@b.co" });
    expect(he.kind).toBe("whatsapp");
    expect(he.href.startsWith("https://wa.me/972501234567?text=")).toBe(true);
    expect(decodeURIComponent(he.href.split("text=")[1])).toContain("הסטודיו");
    expect(decodeURIComponent(contactLink(false, { whatsapp: "972501234567", email: null }).href)).toContain("Studio");
  });

  it("falls back to an email for a missing or malformed number, and to nothing without either", () => {
    for (const whatsapp of [null, "", "+972501234567", "050-1234567", "97250abc4567", "0501234567"]) {
      expect(contactLink(true, { whatsapp, email: "a@b.co" })).toEqual({ kind: "email", href: `mailto:a@b.co?subject=${encodeURIComponent("הסטודיו לנומרולוגים")}` });
    }
    expect(contactLink(true, { whatsapp: null, email: null })).toBeNull();
  });

  it("reaches the business email while the owner's number is not set", () => {
    expect(contactLink(true).kind).toBe("email");
  });
});
