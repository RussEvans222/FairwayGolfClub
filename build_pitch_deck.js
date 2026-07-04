const pptxgen = require("/usr/local/lib/node_modules_global/lib/node_modules/pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Russell Evans";
pres.title = "Fairway Golf Club — Investor Pitch";

// --- PALETTE ---
const C = {
  navy: "1B2A4A",
  green: "2D6A4F",
  lightGreen: "40916C",
  gold: "D4A853",
  cream: "FAF8F5",
  white: "FFFFFF",
  dark: "1A1A2E",
  gray: "64748B",
  lightGray: "F1F5F9",
  medGray: "94A3B8",
};

const makeShadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 3, angle: 45, opacity: 0.12 });

// ==========================================
// SLIDE 1: TITLE
// ==========================================
let slide = pres.addSlide();
slide.background = { color: C.navy };
slide.addText("FAIRWAY GOLF CLUB", {
  x: 0.8, y: 1.5, w: 8.4, h: 1.2,
  fontSize: 44, fontFace: "Calibri", bold: true, color: C.white,
  charSpacing: 4
});
slide.addText("The First AI-Powered Golf Improvement Club", {
  x: 0.8, y: 2.7, w: 8, h: 0.6,
  fontSize: 20, fontFace: "Calibri", color: C.gold, italic: true
});
slide.addText("Investor Pitch  |  July 2026", {
  x: 0.8, y: 4.5, w: 5, h: 0.4,
  fontSize: 12, fontFace: "Calibri", color: C.medGray
});
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 3.5, w: 2.5, h: 0.04, fill: { color: C.gold }
});
slide.addNotes("Title slide. Introduce yourself and the concept: AI-powered indoor golf improvement club at Workhouse Arts Center, Lorton, Virginia.");

// ==========================================
// SLIDE 2: THE PROBLEM
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.cream };
slide.addText("THE PROBLEM", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 28, fontFace: "Calibri", bold: true, color: C.navy
});
slide.addText([
  { text: "Golf simulators are everywhere. Golf improvement is nowhere.", options: { breakLine: true, bold: true, fontSize: 18, color: C.dark } },
  { text: "", options: { breakLine: true, fontSize: 10 } },
  { text: "Existing indoor golf businesses are:", options: { breakLine: true, fontSize: 14, color: C.gray } },
], { x: 0.8, y: 1.2, w: 8.5, h: 1.2, fontFace: "Calibri" });

const problems = [
  ["Dark, dingy rental spaces", "No ambiance, no community, no reason to come back"],
  ["Zero personalization", "Every visit starts from scratch — no data, no continuity"],
  ["Entertainment-only", "Fun once, but doesn't make you a better golfer"],
  ["No technology moat", "Anyone can buy a simulator; nobody's building the software layer"]
];
let py = 2.6;
problems.forEach(([title, desc]) => {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y: py, w: 8.4, h: 0.65, fill: { color: C.white }, rectRadius: 0.05,
    shadow: makeShadow()
  });
  slide.addText(title, {
    x: 1.1, y: py + 0.05, w: 3.5, h: 0.55, fontSize: 13, fontFace: "Calibri", bold: true, color: C.navy, valign: "middle"
  });
  slide.addText(desc, {
    x: 4.6, y: py + 0.05, w: 4.4, h: 0.55, fontSize: 11, fontFace: "Calibri", color: C.gray, valign: "middle"
  });
  py += 0.75;
});
slide.addNotes("Paint the picture of the problem. Reference the Annandale competitor visit: dark, dingy, tracking issues, $30/hr but no improvement path.");

// ==========================================
// SLIDE 3: THE SOLUTION
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.white };
slide.addText("THE SOLUTION", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 28, fontFace: "Calibri", bold: true, color: C.navy
});
slide.addText("Every visit makes you a better golfer.", {
  x: 0.8, y: 1.1, w: 8, h: 0.5,
  fontSize: 18, fontFace: "Calibri", bold: true, italic: true, color: C.green
});

const solutions = [
  ["Golfer360 Profile", "AI-powered digital profile captures every shot, every session. Your progress is tracked and visualized."],
  ["Personalized Coaching", "Salesforce Agentforce delivers AI coaching recommendations based on YOUR data, not generic tips."],
  ["Premium Experience", "Backyard luxury feel — walnut tones, comfortable seating, craft beer from next door."],
  ["Community & Accountability", "Memberships, leagues, and progress tracking keep golfers coming back weekly."]
];
let sy = 1.8;
solutions.forEach(([title, desc], i) => {
  const col = i % 2 === 0 ? 0.8 : 5.2;
  const row = Math.floor(i / 2) * 1.9 + sy;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: col, y: row, w: 4.0, h: 1.7, fill: { color: C.lightGray }, rectRadius: 0.08,
    shadow: makeShadow()
  });
  slide.addText(title, {
    x: col + 0.3, y: row + 0.2, w: 3.4, h: 0.45,
    fontSize: 14, fontFace: "Calibri", bold: true, color: C.green
  });
  slide.addText(desc, {
    x: col + 0.3, y: row + 0.65, w: 3.4, h: 0.9,
    fontSize: 11, fontFace: "Calibri", color: C.dark
  });
});
slide.addNotes("Key message: we're not a simulator rental business. We're a golf improvement platform that happens to use simulators as the input device.");

