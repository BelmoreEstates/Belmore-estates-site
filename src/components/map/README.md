# src/components/map (owned by Atlas)

Interactive lot map for Belmore Estates (MapLibre GL). It replaced the three.js massing
model (`site-model.tsx`, removed) and is embedded as `LotMap` from:

- `src/site/sections/home.tsx` (`HomeSiteModel`; registry label "Interactive site map")
- `src/site/sections/community.tsx`
- `src/site/blocks.tsx` (editor library block)

## Files

| File            | What it does                                                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lot-map.tsx`   | React shell: lazy-loads the map near the viewport, overlay buttons, side panel (lot details, lot list, disclaimer), loading and error states. The lot list is the keyboard / screen-reader path and the fallback when the map cannot load. |
| `lot-map-gl.ts` | MapLibre setup (dynamic import, so maplibre-gl stays out of the main bundle): basemap style overrides, lot layers, hover/select, aerial toggle, error handling (no WebGL, blocked style, lot-data fetch failure, 15 s load timeout).       |
| `map-config.ts` | URLs, bounds, attribution strings, lot and basemap colors.                                                                                                                                                                                 |

## Sources and licenses (no API keys, no accounts)

| Layer           | Source                                                                                                    | License / credit                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Street basemap  | OpenFreeMap "liberty" style, `https://tiles.openfreemap.org`                                              | OpenStreetMap data (ODbL), OpenMapTiles schema; credited "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" |
| Aerial (toggle) | NYS ITS 2023 orthoimagery, `https://orthos.its.ny.gov`                                                    | NYS public imagery; credited "Imagery: NYS ITS Geospatial Services (2023)"                                    |
| Lot lines       | Legends West Section 8 final plat (lots 801-807) and the LaDieu Associates preliminary plat (future lots) | Credited under the map: approximate, not a survey                                                             |

Credits for the basemap and aerial are in MapLibre's attribution control (compact "i" toggle
on narrow maps). The plat credit is in the disclaimer under the map. Both hosts are in the
CSP `connect-src` in `src/start.ts`.

Basemap overrides (in `transformStyle`): OSM labels for the mislabeled way 20137303
("Shelby Circle") are hidden; building footprints draw flat from z13 up (OSM currently has
none mapped in the subdivision; the aerial shows the houses); park, water, road casing and
building colors are richer than stock liberty. House numbers are not drawn.

## Data

- `public/map-data/belmore-lots.geojson`: the only shipped data. 7 Section 8 lots (COGO from
  the signed plat) + 17 future lots (approximate digitization). No parcel data is shipped;
  Town/County parcels are used only offline for alignment.
- `scripts/map-build-lots.py`: builds the GeoJSON. Section 8 lots from
  `scripts/map-cogo-sec8.py` (NAD27 NY West -> NAD83), shifted by a translation fitted to
  control points kept outside the repo (`--cp`); future lots from
  `scripts/map-data-src/scout-remaining-lots-approx.geojson`. `--report` prints the fit.
- `scripts/map-extract-plat.py`: notes/helper for the preliminary-plat PDF (a raster scan).

## Text keys

All visible map text is editable in /admin. Defaults are in `src/data/content.ts`:
`map.future.label`, `map.future.note`, `map.disclaimer`, `map.control.fit`,
`map.control.area`, `map.control.aerial`, `map.control.street`, `map.control.future`,
`map.loading`, `map.list.heading`, `map.label` (map accessible name), `map.error`,
`map.error.webgl`, `map.error.fallback`. Lot status text comes from `global.status.*`
(`LotStatusBadge` / `useLotStatusLabel`); lot details reuse the `home.sitemodel.panel.*` keys.
Lot links go to `/lots/$slug` (slug = lot number).
