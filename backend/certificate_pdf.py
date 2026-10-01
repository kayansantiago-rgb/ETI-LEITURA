"""Certificado de leitura em PDF, emitido quando o aluno atinge o mínimo no questionário do livro."""
import io
import math
from datetime import datetime, timedelta, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph
from xml.sax.saxutils import escape

INK = colors.HexColor('#1d1a33')
MUTED = colors.HexColor('#6b6880')
VIOLET = colors.HexColor('#6d4ae0')
INDIGO = colors.HexColor('#4648d4')
PINK = colors.HexColor('#d9468f')
GOLD = colors.HexColor('#e2a93b')
SOFT = colors.HexColor('#f6f3ff')

MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']


def long_date(iso):
    try:
        moment = datetime.fromisoformat(iso).astimezone(timezone(timedelta(hours=-3)))
    except (TypeError, ValueError):
        moment = datetime.now(timezone(timedelta(hours=-3)))
    return f'{moment.day} de {MONTHS[moment.month - 1]} de {moment.year}'


def gradient_band(c, x, y, w, h, start, end, steps=80):
    for i in range(steps):
        t = i / (steps - 1)
        c.setFillColorRGB(*(start[k] + (end[k] - start[k]) * t for k in range(3)))
        c.rect(x + w * i / steps, y, w / steps + 0.6, h, stroke=0, fill=1)


def medal(c, cx, cy, r):
    # Selo com raios, inspirado em medalhas de premiação.
    c.saveState()
    c.setFillColor(GOLD)
    points = 24
    path = c.beginPath()
    for i in range(points * 2 + 1):
        angle = math.pi * i / points
        radius = r if i % 2 == 0 else r * 0.86
        px, py = cx + radius * math.cos(angle), cy + radius * math.sin(angle)
        path.moveTo(px, py) if i == 0 else path.lineTo(px, py)
    c.drawPath(path, stroke=0, fill=1)
    c.setFillColor(colors.HexColor('#f7d27a'))
    c.circle(cx, cy, r * 0.74, stroke=0, fill=1)
    c.setStrokeColor(colors.white)
    c.setLineWidth(1.2)
    c.circle(cx, cy, r * 0.64, stroke=1, fill=0)
    c.setFillColor(colors.HexColor('#7a4d06'))
    c.setFont('Helvetica-Bold', r * 0.34)
    c.drawCentredString(cx, cy + r * 0.02, 'ETI')
    c.setFont('Helvetica-Bold', r * 0.15)
    c.drawCentredString(cx, cy - r * 0.26, 'LEITURA')
    c.restoreState()


def build_certificate(cert):
    buffer = io.BytesIO()
    from reportlab.pdfgen import canvas as pdfcanvas

    width, height = landscape(A4)
    c = pdfcanvas.Canvas(buffer, pagesize=(width, height))
    c.setTitle(f"Certificado de leitura — {cert['book_titulo']}")
    c.setAuthor('ETI LEITURA')

    # Fundo e moldura.
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)
    c.setFillColor(SOFT)
    c.circle(width - 30 * mm, 40 * mm, 70 * mm, stroke=0, fill=1)
    c.circle(20 * mm, height - 60 * mm, 45 * mm, stroke=0, fill=1)
    gradient_band(c, 0, height - 16 * mm, width, 16 * mm, (0.27, 0.28, 0.83), (0.85, 0.27, 0.56))
    gradient_band(c, 0, 0, width, 6 * mm, (0.85, 0.27, 0.56), (0.27, 0.28, 0.83))
    c.setStrokeColor(colors.HexColor('#d9d2fb'))
    c.setLineWidth(1)
    c.roundRect(12 * mm, 12 * mm, width - 24 * mm, height - 34 * mm, 8 * mm, stroke=1, fill=0)

    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 11)
    c.drawString(18 * mm, height - 10 * mm, 'ETI LEITURA')
    c.setFont('Helvetica', 9)
    c.drawRightString(width - 18 * mm, height - 10 * mm, 'Ler, imaginar, transformar')

    medal(c, width / 2, height - 46 * mm, 15 * mm)

    c.setFillColor(VIOLET)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(width / 2, height - 72 * mm, 'C E R T I F I C A D O   D E   L E I T U R A')

    c.setFillColor(MUTED)
    c.setFont('Helvetica', 13)
    c.drawCentredString(width / 2, height - 84 * mm, 'Certificamos que')

    name = cert['user_nome']
    size = 34 if len(name) <= 28 else 28 if len(name) <= 40 else 22
    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', size)
    c.drawCentredString(width / 2, height - 98 * mm, name)
    c.setStrokeColor(colors.HexColor('#cfc6f7'))
    c.setLineWidth(0.8)
    c.line(width / 2 - 85 * mm, height - 102 * mm, width / 2 + 85 * mm, height - 102 * mm)

    author = f" de {escape(cert['book_autor'])}" if cert.get('book_autor') else ''
    text = (
        f"concluiu a leitura do livro <b>“{escape(cert['book_titulo'])}”</b>{author} e demonstrou compreensão da obra, "
        f"com <b>{cert['percentual']}% de acertos</b> no questionário final da plataforma. Parabéns pela dedicação "
        f"e por cada página dessa jornada!"
    )
    style = ParagraphStyle('body', fontName='Helvetica', fontSize=13, leading=20, textColor=INK, alignment=1)
    paragraph = Paragraph(text, style)
    box_width = 190 * mm
    _, box_height = paragraph.wrap(box_width, 60 * mm)
    paragraph.drawOn(c, (width - box_width) / 2, height - 108 * mm - box_height)

    # Rodapé com data, turma e código de conferência.
    base = 34 * mm
    c.setStrokeColor(colors.HexColor('#cfc6f7'))
    for x in (width / 2 - 95 * mm, width / 2 + 25 * mm):
        c.line(x, base, x + 70 * mm, base)
    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(width / 2 - 60 * mm, base + 3 * mm, long_date(cert.get('emitido_em')))
    c.drawCentredString(width / 2 + 60 * mm, base + 3 * mm, 'ETI LEITURA')
    c.setFillColor(MUTED)
    c.setFont('Helvetica', 9)
    c.drawCentredString(width / 2 - 60 * mm, base - 5 * mm, 'Data de emissão')
    c.drawCentredString(width / 2 + 60 * mm, base - 5 * mm, 'Plataforma escolar de leitura')

    c.setFont('Helvetica', 8)
    details = f"Código {cert['codigo']}"
    if cert.get('user_turma'):
        details = f"Turma {cert['user_turma']}  ·  {details}"
    c.drawCentredString(width / 2, 18 * mm, details)

    c.showPage()
    c.save()
    return buffer.getvalue()