// ==========================================
// SLIDE 4: TECHNOLOGY MOAT
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.navy };
slide.addText("THE TECHNOLOGY MOAT", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 28, fontFace: "Calibri", bold: true, color: C.white
});
slide.addText("Built on enterprise-grade Salesforce infrastructure by a Salesforce professional.", {
  x: 0.8, y: 1.0, w: 8, h: 0.5,
  fontSize: 13, fontFace: "Calibri", color: C.medGray
});
const techStack = [
  ["Salesforce CRM", "Member management, booking, communications"],
  ["Data Cloud", "Unified golfer profiles from every session"],
  ["Agentforce AI", "Personalized coaching & recommendations"],
  ["Tableau", "Performance dashboards for members"],
  ["Experience Cloud", "Member portal & self-service booking"],
  ["Automation", "Lights, HVAC, booking — minimal staff needed"]
];
let ty = 1.7;
techStack.forEach(([name, desc], i) => {
  const col = i < 3 ? 0.8 : 5.2;
  const row = (i % 3) * 1.1 + ty;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: col, y: row, w: 4.2, h: 0.9, fill: { color: "1E3A5F" }, rectRadius: 0.05
  });
  slide.addText(name, {
    x: col + 0.3, y: row + 0.08, w: 3.6, h: 0.4,
    fontSize: 13, fontFace: "Calibri", bold: true, color: C.gold
  });
  slide.addText(desc, {
    x: col + 0.3, y: row + 0.45, w: 3.6, h: 0.38,
    fontSize: 11, fontFace: "Calibri", color: C.medGray
  });
});
slide.addNotes("Emphasize: Russell's professional Salesforce background IS the moat. This isn't something a competitor can bolt on — it requires deep platform expertise.");

// ==========================================
// SLIDE 5: BUSINESS MODEL
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.cream };
slide.addText("BUSINESS MODEL", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 28, fontFace: "Calibri", bold: true, color: C.navy
});

const revenue = [
  ["Hourly Rentals", "$55-70/hr", "Primary revenue — walk-ins and bookings"],
  ["Memberships", "$99-299/mo", "Bronze/Silver/Gold tiers — recurring revenue"],
  ["AI Coaching", "$49/mo add-on", "Agentforce-powered improvement plans"],
  ["Corporate Events", "$500-2K/event", "Team building, client entertainment"],
  ["Leagues & Lessons", "$200-500/season", "Community engagement, retention driver"],
  ["Beverage Sales", "Bunny Man partnership", "ABC license — sell craft beer on-site"]
];
slide.addTable(
  [
    [
      { text: "Revenue Stream", options: { bold: true, color: "FFFFFF", fill: { color: C.navy } } },
      { text: "Pricing", options: { bold: true, color: "FFFFFF", fill: { color: C.navy } } },
      { text: "Notes", options: { bold: true, color: "FFFFFF", fill: { color: C.navy } } }
    ],
    ...revenue.map((r, i) => r.map(cell => ({
      text: cell,
      options: { fill: { color: i % 2 === 0 ? C.lightGray : C.white }, color: C.dark, fontSize: 11 }
    })))
  ],
  { x: 0.8, y: 1.3, w: 8.4, h: 3.5, fontFace: "Calibri", fontSize: 11, colW: [2.5, 2.2, 3.7], border: { type: "solid", pt: 0.5, color: "E2E8F0" }, valign: "middle" }
);
slide.addNotes("Multiple revenue streams reduce risk. Memberships create predictable recurring revenue. Beverage partnership with adjacent Bunny Man Brewing adds margin.");

// ==========================================
// SLIDE 6: LOCATION
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.white };
slide.addText("LOCATION: WORKHOUSE ARTS CENTER", {
  x: 0.8, y: 0.4, w: 9, h: 0.7,
  fontSize: 26, fontFace: "Calibri", bold: true, color: C.navy
});
slide.addText("9518 Workhouse Way, Lorton, Virginia 22079", {
  x: 0.8, y: 1.0, w: 6, h: 0.4,
  fontSize: 13, fontFace: "Calibri", color: C.gray
});
const locationBenefits = [
  "Historic campus with existing foot traffic and community events",
  "Affluent surrounding area — $97K+ median household income",
  "Bunny Man Brewing on-site — built-in beverage partnership",
  "Family-friendly arts district — attracts target demographics",
  "5 golf courses within 7 miles — proven active golfer population",
  "Fort Belvoir (51,000+ employees) less than 10 minutes away",
  "Zero direct indoor golf competition south of Springfield"
];
slide.addText(locationBenefits.map((b, i) => ({
  text: b, options: { bullet: true, breakLine: i < locationBenefits.length - 1, fontSize: 13, color: C.dark }
})), { x: 0.8, y: 1.6, w: 8.5, h: 3.5, fontFace: "Calibri", paraSpaceAfter: 6 });
slide.addNotes("Key selling point: zero competition in this corridor. Nearest simulators are 10+ miles north. Fort Belvoir is a massive captive market.");

