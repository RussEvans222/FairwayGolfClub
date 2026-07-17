# Fairway Golf Club — Project Dev Notes

## What This Project Is

Fairway Golf Club is a premium AI-powered indoor golf improvement club concept being built in Northern Virginia. This repo contains:

1. **`fairway-website/`** — Static HTML/CSS site hosted on Cloudflare Pages, connected to GitHub (auto-deploys on push to `main`)
2. **`fairway-sf/`** — Salesforce DX project targeting a STORM demo org, used for Experience Cloud, LWC components, and CRM configuration

### Key Documents
| File | Purpose | Public-facing? |
|---|---|---|
| `CLAUDE.md` (this file) | Technical dev notes — site/org structure, deploy commands, data model | No — private |
| `PROJECT_BRIEF.md` | Portable one-stop project summary (product, market, tech, business model) | No — private |
| `PRODUCT_REQUIREMENTS.md` | Site concept (2,000 sq ft Proof-of-Concept) + Golfer360 4-phase customer journey | No — private |
| `OPERATIONAL_PLAN.md` | Modular/regulatory build strategy, CapEx & breakeven targets | No — private |
| `MARKETING_ROADMAP.md` | GTM strategy, local partnership plan, campaign/action tracker | No — private |
| `Fairway_Golf_Club_Business_Plan.docx` | Full business plan (market research, financials, revenue model) | No — private |
| `Fairway_Golf_Club_Executive_Summary.docx` | 1-page pitch sheet for local/government meetings (site, market, tech, ask) | No — private, meeting handout |
| `DEI_Storck_Meeting_Prep.md` | Prep outline for the Fairfax DEI / Supervisor Storck meeting | No — private |
| `Fairway_Golf_Club_Pitch_Deck.pptx` / `.pdf` | Investor pitch deck | No — private, shared with founding investors only |
| `fairway-website/` | The only public-facing surface | **Yes** — see "What NOT to Do" below |

---

## Key Credentials & IDs

| Item | Value |
|---|---|
| Live site | `https://fairwaygolfclub.co` |
| GitHub repo | `RussEvans222/FairwayGolfClub` |
| Salesforce Org ID | `00Dak000011rATC` |
| Salesforce username | `storm.bd727290084d27@salesforce.com` |
| SF CLI alias | `FairwayGolfClub` |
| Experience Site API name | `Fairway_Golf_Club1` (picassoSite) |
| reCAPTCHA site key | `6LeXE0YtAAAAABNLw7oPp_gT8umYKYmEuxSKHMC3` |

---

## Static Website (`fairway-website/`)

### Pages
| Path | Purpose |
|---|---|
| `index.html` | Coming-soon homepage with email capture form |
| `investors-portal/index.html` | Founding investor pitch + interest form |
| `thanks/index.html` | Post-form submission confirmation page |

### Images
All 12 site images live in `fairway-website/images/` — Gemini-generated, gold/dark theme. Same set is in `fairway-sf/force-app/main/default/staticresources/fgcImages/` (compressed to ~1.7MB for Salesforce deployment).

### Forms — Web-to-Lead
Both forms POST directly to Salesforce Web-to-Lead. **Do not add `e.preventDefault()` or `fetch()` intercepts** — the forms must do a native browser POST and redirect to `/thanks/`.

**Homepage form** (`index.html`):
- Captures email only
- Hidden fields: `last_name=Unknown`, `company=Individual`, `Interest_Type__c=General Interest`
- retURL: `https://fairwaygolfclub.co/thanks/`

**Investor portal form** (`investors-portal/index.html`):
- Captures: first name, last name, email, phone, interest type, investment amount, description
- Interest Type field ID: `00Nak00004DAbhV`
- Investment Interest field ID: `00Nak00004DAbhW`
- Investment Amount field only appears when "Founding Investor" is selected (JS `toggleInvestment()`)
- retURL: `https://fairwaygolfclub.co/thanks/`

