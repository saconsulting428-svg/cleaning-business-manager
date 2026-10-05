"""Read-Me.pdf instruction sheet (reportlab)."""
from reportlab.graphics.shapes import Circle, Drawing, Line, Path, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)

from geometry import FONT_SANS, FONT_SERIF, HANG_HOLE_D, HANG_SPACING
from preview import ttf

INK = colors.HexColor("#3A403A")
ACCENT = colors.HexColor("#8A6A45")
SOFT = colors.HexColor("#F3EEE6")


def _styles():
    pdfmetrics.registerFont(TTFont("Cinzel", ttf(FONT_SERIF)))
    pdfmetrics.registerFont(TTFont("Josefin", ttf(FONT_SANS)))
    st = {
        "title": ParagraphStyle("t", fontName="Cinzel", fontSize=22, leading=27, textColor=INK, alignment=TA_CENTER),
        "sub": ParagraphStyle("s", fontName="Helvetica", fontSize=10.5, leading=14, textColor=ACCENT,
                              alignment=TA_CENTER),
        "h": ParagraphStyle("h", fontName="Cinzel", fontSize=13.5, leading=17, textColor=INK, spaceBefore=10,
                            spaceAfter=4),
        "b": ParagraphStyle("b", fontName="Helvetica", fontSize=9.6, leading=13.2, textColor=colors.black,
                            spaceAfter=4),
        "small": ParagraphStyle("sm", fontName="Helvetica", fontSize=8.2, leading=11, textColor=colors.HexColor("#555555")),
        "note": ParagraphStyle("n", fontName="Helvetica", fontSize=9.4, leading=13, textColor=colors.black,
                               backColor=SOFT, borderPadding=7, spaceBefore=6, spaceAfter=10),
    }
    return st


def bullets(items, st):
    return [Paragraph(f"•&nbsp;&nbsp;{t}", ParagraphStyle("li", parent=st["b"], leftIndent=12,
                                                                firstLineIndent=-9)) for t in items]


def outline_drawing(p, max_w, max_h, label=True):
    w, h = p.size
    s = min(max_w / w, max_h / h)
    dw, dh = w * s, h * s + (12 if label else 0)
    d = Drawing(dw, dh)
    off = 12 if label else 0
    path = Path(fillColor=colors.HexColor("#D9BF98"), strokeColor=colors.HexColor("#C0392B"), strokeWidth=0.35,
                fillMode=0)  # even-odd
    for ring in p.cut_rings():
        pts = ring[:-1]
        path.moveTo(pts[0][0] * s, dh - pts[0][1] * s)
        for x, y in pts[1:]:
            path.lineTo(x * s, dh - y * s)
        path.closePath()
    d.add(path)
    for ring in p.score_rings():
        sp = Path(fillColor=None, strokeColor=colors.HexColor("#2E5BBA"), strokeWidth=0.3)
        pts = ring[:-1]
        sp.moveTo(pts[0][0] * s, dh - pts[0][1] * s)
        for x, y in pts[1:]:
            sp.lineTo(x * s, dh - y * s)
        sp.closePath()
        d.add(sp)
    if label:
        d.add(String(dw / 2, 1, f"{p.title.split(' (')[0]}  —  {w / 25.4:.2f} × {h / 25.4:.2f} in",
                     fontName="Helvetica", fontSize=7.5, textAnchor="middle", fillColor=INK))
    _ = off
    return d


