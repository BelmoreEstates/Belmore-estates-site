// @ts-check
/**
 * Postgres client for the Node scripts (migrate, seed, backup).
 *
 * Neon URLs (*.neon.tech) go through Neon's serverless driver over a secure
 * WebSocket on port 443, which works on networks that block outbound 5432.
 * Any other URL (or DB_DRIVER=pg) uses node-postgres over TCP. Both expose
 * the same Pool / Client API.
 */
import pgTcp from "pg";
import { Pool as NeonPool, Client as NeonClient, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

/** @param {string} url */
function isNeonUrl(url) {
  if (process.env.DB_DRIVER === "pg") return false;
  if (process.env.DB_DRIVER === "neon") return true;
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

/** @param {string} url */
export function pgFor(url) {
  if (!isNeonUrl(url)) return { Pool: pgTcp.Pool, Client: pgTcp.Client };
  neonConfig.webSocketConstructor = ws;
  return { Pool: NeonPool, Client: NeonClient };
}
