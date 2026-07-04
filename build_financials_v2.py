from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

output_path = "/sessions/exciting-sleepy-cerf/mnt/outputs/Project_Fairway_Financial_Analysis.pdf"

# Colors
DARK_GREEN = HexColor("#1B4332")
MED_GREEN = HexColor("#2D6A4F")
LIGHT_GREEN = HexColor("#D8F3DC")
ACCENT = HexColor("#40916C")
LIGHT_GRAY = HexColor("#F8F9FA")
MED_GRAY = HexColor("#DEE2E6")
DARK_GRAY = HexColor("#495057")
GOLD = HexColor("#B5651D")
LIGHT_GOLD = HexColor("#FFF3E0")
AMBER = HexColor("#D4A017")

styles = getSampleStyleSheet()

styles.add(ParagraphStyle('DocTitle', parent=styles['Title'], fontSize=28, textColor=DARK_GREEN, spaceAfter=6, fontName='Helvetica-Bold', leading=34))
styles.add(ParagraphStyle('DocSubtitle', parent=styles['Normal'], fontSize=14, textColor=MED_GREEN, spaceAfter=20, fontName='Helvetica', leading=18))
styles.add(ParagraphStyle('SectionHead', parent=styles['Heading1'], fontSize=18, textColor=DARK_GREEN, spaceBefore=24, spaceAfter=12, fontName='Helvetica-Bold', leading=22))
styles.add(ParagraphStyle('SubHead', parent=styles['Heading2'], fontSize=13, textColor=MED_GREEN, spaceBefore=16, spaceAfter=8, fontName='Helvetica-Bold', leading=16))
styles.add(ParagraphStyle('SubHead2', parent=styles['Heading3'], fontSize=11, textColor=ACCENT, spaceBefore=12, spaceAfter=6, fontName='Helvetica-Bold', leading=14))
styles.add(ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, textColor=DARK_GRAY, spaceAfter=8, fontName='Helvetica', leading=14))
styles.add(ParagraphStyle('BulletItem', parent=styles['Normal'], fontSize=10, textColor=DARK_GRAY, spaceAfter=4, fontName='Helvetica', leading=14, leftIndent=20, bulletIndent=10))
styles.add(ParagraphStyle('TableHeader', parent=styles['Normal'], fontSize=9, textColor=white, fontName='Helvetica-Bold', leading=12))
styles.add(ParagraphStyle('TableCell', parent=styles['Normal'], fontSize=9, textColor=DARK_GRAY, fontName='Helvetica', leading=12))
styles.add(ParagraphStyle('TableCellBold', parent=styles['Normal'], fontSize=9, textColor=DARK_GREEN, fontName='Helvetica-Bold', leading=12))
styles.add(ParagraphStyle('CalloutText', parent=styles['Normal'], fontSize=10, textColor=DARK_GREEN, fontName='Helvetica-Oblique', leading=14, leftIndent=15, rightIndent=15, spaceBefore=8, spaceAfter=8))
styles.add(ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=MED_GRAY, fontName='Helvetica', alignment=TA_CENTER))
styles.add(ParagraphStyle('PhaseCallout', parent=styles['Normal'], fontSize=10, textColor=DARK_GREEN, fontName='Helvetica-Bold', leading=14, leftIndent=15, rightIndent=15, spaceBefore=6, spaceAfter=6))

def make_table(data, col_widths, header_color=DARK_GREEN):
    t = Table(data, colWidths=col_widths)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), header_color),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.5, MED_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT_GRAY, white]),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t

def make_total_table(data, col_widths, header_color=DARK_GREEN):
    t = Table(data, colWidths=col_widths)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), header_color),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.5, MED_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [LIGHT_GRAY, white]),
        ('BACKGROUND', (0, -1), (-1, -1), LIGHT_GREEN),
        ('TEXTCOLOR', (0, -1), (-1, -1), DARK_GREEN),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t

# Helpers
P = lambda text, style='TableCell': Paragraph(text, styles[style])
PH = lambda text: Paragraph(text, styles['TableHeader'])
PB = lambda text: Paragraph(text, styles['TableCellBold'])

doc = SimpleDocTemplate(output_path, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch, leftMargin=0.85*inch, rightMargin=0.85*inch)
story = []

# ========== TITLE PAGE ==========
story.append(Spacer(1, 1.5*inch))
story.append(Paragraph("Project Fairway", styles['DocTitle']))
story.append(Paragraph("Financial Analysis & Cost Structure", styles['DocSubtitle']))
story.append(Spacer(1, 0.3*inch))
story.append(HRFlowable(width="40%", thickness=2, color=ACCENT, spaceAfter=20))
story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("Prepared by: Russell Evans", styles['Body']))
story.append(Paragraph("Date: July 2026", styles['Body']))
story.append(Paragraph("Version: 2.0", styles['Body']))
story.append(Spacer(1, 0.5*inch))
story.append(Paragraph(
    "Phase 1 Investment: Two premium simulator bays. All figures in this document reflect the Phase 1 "
    "initial capital requirement only. Phase 2 expansion (Bays 3 &amp; 4) is triggered by validated demand.",
    styles['PhaseCallout']
))
story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("Contents:", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> Section 1: Phase 1 Build-Out Budget (Line-Item)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Section 2: Simulator Ecosystem Comparison", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Section 3: Monthly Operating Costs & Break-Even", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Section 4: Beverage Strategy & Bunny Man Brewing Partnership", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Section 5: Phase 2 Expansion Trigger & Costs", styles['BulletItem']))
story.append(PageBreak())

# ========== SECTION 1: BUILD-OUT BUDGET ==========
story.append(Paragraph("Section 1: Phase 1 Build-Out Budget", styles['SectionHead']))
story.append(Paragraph(
    "This section provides a detailed line-item estimate for the Phase 1 build-out: two premium simulator bays, "
    "lounge, and supporting infrastructure. This is the initial capital requirement for launch. "
    "Three scenarios are presented: Conservative (lean MVP), Target (recommended premium build), and Premium (top-of-line). "
    "All estimates assume a raw commercial shell requiring full build-out.",
    styles['Body']
))
story.append(Paragraph(
    "Phase 1 scope: 2 bays, reception/lounge, restroom, mechanical room (~1,200-1,600 sq ft).",
    styles['PhaseCallout']
))

