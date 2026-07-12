# Fairway Golf Club — Project Dev Notes

## What This Project Is

Fairway Golf Club is a premium AI-powered indoor golf improvement club concept being built in Northern Virginia. This repo contains:

1. **`fairway-website/`** — Static HTML/CSS site hosted on Cloudflare Pages, connected to GitHub (auto-deploys on push to `main`)
2. **`fairway-sf/`** — Salesforce DX project targeting a STORM demo org, used for Experience Cloud, LWC components, and CRM configuration

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

### Homepage Survey Widget ("Does this sound cool?")
A Yes/No pulse-check survey lives on the homepage between the Features and Showcase sections, backed by two Cloudflare Pages Functions in `fairway-website/functions/api/`:

- **`vote.js`** — `GET` returns current `{ yes, no }` counts; `POST { vote: "yes"|"no" }` increments the count and logs a geo-tagged event (city/region/country pulled from Cloudflare's `request.cf`, no client-side geolocation prompt). Requires a KV namespace bound as **`VOTES_KV`** in the Pages project settings.
- **`votes-log.js`** — internal viewer at `/api/votes-log?key=YOUR_ADMIN_KEY`, gated by an **`ADMIN_KEY`** environment variable (set your own value in Pages project settings — not committed to the repo). Lists recent votes with location, newest first.

**⚠️ NOT YET WORKING as of 2026-07-07** — the code is committed but the Cloudflare Pages project has no `VOTES_KV` KV namespace or `ADMIN_KEY` variable configured yet (I don't have Cloudflare dashboard/API access from this environment). Until this is done, the vote buttons will fail silently (chart stays at 0, buttons re-enable) and `/api/votes-log` will 500. **To activate:**
1. In the Cloudflare dashboard: Workers & Pages → your Pages project → Settings → Functions → KV namespace bindings → create/bind a namespace as `VOTES_KV`
2. Settings → Environment variables → add `ADMIN_KEY` (any private string of your choosing) to both Production and Preview
3. Redeploy (a new push to `main`, or "Retry deployment" in the dashboard, picks up the new bindings)

Voting itself needs no reCAPTCHA (it just hits `VOTES_KV`), but the optional follow-up (email for a Yes vote, feedback text for a No vote) reuses the existing Web-to-Lead + reCAPTCHA pattern and lands in Salesforce as a Lead with `lead_source = "Website - Survey Vote"` — same picklist values as the other forms, so it won't affect the `Fairway_Investor_Leads` list view.

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

**Device integration research (2026-07-10):** See `Assets/DeviceConnection.md` for findings on
getting live shot data out of launch monitors and into this model. Short version: FlightScope
(X3C/Mevo+) has no public API — the only real open integration point in the vendor landscape is
**GSPro's Open Connect v1** (local JSON-over-TCP socket, `127.0.0.1:0921`, documented at
gsprogolf.com), which a relay could sit on as a second client to mirror shot data to Salesforce.
This only works if bays run GSPro specifically; Awesome Golf Simulator has no equivalent open
socket. Community reverse-engineering of FlightScope's binary protocol (`ironsight`, TCP port
5100) exists but is unofficial/unconfirmed for X3C — experimental only. Until Phase 1 (native
API) middleware exists, this reinforces sticking with Phase 2 (session export) or mock data.

**Booking & check-in process spec (2026-07-10):** See `BOOKING_CHECKIN_PROCESS.md` for the
full intended design covering all three ways a golfer gets to a bay — pre-arranged scheduled
visits booked through Experience Cloud (with party check-in, SMS confirmations, and a
trickle-in join mechanism), single walk-ins with a live approve/deny join request, and
phone-in/staff-booked reservations. It's a requirements spec, not yet built — cross-references
exactly what already exists (`ServiceAppointment`, the QR identity check-in system, etc.) against
real gaps (no SMS integration, no session/party join-code mechanism, the 4-slot
`Simulator_Player_Slot__c` ceiling vs. a proposed 6-player party max).

### Supporting metadata
- `Fairway_Admin` permission set was extended with object + field permissions for all 9 objects, plus visibility into the new `Fairway_Ops` Lightning app.
- `Fairway_Ops` (`applications/Fairway_Ops.app-meta.xml`) — a separate Lightning app bundling tabs for all 9 objects, so this doesn't clutter the Sales app used for Lead management.
- `Golf_Session__c` has a `Fairway_Active_Sessions` list view (filters `Status__c = In Progress`) for "who's on the bays right now."

### Verification once deployed
Create one record per object in dependency order (Bay → Reservation → Session → Participant → [Game_Result or Round_Hole_Result] → Shot), covering all three session shapes (one Practice session with plain shots, one Round session with `Round_Hole_Result__c` records and shots tagged `Hole_Number__c`, one Game session with `Game_Result__c` records and shots linked via `Game_Result__c` lookup). Confirm the three shapes stay distinct on `Golf_Shot__c` (a Practice shot has no `Hole_Number__c`/`Game_Result__c`; a Round shot has `Hole_Number__c` but no `Game_Result__c`; a Game shot has `Game_Result__c` but no `Hole_Number__c`).

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
- [ ] **Activate the homepage survey widget** — `VOTES_KV` KV namespace binding + `ADMIN_KEY` environment variable need to be set up in the Cloudflare Pages dashboard before the "Does this sound cool?" Yes/No survey will work. See "Homepage Survey Widget" section above.

---

## What NOT to Do

- Do not add `e.preventDefault()` or `fetch()` to form submit handlers — breaks Web-to-Lead
- Do not put reCAPTCHA widget outside the `<form>` tag — Salesforce silently rejects the submission
- Do not deploy the full-size PNGs from `fairway-website/images/` to Salesforce — they are 83MB uncompressed and will hit the 52MB API limit
- Do not set a deploy command in Cloudflare — this is a Pages project, not a Worker
- Do not reference Workhouse Arts Center or Lorton as the location anywhere public-facing — location is not yet announced
- Do not reference Russell keeping his day job anywhere public-facing
