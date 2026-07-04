from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus.flowables import Flowable

# Output path
output_path = "/sessions/exciting-sleepy-cerf/mnt/outputs/Project_Fairway_Space_Requirements.pdf"

# Colors
DARK_GREEN = HexColor("#1B4332")
MED_GREEN = HexColor("#2D6A4F")
LIGHT_GREEN = HexColor("#D8F3DC")
ACCENT = HexColor("#40916C")
LIGHT_GRAY = HexColor("#F8F9FA")
MED_GRAY = HexColor("#DEE2E6")
DARK_GRAY = HexColor("#495057")

# Styles
styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    'DocTitle',
    parent=styles['Title'],
    fontSize=28,
    textColor=DARK_GREEN,
    spaceAfter=6,
    fontName='Helvetica-Bold',
    leading=34,
))

styles.add(ParagraphStyle(
    'DocSubtitle',
    parent=styles['Normal'],
    fontSize=14,
    textColor=MED_GREEN,
    spaceAfter=20,
    fontName='Helvetica',
    leading=18,
))

styles.add(ParagraphStyle(
    'SectionHead',
    parent=styles['Heading1'],
    fontSize=16,
    textColor=DARK_GREEN,
    spaceBefore=24,
    spaceAfter=10,
    fontName='Helvetica-Bold',
    leading=20,
))

styles.add(ParagraphStyle(
    'SubHead',
    parent=styles['Heading2'],
    fontSize=12,
    textColor=MED_GREEN,
    spaceBefore=14,
    spaceAfter=6,
    fontName='Helvetica-Bold',
    leading=15,
))

styles.add(ParagraphStyle(
    'Body',
    parent=styles['Normal'],
    fontSize=10,
    textColor=DARK_GRAY,
    spaceAfter=8,
    fontName='Helvetica',
    leading=14,
))

styles.add(ParagraphStyle(
    'BulletItem',
    parent=styles['Normal'],
    fontSize=10,
    textColor=DARK_GRAY,
    spaceAfter=4,
    fontName='Helvetica',
    leading=14,
    leftIndent=20,
    bulletIndent=10,
))

styles.add(ParagraphStyle(
    'TableHeader',
    parent=styles['Normal'],
    fontSize=9,
    textColor=white,
    fontName='Helvetica-Bold',
    leading=12,
))

styles.add(ParagraphStyle(
    'TableCell',
    parent=styles['Normal'],
    fontSize=9,
    textColor=DARK_GRAY,
    fontName='Helvetica',
    leading=12,
))

styles.add(ParagraphStyle(
    'Footer',
    parent=styles['Normal'],
    fontSize=8,
    textColor=MED_GRAY,
    fontName='Helvetica',
    alignment=TA_CENTER,
))

styles.add(ParagraphStyle(
    'CalloutText',
    parent=styles['Normal'],
    fontSize=10,
    textColor=DARK_GREEN,
    fontName='Helvetica-Oblique',
    leading=14,
    leftIndent=15,
    rightIndent=15,
    spaceBefore=8,
    spaceAfter=8,
))

# Build document
doc = SimpleDocTemplate(
    output_path,
    pagesize=letter,
    topMargin=0.75*inch,
    bottomMargin=0.75*inch,
    leftMargin=0.85*inch,
    rightMargin=0.85*inch,
)

story = []

# --- TITLE PAGE ---
story.append(Spacer(1, 1.5*inch))
story.append(Paragraph("Project Fairway", styles['DocTitle']))
story.append(Paragraph("Space Requirements & Facility Specifications", styles['DocSubtitle']))
story.append(Spacer(1, 0.3*inch))
story.append(HRFlowable(width="40%", thickness=2, color=ACCENT, spaceAfter=20))
story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("Prepared for: Workhouse Arts Center Inquiry", styles['Body']))
story.append(Paragraph("Prepared by: Russell Evans", styles['Body']))
story.append(Paragraph("Date: July 2026", styles['Body']))
story.append(Paragraph("Version: 1.0", styles['Body']))
story.append(Spacer(1, 0.5*inch))
story.append(Paragraph(
    "Phase 1: Two premium simulator bays with expansion path to four bays.",
    styles['CalloutText']
))

