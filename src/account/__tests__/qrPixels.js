import jsQR from "jsqr";

/**
 * The text a camera reads from a QR path that paints each dark cell as
 * `M{x} {y}h1v1h-1z`: black on white, `scale` pixels per cell. Null when it
 * does not decode. Inverted images are not tried, so a light-on-dark mistake
 * would fail here too.
 */
export function decodeDrawn(path, cells, scale = 4) {
  const dark = new Set([...path.matchAll(/M([0-9]+) ([0-9]+)h1v1h-1z/g)].map(([, x, y]) => `${x},${y}`));
  const width = cells * scale;
  const data = new Uint8ClampedArray(width * width * 4);
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const value = dark.has(`${Math.floor(x / scale)},${Math.floor(y / scale)}`) ? 0 : 255;
      data.set([value, value, value, 255], (y * width + x) * 4);
    }
  }
  return jsQR(data, width, width, { inversionAttempts: "dontInvert" })?.data ?? null;
}
