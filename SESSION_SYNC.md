# Fairway Golf Club — Session Sync

**Last updated:** 2026-07-10 (by Claude — no Salesforce CLI access from this environment, see "QR Check-In" below)  
**Last commit:** `679cfe2` on `main` (RussEvans222/FairwayGolfClub) — PR #6, then reworked again same day (not yet merged) to fix the QR design — see below

---

## Repos

| Repo | Purpose | Deployed to |
|---|---|---|
| `fairway-kiosk/` | React + Vite + TypeScript + Tailwind CSS PWA — the physical bay check-in kiosk | Cloudflare Pages → `kiosk.fairwaygolfclub.co` |
| `fairway-bay/` | React + Vite + TypeScript + Tailwind CSS PWA — wall-mounted bay display screen | Cloudflare Pages → `bay.fairwaygolfclub.co` (**not yet deployed — needs new CF Pages project**) |
| `fairway-sf/` | Salesforce metadata (Apex, LWC, custom objects, permission sets) | Salesforce org: `storm-bd727290084d27.my.salesforce.com` |

---

## What's Built and Deployed

### Bay Display (`fairway-bay/`)

**Status:** Code complete, committed to `main`. **NOT YET deployed to Cloudflare** — needs a new Pages project.

**Screens:**
- `login` — SF OAuth implicit flow (same connected app as kiosk)
- `bay-select` — picks Bay 1 or Bay 2 (persists until changed)
- `idle` — "READY" screen + last session recap (player name, date, top 5 club averages, best carry)
- `active` — live session stats, polls SF every 20s:
  - Last shot card: carry, total, ball speed, launch angle, spin, shot shape (color coded)
  - Club averages table with progress bars, max carry, shot count
  - Multi-player arrow nav (← →) with dot indicators in header
  - New player added mid-session silently inserts a new tab without disrupting current view

**Key behavior — silent player add:**
When poll finds more `Session_Participant__c` records than previously, the new player is appended to the array without resetting `activeIndex`. The current player on screen is undisturbed; the new player becomes reachable via the → arrow.

**Env vars needed in Cloudflare Pages project:**
```
VITE_SF_INSTANCE_URL=https://storm-bd727290084d27.my.salesforce.com
VITE_SF_CLIENT_ID=3MVG9JJwBBbcN47LfOSqoMzg6MvSJkwE3fpNuaQzV7Yx3d8VU_zfm9uHa.hFqVLOObL7MybEf3JRJcpvq8Aox
VITE_SF_LOGIN_URL=https://login.salesforce.com
```

**To deploy:**
1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git
2. Repo: `RussEvans222/FairwayGolfClub`, root directory: `fairway-bay`
3. Build command: `npm run build`, output directory: `dist`
4. Add the three env vars above (Production + Preview)
5. Add custom domain: `bay.fairwaygolfclub.co`
6. In Salesforce → Setup → App Manager → Connected App → add `https://bay.fairwaygolfclub.co` to OAuth callback URLs