// ==========================================
// SLIDE 7: PHASED APPROACH
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.cream };
slide.addText("PHASED GROWTH STRATEGY", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 28, fontFace: "Calibri", bold: true, color: C.navy
});

// Phase 1 card
slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.8, y: 1.3, w: 4.0, h: 3.5, fill: { color: C.white }, rectRadius: 0.08, shadow: makeShadow()
});
slide.addText("PHASE 1", {
  x: 1.1, y: 1.5, w: 3.4, h: 0.4, fontSize: 16, fontFace: "Calibri", bold: true, color: C.green
});
slide.addText("Year 1 — Validate", {
  x: 1.1, y: 1.9, w: 3.4, h: 0.3, fontSize: 12, fontFace: "Calibri", color: C.gray
});
slide.addText([
  { text: "2 simulator bays", options: { bullet: true, breakLine: true } },
  { text: "$150K startup investment", options: { bullet: true, breakLine: true } },
  { text: "$55/hr, 12 hrs/day operation", options: { bullet: true, breakLine: true } },
  { text: "2 part-time staff", options: { bullet: true, breakLine: true } },
  { text: "40% utilization target", options: { bullet: true, breakLine: true } },
  { text: "Founder keeps day job", options: { bullet: true } },
], { x: 1.1, y: 2.4, w: 3.4, h: 2.2, fontSize: 12, fontFace: "Calibri", color: C.dark, paraSpaceAfter: 4 });

// Phase 2 card
slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 5.2, y: 1.3, w: 4.0, h: 3.5, fill: { color: C.white }, rectRadius: 0.08, shadow: makeShadow()
});
slide.addText("PHASE 2", {
  x: 5.5, y: 1.5, w: 3.4, h: 0.4, fontSize: 16, fontFace: "Calibri", bold: true, color: C.green
});
slide.addText("Year 3 — Scale", {
  x: 5.5, y: 1.9, w: 3.4, h: 0.3, fontSize: 12, fontFace: "Calibri", color: C.gray
});
slide.addText([
  { text: "Expand to 4 bays", options: { bullet: true, breakLine: true } },
  { text: "$100K additional investment", options: { bullet: true, breakLine: true } },
  { text: "65%+ utilization proven", options: { bullet: true, breakLine: true } },
  { text: "Full-time staff model", options: { bullet: true, breakLine: true } },
  { text: "Founder goes full-time CEO", options: { bullet: true, breakLine: true } },
  { text: "Franchise model exploration", options: { bullet: true } },
], { x: 5.5, y: 2.4, w: 3.4, h: 2.2, fontSize: 12, fontFace: "Calibri", color: C.dark, paraSpaceAfter: 4 });

slide.addText("Risk is minimized: small initial investment, founder maintains income, expand only after demand is proven.", {
  x: 0.8, y: 5.0, w: 8.4, h: 0.4, fontSize: 11, fontFace: "Calibri", italic: true, color: C.gray
});
slide.addNotes("De-risk narrative: $150K is modest, founder keeps $227K day job, only scale after validation. This is a calculated bet, not a leap of faith.");

// ==========================================
// SLIDE 8: FINANCIAL SUMMARY
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.white };
slide.addText("FINANCIAL PROJECTIONS", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 28, fontFace: "Calibri", bold: true, color: C.navy
});

// Big number callouts
const metrics = [
  ["$44K", "Year 1 Net", "After debt service"],
  ["$134K", "Year 2 Net", "Investment recovered"],
  ["$362K", "Year 3 Combined", "Quit day job viable"],
  ["$707K", "Year 5 Combined", "Household income"]
];
metrics.forEach(([num, label, sub], i) => {
  const col = i * 2.3 + 0.8;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: col, y: 1.3, w: 2.1, h: 2.0, fill: { color: i === 3 ? C.navy : C.lightGray }, rectRadius: 0.06, shadow: makeShadow()
  });
  slide.addText(num, {
    x: col, y: 1.5, w: 2.1, h: 0.7,
    fontSize: 22, fontFace: "Calibri", bold: true, color: i === 3 ? C.gold : C.green, align: "center"
  });
  slide.addText(label, {
    x: col, y: 2.15, w: 2.1, h: 0.4,
    fontSize: 11, fontFace: "Calibri", bold: true, color: i === 3 ? C.white : C.navy, align: "center"
  });
  slide.addText(sub, {
    x: col, y: 2.5, w: 2.1, h: 0.4,
    fontSize: 9, fontFace: "Calibri", color: i === 3 ? C.medGray : C.gray, align: "center"
  });
});

