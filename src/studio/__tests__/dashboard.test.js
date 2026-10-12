import { describe, it, expect } from "vitest";
import { WEEK_DAYS, bubbleRadius, dueBy, lifePathCounts, weekAhead, weekEnd, wheelPoint } from "../dashboard.js";

// Tuesday 6 October 2026, morning (as in Today.test.jsx)
const NOW = new Date(2026, 9, 6, 9, 30);

describe("lifePathCounts", () => {
  // the life paths, by birth date: what the engine would give (here a table, so each count is checked by hand)
  const PATHS = { "1990-01-01": 7, "1985-05-05": 11, "1979-09-09": 7, "2000-02-02": 4, "1966-06-06": 33, "1999-12-31": 22 };
  const lifePath = (iso) => PATHS[iso];

  it("counts the active clients on each path, a master path with the number it reduces to", () => {
    // Arrange
    const clients = [
      { id: "a", birthDate: "1990-01-01" }, // 7
      { id: "b", birthDate: "1985-05-05" }, // 11, counted with 2
      { id: "c", birthDate: "1979-09-09" }, // 7
      { id: "d" }, // no birth date
      { id: "e", birthDate: "2000-02-02", archived: true }, // archived: not counted at all
      { id: "f", birthDate: "1966-06-06" }, // 33, counted with 6
      { id: "g", birthDate: "1999-12-31" }, // 22, counted with 4
    ];

    // Act
    const result = lifePathCounts(clients, lifePath);

    // Assert
    expect(result.counts.slice(1)).toEqual([0, 1, 0, 1, 0, 1, 2, 0, 0]);
    expect(result.masters).toBe(3);
    expect(result.counted).toBe(5);
    expect(result.noDate).toBe(1);
  });

  it("leaves out a date the engine gives no path from 1 to 9 for, or throws on", () => {
    const clients = [{ birthDate: "1990-10-10" }, { birthDate: "bad" }, { birthDate: "1990-01-01" }];
    const odd = (iso) => {
      if (iso === "bad") throw new Error("not a date");
      return iso === "1990-10-10" ? 0 : 7;
    };
    const result = lifePathCounts(clients, odd);
    expect(result.counts[7]).toBe(1);
    expect(result.counted).toBe(1);
    expect(result.noDate).toBe(2);
  });

  it("gives zeros for no clients", () => {
    const result = lifePathCounts([], lifePath);
    expect(result.counts).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(result).toMatchObject({ masters: 0, counted: 0, noDate: 0 });
  });
});

describe("the week ahead", () => {
  const CLIENTS = [
    { id: "yossi", fullName: "יוסי לוי", birthDate: "1990-10-06" }, // today
    { id: "rachel", fullName: "רחל כהן", birthDate: "1985-10-07" }, // tomorrow
    { id: "michal", fullName: "מיכל אברהם", birthDate: "1978-10-11" }, // in 5 days
    { id: "shira", fullName: "שירה גל", birthDate: "1991-10-12" }, // in 6 days, the last day shown
    { id: "gal", fullName: "גל רון", birthDate: "1990-10-13" }, // in 7 days: after the week
    { id: "dana", fullName: "דנה שמיר", birthDate: "1992-03-03" }, // not this week
    { id: "uri", fullName: "אורי בן דוד", birthDate: "1987-10-08", archived: true }, // archived
  ];
  const FOLLOW_UPS = [
    { readingId: "a", followUp: "2026-10-01" }, // overdue: still due, so today
    { readingId: "b", followUp: "2026-10-06" }, // today
    { readingId: "c", followUp: "2026-10-09" }, // Friday
    { readingId: "d", followUp: "2026-10-12" }, // the last day shown
    { readingId: "e", followUp: "2026-10-13" }, // after the week
  ];

  it("lays out seven days from today, each with its birthdays and follow-ups", () => {
    // Act
    const week = weekAhead(CLIENTS, FOLLOW_UPS, NOW);

    // Assert
    expect(WEEK_DAYS).toBe(7);
    expect(week).toHaveLength(7);
    expect(week.map((d) => d.inDays)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(week[0].date).toEqual(new Date(2026, 9, 6));
    expect(week[6].date).toEqual(new Date(2026, 9, 12));
    expect(week.map((d) => d.birthdays.map((b) => b.client.id))).toEqual([["yossi"], ["rachel"], [], [], [], ["michal"], ["shira"]]);
    expect(week[0].birthdays[0].age).toBe(36);
    expect(week.map((d) => d.followUps.map((f) => f.readingId))).toEqual([["a", "b"], [], [], ["c"], [], [], ["d"]]);
  });

  it("crosses into the next month", () => {
    const week = weekAhead([{ id: "n", birthDate: "1980-11-01" }], [{ readingId: "x", followUp: "2026-11-02" }], new Date(2026, 9, 29, 22));
    expect(week[3].date).toEqual(new Date(2026, 10, 1));
    expect(week[3].birthdays.map((b) => b.client.id)).toEqual(["n"]);
    expect(week[4].followUps.map((f) => f.readingId)).toEqual(["x"]);
  });

  it("is seven empty days with no clients and no follow-ups", () => {
    const week = weekAhead([], [], NOW);
    expect(week.every((d) => d.birthdays.length === 0 && d.followUps.length === 0)).toBe(true);
  });

  it("asks the store for the follow-ups up to the last day shown", () => {
    expect(weekEnd(NOW)).toEqual(new Date(2026, 9, 12));
    expect(weekEnd(new Date(2026, 11, 29, 8))).toEqual(new Date(2027, 0, 4));
  });

  it("keeps the follow-ups due by today: today's and the overdue ones", () => {
    expect(dueBy(FOLLOW_UPS, NOW).map((f) => f.readingId)).toEqual(["a", "b"]);
    expect(dueBy([], NOW)).toEqual([]);
  });
});

describe("the wheel's geometry", () => {
  it("puts 9 at the top and goes round clockwise, 40 degrees a number", () => {
    const nine = wheelPoint(9, 100);
    expect(nine.x).toBeCloseTo(0, 6);
    expect(nine.y).toBeCloseTo(-100, 6);
    const three = wheelPoint(3, 100); // 120 degrees: lower right
    expect(three.x).toBeCloseTo(86.6025, 3);
    expect(three.y).toBeCloseTo(50, 6);
    const six = wheelPoint(6, 100); // 240 degrees: lower left
    expect(six.x).toBeCloseTo(-86.6025, 3);
    expect(six.y).toBeCloseTo(50, 6);
  });

  it("sizes a bubble by its area: one client the smallest, the most clients the largest", () => {
    expect(bubbleRadius(0, 5)).toBe(0);
    expect(bubbleRadius(1, 5)).toBe(10);
    expect(bubbleRadius(5, 5)).toBe(15);
    expect(bubbleRadius(3, 5)).toBeCloseTo(Math.sqrt(162.5), 6); // half way by area: 100 + (225 - 100) / 2
    expect(bubbleRadius(1, 1)).toBe(10);
    expect(bubbleRadius(9, 5)).toBe(15); // never past the largest
  });
});
