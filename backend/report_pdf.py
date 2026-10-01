"""Relatório de aprendizagem em PDF, gerado a partir dos mesmos dados da tela de relatórios."""
import io
from datetime import datetime, timezone, timedelta
from xml.sax.saxutils import escape

from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

VIOLET = colors.HexColor('#6d4ae0')
INDIGO = colors.HexColor('#4648d4')
INK = colors.HexColor('#1d1a33')
MUTED = colors.HexColor('#6b6880')
LINE = colors.HexColor('#e6e4f0')
SOFT = colors.HexColor('#f5f3fd')
GREEN = colors.HexColor('#1f8a5b')
AMBER = colors.HexColor('#b5650d')
RED = colors.HexColor('#c0392b')

MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

STYLES = {
    'cell': ParagraphStyle('cell', fontName='Helvetica', fontSize=8.5, leading=11, textColor=INK),
    'cell_bold': ParagraphStyle('cell_bold', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=INK),
    'section': ParagraphStyle('section', fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=INK, spaceBefore=4, spaceAfter=6),
    'note': ParagraphStyle('note', fontName='Helvetica', fontSize=7.5, leading=10, textColor=MUTED),
    'kpi_label': ParagraphStyle('kpi_label', fontName='Helvetica', fontSize=7.5, leading=9, textColor=MUTED),
    'kpi_value': ParagraphStyle('kpi_value', fontName='Helvetica-Bold', fontSize=17, leading=20, textColor=INK),
}


def br(value, digits=1):
    if value is None:
        return '—'
    return f'{value:,.{digits}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def grade_color(value):
    if value is None:
        return MUTED
    return GREEN if value >= 7 else AMBER if value >= 5 else RED


def summary(students):
    graded = [s['media'] for s in students if s.get('media') is not None]
    participation = [s['participacao'] for s in students if s.get('participacao') is not None]
    return {
        'alunos': len(students),
        'media': sum(graded) / len(graded) if graded else None,
        'participacao': sum(participation) / len(participation) if participation else None,
        'leituras': sum(s.get('leituras_concluidas') or 0 for s in students),
        'avaliacoes': sum(s.get('avaliacoes') or 0 for s in students),
        'atencao': sum(1 for v in graded if v < 6),
    }


