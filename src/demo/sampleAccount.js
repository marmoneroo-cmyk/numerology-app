/**
 * A signed-in account over the in-memory sample clients: the public demo's subscriber, and the developer
 * lab's admin (src/lab/labAccount.js). No network, no password; a reload starts over.
 */
import { memoryClient } from "./sampleData.js";

/** The account service of `profile`, over `client` (an in-memory stand-in for supabase-js). */
export function sampleService(client, profile) {
  const accounts = [
    { ...profile, status: "active", createdAt: "2026-10-05T08:00:00Z", lastSeenAt: new Date().toISOString(), devices: 1, clients: 5, readings: 0 },
    { id: "u2", email: "maya@example.com", fullName: "מאיה לוין", phone: "052-5550111", role: "subscriber", status: "active", plan: "basic", deviceLimit: 2, createdAt: "2026-10-05T09:00:00Z", lastSeenAt: null, devices: 0, clients: 0, readings: 0 },
    { id: "u3", email: "tal@example.com", fullName: "טל ברק", phone: "", role: "subscriber", status: "suspended", plan: "trial", deviceLimit: 1, createdAt: "2026-10-04T09:00:00Z", lastSeenAt: null, devices: 1, clients: 2, readings: 1 },
  ];
  const done = async () => ({ status: "ok" });
  return {
    client,
    watch: () => () => {},
    onSignedOut: () => () => {},
    savedSession: async () => ({ access_token: "sample" }),
    signIn: async () => ({ ok: true }),
    claim: async () => ({ status: "ok", profile: profile, deviceId: "sample-device" }),
    status: async () => ({ status: "ok" }),
    signOut: async () => {},
    forget: async () => {},
    mfaState: async () => ({ level: "aal2", needsCode: false, factorId: "sample-factor" }),
    mfaVerify: async () => {},
    mfaEnroll: async () => ({ factorId: "sample-factor", qr: "", secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP", uri: "otpauth://totp/lab:lab%40example.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP" }),
    changePassword: async () => {},
    updateProfile: done,
    myDevices: async () => [{ id: "sample-device", label: "Chrome · Windows", status: "approved", createdAt: "2026-10-05T08:00:00Z", lastSeenAt: new Date().toISOString(), current: true }],
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

/** The demo's subscriber: no admin screen. */
export const DEMO_PROFILE = { id: "demo-user", email: "demo@example.com", fullName: "הסטודיו לדוגמה", phone: "", role: "subscriber", plan: "pro", deviceLimit: 2 };

/** The demo's account service, over a fresh copy of the sample clients. */
export const demoService = () => sampleService(memoryClient(), DEMO_PROFILE);
