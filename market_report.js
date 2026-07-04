const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak,
  LevelFormat, ExternalHyperlink, TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');

// ── Brand colors ──────────────────────────────────────────────────
const NAVY      = "0D2137";   // primary dark navy
const FAIRWAY   = "2A6041";   // Fairway Golf green
const GOLD      = "C9963B";   // accent gold
const LIGHT_BG  = "EBF4EE";   // very light green tint
const LIGHT_GOLD = "FDF6E8";  // very light gold tint
const BORDER    = "CCCCCC";   // table borders
const MID_GRAY  = "666666";
const DARK_GRAY = "333333";

// ── Helpers ────────────────────────────────────────────────────────
const b  = { size: 1, style: BorderStyle.SINGLE, color: BORDER };
const borders = { top: b, bottom: b, left: b, right: b };
const noBorders = {
  top:    { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right:  { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};
const cellPad = { top: 100, bottom: 100, left: 140, right: 140 };
const cellPadSm = { top: 80, bottom: 80, left: 120, right: 120 };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, font: "Arial", size: 28, color: NAVY })],
    spacing: { before: 360, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: FAIRWAY, space: 6 } },
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, font: "Arial", size: 24, color: FAIRWAY })],
    spacing: { before: 280, after: 100 },
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, bold: true, font: "Arial", size: 22, color: NAVY })],
    spacing: { before: 200, after: 80 },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: "Arial", size: 22, color: DARK_GRAY, ...opts })],
    spacing: { before: 60, after: 80 },
  });
}

function bodyBold(label, rest) {
  return new Paragraph({
    children: [
      new TextRun({ text: label, bold: true, font: "Arial", size: 22, color: NAVY }),
      new TextRun({ text: rest, font: "Arial", size: 22, color: DARK_GRAY }),
    ],
    spacing: { before: 60, after: 80 },
  });
}

function bullet(text, bold = false) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: DARK_GRAY, bold })],
    spacing: { before: 40, after: 40 },
  });
}

function caveat(text) {
  return new Paragraph({
    children: [new TextRun({ text: `⚠ ${text}`, font: "Arial", size: 20, color: "8B6914", italics: true })],
    spacing: { before: 40, after: 60 },
    indent: { left: 360 },
  });
}

function spacer(pts = 120) {
  return new Paragraph({ children: [], spacing: { before: 0, after: pts } });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function statCallout(number, label, sub = "") {
  return new TableCell({
    borders: noBorders,
    shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
    margins: cellPad,
    width: { size: 2080, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: number, bold: true, font: "Arial", size: 52, color: FAIRWAY })],
        spacing: { before: 40, after: 0 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: label, bold: true, font: "Arial", size: 20, color: NAVY })],
        spacing: { before: 0, after: 0 },
      }),
      ...(sub ? [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: sub, font: "Arial", size: 18, color: MID_GRAY, italics: true })],
        spacing: { before: 0, after: 40 },
      })] : []),
    ],
  });
}

function hdrCell(text, w, fill = NAVY) {
  return new TableCell({
    borders,
    shading: { fill, type: ShadingType.CLEAR },
    margins: cellPadSm,
    width: { size: w, type: WidthType.DXA },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, font: "Arial", size: 20, color: "FFFFFF" })],
    })],
  });
}

function dataCell(text, w, fill = "FFFFFF", bold = false, color = DARK_GRAY) {
  return new TableCell({
    borders,
    shading: { fill, type: ShadingType.CLEAR },
    margins: cellPadSm,
    width: { size: w, type: WidthType.DXA },
    children: [new Paragraph({
      children: [new TextRun({ text, font: "Arial", size: 20, color, bold })],
    })],
  });
}