### reCAPTCHA
- Both forms use reCAPTCHA v2 ("I'm not a robot")
- The `<div class="g-recaptcha">` widget **must be inside the `<form>` tag** or Salesforce rejects the submission silently
- The `timestamp()` script and `captcha_settings` hidden field are required by Salesforce's reCAPTCHA integration

### Deployment
Push to `main` → Cloudflare Pages auto-deploys. No build command needed — it's a pure static site. **Do not set a deploy command** in Cloudflare (it's a Pages project, not a Worker).

---

## Salesforce Project (`fairway-sf/`)

### Authenticate
```bash
sf org login web --alias FairwayGolfClub
sf config set target-org FairwayGolfClub
```

### Project Structure
```
force-app/main/default/
  lwc/                        # 6 Experience Cloud components
  staticresources/fgcImages/  # Compressed site images (9 JPEGs, ~1.7MB)
  objects/Lead/
    fields/                   # 2 custom fields
    listViews/                 # Investor leads list view
  objects/                    # Golfer360 operational objects — see "Golfer360 Data Model" below.
                               # NOT YET DEPLOYED to the org as of 2026-07-05 — built and committed from a
                               # machine without the Salesforce CLI installed. Deploy from a machine that
                               # has `sf` installed and authenticated to FairwayGolfClub before assuming
                               # any of this exists in the actual org.
  applications/Fairway_Ops    # Lightning app bundling the Golfer360 object tabs (not yet deployed)
  tabs/                       # Custom tabs for the Golfer360 objects (not yet deployed)
  permissionsets/             # Fairway_Admin permission set
  networks/                   # Experience Site network metadata
```

### Custom Lead Fields
| Label | API Name | Type | Purpose |
|---|---|---|---|
| Interest Type | `Interest_Type__c` | Picklist | Founding Investor / Future Member / General Interest |
| Investment Interest | `Investment_Interest__c` | Currency | Dollar amount selected on investor form |

**Investor Tier picklist values:** Angel Investor ($350K+) / Platinum ($50K+) / Gold ($25K+) / Silver ($15K+) / Bronze ($5K+) / Below Threshold. Angel is one spot only — covers full Phase 1 buildout including all unforeseen costs (~$350K realistic all-in estimate: Target scenario $217-$354K + utilities deposits, construction overruns, ADA, junk removal, equipment delivery, grand opening, etc.).

**FLS note:** Both fields need the `Fairway_Admin` permission set assigned to be editable. If fields are read-only on a Lead record, run:
```bash
sf org assign permset --name Fairway_Admin --target-org FairwayGolfClub
```

### LWC Components
All 6 components are deployed to the org and exposed for Experience Cloud (`lightningCommunity__Page`). They mirror the static HTML site design — same gold/dark theme, same sections.

| Component | Purpose | Notes |
|---|---|---|
| `fgcHero` | Full-bleed hero, email signup | Posts to Formspree as fallback (Experience Cloud context) |
| `fgcPhotoStrip` | 3-column image strip | Pulls from `fgcImages` static resource |
| `fgcFeatures` | 6-card features grid | Data hardcoded in JS |
| `fgcShowcase` | Reusable image+text section | Has `@api` props: `eyebrow`, `heading`, `body`, `imageFile`, `reverse` — configure in Experience Builder |
| `fgcGallery` | 4-image bottom gallery | Pulls from `fgcImages` static resource |
| `fgcFooter` | Footer with brand + investor link | Static |

**Drop order in Experience Builder (top to bottom):**
1. `fgcHero`
2. `fgcPhotoStrip`
3. `fgcFeatures`
4. `fgcShowcase` — eyebrow: "AI-Powered Experience", imageFile: `ai-checkin.png`, reverse: false
5. `fgcShowcase` — eyebrow: "Social & Competitive", imageFile: `bays-social.png`, reverse: true
6. `fgcGallery`
7. `fgcFooter`

**Theme settings (Experience Builder → Branding):**
- Brand Color: `#C9A84C`
- Background: `#0A0A0A`
- Text: `#FFFFFF`
- Column padding: 0px on all sides, no max width

