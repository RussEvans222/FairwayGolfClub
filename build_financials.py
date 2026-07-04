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
styles.add(ParagraphStyle('RecLabel', parent=styles['Normal'], fontSize=9, textColor=white, fontName='Helvetica-Bold', leading=11, alignment=TA_CENTER))

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
story.append(Paragraph("Version: 1.0", styles['Body']))
story.append(Spacer(1, 0.5*inch))
story.append(Paragraph("Contents:", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> Section 1: Full Build-Out Budget (Line-Item)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Section 2: Simulator Ecosystem Comparison", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Section 3: Monthly Operating Costs & Break-Even", styles['BulletItem']))
story.append(PageBreak())

# ========== SECTION 1: BUILD-OUT BUDGET ==========
story.append(Paragraph("Section 1: Full Build-Out Budget", styles['SectionHead']))
story.append(Paragraph(
    "This section provides a detailed line-item estimate for the complete Phase 1 build-out (two premium simulator bays). "
    "Three scenarios are presented: Conservative (lean MVP), Target (recommended premium build), and Premium (top-of-line everything). "
    "All estimates assume a raw commercial shell requiring full build-out.",
    styles['Body']
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
    [P("Plumbing (restroom, sink)"), P("$4,000-6,000"), P("$6,000-10,000"), P("$10,000-14,000")],
    [P("Flooring (turf, LVP, concrete polish)"), P("$4,000-6,000"), P("$6,000-10,000"), P("$10,000-15,000")],
    [P("Painting & Wall Finishes"), P("$2,000-3,000"), P("$3,000-5,000"), P("$5,000-8,000")],
    [P("Lighting (ambient + bay lighting)"), P("$3,000-5,000"), P("$5,000-8,000"), P("$8,000-12,000")],
    [P("Acoustic Treatment"), P("$2,000-4,000"), P("$4,000-7,000"), P("$7,000-12,000")],
    [P("Permits & Inspections"), P("$2,000-4,000"), P("$3,000-5,000"), P("$4,000-6,000")],
    [PB("<b>Subtotal: Construction</b>"), PB("<b>$39,000-62,000</b>"), PB("<b>$64,000-101,000</b>"), PB("<b>$100,000-146,000</b>")],
]
story.append(make_total_table(const_data, [2.4*inch, 1.6*inch, 1.6*inch, 1.6*inch]))

story.append(PageBreak())

# --- Furniture & Decor ---
story.append(Paragraph("Furniture, Decor & Atmosphere", styles['SubHead']))
story.append(Paragraph(
    "The elements that create the 'luxury golf barn' feel — warm, modern, comfortable. This is what separates you from the dark, dingy competitor experience.",
    styles['Body']
))

furn_data = [
    [PH("<b>Item</b>"), PH("<b>Conservative</b>"), PH("<b>Target</b>"), PH("<b>Premium</b>")],
    [P("Bay Seating (leather recliners/lounge, per bay)"), P("$2,000-3,000"), P("$4,000-6,000"), P("$6,000-10,000")],
    [P("Lounge Furniture (reception area)"), P("$2,000-4,000"), P("$5,000-8,000"), P("$8,000-14,000")],
    [P("Wood Accent Walls / Shelving"), P("$1,000-2,000"), P("$3,000-5,000"), P("$5,000-8,000")],
    [P("Decorative Lighting"), P("$500-1,000"), P("$1,500-3,000"), P("$3,000-5,000")],
    [P("Signage (exterior + interior)"), P("$1,000-2,000"), P("$2,500-4,000"), P("$4,000-7,000")],
    [P("Beverage Station (mini fridge, coffee, etc.)"), P("$500-1,000"), P("$1,500-3,000"), P("$3,000-5,000")],
    [P("Bluetooth Speakers (per bay)"), P("$300-500"), P("$600-1,000"), P("$1,000-2,000")],
    [P("Phone Charging Stations"), P("$200-400"), P("$400-800"), P("$800-1,200")],
    [P("Misc Decor (art, plants, rugs)"), P("$500-1,000"), P("$1,500-3,000"), P("$3,000-5,000")],
    [PB("<b>Subtotal: Furniture & Decor</b>"), PB("<b>$8,000-14,900</b>"), PB("<b>$19,500-33,800</b>"), PB("<b>$33,800-57,200</b>")],
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

# --- Soft Costs ---
story.append(Spacer(1, 12))
story.append(Paragraph("Soft Costs & Working Capital", styles['SubHead']))

soft_data = [
    [PH("<b>Item</b>"), PH("<b>Conservative</b>"), PH("<b>Target</b>"), PH("<b>Premium</b>")],
    [P("Business Formation & Legal"), P("$2,000-4,000"), P("$4,000-7,000"), P("$7,000-12,000")],
    [P("Commercial Insurance (first year)"), P("$3,000-5,000"), P("$5,000-8,000"), P("$8,000-12,000")],
    [P("Lease Deposit (first + last + security)"), P("$5,000-10,000"), P("$8,000-15,000"), P("$12,000-20,000")],
    [P("Marketing & Launch"), P("$2,000-4,000"), P("$5,000-10,000"), P("$10,000-20,000")],
    [P("Working Capital (3-month runway)"), P("$15,000-25,000"), P("$25,000-40,000"), P("$40,000-60,000")],
    [P("Contingency (10%)"), P("$8,000-13,000"), P("$15,000-25,000"), P("$25,000-37,000")],
    [PB("<b>Subtotal: Soft Costs</b>"), PB("<b>$35,000-61,000</b>"), PB("<b>$62,000-105,000</b>"), PB("<b>$102,000-161,000</b>")],
]
story.append(make_total_table(soft_data, [2.8*inch, 1.4*inch, 1.4*inch, 1.4*inch]))

story.append(PageBreak())

# --- GRAND TOTAL ---
story.append(Paragraph("Total Build-Out Investment Summary", styles['SubHead']))

grand_data = [
    [PH("<b>Category</b>"), PH("<b>Conservative</b>"), PH("<b>Target</b>"), PH("<b>Premium</b>")],
    [P("Simulator Technology"), P("$26,300-41,700"), P("$53,500-81,500"), P("$93,500-133,000")],
    [P("Construction & Build-Out"), P("$39,000-62,000"), P("$64,000-101,000"), P("$100,000-146,000")],
    [P("Furniture & Decor"), P("$8,000-14,900"), P("$19,500-33,800"), P("$33,800-57,200")],
    [P("Technology & Operations"), P("$5,500-10,300"), P("$11,000-19,500"), P("$19,500-31,000")],
    [P("Soft Costs & Working Capital"), P("$35,000-61,000"), P("$62,000-105,000"), P("$102,000-161,000")],
    [PB("<b>TOTAL INVESTMENT</b>"), PB("<b>$113,800-189,900</b>"), PB("<b>$210,000-340,800</b>"), PB("<b>$348,800-528,200</b>")],
]
story.append(make_total_table(grand_data, [2.4*inch, 1.5*inch, 1.5*inch, 1.5*inch]))

story.append(Spacer(1, 12))
story.append(Paragraph(
    "Recommendation: The Target scenario ($210K-$340K) delivers the premium experience you described "
    "without over-investing before proving the market. The Conservative build risks feeling like the "
    "Annandale competitor you visited. The Premium build is aspirational but may not be justified until "
    "demand is validated.",
    styles['CalloutText']
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
    "This is the core sensor that tracks ball flight and club data. The system you saw in Annandale "
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
    "The detection rate difference is exactly what you experienced today. At 85-92%, you'll get 1-2 missed shots per 10 swings. "
    "At 99%+, it's maybe 1 miss per 100. For a premium club charging $55-70/hr, missed shots are unacceptable. "
    "The Uneekor EYE XO2 or QED is the sweet spot for price vs. reliability.",
    styles['CalloutText']
))

story.append(Spacer(1, 8))
story.append(Paragraph("Ready Indicator (Your Idea)", styles['SubHead2']))
story.append(Paragraph(
    "The Uneekor systems include a status LED that indicates tracking readiness. For your concept, "
    "this could be enhanced with a small projected green dot or ring on the ball/tee position — visible "
    "and intuitive. This is a relatively simple custom addition (LED strip + sensor feedback) that would "
    "reinforce the premium, 'everything just works' feel.",
    styles['Body']
))

# --- Simulator Software ---
story.append(Paragraph("Simulator Software", styles['SubHead']))
story.append(Paragraph(
    "The software renders courses, driving ranges, games, and practice modes. It connects to the launch monitor for real data.",
    styles['Body']
))

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
    "GSPro as a secondary option for variety. Both work with Uneekor and Foresight hardware.",
    styles['CalloutText']
))