story.append(PageBreak())

# --- EXECUTIVE SUMMARY ---
story.append(Paragraph("Executive Summary", styles['SectionHead']))
story.append(Paragraph(
    "Project Fairway requires a dedicated commercial space to house a premium indoor golf experience. "
    "The initial build (Phase 1) includes two full-size simulator bays, a small reception/lounge area, "
    "a mechanical/storage room, and a restroom. Phase 2 expands to four bays by utilizing adjacent or "
    "contiguous space planned from day one.",
    styles['Body']
))
story.append(Spacer(1, 6))

# Summary table
summary_data = [
    [Paragraph("<b>Metric</b>", styles['TableHeader']),
     Paragraph("<b>Phase 1 (2 Bays)</b>", styles['TableHeader']),
     Paragraph("<b>Phase 2 (4 Bays)</b>", styles['TableHeader'])],
    [Paragraph("Simulator Bays", styles['TableCell']),
     Paragraph("2", styles['TableCell']),
     Paragraph("4", styles['TableCell'])],
    [Paragraph("Bay Area (each)", styles['TableCell']),
     Paragraph("~225-270 sq ft", styles['TableCell']),
     Paragraph("~225-270 sq ft", styles['TableCell'])],
    [Paragraph("Total Bay Footprint", styles['TableCell']),
     Paragraph("~500-540 sq ft", styles['TableCell']),
     Paragraph("~1,000-1,080 sq ft", styles['TableCell'])],
    [Paragraph("Common / Lounge Area", styles['TableCell']),
     Paragraph("~200-300 sq ft", styles['TableCell']),
     Paragraph("~350-500 sq ft", styles['TableCell'])],
    [Paragraph("Support Spaces", styles['TableCell']),
     Paragraph("~150-200 sq ft", styles['TableCell']),
     Paragraph("~200-300 sq ft", styles['TableCell'])],
    [Paragraph("<b>Total Square Footage</b>", styles['TableCell']),
     Paragraph("<b>~1,200-1,600 sq ft</b>", styles['TableCell']),
     Paragraph("<b>~2,200-3,000 sq ft</b>", styles['TableCell'])],
    [Paragraph("Min. Ceiling Height", styles['TableCell']),
     Paragraph("10 ft (12 ft ideal)", styles['TableCell']),
     Paragraph("10 ft (12 ft ideal)", styles['TableCell'])],
    [Paragraph("Electrical Service", styles['TableCell']),
     Paragraph("200A minimum", styles['TableCell']),
     Paragraph("400A recommended", styles['TableCell'])],
]

summary_table = Table(summary_data, colWidths=[2.2*inch, 2.2*inch, 2.2*inch])
summary_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK_GREEN),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('BACKGROUND', (0, 1), (-1, -1), LIGHT_GRAY),
    ('GRID', (0, 0), (-1, -1), 0.5, MED_GRAY),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT_GRAY, white]),
]))
story.append(summary_table)

story.append(PageBreak())

# --- INDIVIDUAL BAY SPECIFICATIONS ---
story.append(Paragraph("Individual Bay Specifications", styles['SectionHead']))
story.append(Paragraph(
    "Each simulator bay must accommodate a full golf swing, ball flight projection, and comfortable "
    "seating for spectators. These dimensions are based on premium commercial simulator installations "
    "(TrackMan, Foresight GCQuad, Uneekor QED-class systems).",
    styles['Body']
))

story.append(Paragraph("Minimum Bay Dimensions", styles['SubHead']))