---

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
- `createWalkInAppointment(contactId, accountId, bayResourceId, startIso, endIso)` — creates `ServiceAppointment` (Status=Dispatched, `ParentRecordId` = member's Person Account Id) + `AssignedResource` record
- Walk-in reservations have real SF IDs
- Auth: OAuth 2.0 Implicit flow — token stored in `sessionStorage`

**ParentRecordId strategy (important):**
- `ServiceAppointment.ParentRecordId` must be a record the kiosk OAuth user can access — WorkOrders are blocked for community users
- We use the member's **Person Account Id** (`Account.Id`) instead
- `handleMemberSearch` fetches `Contact.AccountId` directly; if null (Contact created before Person Accounts were enabled), falls back to `SELECT Id FROM Account WHERE PersonEmail = '...'`
- Guest flow: same fallback path — creates a Contact+Account first if none exists

**Error logging (as of `10c5d21`):**
- `useSalesforce.ts` — every failed `create`, `patch`, and `query` call now:
  - Logs the full SF error response (including `errorCode`, `fields`, payload) to `console.error`
  - Throws `[ObjectName] ERRORCODE: message` so the kiosk UI displays the exact SF error, not just a generic message
- Use browser DevTools → Console to see the full raw SF response on any failure

**Bay assignment (fixed in PR #4, `bb9f3b9`):**
- Queries `ServiceResource` directly as source of truth (not inferred from today's appointments)
- Picks the first bay not occupied by a Dispatched/In Progress/late-Scheduled session
- Returns `null` (→ queue) if none are free — never guesses

**Env vars (`.env.production` baked at Cloudflare build):**
```
VITE_SF_INSTANCE_URL=https://storm-bd727290084d27.my.salesforce.com
VITE_SF_CLIENT_ID=3MVG9JJwBBbcN47LfOSqoMzg6MvSJkwE3fpNuaQzV7Yx3d8VU_zfm9uHa.hFqVLOObL7MybEf3JRJcpvq8Aox
VITE_SF_LOGIN_URL=https://login.salesforce.com
VITE_SF_WALKIN_WORK_TYPE_ID=08qak000000AwM5AAK   ← "Bay Session" (60 min)
```
Note: `VITE_SF_WALKIN_WORK_ORDER_ID` has been **removed** — WorkOrders are no longer used as ParentRecordId.

**QR check-in — reworked 2026-07-10 to be identity-based, untested live (no SF access from this environment):**

PR #6's first version encoded a `ServiceAppointment` Id — a one-time code per booking. Russell's actual intent: a **permanent, per-person code**, generated once, reused forever (like a membership card), that works whether or not they have a same-day reservation. Reworked same day, on top of #6, before/without re-merging the appointment-Id version anywhere else.

- `QrCheckInScreen.tsx` — uses the `qr-scanner` npm package (camera access via `getUserMedia`, decodes in a WebWorker, no manual worker-path config needed with Vite) to scan a code and read a **Contact Id**
- Entry point: "Scan QR" button on `ScheduledSessionsScreen` footer, next to "Walk-In Check-In"
- `handleQrCheckIn(contactId)` in `App.tsx` — two paths:
  1. **Has a not-yet-checked-in reservation today** → same `Scheduled → Dispatched` transition PIN entry uses, just without a PIN
  2. **No reservation today** → looks up the Contact by Id, resolves their Person Account (`resolvePersonAccount`, same helper the regular member walk-in uses), sets `pendingMember`, and jumps straight to the `guest-payment` screen — fast-tracked past the email search and PIN screen since scanning the badge already proves identity. Payment/bay-assignment then proceeds exactly like any other walk-in (`handleMemberWalkInComplete`).
- **Where the code is generated (no email/SMS pipeline yet — on-screen only):**
  - `QrCodeModal.tsx` (uses `qrcode` package) — a ▦ icon next to each not-yet-checked-in player on `ScheduledSessionsScreen` shows their permanent code (encodes `p.contactId`, guarded — hidden if null)
  - `SessionSummaryScreen.tsx` — "Save your check-in code" section at the end of every session, one button per player with a known Contact, so first-timers get their permanent code automatically right when their profile is created
- **QR payload:** bare 18-char Contact Id (or a URL ending in `/{id}` — `QrCheckInScreen` splits on `/` and takes the last segment, so a future check-in URL scheme doesn't require changing this)
- **Deliberately skips the `Checked In` status** — jumps straight to `Dispatched`, identical to what PIN entry does today. See "Checked In status prerequisite" below for why, and how to upgrade once that picklist value exists in the org.
- **Not yet tested against the live org** — no Salesforce or Cloudflare network access from this environment. `tsc -b` and `vite build` both pass; the `qr-scanner-worker` chunk bundles correctly. Needs an actual camera + a real contact to verify end to end, both the has-reservation and fast-track-walk-in paths.

**Checked In status prerequisite (for the fuller status ladder from `SCHEDULER_RESEARCH.md`):**
- `ServiceAppointment.Status` is a **restricted picklist** — writing `"Checked In"` will fail with `INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST` unless that exact value already exists as an active option in the org.
- I did not create this value from this environment because a `StandardValueSet` metadata file (`ServiceAppointmentStatus`) written from scratch, without seeing the org's actual current value set, risks silently deactivating values that are still referenced by existing records on deploy.
- **Safe path once you have `sf` CLI access:**
  ```bash
  # 1. Pull the current live value set into the repo first — don't hand-write it
  sf project retrieve start --metadata "StandardValueSet:ServiceAppointmentStatus" --target-org FairwayGolfClub
  # 2. Open the retrieved file, add a new <standardValue> entry for "Checked In"
  #    with statusCategory = CheckedIn (confirm the exact category API name in
  #    Setup → Object Manager → Service Appointment → Fields → Status first)
  # 3. Deploy it back
  sf project deploy start --source-dir force-app/main/default/standardValueSets --target-org FairwayGolfClub
  ```
  Or do it entirely in Setup UI: Object Manager → Service Appointment → Fields & Relationships → Status → New Value → label "Checked In", map Status Category to "Checked In".
- **Once that value exists**, upgrading the kiosk is a one-line change: in `handleQrCheckIn` (and eventually a real bay-entrance scanner), patch `Status: 'Checked In'` on scan instead of `'Dispatched'`, then patch to `'Dispatched'` separately when a bay is actually assigned.

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
- OWD External Access: WorkType, WorkTypeGroup, ServiceTerritory set to **Public Read Only** so community users can read them

**Permission sets:**
- `Fairway_Admin` — internal staff + Russell
- `Fairway_Member_Plus_Access` (ID: `0PSak00000Wb6lZGAR`) — Customer Community Plus license; granted to test member; added to Experience Cloud site members. Has object permissions for ServiceAppointment, WorkType, WorkTypeGroup, OperatingHours, ServiceTerritory, Contact, Account.
- `Fairway_Member_Access` — old perm set, locked to Customer Community license (incompatible with test user). Leave in place but do not assign to new users.

**Test community user:**
- Email: `russellevansdemo@gmail.com`
- Username: (Community auto-generated — find via Setup → Users, filter by profile "Customer Community Plus User")
- Cannot reset password via CLI (STORM org blocks outbound email to portal users)
- Log in via: Contact record → "Log in to Experience as User" button in Salesforce

**Custom objects:** `Golf_Session__c`, `Golfer_Profile__c`, and others — committed to `fairway-sf/` but **not yet deployed to org** (see Pending below)

---

## Known Issues

### Walk-in check-in: `ParentRecordId` — RESOLVED (2026-07-09)

**Root cause:** Two issues compounded:
1. Contacts created outside Experience Cloud had no Person Account linked (`AccountId = null` or pointed to a business account)
2. SF returns `200` with XML fault body for `InvalidSessionId` instead of `401`, so the kiosk wasn't detecting token expiry

**Fixes shipped:**
- `resolvePersonAccount()` helper in `App.tsx` — finds or creates a Person Account for any member/guest before creating a `ServiceAppointment`. Used by both the member walk-in and guest flows. Verifies `IsPersonAccount = true` before trusting any `AccountId`.
- XML `InvalidSessionId` detection in `useSalesforce.ts` — checks `content-type: xml` response and throws `SESSION_EXPIRED` to trigger re-auth.
- Removed `Profile_Tier__c` from `Golfer_Profile__c` create — field doesn't exist in org.

**Org data fixes applied:**
- Deleted duplicate Contact for `russellevansdemo@gmail.com` (was linked to "Fairway Golf Club" business account)
- Re-pointed `GP-0007` (Russell) and `GP-0008` (Jim) to their correct Person Account-linked Contacts
- Created Person Account for `russ@russevans.me` (Jim Richard) — `001ak00002ztBoHAAU`

**Current test members:**
| Member | Email | Contact ID | Person Account ID |
|---|---|---|---|
| Russell Evans | `russellevansdemo@gmail.com` | `003ak00001h3fqAAAQ` | `001ak00002yxWptAAE` |
| Jim Richard | `russ@russevans.me` | `003ak00001hl8IgAAI` | `001ak00002ztBoHAAU` |

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

## Salesforce Data Model Notes

### `ServiceAppointment` label rename
The `ServiceAppointment` object was renamed in the org UI to **"Bay Session" / "Bay Sessions"**. API name is still `ServiceAppointment` — all code continues to work.

### Golfer360 seed data (Jim Richard, Bay 2)
A complete practice session was seeded on 2026-07-09:
- `Bay_Reservation__c`: `a05ak00000cGnTVAA0`
- `Golf_Session__c`: `a07ak00001Wh67sAAB`
- `Session_Participant__c`: `a0Dak000013C49GEAS`
- 65 `Golf_Shot__c` records across 13 clubs (Driver → LW), realistic ball-flight data
- Use this session to develop/test the bay display and AI coaching prompts in Salesforce

---

## Salesforce Scheduler Research (2026-07-09)

Full research notes in [`SCHEDULER_RESEARCH.md`](./SCHEDULER_RESEARCH.md). Key findings:

**QR code check-in architecture:**
- Salesforce's native QR is for walk-in/waitlist only — not for pre-scheduled `ServiceAppointment` records
- For Fairway: generate a QR code containing the `ServiceAppointment` Id, scan it at bay entrance, kiosk PATCHes `Status = "Checked In"` via REST API — no PIN needed
- Evolution: QR code today → biometric facial recognition later. SF side stays the same; only the identity resolution layer changes.

**Status ladder to add:**
`Scheduled → Checked In (QR scan) → Dispatched (bay assigned) → In Progress → Completed`

**Native Scheduler features to leverage:**
- `Checked In` status category — built in, no custom code
- `Waitlist` object — replace in-memory bay queue with a persistent SF record
- `AppointmentSchedulingEvent` platform event — future upgrade from polling to push in `fairway-bay`
- Lobby Management dashboard — greeter check-in view (requires Greeter PSL)
- Group appointments, guest email management, multi-resource scheduling

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

4. **QR code check-in — BUILT 2026-07-10 (identity-based), needs live testing**
   - Permanent per-person code (Contact Id), not per-booking — see "QR check-in — reworked" above for the full design
   - `QrCheckInScreen` scans via the kiosk iPad's own camera (`qr-scanner` package); `QrCodeModal` generates a real code per person (`qrcode` package) — shown on `ScheduledSessionsScreen` (▦ icon per player) and automatically at the end of every session on `SessionSummaryScreen`
   - Currently patches straight to `Dispatched` (same as PIN entry) rather than `Checked In` — see "Checked In status prerequisite" above for why and how to upgrade
   - **To verify (two paths):**
     - Has a reservation: generate a QR for a real reservation via the QR icon, scan it, confirm it reaches `bay-direction` without a PIN
     - No reservation: generate/reuse a known member's QR (e.g. from a past `SessionSummaryScreen` visit), scan it with no booking on the calendar, confirm it fast-tracks straight to the payment screen and then bay assignment
   - Not yet wired to email/SMS delivery of the code — today it only exists as an on-screen QR generated at the kiosk itself

5. **Add `Checked In` status step to kiosk + session console**
   - Add `Checked In` as a custom status value in SF Scheduler setup (Status Category: `Checked In`)
   - Kiosk: QR scan → `Checked In`, bay assignment → `Dispatched`
   - Session console: show `Checked In` state on bay cards
   - **Not yet built**

6. **Replace in-memory bay queue with Salesforce Waitlist object**
   - Current `bayQueue` array in kiosk React state is lost on restart
   - Native SF `Waitlist` object persists queue and makes it visible in Lobby Management
   - `QueueEntry` interface already defined in `fairway-kiosk/src/types.ts`
   - **Not yet built**

7. **Guest "join a session" flow (kiosk)**
   - New branch in guest check-in: instead of getting their own bay, guest can join an active session
   - Flow: New Guest → "Join a Session" → see active bays with member names → select → free `Golfer_Profile__c` + `Session_Participant__c` created → directed to bay
   - Bay display will silently add them as a new player tab
   - **Not yet built**

5. **Bay calendar view**
   - Calendar UI showing bay bookings (source: `ServiceAppointment` / "Bay Session" object)
   - Location TBD (Salesforce LWC in Fairway Ops app, or new standalone app)
   - **Not yet built**

### Manual Salesforce steps (cannot be scripted — must be done in browser)

6. **Clone Scheduler booking flow**
   - Setup → Flows → search "Inbound New Appointment" (Salesforce template)
   - Click it → Save As → name: `"Fairway Bay Booking"`
   - In flow canvas: find the Work Type Group variable → set value to "Bay Booking"
   - Activate the flow

7. **Add booking flow to Experience Cloud**
   - Experience Builder → open the site → add/edit a "Book a Bay" page
   - Drop a **Flow** component onto the page
   - Set Flow API Name = `Fairway_Bay_Booking` (the flow you just cloned)
   - Publish the page

8. **Add Session Console to Fairway Ops app**
   - Setup → App Builder → Fairway Ops Lightning App → Home page
   - Drag `fairwaySessionConsole` LWC component onto the page
   - Save + Activate

### Infrastructure

9. **Deploy `fairway-bay` to Cloudflare Pages**
   - New Pages project, root: `fairway-bay`, build: `npm run build`, output: `dist`
   - Env vars: `VITE_SF_INSTANCE_URL`, `VITE_SF_CLIENT_ID`, `VITE_SF_LOGIN_URL` (same values as kiosk)
   - Custom domain: `bay.fairwaygolfclub.co`
   - Add `https://bay.fairwaygolfclub.co` to SF Connected App OAuth callback URLs
   - See "Bay Display" section above for full deploy checklist

10. **`kiosk.fairwaygolfclub.co` custom domain**
    - DNS CNAME is set but Cloudflare Pages custom domain activation needs confirming in the Cloudflare dashboard

11. **Deploy Golfer360 data model to org**
    - 9 custom objects + permission sets + `Fairway_Ops` app are committed to `fairway-sf/` but not yet deployed
    - Run: `sf project deploy start --source-dir force-app --target-org FairwayGolfClub --wait 30`

12. **Cloudflare KV for homepage survey widget**
    - Needs `VOTES_KV` KV namespace + `ADMIN_KEY` in Cloudflare Pages dashboard

13. **Cloudflare Stream video**
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
