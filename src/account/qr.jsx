/**
 * The QR code for adding the account to an authenticator app. Supabase's own
 * image uses the highest error correction, which makes it dense (73 cells
 * across for our link) and hard for a phone to read off a screen. This one
 * uses the lowest: 57 to 61 cells with its quiet zone, drawn as one sharp path.
 * The generator loads only when a setup starts.
 */

/** The code for `text` as rows of cells, true for dark, with a quiet zone of 4 light cells. */
export async function qrMatrix(text) {
  const { encode } = await import("uqr");
  return encode(text, { ecc: "L", border: 4 }).data;
}

/** One SVG path that paints every dark cell. */
export function qrPath(matrix) {
  let d = "";
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) d += `M${x} ${y}h1v1h-1z`;
    }),
  );
  return d;
}

/** The code, black on white, with whole pixels per cell so its edges stay sharp. */
export function QrCode({ matrix, label }) {
  const cells = matrix.length;
  const size = cells * Math.max(3, Math.round(240 / cells));
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${cells} ${cells}`}
      shapeRendering="crispEdges"
      style={{ display: "block", maxWidth: "100%", height: "auto", borderRadius: 8 }}
    >
      <rect width={cells} height={cells} fill="#fff" />
      <path d={qrPath(matrix)} fill="#000" />
    </svg>
  );
}
