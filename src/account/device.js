/**
 * This browser as a device of an account: a random key kept in localStorage
 * (so the account recognises it next time) and a short human label.
 */
const KEY = "numerology_device_key";
const SHAPE = /^[0-9a-f]{32}$/;

const randomKey = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");

/**
 * This browser's device key. Where storage is refused (some private windows)
 * the key lives only for this visit, so each visit counts as a new device.
 * @param {Storage} [storage]
 */
export function deviceKey(storage = globalThis.localStorage) {
  try {
    const saved = storage.getItem(KEY);
    if (saved && SHAPE.test(saved)) return saved;
    const key = randomKey();
    storage.setItem(KEY, key);
    return key;
  } catch {
    return randomKey();
  }
}

/** "Chrome · Windows", "Safari · iPhone": enough to tell one's devices apart. */
export function deviceLabel(nav = globalThis.navigator) {
  const ua = nav?.userAgent || "";
  const browser = /Edg\//.test(ua) ? "Edge"
    : /Firefox\//.test(ua) ? "Firefox"
      : /Chrome\//.test(ua) ? "Chrome"
        : /Safari\//.test(ua) ? "Safari"
          : "";
  const system = /iPhone/.test(ua) ? "iPhone"
    : /iPad/.test(ua) ? "iPad"
      : /Android/.test(ua) ? "Android"
        : /Windows/.test(ua) ? "Windows"
          : /Mac OS X/.test(ua) ? "Mac"
            : /Linux/.test(ua) ? "Linux"
              : "";
  return [browser, system].filter(Boolean).join(" · ") || "דפדפן";
}
