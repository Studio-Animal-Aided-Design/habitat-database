from __future__ import annotations

from pathlib import Path
import html
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import BaseDocTemplate, Flowable, Frame, Image, PageBreak, PageTemplate, Paragraph, Preformatted, Spacer
from reportlab.platypus import Table, TableStyle
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs" / "converter"
SOURCE_MD = DOCS_DIR / "AAD-Converter-Handbuch.md"
OUTPUT_PDF = DOCS_DIR / "AAD-Converter-Handbuch.pdf"
LOGO = ROOT / "assets" / "aad-icon-large.png"


class MermaidFlowchart(Flowable):
    def __init__(self, labels: list[str], width: float):
        super().__init__()
        self.labels = labels
        self.width = width
        self.box_width = min(13.5 * cm, width - 1.0 * cm)
        self.base_box_height = 3.0 * cm
        self.base_arrow_gap = 0.8 * cm
        self.box_height = self.base_box_height
        self.arrow_gap = self.base_arrow_gap
        self.height = self._calc_height()

    def _calc_height(self):
        return len(self.labels) * self.box_height + max(0, len(self.labels) - 1) * self.arrow_gap + 0.3 * cm

    def wrap(self, availWidth, availHeight):
        self.width = min(self.width, availWidth)
        self.box_width = min(13.5 * cm, self.width - 1.0 * cm)
        self.box_height = self.base_box_height
        self.arrow_gap = self.base_arrow_gap
        needed_height = self._calc_height()
        if availHeight > 0 and needed_height > availHeight:
            target_height = max(availHeight - 0.35 * cm, availHeight * 0.96)
            scale = target_height / needed_height
            scale = max(0.52, min(1.0, scale))
            self.box_height = self.base_box_height * scale
            self.arrow_gap = self.base_arrow_gap * scale
            needed_height = self._calc_height()
        self.height = needed_height
        return self.width, self.height

    def draw(self):
        canv = self.canv
        x = (self.width - self.box_width) / 2
        y = self.height - self.box_height

        for idx, label in enumerate(self.labels):
            canv.setFillColor(colors.HexColor("#eef7f4"))
            canv.setStrokeColor(colors.HexColor("#1d8f6b"))
            canv.setLineWidth(1.0)
            canv.roundRect(x, y, self.box_width, self.box_height, 10, stroke=1, fill=1)

            lines = [part.strip() for part in label.split("\n") if part.strip()]
            title = lines[0] if lines else ""
            details = lines[1:]

            title_offset = min(0.55 * cm, self.box_height * 0.2)
            detail_step = min(0.39 * cm, self.box_height * 0.13)
            text_y = y + self.box_height - title_offset
            canv.setFillColor(colors.HexColor("#16382f"))
            canv.setFont("Helvetica-Bold", 11)
            canv.drawCentredString(x + self.box_width / 2, text_y, title)

            canv.setFont("Helvetica", 8.4)
            for detail in details[:5]:
                text_y -= detail_step
                canv.drawCentredString(x + self.box_width / 2, text_y, detail)

            if idx < len(self.labels) - 1:
                arrow_x = x + self.box_width / 2
                start_y = y - 0.08 * cm
                end_y = y - self.arrow_gap + 0.18 * cm
                canv.setStrokeColor(colors.HexColor("#1d8f6b"))
                canv.setLineWidth(1.1)
                canv.line(arrow_x, start_y, arrow_x, end_y)
                canv.line(arrow_x, end_y, arrow_x - 0.15 * cm, end_y + 0.15 * cm)
                canv.line(arrow_x, end_y, arrow_x + 0.15 * cm, end_y + 0.15 * cm)

            y -= self.box_height + self.arrow_gap


def make_code_block(text: str):
    return Preformatted(
        text,
        ParagraphStyle(
            "CodeAAD",
            fontName="Courier",
            fontSize=8.5,
            leading=11,
            backColor=colors.HexColor("#f2f4f7"),
            borderPadding=6,
            borderColor=colors.HexColor("#d0d7de"),
            borderWidth=0.5,
            borderRadius=4,
            spaceAfter=8,
        ),
    )


def _is_table_row(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith("|") and stripped.endswith("|") and "|" in stripped[1:-1]


def _is_table_delimiter(line: str) -> bool:
    if not _is_table_row(line):
        return False
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    return all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells)


