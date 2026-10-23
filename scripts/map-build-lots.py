"""Build public/map-data/belmore-lots.geojson (WGS84) for the interactive lot map.

Lots 801-807: COGO from the signed Section 8 plat (scripts/map-cogo-sec8.py, NAD27 NY West),
NAD27 -> NAD83 (EPSG:2262) with pyproj/NADCON, then a translation fitted to shared corners in the
Town of Greece parcel fabric (control-points CSV passed with --cp, kept outside the repo; rows with use=fit).
Future lots: Scout's digitization of the LaDieu preliminary plat (approximate, +/-10-20 ft),
clipped so they never overlap the Section 8 lots. Preliminary-plat lot numbers are kept only as
reference properties (prelim_ref_*) and are NOT lot numbers.

Usage: python scripts/map-build-lots.py [--cp control-points-input.csv] [--report report.json] [--full internal-lots.geojson]
Needs: pyproj, shapely (pip install pyproj shapely).
"""
import csv, json, math, os, sys
from pyproj import Transformer
import shapely.geometry as sg
from shapely.ops import unary_union, transform as shp_transform

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import importlib.util
spec = importlib.util.spec_from_file_location("cogo", os.path.join(HERE, "map-cogo-sec8.py"))
cogo = importlib.util.module_from_spec(spec); spec.loader.exec_module(cogo)

T27 = Transformer.from_crs(32017, 2262, always_xy=True)
TW = Transformer.from_crs(2262, 4326, always_xy=True)
TWi = Transformer.from_crs(4326, 2262, always_xy=True)

lots83 = {k: [T27.transform(*p) for p in v] for k, v in cogo.lots.items()}
pts83 = {k: T27.transform(*v) for k, v in cogo.pts.items()}
plat_pt = {"804_NW": lots83["804"][1], "804_NE": lots83["804"][0], "805_NW": lots83["805"][1],
           "805_NE": lots83["805"][0], "801_NW": pts83["801_NW"], "802_SW": lots83["802"][2],
           "801_SW": pts83["801_SW"], "807_SW": pts83["807_SW_on_curve"], "807_SE": pts83["B_807SE"]}
# Control points hold Town of Greece parcel-vertex coordinates. They are kept OUT of the repo
# and out of public/ (Town/County data is used only internally for alignment).
CP_PATH = sys.argv[sys.argv.index("--cp") + 1] if "--cp" in sys.argv else "/workspace/belmore/map-data/control-points-input.csv"
cps = list(csv.DictReader(open(CP_PATH)))
fit = [c for c in cps if c["use"] == "fit"]
dE = sum(float(c["county_e_ft"]) - plat_pt[c["id"]][0] for c in fit) / len(fit)
dN = sum(float(c["county_n_ft"]) - plat_pt[c["id"]][1] for c in fit) / len(fit)
shift = lambda p: (p[0] + dE, p[1] + dN)
rows = []
for c in cps:
    s = plat_pt[c["id"]]; f = shift(s); q = (float(c["county_e_ft"]), float(c["county_n_ft"]))
    rows.append({**c, "plat_nad83_e_ft": round(s[0], 2), "plat_nad83_n_ft": round(s[1], 2),
                 "fitted_e_ft": round(f[0], 2), "fitted_n_ft": round(f[1], 2),
                 "raw_offset_ft": round(math.dist(s, q), 2), "residual_ft": round(math.dist(f, q), 2)})
res_fit = [r["residual_ft"] for r in rows if r["use"] == "fit"]
rms = math.sqrt(sum(x * x for x in res_fit) / len(res_fit))

plat = {r["lot"]: r for r in csv.DictReader(open(os.path.join(HERE, "map-data-src/plat-lots.csv")))}
STREET = {"801": "Belmore Way", "802": "Belmore Way", "803": "Belmore Way", "804": "Belmore Way",
          "805": "Belmore Way", "806": "Belmore Way", "807": "Belmore Way"}
def to_wgs(ring):
    out = [[round(x, 7), round(y, 7)] for x, y in (TW.transform(*p) for p in ring)]
    if out[0] != out[-1]: out.append(out[0])
    return out

