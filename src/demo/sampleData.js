/**
 * The sample clients and an in-memory stand-in for the supabase-js client (the four workspace RPCs and the
 * file bucket), for the public demo and the developer lab. Nothing leaves the page.
 */
import { toYmd } from "../data/store.js";

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
export function memoryClient() {
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
