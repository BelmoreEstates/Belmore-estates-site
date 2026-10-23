// @ts-check
/**
 * Load a local `.env` (if present) into process.env for the Node scripts.
 * Existing variables win. Never commit .env — see .env.example.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const envFile = join(dirname(fileURLToPath(import.meta.url)), "..", ".env");
if (existsSync(envFile) && typeof process.loadEnvFile === "function") process.loadEnvFile(envFile);

/** DATABASE_URL, trimmed; undefined when unset/blank. */
export function databaseUrl() {
  const v = process.env.DATABASE_URL?.trim();
  return v || undefined;
}