// Chart: 5-year projection
slide.addChart(pres.charts.BAR, [
  { name: "Business Net Income", labels: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"], values: [44, 134, 175, 200, 225] },
  { name: "Day Job (Net)", labels: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"], values: [141, 145, 0, 0, 0] }
], {
  x: 0.8, y: 3.5, w: 8.4, h: 1.9, barDir: "col",
  chartColors: [C.green, C.navy],
  catAxisLabelColor: C.gray, valAxisLabelColor: C.gray,
  valGridLine: { color: "E2E8F0", size: 0.5 }, catGridLine: { style: "none" },
  showLegend: true, legendPos: "b", legendColor: C.gray,
  showTitle: false
});
slide.addNotes("Projections assume 40% Y1, 55% Y2, 65% Y3+ utilization at $55/hr. Day job drops to zero Y3 when combined income exceeds $350K threshold.");

// ==========================================
// SLIDE 9: THE ASK
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.navy };
slide.addText("THE ASK", {
  x: 0.8, y: 0.5, w: 8, h: 0.7,
  fontSize: 28, fontFace: "Calibri", bold: true, color: C.white
});
slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.8, y: 1.4, w: 8.4, h: 2.5, fill: { color: "1E3A5F" }, rectRadius: 0.08
});
slide.addText("$150,000", {
  x: 0.8, y: 1.6, w: 8.4, h: 0.8,
  fontSize: 42, fontFace: "Calibri", bold: true, color: C.gold, align: "center"
});
slide.addText("Phase 1 Total Investment", {
  x: 0.8, y: 2.3, w: 8.4, h: 0.4,
  fontSize: 14, fontFace: "Calibri", color: C.white, align: "center"
});
slide.addText([
  { text: "$75K equity  +  $75K loan (8%, 5-year term)", options: { breakLine: true } },
  { text: "", options: { breakLine: true, fontSize: 6 } },
  { text: "Startup costs: simulators, build-out, technology, ABC license, working capital", options: {} }
], { x: 1.5, y: 2.9, w: 7, h: 0.9, fontSize: 12, fontFace: "Calibri", color: C.medGray, align: "center" });

slide.addText("Use of Funds", {
  x: 0.8, y: 4.2, w: 3, h: 0.4, fontSize: 14, fontFace: "Calibri", bold: true, color: C.white
});
slide.addText([
  { text: "Simulator equipment & install: ~$60K", options: { bullet: true, breakLine: true } },
  { text: "Build-out & premium finishes: ~$45K", options: { bullet: true, breakLine: true } },
  { text: "Technology & Salesforce setup: ~$20K", options: { bullet: true, breakLine: true } },
  { text: "Working capital & licenses: ~$25K", options: { bullet: true } }
], { x: 0.8, y: 4.5, w: 8, h: 1.0, fontSize: 11, fontFace: "Calibri", color: C.medGray, paraSpaceAfter: 3 });
slide.addNotes("$150K is the complete Phase 1 number. Emphasize: this is split 50/50 equity and debt. Equity investor recovers in Year 2.");

// ==========================================
// SLIDE 10: TEAM / WHY ME
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.cream };
slide.addText("WHY THIS FOUNDER", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 28, fontFace: "Calibri", bold: true, color: C.navy
});
slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.8, y: 1.3, w: 8.4, h: 3.8, fill: { color: C.white }, rectRadius: 0.08, shadow: makeShadow()
});
const whyMe = [
  ["Salesforce Expert", "Professional CRM/AI background — the technology platform IS my day job"],
  ["Low-Risk Operator", "Keeping $227K/yr job through Phase 1 — no desperation, only discipline"],
  ["1 Mile from Location", "Can manage operations personally; no absentee ownership"],
  ["Golfer + Customer", "I understand the frustration firsthand and built the solution I want to use"],
  ["Automation Mindset", "Designed for 2 part-time staff, not 10 — technology replaces headcount"]
];
whyMe.forEach(([title, desc], i) => {
  const row = i * 0.7 + 1.5;
  slide.addText(title, {
    x: 1.1, y: row, w: 2.8, h: 0.6, fontSize: 12, fontFace: "Calibri", bold: true, color: C.green, valign: "middle"
  });
  slide.addText(desc, {
    x: 3.9, y: row, w: 5.0, h: 0.6, fontSize: 11, fontFace: "Calibri", color: C.dark, valign: "middle"
  });
});
slide.addNotes("The unfair advantage: Salesforce expertise + proximity + kept income = low-risk execution with high-tech differentiation.");

// ==========================================
// SLIDE 11: BRAND STATUS
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.white };
slide.addText("BRAND: READY TO LAUNCH", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 28, fontFace: "Calibri", bold: true, color: C.navy
});