# --- Simulator Technology ---
story.append(Paragraph("Simulator Technology", styles['SubHead']))
story.append(Paragraph(
    "The core technology package for each bay: launch monitor, software, projector, impact screen, enclosure, and computing.",
    styles['Body']
))

sim_data = [
    [PH("<b>Item</b>"), PH("<b>Qty</b>"), PH("<b>Conservative</b>"), PH("<b>Target</b>"), PH("<b>Premium</b>")],
    [P("Launch Monitor"), P("2"), P("$7,000-10,000"), P("$16,000-20,000"), P("$30,000-40,000")],
    [P("Simulator Software License"), P("2"), P("$1,000-2,000"), P("$2,000-4,000"), P("$4,000-6,000")],
    [P("Short-Throw Projector (4K)"), P("2"), P("$3,000-5,000"), P("$6,000-10,000"), P("$12,000-18,000")],
    [P("Impact Screen + Frame"), P("2"), P("$2,000-3,000"), P("$4,000-6,000"), P("$6,000-8,000")],
    [P("Enclosure / Bay Frame"), P("2"), P("$3,000-5,000"), P("$6,000-10,000"), P("$10,000-14,000")],
    [P("Gaming PC (per bay)"), P("2"), P("$3,000-4,000"), P("$4,000-6,000"), P("$6,000-8,000")],
    [P("Auto-Tee System"), P("2"), P("$2,000-4,000"), P("$5,000-8,000"), P("$8,000-12,000")],
    [P("Ball Return System"), P("2"), P("$3,000-5,000"), P("$6,000-10,000"), P("$10,000-15,000")],
    [P("Hitting Mat (premium turf)"), P("2"), P("$800-1,200"), P("$1,500-2,500"), P("$2,500-4,000")],
    [P("Bay Dividers (acoustic)"), P("1"), P("$1,500-2,500"), P("$3,000-5,000"), P("$5,000-8,000")],
    [PB("<b>Subtotal: Simulator Tech</b>"), P(""), PB("<b>$26,300-41,700</b>"), PB("<b>$53,500-81,500</b>"), PB("<b>$93,500-133,000</b>")],
]
story.append(make_total_table(sim_data, [2.2*inch, 0.5*inch, 1.4*inch, 1.4*inch, 1.4*inch]))

# --- Construction & Build-Out ---
story.append(Spacer(1, 12))
story.append(Paragraph("Construction & Build-Out", styles['SubHead']))
story.append(Paragraph(
    "Assumes a raw or semi-finished commercial space requiring framing, electrical, HVAC, and finish work.",
    styles['Body']
))

const_data = [
    [PH("<b>Item</b>"), PH("<b>Conservative</b>"), PH("<b>Target</b>"), PH("<b>Premium</b>")],
    [P("Framing & Drywall"), P("$8,000-12,000"), P("$15,000-22,000"), P("$22,000-30,000")],
    [P("Electrical (panel, circuits, outlets)"), P("$8,000-12,000"), P("$12,000-18,000"), P("$18,000-25,000")],
    [P("HVAC (supplemental cooling)"), P("$6,000-10,000"), P("$10,000-16,000"), P("$16,000-24,000")],
    [P("Plumbing (restroom, sink, beverage area)"), P("$4,000-7,000"), P("$7,000-12,000"), P("$12,000-16,000")],
    [P("Flooring (turf, LVP, concrete polish)"), P("$4,000-6,000"), P("$6,000-10,000"), P("$10,000-15,000")],
    [P("Painting & Wall Finishes"), P("$2,000-3,000"), P("$3,000-5,000"), P("$5,000-8,000")],
    [P("Lighting (ambient + bay lighting)"), P("$3,000-5,000"), P("$5,000-8,000"), P("$8,000-12,000")],
    [P("Acoustic Treatment"), P("$2,000-4,000"), P("$4,000-7,000"), P("$7,000-12,000")],
    [P("Permits & Inspections"), P("$2,000-4,000"), P("$3,000-5,000"), P("$4,000-6,000")],
    [PB("<b>Subtotal: Construction</b>"), PB("<b>$39,000-63,000</b>"), PB("<b>$65,000-103,000</b>"), PB("<b>$102,000-148,000</b>")],
]
story.append(make_total_table(const_data, [2.4*inch, 1.6*inch, 1.6*inch, 1.6*inch]))

story.append(PageBreak())

# --- Furniture & Decor ---
story.append(Paragraph("Furniture, Decor & Atmosphere", styles['SubHead']))
story.append(Paragraph(
    "The elements that create the 'luxury golf barn' feel — warm, modern, comfortable. This is what separates "
    "Project Fairway from the dark, dingy competitor experience.",
    styles['Body']
))

