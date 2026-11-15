"""Genera el Manual de EarthScope AI (PDF) con ReportLab."""
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, CondPageBreak, Frame, Image, KeepTogether, NextPageTemplate, PageBreak,
                                PageTemplate, Paragraph, Spacer, Table, TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents

HERE = Path(__file__).parent
IMG = HERE / "img"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "MANUAL_EARTHSCOPE_AI.pdf"  # requiere reportlab y fuentes Arial (macOS)

F = "/System/Library/Fonts/Supplemental/"
pdfmetrics.registerFont(TTFont("Arial", F + "Arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-B", F + "Arial Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-I", F + "Arial Italic.ttf"))
pdfmetrics.registerFont(TTFont("Arial-BI", F + "Arial Bold Italic.ttf"))
pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-B", italic="Arial-I", boldItalic="Arial-BI")

NAVY = colors.HexColor("#0b1426")
DEEP = colors.HexColor("#07101f")
CYAN = colors.HexColor("#0891b2")
CYAN_L = colors.HexColor("#22d3ee")
INK = colors.HexColor("#1e293b")
MUTED = colors.HexColor("#64748b")
SOFT = colors.HexColor("#ecfeff")
LINE = colors.HexColor("#cbd5e1")
AMBER_BG = colors.HexColor("#fff7ed")
AMBER = colors.HexColor("#c2410c")
GREEN = colors.HexColor("#059669")
BLUE = colors.HexColor("#2563eb")
GOLD = colors.HexColor("#d97706")
GREY = colors.HexColor("#64748b")

W, H = A4
M = 2 * cm

S = {
    "body": ParagraphStyle("body", fontName="Arial", fontSize=10, leading=14.5, textColor=INK, spaceAfter=6),
    "h1": ParagraphStyle("h1", fontName="Arial-B", fontSize=20, leading=24, textColor=NAVY, spaceBefore=4, spaceAfter=10),
    "h2": ParagraphStyle("h2", fontName="Arial-B", fontSize=13, leading=17, textColor=CYAN, spaceBefore=12, spaceAfter=5, keepWithNext=1),
    "h3": ParagraphStyle("h3", fontName="Arial-B", fontSize=10.5, leading=14, textColor=NAVY, spaceBefore=8, spaceAfter=3, keepWithNext=1),
    "kicker": ParagraphStyle("kicker", fontName="Arial-B", fontSize=8, leading=10, textColor=CYAN, spaceAfter=2),
    "cap": ParagraphStyle("cap", fontName="Arial-I", fontSize=8.5, leading=11, textColor=MUTED, alignment=TA_CENTER, spaceBefore=3, spaceAfter=10),
    "cell": ParagraphStyle("cell", fontName="Arial", fontSize=8.5, leading=11, textColor=INK),
    "cellb": ParagraphStyle("cellb", fontName="Arial-B", fontSize=8.5, leading=11, textColor=colors.white),
    "bullet": ParagraphStyle("bullet", fontName="Arial", fontSize=10, leading=14, textColor=INK, leftIndent=14, bulletIndent=3, spaceAfter=3),
    "box": ParagraphStyle("box", fontName="Arial", fontSize=9.5, leading=13.5, textColor=INK),
    "code": ParagraphStyle("code", fontName="Courier", fontSize=8.5, leading=11.5, textColor=colors.HexColor("#0f172a")),
    "toc1": ParagraphStyle("toc1", fontName="Arial", fontSize=11, leading=20, textColor=INK, leftIndent=0),
}


class Doc(BaseDocTemplate):
    def afterFlowable(self, f):
        if isinstance(f, Paragraph) and f.style.name == "h1":
            text = f.getPlainText()
            key = f"s{self.seq.nextf('h1')}"
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=0)
            self.notify("TOCEntry", (0, text, self.page, key))


def cover(c, d):
    c.saveState()
    c.setFillColor(DEEP); c.rect(0, 0, W, H, fill=1, stroke=0)
    img = IMG / "portada.jpg"
    iw = W; ih = iw * 499 / 800
    c.drawImage(str(img), 0, H - ih - 3.2 * cm, iw, ih, mask="auto")
    c.setFillColor(CYAN_L); c.setFont("Arial-B", 9)
    c.drawString(M, H - 2 * cm, "NASA SPACE APPS CHALLENGE 2026  ·  EQUIPO ROBOKIDS")
    y = H - ih - 5.4 * cm
    c.setFillColor(colors.white); c.setFont("Arial-B", 34); c.drawString(M, y, "EarthScope AI")
    c.setFillColor(CYAN_L); c.setFont("Arial", 17); c.drawString(M, y - 1.0 * cm, "Manual del proyecto")
    c.setFillColor(colors.HexColor("#cbd5e1")); c.setFont("Arial", 11)
    for i, line in enumerate([
        "Qué es, cómo se usa, de dónde vienen los datos y cómo funciona por dentro.",
        "Para cualquier persona que quiera entender el proyecto y el tema desde cero.",
    ]):
        c.drawString(M, y - 2.0 * cm - i * 0.55 * cm, line)
    c.setStrokeColor(CYAN_L); c.setLineWidth(1.2); c.line(M, 3.4 * cm, W - M, 3.4 * cm)
    c.setFillColor(colors.HexColor("#94a3b8")); c.setFont("Arial", 9)
    c.drawString(M, 2.7 * cm, "Versión 1.0  ·  15 de noviembre de 2026")
    c.drawRightString(W - M, 2.7 * cm, "Datos: NASA GPM IMERG · MODIS · MERRA-2 · EONET")
    c.restoreState()