story.append(PageBreak())

# --- Auto-Tee & Ball Return ---
story.append(Paragraph("Auto-Tee & Ball Return Systems", styles['SubHead']))
story.append(Paragraph(
    "This is the feature that made the biggest impression during your competitor visit. "
    "The combination of sloped floor + ball collection + automatic tee creates a seamless hitting experience.",
    styles['Body']
))

tee_data = [
    [PH("<b>System</b>"), PH("<b>Price/Bay</b>"), PH("<b>How It Works</b>"), PH("<b>Pros/Cons</b>")],
    [P("ProTee Auto-Tee (Sweden)"), P("$3,500-5,000"), P("Ball rolls into collector, pneumatic tee raises ball"), P("Proven commercial; quiet; reliable")],
    [P("TeeBox Systems"), P("$2,500-4,000"), P("Gravity return + motorized tee elevation"), P("Good mid-range; works with sloped floor")],
    [P("DIY / Custom Fabrication"), P("$1,500-3,000"), P("Sloped platform + custom ball feed + solenoid tee"), P("Customizable; requires engineering")],
    [P("Chinese Auto-Tee (various)"), P("$800-2,000"), P("Varies; typically ball elevator + rubber tee"), P("Cheapest; reliability questions; what competitor likely uses")],
    [P("Sloped Floor Platform (custom)"), P("$2,000-4,000"), P("Elevated hitting platform with turf-covered slope; ball rolls to collector"), P("The feature you loved; requires construction")],
]
story.append(make_table(tee_data, [1.8*inch, 1.1*inch, 2.0*inch, 1.9*inch]))

