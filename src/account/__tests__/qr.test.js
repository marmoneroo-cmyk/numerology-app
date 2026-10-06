import { describe, it, expect } from "vitest";
import { qrMatrix, qrPath } from "../qr.jsx";
import { decodeDrawn } from "./qrPixels.js";

// the shape of the link Supabase returns
const URI = "otpauth://totp/numerology-app-orcin.vercel.app:dana%40example.com?algorithm=SHA1&digits=6&issuer=numerology-app-orcin.vercel.app&period=30&secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

describe("the two-step QR code", () => {
  it("is sparse enough to read off a screen, and what it draws decodes back to the link", async () => {
    const matrix = await qrMatrix(URI);
    // Supabase's own code for such a link is 73 cells across
    expect(matrix.length).toBeLessThanOrEqual(61);
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true);
    expect(decodeDrawn(qrPath(matrix), matrix.length)).toBe(URI);
  });

  it("keeps a light quiet zone of 4 cells on every side", async () => {
    const matrix = await qrMatrix(URI);
    const n = matrix.length;
    const lineIsDark = (i) => matrix[i].some(Boolean) || matrix.some((row) => row[i]);
    for (const i of [0, 1, 2, 3, n - 4, n - 3, n - 2, n - 1]) expect(lineIsDark(i)).toBe(false);
    expect(matrix[4][4]).toBe(true); // the corner of a finder square, right inside the quiet zone
  });

  it("refuses text too long for any code", async () => {
    await expect(qrMatrix("x".repeat(4000))).rejects.toThrow();
  });
});
