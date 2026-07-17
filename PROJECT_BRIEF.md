> **Private / internal document.** Names the target venue explicitly — do not use this content verbatim on `fairwaygolfclub.co`. See `CLAUDE.md` → "What NOT to Do" for the public-site rule.

# Fairway Golf Club — Project Brief

The First AI-Powered Golf Improvement Club. Founder: Russell Evans, Salesforce Application Developer.

## The Product

Fairway Golf Club is a premium indoor golf improvement club powered by artificial intelligence. Unlike traditional simulator rental facilities, every shot a member takes — launch angle, ball speed, spin rate, carry distance — is captured into a unified **"Golfer360"** digital profile. The AI coaching engine, built on Salesforce Agentforce, analyzes performance data and delivers personalized improvement plans that evolve with each visit.

Two-frontend architecture:
1. **`fairwaygolfclub.co`** (Cloudflare Pages) — public marketing site, lead capture, investor portal. Permanent public frontend.
2. **Salesforce org** (`fairway-sf/`, alias `FairwayGolfClub`) — CRM, the Golfer360 operational data model, and (later) the Experience Cloud member portal.

## The Site & Location Strategy

- Flagship target: a **2,000 sq ft historic building**, with a **4,000 sq ft expansion path**, at the **county-owned "back buildings"** on the historic **Workhouse Arts Center / Lorton Reformatory campus** — real address **9518 Workhouse Way, Lorton, Virginia 22079** — currently undergoing fast-tracked commercial leasing assessments.
- **Fort Belvoir military/DoD segment** (from `Fairway_Golf_Club_Market_Analysis.docx`): 51,000+ employees ~5 min away, $97,290 median HHI, 51.5% bachelor's+. A large, metrics-oriented population well-suited to the Golfer360 data pitch; MWR partnership is a named, unpursued opportunity.
- **Site concept ("Proof-of-Concept" prototype):** 2 premium overhead simulator bays, a warm walk-in arrival lobby, bag storage, and Men's/Ladies' restrooms with a vintage country-club locker-room aesthetic (wood panels, brass fixtures, luxury amenities). Full detail in `PRODUCT_REQUIREMENTS.md`.
- This is adaptive reuse of a historic county property, which aligns with the Workhouse's existing arts/history mission — not a generic commercial build-out pitch. Construction is deliberately modular (freestanding pods, no anchoring into the historic envelope) specifically to avoid triggering a full historic-preservation review — see `OPERATIONAL_PLAN.md`.
- **Founder is hyper-local:** Russell Evans is a **Crosspointe resident**, living less than **1 mile** from the campus, and is personally coding the entire tech backend in-house as a Salesforce Application Developer — eliminating an estimated $40,000+ in consulting/dev fees.
- **Phased build-out:** launch with 2 premium simulator bays (Phase 1), expand to 4 bays by Year 3. A portable "Fairway Mobile" unit generates revenue and warm leads from day one via off-site corporate/community events — this is also Phase 1 of the Golfer360 customer journey (below).

## The Local Market

- **5 traditional golf courses within a 15-minute drive of Lorton** (Laurel Hill, Pohick Bay, Burke Lake, Lake Ridge, Old Hickory) prove sustained local demand for golf — but **zero indoor simulator options** exist in that radius.
- Local golfers currently **drive 30+ minutes** to the nearest indoor alternatives, and those alternatives are dated/utilitarian, not premium (CAFDExGO, Uni Indoor Golf, GOLFTEC, Five Iron, ParCiti — all 20–40 min away).
- **Target demographics:** Lorton median household income **~$138K**; **89% white-collar workforce**. High-value, currently-underserved local market.
- Broader corridor context (from the full business plan): 580,000+ residents in the Lorton/Fairfax Station trade area, median incomes exceeding $130K regionally.

## Local Strategic Partnership

**Bunnyman Brewing** — specifically their on-campus location, **Bunnyman Brewing Cafe at the Workhouse** — is the primary local partner. Plan: exclusive/co-branded beers on tap for Fairway members, positioning both businesses as a cohesive **"stay-and-play" campus ecosystem** (play, then walk over for a beer). Shared foot traffic benefits both.

## The Technology — Golfer360

Every simulator shot is attributed to a real golfer's permanent profile — not just a simulator's local "Player 1/2" slot — through a `Session_Participant__c` bridge object in Salesforce. Sessions come in three shapes (Practice, Round, Game/League), all logging shots to a universal `Golf_Shot__c` fact table, with `Round_Hole_Result__c` / `Game_Result__c` handling shape-specific scoring. 9 custom objects total; built and committed to `fairway-sf/`, not yet deployed to the org (see `CLAUDE.md` for deploy commands).

Full tech stack vision: Salesforce CRM (member/booking management) + Data Cloud (unified Golfer360 across touchpoints) + Agentforce (AI coaching engine) + Tableau (dashboards) + Experience Cloud (self-service member portal, not yet built).