bay_data = [
    [Paragraph("<b>Dimension</b>", styles['TableHeader']),
     Paragraph("<b>Minimum</b>", styles['TableHeader']),
     Paragraph("<b>Recommended</b>", styles['TableHeader']),
     Paragraph("<b>Notes</b>", styles['TableHeader'])],
    [Paragraph("Width", styles['TableCell']),
     Paragraph("12 ft", styles['TableCell']),
     Paragraph("15 ft", styles['TableCell']),
     Paragraph("Allows full swing clearance + seating", styles['TableCell'])],
    [Paragraph("Depth", styles['TableCell']),
     Paragraph("16 ft", styles['TableCell']),
     Paragraph("18-20 ft", styles['TableCell']),
     Paragraph("Screen to back wall; includes hitting area + seating", styles['TableCell'])],
    [Paragraph("Ceiling Height", styles['TableCell']),
     Paragraph("10 ft", styles['TableCell']),
     Paragraph("12 ft", styles['TableCell']),
     Paragraph("Critical for tall golfers with driver", styles['TableCell'])],
    [Paragraph("Screen Width", styles['TableCell']),
     Paragraph("10 ft", styles['TableCell']),
     Paragraph("12-14 ft", styles['TableCell']),
     Paragraph("Impact screen dimension", styles['TableCell'])],
    [Paragraph("Screen Height", styles['TableCell']),
     Paragraph("8 ft", styles['TableCell']),
     Paragraph("9-10 ft", styles['TableCell']),
     Paragraph("Floor to top of impact screen", styles['TableCell'])],
    [Paragraph("Hitting Distance", styles['TableCell']),
     Paragraph("8 ft", styles['TableCell']),
     Paragraph("10-12 ft", styles['TableCell']),
     Paragraph("From impact screen to hitting mat", styles['TableCell'])],
]

bay_table = Table(bay_data, colWidths=[1.4*inch, 1.2*inch, 1.4*inch, 2.6*inch])
bay_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK_GREEN),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('GRID', (0, 0), (-1, -1), 0.5, MED_GRAY),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT_GRAY, white]),
]))
story.append(bay_table)

story.append(Spacer(1, 12))
story.append(Paragraph(
    "Note: At 15 ft wide x 18 ft deep, each bay is approximately 270 sq ft. "
    "A more compact 12 ft x 18 ft configuration yields ~216 sq ft per bay but limits the premium lounge feel.",
    styles['CalloutText']
))

# --- BAY LAYOUT DESCRIPTION ---
story.append(Paragraph("Bay Layout (Front to Back)", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> Impact screen + enclosure frame (1-2 ft depth from wall)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Ball flight zone (6-8 ft clear space)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Hitting position / mat + auto-tee system (4 ft)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Launch monitor position (overhead or rear-mount, 2-4 ft)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Seating / lounge area (4-6 ft behind hitting area)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Bay dividers (ceiling-mounted retractable nets or solid partitions)", styles['BulletItem']))

story.append(PageBreak())

# --- TOTAL FACILITY LAYOUT ---
story.append(Paragraph("Total Facility Layout", styles['SectionHead']))

story.append(Paragraph("Phase 1 - Two Bay Configuration (~1,200-1,600 sq ft)", styles['SubHead']))
story.append(Paragraph(
    "The Phase 1 layout prioritizes a premium two-bay experience with enough common space to feel like "
    "a club, not a closet. The layout should be designed so that the expansion wall (separating Phase 1 from "
    "the future Phase 2 space) can be opened up without major structural work.",
    styles['Body']
))

phase1_data = [
    [Paragraph("<b>Zone</b>", styles['TableHeader']),
     Paragraph("<b>Dimensions</b>", styles['TableHeader']),
     Paragraph("<b>Square Footage</b>", styles['TableHeader']),
     Paragraph("<b>Purpose</b>", styles['TableHeader'])],
    [Paragraph("Bay 1", styles['TableCell']),
     Paragraph("15 ft x 18 ft", styles['TableCell']),
     Paragraph("270 sq ft", styles['TableCell']),
     Paragraph("Simulator + seating", styles['TableCell'])],
    [Paragraph("Bay 2", styles['TableCell']),
     Paragraph("15 ft x 18 ft", styles['TableCell']),
     Paragraph("270 sq ft", styles['TableCell']),
     Paragraph("Simulator + seating", styles['TableCell'])],
    [Paragraph("Lounge / Reception", styles['TableCell']),
     Paragraph("~15 ft x 16 ft", styles['TableCell']),
     Paragraph("~240 sq ft", styles['TableCell']),
     Paragraph("Check-in kiosk, seating, welcome screen", styles['TableCell'])],
    [Paragraph("Hallway / Circulation", styles['TableCell']),
     Paragraph("varies", styles['TableCell']),
     Paragraph("~120 sq ft", styles['TableCell']),
     Paragraph("Access between zones", styles['TableCell'])],
    [Paragraph("Mechanical / Storage", styles['TableCell']),
     Paragraph("~8 ft x 10 ft", styles['TableCell']),
     Paragraph("~80 sq ft", styles['TableCell']),
     Paragraph("HVAC, networking, cleaning supplies", styles['TableCell'])],
    [Paragraph("Restroom", styles['TableCell']),
     Paragraph("~6 ft x 8 ft", styles['TableCell']),
     Paragraph("~48 sq ft", styles['TableCell']),
     Paragraph("ADA-compliant single restroom", styles['TableCell'])],
    [Paragraph("<b>TOTAL</b>", styles['TableCell']),
     Paragraph("", styles['TableCell']),
     Paragraph("<b>~1,028-1,600 sq ft</b>", styles['TableCell']),
     Paragraph("<b>Range accounts for wall thickness and layout efficiency</b>", styles['TableCell'])],
]

phase1_table = Table(phase1_data, colWidths=[1.6*inch, 1.5*inch, 1.4*inch, 2.2*inch])
phase1_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK_GREEN),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('GRID', (0, 0), (-1, -1), 0.5, MED_GRAY),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT_GRAY, white]),
    ('BACKGROUND', (0, -1), (-1, -1), LIGHT_GREEN),
]))
story.append(phase1_table)

