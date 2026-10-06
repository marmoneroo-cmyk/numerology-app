/**
 * Development only: a signed-in sample account for the lab, entirely in
 * memory. `labClient()` answers the four workspace functions and file
 * storage the way the server does; `labService()` is the account service of
 * an admin who passed two-step verification. No network, no password.
 */
import { toYmd } from "../data/store.js";

export const LAB_PROFILE = {
  id: "lab-user",
  email: "lab@example.com",
  fullName: "סטודיו לדוגמה",
  phone: "050-0000000",
  role: "admin",
  plan: "pro",
  deviceLimit: 2,
};

/** This year's date `days` from today, in `year`: a birthday that falls this week. */
const birthdayIn = (days, year) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${year}-${toYmd(d).slice(5)}`;
};

function sampleClients() {
  const stamp = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();
  const client = (id, fullName, birthDate, phone, daysAgo, extra = {}) => ({
    id, fullName, birthName: "", birthDate, phone, email: "", tags: [], notes: "", archived: false,
    createdAt: stamp(daysAgo + 30), updatedAt: stamp(daysAgo), lastActivityAt: stamp(daysAgo), ...extra,
  });
  return [
    client("c1", "רחל כהן", birthdayIn(2, 1985), "052-5550142", 3),
    client("c2", "יוסי לוי", birthdayIn(5, 1990), "054-5550188", 7),
    client("c3", "מיכל אברהם", birthdayIn(6, 1978), "", 14),
    client("c4", "דנה שמיר", "1992-03-03", "050-5550123", 30, { tags: ["VIP"] }),
    client("c5", "אורי בן דוד", "1987-07-21", "", 60),
    client("c6", "נועה פרץ", "1995-11-30", "053-5550199", 90, { archived: true }),
  ];
}

/** A stand-in for the supabase-js client: the workspace RPCs and the file bucket, in memory. */
export function labClient() {
  const tables = { clients: new Map(), readings: new Map(), attachments: new Map() };
  sampleClients().forEach((c) => tables.clients.set(c.id, c));
  const files = new Map();
  const ok = (data) => ({ data, error: null });
  const rpc = async (fn, args = {}) => {
    if (fn === "ws_all") return ok([...tables[args.p_store].values()]);
    if (fn === "ws_get") return ok(tables[args.p_store].get(args.p_id) ?? null);
    if (fn === "ws_snapshot") return ok({ clients: [...tables.clients.values()], readings: [...tables.readings.values()], attachments: [...tables.attachments.values()] });
    if (fn === "ws_batch") {
      for (const op of args.p_ops) {
        if (op.type === "put") tables[op.store].set(op.value.id, op.value);
        else tables[op.store].delete(op.id);
      }
      return ok({ applied: args.p_ops.length });
    }
    return { data: null, error: { message: `the lab has no ${fn}`, code: "PGRST202" } };
  };
  const storage = {
    from: () => ({
      async upload(path, body, { contentType } = {}) {
        files.set(path, { type: contentType || body.type || "", bytes: new Uint8Array(await body.arrayBuffer()) });
        return ok({ path });
      },
      async download(path) {
        const f = files.get(path);
        return f ? ok(new Blob([f.bytes], { type: f.type })) : { data: null, error: { message: "Object not found", statusCode: "404" } };
      },
      async remove(paths) {
        paths.forEach((p) => files.delete(p));
        return ok([]);
      },
    }),
  };
  return { rpc, storage };
}

/** The account service of the sample admin. */
export function labService(client = labClient()) {
  const accounts = [
    { ...LAB_PROFILE, status: "active", createdAt: "2026-10-05T08:00:00Z", lastSeenAt: new Date().toISOString(), devices: 1, clients: 5, readings: 0 },
    { id: "u2", email: "maya@example.com", fullName: "מאיה לוין", phone: "052-5550111", role: "subscriber", status: "active", plan: "basic", deviceLimit: 2, createdAt: "2026-10-05T09:00:00Z", lastSeenAt: null, devices: 0, clients: 0, readings: 0 },
    { id: "u3", email: "tal@example.com", fullName: "טל ברק", phone: "", role: "subscriber", status: "suspended", plan: "trial", deviceLimit: 1, createdAt: "2026-10-04T09:00:00Z", lastSeenAt: null, devices: 1, clients: 2, readings: 1 },
  ];
  const done = async () => ({ status: "ok" });
  return {
    client,
    watch: () => () => {},
    onSignedOut: () => () => {},
    savedSession: async () => ({ access_token: "lab" }),
    signIn: async () => ({ ok: true }),
    claim: async () => ({ status: "ok", profile: LAB_PROFILE, deviceId: "lab-device" }),
    status: async () => ({ status: "ok" }),
    signOut: async () => {},
    forget: async () => {},
    mfaState: async () => ({ level: "aal2", needsCode: false, factorId: "lab-factor" }),
    mfaVerify: async () => {},
    mfaEnroll: async () => ({ factorId: "lab-factor", qr: "", secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP", uri: "otpauth://totp/lab:lab%40example.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP" }),
    changePassword: async () => {},
    updateProfile: done,
    myDevices: async () => [{ id: "lab-device", label: "Chrome · Windows", status: "approved", createdAt: "2026-10-05T08:00:00Z", lastSeenAt: new Date().toISOString(), current: true }],
    revokeMyDevice: done,
    logEvent: done,
    admin: {
      listAccounts: async () => accounts,
      updateAccount: done,
      listDevices: async () => [],
      revokeDevice: done,
      audit: async () => [],
      createAccount: async () => ({ userId: "u9", warnings: [] }),
      setPassword: done,
    },
  };
}
