/**
 * Interactive lot map: sources, attribution, limits and the few strings that do
 * not have text keys yet. Everything here is keyless and needs no account.
 *
 * Sources and terms (verified Oct 23 2026, see /workspace/belmore/map-data/georef-report.md):
 * - Basemap: OpenFreeMap "liberty" (https://openfreemap.org/tos/), OSM data (ODbL 1.0).
 * - Aerial: NYS ITS Geospatial Services orthoimagery, 2023 Monroe County flight
 *   (free public tile cache, "as is" disclaimer; flown before Section 8 was built).
 * - Lot lines: Section 8 signed plat (COGO) and the LaDieu preliminary plat (approximate).
 * - No Town/County parcel data is shipped (used only offline for alignment).
 */

export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export const ORTHO_TILES =
  "https://orthos.its.ny.gov/arcgis/rest/services/wms/2023/MapServer/tile/{z}/{y}/{x}";

export const LOTS_URL = "/map-data/belmore-lots.geojson";

/** Lot-line source credit. Shown in the disclaimer under the map (not in the map overlay). */
export const ATTRIBUTION_LOTS =
  "Lot layout: Legends West Section 8 final plat & LaDieu Associates preliminary plat (approximate, not a survey).";
export const ATTRIBUTION_ORTHO =
  'Imagery: <a href="https://gis.ny.gov/orthoimagery" target="_blank" rel="noopener">NYS ITS Geospatial Services</a> (2023)';

/** Initial / fit view: the subdivision (lots 801-807 plus the future phase). */
export const SUBDIVISION_BOUNDS: [[number, number], [number, number]] = [
  [-77.6868, 43.2616],
  [-77.6835, 43.2646],
];
/** "Area" view: North Greece, for context. */
export const AREA_BOUNDS: [[number, number], [number, number]] = [
  [-77.735, 43.238],
  [-77.635, 43.29],
];
/** Pan limit (a little wider than the area view). */
export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-77.85, 43.18],
  [-77.52, 43.34],
];
export const MIN_ZOOM = 11;
export const MAX_ZOOM = 19.5;

/**
 * OSM tags the built Belmore Way stub (way 20137303) as "Shelby Circle".
 * Basemap street labels with these names are hidden and replaced by our own
 * labels for the planned streets.
 */
export const HIDDEN_BASEMAP_STREET_NAMES = ["Shelby Circle"];

/* Map UI text lives in the text system (src/data/content.ts, keys map.*), edited in /admin. */

/** Lot fills. Phase 1 green is a more saturated take on the site's pine (#243f34). */
export const STATUS_COLORS = {
  available: "#1d6f47",
  reserved: "#c8702c",
  sold: "#3a3f3c",
  future: "#e8b04b",
} as const;

/** Lot outlines and labels. White lot labels on the green fill are >= 4.8:1 (WCAG AA). */
export const LOT_STYLE = {
  line: "#ffffff",
  futureLine: "#b07a1c",
  futureDash: "#8a5a12",
  accent: "#e8590c", // selected / hover outline
  accentCasing: "#ffffff",
  labelHalo: "#0f3d27",
  phaseOpacity: 0.92,
  futureOpacity: 0.55,
} as const;

/**
 * Richer basemap colors, applied over OpenFreeMap "liberty" by layer id.
 * Values are [paint property, liberty default -> ours].
 */
export const BASEMAP_PAINT: Record<string, Record<string, string>> = {
  park: { "fill-color": "#b9dca0", "fill-outline-color": "#8cc474" },
  park_outline: { "line-color": "#a3cf88" },
  landcover_wood: { "fill-color": "hsla(110,42%,56%,0.75)" },
  landcover_grass: { "fill-color": "#a6d38a" },
  landuse_residential: { "fill-color": "hsla(35,55%,86%,0.55)" },
  water: { "fill-color": "#6fa8e8" },
  waterway_river: { "line-color": "#5b9bd9" },
  waterway_other: { "line-color": "#5b9bd9" },
  building: { "fill-color": "#e3cdb0", "fill-outline-color": "#c4a47c" },
  road_minor_casing: { "line-color": "#b3aa9c" },
  road_service_track_casing: { "line-color": "#bdb5a8" },
  road_secondary_tertiary_casing: { "line-color": "#d4833f" },
  road_trunk_primary_casing: { "line-color": "#d4833f" },
  road_link_casing: { "line-color": "#d4833f" },
  road_motorway_casing: { "line-color": "#cf7a35" },
  road_motorway_link_casing: { "line-color": "#cf7a35" },
};
