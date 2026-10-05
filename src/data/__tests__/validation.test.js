import { describe, it, expect } from "vitest";
import {
  validateClient, validateReading, validateAttachment, isIsoDate, ValidationError, LIMITS, READING_TYPES,
} from "../validation.js";
import { fullCalc, matchReading, parentChildReading, yearCycle, getRecommendations } from "../../engine/index.js";

const TODAY = new Date(2026, 9, 5, 12);

// what the engine really produces, per reading type
const SHANI = { d: 15, m: 8, y: 1990, name: "שני כהן" };
const AVIR = { d: 3, m: 11, y: 1987, name: "אביר" };
const asPerson = (p) => ({ name: p.name, birthDate: `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`, clientId: null });
const MAP = fullCalc(15, 8, 1990, SHANI.name, false, TODAY);
const SNAP = {
  map: { input: { name: SHANI.name, birthDate: "1990-08-15", add: false }, result: { ...MAP, insights: { he: getRecommendations(MAP, "he"), en: getRecommendations(MAP, "en") } } },
  match: { input: { person: asPerson(SHANI), other: asPerson(AVIR), matchType: "love" }, result: matchReading(SHANI, AVIR, "love") },
  parentChild: { input: { person: asPerson(SHANI), other: asPerson(AVIR), role: "parent" }, result: parentChildReading(SHANI, AVIR) },
  yearCycle: { input: { birthDate: "1990-08-15", add: true }, result: { proj: yearCycle(15, 8, true, TODAY) } },
};
const reading = (type, over = {}) => ({ clientId: "c1", type, ...SNAP[type], engineVersion: "1.0.0", computedFor: TODAY.toISOString(), ...over });
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

  it("drops null characters, which the server cannot store inside a record", () => {
    expect(validateClient({ fullName: "שני\u0000", notes: "a\u0000b" }, { today: TODAY })).toMatchObject({ fullName: "שני", notes: "ab" });
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
  it("keeps exactly what the engine produces, for every type, and fills defaults", () => {
    for (const type of READING_TYPES) {
      const v = validateReading(reading(type));
      expect(v.input).toEqual(SNAP[type].input);
      expect(v.result).toEqual(SNAP[type].result);
    }
    expect(validateReading(reading("map"))).toMatchObject({ title: "", notes: "", followUp: null, engineVersion: "1.0.0" });
  });

  it("rejects unknown types, missing references and bad metadata", () => {
    expect(codes(() => validateReading(reading("map", { type: "tarot" })))).toEqual(["type.invalid"]);
    // names every object inherits are not reading types either
    for (const type of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
      expect(codes(() => validateReading(reading("map", { type })))).toEqual(["type.invalid"]);
    }
    expect(codes(() => validateReading(reading("map", { clientId: "" })))).toEqual(["clientId.required"]);
    expect(codes(() => validateReading(reading("map", { engineVersion: "" })))).toEqual(["engineVersion.required"]);
    expect(codes(() => validateReading(reading("map", { computedFor: "yesterday" })))).toEqual(["computedFor.invalid"]);
  });

  it("rejects snapshots that do not have their type's shape", () => {
    expect(codes(() => validateReading(reading("map", { result: { lp: 33 } })))).toEqual(["result.invalid"]);
    expect(codes(() => validateReading(reading("yearCycle", { result: {} })))).toEqual(["result.invalid"]);
    expect(codes(() => validateReading(reading("map", { input: "x", result: null })))).toEqual(["input.invalid", "result.invalid"]);
    expect(codes(() => validateReading(reading("map", { input: { name: "שני" } })))).toEqual(["input.invalid"]);
    expect(codes(() => validateReading(reading("match", { input: { ...SNAP.match.input, matchType: "enemies" } })))).toEqual(["input.invalid"]);
    expect(codes(() => validateReading(reading("parentChild", { input: { ...SNAP.parentChild.input, role: "boss" } })))).toEqual(["input.invalid"]);
    expect(codes(() => validateReading(reading("match", { result: { ...SNAP.match.result, score: "99" } })))).toEqual(["result.invalid"]);
    expect(codes(() => validateReading(reading("map", { result: { ...MAP, pk: [1, 2, 3] } })))).toEqual(["result.invalid"]);
  });

  it("rebuilds snapshots from known fields, dropping anything else", () => {
    const hostile = JSON.parse(JSON.stringify(reading("yearCycle")));
    hostile.input = JSON.parse('{"birthDate":"1990-08-15","add":true,"__proto__":{"polluted":1},"extra":"x"}');
    hostile.result.proj[0].script = "<img onerror=alert(1)>";
    const v = validateReading(hostile);
    expect(v.input).toEqual({ birthDate: "1990-08-15", add: true });
    expect(Object.getPrototypeOf(v.input)).toBe(Object.prototype);
    expect(v.result.proj[0]).toEqual({ year: SNAP.yearCycle.result.proj[0].year, py: SNAP.yearCycle.result.proj[0].py, isCurrent: false });
    expect({}.polluted).toBeUndefined();
  });

  it("accepts a match whose other person was deleted and wiped", () => {
    const wiped = { name: "", birthDate: null, clientId: null };
    expect(validateReading(reading("match", { input: { ...SNAP.match.input, other: wiped } })).input.other).toEqual(wiped);
    // but the client's own side must keep a real date
    expect(codes(() => validateReading(reading("match", { input: { ...SNAP.match.input, person: wiped } })))).toEqual(["input.invalid"]);
  });

  it("follow-up is a real date or nothing", () => {
    expect(validateReading(reading("map", { followUp: "" })).followUp).toBeNull();
    expect(validateReading(reading("map", { followUp: "2026-11-01" })).followUp).toBe("2026-11-01");
    expect(codes(() => validateReading(reading("map", { followUp: "2026-13-01" })))).toEqual(["followUp.invalid"]);
  });
});

describe("validateAttachment", () => {
  it("keeps only the file's own name and checks its size", () => {
    expect(validateAttachment({ clientId: "c1", name: "C:\\fakepath\\מפה.pdf", type: "application/pdf", size: 1200 })).toEqual({
      clientId: "c1", readingId: null, name: "מפה.pdf", type: "application/pdf", size: 1200,
    });
    expect(validateAttachment({ clientId: "c1", name: "a/b/c.png", type: "", size: 1 }).name).toBe("c.png");
    expect(validateAttachment({ clientId: "c1", name: "invoice\u202Egpj.exe", type: "", size: 1 }).name).toBe("invoicegpj.exe");
    expect(validateAttachment({ clientId: "c1", name: "a\u200Bb\u0007.txt", type: "", size: 1 }).name).toBe("ab.txt");
    expect(codes(() => validateAttachment({ clientId: "c1", name: "big.mov", type: "video/quicktime", size: LIMITS.attachmentBytes + 1 }))).toEqual(["size.tooLarge"]);
    expect(codes(() => validateAttachment({ clientId: "c1", name: "  ", type: "text/plain", size: 3 }))).toEqual(["name.required"]);
  });
});