story.append(Spacer(1, 16))
story.append(Paragraph("Phase 2 - Four Bay Expansion (~2,200-3,000 sq ft total)", styles['SubHead']))
story.append(Paragraph(
    "Phase 2 adds two additional bays and expands the lounge area. Ideally the space is leased from "
    "day one with the expansion area used as flexible/event space until demand justifies the build-out, "
    "or an adjacent unit is secured with a right of first refusal.",
    styles['Body']
))

phase2_data = [
    [Paragraph("<b>Addition</b>", styles['TableHeader']),
     Paragraph("<b>Square Footage</b>", styles['TableHeader']),
     Paragraph("<b>Notes</b>", styles['TableHeader'])],
    [Paragraph("Bay 3", styles['TableCell']),
     Paragraph("270 sq ft", styles['TableCell']),
     Paragraph("Mirror of Bay 1/2 configuration", styles['TableCell'])],
    [Paragraph("Bay 4", styles['TableCell']),
     Paragraph("270 sq ft", styles['TableCell']),
     Paragraph("Mirror of Bay 1/2 configuration", styles['TableCell'])],
    [Paragraph("Expanded Lounge", styles['TableCell']),
     Paragraph("+150-250 sq ft", styles['TableCell']),
     Paragraph("More seating, potential bar/beverage area", styles['TableCell'])],
    [Paragraph("Additional Storage", styles['TableCell']),
     Paragraph("+50-100 sq ft", styles['TableCell']),
     Paragraph("Club storage, merchandise", styles['TableCell'])],
    [Paragraph("Second Restroom", styles['TableCell']),
     Paragraph("+48 sq ft", styles['TableCell']),
     Paragraph("Required with increased occupancy", styles['TableCell'])],
    [Paragraph("<b>Phase 2 Addition</b>", styles['TableCell']),
     Paragraph("<b>~800-940 sq ft</b>", styles['TableCell']),
     Paragraph("<b>Added to Phase 1 footprint</b>", styles['TableCell'])],
]

phase2_table = Table(phase2_data, colWidths=[2.2*inch, 1.8*inch, 2.7*inch])
phase2_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK_GREEN),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('GRID', (0, 0), (-1, -1), 0.5, MED_GRAY),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT_GRAY, white]),
    ('BACKGROUND', (0, -1), (-1, -1), LIGHT_GREEN),
]))
story.append(phase2_table)

story.append(PageBreak())

# --- INFRASTRUCTURE REQUIREMENTS ---
story.append(Paragraph("Infrastructure & Utility Requirements", styles['SectionHead']))

