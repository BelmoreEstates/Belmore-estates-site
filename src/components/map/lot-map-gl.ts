/**
 * MapLibre part of the lot map. Loaded with a dynamic import only when the map
 * scrolls near the viewport, so maplibre-gl stays out of the main bundle.
 */
import maplibregl, {
  type ExpressionSpecification,
  type FilterSpecification,
  type GeoJSONSource,
  type LngLatBoundsLike,
  type MapGeoJSONFeature,
  type StyleSpecification,
} from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  AREA_BOUNDS,
  BASEMAP_PAINT,
  LOT_STYLE,
  ATTRIBUTION_ORTHO,
  HIDDEN_BASEMAP_STREET_NAMES,
  LOTS_URL,
  MAP_STYLE_URL,
  MAX_BOUNDS,
  MAX_ZOOM,
  MIN_ZOOM,
  ORTHO_TILES,
  STATUS_COLORS,
  SUBDIVISION_BOUNDS,
} from "./map-config";

export type LotStatusMap = Record<string, string>;

export type MapHandle = {
  select: (id: string | null) => void;
  setStatuses: (statuses: LotStatusMap) => void;
  setAerial: (on: boolean) => void;
  fitSubdivision: () => void;
  showArea: () => void;
  dispose: () => void;
};

type Options = {
  container: HTMLElement;
  statuses: LotStatusMap;
  reducedMotion: boolean;
  /** Short hover text, e.g. "Lot 801 · Coming Soon". */
  hoverLabel: (f: { id: string; lot: string | null; status: string }) => string;
  onSelect: (id: string) => void;
  onReady: () => void;
};

const LOT_FILL = "atlas-lots-fill";
const LOT_LINE = "atlas-lots-line";
const LOT_LABEL = "atlas-lots-label";
const STREET_LABEL = "atlas-street-label";

/** Wrap a style filter so basemap labels for the mislabeled OSM way are hidden. */
function withoutNames(filter: FilterSpecification | undefined): FilterSpecification {
  const hide: FilterSpecification = [
    "!",
    ["in", ["get", "name"], ["literal", HIDDEN_BASEMAP_STREET_NAMES]],
  ];
  return filter ? (["all", filter, hide] as FilterSpecification) : hide;
}

function transformStyle(
  _prev: StyleSpecification | undefined,
  next: StyleSpecification,
): StyleSpecification {
  return {
    ...next,
    layers: next.layers.map((layer) => {
      if (
        "source-layer" in layer &&
        layer["source-layer"] === "transportation_name" &&
        layer.type === "symbol"
      ) {
        return { ...layer, filter: withoutNames(layer.filter) };
      }
      // Flat building footprints at every zoom from 13 (liberty switches to a
      // 3D extrusion at z14, which reads as near-invisible with pitch locked at 0).
      if (layer.id === "building-3d") {
        return { ...layer, layout: { ...layer.layout, visibility: "none" } };
      }
      const paint = BASEMAP_PAINT[layer.id];
      if (layer.id === "building" && layer.type === "fill") {
        const { maxzoom: _drop, ...rest } = layer;
        void _drop;
        return { ...rest, paint: { ...rest.paint, ...paint } } as typeof layer;
      }
      if (paint && "paint" in layer) {
        return { ...layer, paint: { ...layer.paint, ...paint } } as typeof layer;
      }
      return layer;
    }),
  };
}

