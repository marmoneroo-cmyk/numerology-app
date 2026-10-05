/**
 * The server backend over the real migrations in PGlite, for the backend and
 * store contract suites. One database per test file; every backend made is a
 * new subscriber in it, signed in and holding the active session.
 */
import { createDatabase, createUser, newSession, rpc } from "./harness.js";
import { fakeClient, createFakeStorage } from "./fakeClient.js";
import { serverBackend } from "../../src/data/serverBackend.js";

let server;
const once = () => (server ??= (async () => ({ db: await createDatabase(), storage: createFakeStorage() }))());
let devices = 0;

/** Builds the database (a second or more): call it from beforeAll with a long timeout. */
export const prepareServer = () => once();

export async function makeServerBackend() {
  const { db, storage } = await once();
  const id = await createUser(db);
  const user = { id, sessionId: await newSession(db, id) };
  const claim = await rpc(db, user, "claim_session", { p_device_key: `contract-device-${String(++devices).padStart(8, "0")}`, p_label: "tests" });
  if (claim.status !== "ok") throw new Error(`could not claim a session: ${claim.status}`);
  return serverBackend(fakeClient(db, user, storage), id);
}
