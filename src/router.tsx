import { createRouter } from "@tanstack/react-router";
import { getGlobalStartContext } from "@tanstack/start-client-core";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

/** Per-request CSP nonce set by the security middleware (src/start.ts); server only. */
function cspNonce(): string | undefined {
  if (typeof window !== "undefined") return undefined;
  try {
    return (getGlobalStartContext() as { cspNonce?: string } | undefined)?.cspNonce;
  } catch {
    return undefined;
  }
}

export function getRouter() {
  const nonce = cspNonce();
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    ...(nonce ? { ssr: { nonce } } : {}),
  });
}
