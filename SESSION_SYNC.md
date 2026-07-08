# Fairway Golf Club — Session Sync

**Last updated:** 2026-07-08 (by Claude, this session — no Salesforce CLI access from this environment, see "Known Issues" below)  
**Last commit:** `bb9f3b9` on `main` (RussEvans222/FairwayGolfClub) — PR #4, "Fix kiosk bay assignment bug and show active sessions on check-in screen"

---

## Repos

| Repo | Purpose | Deployed to |
|---|---|---|
| `fairway-kiosk/` | React + Vite + TypeScript + Tailwind CSS PWA — the physical bay check-in kiosk | Cloudflare Pages → `kiosk.fairwaygolfclub.co` |
| `fairway-sf/` | Salesforce metadata (Apex, LWC, custom objects, permission sets) | Salesforce org: `storm-bd727290084d27.my.salesforce.com` |

---

## What's Built and Deployed

### Kiosk (`fairway-kiosk/`)

**Screens:**
- `welcome` — idle loop, entry point
- `player-type` — 3 options: Reservation / Member Walk-In / New Guest
- `scheduled-sessions` — shows today's ServiceAppointments for the active bay
- `pin-entry` — 4-digit PIN keypad (used for reservation check-in AND member walk-in verification)
- `pin-setup` — first-time PIN creation
- `member-walkin` — email lookup for walk-in members
- `member-walkin-pin` — PIN verification after member found
- `guest-registration` — name + skill level for guests
- `guest-payment` — payment screen (Stripe/manual)
- `bay-direction` — "Head to Bay X" confirmation
- `bay-queue` — queue position + estimated wait when all bays are full
- `session-active` — active session timer display
- `session-summary` — end-of-session summary + membership upsell

**Key flows wired up:**
- Reservation check-in: `scheduled-sessions` → `pin-entry` → `bay-direction`
- Member walk-in: `member-walkin` → `member-walkin-pin` → `guest-payment` → bay or queue
- Guest check-in: `guest-registration` → `guest-payment` → bay or queue
- Bay queue: in-memory React state (`bayQueue` array of `QueueEntry`); no SF record yet

**Salesforce writes from kiosk:**
- `createWalkInAppointment(contactId, bayResourceId, startIso, endIso)` — creates `ServiceAppointment` (Status=Dispatched) + `AssignedResource` record for walk-ins
- Walk-in reservations now have real SF IDs (not the old `'walk-in'` placeholder)
- Auth: OAuth 2.0 Implicit flow — token stored in `sessionStorage`