def page(c, d):
    c.saveState()
    c.setStrokeColor(LINE); c.setLineWidth(0.5); c.line(M, H - 1.3 * cm, W - M, H - 1.3 * cm)
    c.setFont("Arial-B", 8); c.setFillColor(CYAN); c.drawString(M, H - 1.1 * cm, "EarthScope AI")
    c.setFont("Arial", 8); c.setFillColor(MUTED); c.drawRightString(W - M, H - 1.1 * cm, "Manual del proyecto · RoboKids")
    c.drawCentredString(W / 2, 1.1 * cm, str(d.page))
    c.restoreState()


doc = Doc(str(OUT), pagesize=A4, leftMargin=M, rightMargin=M, topMargin=1.9 * cm, bottomMargin=1.8 * cm,
          title="EarthScope AI — Manual del proyecto", author="Equipo RoboKids",
          subject="NASA Space Apps Challenge 2026")
frame = Frame(M, 1.8 * cm, W - 2 * M, H - 3.7 * cm, id="f")
doc.addPageTemplates([PageTemplate("cover", frames=[frame], onPage=cover),
                      PageTemplate("page", frames=[frame], onPage=page)])

story = []
P = lambda t, s="body": Paragraph(t, S[s])


def bullets(items):
    for it in items:
        story.append(Paragraph(it, S["bullet"], bulletText="•"))


def box(html, bg=SOFT, border=CYAN, title=None):
    content = [P(f"<b>{title}</b>", "box")] if title else []
    content.append(P(html, "box"))
    t = Table([[content]], colWidths=[W - 2 * M])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg), ("LINEBEFORE", (0, 0), (0, -1), 3, border),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                           ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    story.append(Spacer(1, 4)); story.append(t); story.append(Spacer(1, 8))


def table(rows, widths, head=True):
    data = [[Paragraph(str(c), S["cellb" if head and i == 0 else "cell"]) for c in r] for i, r in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1 if head else 0)
    st = [("GRID", (0, 0), (-1, -1), 0.4, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
          ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
          ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]
    if head:
        st += [("BACKGROUND", (0, 0), (-1, 0), NAVY)]
        st += [("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f8fafc")) for i in range(2, len(rows), 2)]
    t.setStyle(TableStyle(st))
    story.append(t); story.append(Spacer(1, 8))


def shot(name, caption, width=(W - 2 * M) * 0.86):
    im = Image(str(IMG / name), width=width, height=width * 499 / 800)
    story.append(KeepTogether([im, P(caption, "cap")]))


def section(kicker, title):
    story.append(Spacer(1, 10))
    story.append(P(kicker.upper(), "kicker"))
    story.append(P(title, "h1"))


CW = W - 2 * M

# ----------------------------------------------------------------- portada + índice
story += [NextPageTemplate("page"), PageBreak()]
story.append(Paragraph("Contenido", ParagraphStyle("h1toc", parent=S["h1"])))
toc = TableOfContents(); toc.levelStyles = [S["toc1"]]; toc.dotsMinLevel = 0
story.append(toc)
story.append(Spacer(1, 14))
box("Este manual está pensado para leerse en orden. Los capítulos 1 a 4 no necesitan conocimientos técnicos: "
    "explican el tema, la idea y cómo se usa la web. Los capítulos 5 a 7 explican cómo está construido por dentro y "
    "la ciencia que hay detrás. Al final hay un glosario con las palabras que pueden sonar raras.",
    title="Cómo leer este manual")
story.append(PageBreak())

# ----------------------------------------------------------------- 1
section("Capítulo 1", "¿Qué es EarthScope AI?")
story.append(P(
    "<b>EarthScope AI</b> es un laboratorio de investigación planetaria que funciona en el navegador. Muestra un globo "
    "terrestre en 3D sobre el que se pueden ver <b>24 años de datos reales de satélites de la NASA (2001–2024)</b>: "
    "lluvia, vegetación, temperatura del suelo, temperatura del aire y humedad. Su lema resume la idea: "
    "<i>“No solo observes cómo cambia la Tierra. Investígalo.”</i>"))
story.append(P(
    "La diferencia con un visor de mapas común es que EarthScope no se queda en mostrar colores bonitos. Permite "
    "elegir cualquier lugar del planeta (un punto o un área dibujada a mano) y responde con rigor a la pregunta "
    "<b>“¿aquí ha cambiado algo de verdad, o es solo la variación normal de un año a otro?”</b>. Cada conclusión "
    "se puede rastrear hasta el producto NASA del que salió."))
story.append(P("El proyecto nace del reto", "h2"))
story.append(P(
    "EarthScope AI se construyó para el <b>NASA Space Apps Challenge 2026</b> (reto “Earth System Trend Detective”) "
    "por el equipo <b>RoboKids</b>. El reto pide usar datos de observación de la Tierra para detectar tendencias "
    "en el sistema climático y comunicarlas de forma honesta y comprensible."))
