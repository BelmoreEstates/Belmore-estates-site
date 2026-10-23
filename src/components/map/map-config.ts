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

export const ATTRIBUTION_LOTS =
  "Lot layout: Legends West Section 8 final plat &amp; LaDieu Associates preliminary plat (approximate, not a survey)";
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

/**
 * Strings without text keys yet. PROPOSED keys for Forge/Quill sign-off
 * (not added to the copy system on this branch):
 *   map.future.label   -> "Future phase (planned, details TBD)"  (Joseph's exact wording)
 *   map.future.note    -> "Preliminary layout, subject to change. Lot lines approximate."
 *   map.disclaimer     -> MAP_STRINGS.disclaimer (replaces the 3D-model caption)
 *   map.control.fit    -> "Fit to Belmore Estates"
 *   map.control.area   -> "Show North Greece"
 *   map.control.aerial -> "Aerial"
 *   map.control.street -> "Map"
 *   map.loading        -> "Loading map"
 *   map.list.heading   -> "All lots"
 */
export const MAP_STRINGS = {
  futureLabel: "Future phase (planned, details TBD)",
  futureNote: "Preliminary layout, subject to change. Lot lines approximate.",
  disclaimer:
    "Preliminary layout, subject to change; lot lines approximate. Aerial imagery is from 2023, before construction.",
  fit: "Fit to Belmore Estates",
  area: "Show North Greece",
  aerial: "Aerial",
  street: "Map",
  loading: "Loading map",
  listHeading: "All lots",
  futureButton: "Future phase",
} as const;

export const STATUS_COLORS = {
  available: "#2f5a46",
  reserved: "#b46a3c",
  sold: "#3a3f3c",
  future: "#d8cdb8",
} as const;