**Bay assignment (fixed in PR #4, `bb9f3b9`):**
- `findAvailableBay()` in `App.tsx` used to infer "which bays exist" only from bays appearing in *today's* `ServiceAppointment` records, and fell back to a hardcoded `"Bay 1"` when it recognized none — regardless of whether Bay 1 was actually occupied. This is why a walk-in (Sally) was directed to an occupied bay.
- Now it queries `ServiceResource` directly (`SELECT Id, Name FROM ServiceResource WHERE IsActive = true`, loaded once via a new `loadBays()` on auth) as the source of truth, same as `FairwayOpsDashboardController.getBayStatus()` already does. Picks the first bay not occupied by a Dispatched/In Progress/late-Scheduled session; returns `null` (→ queue) if none are free — never guesses.
- `WelcomeScreen` now also shows a live per-bay status strip (Open, or golfer first name + minutes remaining), reading the same `allBays` + `scheduledSessions` state.

**Env vars (`.env.production` baked at Cloudflare build):**
```
VITE_SF_INSTANCE_URL=https://storm-bd727290084d27.my.salesforce.com
VITE_SF_CLIENT_ID=3MVG9JJwBBbcN47LfOSqoMzg6MvSJkwE3fpNuaQzV7Yx3d8VU_zfm9uHa.hFqVLOObL7MybEf3JRJcpvq8Aox
VITE_SF_LOGIN_URL=https://login.salesforce.com
VITE_SF_WALKIN_WORK_ORDER_ID=0WOak0000055ODJGA2
VITE_SF_WALKIN_WORK_TYPE_ID=08qak000000AwM5AAK   ← "Bay Session" (60 min)
```

### Salesforce (`fairway-sf/`)

**Apex classes deployed:**
- `FairwaySessionConsoleController` — `@AuraEnabled` controller for the session management console LWC
  - `getActiveSessions()` — queries today's non-Completed/Canceled `ServiceAppointment` records + joins bay name via `AssignedResource`; returns `BaySessionDTO` list with `minutesRemaining` and `isOvertime`
  - `endSession(id)` — Status=Completed, SchedEndTime=now
  - `restartSession(id)` — Status=Dispatched, resets start/end to now + original duration
  - `extendSession(id, minutes)` — adds N minutes to SchedEndTime
  - `changeStatus(id, newStatus)` — arbitrary status update

**LWC deployed:**
- `fairwaySessionConsole` — staff session management console
  - Card-per-bay UI: golfer avatar, bay name, status badge, timer (red when overtime), progress bar
  - Action buttons: End / Restart / +15 / +30 / status picker
  - Gold/dark theme matching kiosk
  - Auto-refreshes every 30 seconds
  - **To add to the UI:** App Builder → Fairway Ops app → Home page → drag `fairwaySessionConsole` component

**Salesforce Scheduler setup (manual, already done in org):**
- Service Territory: "Fairway Golf Club" (active)
- Operating Hours: "Fairway Golf Club" — Mon–Sat 8am–10pm ET, Sun 12pm–7pm ET
- Service Resources: "Bay Number One" (`0Hnak000000IkQzCAK`), "Bay Number 2" (`0Hnak000000IkSbCAK`)
- Work Type: "Bay Session" (`08qak000000AwM5AAK`, 60 min) — used for ALL bookings
- Work Type Group: "Bay Booking" (`0VSak0000006L9pGAE`, active) — used in booking flow
- Deactivated groups: Practice Session, Round of Golf, Game Mode (members pick mode on launch monitor, not at booking)

**Custom objects:** `Golf_Session__c`, `Golfer_Profile__c`, and others — committed to `fairway-sf/` but **not yet deployed to org** (see Pending below)

---

## Known Issues — needs `sf` CLI to finish (2026-07-08)

**Symptom:** After confirming payment on a kiosk walk-in (tested with guest "Jim Richard"), the app threw:
```
insufficient access rights on cross-reference id: 0WOak0000055ODJ
```
That ID is (the truncated form of) `VITE_SF_WALKIN_WORK_ORDER_ID` — the `ParentRecordId` the kiosk sets when it creates the walk-in `ServiceAppointment` in `createWalkInAppointment()` (`App.tsx`). This is a **separate bug from the bay-assignment fix above** — it happens after a bay has already been chosen, while writing the appointment record.

**Root cause (diagnosed from the repo, not confirmed live — no SF access from this environment):** `Fairway_Staff.permissionset-meta.xml` had no `WorkOrder` object permission at all, and had `allowCreate=false` on both `ServiceAppointment` and `AssignedResource` — despite the kiosk code creating both for every walk-in. Whatever user/permission-set combo the kiosk's OAuth login actually runs as almost certainly doesn't have visibility into the WorkOrder record referenced by that env var.

**Fix committed** (this session, uncommitted as of this doc — see branch `claude/golf-simulator-seo-nova-bleka3` / PR once opened): in `Fairway_Staff.permissionset-meta.xml`:
- `ServiceAppointment.allowCreate` → `true`
- `AssignedResource.allowCreate` → `true`
- Added a new `WorkOrder` object permission block (`allowRead=true`)

**What needs to happen from a terminal with `sf` CLI access:**
1. Pull this branch, then deploy the permission set:
   ```bash
   sf project deploy start --source-dir force-app/main/default/permissionsets/Fairway_Staff.permissionset-meta.xml --target-org FairwayGolfClub
   ```
2. Confirm which user the kiosk's OAuth login actually authenticates as, and confirm that user has `Fairway_Staff` assigned:
   ```bash
   sf org assign permset --name Fairway_Staff --target-org FairwayGolfClub --on-behalf-of <kiosk login username>
   ```
3. Re-test the walk-in flow. **If the same cross-reference error still happens**, this is not just an FLS/permission-set gap — check `WorkOrder`'s organization-wide default sharing setting (Setup → Sharing Settings) and who owns the specific WorkOrder record `0WOak0000055ODJGA2`. A Private OWD with no sharing rule will block this even with full object permissions, since permission sets grant CRUD/FLS but don't override record-level sharing.
4. Once confirmed working end-to-end, it's also worth double-checking `Fairway_Admin` — it currently has **zero** Field Service object permissions (no ServiceAppointment/AssignedResource/WorkOrder/etc. at all), so if Russell tests as an Admin-profile user instead of via `Fairway_Staff`, results may differ from a real kiosk login.

---

## Data Model Key (Salesforce Scheduler label → API name)

| What we call it | SF Object API Name | Notes |
|---|---|---|
| Simulator / Bay | `ServiceResource` | `ResourceType=Equipment` |
| Session / Appointment | `ServiceAppointment` | Holds start/end times, status, customer |
| Bay Assignment | `AssignedResource` | Junction: ServiceAppointment ↔ ServiceResource |
| Booking slot template | `WorkType` | "Bay Session" = the single booking type |
| Booking flow category | `WorkTypeGroup` | "Bay Booking" = the group used in Experience Cloud flow |
| Club / Location | `ServiceTerritory` | "Fairway Golf Club" |
| Bay ↔ Territory link | `ServiceTerritoryMember` | Connects each bay to the territory |
| Hours of operation | `OperatingHours` + `TimeSlot` | Linked to ServiceTerritory |

**ServiceAppointment status lifecycle:**
`Scheduled` → `Dispatched` (checked in) → `In Progress` → `Completed`

**Scheduled vs Actual times on ServiceAppointment:**
- `SchedStartTime` / `SchedEndTime` — the booked/planned time window
- `ActualStartTime` / `ActualEndTime` — when they actually started/ended (not yet being set by kiosk — see Pending)

---

## Pending Tasks

### Code changes needed

1. **Wire `ActualStartTime` / `ActualEndTime`**
   - Kiosk check-in (when `Status` goes to `Dispatched`) should PATCH `ActualStartTime = now` on the `ServiceAppointment`
   - Session Console "End Session" should PATCH `ActualEndTime = now`
   - Neither does this today

2. **Bay queue persistence**
   - Queue is in-memory React state only — lost on kiosk restart
   - Future: push `QueueEntry` to a custom SF object so staff console can see it
   - `QueueEntry` interface is in `fairway-kiosk/src/types.ts`

3. **Membership upsell price**
   - `SessionSummaryScreen` upsell card says `"$X/month"` — fill in real price once decided

### Manual Salesforce steps (cannot be scripted — must be done in browser)

4. **Clone Scheduler booking flow**
   - Setup → Flows → search "Inbound New Appointment" (Salesforce template)
   - Click it → Save As → name: `"Fairway Bay Booking"`
   - In flow canvas: find the Work Type Group variable → set value to "Bay Booking"
   - Activate the flow

5. **Add booking flow to Experience Cloud**
   - Experience Builder → open the site → add/edit a "Book a Bay" page
   - Drop a **Flow** component onto the page
   - Set Flow API Name = `Fairway_Bay_Booking` (the flow you just cloned)
   - Publish the page

6. **Add Session Console to Fairway Ops app**
   - Setup → App Builder → Fairway Ops Lightning App → Home page
   - Drag `fairwaySessionConsole` LWC component onto the page
   - Save + Activate

### Infrastructure

7. **`kiosk.fairwaygolfclub.co` custom domain**
   - DNS CNAME is set but Cloudflare Pages custom domain activation needs confirming in the Cloudflare dashboard

8. **Deploy Golfer360 data model to org**
   - 9 custom objects + permission sets + `Fairway_Ops` app are committed to `fairway-sf/` but not yet deployed
   - Run: `sf project deploy start --source-dir force-app --target-org FairwayGolfClub --wait 30`

9. **Cloudflare KV for homepage survey widget**
   - Needs `VOTES_KV` KV namespace + `ADMIN_KEY` in Cloudflare Pages dashboard

10. **Cloudflare Stream video**
    - Investor portal video not yet uploaded

---

## Security Constraints (always in effect)

- Do NOT reference Workhouse Arts Center or Lorton as the location anywhere public-facing — location is not yet announced
- Do NOT reference Russell keeping his day job anywhere public-facing
- Do NOT add `e.preventDefault()` or `fetch()` to form submit handlers on the website — breaks Web-to-Lead
- Do NOT put reCAPTCHA widget outside the `<form>` tag — Salesforce silently rejects the submission
- Do NOT deploy the full-size PNGs from `fairway-website/images/` to Salesforce — they are 83MB uncompressed and will hit the 52MB API limit
- Do NOT set a deploy command in Cloudflare — this is a Pages project, not a Worker

---

## SF Org Access

```bash
sf org login web --alias FairwayGolfClub --instance-url https://login.salesforce.com
# then set as default:
sf config set target-org FairwayGolfClub
```

## Kiosk Local Dev

```bash
cd fairway-kiosk
npm install
npm run dev   # starts on http://localhost:5180
```