story.append(Paragraph("Ceiling Height (Critical)", styles['SubHead']))
story.append(Paragraph(
    "This is the single most important structural requirement and the hardest to modify after the fact.",
    styles['Body']
))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Absolute minimum:</b> 10 feet clear (floor to lowest obstruction — not joists, not HVAC, not sprinklers)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Recommended:</b> 11-12 feet clear", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Why:</b> A 6’2” golfer with a driver at full backswing extension reaches approximately 9’3”. Add the club head arc and you need clearance above that. 10 ft is tight. 12 ft is comfortable.", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Measure to:</b> Bottom of joists, bottom of HVAC ductwork, sprinkler heads — whichever is lowest", styles['BulletItem']))

story.append(Paragraph("Electrical", styles['SubHead']))
story.append(Paragraph(
    "Golf simulators are power-hungry. Each bay runs a high-lumen projector, a gaming PC, a launch monitor, "
    "lighting, speakers, and potentially an auto-tee system and ball return.",
    styles['Body']
))

elec_data = [
    [Paragraph("<b>Component</b>", styles['TableHeader']),
     Paragraph("<b>Power Draw (per bay)</b>", styles['TableHeader']),
     Paragraph("<b>Circuit Requirement</b>", styles['TableHeader'])],
    [Paragraph("Projector (4K short-throw)", styles['TableCell']),
     Paragraph("400-800W", styles['TableCell']),
     Paragraph("Dedicated 20A circuit", styles['TableCell'])],
    [Paragraph("Gaming PC", styles['TableCell']),
     Paragraph("500-800W", styles['TableCell']),
     Paragraph("Dedicated 20A circuit", styles['TableCell'])],
    [Paragraph("Launch Monitor", styles['TableCell']),
     Paragraph("50-150W", styles['TableCell']),
     Paragraph("Shared circuit OK", styles['TableCell'])],
    [Paragraph("Auto-tee + Ball Return", styles['TableCell']),
     Paragraph("200-500W", styles['TableCell']),
     Paragraph("Dedicated 20A circuit", styles['TableCell'])],
    [Paragraph("Lighting + AV", styles['TableCell']),
     Paragraph("200-400W", styles['TableCell']),
     Paragraph("Shared circuit", styles['TableCell'])],
    [Paragraph("HVAC (supplemental)", styles['TableCell']),
     Paragraph("1,500-3,000W", styles['TableCell']),
     Paragraph("Dedicated 30A or 40A", styles['TableCell'])],
    [Paragraph("<b>Per Bay Total</b>", styles['TableCell']),
     Paragraph("<b>~2,500-5,000W</b>", styles['TableCell']),
     Paragraph("<b>3-4 dedicated circuits per bay</b>", styles['TableCell'])],
]

elec_table = Table(elec_data, colWidths=[2.2*inch, 2.0*inch, 2.5*inch])
elec_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK_GREEN),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('GRID', (0, 0), (-1, -1), 0.5, MED_GRAY),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT_GRAY, white]),
    ('BACKGROUND', (0, -1), (-1, -1), LIGHT_GREEN),
]))
story.append(elec_table)

story.append(Spacer(1, 8))
story.append(Paragraph(
    "Total facility requirement (Phase 1): 200A service minimum. Plan for 400A if expansion is likely — "
    "upgrading electrical service later is expensive and disruptive.",
    styles['CalloutText']
))

story.append(Paragraph("HVAC / Climate Control", styles['SubHead']))
story.append(Paragraph(
    "Projectors and PCs generate significant heat. Each bay produces approximately 5,000-10,000 BTU/hr of waste heat. "
    "A two-bay facility needs supplemental cooling beyond what a typical commercial lease provides.",
    styles['Body']
))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Estimate:</b> 1-2 additional tons of cooling per bay (on top of base HVAC)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Options:</b> Mini-split systems (most flexible), supplemental roof-mounted units, or upgraded existing system", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Ventilation:</b> Fresh air circulation to prevent stuffiness during back-to-back sessions", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Temperature target:</b> 68-72°F consistent — golfers are active and generate body heat", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Ask:</b> What is the existing HVAC capacity (tonnage) and can supplemental units be added?", styles['BulletItem']))