const brandItems = [
  ["Domain", "fairwaygolfclub.co", "Secured", C.green],
  ["Virginia SCC", "No conflicts", "Clear", C.green],
  ["USPTO IC 041", "No exact match", "Available", C.green],
  ["State Trademark", "Virginia filing", "Pending ($30)", C.gold],
  ["Federal ITU", "Nationwide priority", "Pending ($350)", C.gold]
];
brandItems.forEach(([item, detail, status, color], i) => {
  const row = i * 0.75 + 1.4;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y: row, w: 8.4, h: 0.6, fill: { color: C.lightGray }, rectRadius: 0.04
  });
  slide.addText(item, {
    x: 1.1, y: row, w: 2.2, h: 0.6, fontSize: 12, fontFace: "Calibri", bold: true, color: C.navy, valign: "middle"
  });
  slide.addText(detail, {
    x: 3.3, y: row, w: 3.5, h: 0.6, fontSize: 11, fontFace: "Calibri", color: C.dark, valign: "middle"
  });
  slide.addText(status, {
    x: 7.0, y: row, w: 2.0, h: 0.6, fontSize: 11, fontFace: "Calibri", bold: true, color: color, valign: "middle", align: "center"
  });
});

slide.addText("Franchise-ready brand: \"Fairway Golf Club\" is protectable as a repeatable location concept.", {
  x: 0.8, y: 5.0, w: 8.4, h: 0.4, fontSize: 12, fontFace: "Calibri", italic: true, color: C.gray
});
slide.addNotes("Show that the brand groundwork is done. Domain is live, trademark landscape is clear, filings are cheap and imminent.");

// ==========================================
// SECTION DIVIDER: OPTIONAL SLIDES
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.dark };
slide.addText("APPENDIX", {
  x: 0.8, y: 2.0, w: 8.4, h: 0.8,
  fontSize: 36, fontFace: "Calibri", bold: true, color: C.white, align: "center"
});
slide.addText("Optional Supporting Data — Market Research & Financial Detail", {
  x: 0.8, y: 2.8, w: 8.4, h: 0.5,
  fontSize: 14, fontFace: "Calibri", color: C.medGray, align: "center"
});
slide.addText("Slides below can be included or excluded depending on audience depth.", {
  x: 0.8, y: 3.4, w: 8.4, h: 0.4,
  fontSize: 11, fontFace: "Calibri", italic: true, color: C.gray, align: "center"
});
slide.addNotes("DIVIDER: Everything after this is optional supporting data. Include for sophisticated investors, skip for casual pitches.");

// ==========================================
// OPTIONAL SLIDE A1: DEMOGRAPHICS
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.cream };
slide.addText("[OPTIONAL] LOCAL DEMOGRAPHICS", {
  x: 0.8, y: 0.4, w: 9, h: 0.6,
  fontSize: 24, fontFace: "Calibri", bold: true, color: C.navy
});
slide.addText("10-15 mile trade area from Lorton, VA 22079", {
  x: 0.8, y: 0.9, w: 6, h: 0.3, fontSize: 11, fontFace: "Calibri", color: C.gray
});

const demoMetrics = [
  ["300K+", "Trade Area\nPopulation"],
  ["$97K+", "Median HHI\n(Ft Belvoir CDP)"],
  ["51,000+", "Fort Belvoir\nEmployees"],
  ["5", "Golf Courses\nWithin 7 Miles"]
];
demoMetrics.forEach(([num, label], i) => {
  const col = i * 2.3 + 0.8;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: col, y: 1.4, w: 2.1, h: 1.5, fill: { color: C.white }, rectRadius: 0.06, shadow: makeShadow()
  });
  slide.addText(num, {
    x: col, y: 1.55, w: 2.1, h: 0.6,
    fontSize: 20, fontFace: "Calibri", bold: true, color: C.green, align: "center"
  });
  slide.addText(label, {
    x: col, y: 2.15, w: 2.1, h: 0.6,
    fontSize: 10, fontFace: "Calibri", color: C.navy, align: "center"
  });
});

slide.addText("Key Communities in Trade Area:", {
  x: 0.8, y: 3.2, w: 8, h: 0.4, fontSize: 12, fontFace: "Calibri", bold: true, color: C.navy
});
const communities = [
  ["Lorton / Fairfax Station", "HHI $120K+, family-oriented, golf-active"],
  ["Springfield / Burke", "HHI $110K+, strong golf course density"],
  ["Woodbridge / Dale City", "Population 80K+, underserved for indoor golf"],
  ["Fort Belvoir", "Military families, disposable income, recreation-seeking"]
];
slide.addTable(
  [
    [
      { text: "Community", options: { bold: true, color: "FFFFFF", fill: { color: C.navy } } },
      { text: "Profile", options: { bold: true, color: "FFFFFF", fill: { color: C.navy } } }
    ],
    ...communities.map((r, i) => r.map(cell => ({
      text: cell,
      options: { fill: { color: i % 2 === 0 ? C.lightGray : C.white }, color: C.dark, fontSize: 11 }
    })))
  ],
  { x: 0.8, y: 3.6, w: 8.4, h: 1.8, fontFace: "Calibri", fontSize: 11, colW: [3.0, 5.4], border: { type: "solid", pt: 0.5, color: "E2E8F0" }, valign: "middle" }
);
slide.addNotes("OPTIONAL. Data sources: Census ACS, Fort Belvoir Wikipedia (verified 51K+ employees, $97K HHI). Caveat: some estimates need independent verification.");

