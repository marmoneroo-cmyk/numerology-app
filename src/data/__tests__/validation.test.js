import { describe, it, expect } from "vitest";
import {
  validateClient, validateReading, validateAttachment, isIsoDate, ValidationError, LIMITS, READING_TYPES,
} from "../validation.js";

const TODAY = new Date(2026, 9, 5, 12);
const codes = (fn) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof ValidationError) return e.errors.map((x) => `${x.field}.${x.code}`).sort();
    throw e;
  }
  return [];
};

describe("isIsoDate", () => {
  it("accepts real calendar dates from 1900 to the given last year", () => {
    expect(["1990-08-15", "2024-02-29", "1900-01-01", "2027-12-31"].map((s) => isIsoDate(s, 2027))).toEqual([true, true, true, true]);
  });
  it("rejects impossible dates, other formats and out-of-range years", () => {
    expect(["2001-02-29", "1990-13-01", "1990-00-10", "15.08.1990", "1899-12-31", "2028-01-01", "", null, 19900815].map((s) => isIsoDate(s, 2027)))
      .toEqual([false, false, false, false, false, false, false, false, false]);
  });
});

describe("validateClient", () => {
  const ok = { fullName: "שני כהן אזולאי", birthDate: "1990-08-15" };

  it("requires a name and trims it", () => {
    expect(validateClient({ ...ok, fullName: "  שני  " }, { today: TODAY }).fullName).toBe("שני");
    expect(codes(() => validateClient({ ...ok, fullName: "   " }, { today: TODAY }))).toEqual(["fullName.required"]);
    expect(codes(() => validateClient({ ...ok, fullName: "א".repeat(LIMITS.name + 1) }, { today: TODAY }))).toEqual(["fullName.tooLong"]);
  });

  it("birth date is optional but must be a real date when given", () => {
    expect(validateClient({ fullName: "רחל" }, { today: TODAY }).birthDate).toBeNull();
    expect(validateClient({ fullName: "רחל", birthDate: "" }, { today: TODAY }).birthDate).toBeNull();
    expect(codes(() => validateClient({ ...ok, birthDate: "2001-02-29" }, { today: TODAY }))).toEqual(["birthDate.invalid"]);
    expect(codes(() => validateClient({ ...ok, birthDate: "15.08.1990" }, { today: TODAY }))).toEqual(["birthDate.invalid"]);
  });

  it("checks phone and email shapes", () => {
    expect(validateClient({ ...ok, phone: " +972 52-123-4567 " }, { today: TODAY }).phone).toBe("+972 52-123-4567");
    expect(validateClient({ ...ok, email: " Shani@Example.com " }, { today: TODAY }).email).toBe("Shani@Example.com");
    expect(codes(() => validateClient({ ...ok, phone: "abc" }, { today: TODAY }))).toEqual(["phone.invalid"]);
    expect(codes(() => validateClient({ ...ok, email: "a@b" }, { today: TODAY }))).toEqual(["email.invalid"]);
  });

  it("normalises tags from a list or a comma string", () => {
    expect(validateClient({ ...ok, tags: " vip , vip, חלה ,," }, { today: TODAY }).tags).toEqual(["vip", "חלה"]);
    expect(validateClient({ ...ok, tags: ["a", " b "] }, { today: TODAY }).tags).toEqual(["a", "b"]);
    expect(codes(() => validateClient({ ...ok, tags: Array.from({ length: LIMITS.tags + 1 }, (_, i) => `t${i}`) }, { today: TODAY }))).toEqual(["tags.tooMany"]);
    expect(codes(() => validateClient({ ...ok, tags: ["x".repeat(LIMITS.tag + 1)] }, { today: TODAY }))).toEqual(["tags.tooLong"]);
  });

  it("limits notes, coerces flags and drops unknown fields", () => {
    const v = validateClient({ ...ok, notes: "  הערה  ", consent: "yes", archived: true, password: "x", id: "evil" }, { today: TODAY });
    expect(v).toEqual({
      fullName: "שני כהן אזולאי", birthName: "", birthDate: "1990-08-15", phone: "", email: "", tags: [], notes: "הערה", consent: false, archived: true,
    });
    expect(codes(() => validateClient({ ...ok, notes: "x".repeat(LIMITS.notes + 1) }, { today: TODAY }))).toEqual(["notes.tooLong"]);
  });

  it("reports every problem at once", () => {
    expect(codes(() => validateClient({ fullName: "", birthDate: "1990-02-30", email: "nope" }, { today: TODAY }))).toEqual([
      "birthDate.invalid", "email.invalid", "fullName.required",
    ]);
  });
});

describe("validateReading", () => {
  const ok = {
    clientId: "c1", type: "map", input: { name: "שני", birthDate: "1990-08-15", add: false }, result: { lp: 33 },
    engineVersion: "1.0.0", computedFor: TODAY.toISOString(),
  };

  it("accepts every known type and fills defaults", () => {
    for (const type of READING_TYPES) expect(validateReading({ ...ok, type }).type).toBe(type);
    expect(validateReading(ok)).toEqual({ ...ok, title: "", notes: "", followUp: null });
  });

  it("rejects unknown types, missing references and non-object payloads", () => {
    expect(codes(() => validateReading({ ...ok, type: "tarot" }))).toEqual(["type.invalid"]);
    expect(codes(() => validateReading({ ...ok, clientId: "" }))).toEqual(["clientId.required"]);
    expect(codes(() => validateReading({ ...ok, input: "x", result: null }))).toEqual(["input.invalid", "result.invalid"]);
    expect(codes(() => validateReading({ ...ok, engineVersion: "" }))).toEqual(["engineVersion.required"]);
    expect(codes(() => validateReading({ ...ok, computedFor: "yesterday" }))).toEqual(["computedFor.invalid"]);
  });

  it("follow-up is a real date or nothing", () => {
    expect(validateReading({ ...ok, followUp: "" }).followUp).toBeNull();
    expect(validateReading({ ...ok, followUp: "2026-11-01" }).followUp).toBe("2026-11-01");
    expect(codes(() => validateReading({ ...ok, followUp: "2026-13-01" }))).toEqual(["followUp.invalid"]);
  });
});

describe("validateAttachment", () => {
  it("keeps only the file's own name and checks its size", () => {
    expect(validateAttachment({ clientId: "c1", name: "C:\\fakepath\\מפה.pdf", type: "application/pdf", size: 1200 })).toEqual({
      clientId: "c1", readingId: null, name: "מפה.pdf", type: "application/pdf", size: 1200,
    });
    expect(validateAttachment({ clientId: "c1", name: "a/b/c.png", type: "", size: 1 }).name).toBe("c.png");
    expect(codes(() => validateAttachment({ clientId: "c1", name: "big.mov", type: "video/quicktime", size: LIMITS.attachmentBytes + 1 }))).toEqual(["size.tooLarge"]);
    expect(codes(() => validateAttachment({ clientId: "c1", name: "  ", type: "text/plain", size: 3 }))).toEqual(["name.required"]);
  });
});