story.append(Spacer(1, 8))
story.append(Paragraph(
    "Recommendation: Combine a custom sloped platform build (for the ball return effect you loved) with "
    "a ProTee or TeeBox auto-tee mechanism. Budget $4,000-8,000 per bay for the complete system. "
    "This is one of your key differentiators — worth investing in reliability here.",
    styles['CalloutText']
))

# --- Projectors ---
story.append(Paragraph("Projectors", styles['SubHead']))
story.append(Paragraph(
    "Short-throw projectors are required to minimize shadow and fit in the bay depth. 4K resolution at high lumens creates an immersive visual.",
    styles['Body']
))

proj_data = [
    [PH("<b>Projector</b>"), PH("<b>Price</b>"), PH("<b>Resolution</b>"), PH("<b>Lumens</b>"), PH("<b>Notes</b>")],
    [P("BenQ LK936ST"), P("$4,000-5,000"), P("4K"), P("5,100"), P("Excellent for golf sim; short-throw")],
    [P("Optoma GT2160HDR"), P("$2,500-3,500"), P("1080p"), P("4,200"), P("Budget-friendly; good enough for most")],
    [P("Sony VPL-XW5000ES"), P("$5,000-6,000"), P("4K"), P("2,000"), P("Beautiful image; lower lumens")],
    [P("Epson Pro L1075U"), P("$3,500-4,500"), P("WUXGA"), P("7,000"), P("Very bright; laser; commercial-grade")],
]
story.append(make_table(proj_data, [1.6*inch, 1.2*inch, 1.0*inch, 0.9*inch, 2.0*inch]))

# --- Impact Screens ---
story.append(Spacer(1, 8))
story.append(Paragraph("Impact Screens", styles['SubHead']))

screen_data = [
    [PH("<b>Screen</b>"), PH("<b>Price (per bay)</b>"), PH("<b>Size</b>"), PH("<b>Notes</b>")],
    [P("Carl's Place Premium"), P("$1,200-2,000"), P("Up to 14 ft wide"), P("Most popular; good image quality; durable")],
    [P("HomeCourse Pro"), P("$1,500-2,500"), P("Up to 16 ft wide"), P("Premium; excellent ball absorption")],
    [P("AllSportSystems"), P("$2,000-3,500"), P("Custom sizing"), P("Commercial-grade; best durability")],
    [P("TruGolf / Full Swing OEM"), P("$3,000-5,000"), P("Included w/enclosure"), P("Proprietary; comes with full system purchase")],
]
story.append(make_table(screen_data, [2.0*inch, 1.4*inch, 1.3*inch, 2.0*inch]))

