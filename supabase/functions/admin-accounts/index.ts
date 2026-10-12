// Edge Function entry (Deno): wires the request logic in handler.js to Supabase.
// Supabase provides SUPABASE_URL and the project's keys; the secret key never leaves the server.
import { createClient } from "npm:@supabase/supabase-js@2.117.2"; // pinned, the same version as the app
import { handleRequest } from "./handler.js";

const keys = (name: string, legacy: string): string => {
  try {
    return JSON.parse(Deno.env.get(name) ?? "{}").default ?? Deno.env.get(legacy) ?? "";
  } catch {
    return Deno.env.get(legacy) ?? "";
  }
};

const deps = {
  url: Deno.env.get("SUPABASE_URL") ?? "",
  publishableKey: keys("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY"),
  secretKey: keys("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"),
  // the Studio's address and the live site's Vercel address (the merged redesign's preview is gone, 2026-10-12);
  // the local dev server only where the function runs with ALLOW_LOCALHOST=1
  allowedOrigins: [
    "https://studio.shani-cohen.com",
    "https://numerology-app-orcin.vercel.app",
    ...(Deno.env.get("ALLOW_LOCALHOST") === "1" ? ["http://localhost:5273"] : []),
  ],
  createClient,
};

Deno.serve((req: Request) => handleRequest(req, deps));