// ==========================================
// OPTIONAL SLIDE A2: COMPETITOR MAP
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.white };
slide.addText("[OPTIONAL] COMPETITIVE LANDSCAPE", {
  x: 0.8, y: 0.4, w: 9, h: 0.6,
  fontSize: 24, fontFace: "Calibri", bold: true, color: C.navy
});

const competitors = [
  ["CAFDExGO Golf", "Springfield", "~12 mi", "Simulator rental"],
  ["GolfPark", "Fairfax", "~14 mi", "Simulator rental"],
  ["Uni Indoor Golf", "Annandale", "~15 mi", "Sim rental, $30/hr"],
  ["GOLFTEC Fairfax", "Fairfax", "~14 mi", "Lessons only, $$$"],
  ["GOLFTEC Alexandria", "Alexandria", "~16 mi", "Lessons only, $$$"],
  ["Five Iron Golf", "DC/Arlington", "~20 mi", "Urban entertainment"],
  ["ParCiti Golf", "Arlington", "~18 mi", "Entertainment focus"],
  ["Swing365 Golf DC", "DC", "~22 mi", "Sim rental"]
];
slide.addTable(
  [
    [
      { text: "Competitor", options: { bold: true, color: "FFFFFF", fill: { color: C.navy } } },
      { text: "Location", options: { bold: true, color: "FFFFFF", fill: { color: C.navy } } },
      { text: "Distance", options: { bold: true, color: "FFFFFF", fill: { color: C.navy } } },
      { text: "Model", options: { bold: true, color: "FFFFFF", fill: { color: C.navy } } }
    ],
    ...competitors.map((r, i) => r.map(cell => ({
      text: cell,
      options: { fill: { color: i % 2 === 0 ? C.lightGray : C.white }, color: C.dark, fontSize: 10 }
    })))
  ],
  { x: 0.8, y: 1.1, w: 8.4, h: 3.2, fontFace: "Calibri", fontSize: 10, colW: [2.5, 1.8, 1.5, 2.6], border: { type: "solid", pt: 0.5, color: "E2E8F0" }, valign: "middle" }
);
slide.addText([
  { text: "Key insight: ", options: { bold: true } },
  { text: "ZERO indoor golf competitors exist south of Springfield. Fairway Golf Club would be the only option for 100K+ residents in Lorton, Woodbridge, and Dale City corridors." }
], { x: 0.8, y: 4.5, w: 8.4, h: 0.7, fontSize: 12, fontFace: "Calibri", color: C.dark });
slide.addNotes("OPTIONAL. All competitors are 10+ miles north. The southern Fairfax/Prince William corridor is completely unserved.");

// ==========================================
// OPTIONAL SLIDE A3: MARKET SIZE
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.cream };
slide.addText("[OPTIONAL] MARKET SIZE & INDUSTRY TRENDS", {
  x: 0.8, y: 0.4, w: 9, h: 0.6,
  fontSize: 24, fontFace: "Calibri", bold: true, color: C.navy
});

const marketData = [
  ["$1B+", "US Indoor Golf\nMarket (2025)"],
  ["15-20%", "Annual Growth\nRate (CAGR)"],
  ["$150-250K", "Revenue/Bay/Year\n(Premium Facilities)"],
  ["25M+", "Active US\nGolfers"]
];
marketData.forEach(([num, label], i) => {
  const col = i * 2.3 + 0.8;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: col, y: 1.2, w: 2.1, h: 1.5, fill: { color: C.white }, rectRadius: 0.06, shadow: makeShadow()
  });
  slide.addText(num, {
    x: col, y: 1.35, w: 2.1, h: 0.6,
    fontSize: 20, fontFace: "Calibri", bold: true, color: C.green, align: "center"
  });
  slide.addText(label, {
    x: col, y: 1.95, w: 2.1, h: 0.6,
    fontSize: 10, fontFace: "Calibri", color: C.navy, align: "center"
  });
});

slide.addText("Industry Tailwinds:", {
  x: 0.8, y: 3.0, w: 8, h: 0.4, fontSize: 14, fontFace: "Calibri", bold: true, color: C.navy
});
slide.addText([
  { text: "Post-COVID golf boom sustained — participation up 20%+ since 2020", options: { bullet: true, breakLine: true } },
  { text: "Indoor golf growing faster than outdoor — weather-proof, tech-enabled, social", options: { bullet: true, breakLine: true } },
  { text: "AI/data personalization is the next frontier — nobody is doing this yet at scale", options: { bullet: true, breakLine: true } },
  { text: "DC metro is top-5 market for golf technology adoption", options: { bullet: true } }
], { x: 0.8, y: 3.4, w: 8.5, h: 1.8, fontSize: 12, fontFace: "Calibri", color: C.dark, paraSpaceAfter: 6 });
slide.addText("Sources: National Golf Foundation, IBISWorld, Technavio. Some figures are estimates — verify independently.", {
  x: 0.8, y: 5.2, w: 8.4, h: 0.3, fontSize: 9, fontFace: "Calibri", italic: true, color: C.medGray
});
slide.addNotes("OPTIONAL. Market sizing data. Key message: this is a growing market, the DC metro overindexes for golf tech, and nobody is combining AI + golf improvement yet.");

