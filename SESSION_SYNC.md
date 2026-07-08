# Fairway Golf Club — Session Sync

**Last updated:** 2026-07-08 (by Claude)  
**Last commit:** `5ec20e4` on `main` (RussEvans222/FairwayGolfClub)

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

### Walk-in check-in: `ParentRecordId` null for test member

**Status:** Fix deployed (`5ec20e4`), pending Cloudflare deploy + re-test.

**Symptom:** "required fields are missing: [ParentRecordId]" when kiosk tries to create a ServiceAppointment for the test member.

**Root cause:** The test member's Contact was created without a Person Account linked (`AccountId = null` on the Contact record). The kiosk was passing `''` as `ParentRecordId`.

**Fix:** `handleMemberSearch` now falls back to `SELECT Id FROM Account WHERE PersonEmail = '...'` when `Contact.AccountId` is null. This covers Contacts created before Person Accounts were enabled on the org.

**If it still fails after deploy:** Check whether a Person Account actually exists for `russellevansdemo@gmail.com` in the org. If not, create one manually or via the guest flow (which auto-creates one).

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
