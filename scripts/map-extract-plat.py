#!/usr/bin/env python3
"""Map handoff helper (Atlas). Extracts what is machine-readable from the
LaDieu preliminary plat PDF (/workspace/belmore/maps/full-development-map.pdf).

Findings (Oct 23 2026):
  - The PDF is NOT a vector drawing: page 1 is one 13168x10200 1-bit CCITT scan
    (300 dpi on a 3160x2448 pt = 43.9"x34" E-size sheet).
  - The only vector content is the red "REMAINING LOTS" outline (one stroked
    path, 14 segments, RGB 1,0,0, width 4) and the two words of its label.
  - Scale on the sheet: 1" = 100'  ->  1 PDF pt = 100/72 ft = 1.3889 ft,
    1 scan px (300 dpi) = 1/3 ft. Verify against a known plat dimension
    (e.g. lot 802 = 80.00 x 150.00 ft on the signed Section 8 plat) before
    trusting it: scans can be skewed / stretched.

Usage: python3 scripts/map-extract-plat.py <pdf> <out.json> [--crop out.png]
Needs: pip install pymupdf (use a venv; system pip is PEP 668-locked).
"""
import json, sys
import pymupdf

pdf, out = sys.argv[1], sys.argv[2]
doc = pymupdf.open(pdf)
page = doc[0]
FT_PER_PT = 100 / 72
paths = []
for d in page.get_drawings():
    pts = []
    for it in d["items"]:
        if it[0] == "l":
            a, b = it[1], it[2]
            if not pts:
                pts.append([a.x, a.y])
            pts.append([b.x, b.y])
    paths.append({"color": d.get("color"), "width": d.get("width"), "pdf_pts": pts,
                  # sheet feet, origin top-left of sheet, +y = south (sheet down)
                  "sheet_ft": [[x * FT_PER_PT, y * FT_PER_PT] for x, y in pts]})
words = [w[:5] for w in page.get_text("words")]
img = page.get_images()
json.dump({"source": pdf, "page_size_pt": [page.rect.width, page.rect.height],
           "scale": "1in=100ft; 1pt=1.3889ft", "images": [list(i[:4]) for i in img],
           "vector_paths": paths, "words": words}, open(out, "w"), indent=1)
print("paths", len(paths), "words", len(words))
if "--crop" in sys.argv:
    r = paths[0]
    xs = [p[0] for p in r["pdf_pts"]]; ys = [p[1] for p in r["pdf_pts"]]
    clip = pymupdf.Rect(min(xs) - 60, min(ys) - 60, max(xs) + 60, max(ys) + 60)
    page.get_pixmap(dpi=300, clip=clip).save(sys.argv[sys.argv.index("--crop") + 1])
    print("crop", clip)