// ==========================================
// OPTIONAL SLIDE A4: 5-YEAR PROJECTION DETAIL
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.white };
slide.addText("[OPTIONAL] 5-YEAR FINANCIAL DETAIL", {
  x: 0.8, y: 0.4, w: 9, h: 0.6,
  fontSize: 24, fontFace: "Calibri", bold: true, color: C.navy
});

const finTable = [
  ["", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"],
  ["Bays", "2", "2", "4", "4", "4"],
  ["Utilization", "40%", "55%", "65%", "70%", "75%"],
  ["Gross Revenue", "$190K", "$261K", "$617K", "$664K", "$712K"],
  ["Operating Expenses", "$144K", "$144K", "$288K", "$296K", "$305K"],
  ["Debt Service", "$18K", "$18K", "$18K", "$18K", "$18K"],
  ["Net Business Income", "$44K", "$134K", "$175K", "$200K", "$225K"],
  ["Day Job (Net of Tax)", "$141K", "$145K", "—", "—", "—"],
  ["Total Household", "$185K", "$279K", "$175K*", "$200K*", "$225K*"]
];
slide.addTable(
  finTable.map((row, ri) => row.map((cell, ci) => ({
    text: cell,
    options: {
      bold: ri === 0 || ci === 0,
      color: ri === 0 ? "FFFFFF" : C.dark,
      fill: { color: ri === 0 ? C.navy : (ri % 2 === 0 ? C.lightGray : C.white) },
      fontSize: 10, align: ci === 0 ? "left" : "center"
    }
  }))),
  { x: 0.5, y: 1.2, w: 9.0, h: 3.0, fontFace: "Calibri", colW: [2.2, 1.3, 1.3, 1.3, 1.3, 1.3], border: { type: "solid", pt: 0.5, color: "E2E8F0" }, valign: "middle" }
);
slide.addText("* Year 3+: Founder transitions to full-time CEO. Total household reflects business income only (spouse income not shown).", {
  x: 0.5, y: 4.4, w: 9.0, h: 0.4, fontSize: 9, fontFace: "Calibri", italic: true, color: C.gray
});
slide.addText("Key Assumptions: $55/hr rate, 12 hrs/day, 360 days/yr, 20% ancillary revenue (memberships, events, lessons)", {
  x: 0.5, y: 4.8, w: 9.0, h: 0.3, fontSize: 9, fontFace: "Calibri", italic: true, color: C.gray
});
slide.addNotes("OPTIONAL. Detailed projection table. Emphasize conservative utilization ramp (40/55/65%). Revenue/bay of $95K Y1 growing to $178K Y5.");

// ==========================================
// OPTIONAL SLIDE A5: STARTUP COSTS BREAKDOWN
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.cream };
slide.addText("[OPTIONAL] STARTUP COST BREAKDOWN", {
  x: 0.8, y: 0.4, w: 9, h: 0.6,
  fontSize: 24, fontFace: "Calibri", bold: true, color: C.navy
});

// Pie chart
slide.addChart(pres.charts.DOUGHNUT, [{
  name: "Costs",
  labels: ["Simulators", "Build-Out", "Technology", "Working Capital"],
  values: [60, 45, 20, 25]
}], {
  x: 0.5, y: 1.2, w: 4.5, h: 3.5,
  chartColors: [C.green, C.navy, C.gold, C.lightGreen],
  showPercent: true, showLegend: true, legendPos: "b"
});

// Detail list
slide.addText("Budget Details:", {
  x: 5.3, y: 1.2, w: 4, h: 0.4, fontSize: 13, fontFace: "Calibri", bold: true, color: C.navy
});
const costs = [
  ["2x Premium Simulators", "$60K", "Uneekor or Foresight packages"],
  ["Build-Out & Finishes", "$45K", "Walls, flooring, lighting, furniture"],
  ["Salesforce + Tech", "$20K", "CRM, screens, network, kiosk"],
  ["Working Capital", "$25K", "ABC license, 3-mo reserve, marketing"]
];
costs.forEach(([item, cost, note], i) => {
  const row = i * 0.8 + 1.7;
  slide.addText(item, { x: 5.3, y: row, w: 2.5, h: 0.35, fontSize: 11, fontFace: "Calibri", bold: true, color: C.dark });
  slide.addText(cost, { x: 7.8, y: row, w: 1.2, h: 0.35, fontSize: 11, fontFace: "Calibri", bold: true, color: C.green, align: "right" });
  slide.addText(note, { x: 5.3, y: row + 0.3, w: 3.7, h: 0.35, fontSize: 9, fontFace: "Calibri", color: C.gray });
});
slide.addText("Total: $150,000", {
  x: 5.3, y: 5.0, w: 3.7, h: 0.4, fontSize: 14, fontFace: "Calibri", bold: true, color: C.navy
});
slide.addNotes("OPTIONAL. Cost breakdown. Value-engineered: veneer vs solid wood, DIY acoustics, marketplace furniture — 85-90% of premium aesthetic at 50% cost.");