story.append(PageBreak())

# --- RECOMMENDED STACK ---
story.append(Paragraph("Recommended Technology Stack", styles['SubHead']))
story.append(Paragraph(
    "Based on your requirements (reliable tracking, premium feel, auto-tee, ball return, good data for Golfer360), "
    "here is the recommended per-bay configuration:",
    styles['Body']
))

rec_data = [
    [PH("<b>Component</b>"), PH("<b>Recommendation</b>"), PH("<b>Cost/Bay</b>"), PH("<b>Rationale</b>")],
    [P("Launch Monitor"), PB("Uneekor EYE XO2"), P("$8,000-10,000"), P("99% detection; overhead; clean data; status LED; API for Golfer360")],
    [P("Software"), PB("E6 Connect + GSPro"), P("$1,500-2,500/yr"), P("E6 for commercial polish; GSPro for course variety")],
    [P("Projector"), PB("BenQ LK936ST (4K)"), P("$4,000-5,000"), P("Bright enough for ambient light; 4K immersion; short-throw")],
    [P("Impact Screen"), PB("Carl's Place Premium"), P("$1,500-2,000"), P("Proven commercial; good value; replaceable")],
    [P("Enclosure"), PB("Carl's Place Pro or custom"), P("$3,000-5,000"), P("Modular; clean look; integrates with bay build")],
    [P("Auto-Tee + Ball Return"), PB("ProTee + custom platform"), P("$4,000-8,000"), P("Sloped floor you loved + reliable auto-tee")],
    [P("Gaming PC"), PB("Custom build (RTX 4070+)"), P("$2,000-3,000"), P("Runs E6 at 4K smoothly; future-proof")],
    [P("Hitting Mat"), PB("Fiberbuilt Flight Deck"), P("$750-1,200"), P("Premium feel; realistic turf; forgiving on joints")],
    [PB("<b>Total Per Bay</b>"), PB(""), PB("<b>$24,750-36,700</b>"), PB("")],
    [PB("<b>Total (2 Bays)</b>"), PB(""), PB("<b>$49,500-73,400</b>"), PB("")],
]
story.append(make_total_table(rec_data, [1.5*inch, 2.0*inch, 1.3*inch, 2.0*inch]))

story.append(Spacer(1, 12))
story.append(Paragraph(
    "Key advantage of the Uneekor ecosystem: It provides an API/data export that can feed directly into "
    "Salesforce Data Cloud for the Golfer360 profile. Every shot — distance, spin, launch angle, club speed — "
    "becomes a data point. This is what makes the AI coaching possible.",
    styles['CalloutText']
))

story.append(PageBreak())

# ========== SECTION 3: MONTHLY OPERATING COSTS ==========
story.append(Paragraph("Section 3: Monthly Operating Costs", styles['SectionHead']))
story.append(Paragraph(
    "What it costs to keep the doors open each month, assuming the Target build scenario. "
    "These estimates are for Phase 1 (2 bays) at steady state (post-launch).",
    styles['Body']
))

