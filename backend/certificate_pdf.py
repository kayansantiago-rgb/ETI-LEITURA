"""Certificado de leitura em PDF, emitido quando o aluno atinge o mínimo no questionário do livro."""
import io
import math
import os
from datetime import datetime, timedelta, timezone
from xml.sax.saxutils import escape

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph

INK = colors.HexColor('#1d1a33')
MUTED = colors.HexColor('#6b6880')
VIOLET = colors.HexColor('#6d4ae0')
DEEP = colors.HexColor('#312e81')
PINK = colors.HexColor('#d9468f')
GOLD = colors.HexColor('#e2a93b')
GOLD_LIGHT = colors.HexColor('#f7d27a')
GOLD_DARK = colors.HexColor('#9a6408')
CREAM = colors.HexColor('#fffdf8')
LINE = colors.HexColor('#e8dcc0')

MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']


def long_date(iso):
    try:
        moment = datetime.fromisoformat(iso).astimezone(timezone(timedelta(hours=-3)))
    except (TypeError, ValueError):
        moment = datetime.now(timezone(timedelta(hours=-3)))
    return f'{moment.day} de {MONTHS[moment.month - 1]} de {moment.year}'


def verify_url(code):
    base = (os.environ.get('PUBLIC_APP_URL') or '').rstrip('/')
    return f'{base}/certificado/{code}' if base.startswith('http') else None


def gradient(c, x, y, w, h, stops, steps=120, vertical=False):
    """Faixa com degradê entre várias cores (lista de tuplas RGB 0..1)."""
    for i in range(steps):
        t = i / (steps - 1)
        seg = min(len(stops) - 2, int(t * (len(stops) - 1)))
        local = t * (len(stops) - 1) - seg
        a, b = stops[seg], stops[seg + 1]
        c.setFillColorRGB(*(a[k] + (b[k] - a[k]) * local for k in range(3)))
        if vertical:
            c.rect(x, y + h * i / steps, w, h / steps + 0.6, stroke=0, fill=1)
        else:
            c.rect(x + w * i / steps, y, w / steps + 0.6, h, stroke=0, fill=1)


def star(c, cx, cy, r, color):
    c.setFillColor(color)
    p = c.beginPath()
    for i in range(9):
        angle = math.pi / 2 + math.pi * i / 4
        radius = r if i % 2 == 0 else r * 0.32
        x, y = cx + radius * math.cos(angle), cy + radius * math.sin(angle)
        p.moveTo(x, y) if i == 0 else p.lineTo(x, y)
    c.drawPath(p, stroke=0, fill=1)


def owl(c, cx, cy, s):
    """A coruja da ETI LEITURA, com capelo de formatura (s = escala)."""
    c.saveState()
    # Orelhas e corpo.
    c.setFillColor(colors.HexColor('#6d4ae0'))
    for side in (-1, 1):
        p = c.beginPath()
        p.moveTo(cx + side * 14 * s, cy + 18 * s)
        p.lineTo(cx + side * 21 * s, cy + 31 * s)
        p.lineTo(cx + side * 6 * s, cy + 22 * s)
        p.close()
        c.drawPath(p, stroke=0, fill=1)
    c.ellipse(cx - 22 * s, cy - 26 * s, cx + 22 * s, cy + 26 * s, stroke=0, fill=1)
    # Barriga.
    c.setFillColor(colors.HexColor('#ede9fe'))
    c.ellipse(cx - 13 * s, cy - 22 * s, cx + 13 * s, cy + 2 * s, stroke=0, fill=1)
    c.setStrokeColor(colors.HexColor('#c4b5fd'))
    c.setLineWidth(1.1 * s)
    for row, width in ((-6, 6), (-12, 7), (-17, 5)):
        c.arc(cx - width * s, cy + (row - 3) * s, cx + width * s, cy + (row + 3) * s, 200, 140)
    # Olhos.
    for side in (-1, 1):
        ex = cx + side * 9 * s
        c.setFillColor(colors.white)
        c.circle(ex, cy + 9 * s, 8 * s, stroke=0, fill=1)
        c.setFillColor(INK)
        c.circle(ex + 1 * s, cy + 9 * s, 4.2 * s, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.circle(ex + 2.4 * s, cy + 10.6 * s, 1.4 * s, stroke=0, fill=1)
    # Bico.
    c.setFillColor(colors.HexColor('#f59e0b'))
    p = c.beginPath()
    p.moveTo(cx - 3 * s, cy + 3 * s)
    p.lineTo(cx + 3 * s, cy + 3 * s)
    p.lineTo(cx, cy - 2.5 * s)
    p.close()
    c.drawPath(p, stroke=0, fill=1)
    # Capelo.
    c.setFillColor(DEEP)
    p = c.beginPath()
    p.moveTo(cx - 22 * s, cy + 29 * s)
    p.lineTo(cx, cy + 37 * s)
    p.lineTo(cx + 22 * s, cy + 29 * s)
    p.lineTo(cx, cy + 22 * s)
    p.close()
    c.drawPath(p, stroke=0, fill=1)
    c.rect(cx - 10 * s, cy + 21 * s, 20 * s, 6 * s, stroke=0, fill=1)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.3 * s)
    c.line(cx, cy + 30 * s, cx + 17 * s, cy + 26 * s)
    c.line(cx + 17 * s, cy + 26 * s, cx + 17 * s, cy + 16 * s)
    c.setFillColor(GOLD)
    c.circle(cx + 17 * s, cy + 15 * s, 1.8 * s, stroke=0, fill=1)
    c.restoreState()