### Static Resource
Images are in `force-app/main/default/staticresources/fgcImages/` as a folder static resource (contentType: `application/zip`). Original full-size PNGs are in `fairway-website/images/` — the SF versions were compressed with `sips` to stay under the 52MB Metadata API limit.

### List Views
`Lead.Fairway_Investor_Leads` — filters for leads where `Investment_Interest__c >= 1`. Visible to all users in the Sales app Leads tab.

### Deploy Commands
```bash
# Deploy everything
sf project deploy start --source-dir force-app/main/default --target-org FairwayGolfClub

# Deploy specific areas
sf project deploy start --source-dir force-app/main/default/lwc --target-org FairwayGolfClub
sf project deploy start --source-dir force-app/main/default/objects --target-org FairwayGolfClub
sf project deploy start --source-dir force-app/main/default/staticresources --target-org FairwayGolfClub
```

---

## Golfer360 Data Model (operational side — bookings, bays, shot data)

**Status as of 2026-07-05: metadata is built and committed to this repo, but NOT YET DEPLOYED to the org.** It was built on a machine without the Salesforce CLI installed. Before treating any of this as "live," deploy it first:

```bash
sf project deploy start --source-dir force-app/main/default/objects --target-org FairwayGolfClub
sf project deploy start --source-dir force-app/main/default/tabs --target-org FairwayGolfClub
sf project deploy start --source-dir force-app/main/default/applications --target-org FairwayGolfClub
sf project deploy start --source-dir force-app/main/default/permissionsets --target-org FairwayGolfClub
sf org assign permset --name Fairway_Admin --target-org FairwayGolfClub
```

### Why this exists
Russell wants to know which physical golfer hit which physical shot, in which bay, during which reservation — turning simulator "Player 1/Player 2" slots into permanent Golfer360 history. `Session_Participant__c` is the bridge object that makes this possible: every shot/hole-result/game-result attributes back to a golfer through it. See `fairway-sf`'s git history (commit adding this section) for the full architecture memo this was designed from — it covers vendor API reality (TrackMan/Foresight/Uneekor), a 3-phase integration model (native API → session export → console-owned player mapping), and a Data Cloud/middleware plan for later phases.

### Objects (9, all custom, no Data Cloud/middleware yet — mock data only for now)
| Object | Purpose |
|---|---|
| `Golfer_Profile__c` | Golfer360 performance identity, 1:1 with a `Contact` (handicap, tendencies, rollup stats) |
| `Simulator_Bay__c` | A physical bay: launch monitor type, software, status |
| `Bay_Reservation__c` | The booked time block (commercial transaction) |
| `Golf_Session__c` | An actual play/practice session within a reservation. `Session_Type__c` = Practice / Round / Game / League / Lesson / Fitting — drives which child result object applies |
| `Session_Participant__c` | **The bridge object.** Maps a simulator's local player slot (1-4) to a `Golfer_Profile__c` (or leaves it blank for an anonymous guest). Has `Team__c` for team game formats (Wolf/Vegas/Stableford) |
| `Golf_Shot__c` | Universal atomic shot fact — logged for every session type. Ball-flight fields (ball speed, carry, spin, etc.) are populated by nearly all launch monitors; club-delivery fields (club speed, attack angle, face angle, etc.) only by premium doppler/camera units — check `Data_Tier__c` (Ball Only / Ball + Club) before trusting club fields are populated. Has `Raw_Payload_JSON__c` to hold the full mock/vendor JSON per shot |
| `Round_Hole_Result__c` | One record per participant per hole, only when `Session_Type__c` = Round. Deliberately score-only (Hole/Par/Strokes/Score-to-Par) — no putts/GIR/fairway yet since many sim setups can't reliably capture that |
| `Game_Result__c` | One record per participant per game session, only when `Session_Type__c` = Game (Closest to Pin, Long Drive, Wolf, Vegas, etc.) |
| `Practice_Insight__c` | AI/coach-generated observation + recommendation surfaced to a golfer |

