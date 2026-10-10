/*
 * The sales page loads alone: from Root.jsx the static imports never reach the app, the PDF library, Supabase
 * or the demo. Those load on demand, with import().
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
// `import x from "y"`, `import "y"`, `export { x } from "y"`: what a module needs before it can run
const FROM = /^\s*(?:import|export)\s+(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/gm;

/** Every module reached by static imports from `entry`, and the packages they name. */
function staticGraph(entry) {
  const seen = new Set();
  const packages = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!/\.(js|jsx)$/.test(file)) continue;
    for (const [, spec] of readFileSync(file, "utf8").matchAll(FROM)) {
      if (!spec.startsWith(".")) {
        packages.add(spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]);
        continue;
      }
      const target = resolve(dirname(file), spec);
      if (existsSync(target)) queue.push(target);
    }
  }
  return { files: [...seen].map((f) => f.slice(SRC.length + 1).split("\\").join("/")), packages: [...packages] };
}

describe("what the sales page loads", () => {
  it("finds the modules it should: the sales page and the legal pages", () => {
    const { files } = staticGraph(join(SRC, "Root.jsx"));
    for (const light of ["sales/SalesPage.jsx", "sales/sections.jsx", "legal/LegalPage.jsx", "routes.js", "ui/Icon.jsx"]) expect(files).toContain(light);
  });

  it("leaves the app, the PDF library, Supabase and the demo to load on demand", () => {
    const { files, packages } = staticGraph(join(SRC, "Root.jsx"));
    for (const heavy of ["App.jsx", "AppWorld.jsx", "account/AccountContext.jsx", "account/service.js", "demo/sampleAccount.js", "demo/sampleData.js", "engine/index.js"]) {
      expect(files).not.toContain(heavy);
    }
    for (const pkg of ["jspdf", "@supabase/supabase-js", "uqr"]) expect(packages).not.toContain(pkg);
  });
});
