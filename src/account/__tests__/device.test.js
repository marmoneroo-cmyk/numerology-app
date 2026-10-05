import { describe, it, expect } from "vitest";
import { deviceKey, deviceLabel } from "../device.js";

/** A localStorage stand-in; `broken` throws like a browser that refuses storage. */
function storage({ broken = false } = {}) {
  const map = new Map();
  return {
    getItem: (k) => {
      if (broken) throw new Error("SecurityError");
      return map.has(k) ? map.get(k) : null;
    },
    setItem: (k, v) => {
      if (broken) throw new Error("SecurityError");
      map.set(k, String(v));
    },
  };
}

describe("deviceKey", () => {
  it("makes a random key once and keeps it for this browser", () => {
    const s = storage();
    const first = deviceKey(s);
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(deviceKey(s)).toBe(first);
    expect(deviceKey(storage())).not.toBe(first);
  });

  it("still gives a key, for this visit only, where storage is refused", () => {
    expect(deviceKey(storage({ broken: true }))).toMatch(/^[0-9a-f]{32}$/);
  });

  it("replaces a stored key that is not one of ours", () => {
    const s = storage();
    s.setItem("numerology_device_key", "short");
    expect(deviceKey(s)).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("deviceLabel", () => {
  it("names the browser and system in a few words", () => {
    const label = (ua) => deviceLabel({ userAgent: ua });
    expect(label("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36")).toBe("Chrome · Windows");
    expect(label("Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1")).toBe("Safari · iPhone");
    expect(label("Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36")).toBe("Chrome · Android");
    expect(label("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0")).toBe("Edge · Mac");
    expect(label("Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0")).toBe("Firefox · Linux");
    expect(label("")).toBe("דפדפן");
  });
});