Relationship chain: `Contact` → `Golfer_Profile__c` → `Session_Participant__c` ← `Golf_Session__c` ← `Bay_Reservation__c` ← `Simulator_Bay__c`. `Golf_Shot__c`, `Round_Hole_Result__c`, and `Game_Result__c` all hang off `Golf_Session__c` + `Session_Participant__c`; only one of the latter two applies per session, based on `Session_Type__c`.

**Deferred to a later phase** (not built yet): `Membership__c`/Salesforce Subscription Management, `Golf_Club__c` (bag/club performance), `Coaching_Plan__c`, real-time middleware, Data Cloud ingestion, computer vision/RFID attribution.

### Supporting metadata
- `Fairway_Admin` permission set was extended with object + field permissions for all 9 objects, plus visibility into the new `Fairway_Ops` Lightning app.
- `Fairway_Ops` (`applications/Fairway_Ops.app-meta.xml`) — a separate Lightning app bundling tabs for all 9 objects, so this doesn't clutter the Sales app used for Lead management.
- `Golf_Session__c` has a `Fairway_Active_Sessions` list view (filters `Status__c = In Progress`) for "who's on the bays right now."

### Verification once deployed
Create one record per object in dependency order (Bay → Reservation → Session → Participant → [Game_Result or Round_Hole_Result] → Shot), covering all three session shapes (one Practice session with plain shots, one Round session with `Round_Hole_Result__c` records and shots tagged `Hole_Number__c`, one Game session with `Game_Result__c` records and shots linked via `Game_Result__c` lookup). Confirm the three shapes stay distinct on `Golf_Shot__c` (a Practice shot has no `Hole_Number__c`/`Game_Result__c`; a Round shot has `Hole_Number__c` but no `Game_Result__c`; a Game shot has `Game_Result__c` but no `Hole_Number__c`).

---

## Location & Local Market Strategy (Private — do not publish)

**This entire section names the target venue explicitly. That is intentional and fine for private/internal docs (this file, `PROJECT_BRIEF.md`, `MARKETING_ROADMAP.md`, the executive summary, meeting prep) — it is only barred from `fairway-website/` itself, per "What NOT to Do" below.**

### Founder Profile
- Russell Evans is a **Crosspointe resident**, living **less than 1 mile** from the campus. Use this specifically (neighborhood name, not just "1 mile away") when talking to county/local stakeholders — it's a stronger local-roots story than the generic version in the business plan.
- Russ's professional title is **Salesforce Application Developer** (more specific than the business plan's earlier "Salesforce professional" phrasing). He is **personally designing and coding the entire customized tech backend in-house** — the Golfer360 platform, booking/check-in flows, AI coaching integration — which eliminates an estimated **$40,000+ in software consulting/development fees**. This is a material input to the budget in `OPERATIONAL_PLAN.md`, not just a resume line.

### Target Site & Product Concept
- Flagship target: a **2,000 sq ft historic building**, with a **4,000 sq ft expansion path**, at the **county-owned "back buildings"** on the historic **Workhouse Arts Center / Lorton Reformatory campus**, which is currently undergoing **fast-tracked commercial leasing assessments**.
- Current site concept is a lean **"Proof-of-Concept" prototype**: 2 premium overhead simulator bays, a warm walk-in arrival lobby, bag storage, and Men's/Ladies' restrooms designed with a vintage country-club locker-room aesthetic (wood panels, brass fixtures, luxury amenities). Full layout, room list, and the phased Golfer360 tech experience are in `PRODUCT_REQUIREMENTS.md`.
- **This supersedes the earlier, larger "Suite" concept** built into the private `fairway-website/space-plan/` page (2 bays + shared social lounge + wash-and-change rooms with showers, ~1,320–1,500 sq ft). The two haven't been reconciled — `PRODUCT_REQUIREMENTS.md` is the current source of truth; the `space-plan` page needs a refresh before it's shared again.
- Adaptive reuse of a historic county property — the pitch to the county leans on this fitting the Workhouse's existing arts/history/adaptive-reuse mission, not a generic commercial build-out. The construction approach specifically avoids triggering a full historic-preservation review (freestanding modular pods, macerating plumbing instead of slab cutting) — see `OPERATIONAL_PLAN.md`.

