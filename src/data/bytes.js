/** Bytes helpers for attachments and backups. Work in browsers and in Node. */

/** Normalise a Uint8Array, ArrayBuffer or any typed-array view to a Uint8Array. */
export function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  throw new TypeError("expected bytes (Uint8Array or ArrayBuffer)");
}

export function bytesToBase64(bytes) {
  const b = toBytes(bytes);
  let bin = "";
  const CHUNK = 0x8000; // String.fromCharCode has an argument-count limit
  for (let i = 0; i < b.length; i += CHUNK) bin += String.fromCharCode.apply(null, b.subarray(i, i + CHUNK));
  return btoa(bin);
}

/** Throws on anything that is not valid base64. */
export function base64ToBytes(b64) {
  if (typeof b64 !== "string") throw new TypeError("expected a base64 string");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