def kpi_row(stats, width):
    items = [
        ('Alunos', str(stats['alunos'])),
        ('Média geral (0 a 10)', br(stats['media'])),
        ('Participação média', '—' if stats['participacao'] is None else f"{round(stats['participacao'])}%"),
        ('Leituras concluídas', str(stats['leituras'])),
        ('Avaliações corrigidas', str(stats['avaliacoes'])),
        ('Alunos em atenção (< 6)', str(stats['atencao'])),
    ]
    gap = 4 * mm
    col = (width - gap * (len(items) - 1)) / len(items)
    row, widths = [], []
    for i, (label, value) in enumerate(items):
        featured = i == 1
        label_style = ParagraphStyle(f'kl{i}', parent=STYLES['kpi_label'], textColor=colors.HexColor('#e7e2ff') if featured else MUTED)
        value_style = ParagraphStyle(f'kv{i}', parent=STYLES['kpi_value'], textColor=colors.white if featured else INK)
        box = Table([[Paragraph(escape(label), label_style)], [Paragraph(value, value_style)]], colWidths=[col])
        box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), VIOLET if featured else SOFT),
            ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, 0), 8), ('BOTTOMPADDING', (0, -1), (-1, -1), 9),
            ('ROUNDEDCORNERS', [6, 6, 6, 6]),
        ]))
        row.append(box)
        widths.append(col)
        if i < len(items) - 1:
            row.append('')
            widths.append(gap)
    outer = Table([row], colWidths=widths)
    outer.setStyle(TableStyle([('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    return outer


def month_label(key):
    year, month = key.split('-')
    return f'{MONTHS[int(month) - 1]}/{year[2:]}'


def evolution_chart(evolution, width, height=58 * mm):
    drawing = Drawing(width, height)
    if not evolution:
        drawing.add(String(width / 2, height / 2, 'As médias aparecerão após as primeiras correções.', textAnchor='middle', fontName='Helvetica', fontSize=9, fillColor=MUTED))
        return drawing
    data = evolution[-12:]
    chart = VerticalBarChart()
    chart.x, chart.y = 28, 22
    chart.width, chart.height = width - 40, height - 34
    chart.data = [[m['media'] for m in data]]
    chart.valueAxis.valueMin, chart.valueAxis.valueMax, chart.valueAxis.valueStep = 0, 10, 2
    chart.valueAxis.labels.fontName = 'Helvetica'
    chart.valueAxis.labels.fontSize = 7
    chart.valueAxis.labels.fillColor = MUTED
    chart.valueAxis.strokeColor = LINE
    chart.valueAxis.gridStrokeColor = LINE
    chart.valueAxis.visibleGrid = True
    chart.categoryAxis.categoryNames = [month_label(m['mes']) for m in data]
    chart.categoryAxis.labels.fontName = 'Helvetica'
    chart.categoryAxis.labels.fontSize = 7
    chart.categoryAxis.labels.fillColor = MUTED
    chart.categoryAxis.strokeColor = LINE
    chart.bars[0].fillColor = VIOLET
    chart.bars[0].strokeColor = None
    chart.barWidth = 10
    chart.groupSpacing = 10
    chart.barLabelFormat = lambda v: br(v)
    chart.barLabels.fontName = 'Helvetica-Bold'
    chart.barLabels.fontSize = 7
    chart.barLabels.fillColor = INK
    chart.barLabels.nudge = 6
    drawing.add(chart)
    return drawing


def distribution_table(students, width):
    buckets = [('Abaixo de 5', 0, 5, RED), ('De 5 a 6,9', 5, 7, AMBER), ('De 7 a 8,9', 7, 9, GREEN), ('9 ou mais', 9, 10.01, VIOLET)]
    graded = [s['media'] for s in students if s.get('media') is not None]
    rows = [[Paragraph('<b>Faixa de média</b>', STYLES['cell']), Paragraph('<b>Alunos</b>', STYLES['cell']), '']]
    bar_width = width * 0.45
    for label, low, high, color in buckets:
        count = sum(1 for v in graded if low <= v < high)
        ratio = count / len(graded) if graded else 0
        bar = Drawing(bar_width, 8)
        bar.add(Rect(0, 0, bar_width, 8, rx=4, ry=4, fillColor=SOFT, strokeColor=None))
        if ratio:
            bar.add(Rect(0, 0, max(8, bar_width * ratio), 8, rx=4, ry=4, fillColor=color, strokeColor=None))
        rows.append([Paragraph(label, STYLES['cell']), Paragraph(f'<b>{count}</b>', STYLES['cell']), bar])
    rows.append([Paragraph(f'{len(students) - len(graded)} aluno(s) ainda sem nota', STYLES['note']), '', ''])
    table = Table(rows, colWidths=[width * 0.35, width * 0.15, width * 0.5])
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW', (0, 0), (-1, 0), 0.6, LINE),
        ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('SPAN', (0, -1), (-1, -1)),
    ]))
    return table


def students_table(students, width):
    header = ['Aluno', 'Turma', 'Leituras', 'Resumos', 'Produções', 'Atividades', 'Participação', 'Média']
    head = ParagraphStyle('h', parent=STYLES['cell'], textColor=colors.white)
    head_center = ParagraphStyle('hc', parent=head, alignment=1)
    rows = [[Paragraph(f'<b>{h}</b>', head if i < 2 else head_center) for i, h in enumerate(header)]]
    for s in students:
        media = s.get('media')
        rows.append([
            Paragraph(escape(s.get('nome') or ''), STYLES['cell_bold']),
            Paragraph(escape(s.get('turma') or '—'), STYLES['cell']),
            str(s.get('leituras_concluidas') or 0),
            str(s.get('resumos') or 0),
            str(s.get('producoes') or 0),
            f"{s.get('atividades_entregues') or 0}/{s.get('atividades_disponiveis') or 0}",
            '—' if s.get('participacao') is None else f"{s['participacao']}%",
            Paragraph(f'<font color="{grade_color(media).hexval().replace("0x", "#")}"><b>{br(media)}</b></font>', ParagraphStyle('m', parent=STYLES['cell'], alignment=1)),
        ])
    ratios = [0.30, 0.12, 0.09, 0.09, 0.09, 0.11, 0.11, 0.09]
    table = Table(rows, colWidths=[width * r for r in ratios], repeatRows=1)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), INK),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ('TEXTCOLOR', (0, 1), (-1, -1), INK),
        ('ALIGN', (2, 1), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('LINEBELOW', (0, 1), (-1, -1), 0.4, LINE),
    ]
    for i in range(1, len(rows)):
        if i % 2 == 0:
            style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#faf9fe')))
    table.setStyle(TableStyle(style))
    return table


