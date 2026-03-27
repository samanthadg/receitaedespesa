from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas


base_dir = Path(__file__).resolve().parents[1]
source = base_dir / "DOCUMENTACAO_ENTREGA.md"
target = base_dir / "DOCUMENTACAO_ENTREGA.pdf"

text = source.read_text(encoding="utf-8")
lines = text.splitlines()

c = canvas.Canvas(str(target), pagesize=A4)
width, height = A4

left = 2 * cm
top = height - 2 * cm
line_height = 14
y = top

c.setFont("Helvetica", 11)

for line in lines:
    raw = line.replace("**", "").replace("`", "")
    if raw.startswith("# "):
      c.setFont("Helvetica-Bold", 14)
      raw = raw[2:]
    elif raw.startswith("## "):
      c.setFont("Helvetica-Bold", 12)
      raw = raw[3:]
    elif raw.startswith("### "):
      c.setFont("Helvetica-Bold", 11)
      raw = raw[4:]
    else:
      c.setFont("Helvetica", 11)

    if y < 2 * cm:
        c.showPage()
        c.setFont("Helvetica", 11)
        y = top

    c.drawString(left, y, raw[:120])
    y -= line_height

c.save()
print(f"PDF gerado em: {target}")

