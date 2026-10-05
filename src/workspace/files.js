/** Files in and out of the workspace: reading what the person picks, saving downloads. */

/** A File/Blob's bytes, with a FileReader fallback for older browsers. */
export function readFileBytes(file) {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return readWith(file, "readAsArrayBuffer");
}

/** A File/Blob's text, with a FileReader fallback for older browsers. */
export function readFileText(file) {
  if (typeof file.text === "function") return file.text();
  return readWith(file, "readAsText");
}

function readWith(file, method) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader[method](file);
  });
}

/** Hands `blob` to the browser as a download named `filename`. */
function saveBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The workspace's own JSON (a backup). */
export const saveJson = (filename, data) => saveBlob(filename, new Blob([JSON.stringify(data)], { type: "application/json" }));

/**
 * An attached file, always as a plain download. Its stored type came from
 * whoever made the file, so the browser is never told to render it: an
 * "image" could be a web page with scripts.
 */
export const saveFile = (filename, bytes) => saveBlob(filename, new Blob([bytes], { type: "application/octet-stream" }));
