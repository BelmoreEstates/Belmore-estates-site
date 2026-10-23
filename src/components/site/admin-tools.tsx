/**
 * Owner-only helpers on the public site, rendered after hydration only (so the
 * server HTML visitors get is unchanged):
 * - "Edit this page" when the non-secret belmore_admin hint cookie is set.
 *   (The editor itself re-checks the session server-side.)
 * - A banner while previewing the unpublished draft.
 */
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSiteData } from "@/components/site/text";
import { setPreview } from "@/server/editor";
import { pageSlugForPath } from "@/site/doc";

const bar: React.CSSProperties = {
  position: "fixed",
  zIndex: 60,
  fontFamily: "system-ui, sans-serif",
  fontSize: 14,
  boxShadow: "0 6px 24px rgba(0,0,0,.25)",
};
const btn: React.CSSProperties = {
  background: "#fff",
  color: "#16241e",
  border: 0,
  borderRadius: 6,
  padding: "6px 12px",
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
};

export function AdminTools() {
  const { preview } = useSiteData();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [admin, setAdmin] = useState(false);
  useEffect(() => setAdmin(/(?:^|;\s*)belmore_admin=1/.test(document.cookie)), [path]);
  if (path === "/editor" || path.startsWith("/admin") || path === "/login") return null;
  const slug = pageSlugForPath(path);
  const editHref = `/editor?page=${encodeURIComponent(slug ?? "home")}`;

  if (preview)
    return (
      <div
        role="region"
        aria-label="Draft preview"
        style={{
          ...bar,
          left: 0,
          right: 0,
          bottom: 0,
          background: "#a5683c",
          color: "#fff",
          padding: "10px 16px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <strong>Preview of your unpublished draft — visitors don't see this yet.</strong>
        <a href={editHref} style={btn}>
          Back to editor
        </a>
        <button
          type="button"
          style={btn}
          onClick={async () => {
            await setPreview({ data: { on: false } }).catch(() => undefined);
            window.location.reload();
          }}
        >
          Exit preview
        </button>
      </div>
    );
  if (!admin || !slug) return null;
  return (
    <a
      href={editHref}
      data-edit-page=""
      style={{
        ...bar,
        ...btn,
        right: 18,
        bottom: 18,
        background: "#243f34",
        color: "#fff",
        padding: "12px 18px",
        borderRadius: 999,
      }}
    >
      ✎ Edit this page
    </a>
  );
}
