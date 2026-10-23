import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { phaseLots } from "@/data/site";
import { LotStatusBadge, T, Tx, lotVars, useSiteData, useText } from "@/components/site/text";
import { MAP_STRINGS } from "./map-config";
import type { MapHandle } from "./lot-map-gl";

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
     * flagged for Quill/Joseph to rewrite. MAP_STRINGS.disclaimer is shown instead.
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
  const [failed, setFailed] = useState(false);
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
            n ? `${n} · ${tRef.current(`global.status.${status}`)}` : MAP_STRINGS.futureLabel,
          onSelect: (id) => setSelectedId(id),
          onReady: () => setReady(true),
        });
      })
      .catch(() => setFailed(true));
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

  const btn =
    "min-h-11 border border-line bg-cream/95 px-2 text-xs shadow-sm sm:px-3 sm:text-sm hover:bg-paper focus-visible:outline focus-visible:outline-2";

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div
        ref={wrap}
        className="relative h-[440px] overflow-hidden border border-line bg-paper-deep sm:h-auto sm:min-h-[520px] lg:col-span-8"
        data-map-root
      >
        {/* Reserved height: 440px on phones, min 520px (or the panel height) on wider screens. */}
        <div
          ref={host}
          // Inline style: maplibre-gl.css sets .maplibregl-map { position: relative }.
          style={{ position: "absolute", inset: 0 }}
          aria-label="Map of Belmore Estates lots"
          role="region"
        />
        {!ready && !failed ? (
          <div
            aria-busy="true"
            className="absolute inset-0 flex items-center justify-center bg-paper-deep"
          >
            <span className="sr-only">{MAP_STRINGS.loading}</span>
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-ink motion-reduce:animate-none" />
          </div>
        ) : null}
        {ready ? (
          <div className="absolute left-2 right-12 top-2 flex flex-wrap gap-1.5 sm:gap-2">
            <button type="button" className={btn} onClick={() => handle.current?.fitSubdivision()}>
              {MAP_STRINGS.fit}
            </button>
            <button type="button" className={btn} onClick={() => handle.current?.showArea()}>
              {MAP_STRINGS.area}
            </button>
            <button
              type="button"
              className={btn}
              aria-pressed={aerial}
              onClick={() => setAerial((a) => !a)}
            >
              {aerial ? MAP_STRINGS.street : MAP_STRINGS.aerial}
            </button>
          </div>
        ) : null}
      </div>
      <aside
        className="border border-line bg-cream p-5 lg:col-span-4"
        data-model-panel={isFuture ? "future" : lot.id}
        aria-live="polite"
      >
        {isFuture ? (
          <>
            <h3 className="text-2xl">{MAP_STRINGS.futureLabel}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{MAP_STRINGS.futureNote}</p>
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
            <Link
              to="/homes/$slug"
              params={{ slug: lot.slug }}
              className="mt-4 inline-flex min-h-11 items-center text-sm underline"
            >
              <Tx k="home.phase1.card.link" />
            </Link>
          </>
        )}
        <p className="sr-only">{MAP_STRINGS.listHeading}</p>
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
              {MAP_STRINGS.futureButton}
            </button>
          </li>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted">{MAP_STRINGS.disclaimer}</p>
      </aside>
    </div>
  );
}
