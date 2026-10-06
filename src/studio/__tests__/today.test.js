import { describe, it, expect } from "vitest";
import { upcomingBirthdays, recentClients, greetingLink, greetingText, initialsOf } from "../today.js";

/** A client record with only what these helpers read. */
const client = (fullName, birthDate, extra = {}) => ({ id: `id-${fullName}`, fullName, birthDate, archived: false, ...extra });
/** [name, days away, age] for each birthday, in order. */
const summary = (list) => list.map((b) => [b.client.fullName, b.inDays, b.age]);

describe("upcomingBirthdays", () => {
  // Tuesday 6 October 2026, mid-afternoon: the hour must not matter
  const NOW = new Date(2026, 9, 6, 15, 30);

  it("counts today as 0 and takes the next six days, but not the seventh", () => {
    const list = upcomingBirthdays(
      [client("seven", "1990-10-13"), client("six", "1990-10-12"), client("today", "1990-10-06"), client("yesterday", "1990-10-05")],
      NOW,
    );
    expect(summary(list)).toEqual([
      ["today", 0, 36],
      ["six", 6, 36],
    ]);
  });

  it("gives the birthday as a local date and the age turned on it", () => {
    const [b] = upcomingBirthdays([client("רחל כהן", "1985-10-08")], NOW);
    expect(b.date).toEqual(new Date(2026, 9, 8));
    expect(b.age).toBe(41);
    expect(b.inDays).toBe(2);
    expect(b.client.fullName).toBe("רחל כהן");
  });

  it("takes a wider or a narrower window when asked", () => {
    const clients = [client("a", "1990-10-08"), client("b", "1990-10-20")];
    expect(summary(upcomingBirthdays(clients, NOW, 30))).toEqual([
      ["a", 2, 36],
      ["b", 14, 36],
    ]);
    expect(upcomingBirthdays(clients, NOW, 2)).toEqual([]);
  });

  it("works across New Year", () => {
    const list = upcomingBirthdays(
      [client("jan2", "1980-01-02"), client("dec31", "1999-12-31"), client("dec28", "1999-12-28")],
      new Date(2026, 11, 29, 20),
    );
    expect(summary(list)).toEqual([
      ["dec31", 2, 27],
      ["jan2", 4, 47],
    ]);
    expect(list[1].date).toEqual(new Date(2027, 0, 2));
  });

  it("keeps a 29 February birthday on 28 February in other years", () => {
    const leapling = [client("leap", "2000-02-29")];
    const [b] = upcomingBirthdays(leapling, new Date(2027, 1, 25));
    expect(b.date).toEqual(new Date(2027, 1, 28));
    expect([b.inDays, b.age]).toEqual([3, 27]);
    expect(upcomingBirthdays(leapling, new Date(2027, 1, 28, 18))[0].inDays).toBe(0);
    expect(upcomingBirthdays(leapling, new Date(2027, 2, 1))).toEqual([]);
    const [inLeapYear] = upcomingBirthdays(leapling, new Date(2028, 1, 25));
    expect(inLeapYear.date).toEqual(new Date(2028, 1, 29));
    expect([inLeapYear.inDays, inLeapYear.age]).toEqual([4, 28]);
  });

  it("compares dates only, whatever the hour or a clock change", () => {
    const tomorrow = [client("t", "1990-10-07")];
    expect(upcomingBirthdays(tomorrow, new Date(2026, 9, 6, 23, 59))[0].inDays).toBe(1);
    expect(upcomingBirthdays(tomorrow, new Date(2026, 9, 7, 0, 1))[0].inDays).toBe(0);
    // vite.config.js runs the tests in Israel time, where the clocks go forward on 27 March 2026 and back on 25 October
    const offset = (d) => d.getTimezoneOffset();
    expect(offset(new Date(2026, 2, 28))).not.toBe(offset(new Date(2026, 2, 26)));
    expect(offset(new Date(2026, 9, 26))).not.toBe(offset(new Date(2026, 9, 24)));
    expect(upcomingBirthdays([client("spring", "1990-03-29")], new Date(2026, 2, 25))[0].inDays).toBe(4);
    expect(upcomingBirthdays([client("autumn", "1990-10-28")], new Date(2026, 9, 23, 12))[0].inDays).toBe(5);
  });

  it("skips archived clients, missing and invalid dates, and births that have not come yet", () => {
    const list = upcomingBirthdays(
      [
        client("archived", "1990-10-07", { archived: true }),
        client("none", null),
        client("missing", undefined),
        client("empty", ""),
        client("feb30", "1990-02-30"),
        client("month13", "1990-13-07"),
        client("short", "1990-10-7"),
        client("words", "next week"),
        client("number", 19901007),
        client("born today", "2026-10-06"),
        client("not yet", "2026-10-08"),
        client("ok", "1990-10-07"),
      ],
      NOW,
    );
    expect(summary(list)).toEqual([["ok", 1, 36]]);
  });

  it("puts the soonest first, then sorts by name", () => {
    const list = upcomingBirthdays(
      [client("נועה", "1990-10-09"), client("דנה", "1991-10-07"), client("אבי", "1992-10-09"), client("יוסי", "1993-10-06")],
      NOW,
    );
    expect(list.map((b) => b.client.fullName)).toEqual(["יוסי", "דנה", "אבי", "נועה"]);
  });
});