story.append(P("Qué se puede hacer", "h2"))
bullets([
    "<b>Explorar</b> el planeta con capas NASA animadas año por año.",
    "<b>Ver tendencias</b>: mapas de cuánto cambió cada zona por década y dónde cambió más.",
    "<b>Analizar un lugar</b>: un punto o un polígono propio, con serie de tiempo, veredicto estadístico y prueba de robustez.",
    "<b>Comparar dos años</b> con una cortina deslizante (por ejemplo, 2001 frente a 2024).",
    "<b>Preguntar</b> a un asistente de IA en español o inglés, por texto o por voz, que mueve el globo mientras responde.",
    "<b>Ver historias guiadas</b> y eventos naturales que están pasando ahora (incendios, tormentas, volcanes).",
    "<b>Ver los satélites reales</b> en su posición actual, coloreados según su papel en los datos.",
    "Explorar una <b>proyección experimental</b> a 2030 hecha con una red neuronal, y la base de las futuras <b>simulaciones “¿y si…?”</b>.",
])
box("EarthScope distingue siempre tres tipos de información: <b>observación</b> (lo que midieron los satélites), "
    "<b>proyección experimental</b> (lo que estima una red neuronal hacia el futuro) y <b>escenario</b> (lo que "
    "estimaría un modelo si algo cambiara). Nunca se presentan como si fueran lo mismo.",
    title="Una regla de oro: honestidad científica", bg=AMBER_BG, border=AMBER)
story.append(CondPageBreak(7 * cm))

# ----------------------------------------------------------------- 2
section("Capítulo 2", "El tema: cómo saber si la Tierra está cambiando")
story.append(P(
    "El clima de un lugar nunca es igual dos años seguidos. Un año llueve más, el siguiente menos; un verano es "
    "extremo y el otro templado. Esa variación natural hace difícil responder una pregunta que parece sencilla: "
    "<b>¿está cambiando de verdad?</b> Para responderla hacen falta muchos años de datos medidos de la misma "
    "forma y herramientas estadísticas que separen la señal del ruido."))
story.append(P("Las cinco variables que mira EarthScope", "h2"))
table([
    ["Variable", "Qué es, en palabras simples", "Por qué importa"],
    ["Lluvia (precipitación)", "Cuánta lluvia cae en promedio por día (mm/día).", "Agua para ríos, cultivos y bosques; sequías e inundaciones."],
    ["Vegetación (EVI)", "Qué tan verde y frondosa se ve la vegetación desde el espacio (índice de 0 a 1).", "Salud de bosques y cultivos; deforestación o reverdecimiento."],
    ["Temperatura de superficie", "La temperatura del suelo de día (no la del aire).", "Olas de calor, estrés de la vegetación, islas de calor urbanas."],
    ["Temperatura del aire", "La temperatura a 2 m del suelo, como la de un termómetro.", "Es la medida clásica del calentamiento global."],
    ["Humedad relativa", "Cuánta humedad tiene el aire respecto del máximo posible (%).", "Confort, incendios, formación de lluvia."],
], [3.3 * cm, 7.2 * cm, CW - 10.5 * cm])
story.append(P("Cuatro ideas clave", "h2"))
story.append(P("1. Media, anomalía y tendencia", "h3"))
story.append(P(
    "La <b>media anual</b> es el valor promedio de un año. La <b>anomalía</b> compara un año con lo normal "
    "(el promedio de 2001–2024): “2024 fue 0,4 °C más cálido de lo normal”. La <b>tendencia</b> mide el cambio "
    "sostenido a lo largo de los 24 años, por ejemplo “+0,15 °C por década”. La web tiene un modo para cada una."))
story.append(P("2. Tendencia significativa", "h3"))
story.append(P(
    "Una tendencia es <b>significativa</b> cuando es muy poco probable que haya aparecido por azar. EarthScope usa "
    "el criterio habitual en ciencia: valor p menor que 0,05, es decir, menos de un 5 % de probabilidad de ver una "
    "tendencia así si en realidad no hubiera cambio."))
story.append(P("3. Robustez", "h3"))
story.append(P(
    "Aunque una tendencia sea significativa, puede depender demasiado de unos pocos años extremos. Por eso "
    "EarthScope repite el análisis <b>quitando los primeros y los últimos años</b>. Si la conclusión cambia, la "
    "señal se marca como <b>frágil</b> (no robusta). Esto es importante porque 2023 y 2024 fueron años récord de calor."))
story.append(P("4. Observación frente a reanálisis", "h3"))
story.append(P(
    "La lluvia, la vegetación y la temperatura del suelo vienen de <b>satélites</b> que observan la Tierra. "
    "La temperatura y la humedad del aire vienen de un <b>reanálisis</b> (MERRA-2): un modelo del clima que "
    "combina millones de observaciones para reconstruir cada mes de forma continua. Es muy útil y coherente, "
    "pero no es una medición directa, y la web lo indica con una etiqueta."))
story.append(CondPageBreak(7 * cm))