def seal(c, cx, cy, r):
    """Selo dourado com fitas."""
    c.saveState()
    for side in (-1, 1):
        c.setFillColor(colors.HexColor('#6d4ae0') if side < 0 else PINK)
        p = c.beginPath()
        p.moveTo(cx + side * r * 0.25, cy - r * 0.3)
        p.lineTo(cx + side * r * 0.75, cy - r * 1.55)
        p.lineTo(cx + side * r * 0.48, cy - r * 1.38)
        p.lineTo(cx + side * r * 0.3, cy - r * 1.62)
        p.lineTo(cx - side * r * 0.12, cy - r * 0.35)
        p.close()
        c.drawPath(p, stroke=0, fill=1)
    c.setFillColor(GOLD)
    points = 28
    p = c.beginPath()
    for i in range(points * 2 + 1):
        angle = math.pi * i / points
        radius = r if i % 2 == 0 else r * 0.88
        x, y = cx + radius * math.cos(angle), cy + radius * math.sin(angle)
        p.moveTo(x, y) if i == 0 else p.lineTo(x, y)
    c.drawPath(p, stroke=0, fill=1)
    c.setFillColor(GOLD_LIGHT)
    c.circle(cx, cy, r * 0.76, stroke=0, fill=1)
    c.setStrokeColor(colors.white)
    c.setLineWidth(1)
    c.circle(cx, cy, r * 0.66, stroke=1, fill=0)
    c.setFillColor(GOLD_DARK)
    c.setFont('Helvetica-Bold', r * 0.3)
    c.drawCentredString(cx, cy + r * 0.06, 'ETI')
    c.setFont('Helvetica-Bold', r * 0.14)
    c.drawCentredString(cx, cy - r * 0.22, 'LEITURA')
    star(c, cx, cy + r * 0.44, r * 0.1, GOLD_DARK)
    c.restoreState()


def qr(c, value, x, y, size):
    widget = QrCodeWidget(value, barLevel='M')
    x0, y0, x1, y1 = widget.getBounds()
    drawing = Drawing(size, size, transform=[size / (x1 - x0), 0, 0, size / (y1 - y0), 0, 0])
    drawing.add(widget)
    renderPDF.draw(drawing, c, x, y)