describe("recentClients", () => {
  const at = (fullName, updatedAt, lastActivityAt, archived = false) => ({ id: fullName, fullName, updatedAt, lastActivityAt, archived });
  const clients = [
    at("edited", "2026-10-03T09:00:00.000Z", "2026-10-01T09:00:00.000Z"),
    at("old", "2026-08-01T09:00:00.000Z", "2026-08-01T09:00:00.000Z"),
    at("read", "2026-09-01T09:00:00.000Z", "2026-10-05T09:00:00.000Z"),
    at("archived", "2026-10-06T09:00:00.000Z", "2026-10-06T09:00:00.000Z", true),
    at("older", "2026-07-01T09:00:00.000Z", "2026-07-01T09:00:00.000Z"),
    at("oldest", "2026-06-01T09:00:00.000Z", "2026-06-01T09:00:00.000Z"),
    at("plain", "2026-09-20T09:00:00.000Z", undefined),
  ];

  it("takes the four most recently active, newest first, without archived clients", () => {
    expect(recentClients(clients).map((c) => c.fullName)).toEqual(["read", "edited", "plain", "old"]);
  });

  it("takes another count when asked, and leaves the given list as it was", () => {
    const before = clients.map((c) => c.fullName);
    expect(recentClients(clients, 2).map((c) => c.fullName)).toEqual(["read", "edited"]);
    expect(clients.map((c) => c.fullName)).toEqual(before);
    expect(recentClients([])).toEqual([]);
  });
});

describe("greetingLink", () => {
  const TEXT = "יום הולדת שמח, רחל!";
  const query = `?text=${encodeURIComponent(TEXT)}`;

  it("turns an Israeli number into its international form", () => {
    expect(greetingLink("052-1234567", TEXT)).toBe(`https://wa.me/972521234567${query}`);
    expect(greetingLink("+972 52-123-4567", TEXT)).toBe(`https://wa.me/972521234567${query}`);
  });

  it("drops a 0 typed right after 972", () => {
    expect(greetingLink("+972 052-1234567", TEXT)).toBe(`https://wa.me/972521234567${query}`);
    expect(greetingLink("+972 (0)52-123-4567", TEXT)).toBe(`https://wa.me/972521234567${query}`);
    expect(greetingLink("00972 052 123 4567", TEXT)).toBe(`https://wa.me/972521234567${query}`);
  });

  it("keeps an international number, without the 00 prefix", () => {
    expect(greetingLink("+44 20 7946 0958", TEXT)).toBe(`https://wa.me/442079460958${query}`);
    expect(greetingLink("00 44 20 7946 0958", TEXT)).toBe(`https://wa.me/442079460958${query}`);
  });

  it("needs 9 to 15 digits", () => {
    expect(greetingLink("123456789", TEXT)).toBe(`https://wa.me/123456789${query}`);
    expect(greetingLink("123456789012345", TEXT)).toBe(`https://wa.me/123456789012345${query}`);
    expect(greetingLink("12345678", TEXT)).toBeNull();
    expect(greetingLink("1234567890123456", TEXT)).toBeNull();
    expect(greetingLink("050-123", TEXT)).toBeNull();
  });

  it("gives no link for junk or no phone", () => {
    for (const phone of ["abc", "---", " ", "", null, undefined]) expect(greetingLink(phone, TEXT)).toBeNull();
  });

  it("encodes the text", () => {
    expect(greetingLink("0521234567", "a & b?")).toBe("https://wa.me/972521234567?text=a%20%26%20b%3F");
  });

  it("puts a damaged character in as a replacement mark instead of failing", () => {
    const high = String.fromCharCode(0xd83c); // the first half of an emoji, alone
    const low = String.fromCharCode(0xdf82); // the second half, alone
    const cake = String.fromCodePoint(0x1f382); // both halves together
    expect(greetingLink("0521234567", `a${high}b${low}`)).toBe("https://wa.me/972521234567?text=a%EF%BF%BDb%EF%BF%BD");
    expect(greetingLink("0521234567", `${cake}!`)).toBe("https://wa.me/972521234567?text=%F0%9F%8E%82!");
    expect(() => greetingLink("0521234567", greetingText(`ר${high} כהן`, true))).not.toThrow();
  });
});

describe("greetingText", () => {
  it("greets by the first name, in Hebrew or English", () => {
    expect(greetingText("רחל כהן", true)).toBe("יום הולדת שמח, רחל! מאחלים לך שנה של אור, צמיחה והגשמה.");
    expect(greetingText("Rachel Cohen", false)).toBe("Happy birthday, Rachel! Wishing you a year of light, growth and fulfilment.");
    expect(greetingText("  אורי   בן דוד ", true)).toBe("יום הולדת שמח, אורי! מאחלים לך שנה של אור, צמיחה והגשמה.");
  });

  it("still reads well without a name", () => {
    expect(greetingText("", true)).toBe("יום הולדת שמח! מאחלים לך שנה של אור, צמיחה והגשמה.");
    expect(greetingText(undefined, false)).toBe("Happy birthday! Wishing you a year of light, growth and fulfilment.");
  });
});

describe("initialsOf", () => {
  it("takes the first letters of the first and the last name", () => {
    expect(initialsOf("רחל כהן")).toBe("רכ");
    expect(initialsOf("אורי בן דוד")).toBe("אד");
    expect(initialsOf(" מדונה ")).toBe("מ");
    expect(initialsOf("rachel cohen")).toBe("RC");
    expect(initialsOf("")).toBe("");
    expect(initialsOf(undefined)).toBe("");
  });
});