def assembly_drawing(main, piece):
    """Main sign with a piece hanging from two jump rings, with the 4 in spacing called out."""
    s = 1.15
    gap = 12  # mm between sign bottom and piece top
    W = main.size[0] * s + 40
    top_off = 10
    total_h = (main.size[1] + gap + piece.size[1]) * s + 40
    d = Drawing(W, total_h)
    ox = 20

    def add(p, oy):
        path = Path(fillColor=colors.HexColor("#E7D5B8"), strokeColor=colors.HexColor("#C0392B"),
                    strokeWidth=0.35, fillMode=0)
        for ring in p.cut_rings():
            pts = ring[:-1]
            path.moveTo(ox + pts[0][0] * s + (main.size[0] - p.size[0]) * s / 2, total_h - top_off - (oy + pts[0][1]) * s)
            for x, y in pts[1:]:
                path.lineTo(ox + x * s + (main.size[0] - p.size[0]) * s / 2, total_h - top_off - (oy + y) * s)
            path.closePath()
        d.add(path)

    add(main, 0)
    oy = main.size[1] + gap
    add(piece, oy)
    for (ax, ay), (bx, by) in zip(main.hang_holes, piece.hang_holes):
        bx += (main.size[0] - piece.size[0]) / 2
        x1, y1 = ox + ax * s, total_h - top_off - ay * s
        x2, y2 = ox + bx * s, total_h - top_off - (oy + by) * s
        d.add(Line(x1, y1, x2, y2, strokeColor=colors.HexColor("#8A6A45"), strokeWidth=1.2))
        d.add(Circle(x1, y1 - 5, 5, fillColor=None, strokeColor=colors.grey, strokeWidth=1.2))
        d.add(Circle(x2, y2 + 5, 5, fillColor=None, strokeColor=colors.grey, strokeWidth=1.2))
    # dimension: hole spacing (drawn under the piece)
    (ax, ay), (bx, _) = main.hang_holes
    yb = 14
    blue = colors.HexColor("#2E5BBA")
    for x in (ax, bx):
        d.add(Line(ox + x * s, yb - 4, ox + x * s, yb + 4, strokeColor=blue, strokeWidth=0.6))
    d.add(Line(ox + ax * s, yb, ox + bx * s, yb, strokeColor=blue, strokeWidth=0.6))
    d.add(String(ox + (ax + bx) / 2 * s, 2, f"hanging holes {HANG_SPACING / 25.4:.0f} in ({HANG_SPACING:.1f} mm) apart on every part",
                 fontName="Helvetica", fontSize=8, textAnchor="middle", fillColor=blue))
    yl = total_h - top_off - (main.size[1] + gap / 2) * s
    d.add(String(ox + bx * s + 12, yl - 3, "\u2190 short chain or twine", fontName="Helvetica", fontSize=8,
                 fillColor=INK))
    return d