# ----------------------------------------------------------------- 3
section("Capítulo 3", "De dónde vienen los datos")
story.append(P(
    "Todos los datos científicos son <b>públicos y gratuitos</b> y se descargan de los archivos de la NASA "
    "(Earthdata, GES DISC y LP DAAC) con una cuenta de Earthdata Login. Cubren todo el planeta, mes a mes, "
    "de enero de 2001 a diciembre de 2024 (288 meses)."))
table([
    ["Variable en la web", "Producto NASA", "Tipo", "Resolución", "Satélites / fuente"],
    ["Lluvia (mm/día)", "GPM IMERG Final mensual V07 (GPM_3IMERGM)", "Satélite + pluviómetros", "0,1° → 0,5°", "Constelación GPM: GPM Core (calibra) y radiómetros de microondas de otros satélites (NOAA, MetOp, GCOM-W1, DMSP…)"],
    ["Vegetación (EVI)", "MODIS/Terra MOD13C2 v6.1", "Satélite", "0,05° → 0,5°", "Terra (instrumento MODIS)"],
    ["Temperatura de superficie (°C)", "MODIS/Terra MOD11C3 v6.1", "Satélite", "0,05° → 0,5°", "Terra (MODIS); solo tierra y cielo despejado"],
    ["Temperatura del aire (°C)", "MERRA-2 M2TMNXSLV", "Reanálisis", "0,5° × 0,625° → 0,5°", "Modelo GEOS de la NASA + observaciones de muchos satélites"],
    ["Humedad relativa (%)", "MERRA-2 M2TMNXSLV (de QV2M, T2M y PS)", "Reanálisis", "0,5° × 0,625° → 0,5°", "Igual que la anterior"],
], [2.8 * cm, 3.6 * cm, 2.2 * cm, 2.3 * cm, CW - 10.9 * cm])
story.append(P("Datos en vivo", "h2"))
bullets([
    "<b>Eventos naturales activos</b>: NASA EONET (Earth Observatory Natural Event Tracker). Incendios, tormentas, volcanes, hielo… Se actualiza cada 30 minutos.",
    "<b>Posición de los satélites</b>: órbitas publicadas por CelesTrak (formato TLE), calculadas en el navegador con el modelo SGP4. Se actualizan cada 6 horas.",
    "<b>Mapa base</b>: imágenes Blue Marble y Black Marble (luces nocturnas) de la NASA.",
])
story.append(P("Los colores de los satélites", "h2"))
story.append(P("En el globo se ven 19 satélites reales. Su color dice qué papel tienen en los datos de la web:"))
table([
    ["Color", "Papel", "Ejemplos"],
    ["<font color='#059669'><b>Verde</b></font>", "Fuente directa: sus instrumentos miden lo que ves en el mapa.", "Terra (MODIS: vegetación y temperatura de superficie)"],
    ["<font color='#2563eb'><b>Azul</b></font>", "Calibración: sirve de referencia para ajustar a los demás.", "GPM Core (radar de lluvia de referencia de IMERG)"],
    ["<font color='#d97706'><b>Ámbar</b></font>", "Aporta datos a los productos combinados (IMERG, MERRA-2).", "Aqua, Suomi NPP, NOAA-20, MetOp-B/C, GCOM-W1, DMSP F17/F18, GOES, Meteosat, Himawari"],
    ["<font color='#64748b'><b>Gris</b></font>", "Satélites conocidos que no se usan en esta web (contexto).", "ISS, Landsat 9, SMAP, ICESat-2"],
], [2.2 * cm, 7 * cm, CW - 9.2 * cm])
story.append(P("Cómo se preparan", "h2"))
story.append(P(
    "Un programa en Python (<font face='Courier'>earthaccess</font>) descarga los 4 productos (4 × 288 archivos "
    "mensuales), los lleva a una misma grilla mundial de <b>0,5°</b> (720 × 360 celdas, unos 55 km en el "
    "ecuador) y los guarda comprimidos. El dataset completo ocupa unos <b>350 MB</b> y está dentro del repositorio "
    "del backend, así que basta con clonarlo para tenerlo. Hay además una muestra liviana de 2° para desarrollar "
    "rápido. Después se calculan las medias anuales, los mapas de tendencia y las series globales, y se exportan "
    "como imágenes PNG y archivos JSON que la web muestra."))
story.append(CondPageBreak(7 * cm))

# ----------------------------------------------------------------- 4
section("Capítulo 4", "Recorrido por la interfaz")
story.append(P("4.1 La portada", "h2"))
story.append(P(
    "Al abrir la web aparece el globo girando, rodeado de los satélites con su nombre. A la izquierda está la "
    "presentación y tres caminos: <b>Empezar a explorar</b>, <b>Ver una historia</b> o ir directo al "
    "<b>Caso de estudio: Amazonía</b>. Arriba a la derecha se cambia el idioma (ES / EN); por defecto usa el "
    "idioma del navegador."))