// ==========================================
// OPTIONAL SLIDE A6: FORT BELVOIR
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.white };
slide.addText("[OPTIONAL] FORT BELVOIR — MILITARY MARKET", {
  x: 0.8, y: 0.4, w: 9, h: 0.6,
  fontSize: 24, fontFace: "Calibri", bold: true, color: C.navy
});

const belvoirStats = [
  ["51,000+", "Daily Workers\n& Residents"],
  ["7,637", "CDP\nPopulation"],
  ["$97,290", "Median\nHousehold Income"],
  ["< 10 min", "Drive to\nWorkhouse"]
];
belvoirStats.forEach(([num, label], i) => {
  const col = i * 2.3 + 0.8;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: col, y: 1.2, w: 2.1, h: 1.4, fill: { color: C.lightGray }, rectRadius: 0.06
  });
  slide.addText(num, {
    x: col, y: 1.3, w: 2.1, h: 0.6,
    fontSize: 18, fontFace: "Calibri", bold: true, color: C.navy, align: "center"
  });
  slide.addText(label, {
    x: col, y: 1.85, w: 2.1, h: 0.6,
    fontSize: 10, fontFace: "Calibri", color: C.gray, align: "center"
  });
});

slide.addText("Why Military Families Are Our Market:", {
  x: 0.8, y: 2.9, w: 8, h: 0.4, fontSize: 13, fontFace: "Calibri", bold: true, color: C.navy
});
slide.addText([
  { text: "Golf is a top recreation activity for military personnel and officers", options: { bullet: true, breakLine: true } },
  { text: "On-base recreation facilities are limited — no indoor golf simulators", options: { bullet: true, breakLine: true } },
  { text: "MWR (Morale, Welfare & Recreation) programs drive off-base activity", options: { bullet: true, breakLine: true } },
  { text: "High disposable income with stable employment — ideal membership candidates", options: { bullet: true, breakLine: true } },
  { text: "Corporate team-building budgets from DoD contractors (SAIC, Leidos, Booz Allen)", options: { bullet: true } }
], { x: 0.8, y: 3.3, w: 8.5, h: 2.0, fontSize: 12, fontFace: "Calibri", color: C.dark, paraSpaceAfter: 5 });
slide.addText("Source: Fort Belvoir data from Wikipedia/Census (verified). Drive time estimated from Google Maps.", {
  x: 0.8, y: 5.2, w: 8.4, h: 0.3, fontSize: 9, fontFace: "Calibri", italic: true, color: C.medGray
});
slide.addNotes("OPTIONAL. Fort Belvoir is unique to this location. 51K daily population with high income, golf-friendly culture, and no indoor alternatives.");

// ==========================================
// FINAL SLIDE: CLOSING
// ==========================================
slide = pres.addSlide();
slide.background = { color: C.navy };
slide.addText("FAIRWAY GOLF CLUB", {
  x: 0.8, y: 1.8, w: 8.4, h: 0.8,
  fontSize: 36, fontFace: "Calibri", bold: true, color: C.white, align: "center", charSpacing: 3
});
slide.addText("Every visit makes you a better golfer.", {
  x: 0.8, y: 2.6, w: 8.4, h: 0.5,
  fontSize: 18, fontFace: "Calibri", italic: true, color: C.gold, align: "center"
});
slide.addShape(pres.shapes.RECTANGLE, {
  x: 3.8, y: 3.3, w: 2.4, h: 0.04, fill: { color: C.gold }
});
slide.addText("fairwaygolfclub.co", {
  x: 0.8, y: 3.7, w: 8.4, h: 0.4,
  fontSize: 14, fontFace: "Calibri", color: C.medGray, align: "center"
});
slide.addText("Russell Evans  |  russell@fairwaygolfclub.co", {
  x: 0.8, y: 4.3, w: 8.4, h: 0.4,
  fontSize: 12, fontFace: "Calibri", color: C.medGray, align: "center"
});
slide.addNotes("Closing slide. Thank them for their time, open for questions. Leave the tagline and URL on screen.");

// SAVE
pres.writeFile({ fileName: "/sessions/exciting-sleepy-cerf/mnt/outputs/Fairway_Golf_Club_Investor_Deck.pptx" })
  .then(() => console.log("DONE: Fairway_Golf_Club_Investor_Deck.pptx"))
  .catch(e => console.error("ERROR:", e));