def build_report_pdf(data, turma_label, author):
    buffer = io.BytesIO()
    page = landscape(A4)
    margin = 14 * mm
    width = page[0] - 2 * margin
    generated = datetime.now(timezone(timedelta(hours=-3))).strftime('%d/%m/%Y às %H:%M')
    students = data['alunos']
    stats = summary(students)

    def decorate(canvas, doc):
        canvas.saveState()
        # Faixa superior com a identidade da plataforma.
        band = 26 * mm
        steps = 60
        for i in range(steps):
            t = i / (steps - 1)
            r = 0x46 + (0x8b - 0x46) * t
            g = 0x48 + (0x4a - 0x48) * t
            b = 0xd4 + (0xe0 - 0xd4) * t
            canvas.setFillColorRGB(r / 255, g / 255, b / 255)
            canvas.rect(page[0] * i / steps, page[1] - band, page[0] / steps + 1, band, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont('Helvetica-Bold', 9)
        canvas.drawString(margin, page[1] - 9 * mm, 'ETI LEITURA')
        canvas.setFont('Helvetica-Bold', 17)
        canvas.drawString(margin, page[1] - 17 * mm, 'Relatório de aprendizagem')
        canvas.setFont('Helvetica', 9)
        canvas.drawString(margin, page[1] - 22.5 * mm, f'{turma_label}  ·  Gerado em {generated}  ·  {author}')
        canvas.setFont('Helvetica', 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(margin, 8 * mm, 'Médias na escala de 0 a 10. Avaliações sem nota não contam como zero. Este relatório não define aprovação escolar.')
        canvas.drawRightString(page[0] - margin, 8 * mm, f'Página {doc.page}')
        canvas.restoreState()

    doc = SimpleDocTemplate(buffer, pagesize=page, leftMargin=margin, rightMargin=margin, topMargin=34 * mm, bottomMargin=16 * mm,
                            title='Relatório de aprendizagem — ETI LEITURA', author=author)
    half = (width - 8 * mm) / 2
    charts = Table(
        [[Paragraph('Evolução mensal das notas', STYLES['section']), '', Paragraph('Distribuição das médias', STYLES['section'])],
         [evolution_chart(data.get('evolucao') or [], half), '', distribution_table(students, half)]],
        colWidths=[half, 8 * mm, half],
    )
    charts.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0)]))

    story = [kpi_row(stats, width), Spacer(1, 8 * mm), KeepTogether(charts), Spacer(1, 6 * mm),
             Paragraph(f'Desempenho por aluno ({len(students)})', STYLES['section'])]
    if students:
        story.append(students_table(students, width))
    else:
        story.append(Paragraph('Nenhum aluno encontrado para este filtro.', STYLES['note']))
    doc.build(story, onFirstPage=decorate, onLaterPages=decorate)
    return buffer.getvalue()