shot("portada.jpg", "Figura 1. Portada: el globo 3D con los satélites reales y los tres puntos de entrada.")
story.append(P("4.2 El explorador", "h2"))
story.append(P("Al empezar a explorar, la pantalla se organiza así:"))
shot("explorador.jpg", "Figura 2. El explorador: buscador de coordenadas, panel de pasos, leyenda de satélites, barra de capas y controles.")
table([
    ["Zona", "Qué tiene"],
    ["Barra superior", "Idioma, <b>Historias</b> (recorridos guiados), <b>Llamar</b> (hablar por voz con la IA) y <b>Preguntar</b> (chat)."],
    ["Arriba a la izquierda", "Ir a unas coordenadas exactas (lat, lon)."],
    ["Panel “Paso 1”", "Elegir un lugar: clic en el globo (un punto), <b>Seleccionar área</b> (dibujar un polígono) o <b>Región de datos</b>. El recuadro cian marca la Amazonía central, el caso de estudio en alta resolución."],
    ["Leyenda de satélites", "Colores por papel, cuántos hay de cada tipo, lista para volar a cada uno y el filtro “Solo los que miden &lt;capa&gt;”."],
    ["Barra de capas (abajo)", "Elegir <b>Global</b> o <b>Amazonía central</b> y una capa NASA: Lluvia, Vegetación, Temp. superficie, Temp. aire, Humedad."],
    ["Columna derecha", "Acercar / alejar, pausar el giro, día / noche, mostrar satélites, eventos en vivo, compartir la vista (enlace), metodología y ayuda."],
    ["Abajo a la derecha", "Botón <b>EarthScope AI</b> para abrir el asistente."],
], [3.6 * cm, CW - 3.6 * cm])
story.append(P("4.3 Capas, modos y lectura en palabras", "h2"))
story.append(P(
    "Al elegir una capa, el globo se pinta con el dato y aparece una línea de tiempo que se puede animar de 2001 a "
    "2024. Hay tres modos: <b>Media anual</b>, <b>Anomalía</b> (frente a lo normal; blanco = normal) y "
    "<b>Tendencia</b> (cambio por década; los colores tenues indican que no hay cambio claro). Debajo de la escala "
    "de colores, unas palabras dicen qué significa cada extremo (“aire frío … aire caliente”, “poca lluvia … mucha "
    "lluvia”) y una frase explica qué se está viendo."))
shot("tendencia.jpg", "Figura 3. Temperatura del aire en modo Tendencia, con el panel de análisis y “Dónde más cambió”.")
story.append(P("4.4 El panel de análisis", "h2"))
story.append(P(
    "A la izquierda aparece el análisis del lugar elegido (o de todo el planeta): la serie año a año con la línea de "
    "tendencia, el <b>veredicto</b> (creciente, decreciente o sin tendencia), las cifras clave (pendiente de Sen, "
    "cambio total, valor p), la <b>prueba de robustez</b> y un resumen <b>“En palabras simples”</b>. Cada cifra "
    "tiene un signo <b>?</b> que explica qué significa. En modo tendencia se muestra además la lista "
    "<b>“Dónde más cambió”</b>: las zonas del planeta con el cambio más fuerte."))
story.append(P("4.5 Analizar tu propio lugar", "h2"))
story.append(P(
    "Con un clic en el globo se analiza un punto (la celda de 0,5° que lo contiene). Con <b>Seleccionar área</b> se "
    "dibuja un polígono vértice a vértice (Enter cierra, Esc cancela, Ctrl/Cmd+Z deshace). El backend calcula la "
    "serie promedio de esa área y aplica la misma estadística. Si el área no tiene suficientes datos (por ejemplo, "
    "vegetación sobre el océano), la web lo explica en lugar de inventar un resultado."))
story.append(P("4.6 Comparador antes / después", "h2"))
story.append(P(
    "El botón <b>Antes / después</b> abre el mismo mapa en dos años, separados por una cortina que se arrastra con "
    "el ratón, el dedo o las flechas del teclado. Debajo muestra el promedio de cada año y la diferencia, con el "
    "aviso de que dos años sueltos pueden diferir por variabilidad natural."))
shot("comparador.jpg", "Figura 4. Comparador de temperatura del aire: 2001 a la izquierda y 2024 a la derecha.")
story.append(P("4.7 El asistente EarthScope AI", "h2"))
story.append(P(
    "El asistente es un agente de IA que <b>usa la ciencia del backend como herramientas</b>: cuando le preguntas "
    "por un lugar, lo analiza de verdad (no inventa cifras), mueve el globo, activa capas o muestra eventos. "
    "Responde en el idioma de la pregunta. Con <b>Llamar</b> se habla por voz: escucha, contesta en voz alta y "
    "se calla si lo interrumpes."))
shot("asistente.jpg", "Figura 5. El asistente con preguntas sugeridas. Se puede escribir o usar el micrófono.")
story.append(P("4.8 Más funciones", "h2"))
bullets([
    "<b>Historias guiadas</b>: el planeta se calienta, la Amazonía, el reverdecimiento de la Tierra y “lo que pasa ahora” con eventos en vivo.",
    "<b>Eventos naturales en vivo</b> (EONET) como marcadores en el globo, con su ficha.",
    "<b>Compartir</b>: un enlace que abre la misma vista exacta.",
    "<b>Metodología</b>: un panel con fuentes, métodos y advertencias.",
    "<b>Realidad virtual y mixta</b> (WebXR): en un visor compatible aparece el botón para entrar al globo en 3D inmersivo.",
    "<b>Proyección experimental 2025–2030</b>: mapas de una red neuronal, marcados siempre como experimentales.",
])
story.append(CondPageBreak(7 * cm))