furn_data = [
    [PH("<b>Item</b>"), PH("<b>Conservative</b>"), PH("<b>Target</b>"), PH("<b>Premium</b>")],
    [P("Bay Seating (leather recliners/lounge, per bay)"), P("$2,000-3,000"), P("$4,000-6,000"), P("$6,000-10,000")],
    [P("Lounge Furniture (reception area)"), P("$2,000-4,000"), P("$5,000-8,000"), P("$8,000-14,000")],
    [P("Wood Accent Walls / Shelving"), P("$1,000-2,000"), P("$3,000-5,000"), P("$5,000-8,000")],
    [P("Decorative Lighting"), P("$500-1,000"), P("$1,500-3,000"), P("$3,000-5,000")],
    [P("Signage (exterior + interior)"), P("$1,000-2,000"), P("$2,500-4,000"), P("$4,000-7,000")],
    [P("Beverage Area (bar top, mini fridge, taps, glassware)"), P("$1,000-2,000"), P("$3,000-5,000"), P("$5,000-8,000")],
    [P("Bluetooth Speakers (per bay)"), P("$300-500"), P("$600-1,000"), P("$1,000-2,000")],
    [P("Phone Charging Stations"), P("$200-400"), P("$400-800"), P("$800-1,200")],
    [P("Misc Decor (art, plants, rugs)"), P("$500-1,000"), P("$1,500-3,000"), P("$3,000-5,000")],
    [PB("<b>Subtotal: Furniture & Decor</b>"), PB("<b>$8,500-15,900</b>"), PB("<b>$21,000-35,800</b>"), PB("<b>$35,800-60,200</b>")],
]
story.append(make_total_table(furn_data, [2.8*inch, 1.4*inch, 1.4*inch, 1.4*inch]))

# --- Technology & Operations ---
story.append(Spacer(1, 12))
story.append(Paragraph("Technology & Operations", styles['SubHead']))
story.append(Paragraph(
    "The systems that enable the automated, self-service experience and your Salesforce-powered Golfer360 platform.",
    styles['Body']
))

tech_data = [
    [PH("<b>Item</b>"), PH("<b>Conservative</b>"), PH("<b>Target</b>"), PH("<b>Premium</b>")],
    [P("Networking (router, switches, CAT6, WiFi AP)"), P("$1,500-2,500"), P("$2,500-4,000"), P("$4,000-6,000")],
    [P("Security Cameras"), P("$1,000-2,000"), P("$2,000-3,500"), P("$3,500-5,000")],
    [P("Access Control (smart locks, member entry)"), P("$1,500-3,000"), P("$3,000-5,000"), P("$5,000-8,000")],
    [P("Welcome Display / Check-in Kiosk"), P("$500-1,000"), P("$1,500-3,000"), P("$3,000-5,000")],
    [P("POS System / Payment Terminal"), P("$500-1,000"), P("$1,000-2,000"), P("$2,000-3,000")],
    [P("TV/Monitor (lounge display)"), P("$500-800"), P("$1,000-2,000"), P("$2,000-4,000")],
    [PB("<b>Subtotal: Technology</b>"), PB("<b>$5,500-10,300</b>"), PB("<b>$11,000-19,500</b>"), PB("<b>$19,500-31,000</b>")],
]
story.append(make_total_table(tech_data, [2.8*inch, 1.4*inch, 1.4*inch, 1.4*inch]))

# --- Licensing & Soft Costs ---
story.append(Spacer(1, 12))
story.append(Paragraph("Licensing, Soft Costs & Working Capital", styles['SubHead']))

soft_data = [
    [PH("<b>Item</b>"), PH("<b>Conservative</b>"), PH("<b>Target</b>"), PH("<b>Premium</b>")],
    [P("Business Formation & Legal"), P("$2,000-4,000"), P("$4,000-7,000"), P("$7,000-12,000")],
    [P("Virginia ABC License (Wine & Beer On-Premises)"), P("$300-500"), P("$300-500"), P("$300-500")],
    [P("ABC Application & Compliance Costs"), P("$500-1,000"), P("$1,000-2,000"), P("$1,500-3,000")],
    [P("Commercial Insurance (first year)"), P("$3,500-5,500"), P("$5,500-9,000"), P("$9,000-14,000")],
    [P("Liquor Liability Insurance (add-on)"), P("$500-1,000"), P("$800-1,500"), P("$1,000-2,000")],
    [P("Lease Deposit (first + last + security)"), P("$5,000-10,000"), P("$8,000-15,000"), P("$12,000-20,000")],
    [P("Initial Beer Inventory (Bunny Man + select)"), P("$500-1,000"), P("$1,000-2,000"), P("$2,000-3,000")],
    [P("Marketing & Launch"), P("$2,000-4,000"), P("$5,000-10,000"), P("$10,000-20,000")],
    [P("Working Capital (3-month runway)"), P("$15,000-25,000"), P("$25,000-40,000"), P("$40,000-60,000")],
    [P("Contingency (10%)"), P("$8,500-14,000"), P("$16,000-27,000"), P("$27,000-40,000")],
    [PB("<b>Subtotal: Licensing & Soft Costs</b>"), PB("<b>$37,800-66,000</b>"), PB("<b>$66,600-114,000</b>"), PB("<b>$109,800-174,500</b>")],
]
story.append(make_total_table(soft_data, [2.8*inch, 1.4*inch, 1.4*inch, 1.4*inch]))

story.append(PageBreak())

# --- GRAND TOTAL ---
story.append(Paragraph("Phase 1 Total Investment Summary", styles['SubHead']))
story.append(Paragraph(
    "This is the total capital required to open the doors with two fully operational premium bays, "
    "beverage service, and the Salesforce technology platform running.",
    styles['Body']
))

grand_data = [
    [PH("<b>Category</b>"), PH("<b>Conservative</b>"), PH("<b>Target</b>"), PH("<b>Premium</b>")],
    [P("Simulator Technology (2 bays)"), P("$26,300-41,700"), P("$53,500-81,500"), P("$93,500-133,000")],
    [P("Construction & Build-Out"), P("$39,000-63,000"), P("$65,000-103,000"), P("$102,000-148,000")],
    [P("Furniture & Decor"), P("$8,500-15,900"), P("$21,000-35,800"), P("$35,800-60,200")],
    [P("Technology & Operations"), P("$5,500-10,300"), P("$11,000-19,500"), P("$19,500-31,000")],
    [P("Licensing & Soft Costs"), P("$37,800-66,000"), P("$66,600-114,000"), P("$109,800-174,500")],
    [PB("<b>PHASE 1 TOTAL INVESTMENT</b>"), PB("<b>$117,100-196,900</b>"), PB("<b>$217,100-353,800</b>"), PB("<b>$360,600-546,700</b>")],
]
story.append(make_total_table(grand_data, [2.4*inch, 1.5*inch, 1.5*inch, 1.5*inch]))

