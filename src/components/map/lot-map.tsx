import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { phaseLots } from "@/data/site";
import { LotStatusBadge, T, Tx, lotVars, useSiteData, useText } from "@/components/site/text";
import { ATTRIBUTION_LOTS } from "./map-config";
import type { MapFailure, MapHandle } from "./lot-map-gl";

/**
 * Interactive lot map (replaces the three.js massing model).
 * - Real basemap (OpenFreeMap / OSM) with an NYS aerial toggle.
 * - maplibre-gl is imported only when the map nears the viewport.
 * - Height is reserved up front (no layout shift).
 * - The lot buttons below the map are the keyboard / screen-reader path.
 */
export function LotMap(
  _props: {
    /**
     * Kept for API compatibility with SiteModel. The existing hint/caption copy describes the
     * 3D massing model ("drag to orbit", "houses are placeholders"), so it is not rendered;
     * flagged for Quill/Joseph to rewrite. The "map.disclaimer" text key is shown instead.
     */
    hintKey?: string;
    captionKey?: string;
  } = {},
) {
  const host = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const handle = useRef<MapHandle | null>(null);
  const [selectedId, setSelectedId] = useState("801");
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<MapFailure | null>(null);
  const [aerial, setAerial] = useState(false);
  const { lots } = useSiteData();
  const t = useText();

  const statuses = useMemo(
    () => Object.fromEntries(lots.map((l) => [l.id, l.status])) as Record<string, string>,
    [lots],
  );
  const isFuture = selectedId.startsWith("future");
  const lot = lots.find((item) => item.id === selectedId) ?? lots[0] ?? phaseLots[0];
  const vars = lotVars(lot);

  // Glitch 4: load only when (nearly) visible.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const statusRef = useRef(statuses);
  statusRef.current = statuses;
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (!visible || !host.current) return;
    let dead = false;
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    import("./lot-map-gl")
      .then(({ createLotMap }) => {
        if (dead || !host.current) return;
        handle.current = createLotMap({
          container: host.current,
          statuses: statusRef.current,
          reducedMotion: Boolean(reducedMotion),
          hoverLabel: ({ lot: n, status }) =>
            n
              ? `${n} · ${tRef.current(`global.status.${status}`)}`
              : tRef.current("map.future.label"),
          onSelect: (id) => setSelectedId(id),
          onReady: () => setReady(true),
          onError: (reason) => {
            if (!dead) setFailed(reason);
          },
          label: tRef.current("map.label"),
        });
      })
      // The map chunk itself failed to load (offline, blocked).
      .catch(() => setFailed("load"));
    return () => {
      dead = true;
      handle.current?.dispose();
      handle.current = null;
    };
  }, [visible]);

  useEffect(() => {
    handle.current?.setStatuses(statuses);
  }, [statuses, ready]);
  useEffect(() => {
    handle.current?.select(selectedId);
  }, [selectedId, ready]);
  useEffect(() => {
    handle.current?.setAerial(aerial);
  }, [aerial, ready]);

  // Icon-only on phones (one compact row, name via sr-only text + tooltip); icon + text from sm.
  const btn =
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 border border-line bg-cream/95 px-2 text-sm shadow-sm sm:px-3 hover:bg-paper focus-visible:outline focus-visible:outline-2";
  const control = (label: string, icon: ReactNode) => (
    <>
      {icon}
      <span className="sr-only sm:not-sr-only">{label}</span>
    </>
  );
  const aerialLabel = aerial ? t("map.control.street") : t("map.control.aerial");

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div
        ref={wrap}
        className="relative h-[440px] overflow-hidden border border-line bg-paper-deep sm:h-auto sm:min-h-[520px] lg:col-span-8"
        data-map-root
      >
        {/* Reserved height: 440px on phones, min 520px (or the panel height) on wider screens. */}
        {/* MapLibre labels its own canvas as the region ("map.label"), so the host is a
            plain div: no nested region landmarks. */}
        <div
          ref={host}
          // Inline style: maplibre-gl.css sets .maplibregl-map { position: relative }.
          style={{ position: "absolute", inset: 0 }}
        />
        {failed ? (
          <div
            role="status"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-paper-deep p-6 text-center"
            data-map-error={failed}
          >
            <p className="max-w-sm text-base">
              {failed === "webgl" ? t("map.error.webgl") : t("map.error")}
            </p>
            <p className="max-w-sm text-sm text-muted">{t("map.error.fallback")}</p>
          </div>
        ) : null}
        {!ready && !failed ? (
          <div
            aria-busy="true"
            className="absolute inset-0 flex items-center justify-center bg-paper-deep"
          >
            <span className="sr-only">{t("map.loading")}</span>
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-ink motion-reduce:animate-none" />
          </div>
        ) : null}
        {ready ? (
          <div className="absolute left-2 top-2 flex gap-1.5 sm:right-12 sm:flex-wrap sm:gap-2">
            <button
              type="button"
              className={btn}
              title={t("map.control.fit")}
              onClick={() => handle.current?.fitSubdivision()}
            >
              {control(t("map.control.fit"), <IconFit />)}
            </button>
            <button
              type="button"
              className={btn}
              title={t("map.control.area")}
              onClick={() => handle.current?.showArea()}
            >
              {control(t("map.control.area"), <IconArea />)}
            </button>
            <button
              type="button"
              className={btn}
              title={aerialLabel}
              aria-pressed={aerial}
              onClick={() => setAerial((a) => !a)}
            >
              {control(aerialLabel, aerial ? <IconStreet /> : <IconAerial />)}
            </button>
          </div>
        ) : null}
      </div>
      <aside
        className="border border-line bg-cream p-5 lg:col-span-4"
        data-model-panel={isFuture ? "future" : lot.id}
      >
        {/* Only the lot details are announced when the selection changes. */}
        <div aria-live="polite">
          {isFuture ? (
            <>
              <h3 className="text-2xl">{t("map.future.label")}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t("map.future.note")}</p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-widest text-copper">
                  <Tx k="home.sitemodel.panel.eyebrow" vars={vars} />
                </p>
                <LotStatusBadge status={lot.status} />
              </div>
              <h3 className="mt-2 text-3xl">
                <T k="home.sitemodel.panel.street" vars={vars} />
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                <T k="home.sitemodel.panel.note" vars={vars} />
              </p>
              <dl className="mt-5 grid gap-3 text-sm">
                <div>
                  <dt className="text-muted">
                    <Tx k="homes.detail.specs.area.label" />
                  </dt>
                  <dd>
                    <T k="home.sitemodel.panel.area" vars={vars} />
                  </dd>
                </div>
                {lot.frontage ? (
                  <div>
                    <dt className="text-muted">Frontage · depth</dt>
                    <dd>
                      {lot.frontage} · {lot.depth}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted">
                    <Tx k="homes.detail.specs.release.label" />
                  </dt>
                  <dd>
                    <T k="home.sitemodel.panel.release" vars={vars} />
                  </dd>
                </div>
              </dl>
              {/* /lots/$slug: slug is the lot number ("801"), as in the /lots route. */}
              <Link
                to="/lots/$slug"
                params={{ slug: lot.slug }}
                className="mt-4 inline-flex min-h-11 items-center text-sm underline"
              >
                <Tx k="home.phase1.card.link" />
              </Link>
            </>
          )}
        </div>
        <p className="sr-only">{t("map.list.heading")}</p>
        <ul className="mt-4 grid grid-cols-4 gap-2">
          {lots.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={item.id === selectedId}
                aria-label={`Lot ${item.id}, ${t(`global.status.${item.status}`)}`}
                onClick={() => setSelectedId(item.id)}
                className={
                  item.id === selectedId
                    ? "min-h-11 w-full bg-ink text-sm text-cream"
                    : "min-h-11 w-full border border-line bg-paper text-sm"
                }
              >
                {item.id}
              </button>
            </li>
          ))}
          <li className="col-span-4">
            <button
              type="button"
              aria-pressed={isFuture}
              onClick={() => setSelectedId("future-01")}
              className={
                isFuture
                  ? "min-h-11 w-full bg-ink text-sm text-cream"
                  : "min-h-11 w-full border border-dashed border-line bg-paper text-sm"
              }
            >
              {t("map.control.future")}
            </button>
          </li>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          {t("map.disclaimer")} {ATTRIBUTION_LOTS}
        </p>
      </aside>
    </div>
  );
}

const svg = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false" as const,
};
/** Frame corners: fit to the subdivision. */
function IconFit() {
  return (
    <svg {...svg}>
      <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
      <rect x="9" y="9" width="6" height="6" />
    </svg>
  );
}
/** Pin in a wider area: show North Greece. */
function IconArea() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5a2.5 2.5 0 0 1 2.5 2.5c0 2-2.5 4.5-2.5 4.5S9.5 13 9.5 11A2.5 2.5 0 0 1 12 8.5z" />
    </svg>
  );
}
/** Stacked layers: switch to the aerial. */
function IconAerial() {
  return (
    <svg {...svg}>
      <path d="M12 4 3 8.5l9 4.5 9-4.5L12 4z" />
      <path d="m3 12.5 9 4.5 9-4.5M3 16.5 12 21l9-4.5" />
    </svg>
  );
}
/** Folded map: back to the street map. */
function IconStreet() {
  return (
    <svg {...svg}>
      <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </svg>
  );
}
