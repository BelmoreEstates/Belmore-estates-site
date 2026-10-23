import { createMiddleware } from "@tanstack/react-start";

/**
 * Server-function guard: rejects scripted cross-site requests (Fetch Metadata)
 * before any handler runs. Admin checks happen in the handlers themselves
 * (requireAdmin / requireOwner in src/server/security.server.ts).
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const h = getRequest()?.headers;
  const site = h?.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    throw new Error("Forbidden: cross-site request blocked");
  }
  return next();
});