story.append(Spacer(1, 12))
story.append(Paragraph(
    "Recommendation: The Target scenario ($217K-$354K) delivers the premium experience described in the concept "
    "document without over-investing before proving the market. This is the Phase 1 ask for investors.",
    styles['CalloutText']
))
story.append(Paragraph(
    "Phase 2 expansion (Bays 3 &amp; 4) is estimated at an additional $80K-$150K and is self-funded from "
    "Phase 1 profits once utilization consistently exceeds 55%. See Section 5.",
    styles['PhaseCallout']
))

story.append(PageBreak())

# ========== SECTION 2: SIMULATOR ECOSYSTEM COMPARISON ==========
story.append(Paragraph("Section 2: Simulator Ecosystem Comparison", styles['SectionHead']))
story.append(Paragraph(
    "Choosing the right technology stack is the most consequential decision after location. "
    "The launch monitor determines data accuracy, tracking reliability, and customer experience. "
    "Everything else builds on top of that foundation.",
    styles['Body']
))

# --- Launch Monitors ---
story.append(Paragraph("Launch Monitors", styles['SubHead']))
story.append(Paragraph(
    "This is the core sensor that tracks ball flight and club data. The system seen at the Annandale competitor "
    "was likely a budget overhead camera system. Here's how the options compare:",
    styles['Body']
))

lm_data = [
    [PH("<b>System</b>"), PH("<b>Type</b>"), PH("<b>Price/Unit</b>"), PH("<b>Detection Rate</b>"), PH("<b>Data Points</b>")],
    [P("Uneekor EYE XO2"), P("Overhead camera"), P("$8,000-10,000"), P("~99%"), P("Ball + Club")],
    [P("Uneekor QED"), P("Overhead camera"), P("$5,000-7,000"), P("~97%"), P("Ball + Club")],
    [P("Foresight GCHawk"), P("Overhead photometric"), P("$10,000-13,000"), P("~99%"), P("Ball + Club")],
    [P("TrackMan iO"), P("Overhead radar + camera"), P("$15,000-20,000"), P("~99.5%"), P("Ball + Club (fullest)")],
    [P("Bravo (Korean)"), P("Overhead camera"), P("$4,000-6,000"), P("~92-95%"), P("Ball (limited club)")],
    [P("Budget Chinese (Rapsodo-type)"), P("Overhead camera"), P("$2,000-4,000"), P("~85-92%"), P("Ball only")],
]
story.append(make_table(lm_data, [1.5*inch, 1.3*inch, 1.2*inch, 1.1*inch, 1.4*inch]))

story.append(Spacer(1, 8))
story.append(Paragraph(
    "At 85-92% detection, you get 1-2 missed shots per 10 swings (the Annandale experience). "
    "At 99%+, it's maybe 1 miss per 100. For a premium club charging $55-70/hr, missed shots are unacceptable. "
    "The Uneekor EYE XO2 is the sweet spot: price vs. reliability vs. data richness for Golfer360.",
    styles['CalloutText']
))

story.append(Spacer(1, 8))
story.append(Paragraph("Ready Indicator (Proprietary Enhancement)", styles['SubHead2']))
story.append(Paragraph(
    "The Uneekor systems include a status LED that indicates tracking readiness. For Project Fairway, "
    "this will be enhanced with a visible projected green light on the ball/tee position — intuitive and "
    "unmistakable. This is a relatively simple custom addition (LED strip + sensor feedback from the Uneekor API) "
    "that reinforces the premium, 'everything just works' experience and differentiates from competitors.",
    styles['Body']
))

# --- Simulator Software ---
story.append(Paragraph("Simulator Software", styles['SubHead']))

sw_data = [
    [PH("<b>Software</b>"), PH("<b>Annual Cost</b>"), PH("<b>Courses</b>"), PH("<b>Features</b>"), PH("<b>Notes</b>")],
    [P("E6 Connect"), P("$3,000-5,000/yr"), P("100+"), P("Courses, range, mini-games, multiplayer"), P("Industry standard for commercial; clean UI")],
    [P("GSPro"), P("$250-500/yr"), P("200+"), P("Courses, range, games, customizable"), P("Budget-friendly; community courses; less polished")],
    [P("TGC 2019"), P("$1,000-2,000/yr"), P("150,000+"), P("Courses, range, tournaments"), P("Most courses; slightly dated graphics")],
    [P("TrackMan (proprietary)"), P("$3,000-4,000/yr"), P("50+"), P("Courses, range, combine, coaching"), P("Only works with TrackMan hardware")],
    [P("Uneekor (proprietary)"), P("Included w/hardware"), P("20+"), P("Range, putting, games"), P("Basic; usually paired with E6 or GSPro")],
]
story.append(make_table(sw_data, [1.3*inch, 1.2*inch, 0.7*inch, 1.8*inch, 1.7*inch]))

story.append(Spacer(1, 8))
story.append(Paragraph(
    "Recommendation: E6 Connect for the customer-facing experience (clean, professional, commercial-grade). "
    "GSPro as a secondary option for course variety. Both work with Uneekor hardware.",
    styles['CalloutText']
))

story.append(PageBreak())

# --- Auto-Tee & Ball Return ---
story.append(Paragraph("Auto-Tee & Ball Return Systems", styles['SubHead']))
story.append(Paragraph(
    "The combination of sloped floor + ball collection + automatic tee creates a seamless hitting experience. "
    "This feature was the standout observation from the competitor visit — it keeps golfers in flow.",
    styles['Body']
))

