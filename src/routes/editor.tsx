import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { z } from "zod";

// The editor bundle (Puck + panels) is only downloaded here, after mount.
const EditorApp = lazy(() => import("@/editor/EditorApp"));

export const Route = createFileRoute("/editor")({
  validateSearch: z.object({
    page: z
      .string()
      .regex(/^[a-z0-9_-]{1,60}$/)
      .optional()
      .catch(undefined),
  }),
  head: () => ({
    meta: [{ title: "Editor | Belmore Estates" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: EditorRoute,
});

function EditorRoute() {
  const { page } = Route.useSearch();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const loading = (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        color: "#243f34",
      }}
      role="status"
    >
      Opening the editor…
    </div>
  );
  if (!mounted) return loading;
  return (
    <Suspense fallback={loading}>
      <EditorApp page={page ?? "home"} />
    </Suspense>
  );
}