story.append(Paragraph("Networking & Connectivity", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Internet:</b> Business-class fiber preferred (minimum 100 Mbps symmetric). Simulators stream course data and software updates.", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Internal network:</b> Hardwired CAT6 to each bay (do not rely on WiFi for simulator PCs)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>WiFi:</b> Separate network for customer devices and Bluetooth speakers", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Low-voltage runs:</b> Plan conduit during build-out for network, AV, and access control cabling", styles['BulletItem']))

story.append(Paragraph("Acoustics & Soundproofing", styles['SubHead']))
story.append(Paragraph(
    "Golf ball impacts on screen produce 85-95 dB peaks. Without treatment, this carries through walls "
    "and between bays. This is especially relevant at the Workhouse given adjacent art studios and galleries.",
    styles['Body']
))
story.append(Paragraph("<bullet>&bull;</bullet> Acoustic panels on shared walls and ceiling", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Bay dividers with sound-dampening material (not just curtains)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Impact screens themselves absorb significant sound", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Rubber flooring / thick turf on concrete absorbs floor vibration", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Ask:</b> Are there noise restrictions or quiet-hour requirements on campus?", styles['BulletItem']))

story.append(PageBreak())

# --- STRUCTURAL & ACCESS ---
story.append(Paragraph("Structural & Access Requirements", styles['SectionHead']))

story.append(Paragraph("Floor", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Level concrete slab preferred</b> — no significant slope across the hitting area", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Floor must support simulator enclosure framing (anchored to slab)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Finished floor: turf/mat in hitting zone, luxury vinyl plank or polished concrete in lounge", styles['BulletItem']))

story.append(Paragraph("Doors & Loading", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Customer entrance:</b> Standard commercial door (ADA compliant, 36” minimum)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Equipment loading:</b> Need at least one opening 8 ft wide x 8 ft tall for screen frames, projector mounts, and furniture delivery. Roll-up door or double door.", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Access control:</b> Door frame must support electronic lock (for member self-service entry)", styles['BulletItem']))

story.append(Paragraph("Plumbing", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> Restroom requires water supply and drain (verify existing stub-outs)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Small sink/wet bar area desirable for lounge (coffee, water)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Ask:</b> Is plumbing already stubbed in or does it need to be run?", styles['BulletItem']))

story.append(Paragraph("Parking", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> Minimum 6-8 dedicated spots for Phase 1 (groups of 4 per bay + overlap)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> 12-16 spots for Phase 2", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Ask:</b> Are parking spots included in the lease or shared campus parking?", styles['BulletItem']))

story.append(PageBreak())

# --- EXPANSION STRATEGY ---
story.append(Paragraph("Expansion Strategy", styles['SectionHead']))
story.append(Paragraph(
    "The goal is to minimize cost and disruption when expanding from 2 to 4 bays. "
    "There are three approaches, ranked by preference:",
    styles['Body']
))

story.append(Paragraph("Option A: Lease the full footprint on Day 1 (Preferred)", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> Lease ~2,200-3,000 sq ft from the start", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Build out Phase 1 (2 bays + lounge) on one side", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Use remaining space as flexible event area / mini putting / lounge overflow", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> When demand justifies, build out Bays 3-4 without relocating or negotiating new lease", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Pros:</b> Simplest expansion, no business disruption, event space generates interim revenue", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Cons:</b> Higher rent from Day 1 before full utilization", styles['BulletItem']))

story.append(Paragraph("Option B: Adjacent Unit with Right of First Refusal", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> Lease ~1,200-1,600 sq ft for Phase 1", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Negotiate ROFR (right of first refusal) on adjacent unit", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Design shared wall for easy knock-through (no load-bearing, no major utilities in that wall)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Pros:</b> Lower initial rent", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Cons:</b> Risk that adjacent space is unavailable when needed; expansion construction disrupts operations", styles['BulletItem']))

story.append(Paragraph("Option C: Relocate at Expansion", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> Least preferred — moving is expensive and disrupts membership continuity", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Only consider if no other options exist at Workhouse", styles['BulletItem']))

story.append(PageBreak())

# --- QUESTIONS FOR WORKHOUSE ---
story.append(Paragraph("Questions for Your Workhouse Contact", styles['SectionHead']))
story.append(Paragraph(
    "Use this checklist during your conversation. These questions will help you quickly determine "
    "whether a given space can work and what modifications would be needed.",
    styles['Body']
))

story.append(Paragraph("Space & Structure", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> What spaces are currently available in the 1,200-3,000 sq ft range?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> What is the clear ceiling height (floor to lowest obstruction)?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Is there a concrete slab floor? Is it level?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Are there load-bearing interior walls that limit open floor plan?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Is there a loading door or large access point for equipment delivery?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Can we see floor plans for available units?", styles['BulletItem']))

story.append(Paragraph("Utilities & Infrastructure", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> What is the electrical service capacity (amperage) to the unit?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Can the panel be upgraded to 200A or 400A if needed?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> What HVAC is included? What tonnage?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Can supplemental HVAC (mini-splits) be installed?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Is fiber internet available on campus?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Is plumbing stubbed in for restroom?", styles['BulletItem']))

story.append(Paragraph("Lease & Terms", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> What are the lease terms (NNN, modified gross, full service)?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> What is the rate per square foot?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Is there a tenant improvement (TI) allowance?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> What lease length is required?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Is expansion into adjacent space possible (ROFR)?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Are build-out modifications permitted (framing, electrical, HVAC)?", styles['BulletItem']))

story.append(Paragraph("Campus & Operations", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> What are the campus hours of operation? Can we operate evenings/weekends?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Are there noise restrictions?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Is signage allowed? What are the guidelines?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Is alcohol service permitted (beer/wine from brewery partnership)?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> How does parking work? Dedicated or shared?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> What insurance requirements exist for tenants?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Are there other food/beverage tenants we could partner with?", styles['BulletItem']))

story.append(Paragraph("Alignment & Vision", styles['SubHead']))
story.append(Paragraph("<bullet>&bull;</bullet> How does the Workhouse evaluate new tenant concepts? What makes a good fit?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Are there community programming opportunities (youth clinics, charity events)?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> Would cross-promotion with campus events be supported?", styles['BulletItem']))

story.append(PageBreak())

# --- DEAL-BREAKERS ---
story.append(Paragraph("Deal-Breakers & Non-Negotiables", styles['SectionHead']))
story.append(Paragraph(
    "If any of the following cannot be resolved, the space will not work regardless of other factors:",
    styles['Body']
))

dealbreaker_data = [
    [Paragraph("<b>Requirement</b>", styles['TableHeader']),
     Paragraph("<b>Minimum Threshold</b>", styles['TableHeader']),
     Paragraph("<b>Why It's Critical</b>", styles['TableHeader'])],
    [Paragraph("Ceiling Height", styles['TableCell']),
     Paragraph("10 ft clear", styles['TableCell']),
     Paragraph("Cannot swing a driver safely below this", styles['TableCell'])],
    [Paragraph("Electrical Capacity", styles['TableCell']),
     Paragraph("200A (upgradeable)", styles['TableCell']),
     Paragraph("Simulators will trip breakers without sufficient power", styles['TableCell'])],
    [Paragraph("Bay Width", styles['TableCell']),
     Paragraph("12 ft per bay", styles['TableCell']),
     Paragraph("Safety clearance for full swing", styles['TableCell'])],
    [Paragraph("Bay Depth", styles['TableCell']),
     Paragraph("16 ft per bay", styles['TableCell']),
     Paragraph("Screen + hitting zone + monitor placement", styles['TableCell'])],
    [Paragraph("Evening/Weekend Hours", styles['TableCell']),
     Paragraph("Open until 10 PM", styles['TableCell']),
     Paragraph("Peak demand is after work and weekends", styles['TableCell'])],
    [Paragraph("Build-Out Permission", styles['TableCell']),
     Paragraph("Framing, electrical, HVAC", styles['TableCell']),
     Paragraph("Simulator enclosures require structural mounting", styles['TableCell'])],
]

db_table = Table(dealbreaker_data, colWidths=[1.8*inch, 2.0*inch, 2.9*inch])
db_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK_GREEN),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('GRID', (0, 0), (-1, -1), 0.5, MED_GRAY),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT_GRAY, white]),
]))
story.append(db_table)

story.append(Spacer(1, 20))

# --- CONCEPTUAL FLOOR PLAN ---
story.append(Paragraph("Conceptual Layout (Phase 1)", styles['SectionHead']))
story.append(Paragraph(
    "This is a simplified spatial diagram. A proper architectural drawing should be commissioned once a specific unit is identified.",
    styles['Body']
))

# Simple ASCII-style layout as a table
layout_data = [
    [Paragraph("<b>IMPACT SCREEN</b>", styles['TableCell']),
     Paragraph("<b>IMPACT SCREEN</b>", styles['TableCell']),
     Paragraph("", styles['TableCell'])],
    [Paragraph("BAY 1<br/>15 ft x 18 ft<br/><br/>Hitting Zone<br/>Launch Monitor<br/>Lounge Seating", styles['TableCell']),
     Paragraph("BAY 2<br/>15 ft x 18 ft<br/><br/>Hitting Zone<br/>Launch Monitor<br/>Lounge Seating", styles['TableCell']),
     Paragraph("LOUNGE<br/>~15 ft x 16 ft<br/><br/>Welcome Screen<br/>Kiosk<br/>Seating<br/>Beverage Area", styles['TableCell'])],
    [Paragraph("", styles['TableCell']),
     Paragraph("", styles['TableCell']),
     Paragraph("MECH / WC<br/>Storage + Restroom", styles['TableCell'])],
    [Paragraph("", styles['TableCell']),
     Paragraph("<b>← EXPANSION WALL →</b><br/>Future Bays 3 &amp; 4", styles['TableCell']),
     Paragraph("<b>ENTRY</b>", styles['TableCell'])],
]

layout_table = Table(layout_data, colWidths=[2.2*inch, 2.2*inch, 2.3*inch], rowHeights=[0.4*inch, 1.8*inch, 0.6*inch, 0.5*inch])
layout_table.setStyle(TableStyle([
    ('GRID', (0, 0), (-1, -1), 1, MED_GREEN),
    ('BACKGROUND', (0, 0), (1, 0), HexColor("#B7E4C7")),
    ('BACKGROUND', (0, 1), (1, 1), LIGHT_GREEN),
    ('BACKGROUND', (2, 1), (2, 2), LIGHT_GRAY),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))
story.append(layout_table)

story.append(Spacer(1, 16))
story.append(Paragraph(
    "Approximate total footprint: 45-48 ft wide x 30-35 ft deep = ~1,350-1,680 sq ft",
    styles['CalloutText']
))

story.append(PageBreak())

# --- NEXT STEPS ---
story.append(Paragraph("Recommended Next Steps", styles['SectionHead']))
story.append(Paragraph(
    "After your conversation with the Workhouse contact:",
    styles['Body']
))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Get dimensions:</b> Request floor plans or schedule a walk-through with a tape measure", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Measure ceiling:</b> Bring a laser measure — check multiple points (HVAC drops, beams, sprinklers)", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Photo-document:</b> Photograph electrical panel, HVAC units, existing plumbing, floor condition", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Get lease terms in writing:</b> Rate/sq ft, TI allowance, lease length, permitted modifications", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Ask about other tenants:</b> Who's next door? Noise-sensitive? Complementary?", styles['BulletItem']))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Report back:</b> With these details, we can build a financial model and determine if the unit works", styles['BulletItem']))

story.append(Spacer(1, 30))
story.append(HRFlowable(width="100%", thickness=1, color=MED_GRAY, spaceAfter=10))
story.append(Paragraph(
    "Project Fairway — Space Requirements v1.0 — July 2026 — Prepared by Russell Evans",
    styles['Footer']
))

# Build the PDF
doc.build(story)
print(f"PDF created successfully: {output_path}")