tee_data = [
    [PH("<b>System</b>"), PH("<b>Price/Bay</b>"), PH("<b>How It Works</b>"), PH("<b>Pros/Cons</b>")],
    [P("ProTee Auto-Tee (Sweden)"), P("$3,500-5,000"), P("Ball rolls into collector, pneumatic tee raises ball"), P("Proven commercial; quiet; reliable")],
    [P("TeeBox Systems"), P("$2,500-4,000"), P("Gravity return + motorized tee elevation"), P("Good mid-range; works with sloped floor")],
    [P("DIY / Custom Fabrication"), P("$1,500-3,000"), P("Sloped platform + custom ball feed + solenoid tee"), P("Customizable; requires engineering")],
    [P("Chinese Auto-Tee (various)"), P("$800-2,000"), P("Varies; typically ball elevator + rubber tee"), P("Cheapest; reliability concerns")],
    [P("Sloped Floor Platform (custom)"), P("$2,000-4,000"), P("Elevated platform with turf-covered slope; ball rolls to collector"), P("Premium feel; requires construction")],
]
story.append(make_table(tee_data, [1.8*inch, 1.1*inch, 2.0*inch, 1.9*inch]))

story.append(Spacer(1, 8))
story.append(Paragraph(
    "Recommendation: Custom sloped platform (for the ball return effect) + ProTee or TeeBox auto-tee. "
    "Budget $4,000-8,000 per bay. This is a key differentiator — worth investing in reliability.",
    styles['CalloutText']
))

# --- Projectors & Screens ---
story.append(Paragraph("Projectors", styles['SubHead']))

proj_data = [
    [PH("<b>Projector</b>"), PH("<b>Price</b>"), PH("<b>Resolution</b>"), PH("<b>Lumens</b>"), PH("<b>Notes</b>")],
    [P("BenQ LK936ST"), P("$4,000-5,000"), P("4K"), P("5,100"), P("Excellent for golf sim; short-throw")],
    [P("Optoma GT2160HDR"), P("$2,500-3,500"), P("1080p"), P("4,200"), P("Budget-friendly; good enough for most")],
    [P("Sony VPL-XW5000ES"), P("$5,000-6,000"), P("4K"), P("2,000"), P("Beautiful image; lower lumens")],
    [P("Epson Pro L1075U"), P("$3,500-4,500"), P("WUXGA"), P("7,000"), P("Very bright; laser; commercial-grade")],
]
story.append(make_table(proj_data, [1.6*inch, 1.2*inch, 1.0*inch, 0.9*inch, 2.0*inch]))

story.append(Spacer(1, 8))
story.append(Paragraph("Impact Screens", styles['SubHead2']))

screen_data = [
    [PH("<b>Screen</b>"), PH("<b>Price/Bay</b>"), PH("<b>Size</b>"), PH("<b>Notes</b>")],
    [P("Carl's Place Premium"), P("$1,200-2,000"), P("Up to 14 ft wide"), P("Most popular; good image quality; durable")],
    [P("HomeCourse Pro"), P("$1,500-2,500"), P("Up to 16 ft wide"), P("Premium; excellent ball absorption")],
    [P("AllSportSystems"), P("$2,000-3,500"), P("Custom sizing"), P("Commercial-grade; best durability")],
    [P("TruGolf / Full Swing OEM"), P("$3,000-5,000"), P("Included w/enclosure"), P("Proprietary; comes with full system")],
]
story.append(make_table(screen_data, [2.0*inch, 1.4*inch, 1.3*inch, 2.0*inch]))

story.append(PageBreak())

# --- RECOMMENDED STACK ---
story.append(Paragraph("Recommended Technology Stack (Per Bay)", styles['SubHead']))

rec_data = [
    [PH("<b>Component</b>"), PH("<b>Recommendation</b>"), PH("<b>Cost/Bay</b>"), PH("<b>Rationale</b>")],
    [P("Launch Monitor"), PB("Uneekor EYE XO2"), P("$8,000-10,000"), P("99% detection; overhead; API for Golfer360; status LED")],
    [P("Software"), PB("E6 Connect + GSPro"), P("$1,500-2,500/yr"), P("E6 for polish; GSPro for variety")],
    [P("Projector"), PB("BenQ LK936ST (4K)"), P("$4,000-5,000"), P("Bright; 4K immersion; short-throw")],
    [P("Impact Screen"), PB("Carl's Place Premium"), P("$1,500-2,000"), P("Proven commercial; replaceable")],
    [P("Enclosure"), PB("Carl's Place Pro or custom"), P("$3,000-5,000"), P("Clean look; integrates with build")],
    [P("Auto-Tee + Ball Return"), PB("ProTee + custom platform"), P("$4,000-8,000"), P("Sloped floor + reliable auto-tee")],
    [P("Gaming PC"), PB("Custom (RTX 4070+)"), P("$2,000-3,000"), P("Runs E6 at 4K; future-proof")],
    [P("Hitting Mat"), PB("Fiberbuilt Flight Deck"), P("$750-1,200"), P("Premium turf; forgiving on joints")],
    [PB("<b>Total Per Bay</b>"), PB(""), PB("<b>$24,750-36,700</b>"), PB("")],
    [PB("<b>Phase 1 Total (2 Bays)</b>"), PB(""), PB("<b>$49,500-73,400</b>"), PB("")],
]
story.append(make_total_table(rec_data, [1.5*inch, 2.0*inch, 1.3*inch, 2.0*inch]))

story.append(Spacer(1, 12))
story.append(Paragraph(
    "Key advantage: The Uneekor API/data export feeds directly into Salesforce Data Cloud for Golfer360. "
    "Every shot becomes a data point. This is what enables the AI coaching differentiator.",
    styles['CalloutText']
))

story.append(PageBreak())

# ========== SECTION 3: MONTHLY OPERATING COSTS ==========
story.append(Paragraph("Section 3: Monthly Operating Costs", styles['SectionHead']))
story.append(Paragraph(
    "What it costs to keep the doors open each month (Phase 1, Target build, steady state). "
    "Now includes beverage operations and ABC license compliance.",
    styles['Body']
))