feats = []; sec8 = []
for lot in ["801", "802", "803", "804", "805", "806", "807"]:
    ring = [shift(p) for p in lots83[lot]]
    sec8.append(sg.Polygon(ring))
    pr = plat[lot]
    feats.append({"type": "Feature", "id": lot, "geometry": {"type": "Polygon", "coordinates": [to_wgs(ring)]},
        "properties": {"lot": lot, "kind": "phase1", "section": 8, "phase": 1,
            "area_sqft": int(pr["area_sqft"]), "area_acres": float(pr["area_acres"]),
            "address": f'{pr["proposed_address_number"]} {STREET[lot]}', "street": STREET[lot],
            "corner_of": "Shelby Circle" if lot in ("806", "807") else None,
            "geometry_source": "Signed Final Plat Section No. 8 (LandTech, 2023), COGO from bearings/distances",
            "accuracy_ft": round(rms, 1), "flags": []}})
sec8u = unary_union(sec8).buffer(0.5)

scout = json.load(open(os.path.join(HERE, "map-data-src/scout-remaining-lots-approx.geojson")))
fut = []
for f in scout["features"]:
    p = f["properties"]
    if p.get("sec8_lot"): continue
    g = shp_transform(lambda x, y, z=None: TWi.transform(x, y), sg.shape(f["geometry"]))  # noqa
    clipped = g.difference(sec8u)
    if clipped.geom_type == "MultiPolygon": clipped = max(clipped.geoms, key=lambda q: q.area)
    fut.append((clipped, p, g.area - clipped.area))
# neutral ids, ordered north->south then west->east by centroid; NOT lot numbers
fut.sort(key=lambda t: (-round(t[0].centroid.y / 60), t[0].centroid.x))
for i, (g, p, cut) in enumerate(fut, 1):
    flags = ["preliminary layout, subject to change", "no lot number assigned (do not display preliminary-plat numbers)"]
    if cut > 50: flags.append(f"clipped {cut:.0f} sq ft overlapping Section 8 lots (preliminary vs signed plat)")
    feats.append({"type": "Feature", "id": f"future-{i:02d}", "geometry": {"type": "Polygon",
        "coordinates": [to_wgs(list(g.exterior.coords)[:-1])]},
        "properties": {"lot": None, "kind": "future", "section": None, "phase": "future",
            "label": "Future phase (planned, details TBD)", "area_sqft_approx": int(round(g.area, -1)),
            "address": None, "street": p.get("street"),
            "prelim_ref_lot": p.get("plat_lot"), "prelim_ref_address": p.get("address_label_prelim_plat"),
            "geometry_source": "LaDieu Associates preliminary plat (full-development-map.pdf), digitized by Scout (affine, RMS ~7 ft)",
            "accuracy_ft": "10-20 (approximate)", "flags": flags}})

streets = json.load(open(os.path.join(HERE, "map-data-src/scout-planned-streets-approx.geojson")))
for f in streets["features"]:
    if f["geometry"]["type"] != "LineString": continue
    feats.append({"type": "Feature", "geometry": f["geometry"],
        "properties": {"kind": "street", "name": f["properties"]["name"], "status": f["properties"].get("status"),
                       "accuracy": "approximate, from preliminary plat"}})

out = {"type": "FeatureCollection", "name": "belmore-lots",
       "attribution": "Lot lines: Legends West Section 8 signed plat (LandTech) and LaDieu preliminary plat; georeferenced by Atlas. Not a survey.",
       "fit": {"method": "NAD27 NY West -> NAD83 (NADCON via PROJ) -> translation fit to Town of Greece parcel corners",
               "dE_ft": round(dE, 2), "dN_ft": round(dN, 2), "rms_ft": round(rms, 2), "n_control": len(fit)},
       "features": feats}
root = os.path.dirname(HERE)
os.makedirs(os.path.join(root, "public/map-data"), exist_ok=True)
# Public file: preliminary-plat numbers/addresses are stripped (never displayed or shipped).
pub = {**out, "features": [{**f, "properties": {k: v for k, v in f["properties"].items() if not k.startswith("prelim_ref_")}} for f in feats]}
json.dump(pub, open(os.path.join(root, "public/map-data/belmore-lots.geojson"), "w"), separators=(",", ":"))
if "--full" in sys.argv:  # internal copy with reference-only preliminary numbers
    json.dump(out, open(sys.argv[sys.argv.index("--full") + 1], "w"), indent=1)
if "--report" in sys.argv:
    json.dump({"rows": rows, "rms": rms, "dE": dE, "dN": dN, "future": len(fut)}, open(sys.argv[sys.argv.index("--report") + 1], "w"), indent=1)
print(f"fit dE={dE:.2f} dN={dN:.2f} RMS={rms:.2f} ft over {len(fit)} pts; future lots={len(fut)}")
for r in rows: print(f'  {r["id"]:7s} raw={r["raw_offset_ft"]:6.2f}  residual={r["residual_ft"]:6.2f}  {r["use"]}')