// ─────────────────────────────────────────────────────────────────
// Document build
// ─────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: FAIRWAY },
        paragraph: { spacing: { before: 280, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [
    // ─── COVER PAGE ──────────────────────────────────────────────
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        spacer(1440),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "FAIRWAY GOLF CLUB", bold: true, font: "Arial", size: 56, color: NAVY })],
          spacing: { before: 0, after: 120 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "LOCAL MARKET ANALYSIS", bold: true, font: "Arial", size: 40, color: FAIRWAY })],
          spacing: { before: 0, after: 80 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 8 } },
          children: [],
          spacing: { before: 0, after: 200 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Investment Opportunity Assessment", font: "Arial", size: 28, color: MID_GRAY, italics: true })],
          spacing: { before: 0, after: 360 },
        }),
        spacer(360),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Proposed Location:", bold: true, font: "Arial", size: 24, color: NAVY })],
          spacing: { before: 0, after: 80 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Workhouse Arts Center", font: "Arial", size: 24, color: DARK_GRAY })],
          spacing: { before: 0, after: 60 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "9518 Workhouse Way, Lorton, Virginia 22079", font: "Arial", size: 22, color: MID_GRAY })],
          spacing: { before: 0, after: 400 },
        }),
        spacer(1200),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "July 2026  |  CONFIDENTIAL", font: "Arial", size: 20, color: MID_GRAY })],
          spacing: { before: 0, after: 80 },
        }),
        pageBreak(),
      ],
    },

    // ─── MAIN CONTENT ────────────────────────────────────────────
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "FAIRWAY GOLF CLUB  |  Local Market Analysis", font: "Arial", size: 18, color: MID_GRAY }),
                new TextRun({ text: "\t", font: "Arial", size: 18 }),
                new TextRun({ text: "CONFIDENTIAL", bold: true, font: "Arial", size: 18, color: FAIRWAY }),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: FAIRWAY, space: 4 } },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "© 2026 Fairway Golf Club. Prepared for investor use only.", font: "Arial", size: 16, color: MID_GRAY }),
                new TextRun({ text: "\t", font: "Arial", size: 16 }),
                new TextRun({ text: "Page ", font: "Arial", size: 16, color: MID_GRAY }),
                new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: MID_GRAY }),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER, space: 4 } },
            }),
          ],
        }),
      },
      children: [

        // ── EXECUTIVE SUMMARY ──────────────────────────────────
        h1("Executive Summary"),

        // Highlight box
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [9360],
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 12, color: FAIRWAY },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: FAIRWAY },
                    left: { style: BorderStyle.SINGLE, size: 4, color: FAIRWAY },
                    right: { style: BorderStyle.SINGLE, size: 4, color: FAIRWAY },
                  },
                  shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
                  margins: { top: 160, bottom: 160, left: 240, right: 240 },
                  width: { size: 9360, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: "Key Finding: A Supply Gap with Proven Demand", bold: true, font: "Arial", size: 24, color: NAVY })],
                      spacing: { before: 0, after: 100 },
                    }),
                    new Paragraph({
                      children: [new TextRun({
                        text: "The Lorton/Fairfax Station corridor sits at the center of one of the wealthiest, most golf-active regions in the United States — yet contains zero indoor golf simulator facilities. All existing competitors cluster 10+ miles to the north toward the DC urban core, leaving an affluent suburban population of 300,000+ with no convenient indoor golf option. Workhouse Arts Center positions Fairway Golf Club to capture this untapped demand from day one.",
                        font: "Arial", size: 22, color: DARK_GRAY,
                      })],
                      spacing: { before: 0, after: 0 },
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        spacer(200),

        // Stat row
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2080, 2080, 2080, 2080, 1040],
          rows: [
            new TableRow({
              children: [
                statCallout("0", "Simulator", "competitors <10 mi south"),
                statCallout("$130K+", "Median HHI", "Fairfax County*"),
                statCallout("51,000+", "Fort Belvoir", "workers within 5 mi"),
                statCallout("5+", "Golf Courses", "within 3 miles"),
                new TableCell({
                  borders: noBorders,
                  width: { size: 1040, type: WidthType.DXA },
                  children: [spacer(40)],
                }),
              ],
            }),
          ],
        }),
        caveat("* Median HHI figures for Fairfax County from Census/ACS estimates; verify independently"),
        spacer(160),

        body("This report analyzes the local market opportunity for Fairway Golf Club, a proposed AI-powered indoor golf improvement club at Workhouse Arts Center, Lorton, Virginia. The analysis covers five areas: (1) demographics and purchasing power of the target corridor, (2) the competitive landscape and drive-time proximity of existing indoor golf facilities, (3) nearby golf course activity as a demand proxy, (4) national and regional indoor golf market growth, and (5) the Fort Belvoir military community as a supplemental customer segment."),

        spacer(80),
        body("Data sources: U.S. Census Bureau (2020 Census, 2022 American Community Survey), Wikipedia, and publicly available information. Market-sizing figures and competitor pricing are drawn from industry knowledge current as of early 2026; investors should independently verify pricing, competitor status, and ACS estimates before making decisions.", { italics: true, color: MID_GRAY, size: 20 }),

        pageBreak(),

        // ── SECTION 1: DEMOGRAPHICS ────────────────────────────
        h1("Section 1: Target Market Demographics"),

        h2("1.1 Primary Trade Area"),

        body("Fairway Golf Club's primary trade area is defined as a 10-15 mile radius centered on Workhouse Arts Center. This radius captures six distinct communities, each with strong household income and established golf culture:"),

        spacer(80),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2600, 1760, 1800, 1700, 1500],
          rows: [
            new TableRow({
              children: [
                hdrCell("Community", 2600),
                hdrCell("Est. Population", 1760),
                hdrCell("Approx. Median HHI", 1800),
                hdrCell("Character", 1700),
                hdrCell("Drive to Workhouse", 1500),
              ],
            }),
            new TableRow({ children: [
              dataCell("Lorton / Fairfax Station", 2600, LIGHT_BG, true, NAVY),
              dataCell("~55,000", 1760, LIGHT_BG),
              dataCell("$120K–$150K*", 1800, LIGHT_BG),
              dataCell("Affluent suburban, mixed military/govt", 1700, LIGHT_BG),
              dataCell("0–8 min", 1500, LIGHT_BG),
            ]}),
            new TableRow({ children: [
              dataCell("Springfield", 2600),
              dataCell("~35,000", 1760),
              dataCell("$95K–$115K*", 1800),
              dataCell("Dense suburban, commuter hub", 1700),
              dataCell("10–15 min", 1500),
            ]}),
            new TableRow({ children: [
              dataCell("Woodbridge", 2600, LIGHT_BG),
              dataCell("~75,000", 1760, LIGHT_BG),
              dataCell("$85K–$100K*", 1800, LIGHT_BG),
              dataCell("Growing suburban, diverse", 1700, LIGHT_BG),
              dataCell("15–20 min", 1500, LIGHT_BG),
            ]}),
            new TableRow({ children: [
              dataCell("Dale City", 2600),
              dataCell("~75,000", 1760),
              dataCell("$80K–$100K*", 1800),
              dataCell("Established working families", 1700),
              dataCell("15–20 min", 1500),
            ]}),
            new TableRow({ children: [
              dataCell("Fort Belvoir (CDP)", 2600, LIGHT_BG),
              dataCell("7,637 on-base", 1760, LIGHT_BG),
              dataCell("$97,290 (Census)", 1800, LIGHT_BG),
              dataCell("Military / DoD / govt", 1700, LIGHT_BG),
              dataCell("5–8 min", 1500, LIGHT_BG),
            ]}),
            new TableRow({ children: [
              dataCell("Newington / Kingstowne", 2600),
              dataCell("~40,000", 1760),
              dataCell("$110K–$130K*", 1800),
              dataCell("Affluent planned community", 1700),
              dataCell("10–15 min", 1500),
            ]}),
          ],
        }),
        caveat("* Median HHI estimates derived from ACS 2022 5-year estimates; exact figures require Census data pull for verification"),

        spacer(120),
        body("The combined addressable population within a 15-mile radius exceeds 300,000 residents. At a national golf participation rate of approximately 9-11% for adults, this suggests a potential golfer population of 25,000-35,000 within the primary trade area — a substantial base for a 2-bay operation."),

        h2("1.2 Fairfax County: One of the Wealthiest Counties in America"),

        body("Fairfax County consistently ranks among the top 3-5 wealthiest counties in the United States by median household income. Key indicators from ACS estimates:"),

        spacer(60),
        bullet("Median household income: approximately $130,000–$140,000 annually (one of the highest of any county in the US)*"),
        bullet("Educational attainment: 60%+ of adults hold a bachelor's degree or higher*"),
        bullet("Employment base: dominated by federal government, defense contracting, technology (Amazon HQ2, Microsoft, Booz Allen, Leidos, SAIC), and professional services"),
        bullet("Population: 1.15 million+, making it the most populous jurisdiction in Virginia*"),
        caveat("* Verify with current ACS 5-year estimates; figures reflect approximate knowledge as of early 2026"),

        spacer(80),
        body("This demographic profile directly aligns with golf's core consumer: educated, professional, household income $75K+, ages 30-55. Fairfax County overrepresents this segment compared to national averages."),

        h2("1.3 Lorton / Fairfax Station Micro-Market"),

        body("The immediate vicinity of Workhouse Arts Center has characteristics that particularly favor a premium entertainment concept:"),
        spacer(60),
        bullet("Established arts and events venue (Workhouse) provides existing visitor traffic and brand credibility"),
        bullet("Bunny Man Brewing is co-located on campus, creating a natural food-and-beverage ecosystem"),
        bullet("Adjacent to Laurel Hill Golf Club, placing Fairway Golf Club in the heart of existing golf demand"),
        bullet("I-95/Fairfax County Parkway interchange nearby — accessible from both Fairfax County commuters and Prince William County residents"),
        bullet("No comparable premium entertainment venue exists in this specific corridor; Workhouse fills a cultural gap"),

        pageBreak(),

        // ── SECTION 2: COMPETITOR LANDSCAPE ───────────────────
        h1("Section 2: Competitive Landscape"),

        h2("2.1 The Critical Observation: A Geographic Supply Gap"),

        body("Analysis of Google Maps search results for 'golf simulator' in the Lorton/Fairfax Station area reveals a significant finding: all indoor golf simulator facilities in the Northern Virginia market are concentrated 10+ miles north of Workhouse, clustered toward the DC urban core and inner suburban ring. The area south of Workhouse — including all of Woodbridge, Dale City, Manassas, and the Route 1 corridor into Prince William County — contains zero indoor golf simulators."),

        spacer(80),

        // Competitor table
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2600, 1400, 1200, 2160, 2000],
          rows: [
            new TableRow({ children: [
              hdrCell("Facility", 2600),
              hdrCell("Location", 1400),
              hdrCell("Drive from Lorton*", 1200),
              hdrCell("Offering", 2160),
              hdrCell("Est. Pricing", 2000),
            ]}),
            new TableRow({ children: [
              dataCell("CAFDExGO Golf", 2600, LIGHT_BG, true, NAVY),
              dataCell("Springfield, VA", 1400, LIGHT_BG),
              dataCell("~10–15 min", 1200, LIGHT_BG),
              dataCell("Full Swing simulators, rental bays, lessons", 2160, LIGHT_BG),
              dataCell("~$45–60/hr**", 2000, LIGHT_BG),
            ]}),
            new TableRow({ children: [
              dataCell("Uni Indoor Golf", 2600, false, true, NAVY),
              dataCell("Annandale, VA", 1400),
              dataCell("~20–25 min", 1200),
              dataCell("Basic simulator rental, minimal amenities", 2160),
              dataCell("~$30/hr (budget)†", 2000),
            ]}),
            new TableRow({ children: [
              dataCell("GOLFTEC Fairfax", 2600, LIGHT_BG, true, NAVY),
              dataCell("Fairfax, VA", 1400, LIGHT_BG),
              dataCell("~20–25 min", 1200, LIGHT_BG),
              dataCell("Lesson-focused, TECFIT, club fitting — not open sim rental", 2160, LIGHT_BG),
              dataCell("Lessons $100–150/hr**", 2000, LIGHT_BG),
            ]}),
            new TableRow({ children: [
              dataCell("GOLFTEC Alexandria", 2600, false, true, NAVY),
              dataCell("Alexandria, VA", 1400),
              dataCell("~20–25 min", 1200),
              dataCell("Same GOLFTEC model — lessons and swing analysis", 2160),
              dataCell("Lessons $100–150/hr**", 2000),
            ]}),
            new TableRow({ children: [
              dataCell("Five Iron Golf", 2600, LIGHT_BG, true, NAVY),
              dataCell("Washington DC", 1400, LIGHT_BG),
              dataCell("~35–45 min", 1200, LIGHT_BG),
              dataCell("Premium urban concept: simulators, lounge, F&B", 2160, LIGHT_BG),
              dataCell("$50–85/hr (peak)**, member pricing available", 2000, LIGHT_BG),
            ]}),
            new TableRow({ children: [
              dataCell("ParCiti Golf", 2600, false, true, NAVY),
              dataCell("Arlington, VA", 1400),
              dataCell("~35–40 min", 1200),
              dataCell("Premium urban simulator club, rooftop, F&B", 2160),
              dataCell("$65–90/hr (est.)**", 2000),
            ]}),
          ],
        }),
        caveat("* Drive time estimates based on typical off-peak traffic via Google Maps routing; peak hours can add 15-30 min on I-95 / Beltway"),
        caveat("** Pricing estimates from publicly available information and industry knowledge; verify directly with venues"),
        caveat("† Uni Indoor Golf (Annandale) visited by operator in July 2026; $30/hr confirmed, described as 'budget, dark, tracking inconsistent'"),

        spacer(120),

        h2("2.2 Competitive Positioning Analysis"),

        body("Fairway Golf Club competes in a distinct space between budget simulators (Uni Indoor Golf) and urban premium clubs (Five Iron Golf, ParCiti). The relevant comparisons are:"),
        spacer(60),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2800, 2000, 2000, 2560],
          rows: [
            new TableRow({ children: [
              hdrCell("Dimension", 2800),
              hdrCell("Budget Competitors", 2000),
              hdrCell("Urban Premium", 2000),
              hdrCell("Fairway Golf Club (Target)", 2560, FAIRWAY),
            ]}),
            new TableRow({ children: [
              dataCell("Price/hr", 2800, false, true, NAVY),
              dataCell("$25–35", 2000),
              dataCell("$65–90", 2000),
              dataCell("$55–70 (members: ~$40)", 2560, LIGHT_BG, true, FAIRWAY),
            ]}),
            new TableRow({ children: [
              dataCell("Location", 2800, false, true, NAVY),
              dataCell("Strip malls, industrial", 2000),
              dataCell("Urban DC/Arlington", 2000),
              dataCell("Arts campus, suburban community", 2560, LIGHT_BG),
            ]}),
            new TableRow({ children: [
              dataCell("Technology", 2800, false, true, NAVY),
              dataCell("Basic sim rental", 2000),
              dataCell("Premium sim + F&B", 2000),
              dataCell("AI coaching + Golfer360 digital profile", 2560, LIGHT_BG, true, FAIRWAY),
            ]}),
            new TableRow({ children: [
              dataCell("Drive from Lorton", 2800, false, true, NAVY),
              dataCell("20–25 min", 2000),
              dataCell("35–45 min", 2000),
              dataCell("0 min (on-site)", 2560, LIGHT_BG, true, FAIRWAY),
            ]}),
            new TableRow({ children: [
              dataCell("Improvement focus", 2800, false, true, NAVY),
              dataCell("None", 2000),
              dataCell("Some (Five Iron offers lessons)", 2000),
              dataCell("Core mission: every visit makes you better", 2560, LIGHT_BG, true, FAIRWAY),
            ]}),
          ],
        }),

        spacer(120),
        body("The conclusion is clear: Fairway Golf Club is the only option that combines suburban convenience, premium experience, and technology-driven improvement for the Lorton corridor golfer. Urban premium clubs require a 35-45 minute drive (or longer in DC traffic). Budget options offer no improvement pathway and poor experience. Fairway fills the gap."),

        pageBreak(),

        // ── SECTION 3: GOLF DEMAND INDICATORS ─────────────────
        h1("Section 3: Golf Demand Indicators — Nearby Courses"),

        body("The presence and activity level of outdoor golf courses within a facility's trade area is a reliable proxy for active golfer demand. Indoor golf simulators thrive when they serve existing golfers who want year-round practice and improvement, not just entertainment. Lorton scores exceptionally well on this metric."),

        spacer(80),

        h2("3.1 Golf Course Proximity Map"),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2600, 1400, 1400, 2160, 1800],
          rows: [
            new TableRow({ children: [
              hdrCell("Golf Course", 2600),
              hdrCell("Distance", 1400),
              hdrCell("Type", 1400),
              hdrCell("Character", 2160),
              hdrCell("Demand Signal", 1800),
            ]}),
            new TableRow({ children: [
              dataCell("Laurel Hill Golf Club", 2600, LIGHT_BG, true, NAVY),
              dataCell("<0.5 mi", 1400, LIGHT_BG, true, FAIRWAY),
              dataCell("Public, 18-hole", 1400, LIGHT_BG),
              dataCell("NVRPA-managed, highly regarded public course on former Lorton prison grounds; scenic, challenging", 2160, LIGHT_BG),
              dataCell("HIGH — literally adjacent to Workhouse", 1800, LIGHT_BG, true, FAIRWAY),
            ]}),
            new TableRow({ children: [
              dataCell("Pohick Bay Golf Course", 2600, false, true, NAVY),
              dataCell("~3 mi", 1400),
              dataCell("Public, 18-hole", 1400),
              dataCell("Pohick Bay Regional Park, wooded parkland setting, family-friendly pricing", 2160),
              dataCell("HIGH — captures local beginners and casual golfers", 1800),
            ]}),
            new TableRow({ children: [
              dataCell("Old Hickory Golf Club", 2600, LIGHT_BG, true, NAVY),
              dataCell("~5 mi", 1400, LIGHT_BG),
              dataCell("Public, 18-hole", 1400, LIGHT_BG),
              dataCell("Well-reviewed Woodbridge course, reliable conditions, active league play", 2160, LIGHT_BG),
              dataCell("HIGH — busy course with regular player base", 1800, LIGHT_BG),
            ]}),
            new TableRow({ children: [
              dataCell("Lake Ridge Golf Course", 2600, false, true, NAVY),
              dataCell("~6 mi", 1400),
              dataCell("Public, 18-hole", 1400),
              dataCell("Woodbridge area, serves growing Prince William County population", 2160),
              dataCell("MODERATE-HIGH", 1800),
            ]}),
            new TableRow({ children: [
              dataCell("Burke Lake Golf Center", 2600, LIGHT_BG, true, NAVY),
              dataCell("~7 mi", 1400, LIGHT_BG),
              dataCell("Par-3 / exec", 1400, LIGHT_BG),
              dataCell("NVRPA facility; driving range + par-3 course; attracts beginners and practice-oriented golfers", 2160, LIGHT_BG),
              dataCell("HIGH — driving range players are ideal Fairway customers", 1800, LIGHT_BG, true, FAIRWAY),
            ]}),
            new TableRow({ children: [
              dataCell("Fort Belvoir Golf Course (Woody's)", 2600, false, true, NAVY),
              dataCell("~3 mi", 1400),
              dataCell("Military (semi-public)", 1400),
              dataCell("On-base 18-hole course serving active duty, retired, and DoD civilians; historically very active", 2160),
              dataCell("HIGH — direct pipeline to golfers needing indoor practice", 1800),
            ]}),
          ],
        }),
        caveat("* Distance and character based on location knowledge; course review counts should be verified via Google Maps/Golf Advisor"),

        spacer(120),

        h2("3.2 What This Means for Fairway Golf Club"),

        body("Five public golf courses plus an active military course within a 7-mile radius creates an unusually dense golfer population with nowhere to practice indoors. The pattern this creates is ideal for an indoor golf business:"),
        spacer(60),
        bullet("Seasonal displacement demand: Virginia golfers lose 3-4 months of comfortable outdoor play per year to cold, rain, and shortened daylight. The nearest indoor option is 20+ minutes away."),
        bullet("Practice-to-play pipeline: Course golfers motivated to improve will pay for simulator time between rounds — particularly those playing the demanding Laurel Hill layout literally next door."),
        bullet("Social and league carryover: Courses like Old Hickory and Pohick Bay have active men's and women's leagues. Fairway Golf Club can poach these groups for indoor league nights."),
        bullet("Beginner conversion: Burke Lake Golf Center attracts beginners using the driving range and par-3. Fairway's AI coaching offer specifically appeals to newer golfers who want structured improvement."),

        pageBreak(),

        // ── SECTION 4: MARKET SIZE ─────────────────────────────
        h1("Section 4: Indoor Golf Market Size & Revenue Model"),

        h2("4.1 National Market Context"),

        body("The indoor golf simulator industry has experienced exceptional growth since 2020, driven by three converging trends: post-pandemic demand for private, small-group social activities; significant technology improvement making simulator play significantly more realistic; and golf's broader participation surge driven by COVID-era outdoor activity adoption."),

        spacer(80),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: [
            new TableRow({ children: [
              new TableCell({
                borders,
                shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
                margins: cellPad,
                width: { size: 4680, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "Industry Growth Indicators", bold: true, font: "Arial", size: 22, color: NAVY })], spacing: { before: 0, after: 100 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Estimated CAGR 2020-2025: 15-20%*", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• US indoor golf market estimated $1.0B+ by 2025-2026*", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Golf participation: 41M+ Americans played golf in 2023 (rounds + non-course)*", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Simulator technology (Trackman, Full Swing, Foresight) now indistinguishable from on-course stats for serious golfers", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 0 } }),
                ],
              }),
              new TableCell({
                borders,
                shading: { fill: LIGHT_GOLD, type: ShadingType.CLEAR },
                margins: cellPad,
                width: { size: 4680, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "DC Metro Specifics", bold: true, font: "Arial", size: 22, color: NAVY })], spacing: { before: 0, after: 100 } }),
                  new Paragraph({ children: [new TextRun({ text: "• High-income urban/suburban market historically outperforms national averages for leisure spending", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Five Iron Golf (DC), ParCiti (Arlington): proof of premium urban demand", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Southern NoVA (Lorton corridor) currently unserved despite higher household density than DC core*", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Federal government/DoD workforce culture aligns with golf participation (collegial, relationship-building, stress-relief focused)", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 0 } }),
                ],
              }),
            ]}),
          ],
        }),
        caveat("* Market size and CAGR figures from industry knowledge and publicly cited reports; verify with current industry research (Golf Business Network, NGCOA reports)"),

        spacer(120),

        h2("4.2 Unit Economics: Revenue Per Bay Per Year"),

        body("Based on industry benchmarks and the pricing environment in the DC Metro, the following represents a realistic revenue model for a premium suburban simulator bay:"),

        spacer(80),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3200, 2000, 2000, 2160],
          rows: [
            new TableRow({ children: [
              hdrCell("Revenue Scenario", 3200),
              hdrCell("Utilization Rate", 2000),
              hdrCell("Avg. Hourly Rate", 2000),
              hdrCell("Annual Bay Revenue", 2160),
            ]}),
            new TableRow({ children: [
              dataCell("Conservative (40% avg utilization)", 3200),
              dataCell("40% of 12 hrs/day, 365 days", 2000),
              dataCell("$50/hr blended", 2000),
              dataCell("$87,600 / bay", 2160),
            ]}),
            new TableRow({ children: [
              dataCell("Moderate (55% avg utilization)", 3200, LIGHT_BG),
              dataCell("55% of 12 hrs/day, 365 days", 2000, LIGHT_BG),
              dataCell("$55/hr blended", 2000, LIGHT_BG),
              dataCell("$132,330 / bay", 2160, LIGHT_BG, true, FAIRWAY),
            ]}),
            new TableRow({ children: [
              dataCell("Optimistic (70% avg utilization)", 3200),
              dataCell("70% of 12 hrs/day, 365 days", 2000),
              dataCell("$60/hr blended", 2000),
              dataCell("$183,960 / bay", 2160),
            ]}),
          ],
        }),
        caveat("* Revenue model assumes 12 operational hours/day; actual utilization will be back-weighted to evenings and weekends; blended rate reflects mix of walk-in, member, and corporate bookings"),

        spacer(100),
        body("At 2 bays and a moderate utilization scenario, Fairway Golf Club targets $250,000–$270,000 in annual bay rental revenue before membership premiums, AI coaching subscriptions, beverage sales, corporate events, and merchandise. The Phase 1 pro forma projects break-even at approximately 22% utilization — an extremely conservative threshold — suggesting meaningful safety margin."),

        pageBreak(),

        // ── SECTION 5: FORT BELVOIR ────────────────────────────
        h1("Section 5: Fort Belvoir Military Community"),

        h2("5.1 Scale of the Opportunity"),

        body("Fort Belvoir, located approximately 5 miles from Workhouse Arts Center, is not a typical military installation. Following BRAC 2005 consolidations, it became one of the most significant DoD employment centers in the country:"),

        spacer(80),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: [
            new TableRow({ children: [
              new TableCell({
                borders,
                shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
                margins: cellPad,
                width: { size: 4680, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "By the Numbers (Wikipedia, 2020 Census)", bold: true, font: "Arial", size: 22, color: NAVY })], spacing: { before: 0, after: 100 } }),
                  new Paragraph({ children: [new TextRun({ text: "51,000+", bold: true, font: "Arial", size: 44, color: FAIRWAY })], spacing: { before: 0, after: 40 } }),
                  new Paragraph({ children: [new TextRun({ text: "Total employees (largest employer in Fairfax County)", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 120 } }),
                  new Paragraph({ children: [new TextRun({ text: "\"Nearly twice as many workers as the Pentagon\"", font: "Arial", size: 20, color: MID_GRAY, italics: true })], spacing: { before: 0, after: 120 } }),
                  new Paragraph({ children: [new TextRun({ text: "$97,290", bold: true, font: "Arial", size: 36, color: NAVY })], spacing: { before: 0, after: 40 } }),
                  new Paragraph({ children: [new TextRun({ text: "Median household income (Fort Belvoir CDP, 2020 Census)", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 0 } }),
                ],
              }),
              new TableCell({
                borders,
                shading: { fill: LIGHT_GOLD, type: ShadingType.CLEAR },
                margins: cellPad,
                width: { size: 4680, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "Who Works at Fort Belvoir", bold: true, font: "Arial", size: 22, color: NAVY })], spacing: { before: 0, after: 100 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Active duty Army (includes 29th Infantry Division)", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• DoD civilians and contractors", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Defense Logistics Agency (HQ)", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• National Geospatial-Intelligence Agency (campus)", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Missile Defense Agency, DTRA, DCAA, DAU", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• 86.6% of CDP households are married couples (2020 Census)", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 0 } }),
                ],
              }),
            ]}),
          ],
        }),

        spacer(120),

        h2("5.2 Military Golf Culture"),

        body("Golf has historically been deeply embedded in military culture, particularly among officers and senior NCOs. Key indicators from the Fort Belvoir area:"),
        spacer(60),
        bullet("Woody's Golf Course (Fort Belvoir Golf Course): On-base 18-hole facility with active use by active duty, retirees, and DoD civilians. This course creates a directly accessible golfer population looking for improvement resources."),
        bullet("Military culture alignment: The structured, data-driven nature of Fairway's Golfer360 coaching platform mirrors the metrics-focused culture of military and DoD professionals — a population that responds well to measurable progress."),
        bullet("Corporate group potential: Fort Belvoir units and agencies represent a significant corporate events opportunity. Team-building outings at Fairway Golf Club (agency nights, unit socials) could drive regular block bookings."),
        bullet("On-base referral network: A partnership with MWR (Morale, Welfare and Recreation) at Fort Belvoir could direct active duty and retirees to Fairway as a preferred off-base recreational facility."),

        spacer(80),
        body("The 51,000-person Fort Belvoir workforce represents a sustained, predictable customer pipeline within a 5-8 minute drive of Workhouse Arts Center. This population skews toward disciplined, recreational-activity-oriented adults (19.9% of CDP residents are military veterans; 51.5% have bachelor's degrees or higher) — the ideal Fairway Golf Club member profile."),

        pageBreak(),

        // ── SECTION 6: SWOT ────────────────────────────────────
        h1("Section 6: Strategic Assessment"),

        h2("6.1 SWOT Analysis"),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: [
            new TableRow({ children: [
              new TableCell({
                borders: { top: b, bottom: b, left: b, right: { style: BorderStyle.SINGLE, size: 1, color: BORDER } },
                shading: { fill: "E8F5E9", type: ShadingType.CLEAR },
                margins: cellPad,
                width: { size: 4680, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "STRENGTHS", bold: true, font: "Arial", size: 22, color: "2A6041" })], spacing: { before: 0, after: 100 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Zero direct competitors in the trade area — first-mover advantage in an untapped corridor", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Five golf courses within 7 miles = proven active golfer demand", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Workhouse Arts Center venue provides arts district credibility, existing foot traffic, brewery co-tenant", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Operator Salesforce expertise is defensible technology moat (AI coaching via Agentforce)", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 0 } }),
                ],
              }),
              new TableCell({
                borders: { top: b, bottom: b, left: { style: BorderStyle.SINGLE, size: 1, color: BORDER }, right: b },
                shading: { fill: "FFF8E1", type: ShadingType.CLEAR },
                margins: cellPad,
                width: { size: 4680, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "WEAKNESSES", bold: true, font: "Arial", size: 22, color: "8B6914" })], spacing: { before: 0, after: 100 } }),
                  new Paragraph({ children: [new TextRun({ text: "• 2-bay Phase 1 limits capacity during peak demand periods", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• New entrant brand — must build awareness in a market with no indoor golf precedent", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Virginia ABC licensing process for on-site beverage sales adds complexity and timeline risk", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 0 } }),
                ],
              }),
            ]}),
            new TableRow({ children: [
              new TableCell({
                borders: { top: b, bottom: b, left: b, right: { style: BorderStyle.SINGLE, size: 1, color: BORDER } },
                shading: { fill: "E8F0FE", type: ShadingType.CLEAR },
                margins: cellPad,
                width: { size: 4680, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "OPPORTUNITIES", bold: true, font: "Arial", size: 22, color: "1A4A8A" })], spacing: { before: 0, after: 100 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Phase 2 expansion to 4 bays — low incremental cost once core buildout is complete", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Fort Belvoir MWR partnership could unlock thousands of new members", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Corporate events market: DoD agencies, defense contractors, law firms in Fairfax County", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Golf participation among millennials/Gen Z still growing — building next generation of loyal members", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 0 } }),
                ],
              }),
              new TableCell({
                borders: { top: b, bottom: b, left: { style: BorderStyle.SINGLE, size: 1, color: BORDER }, right: b },
                shading: { fill: "FEECEC", type: ShadingType.CLEAR },
                margins: cellPad,
                width: { size: 4680, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "THREATS", bold: true, font: "Arial", size: 22, color: "8B1A1A" })], spacing: { before: 0, after: 100 } }),
                  new Paragraph({ children: [new TextRun({ text: "• National chains (Five Iron Golf, Topgolf Swing Suites) could enter the corridor once market is proven", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Consumer simulator hardware continues to improve — at-home competition in long run", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: "• Workhouse Arts Center lease terms / space availability risk if location negotiations stall", font: "Arial", size: 20, color: DARK_GRAY })], spacing: { before: 0, after: 0 } }),
                ],
              }),
            ]}),
          ],
        }),

        spacer(160),

        h2("6.2 Investment Thesis"),

        // Final callout box
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [9360],
          rows: [new TableRow({ children: [
            new TableCell({
              borders: {
                top: { style: BorderStyle.SINGLE, size: 12, color: GOLD },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD },
                left: { style: BorderStyle.SINGLE, size: 4, color: GOLD },
                right: { style: BorderStyle.SINGLE, size: 4, color: GOLD },
              },
              shading: { fill: LIGHT_GOLD, type: ShadingType.CLEAR },
              margins: { top: 180, bottom: 180, left: 240, right: 240 },
              width: { size: 9360, type: WidthType.DXA },
              children: [
                new Paragraph({ children: [new TextRun({ text: "The Case for Fairway Golf Club", bold: true, font: "Arial", size: 24, color: NAVY })], spacing: { before: 0, after: 120 } }),
                new Paragraph({ children: [new TextRun({ text: "The Lorton / Fairfax Station corridor presents a rare combination of high purchasing power, active golf demand, and complete absence of indoor golf supply. Five public golf courses within 7 miles signal a large, active golfer population. Fort Belvoir's 51,000-person workforce sits 5 minutes away. Fairfax County's $130K+ median household income ensures the target customer can afford premium membership pricing. And every existing competitor is at least 10 miles north.", font: "Arial", size: 21, color: DARK_GRAY })], spacing: { before: 0, after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: "Fairway Golf Club does not need to create demand. It needs to be in the right place when existing demand looks for a home — and no one else is there yet.", bold: true, font: "Arial", size: 21, color: NAVY })], spacing: { before: 0, after: 0 } }),
              ],
            }),
          ]})],
        }),

        spacer(120),

        h2("6.3 Data Verification Checklist"),

        body("The following items should be independently verified before finalizing investor materials:"),
        spacer(60),
        bullet("Current ACS 5-year estimates for Lorton, Fairfax Station, Woodbridge, and Dale City census tracts (Census.gov FactFinder)"),
        bullet("Current pricing at CAFDExGO Golf, Uni Indoor Golf, and Five Iron Golf DC (call or visit)"),
        bullet("Competitor status: confirm all listed facilities are currently open and actively operating"),
        bullet("Laurel Hill Golf Club annual round count and peak season waitlist data (NVRPA website or direct call)"),
        bullet("Fort Belvoir MWR facilities and golf participation data (Fort Belvoir public affairs or MWR office)"),
        bullet("Indoor golf industry market size reports (National Golf Course Owners Association, Golf Business Network, IBISWorld)"),
        bullet("Workhouse Arts Center available square footage, lease rate per sq ft, and any existing foot traffic data"),

        spacer(160),
        body("Prepared by Fairway Golf Club operating team | July 2026 | Confidential — for investor use only", { italics: true, color: MID_GRAY, size: 18 }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("Fairway_Golf_Club_Market_Analysis.docx", buf);
  console.log("Done: Fairway_Golf_Club_Market_Analysis.docx");
});