ops_data = [
    [PH("<b>Category</b>"), PH("<b>Monthly Low</b>"), PH("<b>Monthly High</b>"), PH("<b>Notes</b>")],
    [P("<b>Rent</b>"), P(""), P(""), P("")],
    [P("   Space lease (~1,400 sq ft)"), P("$2,100"), P("$3,500"), P("$18-30/sq ft annually")],
    [P("   CAM / NNN charges"), P("$300"), P("$700"), P("Common area maintenance, taxes")],
    [P("<b>Utilities</b>"), P(""), P(""), P("")],
    [P("   Electricity"), P("$400"), P("$800"), P("Projectors + PCs + HVAC")],
    [P("   Internet (business fiber)"), P("$150"), P("$300"), P("Symmetric fiber")],
    [P("   Water/Sewer"), P("$50"), P("$100"), P("Restroom + beverage area")],
    [P("<b>Software & Subscriptions</b>"), P(""), P(""), P("")],
    [P("   Simulator software (E6 + GSPro)"), P("$250"), P("$450"), P("Annual licenses / 12")],
    [P("   Salesforce Platform"), P("$300"), P("$800"), P("CRM + Data Cloud + Experience Cloud")],
    [P("   Booking/scheduling system"), P("$50"), P("$150"), P("If not built in Salesforce")],
    [P("   Security/access control SaaS"), P("$50"), P("$100"), P("Cloud-managed locks + cameras")],
    [P("   Music licensing (BMI/ASCAP)"), P("$25"), P("$50"), P("Required for commercial music")],
    [P("<b>Insurance</b>"), P(""), P(""), P("")],
    [P("   General liability + property"), P("$300"), P("$600"), P("Sports/recreation classification")],
    [P("   Liquor liability (ABC requirement)"), P("$75"), P("$150"), P("Required for beer/wine sales")],
    [P("   Workers comp (if employees)"), P("$0"), P("$200"), P("Only if staffed")],
    [P("<b>Beverage Operations</b>"), P(""), P(""), P("")],
    [P("   Beer inventory (COGS)"), P("$300"), P("$800"), P("Bunny Man + select craft; ~30-40% COGS")],
    [P("   Non-alcoholic beverages"), P("$100"), P("$250"), P("Water, coffee, soft drinks")],
    [P("   ABC license renewal (annual / 12)"), P("$25"), P("$40"), P("Virginia annual renewal")],
    [P("<b>Staffing</b>"), P(""), P(""), P("")],
    [P("   Part-time attendant (evenings/weekends)"), P("$1,200"), P("$2,400"), P("20-30 hrs/week; also serves beer")],
    [P("   Cleaning service"), P("$200"), P("$400"), P("2-3x per week")],
    [P("<b>Maintenance & Supplies</b>"), P(""), P(""), P("")],
    [P("   Equipment maintenance"), P("$100"), P("$300"), P("Screens, projector bulbs, etc.")],
    [P("   Consumables (balls, tees, cleaning)"), P("$50"), P("$150"), P("Golf balls, turf patches")],
    [P("<b>Marketing</b>"), P(""), P(""), P("")],
    [P("   Digital marketing / social"), P("$200"), P("$500"), P("Google Ads, social, local SEO")],
    [P("   Community / events"), P("$100"), P("$300"), P("Cross-promotion w/ Workhouse & Bunny Man")],
    [P("<b>Miscellaneous</b>"), P(""), P(""), P("")],
    [P("   Accounting / bookkeeping"), P("$150"), P("$300"), P("Monthly bookkeeping service")],
    [P("   Credit card processing fees"), P("$150"), P("$400"), P("~2.9% of revenue")],
    [P("   Contingency"), P("$200"), P("$500"), P("Unexpected expenses")],
    [PB("<b>TOTAL MONTHLY OPERATING</b>"), PB("<b>$6,875</b>"), PB("<b>$13,740</b>"), PB("<b>Midpoint: ~$10,300/month</b>")],
]
story.append(make_total_table(ops_data, [2.5*inch, 1.2*inch, 1.2*inch, 2.0*inch]))

story.append(PageBreak())

# --- BREAK-EVEN ANALYSIS ---
story.append(Paragraph("Break-Even Analysis", styles['SubHead']))
story.append(Paragraph(
    "Hours per week the bays need to be booked to cover operating costs. "
    "Bay rental is the primary revenue driver; beverage sales and memberships are additive.",
    styles['Body']
))

be_data = [
    [PH("<b>Scenario</b>"), PH("<b>Hourly Rate</b>"), PH("<b>Monthly OpEx</b>"), PH("<b>Hours Needed/Month</b>"), PH("<b>Hours/Week (per bay)</b>")],
    [P("Low Cost / Low Price"), P("$50/hr"), P("$6,875"), P("138 hrs"), P("~17 hrs/bay")],
    [P("Mid Cost / Mid Price"), P("$60/hr"), P("$10,300"), P("172 hrs"), P("~22 hrs/bay")],
    [P("High Cost / Premium Price"), P("$70/hr"), P("$13,740"), P("196 hrs"), P("~25 hrs/bay")],
]
story.append(make_table(be_data, [1.5*inch, 1.1*inch, 1.3*inch, 1.5*inch, 1.4*inch]))

story.append(Spacer(1, 10))
story.append(Paragraph(
    "Each bay has ~84 bookable hours/week (12 hrs/day x 7 days). At the midpoint, you need ~22 hrs/bay/week — "
    "roughly 26% utilization to break even on operating costs alone. Industry average for successful indoor golf "
    "is 40-60% utilization.",
    styles['Body']
))

story.append(Paragraph("Revenue Potential at Various Utilization Rates", styles['SubHead2']))
story.append(Paragraph(
    "Bay rental revenue only (at $60/hr). Beverage revenue adds $500-$2,000/month on top.",
    styles['Body']
))

