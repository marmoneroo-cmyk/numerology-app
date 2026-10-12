import { describe, it, expect } from "vitest";
import { STUDIO_THEME_KEY, rememberStudioTheme, storedStudioDark } from "../theme.js";

/** A storage over a plain map, as localStorage behaves. */
function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), map };
}
const refusing = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("blocked");
  },
};

describe("the Studio's theme", () => {
  it("opens dark the first time", () => {
    expect(storedStudioDark(memoryStorage())).toBe(true);
  });

  it("opens light after the light theme was chosen, and dark again after the dark one", () => {
    // Arrange
    const storage = memoryStorage();

    // Act
    rememberStudioTheme(false, storage);

    // Assert
    expect(storage.map.get(STUDIO_THEME_KEY)).toBe("light");
    expect(storedStudioDark(storage)).toBe(false);
    rememberStudioTheme(true, storage);
    expect(storedStudioDark(storage)).toBe(true);
  });

  it("opens dark, and forgets quietly, where the browser keeps nothing", () => {
    expect(storedStudioDark(refusing)).toBe(true);
    expect(() => rememberStudioTheme(false, refusing)).not.toThrow();
  });

  it("opens dark where even reading the browser's storage throws (site data blocked)", () => {
    // Arrange: a browser that blocks site data throws on the very read of localStorage
    const before = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError: access is denied");
      },
    });
    try {
      // Act and Assert
      expect(storedStudioDark()).toBe(true);
      expect(() => rememberStudioTheme(false)).not.toThrow();
    } finally {
      if (before) Object.defineProperty(globalThis, "localStorage", before);
      else delete globalThis.localStorage;
    }
  });
});