export function createLotMap(opts: Options): MapHandle {
  const { container, reducedMotion } = opts;
  let statuses = opts.statuses;
  let hoverId: string | number | null = null;
  let selectedId: string | null = null;
  let disposed = false;
  let lotsData: FeatureCollection | null = null;

  const map = new maplibregl.Map({
    container,
    bounds: SUBDIVISION_BOUNDS as LngLatBoundsLike,
    fitBoundsOptions: { padding: 24 },
    maxBounds: MAX_BOUNDS as LngLatBoundsLike,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    // Glitches 1 & 2: page scrolls normally; two fingers / ctrl+wheel move the map.
    cooperativeGestures: true,
    // Flat, north-up map: no accidental rotate/pitch jitter.
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    // Glitch 5: a slightly shaky tap still counts as a tap.
    clickTolerance: 8,
    attributionControl: false,
    renderWorldCopies: false,
    fadeDuration: reducedMotion ? 0 : 300,
  });
  map.setStyle(MAP_STYLE_URL, { transformStyle });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(
    // Required credits only (OpenFreeMap, OpenMapTiles, OSM, and NYS ITS when the aerial
    // is on). Compact "i" toggle on narrow maps; the plat note lives under the map.
    new maplibregl.AttributionControl({ compact: container.clientWidth < 640 }),
    "bottom-right",
  );
  map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");

  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 8,
    className: "atlas-lot-tip",
  });

  const duration = reducedMotion ? 0 : 600;

  function withStatus(fc: FeatureCollection): FeatureCollection {
    return {
      ...fc,
      features: fc.features.map((f) => {
        const p = (f.properties ?? {}) as Record<string, unknown>;
        const status = p.kind === "future" ? "future" : (statuses[String(p.lot)] ?? "available");
        return { ...f, properties: { ...p, status } };
      }),
    };
  }

  function firstSymbolLayer(): string | undefined {
    return map.getStyle().layers.find((l) => l.type === "symbol")?.id;
  }

  map.on("load", async () => {
    if (disposed) return;
    const before = firstSymbolLayer();
    map.addSource("nys-ortho", {
      type: "raster",
      tiles: [ORTHO_TILES],
      tileSize: 256,
      maxzoom: 19,
      attribution: ATTRIBUTION_ORTHO,
    });
    map.addLayer(
      { id: "nys-ortho", type: "raster", source: "nys-ortho", layout: { visibility: "none" } },
      before,
    );

    const res = await fetch(LOTS_URL);
    lotsData = (await res.json()) as FeatureCollection;
    if (disposed) return;
    // promoteId: stable string ids ("801", "future-03") for feature-state.
    map.addSource("lots", {
      type: "geojson",
      data: addIdKey(withStatus(lotsData)),
      promoteId: "id_key",
    });

    const isLot: FilterSpecification = ["==", ["geometry-type"], "Polygon"];
    map.addLayer({
      id: LOT_FILL,
      type: "fill",
      source: "lots",
      filter: isLot,
      paint: {
        "fill-color": [
          "match",
          ["get", "status"],
          "available",
          STATUS_COLORS.available,
          "reserved",
          STATUS_COLORS.reserved,
          "sold",
          STATUS_COLORS.sold,
          STATUS_COLORS.future,
        ],
        "fill-opacity": [
          "case",
          ["==", ["get", "status"], "future"],
          [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.8,
            ["boolean", ["feature-state", "hover"], false],
            0.7,
            LOT_STYLE.futureOpacity,
          ],
          ["boolean", ["feature-state", "selected"], false],
          0.97,
          LOT_STYLE.phaseOpacity,
        ],
      },
    });
    map.addLayer({
      id: LOT_LINE,
      type: "line",
      source: "lots",
      filter: isLot,
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "status"], "future"],
          LOT_STYLE.futureLine,
          LOT_STYLE.line,
        ],
        "line-width": 1.4,
      },
    });
    // Selected / hover: bold accent outline over a white casing so it reads on
    // green, amber and the aerial alike.
    const active: ExpressionSpecification = [
      "any",
      ["boolean", ["feature-state", "selected"], false],
      ["boolean", ["feature-state", "hover"], false],
    ];
    map.addLayer({
      id: "atlas-lots-accent-casing",
      type: "line",
      source: "lots",
      filter: isLot,
      layout: { "line-join": "round" },
      paint: {
        "line-color": LOT_STYLE.accentCasing,
        "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 7, 5],
        "line-opacity": ["case", active, 1, 0],
      },
    });
    map.addLayer({
      id: "atlas-lots-accent",
      type: "line",
      source: "lots",
      filter: isLot,
      layout: { "line-join": "round" },
      paint: {
        "line-color": LOT_STYLE.accent,
        "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 4, 2.5],
        "line-opacity": ["case", active, 1, 0],
      },
    });
    map.addLayer({
      id: "atlas-future-dash",
      type: "line",
      source: "lots",
      filter: ["all", isLot, ["==", ["get", "status"], "future"]],
      paint: { "line-color": LOT_STYLE.futureDash, "line-width": 1, "line-dasharray": [2, 2] },
    });
    map.moveLayer("atlas-future-dash", "atlas-lots-accent-casing");
    map.addLayer({
      id: STREET_LABEL,
      type: "symbol",
      source: "lots",
      filter: ["==", ["get", "kind"], "street"],
      minzoom: 15,
      layout: {
        "symbol-placement": "line",
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Italic"],
        "text-size": 13,
      },
      paint: { "text-color": "#3a3f3c", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
    });
    map.addLayer({
      id: LOT_LABEL,
      type: "symbol",
      source: "lots",
      filter: ["==", ["get", "kind"], "phase1"],
      minzoom: 15.5,
      layout: {
        "text-field": ["get", "lot"],
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 15.5, 11, 18, 16],
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": LOT_STYLE.labelHalo,
        "text-halo-width": 1.4,
      },
    });

    // Narrow maps: start with attribution collapsed behind the "i" toggle.
    if (container.clientWidth < 640) {
      container
        .querySelector(".maplibregl-ctrl-attrib")
        ?.classList.remove("maplibregl-compact-show");
    }
    applyFeatureState();
    opts.onReady();
  });

  function addIdKey(fc: FeatureCollection): FeatureCollection {
    return {
      ...fc,
      features: fc.features.map((f, i) => ({
        ...f,
        properties: { ...(f.properties ?? {}), id_key: String(f.id ?? `street-${i}`) },
      })),
    };
  }

  function applyFeatureState() {
    if (!map.getSource("lots")) return;
    map.removeFeatureState({ source: "lots" });
    if (selectedId) map.setFeatureState({ source: "lots", id: selectedId }, { selected: true });
    if (hoverId !== null) map.setFeatureState({ source: "lots", id: hoverId }, { hover: true });
  }

  // Hover: one feature-state update per animation frame (no flicker/jitter).
  let pending: maplibregl.MapMouseEvent | null = null;
  let raf = 0;
  function onMove(e: maplibregl.MapMouseEvent) {
    pending = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const ev = pending;
      pending = null;
      if (!ev || !map.getLayer(LOT_FILL)) return;
      const f = map.queryRenderedFeatures(ev.point, { layers: [LOT_FILL] })[0] as
        MapGeoJSONFeature | undefined;
      const id = f ? (f.id ?? null) : null;
      if (id !== hoverId) {
        if (hoverId !== null)
          map.setFeatureState({ source: "lots", id: hoverId }, { hover: false });
        hoverId = id;
        if (hoverId !== null) map.setFeatureState({ source: "lots", id: hoverId }, { hover: true });
        map.getCanvas().style.cursor = f ? "pointer" : "";
      }
      if (f) {
        const p = f.properties as Record<string, string | null>;
        popup
          .setLngLat(ev.lngLat)
          .setText(
            opts.hoverLabel({ id: String(f.id), lot: p.lot ?? null, status: String(p.status) }),
          )
          .addTo(map);
      } else popup.remove();
    });
  }
  map.on("mousemove", onMove);
  map.on("mouseout", () => {
    if (hoverId !== null) map.setFeatureState({ source: "lots", id: hoverId }, { hover: false });
    hoverId = null;
    popup.remove();
    map.getCanvas().style.cursor = "";
  });
  map.on("click", (e) => {
    if (!map.getLayer(LOT_FILL)) return;
    const f = map.queryRenderedFeatures(e.point, { layers: [LOT_FILL] })[0];
    if (f?.id !== undefined) opts.onSelect(String(f.id));
  });

  function boundsOf(id: string): maplibregl.LngLatBounds | null {
    const f = lotsData?.features.find((x) => String(x.id) === id);
    if (!f || f.geometry.type !== "Polygon") return null;
    const b = new maplibregl.LngLatBounds();
    for (const c of f.geometry.coordinates[0]) b.extend(c as [number, number]);
    return b;
  }

  return {
    select(id) {
      selectedId = id;
      applyFeatureState();
      const b = id ? boundsOf(id) : null;
      if (b && !map.getBounds().contains(b.getCenter()))
        map.easeTo({ center: b.getCenter(), duration });
    },
    setStatuses(next) {
      statuses = next;
      const src = map.getSource("lots") as GeoJSONSource | undefined;
      if (src && lotsData) src.setData(addIdKey(withStatus(lotsData)));
    },
    setAerial(on) {
      if (!map.getLayer("nys-ortho")) return;
      map.setLayoutProperty("nys-ortho", "visibility", on ? "visible" : "none");
    },
    fitSubdivision() {
      map.fitBounds(SUBDIVISION_BOUNDS as LngLatBoundsLike, { padding: 24, duration });
    },
    showArea() {
      map.fitBounds(AREA_BOUNDS as LngLatBoundsLike, { padding: 0, duration });
    },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      popup.remove();
      map.remove();
    },
  };
}