**The customer journey, in 4 phases** (full detail in `PRODUCT_REQUIREMENTS.md`):
1. **Community Ingestion (Mobile Unit)** — QR-code swing checks at local events build Golfer360 profiles pre-launch.
2. **Touchless Lounge Kiosk** — iPad check-in, QR fast-track for members, dynamic wait-time texting (with a Bunnyman drink in the meantime) if bays are full.
3. **Connected Bay Experience** — overhead launch monitors (Uneekor EYE XO2 / Trackman iO) push live shot/swing/putting data to Salesforce, driving personalized welcome KPIs.
4. **Sloped Auto-Tee** — a 1.5° floor slope and under-floor motorized lift automatically tee up the next ball, removing the last piece of manual friction.

## The Business Model

Seven revenue streams (see `Fairway_Golf_Club_Business_Plan.docx` for full detail):
- Bay rentals: $55–70/hr
- Memberships: Bronze ($99/mo) / Silver ($199/mo) / Gold ($299/mo)
- AI Coaching subscription: $49/mo standalone
- Corporate & private events: $500–2,000/package
- Leagues & tournaments: $200–500/person/season
- Craft beer & beverage (Bunnyman Brewing on tap)
- Fairway Mobile: $500–1,500/event

**Updated Phase 1 CapEx: ~$70,000** (reduced from the original $150,000 estimate — see `OPERATIONAL_PLAN.md`), driven by in-house Salesforce development and a modular hardware build-out that avoids costly historic-preservation construction requirements. **Target breakeven: 6 months** from physical lounge launch (previously Month 3, revised for the leaner Proof-of-Concept scale). The funding split (equity vs. loan, if any) at this new lower figure has not yet been finalized.

## Where Things Stand

- Static site: live, lead capture working, investor portal built. Location not yet named publicly.
- Salesforce: Lead management fields deployed and working. Golfer360 data model (9 objects) built and committed, **not yet deployed**.
- Local strategy: site target, founder-locality angle, market data, and Bunnyman partnership now finalized (this doc + `CLAUDE.md` + `MARKETING_ROADMAP.md`).
- Product/ops: leaner 2,000 sq ft Proof-of-Concept site plan, 4-phase Golfer360 journey, and the modular/regulatory build strategy are now finalized (`PRODUCT_REQUIREMENTS.md`, `OPERATIONAL_PLAN.md`) — **this supersedes the earlier, larger "Suite" concept on the private `fairway-website/space-plan/` page**, which hasn't been updated to match yet.
- Business plan: founder bio, site concept, and Pricing Structure (now live per-visit rates, not hourly) updated in `Fairway_Golf_Club_Business_Plan.docx` to match.
- **Financial models are NOT yet reconciled.** There are at least 4 internally-consistent but mutually-inconsistent CapEx/pricing/revenue models across this repo (`Fairway_Income_Projection.xlsx`, `Fairway_Golf_Club_Phase1_Budget_200K.xlsx`, `Fairway_Golf_Club_Startup_Costs.xlsx` + `Pitch_Deck.pptx`, and this session's newer $70K/6-month figures). See `CLAUDE.md`'s "Open Financial Reconciliation" table before quoting any single number as final.
- Next: Fairfax DEI / Supervisor Storck meeting — prep materials in `Fairway_Golf_Club_Executive_Summary.docx` and `DEI_Storck_Meeting_Prep.md`.

## Key Documents
| File | What it's for |
|---|---|
| `CLAUDE.md` | Technical dev notes — repo structure, deploy commands, full data model schema |
| `PROJECT_BRIEF.md` (this file) | Portable high-level summary of the whole project |
| `PRODUCT_REQUIREMENTS.md` | Site concept + Golfer360 4-phase customer journey |
| `OPERATIONAL_PLAN.md` | Modular/regulatory build strategy, CapEx & breakeven |
| `MARKETING_ROADMAP.md` | GTM strategy and action tracker |
| `Fairway_Golf_Club_Business_Plan.docx` | Full business plan — market research, financials |
| `Fairway_Golf_Club_Market_Analysis.docx` | Deep local market research incl. real address, Fort Belvoir segment, competitor pricing |
| `Fairway_Income_Projection.xlsx` | Family-income-safety-net financial model (hourly/utilization-based) |
| `Fairway_Golf_Club_Phase1_Budget_200K.xlsx` / `Fairway_Golf_Club_Startup_Costs.xlsx` | Detailed line-item build budgets (two different scoping levels) |
| `Fairway_Golf_Club_Executive_Summary.docx` | 1-page pitch sheet for the DEI/Storck meeting |
| `DEI_Storck_Meeting_Prep.md` | Meeting prep — goals, talking points, anticipated Q&A |
| `Fairway_Golf_Club_Pitch_Deck.pptx` / `Fairway_Golf_Club_Investor_Deck.pptx` | Two investor decks, different scope/ask — see `CLAUDE.md` reconciliation note |