def build_certificate(cert):
    buffer = io.BytesIO()
    from reportlab.pdfgen import canvas as pdfcanvas

    width, height = landscape(A4)
    c = pdfcanvas.Canvas(buffer, pagesize=(width, height))
    c.setTitle(f"Certificado de leitura — {cert['book_titulo']}")
    c.setAuthor('ETI LEITURA')
    cx = width / 2

    # Moldura externa em degradê e folha creme por cima.
    gradient(c, 0, 0, width, height, [(0.19, 0.18, 0.51), (0.43, 0.16, 0.85), (0.85, 0.27, 0.56)])
    margin = 11 * mm
    c.setFillColor(CREAM)
    c.roundRect(margin, margin, width - 2 * margin, height - 2 * margin, 6 * mm, stroke=0, fill=1)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.4)
    c.roundRect(margin + 5 * mm, margin + 5 * mm, width - 2 * margin - 10 * mm, height - 2 * margin - 10 * mm, 4 * mm, stroke=1, fill=0)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.roundRect(margin + 7 * mm, margin + 7 * mm, width - 2 * margin - 14 * mm, height - 2 * margin - 14 * mm, 3 * mm, stroke=1, fill=0)

    # Bolhas suaves, recortadas dentro da moldura dourada.
    c.saveState()
    clip = c.beginPath()
    clip.roundRect(margin + 7 * mm, margin + 7 * mm, width - 2 * margin - 14 * mm, height - 2 * margin - 14 * mm, 3 * mm)
    c.clipPath(clip, stroke=0, fill=0)
    c.setFillColor(colors.HexColor('#f3eeff'))
    c.circle(width - 38 * mm, height - 42 * mm, 28 * mm, stroke=0, fill=1)
    c.setFillColor(colors.HexColor('#fdeef5'))
    c.circle(42 * mm, 44 * mm, 24 * mm, stroke=0, fill=1)
    c.restoreState()
    for sx, sy, r, col in ((32, 32, 3.2, GOLD), (39, 27, 1.8, PINK), (width / mm - 32, height / mm - 32, 3.2, GOLD), (width / mm - 40, height / mm - 27, 1.8, VIOLET),
                           (width / mm - 32, 32, 2.4, VIOLET), (32, height / mm - 32, 2.4, PINK)):
        star(c, sx * mm, sy * mm, r * mm, col)

    # Coruja e títulos.
    owl(c, cx, height - 50 * mm, 0.62 * mm)
    c.setFillColor(VIOLET)
    c.setFont('Helvetica-Bold', 10.5)
    c.drawCentredString(cx, height - 72 * mm, 'C E R T I F I C A D O   D E   L E I T U R A')
    c.setFillColor(MUTED)
    c.setFont('Times-Italic', 15)
    c.drawCentredString(cx, height - 83 * mm, 'Certificamos com alegria que')

    name = cert['user_nome']
    size = 40 if len(name) <= 26 else 32 if len(name) <= 38 else 25
    c.setFillColor(INK)
    c.setFont('Times-BoldItalic', size)
    c.drawCentredString(cx, height - 99 * mm, name)
    gradient(c, cx - 70 * mm, height - 104 * mm, 140 * mm, 1.2 * mm, [(0.43, 0.29, 0.88), (0.85, 0.27, 0.56), (0.89, 0.66, 0.23)], steps=60)

    author = f" de {escape(cert['book_autor'])}" if cert.get('book_autor') else ''
    text = (
        f"concluiu a leitura do livro <b>“{escape(cert['book_titulo'])}”</b>{author} e demonstrou compreensão da obra, "
        f"com <b>{cert['percentual']}% de acertos</b> no questionário final. Parabéns pela dedicação e por cada página dessa jornada!"
    )
    style = ParagraphStyle('body', fontName='Times-Roman', fontSize=14.5, leading=21, textColor=INK, alignment=1)
    paragraph = Paragraph(text, style)
    box_width = 200 * mm
    _, box_height = paragraph.wrap(box_width, 50 * mm)
    paragraph.drawOn(c, (width - box_width) / 2, height - 111 * mm - box_height)

    # Rodapé: data · selo · conferência.
    base = 38 * mm
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.line(cx - 118 * mm, base, cx - 48 * mm, base)
    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(cx - 83 * mm, base + 3 * mm, long_date(cert.get('emitido_em')))
    c.setFillColor(MUTED)
    c.setFont('Helvetica', 8.5)
    c.drawCentredString(cx - 83 * mm, base - 5 * mm, 'Data de emissão')
    if cert.get('user_turma'):
        c.drawCentredString(cx - 83 * mm, base - 10 * mm, f"Turma {cert['user_turma']}")

    seal(c, cx, base + 10 * mm, 14 * mm)

    url = verify_url(cert['codigo'])
    right = cx + 83 * mm
    if url:
        qr(c, url, right - 34 * mm, base - 13 * mm, 24 * mm)
        c.setFillColor(INK)
        c.setFont('Helvetica-Bold', 9)
        c.drawString(right - 7 * mm, base + 6 * mm, 'Certificado autêntico')
        c.setFillColor(MUTED)
        c.setFont('Helvetica', 8)
        c.drawString(right - 7 * mm, base + 1 * mm, 'Aponte a câmera para conferir')
        c.drawString(right - 7 * mm, base - 4 * mm, f"Código {cert['codigo']}")
    else:
        c.line(cx + 48 * mm, base, cx + 118 * mm, base)
        c.setFillColor(INK)
        c.setFont('Helvetica-Bold', 11)
        c.drawCentredString(right, base + 3 * mm, f"Código {cert['codigo']}")
        c.setFillColor(MUTED)
        c.setFont('Helvetica', 8.5)
        c.drawCentredString(right, base - 5 * mm, 'Código de conferência')

    c.setFillColor(MUTED)
    c.setFont('Helvetica', 7.5)
    c.drawCentredString(cx, margin + 9.5 * mm, 'ETI LEITURA  ·  Ler, imaginar, transformar')

    c.showPage()
    c.save()
    return buffer.getvalue()