### Local Market & Competitive Edge
- **5 traditional golf courses within 15 minutes of Lorton** (Laurel Hill, Pohick Bay, Burke Lake, Lake Ridge, Old Hickory — see business plan for detail) prove demand, but **zero local indoor simulator options** exist.
- Golfers currently **drive 30+ minutes** to non-premium, transactional, uninviting regional commercial simulators (see business plan's Competition Analysis: CAFDExGO, Uni Indoor Golf, GOLFTEC, Five Iron, ParCiti — all 20–40 min away).
- **Target demographics:** Lorton median household income **~$138K**; **89% white-collar workforce**, seeking upscale local "third places," evening leagues, and corporate event venues — a high-value local market that's currently underserved. (Note: the business plan docx cites broader corridor figures — $130K+ regionally, $180K+ for Fairfax Station specifically. The $138K/89% figures are Lorton-specific and newer — now being folded into the business plan doc directly, see below.)

### Local Strategic Partnership: Bunnyman Brewing
- Primary local partner: **Bunnyman Brewing**, specifically their on-campus location, **Bunnyman Brewing Cafe at the Workhouse**. Framed as a **highly collaborative neighbor strategy** — not isolated commercial retail — actively building relationships with an on-campus neighbor rather than just co-existing.
- Collaborative concepts being explored: **Bunnyman craft beer on tap**, **exclusive co-branded seasonal releases** (e.g., a "Fairway Golden Ale"), and structured **"stay-and-play" cross-promotional programs**.
- Also functions as part of the Golfer360 Phase 2 kiosk experience: if both bays are full, the touchless check-in kiosk directs walk-ins to grab a Bunnyman drink while it texts them when a bay opens up (see `PRODUCT_REQUIREMENTS.md`).
- This is the same synergy the business plan's Company Advantages section gestures at ("Workhouse Arts Center location provides built-in foot traffic, brewery co-tenancy") — now a named, specific partnership rather than a general advantage.

### Budget & Regulatory Defense (new)
- **CapEx capped at ~$70,000** (down from the original $150,000 Phase 1 estimate), driven by in-house Salesforce development (above) and a modular hardware build-out. **Target: 6-month breakeven** from physical lounge launch (previously Month 3 — see `OPERATIONAL_PLAN.md` for why, and the note below on reconciling this into the business plan doc).
- Regulatory strategy: freestanding wood-and-metal frame pods (not anchored to the historic envelope) and macerating plumbing (Saniflo) instead of slab-cutting, specifically to avoid triggering a full historic-preservation review. Full detail in `OPERATIONAL_PLAN.md`.

### Upcoming: Fairfax DEI / Supervisor Storck Meeting
Meeting prep is tracked in `DEI_Storck_Meeting_Prep.md`. The 1-page `Fairway_Golf_Club_Executive_Summary.docx` is built specifically for this meeting — it combines the local site/market/partnership story above with the Golfer360 Salesforce tech stack, since a government economic-development audience needs both "why here" and "why this is a serious, differentiated business." The regulatory-defense strategy above is likely the county's first practical question, so it's front-loaded in the meeting prep.

---

## Architecture Decision: Two Separate Frontends

- **`fairwaygolfclub.co`** (Cloudflare Pages) — public marketing site, lead capture, investor portal. This is the permanent public frontend. No plans to replace it with Experience Cloud.
- **Experience Cloud site** (`Fairway_Golf_Club1`) — will be the **member-facing end user portal** once the club opens. Separate purpose entirely — member bookings, AI coaching data, session history, etc. The 6 LWC components were built to mirror the marketing site visually but will serve the member portal use case.

---

## Pending / Next Steps

- [ ] **Cloudflare Stream** — Upload `Fairway_Golf_Club_-_The_Member-to-Investor_Tour.mp4` to Cloudflare Stream, get embed URL, wire into `investors-portal/index.html` video placeholder section
- [ ] **Lead assignment rule** — Auto-assign incoming web leads to Russell + trigger email alert
- [ ] **Web-to-Lead on homepage** — Consider adding first/last name fields so leads don't come in as "Unknown"
- [ ] **Experience Cloud member portal** — Design and build the member-facing portal (bookings, coaching data, session history) — separate from the marketing site
- [ ] **Deploy the Golfer360 data model** — 9 new custom objects + permission set updates + `Fairway_Ops` app are committed to `fairway-sf/` but not yet deployed to the org (built on a machine without the Salesforce CLI). See "Golfer360 Data Model" section above for the deploy commands and verification steps.
- [x] **1-page Executive Summary / Pitch Sheet** — `Fairway_Golf_Club_Executive_Summary.docx`, built for the DEI/Storck meeting: local site + market + Bunnyman partnership story combined with the Golfer360 tech stack.
- [x] **DEI / Supervisor Storck meeting prep** — `DEI_Storck_Meeting_Prep.md`, covering goals, talking points, anticipated questions, and materials list.
- [x] **Product requirements + operational plan** — `PRODUCT_REQUIREMENTS.md` (site concept, Golfer360 4-phase journey) and `OPERATIONAL_PLAN.md` (modular/regulatory build strategy, CapEx/breakeven) drafted.
- [x] **Business plan financials/bio updated** — `Fairway_Golf_Club_Business_Plan.docx` founder bio, site concept, CapEx, and breakeven updated to match the finalized roadmap (see that file's own internal notes for what's still open).
- [ ] **Hold the Fairfax DEI / Supervisor Storck meeting** — use the executive summary + prep doc above; update `MARKETING_ROADMAP.md` and this file with the outcome afterward.
- [ ] **Reconcile local market stats** — business plan docx historically cited Fairfax Station-specific ($180K+ HHI) and broader-corridor (>$130K) figures; the newer Lorton-specific figures (~$138K HHI, 89% white-collar) have now been folded into the business plan doc directly (see above) — double check both figures still coexist sensibly (regional vs. Lorton-specific) rather than reading as contradictory.
- [ ] **Finalize CapEx funding structure** — the new ~$70,000 CapEx figure hasn't been split into equity/loan (or confirmed as fully founder-funded); see `OPERATIONAL_PLAN.md` open questions.
- [ ] **Recalculate downstream financials** — Year 1–5 revenue/net income projections and the Risk Mitigation worst-case figure in the business plan were calibrated to the old $150K/Month-3 baseline and have not been recalculated against the new $70K/6-month baseline.
- [ ] **Reconcile the site concept** — `PRODUCT_REQUIREMENTS.md`'s leaner 2,000 sq ft Proof-of-Concept (lobby/bag storage/restrooms) supersedes the earlier "Suite" concept on the private `fairway-website/space-plan/` page (shared social lounge, wash-and-change rooms with showers) — that page needs a refresh before being shared again.
- [ ] **Formalize the Bunnyman Brewing partnership** — co-branded seasonal beer (e.g. "Fairway Golden Ale") and stay-and-play cross-promotion are concepts, not yet a confirmed arrangement.

---

## What NOT to Do

- Do not add `e.preventDefault()` or `fetch()` to form submit handlers — breaks Web-to-Lead
- Do not put reCAPTCHA widget outside the `<form>` tag — Salesforce silently rejects the submission
- Do not deploy the full-size PNGs from `fairway-website/images/` to Salesforce — they are 83MB uncompressed and will hit the 52MB API limit
- Do not set a deploy command in Cloudflare — this is a Pages project, not a Worker
- Do not reference Workhouse Arts Center or Lorton as the location anywhere on `fairwaygolfclub.co` (the public static site) — location is not yet publicly announced there. This rule is scoped to that one public surface: private/internal docs (this file, `PROJECT_BRIEF.md`, `MARKETING_ROADMAP.md`, the business plan, the executive summary, meeting prep docs) are expected to name Workhouse/Lorton explicitly, since that's the actual target and county/government meetings require naming it.
- Do not reference Russell keeping his day job anywhere public-facing