ops_data = [
    [PH("<b>Category</b>"), PH("<b>Monthly Low</b>"), PH("<b>Monthly High</b>"), PH("<b>Notes</b>")],
    [P("<b>Rent</b>"), P(""), P(""), P("")],
    [P("   Space lease (~1,400 sq ft)"), P("$2,100"), P("$3,500"), P("$18-30/sq ft annually; varies by unit")],
    [P("   CAM / NNN charges"), P("$300"), P("$700"), P("Common area maintenance, taxes, insurance")],
    [P("<b>Utilities</b>"), P(""), P(""), P("")],
    [P("   Electricity"), P("$400"), P("$800"), P("Projectors + PCs + HVAC supplemental")],
    [P("   Internet (business fiber)"), P("$150"), P("$300"), P("Symmetric fiber for sim data")],
    [P("   Water/Sewer"), P("$50"), P("$100"), P("Restroom + beverage area")],
    [P("<b>Software & Subscriptions</b>"), P(""), P(""), P("")],
    [P("   Simulator software (E6 + GSPro)"), P("$250"), P("$450"), P("Annual licenses / 12")],
    [P("   Salesforce Platform"), P("$300"), P("$800"), P("CRM + Data Cloud + Experience Cloud")],
    [P("   Booking/scheduling system"), P("$50"), P("$150"), P("If not built in Salesforce")],
    [P("   Security/access control SaaS"), P("$50"), P("$100"), P("Cloud-managed locks + cameras")],
    [P("   Music licensing (BMI/ASCAP)"), P("$25"), P("$50"), P("Required for commercial music")],
    [P("<b>Insurance</b>"), P(""), P(""), P("")],
    [P("   General liability + property"), P("$300"), P("$600"), P("Sports/recreation classification")],
    [P("   Workers comp (if employees)"), P("$0"), P("$200"), P("Only if staffed")],
    [P("<b>Staffing</b>"), P(""), P(""), P("")],
    [P("   Part-time attendant (evenings/weekends)"), P("$1,200"), P("$2,400"), P("20-30 hrs/week @ $15-20/hr")],
    [P("   Cleaning service"), P("$200"), P("$400"), P("2-3x per week")],
    [P("<b>Maintenance & Supplies</b>"), P(""), P(""), P("")],
    [P("   Equipment maintenance"), P("$100"), P("$300"), P("Screen replacement, projector bulbs, etc.")],
    [P("   Consumables (balls, tees, cleaning)"), P("$50"), P("$150"), P("Golf balls wear out, turf replacement")],
    [P("   Beverage inventory"), P("$100"), P("$300"), P("Water, coffee, basic drinks")],
    [P("<b>Marketing</b>"), P(""), P(""), P("")],
    [P("   Digital marketing / social"), P("$200"), P("$500"), P("Google Ads, social, local SEO")],
    [P("   Community / events"), P("$100"), P("$300"), P("Cross-promotion with Workhouse")],
    [P("<b>Miscellaneous</b>"), P(""), P(""), P("")],
    [P("   Accounting / bookkeeping"), P("$150"), P("$300"), P("Monthly bookkeeping service")],
    [P("   Credit card processing fees"), P("$150"), P("$400"), P("~2.9% of revenue")],
    [P("   Contingency"), P("$200"), P("$500"), P("Unexpected expenses")],
    [PB("<b>TOTAL MONTHLY OPERATING</b>"), PB("<b>$6,430</b>"), PB("<b>$12,800</b>"), PB("<b>Midpoint: ~$9,600/month</b>")],
]
story.append(make_total_table(ops_data, [2.5*inch, 1.2*inch, 1.2*inch, 2.0*inch]))

story.append(PageBreak())

# --- BREAK-EVEN ANALYSIS ---
story.append(Paragraph("Break-Even Analysis", styles['SubHead']))
story.append(Paragraph(
    "How many hours per week do the bays need to be booked to cover operating costs? "
    "This assumes hourly rental as the primary revenue driver (memberships add predictability on top).",
    styles['Body']
))

be_data = [
    [PH("<b>Scenario</b>"), PH("<b>Hourly Rate</b>"), PH("<b>Monthly OpEx</b>"), PH("<b>Hours Needed/Month</b>"), PH("<b>Hours/Week (per bay)</b>")],
    [P("Low Cost / Low Price"), P("$50/hr"), P("$6,430"), P("129 hrs"), P("~16 hrs/bay")],
    [P("Mid Cost / Mid Price"), P("$60/hr"), P("$9,600"), P("160 hrs"), P("~20 hrs/bay")],
    [P("High Cost / Premium Price"), P("$70/hr"), P("$12,800"), P("183 hrs"), P("~23 hrs/bay")],
]
story.append(make_table(be_data, [1.5*inch, 1.1*inch, 1.3*inch, 1.5*inch, 1.4*inch]))

story.append(Spacer(1, 10))
story.append(Paragraph(
    "Context: Each bay has approximately 84 bookable hours per week (12 hrs/day x 7 days). "
    "At the midpoint scenario, you need ~20 hours per bay per week — that's roughly 24% utilization to break even on operating costs. "
    "Industry average for successful indoor golf is 40-60% utilization. At 50% utilization ($60/hr), "
    "you're generating ~$5,040/week gross revenue — well above the $2,400/week operating cost.",
    styles['Body']
))