def _split_table_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def make_markdown_table(table_lines: list[str], styles):
    rows = [_split_table_row(line) for line in table_lines]
    header = rows[0]
    body = rows[2:]
    data = [[Paragraph(f"<b>{fmt_inline(cell)}</b>", styles["TableCellAAD"]) for cell in header]]
    for row in body:
        padded = row + [""] * (len(header) - len(row))
        data.append([Paragraph(fmt_inline(cell), styles["TableCellAAD"]) for cell in padded[: len(header)]])

    table = Table(data, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dff1eb")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#16382f")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cdd6dd")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fbfa")]),
            ]
        )
    )
    return table


def make_markdown_image(image_ref: str, available_width: float):
    image_path = (SOURCE_MD.parent / image_ref).resolve()
    if not image_path.exists():
        return Paragraph(f"Fehlendes Bild: {fmt_inline(image_ref)}", getSampleStyleSheet()["BodyText"])

    img = Image(str(image_path))
    max_width = min(available_width, 15.5 * cm)
    max_height = 10.5 * cm
    scale = min(max_width / img.imageWidth, max_height / img.imageHeight, 1.0)
    img.drawWidth = img.imageWidth * scale
    img.drawHeight = img.imageHeight * scale
    img.hAlign = "LEFT"
    return img


def parse_mermaid_flowchart(code_lines: list[str], available_width: float):
    labels: list[str] = []
    pattern = re.compile(r'\b\w+\["(.+?)"\]')
    for line in code_lines:
        for match in pattern.findall(line):
            labels.append(html.unescape(match.replace("<br/>", "\n").replace("<br>", "\n")))
    if not labels:
        return make_code_block("\n".join(code_lines))
    return MermaidFlowchart(labels, available_width)


class ConverterDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str, **kwargs):
        super().__init__(filename, **kwargs)
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=add_page_number)])

    def afterFlowable(self, flowable) -> None:
        level = getattr(flowable, "_headingLevel", None)
        key = getattr(flowable, "_bookmarkName", None)
        if level is None or key is None:
            return

        text = flowable.getPlainText()
        self.canv.bookmarkPage(key)
        self.canv.addOutlineEntry(text, key, level=level, closed=False)
        self.notify("TOCEntry", (level, text, self.page, key))


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="TitleCenter",
            parent=styles["Title"],
            alignment=TA_CENTER,
            fontSize=22,
            leading=26,
            spaceAfter=18,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyAAD",
            parent=styles["BodyText"],
            fontSize=10.5,
            leading=14,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BulletAAD",
            parent=styles["BodyText"],
            fontSize=10.5,
            leading=14,
            leftIndent=14,
            firstLineIndent=-8,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="H1AAD",
            parent=styles["Heading1"],
            fontSize=17,
            leading=21,
            textColor=colors.HexColor("#1d3b32"),
            spaceBefore=10,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="H2AAD",
            parent=styles["Heading2"],
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#1d3b32"),
            spaceBefore=8,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="H3AAD",
            parent=styles["Heading3"],
            fontSize=11.5,
            leading=15,
            textColor=colors.HexColor("#24483d"),
            spaceBefore=7,
            spaceAfter=5,
        )
    )
    styles.add(
        ParagraphStyle(
            name="H4AAD",
            parent=styles["Heading4"],
            fontSize=10.5,
            leading=14,
            textColor=colors.HexColor("#35594e"),
            spaceBefore=6,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TOCHeaderAAD",
            parent=styles["Heading1"],
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#1d3b32"),
            spaceBefore=8,
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TOCLevel1AAD",
            parent=styles["BodyText"],
            fontSize=10.5,
            leading=14,
            leftIndent=8,
            firstLineIndent=0,
            spaceBefore=2,
            spaceAfter=2,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TOCLevel2AAD",
            parent=styles["BodyText"],
            fontSize=9.5,
            leading=12,
            leftIndent=20,
            firstLineIndent=0,
            textColor=colors.HexColor("#4b5563"),
            spaceBefore=1,
            spaceAfter=1,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TOCLevel3AAD",
            parent=styles["BodyText"],
            fontSize=8.8,
            leading=11,
            leftIndent=32,
            firstLineIndent=0,
            textColor=colors.HexColor("#5b6570"),
            spaceBefore=1,
            spaceAfter=1,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableCellAAD",
            parent=styles["BodyText"],
            fontSize=9.0,
            leading=11,
            spaceAfter=0,
        )
    )
    return styles


def fmt_inline(text: str) -> str:
    escaped = html.escape(text)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', escaped)
    return escaped