rev_data = [
    [PH("<b>Utilization</b>"), PH("<b>Hrs/Week (2 bays)</b>"), PH("<b>Monthly Revenue</b>"), PH("<b>Monthly Profit (vs $10,300)</b>"), PH("<b>Annual Profit</b>")],
    [P("25%"), P("42 hrs"), P("$10,080"), P("-$220 (break-even)"), P("-$2,640")],
    [P("35%"), P("59 hrs"), P("$14,160"), P("$3,860"), P("$46,320")],
    [P("45%"), P("76 hrs"), P("$18,240"), P("$7,940"), P("$95,280")],
    [P("55%"), P("92 hrs"), P("$22,080"), P("$11,780"), P("$141,360")],
    [P("65%"), P("109 hrs"), P("$26,160"), P("$15,860"), P("$190,320")],
]
story.append(make_table(rev_data, [1.0*inch, 1.4*inch, 1.3*inch, 1.8*inch, 1.2*inch]))

story.append(Spacer(1, 8))
story.append(Paragraph(
    "Note: This is bay rental only. Memberships, beverage margin, leagues, events, lessons, and AI coaching "
    "subscriptions are all additive. A Gold member paying $200/month generates revenue whether they visit or not.",
    styles['CalloutText']
))

# --- PAYBACK ---
story.append(Paragraph("Investment Payback Estimate", styles['SubHead']))
story.append(Paragraph(
    "Time to recover Phase 1 investment ($285K midpoint of Target) from monthly profit after OpEx.",
    styles['Body']
))

payback_data = [
    [PH("<b>Utilization</b>"), PH("<b>Monthly Profit</b>"), PH("<b>Payback Period</b>"), PH("<b>Assessment</b>")],
    [P("35%"), P("$3,860"), P("~74 months (6.2 years)"), P("Slow — needs additional revenue streams")],
    [P("45%"), P("$7,940"), P("~36 months (3 years)"), P("Reasonable — typical for new venue")],
    [P("55%"), P("$11,780"), P("~24 months (2 years)"), P("Strong — Phase 2 expansion trigger")],
    [P("65%"), P("$15,860"), P("~18 months (1.5 years)"), P("Excellent — rapid growth mode")],
]
story.append(make_table(payback_data, [1.2*inch, 1.4*inch, 1.8*inch, 2.4*inch]))

story.append(Spacer(1, 8))
story.append(Paragraph(
    "At 45-55% utilization (achievable within Year 1 in this market), payback is 2-3 years on bay revenue alone. "
    "Beverage sales, memberships, and events accelerate this significantly.",
    styles['CalloutText']
))

story.append(PageBreak())

# ========== SECTION 4: BEVERAGE STRATEGY ==========
story.append(Paragraph("Section 4: Beverage Strategy & Bunny Man Brewing Partnership", styles['SectionHead']))

story.append(Paragraph("Beverage Model", styles['SubHead']))
story.append(Paragraph(
    "Project Fairway will operate a hybrid beverage model designed to maximize customer experience, "
    "partnership value, and revenue while keeping operational complexity low.",
    styles['Body']
))

story.append(Paragraph("<bullet>&bull;</bullet> <b>BYOB Permitted:</b> Customers may bring their own beer/wine (purchased from Bunny Man Brewing next door or elsewhere). This drives traffic to Bunny Man and creates a casual, welcoming atmosphere.", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>On-Site Beer &amp; Wine Sales:</b> Project Fairway will also sell Bunny Man beers and select craft options on-premises. Requires a Virginia ABC Wine &amp; Beer On-Premises license.", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Non-Alcoholic:</b> Water, coffee, and soft drinks always available (included/low-cost).", styles['BulletItem']))

story.append(Paragraph("Virginia ABC License Requirements", styles['SubHead']))

abc_data = [
    [PH("<b>Item</b>"), PH("<b>Details</b>"), PH("<b>Cost</b>")],
    [P("License Type"), P("Wine & Beer On-Premises (retail)"), P("")],
    [P("Application Fee"), P("One-time state filing"), P("$195-$300")],
    [P("Annual License Fee"), P("Renewable annually"), P("$300-$450/yr")],
    [P("Background Check / Investigation"), P("Required for all owners"), P("Included in application")],
    [P("Liquor Liability Insurance"), P("Required by Virginia ABC; $1M coverage typical"), P("$500-1,500/yr")],
    [P("Server Training (TIPS/equivalent)"), P("Required for staff who serve"), P("$30-50/person")],
    [P("Timeline"), P("Application to approval"), P("4-8 weeks typical")],
]
story.append(make_table(abc_data, [2.2*inch, 2.8*inch, 1.6*inch]))

story.append(Spacer(1, 8))
story.append(Paragraph(
    "Important: Virginia's Wine &amp; Beer license is simpler than a full Mixed Beverage (liquor) license. "
    "No food service requirement for beer/wine only. The BYOB allowance is separate — Virginia generally permits "
    "BYOB in establishments that don't hold a liquor license, but since you'll hold a beer/wine license, "
    "your ABC attorney should confirm the BYOB policy is permitted alongside on-site sales.",
    styles['CalloutText']
))

story.append(Paragraph("Beverage Revenue Model", styles['SubHead']))
story.append(Paragraph(
    "Beer/wine sales provide high-margin incremental revenue with minimal labor (your attendant serves).",
    styles['Body']
))

bev_rev_data = [
    [PH("<b>Metric</b>"), PH("<b>Conservative</b>"), PH("<b>Moderate</b>"), PH("<b>Optimistic</b>")],
    [P("Drinks sold per bay-hour"), P("0.5"), P("1.0"), P("1.5")],
    [P("Average price per drink"), P("$7"), P("$8"), P("$9")],
    [P("Bay-hours booked per month"), P("172"), P("230"), P("300")],
    [P("Gross beverage revenue/month"), P("$602"), P("$1,840"), P("$4,050")],
    [P("COGS (~35% for craft beer)"), P("-$211"), P("-$644"), P("-$1,418")],
    [PB("<b>Net beverage profit/month</b>"), PB("<b>$391</b>"), PB("<b>$1,196</b>"), PB("<b>$2,633</b>")],
]
story.append(make_total_table(bev_rev_data, [2.0*inch, 1.5*inch, 1.5*inch, 1.5*inch]))

