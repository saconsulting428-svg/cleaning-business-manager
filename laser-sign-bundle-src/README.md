# Source for the Interchangeable Welcome Home Sign bundle

Generates `../Interchangeable-Welcome-Home-Sign-Bundle/` (SVG, DXF, PNG preview, PDF guide) and the
matching `.zip` for Etsy upload.

```
pip install fonttools shapely ezdxf reportlab pillow numpy
python3 build.py      # builds everything, runs manufacturability QC, writes qc-report.json
python3 proof.py out  # optional quick proof images per part
```

- `geometry.py` – text-to-outline conversion, stencil bridges, leaf/window ornaments, part model
- `designs.py` – main sign + 8 interchangeable pieces (all units mm)
- `qc.py` – checks: single piece (no loose islands), closed simple contours, min 2.2 mm webs,
  score-line clearance, sizes
- `build.py` – writes SVG/DXF, re-reads and verifies them, builds preview + PDF + zip

Fonts (`fonts/`) are Cinzel and Josefin Sans, SIL Open Font License 1.1 (licenses included).
Only outlines derived from them ship in the bundle, not the font files.