story.append(Paragraph("Revenue Potential at Various Utilization Rates", styles['SubHead2']))

rev_data = [
    [PH("<b>Utilization</b>"), PH("<b>Hours/Week (2 bays)</b>"), PH("<b>Weekly Revenue</b>"), PH("<b>Monthly Revenue</b>"), PH("<b>Monthly Profit (vs $9,600 OpEx)</b>")],
    [P("25%"), P("42 hrs"), P("$2,520"), P("$10,080"), P("$480")],
    [P("35%"), P("59 hrs"), P("$3,540"), P("$14,160"), P("$4,560")],
    [P("45%"), P("76 hrs"), P("$4,560"), P("$18,240"), P("$8,640")],
    [P("55%"), P("92 hrs"), P("$5,520"), P("$22,080"), P("$12,480")],
    [P("65%"), P("109 hrs"), P("$6,540"), P("$26,160"), P("$16,560")],
]
story.append(make_table(rev_data, [1.0*inch, 1.5*inch, 1.3*inch, 1.4*inch, 1.6*inch]))

story.append(Spacer(1, 8))
story.append(Paragraph(
    "Note: This is hourly rental revenue only. Memberships, leagues, events, lessons, and AI coaching subscriptions "
    "are additive revenue streams not modeled here. Memberships in particular smooth out revenue volatility and "
    "improve cash flow predictability — a Gold member paying $200/month generates revenue whether they visit or not.",
    styles['CalloutText']
))

story.append(PageBreak())

# --- PAYBACK PERIOD ---
story.append(Paragraph("Investment Payback Estimate", styles['SubHead']))
story.append(Paragraph(
    "How long to recover the initial build-out investment from monthly profit (after operating costs). "
    "Assumes Target build ($275K midpoint) and $60/hr pricing.",
    styles['Body']
))

payback_data = [
    [PH("<b>Utilization</b>"), PH("<b>Monthly Profit</b>"), PH("<b>Payback Period</b>"), PH("<b>Assessment</b>")],
    [P("35%"), P("$4,560"), P("~60 months (5 years)"), P("Slow — survival mode")],
    [P("45%"), P("$8,640"), P("~32 months (2.7 years)"), P("Reasonable — typical for new venue")],
    [P("55%"), P("$12,480"), P("~22 months (1.8 years)"), P("Strong — expansion trigger")],
    [P("65%"), P("$16,560"), P("~17 months (1.4 years)"), P("Excellent — Phase 2 likely justified")],
]
story.append(make_table(payback_data, [1.2*inch, 1.4*inch, 1.8*inch, 2.4*inch]))

story.append(Spacer(1, 12))
story.append(Paragraph(
    "If you achieve 45-55% utilization within the first year (realistic for a well-marketed premium venue in an affluent market), "
    "you're looking at a 2-3 year payback — solid for a small business investment. The Workhouse location's built-in foot traffic "
    "gives you a head start on utilization that a random strip mall wouldn't.",
    styles['CalloutText']
))

# --- KEY ASSUMPTIONS ---
story.append(Spacer(1, 16))
story.append(Paragraph("Key Assumptions & Caveats", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> Rent estimated at $18-30/sq ft annually (Fairfax County commercial rates; actual Workhouse terms TBD)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Pricing assumes $55-70/hr range; competitor in Annandale charges ~$30/hr for a budget experience", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Staffing assumes automation-first model with part-time attendant for peak hours only", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Membership revenue not included in break-even (conservative) — adds upside", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> No alcohol sales modeled (would require ABC license; potential future revenue)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Salesforce licensing assumes existing professional relationship/discount", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> All estimates should be validated with contractor quotes once space is secured", styles['BulletItem']))

story.append(Spacer(1, 30))
story.append(HRFlowable(width="100%", thickness=1, color=MED_GRAY, spaceAfter=10))
story.append(Paragraph(
    "Project Fairway — Financial Analysis v1.0 — July 2026 — Prepared by Russell Evans",
    styles['Footer']
))

# Build
doc.build(story)
print(f"PDF created: {output_path}")