def parse_markdown(lines: list[str], styles) -> list:
    story = []
    in_code = False
    code_lines: list[str] = []
    code_lang = ""
    heading_seq = 0
    diagram_width = A4[0] - 3.6 * cm
    idx = 0

    while idx < len(lines):
        raw = lines[idx]
        line = raw.rstrip("\n")

        if line.strip().startswith("```"):
            if in_code:
                if code_lang == "mermaid":
                    story.append(parse_mermaid_flowchart(code_lines, diagram_width))
                    story.append(Spacer(1, 0.2 * cm))
                else:
                    story.append(make_code_block("\n".join(code_lines)))
                code_lines = []
                code_lang = ""
                in_code = False
            else:
                in_code = True
                code_lang = line.strip()[3:].strip().lower()
            idx += 1
            continue

        if in_code:
            code_lines.append(line)
            idx += 1
            continue

        stripped = line.strip()
        if not stripped:
            story.append(Spacer(1, 0.16 * cm))
            idx += 1
            continue

        if _is_table_row(line) and idx + 1 < len(lines) and _is_table_delimiter(lines[idx + 1]):
            table_lines = [line, lines[idx + 1].rstrip("\n")]
            idx += 2
            while idx < len(lines) and _is_table_row(lines[idx]):
                table_lines.append(lines[idx].rstrip("\n"))
                idx += 1
            story.append(make_markdown_table(table_lines, styles))
            story.append(Spacer(1, 0.18 * cm))
            continue

        image_match = re.match(r"^!\[[^\]]*\]\((.+)\)$", stripped)
        if image_match:
            story.append(make_markdown_image(image_match.group(1).strip(), diagram_width))
            story.append(Spacer(1, 0.18 * cm))
            idx += 1
            continue

        if stripped.startswith("# "):
            heading_seq += 1
            para = Paragraph(fmt_inline(stripped[2:]), styles["H1AAD"])
            para._bookmarkName = f"heading-{heading_seq}"
            para._headingLevel = 0
            story.append(para)
            idx += 1
            continue
        if stripped.startswith("## "):
            heading_seq += 1
            para = Paragraph(fmt_inline(stripped[3:]), styles["H2AAD"])
            para._bookmarkName = f"heading-{heading_seq}"
            para._headingLevel = 1
            story.append(para)
            idx += 1
            continue
        if stripped.startswith("### "):
            heading_seq += 1
            para = Paragraph(fmt_inline(stripped[4:]), styles["H3AAD"])
            para._bookmarkName = f"heading-{heading_seq}"
            para._headingLevel = 2
            story.append(para)
            idx += 1
            continue
        if stripped.startswith("#### "):
            heading_seq += 1
            para = Paragraph(fmt_inline(stripped[5:]), styles["H4AAD"])
            para._bookmarkName = f"heading-{heading_seq}"
            para._headingLevel = 2
            story.append(para)
            idx += 1
            continue
        if re.match(r"^\d+\.\s+", stripped):
            story.append(Paragraph(fmt_inline(stripped), styles["BulletAAD"]))
            idx += 1
            continue
        if stripped.startswith("- "):
            story.append(Paragraph("&bull; " + fmt_inline(stripped[2:]), styles["BulletAAD"]))
            idx += 1
            continue

        story.append(Paragraph(fmt_inline(stripped), styles["BodyAAD"]))
        idx += 1

    return story


def add_page_number(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#5b6570"))
    canvas.drawRightString(A4[0] - 1.6 * cm, 1.0 * cm, f"Seite {doc.page}")
    canvas.restoreState()


def main() -> int:
    styles = build_styles()
    lines = SOURCE_MD.read_text(encoding="utf-8").splitlines()

    story = []
    if LOGO.exists():
        img = Image(str(LOGO), width=3.0 * cm, height=3.0 * cm)
        img.hAlign = "CENTER"
        story.append(Spacer(1, 0.8 * cm))
        story.append(img)
        story.append(Spacer(1, 0.4 * cm))

    story.append(Paragraph("AAD Tooljet Converter", styles["TitleCenter"]))
    story.append(Paragraph("Benutzerhandbuch und Prozessdokumentation", styles["TitleCenter"]))
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph("Inhaltsverzeichnis", styles["TOCHeaderAAD"]))
    toc = TableOfContents()
    toc.levelStyles = [styles["TOCLevel1AAD"], styles["TOCLevel2AAD"], styles["TOCLevel3AAD"]]
    story.append(toc)
    story.append(PageBreak())
    story.extend(parse_markdown(lines, styles))

    doc = ConverterDocTemplate(
        str(OUTPUT_PDF),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.6 * cm,
        title="AAD Tooljet Converter Handbuch",
        author="OpenAI Codex",
    )
    doc.multiBuild(story)
    print(f"PDF geschrieben: {OUTPUT_PDF}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