def _page(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#777777"))
    canvas.drawString(0.6 * inch, 0.45 * inch, "Interchangeable Welcome Home Sign – Laser Cut SVG Bundle")
    canvas.drawRightString(letter[0] - 0.6 * inch, 0.45 * inch, f"Page {doc.page}")
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(0.6)
    canvas.line(0.6 * inch, 0.6 * inch, letter[0] - 0.6 * inch, 0.6 * inch)
    canvas.restoreState()


def build(parts, out_path, preview_png):
    st = _styles()
    by = {p.name: p for p in parts}
    main = by["Main-Welcome-Sign"]
    pieces = [p for p in parts if p is not main]
    doc = SimpleDocTemplate(out_path, pagesize=letter, leftMargin=0.65 * inch, rightMargin=0.65 * inch,
                            topMargin=0.6 * inch, bottomMargin=0.8 * inch,
                            title="Interchangeable Welcome Home Sign - Read Me", author="Read-Me")
    E = []
    E += [Paragraph("Interchangeable Welcome Home Sign", st["title"]),
          Paragraph("Laser Cut SVG / DXF Bundle — Instructions, Dimensions &amp; License", st["sub"]),
          Spacer(1, 10)]
    img_w = 7.1 * inch
    import os
    from PIL import Image as PILImage
    jpg = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache", "preview-pdf.jpg")
    im = PILImage.open(preview_png).convert("RGB")
    im.thumbnail((2100, 2100))
    im.save(jpg, quality=85)
    E.append(Image(jpg, width=img_w, height=img_w * 2250 / 3000))
    E.append(Spacer(1, 6))
    E.append(Paragraph("Thank you for your purchase! This is a <b>digital download</b>. No physical item is shipped. "
                       "Please read this sheet once before your first cut — a quick test cut saves material.",
                       st["note"]))

    E.append(Paragraph("1. What Is Included", st["h"]))
    rows = [["Folder", "Contents"],
            ["SVG/", "9 files — Main-Welcome-Sign.svg + 8 interchangeable pieces (real-world size, mm units)"],
            ["DXF/", "9 matching DXF files (millimetres, closed polylines, layers CUT and SCORE_OPTIONAL)"],
            ["PNG/", "Product-Preview.png (finished-look reference image, not a cutting file)"],
            ["Instructions/", "Read-Me.pdf (this document)"]]
    E.append(_table(rows, [1.2 * inch, 6.0 * inch]))
    E.append(Spacer(1, 6))
    E.append(Paragraph("Interchangeable pieces: WELCOME, HOME, FAMILY, GATHER, HELLO, FARM, OUR HOME and "
                       "LOVE GROWS HERE. Every piece uses the same hanging-hole spacing, so any piece fits the main "
                       "sign.", st["b"]))
    E.append(PageBreak())

    E.append(Paragraph("2. Recommended Materials", st["h"]))
    E += bullets([
        "<b>1/8 in (approx. 3 mm) plywood</b> such as Baltic birch — recommended for the warmest farmhouse look.",
        "<b>1/8 in (approx. 3 mm) MDF</b> — smooth and easy to paint; seal it if it will be near moisture.",
        "<b>3 mm cast acrylic</b> — crisp edges; handle the stencil bridges gently while peeling masking.",
        "The smallest material web in the design is about 2.2 mm (0.09 in), at the stencil bridges and the gaps "
        "between letters. The files were checked for this but not tested on every material and machine, so do a "
        "test cut first. Thinner veneers (under 3 mm) may be too fragile at the bridges.",
        "These signs are designed for indoor or covered-porch decor. For outdoor use, choose an exterior-rated "
        "material and finish, and check your material supplier's guidance.",
    ], st)

    E.append(Paragraph("3. Supported File Formats", st["h"]))
    E += bullets([
        "<b>SVG</b> — LightBurn, xTool Creative Space, Glowforge app, Cricut Design Space, Inkscape, Adobe "
        "Illustrator, Affinity Designer, Silhouette Studio (SVG import needs Designer Edition or higher).",
        "<b>DXF</b> — LightBurn, RDWorks, LaserGRBL, CAD programs and Silhouette Studio (basic edition).",
        "Line colours: <font color='#C0392B'><b>RED = CUT</b></font> (through-cut), "
        "<font color='#2E5BBA'><b>BLUE = optional SCORE</b></font> (a light decorative border line — do "
        "<u>not</u> cut it through, or simply delete/hide it).",
        "All text has already been converted to outlines, so you do not need any fonts installed. Files contain "
        "only vector paths: no embedded images, no clipping masks, no open paths.",
    ], st)

    E.append(Paragraph("4. Importing the Files", st["h"]))
    E += bullets([
        "<b>LightBurn:</b> File › Import (or drag in). Red and blue appear as two layers. Set the red layer to "
        "Line/cut, set the blue layer to a light Line pass (score) or switch its Output off.",
        "<b>xTool Creative Space:</b> drag the SVG onto the canvas; select the blue border and set it to Score, "
        "or delete it; set the rest to Cut.",
        "<b>Glowforge:</b> upload the SVG. Cut and Score steps are created by colour; set the blue step to Score "
        "or Ignore.",
        "<b>Cricut Design Space:</b> Upload › Browse › choose SVG. The sign uploads as one piece with holes. The "
        "blue border uploads as a separate layer: hide it, or change its operation to Score/Draw. Check the "
        "maximum material size and cutting capability of your machine before choosing a sign size.",
        "<b>Silhouette Studio:</b> open the DXF (or SVG in Designer Edition and up).",
    ], st)

    E.append(Paragraph("5. Checking &amp; Changing the Size", st["h"]))
    E += bullets([
        f"After import, the main sign should measure <b>12.00 × 8.00 in (304.8 × 203.2 mm)</b>. "
        "If it does not, your software has guessed the wrong units or DPI: type the width in manually, with "
        "proportions locked.",
        "DXF files are in <b>millimetres</b>. If a DXF imports 25.4× too large or too small, re-import it with "
        "units set to mm.",
        f"<b>Keep everything at the same scale.</b> If you scale the main sign by a percentage, scale every piece "
        f"by the same percentage so the {HANG_SPACING / 25.4:.0f} in hanging-hole spacing still lines up.",
        "Scaling <b>down</b> makes bridges and letter gaps thinner. We do not recommend going below about 90% "
        "unless you test-cut first. Scaling up is fine.",
        "Do not “weld”, “union” or “offset” the shapes — they are already "
        "prepared for cutting.",
    ], st)

    E.append(Paragraph("6. Cutting", st["h"]))
    E += bullets([
        "Run a small test cut (for example, a single piece) on your material to dial in power, speed and passes.",
        "Cut inner shapes before the outer outline (most laser software has a “cut inner shapes first” "
        "option) so the piece does not shift before the letters are finished.",
        "Use masking tape or transfer tape on wood to reduce smoke marks; on acrylic, leave the protective film on "
        "during cutting.",
        "Let the piece cool and lift it out carefully. Push the letter centres out gently from the back; the "
        "stencil bridges keep the inside of letters like O, A and R attached on purpose.",
        "Optional finishing: sand lightly, then paint, stain or seal. The cut-out letters look great over a "
        "contrasting wall or a painted backer board.",
    ], st)
    E.append(KeepTogether([
        Paragraph("Important: Laser Settings, Kerf &amp; Fit", st["h"]),
        Paragraph("Every laser, blade, lens, and material batch behaves differently. These files were prepared and "
                  "checked carefully, but <b>no specific power, speed or pass settings are provided or guaranteed</b>. "
                  "Use your machine manufacturer's material settings as a starting point and always test first. "
                  "The laser beam removes a small amount of material (kerf, typically around 0.1–0.2 mm), so "
                  "holes come out slightly larger and parts slightly smaller than the drawing. This design does "
                  "not rely on tight press-fit joints, so no kerf compensation is needed for assembly. "
                  "Always supervise your laser while it runs, and follow your machine's safety instructions.",
                  st["note"])]))

    E.append(Paragraph("7. Assembly", st["h"]))
    E.append(Paragraph(
        f"The main sign has two <b>{HANG_HOLE_D:.0f} mm (about 3/16 in)</b> accessory holes near its bottom edge, "
        f"spaced <b>{HANG_SPACING / 25.4:.0f} in ({HANG_SPACING:.1f} mm) apart</b> centre-to-centre. Every interchangeable "
        "piece has two matching holes along its top. Link them with any simple connector and swap pieces in "
        "seconds:", st["b"]))
    E += bullets([
        "Two short lengths of <b>light chain</b> (about 1.5–2 in / 40–50 mm) with a <b>jump ring</b> at each "
        "end, or small <b>S-hooks</b> linked through jump rings, for a tidy metal hang, or",
        "<b>jute twine or ribbon</b> tied through each pair of holes for a soft rustic hang.",
        "The holes sit about 3/4 in (17 mm) above the bottom edge of the main sign and about 0.4–1.4 in (10–36 mm, "
        "see Dimensions) below the top of each piece. Allow roughly 1.5–2 in of link between hole centres so there is a small "
        "gap between the two boards. A single small jump ring is too short to span this.",
        "Hang the main sign using the two upper corner holes (twine or wire to a nail), or use your own "
        "picture-hanging hardware or a small easel.",
        "To swap: open the rings (or untie the twine), remove the piece, hang the next one.",
    ], st)
    E.append(Spacer(1, 8))
    E.append(KeepTogether([assembly_drawing(main, by["Family"])]))

    E.append(PageBreak())
    E.append(Paragraph("8. Dimensions", st["h"]))
    E.append(Paragraph("Overall outside dimensions as drawn (before kerf). Width × height.", st["b"]))
    rows = [["File", "Inches (W × H)", "Millimetres (W × H)", "Hanging holes (Ø5 mm, 4 in apart)"]]
    for p in parts:
        w, h = p.size
        hy = p.hang_holes[0][1]
        if p is main:
            holes = (f"2 wall-hanging holes in the top corners + 2 holes {(h - hy) / 25.4:.2f} in / "
                     f"{h - hy:.1f} mm above the bottom edge")
        else:
            holes = f"2 holes {hy / 25.4:.2f} in / {hy:.1f} mm below the top edge"
        rows.append([p.name + ".svg / .dxf", f"{w / 25.4:.2f} × {h / 25.4:.2f} in", f"{w:.1f} × {h:.1f} mm",
                     Paragraph(holes, ParagraphStyle("c", fontName="Helvetica", fontSize=8, leading=10))])
    E.append(_table(rows, [1.95 * inch, 1.25 * inch, 1.45 * inch, 2.55 * inch]))
    E.append(Spacer(1, 6))
    rows = [["Feature", "Inches", "Millimetres"],
            ["Hanging / accessory hole diameter", f"{HANG_HOLE_D / 25.4:.3f} in (about 3/16 in)", f"{HANG_HOLE_D:.1f} mm"],
            ["Hole spacing, centre to centre (all parts)", f"{HANG_SPACING / 25.4:.2f} in", f"{HANG_SPACING:.1f} mm"],
            ["Designed material thickness", "1/8 in", "3 mm"],
            ["Smallest material web (bridges / letter gaps)", "approx. 0.09 in", "approx. 2.2 mm"],
            ["Optional score border inset (main / pieces)", "0.20 in / 0.16 in", "5 mm / 4 mm"]]
    E.append(_table(rows, [3.2 * inch, 2.0 * inch, 2.0 * inch]))
    E.append(PageBreak())
    E.append(Paragraph("Measurement reference (shown at reduced scale)", st["h"]))
    cells = [outline_drawing(p, 3.3 * inch, 1.75 * inch) for p in pieces]
    grid = [cells[i:i + 2] for i in range(0, len(cells), 2)]
    t = Table(grid, colWidths=[3.6 * inch, 3.6 * inch])
    t.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    E.append(t)

    E.append(PageBreak())
    E.append(Paragraph("9. License — Personal &amp; Small-Batch Commercial Use", st["h"]))
    E.append(Paragraph("By downloading these files you agree to the following terms.", st["b"]))
    E.append(Paragraph("<b>You MAY:</b>", st["b"]))
    E += bullets([
        "Use the files for unlimited personal projects.",
        "Make and sell <b>physical finished products</b> cut from these files (for example, at craft fairs or "
        "in your own shop) in small quantities — up to 200 finished items per purchase. For larger "
        "production runs, please contact the shop for an extended license.",
        "Modify the designs for your own physical projects (resize, paint, combine with your own artwork).",
    ], st)
    E.append(Paragraph("<b>You may NOT:</b>", st["b"]))
    E += bullets([
        "Resell, share, give away, or redistribute the digital files (SVG, DXF, PNG, PDF) in any form, "
        "whether original or modified.",
        "Upload the files, or any digital version derived from them, to any other marketplace, website, cut-file "
        "library, shared drive or print-on-demand service.",
        "Claim the design as your own or remove the designer's credit when sharing photos of the digital design.",
        "Share the original SVG/DXF files with customers, friends or groups. Each person who needs the files "
        "should purchase their own copy.",
    ], st)
    E.append(Paragraph(
        "All rights to the digital design remain with the designer. This license is non-exclusive and "
        "non-transferable. The files are provided “as is”. Cutting results depend on your equipment, "
        "settings and material, and the designer is not responsible for material waste, machine damage or injury. "
        "Use laser and cutting equipment safely and according to its manufacturer's instructions.", st["b"]))
    E.append(Paragraph("Credits", st["h"]))
    E.append(Paragraph(
        "Lettering was created from the typefaces Cinzel (© The Cinzel Project Authors) and Josefin Sans "
        "(© The Josefin Sans Project Authors), both licensed under the SIL Open Font License 1.1, and was converted to "
        "outlines and modified with stencil bridges for cutting. No font software is included in this bundle.",
        st["small"]))
    E.append(Spacer(1, 14))
    E.append(Paragraph("Questions? Please message the shop through Etsy. Happy making!", st["sub"]))
    doc.build(E, onFirstPage=_page, onLaterPages=_page)


def _table(rows, widths):
    t = Table(rows, colWidths=widths)
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.6),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#CCC4B8")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t