story.append(Spacer(1, 8))
story.append(Paragraph(
    "Even at conservative estimates, beverage adds ~$400-$1,200/month in pure margin with almost no incremental labor. "
    "At higher utilization, it materially accelerates payback.",
    styles['CalloutText']
))

story.append(Paragraph("Bunny Man Brewing Partnership Proposal", styles['SubHead']))
story.append(Paragraph(
    "Bunny Man Brewing operates on/near the Workhouse campus. A formal partnership creates mutual value:",
    styles['Body']
))

story.append(Paragraph("<bullet>&bull;</bullet> <b>For Project Fairway members:</b> Discounted pours at Bunny Man (e.g., $1 off pints for Gold/Silver members). Adds tangible membership value at no cost to Project Fairway.", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>For Bunny Man:</b> Guaranteed foot traffic from golfers before/after sessions. Featured tap at Project Fairway (exclusive or priority placement). Joint marketing visibility.", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Joint events:</b> Golf &amp; Beer Nights, tournament sponsorships, seasonal releases tied to golf events, brewery league nights.", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Revenue structure:</b> Standard wholesale purchase from Bunny Man (typically 50% of retail). No revenue share required — both parties benefit from traffic.", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>BYOB synergy:</b> Customers who prefer to bring their own walk to Bunny Man, buy a 4-pack or crowler, and bring it back. Bunny Man makes a sale; the golfer has fresh local beer; Project Fairway has a happy customer.", styles['BulletItem']))

story.append(Spacer(1, 8))
story.append(Paragraph(
    "This partnership should be pitched as: 'We send you customers. You give our members a reason to "
    "love the campus even more. Let's grow together.' Low-risk, high-visibility for both brands.",
    styles['CalloutText']
))

story.append(PageBreak())

# ========== SECTION 5: PHASE 2 EXPANSION ==========
story.append(Paragraph("Section 5: Phase 2 Expansion (Bays 3 & 4)", styles['SectionHead']))
story.append(Paragraph(
    "Phase 2 is NOT part of the initial capital raise. It is triggered by validated demand and funded from "
    "Phase 1 operating profits. This section exists to show investors the growth path and total addressable opportunity.",
    styles['Body']
))
story.append(Paragraph(
    "Phase 2 is self-funded from Phase 1 profits. It is NOT part of the initial investment ask.",
    styles['PhaseCallout']
))

story.append(Paragraph("Expansion Trigger Criteria", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> Consistent utilization above 55% for 3+ months", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Waitlist or regular booking conflicts during peak hours", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Membership base exceeding 50 active members", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Monthly profit consistently above $10K (after OpEx)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Cash reserves sufficient to fund build-out without new debt", styles['BulletItem']))

story.append(Paragraph("Phase 2 Estimated Investment", styles['SubHead']))

p2_data = [
    [PH("<b>Category</b>"), PH("<b>Estimate</b>"), PH("<b>Notes</b>")],
    [P("Simulator Technology (2 additional bays)"), P("$49,500-73,400"), P("Same spec as Phase 1 bays")],
    [P("Construction (bays + expanded lounge)"), P("$20,000-40,000"), P("Less than Phase 1 — infrastructure exists")],
    [P("Additional Furniture & Decor"), P("$8,000-15,000"), P("Bay seating + expanded lounge")],
    [P("Expanded HVAC"), P("$5,000-10,000"), P("Additional cooling for 2 more bays")],
    [P("Second Restroom"), P("$4,000-8,000"), P("Required for increased occupancy")],
    [P("Additional Parking (if needed)"), P("$0-5,000"), P("Negotiation with Workhouse")],
    [PB("<b>Phase 2 Total</b>"), PB("<b>$86,500-151,400</b>"), PB("<b>Self-funded from profits</b>")],
]
story.append(make_total_table(p2_data, [2.8*inch, 1.6*inch, 2.4*inch]))

story.append(Spacer(1, 12))
story.append(Paragraph("Phase 2 Revenue Impact", styles['SubHead2']))
story.append(Paragraph(
    "Doubling from 2 to 4 bays roughly doubles revenue capacity while increasing OpEx by only ~40-50% "
    "(shared rent, shared staffing, shared marketing). Monthly operating costs increase approximately "
    "$3,000-$5,000 for the additional bays (electricity, maintenance, consumables, increased cleaning). "
    "At 50% utilization across 4 bays at $60/hr, monthly revenue jumps to ~$36,000 against ~$14,000 OpEx = "
    "~$22,000/month profit.",
    styles['Body']
))

story.append(Spacer(1, 16))
story.append(Paragraph("Key Assumptions & Caveats", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> Rent estimated at $18-30/sq ft annually (Fairfax County commercial; actual Workhouse terms TBD)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Pricing assumes $55-70/hr range; competitor charges ~$30/hr for a budget experience", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Staffing assumes automation-first model with part-time attendant (who also serves beer)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Membership revenue not included in break-even calculations (conservative approach)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Beverage revenue modeled separately; adds $400-$2,600/month in net margin", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> ABC license timeline: 4-8 weeks; should be initiated concurrent with build-out", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Bunny Man partnership not yet established; terms assumed at standard wholesale", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Salesforce licensing assumes professional discount or existing relationship", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> All construction estimates to be validated with contractor quotes once space is secured", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Phase 2 is entirely self-funded; no additional investor capital required", styles['BulletItem']))

story.append(Spacer(1, 30))
story.append(HRFlowable(width="100%", thickness=1, color=MED_GRAY, spaceAfter=10))
story.append(Paragraph(
    "Project Fairway — Financial Analysis v2.0 — July 2026 — Prepared by Russell Evans",
    styles['Footer']
))

# Build
doc.build(story)
print(f"PDF created: {output_path}")
