/**
 * No-PII server error logging. Logs the error class, a database/driver code and
 * a short message only: never the error object itself (postgres errors carry
 * the query parameters and `detail`, which can include a lead's name, email or
 * phone), never request bodies.
 */
export function logServerError(
  scope: string,
  err: unknown,
  context?: Record<string, string | number>,
) {
  const e = err as { name?: string; code?: string | number; message?: string } | null;
  const name = e?.name ?? typeof err;
  const code = e?.code !== undefined ? ` code=${String(e.code).slice(0, 20)}` : "";
  // Strip anything that looks like an email address or a long digit run (phone).
  const message = String(e?.message ?? "")
    .replace(/[^\s@]+@[^\s@]+/g, "[email]")
    .replace(/\+?\d[\d\s().-]{6,}\d/g, "[number]")
    .slice(0, 200);
  const ctx = context
    ? " " +
      Object.entries(context)
        .map(([k, v]) => `${k}=${String(v).slice(0, 40)}`)
        .join(" ")
    : "";
  console.error(`[${scope}] ${name}${code}: ${message}${ctx}`);
}