# ----------------------------------------------------------------- 5
section("Capítulo 5", "Cómo está construido")
story.append(P(
    "EarthScope está dividido en dos partes que viven en <b>dos repositorios</b> de GitHub: el <b>frontend</b> "
    "(la web que ve el usuario) y el <b>backend</b> (los datos, la ciencia y la API). La regla principal de la "
    "arquitectura es: <b>la web nunca calcula ciencia</b>. Toda cifra científica sale del backend."))
story.append(P("Arquitectura", "h2"))
arch = [
    ["Navegador", "→", "Frontend (Next.js)", "→", "API (FastAPI)", "→", "Ciencia (science/)", "→", "Dataset NASA"],
    ["Globo 3D, paneles, voz", "", "Páginas, mapas PNG y series JSON ya calculadas; proxy /backend", "", "Análisis de áreas, agente IA, eventos, satélites, simulaciones", "", "Mann-Kendall, Sen, robustez, áreas, escenarios", "", "Grilla 0,5°, 2001–2024, comprimido en git"],
]
cw = [2.6 * cm, 0.5 * cm, 3.2 * cm, 0.5 * cm, 3.2 * cm, 0.5 * cm, 2.6 * cm, 0.5 * cm, CW - 13.6 * cm]
data = [[Paragraph(f"<b>{c}</b>" if i == 0 else c, ParagraphStyle("a", parent=S["cell"], alignment=TA_CENTER,
          textColor=colors.white if (i == 0 and j % 2 == 0) else (CYAN if c == "→" else INK),
          fontSize=12 if c == "→" else 8.5)) for j, c in enumerate(r)] for i, r in enumerate(arch)]
t = Table(data, colWidths=cw)
t.setStyle(TableStyle([("BACKGROUND", (j, 0), (j, 0), NAVY) for j in range(0, 9, 2)] +
                      [("BACKGROUND", (j, 1), (j, 1), SOFT) for j in range(0, 9, 2)] +
                      [("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
story.append(t); story.append(P("Figura 6. Recorrido de una consulta: del clic del usuario al dato NASA.", "cap"))
story.append(P("Tecnologías del frontend", "h2"))
table([
    ["Tecnología", "Para qué se usa"],
    ["Next.js 16 + React 19 + TypeScript", "Estructura de la web, páginas y proxy hacia la API."],
    ["Tailwind CSS 4", "Estilos (estética holográfica oscura)."],
    ["react-globe.gl + three.js", "El globo 3D, las capas, los polígonos y los satélites."],
    ["satellite.js", "Calcula la posición actual de cada satélite (SGP4) a partir de sus órbitas TLE."],
    ["Motion", "Animaciones y transiciones."],
    ["Zustand", "Estado compartido (selección, área, historias, asistente)."],
    ["Recharts", "Gráficas de series de tiempo."],
    ["WebXR", "Modo de realidad virtual y mixta."],
    ["Web Speech / ElevenLabs", "Voz del asistente (con respaldo en la voz del sistema)."],
], [5 * cm, CW - 5 * cm])
story.append(P("Tecnologías del backend", "h2"))
table([
    ["Tecnología", "Para qué se usa"],
    ["Python 3 + FastAPI + Uvicorn", "La API: /api/v1/area/analyze, /forecast, /events, /satellites, /agent, /simulate…"],
    ["NumPy, pandas, SciPy", "Cálculo sobre la grilla y series de tiempo."],
    ["pymannkendall, statsmodels", "Pruebas de tendencia (Mann-Kendall estacional, Sen, OLS con AR(1))."],
    ["earthaccess, h5py, pyhdf", "Descarga y lectura de los archivos NASA (HDF5 / HDF4)."],
    ["PyTorch", "Red neuronal U-Net de la proyección experimental."],
    ["LangChain + Gemini / Claude", "Agente conversacional que usa la ciencia como herramientas."],
    ["ElevenLabs / Gemini", "Voz a texto en las llamadas."],
], [5 * cm, CW - 5 * cm])
story.append(P("Los repositorios", "h2"))
table([
    ["Repositorio", "Contenido"],
    ["RK_Vanguard_EarthScopeAI (frontend)", "<font face='Courier'>web/</font> (Next.js), <font face='Courier'>docs/</font> (visión, casos de uso, arquitectura, rúbrica de historias de usuario, backlog)."],
    ["RK_Vanguard_EarthScopeAI-BACK (backend)", "<font face='Courier'>science/</font>, <font face='Courier'>api/</font>, <font face='Courier'>export/</font>, <font face='Courier'>model/</font>, <font face='Courier'>data/dataset</font> (completo) y <font face='Courier'>data/sample</font> (muestra), pruebas y CI."],
], [5.6 * cm, CW - 5.6 * cm])
story.append(P("Cómo correrlo en local", "h2"))
code = ("# Backend (puerto 8000)\n"
        "pip install -r requirements-backend.txt      # + requirements-agent.txt para la IA\n"
        "uvicorn api.main:app --port 8000\n\n"
        "# Frontend (puerto 3000)\n"
        "cd web && npm install && npm run dev")
t = Table([[Paragraph(code.replace("\n", "<br/>"), S["code"])]], colWidths=[CW])
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")), ("LEFTPADDING", (0, 0), (-1, -1), 10),
                       ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
story.append(t); story.append(Spacer(1, 6))
story.append(P(
    "Las claves de la IA y la voz (<font face='Courier'>GOOGLE_API_KEY</font>, <font face='Courier'>ELEVENLABS_API_KEY</font>) "
    "van en un archivo <font face='Courier'>.env</font> que <b>nunca se sube a git</b>. Sin ellas, la web y el análisis "
    "funcionan igual; solo el asistente queda desactivado."))
story.append(CondPageBreak(7 * cm))

# ----------------------------------------------------------------- 6
section("Capítulo 6", "La ciencia por dentro")
story.append(P("Tendencias", "h2"))
bullets([
    "<b>Mann-Kendall estacional</b>: prueba si una serie sube o baja de forma consistente, comparando cada mes con el mismo mes de otros años (así el ciclo de las estaciones no confunde). Incluye la corrección de Hirsch–Slack por autocorrelación.",
    "<b>Pendiente de Sen</b>: la mediana de todas las pendientes entre pares de años. Dice “cuánto por año” sin que un año raro la distorsione.",
    "<b>Comprobación con regresión</b> (OLS con errores AR(1)) como segunda opinión.",
    "<b>Robustez</b>: se repite el análisis sin los 2 primeros y sin los 2 últimos años.",
])
story.append(P("Series globales y por área", "h2"))
bullets([
    "Promedios ponderados por <b>cos(latitud)</b>: las celdas cerca de los polos son más pequeñas y pesan menos.",
    "Serie global sobre una <b>máscara fija</b> de celdas con ≥ 90 % de meses válidos, para que la cobertura cambiante no cree tendencias falsas.",
    "Un área cuenta un mes solo si ≥ 50 % de su superficie tiene dato, y se exigen ≥ 36 meses válidos.",
    "Mapa de tendencias: Mann-Kendall + Sen en cada celda sobre sus 24 medias anuales (se exigen ≥ 15 años válidos).",
    "“Dónde más cambió”: bloques de 5° con tendencia significativa, separados por distancia sobre la esfera para no repetir la misma zona.",
])
story.append(P("Proyección experimental 2025–2030", "h2"))
story.append(P(
    "Una red neuronal convolucional tipo <b>U-Net</b> aprende a predecir el mes siguiente a partir de los 12 "
    "anteriores (anomalías de todas las variables). Para llegar a 2030 se encadena mes a mes. Se entrena un "
    "<b>conjunto de modelos</b> (ensemble): la media es la proyección y la dispersión entre modelos indica la "
    "incertidumbre (la web la muestra más transparente donde hay más duda)."))
box("La red solo está validada para predecir <b>1 mes</b> hacia adelante. No tiene validación a varios años ni "
    "escenarios de emisiones, y con el tiempo tiende al clima promedio. Por eso la web y el asistente la llaman "
    "siempre <b>proyección experimental</b>, nunca pronóstico.", title="Advertencia", bg=AMBER_BG, border=AMBER)
story.append(P("Simulaciones “¿y si…?” (base para la próxima fase)", "h2"))
story.append(P(
    "Un escenario responde: <i>“si cambia X, ¿qué estimaría un modelo para Y?”</i>. El backend tiene un registro de "
    "modelos de escenario con una <b>puerta de validación</b>: solo se puede simular un modelo cuyo R² fuera de "
    "muestra (dejando un año fuera cada vez) sea ≥ 0,3."))
table([
    ["Modelo", "Pregunta", "Validación", "Estado"],
    ["Temperatura de superficie vs lluvia (estación seca, Amazonía central)", "Si la lluvia de julio a octubre cambiara un X %, ¿qué temperatura del suelo estimaría el modelo?", "R² ≈ 0,49", "<font color='#059669'><b>Validado</b></font>"],
    ["Vegetación (EVI) vs lluvia", "¿La vegetación responde a la lluvia de la estación seca?", "R² ≤ 0,1", "<font color='#c2410c'><b>Sin habilidad</b></font> (no se ofrece)"],
], [4.6 * cm, 6.2 * cm, 2.2 * cm, CW - 13 * cm])
story.append(P(
    "Ejemplo: con un 20 % menos de lluvia, el modelo estima <b>+0,47 °C</b> en la temperatura de superficie, con un "
    "intervalo de predicción del 95 %. Si la entrada se sale de lo observado, la respuesta avisa que es una "
    "extrapolación. Cada resultado lleva la etiqueta <b>escenario</b>, sus supuestos y la aclaración de que es una "
    "asociación estadística, no una prueba de causa."))
story.append(CondPageBreak(7 * cm))

# ----------------------------------------------------------------- 7
section("Capítulo 7", "Lo que dicen los datos (2001–2024)")
story.append(P("Promedios ponderados por área de todo el planeta, con prueba de Mann-Kendall (α = 0,05):"))
table([
    ["Variable", "Veredicto", "Cambio (Sen)", "Robustez", "% del área con tendencia"],
    ["Temperatura del aire (MERRA-2)", "Creciente (p = 0,005)", "+0,145 °C / década", "Frágil: sin 2023–2024, p = 0,053", "42 %"],
    ["Vegetación EVI (tierra)", "Creciente (p &lt; 0,001)", "+0,006 / década", "Robusta", "46 % (reverdecimiento)"],
    ["Humedad relativa (MERRA-2)", "Creciente (p &lt; 0,001)", "+0,33 puntos % / década", "Robusta", "38 %"],
    ["Lluvia (IMERG)", "Creciente (p = 0,026)", "+0,030 mm/día / década", "Frágil: sin 2023–2024, p = 0,094", "20 %"],
    ["Temperatura de superficie (tierra)", "Sin tendencia (p = 0,18)", "+0,11 °C / década", "Sin 2023–2024 sí es significativa", "19 %"],
], [3.8 * cm, 3.1 * cm, 3.2 * cm, 3.8 * cm, CW - 13.9 * cm])
story.append(P("Lo que muestran los mapas", "h2"))
bullets([
    "<b>Temperatura del aire</b>: calentamiento casi general, más fuerte en el Ártico; enfriamiento en partes del océano Austral.",
    "<b>Vegetación</b>: reverdecimiento extendido, sobre todo en China, India y Europa, con zonas de pérdida dispersas.",
    "<b>Lluvia</b>: patrones regionales mezclados, con más señal sobre el océano que sobre la tierra.",
    "Ejemplo de área: en la <b>península ibérica</b> (416 celdas) el aire se calienta <b>+0,58 °C por década</b>, de forma significativa y robusta.",
])
story.append(P("Cautelas", "h2"))
bullets([
    "“No robusta” significa que la conclusión depende de los años más recientes (2023–2024 fueron récord). Se informa así, sin exagerar.",
    "La humedad y la temperatura del aire vienen de un reanálisis: coherentes, pero no son mediciones directas.",
    "El aumento global de humedad relativa en MERRA-2 debería contrastarse con otras fuentes (por ejemplo AIRS) antes de tomarlo como conclusión.",
    "Una tendencia describe lo que pasó; no explica por sí sola la causa.",
])
story.append(P("Trabajo en equipo", "h2"))
story.append(P(
    "El trabajo se organiza con <b>historias de usuario</b> (HU) evaluadas con una rúbrica (mínimo 13 de 16 puntos). "
    "Cada HU se desarrolla en una rama <font face='Courier'>feat/HU-xx-…</font> que sale de <b>Develop</b> y vuelve "
    "con un pull request. <b>main</b> guarda solo versiones estables. La documentación completa está en la carpeta "
    "<font face='Courier'>docs/</font> de cada repositorio."))
story.append(CondPageBreak(7 * cm))

# ----------------------------------------------------------------- 8
section("Capítulo 8", "Glosario")
gl = [
    ["Anomalía", "Diferencia entre un valor y lo normal (el promedio 2001–2024)."],
    ["API", "Puerta por la que la web le pide datos y cálculos al backend."],
    ["Backend / Frontend", "La parte del servidor (datos, ciencia) y la parte que ve el usuario (la web)."],
    ["Celda / grilla de 0,5°", "El planeta dividido en 720 × 360 cuadritos de medio grado (unos 55 km en el ecuador)."],
    ["Ensemble", "Varios modelos entrenados igual con distinto azar; su desacuerdo mide la incertidumbre."],
    ["EVI", "Índice de vegetación mejorado: qué tan verde y densa está la vegetación (0 a 1)."],
    ["Extrapolación", "Usar un modelo fuera del rango de datos con el que se construyó; menos fiable."],
    ["Mann-Kendall", "Prueba estadística que detecta si una serie sube o baja de forma consistente."],
    ["Pendiente de Sen", "Estimación robusta de cuánto cambia algo por año."],
    ["R² fuera de muestra", "Qué tan bien predice un modelo datos que no usó para aprender (1 = perfecto, 0 = nada)."],
    ["Reanálisis", "Reconstrucción del clima que combina un modelo con millones de observaciones."],
    ["Robustez", "Si la conclusión se mantiene al quitar los años de los extremos."],
    ["Significativo", "Muy poco probable que se deba al azar (valor p &lt; 0,05)."],
    ["TLE / SGP4", "Formato de las órbitas de satélites y el modelo que calcula su posición."],
    ["Valor p", "Probabilidad de ver un resultado así por puro azar si no hubiera cambio."],
]
table([["Término", "Significado"]] + gl, [4 * cm, CW - 4 * cm])
story.append(P("Créditos", "h2"))
story.append(P(
    "EarthScope AI fue creado por el equipo <b>RoboKids</b> para el NASA Space Apps Challenge 2026. Datos: NASA "
    "GES DISC (GPM IMERG, MERRA-2), LP DAAC (MODIS), NASA EONET, CelesTrak y NASA Visible Earth. Los datos de la NASA "
    "son públicos; la NASA no respalda este proyecto."))
box("Hay algunos secretos escondidos en el globo. Pista: escribe el nombre de alguien del equipo "
    "(<b>grecox</b>, <b>korhan</b> o <b>araña</b>) mientras miras el planeta.", title="Para los curiosos")

doc.multiBuild(story)
print("OK", OUT)
