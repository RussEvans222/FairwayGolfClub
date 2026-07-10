# Fairway Golf Club — Session Sync

**Last updated:** 2026-07-10 (by Claude, remote/web session — this environment has no network path to Salesforce (`*.my.salesforce.com`) or Cloudflare (`*.pages.dev`, custom domains) at all — confirmed via direct `curl`, not just missing `sf` CLI. Russell is switching to a **local terminal Claude Code session** (real `sf` CLI + real network) to run everything below marked "not yet tested."  
**Last commit:** `b563d17` on `main` (RussEvans222/FairwayGolfClub) — PR #9 squash-merged 2026-07-10, includes: tiered member/walk-in pricing, Order/OrderItem revenue tracking, auto-end + smart bay extend/reassign, the `fairway-bay` Cloudflare build fix (`@vitejs/plugin-react` v4→v6), and the `ServiceTerritoryId` root-cause fix for stuck sessions. **`main` is fully current — nothing outstanding on the feature branch.**

**For the local terminal session picking this up:** clone/pull `RussEvans222/FairwayGolfClub` on `main`, then read this file top to bottom — every unverified piece is called out explicitly with the exact `sf` command to run. Start with "Auto-end sessions + smart bay extend/reassign" below (SA-005/SA-006 are still stuck as of this writing) and the Cloudflare notes in that same section (`fairway-bay` Pages project needs its **Deploy command** cleared — it's currently misconfigured with a Workers command, `npx wrangler versions upload`, which fails on a static Pages project).

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
  - `BayDirectionScreen.tsx` — shown **immediately at check-in**, inline (not behind a tap), for anyone with a `contactId` — this is the primary moment: a brand-new guest sees their permanent code the instant they're checked in, before they've even played, not after an entire session
  - `QrCodeModal.tsx` — a ▦ icon next to each not-yet-checked-in player on `ScheduledSessionsScreen` shows their permanent code (encodes `p.contactId`, guarded — hidden if null); useful for staff to pull up anyone's code on demand
  - `SessionSummaryScreen.tsx` — "Save your check-in code" section at the end of every session too, as a second reminder — harmless redundancy since it's the same permanent code every time
  - Both `QrCodeModal` and the inline display on `BayDirectionScreen` share a `useQrCode(value)` hook (`src/hooks/useQrCode.ts`) instead of duplicating the async QR-generation boilerplate
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

**Revenue tracking — Order/OrderItem model (added 2026-07-10, untested live — no SF access from this environment):**

Payments were never actually recorded anywhere — the kiosk's "Pay $35 — Tap to Continue" button only flipped local UI state; the real charge happens manually, off-system, at the front desk. This fixes the recording half (not the collection half — staff still physically take cash/card).

First pass used a single `Amount_Charged__c` currency field on `ServiceAppointment` — wrong, because a visit isn't always one charge: a golfer can extend their session in 30-min increments (up to the next scheduled booking), and each extension is its own charge. A static field can't represent that. Reworked same day to use **standard `Order` + `OrderItem`** — Salesforce's purpose-built "one purchase, multiple line items" model — instead of a custom object, since the org already has Salesforce's native **Payments** feature enabled (unconfigured): `Payments_Home_Default.flexipage-meta.xml` references `sfdc_payments_capture_daily_report` etc., which only exist if Payments/Order Management has been turned on. Nobody's configured actual card processing through it, but Order/OrderItem is the model it's built on, so this lays the groundwork correctly if that's ever activated instead of manual front-desk collection.

**How it works:**
- One `Order` per walk-in visit — the running tab. Created when the walk-in check-in flow (kiosk) creates the `ServiceAppointment`, with a new lookup `Order.Service_Appointment__c` tying it back to the visit.
- One `OrderItem` per charge on that Order — the base session fee when the Order opens, plus one more each time staff extends the session via the `fairwaySessionConsole` LWC's +15/+30 buttons.
- **Tiered pricing via two Pricebooks, not tiered products.** Both charge types ("Bay Session", "30-Minute Extension") exist as a single `Product2` each, priced differently per `Pricebook2`:
  - **Standard Pricebook** (built-in) = walk-in/non-member rate — the premium tier, no membership required
  - **Member Pricing** (new custom Pricebook2) = discounted rate for golfers with an Active or Complimentary `Membership__c` record
  - `resolvePricebookId(contactId)` in `App.tsx` checks `Membership__c` for that contact (`Status__c IN ('Active','Complimentary')`) and picks the Pricebook before opening the Order. Falls back to Standard on any lookup failure.
  - Adding more tiers later (Bronze/Silver/Gold, matching the business plan's membership tiers) is just another `Pricebook2` + two more `PricebookEntry` rows — no code changes needed anywhere in the kiosk or Apex.
- **Current rates (Russell, 2026-07-10):**

  | | Bay Session | 30-Min Extension |
  |---|---|---|
  | Member Pricing | $35.00 | $26.25 |
  | Standard (walk-in) | $45.00 | $28.75 |

  Extension rate is deliberately **more than half** the base rate, not a straight 50/50 split — an unplanned extension costs $17.50 + 25% of that tier's base session rate (member: 17.50 + 0.25×35 = 26.25; walk-in: 17.50 + 0.25×45 = 28.75).
- **Pricing lives in data, not code** — nothing hardcodes these numbers in TypeScript or Apex; both the kiosk and Apex look up the current `UnitPrice` by product name + resolved Pricebook at charge time. Change a rate in Setup and it takes effect immediately, no deploy needed.
- **Products/Pricebooks/PricebookEntries are DATA, not metadata** — can't be deployed via `sf project deploy`. Run once: `fairway-sf/force-app/main/default/scripts/seed-payment-products.apex`. Creates the "Member Pricing" Pricebook2 and both products' entries on both Pricebooks at the rates above. Safe to re-run — if a `PricebookEntry` already exists at a *different* rate than the script has, it logs a warning instead of silently overwriting (so a manual rate change in Setup doesn't get clobbered by a stale script re-run).
- **Extension quantity scales with minutes**, not a fixed unit: `Quantity = minutes / 30.0`, so a +15 charges half of a +30 against the same per-30-min rate — one product covers both buttons, for both tiers.
- `createWalkInAppointment` in `App.tsx`: after creating the `ServiceAppointment` + `AssignedResource`, resolves the Pricebook via `resolvePricebookId`, looks up the "Bay Session" `PricebookEntry` on it, creates the `Order` (`AccountId`, `EffectiveDate`, `Status = 'Draft'`, `Pricebook2Id`, `Service_Appointment__c`), then the `OrderItem`. If no pricebook entry is found (not seeded yet), the appointment still gets created — just without a revenue record — rather than failing the whole check-in.
- `FairwaySessionConsoleController.extendSession` (Apex): after extending `SchedEndTime`, calls a new private `chargeExtension(appointmentId, minutes)` — finds the visit's `Order` via `Service_Appointment__c`, looks up the "30-Minute Extension" `PricebookEntry` on **that Order's own `Pricebook2Id`** (so a member's extensions stay at the member rate, a walk-in's stay at the walk-in rate — the tier was already locked in when the Order opened), inserts the scaled `OrderItem`. No-ops silently if there's no Order (e.g. extending a reservation-based check-in, which doesn't open one) or the product isn't seeded.
- `FairwayOpsDashboardController.cls` — `getBayStatus()` and `getDailyStats()` sum `OrderItem.TotalPrice` (traversing `Order.Service_Appointment__c`) instead of reading a static field. `BayRow.revenueToday` and `DailyStats.totalRevenue` — these totals blend both tiers together; not broken out by member vs. walk-in yet.
- `fairwayOpsDashboard` LWC — a stat tile in the header ("Revenue Today · Walk-Ins") and a revenue figure in each bay card's footer.

**Note on the business plan's pricing:** `Fairway_Golf_Club_Business_Plan.docx` and the financial model scripts (`build_financials_v2.py` etc.) model walk-in bay rentals at **$55–70/hr** and member rate at **$40–55/hr** (blended assumption: walk-in $65, member $40), with monthly membership tiers Bronze $99 / Silver $199 / Gold $299. The $35/$45 per-session rates above are Russell's current direction for the kiosk specifically and are lower than those hourly figures — worth reconciling with the business plan/investor materials at some point, but not something I resolved here since it wasn't asked.

**Scope: walk-ins only, deliberately.** Reservation check-ins (PIN entry) skip the payment screen entirely and never open an Order — unclear whether reservations are pre-paid, membership-included, or genuinely unbilled today. Revenue numbers are real but partial; labeled "Revenue Today · Walk-Ins" everywhere, not just "Revenue."

**Permissions (`Fairway_Staff`):** added object CRUD for `Order`/`OrderItem` (create+read) and read-only for `Pricebook2`/`PricebookEntry`/`Product2`, FLS on `Order.Service_Appointment__c`, and filled in two missing FLS grants on `Membership__c` (`Contact__c`, `Status__c` — needed for the new membership-tier lookup, but were gaps even before this change since `Membership__c` object access existed without them). **Not verified:** standard `Order` sometimes needs an org-level "Order Management" feature/permission beyond normal object CRUD (separate from what a permission set can grant) — if Order creation fails with a permission error even after deploying this, check Setup → Order Settings / the user's permission for "Manage Orders" specifically, not just the permission set.

**Deploy commands (in order):**
```bash
sf project deploy start --source-dir force-app/main/default/objects/Order/fields/Service_Appointment__c.field-meta.xml --target-org FairwayGolfClub
sf project deploy start --source-dir force-app/main/default/classes --target-org FairwayGolfClub
sf project deploy start --source-dir force-app/main/default/lwc/fairwayOpsDashboard --target-org FairwayGolfClub
sf project deploy start --source-dir force-app/main/default/permissionsets/Fairway_Staff.permissionset-meta.xml --target-org FairwayGolfClub
sf apex run --file force-app/main/default/scripts/seed-payment-products.apex --target-org FairwayGolfClub
```

**Not yet tested** — no Salesforce access from this environment. Verify:
- A walk-in with **no** `Membership__c` record checks in → `Order` opens on the **Standard** Pricebook, `OrderItem` at **$45**
- A contact **with an Active/Complimentary** `Membership__c` record checks in as a walk-in (e.g. via QR fast-track) → `Order` opens on **Member Pricing**, `OrderItem` at **$35**
- Extend either session +15 or +30 from the session console → second `OrderItem` lands on the *same* Order at the tier-correct scaled rate ($26.25 or $28.75 for a full 30, half that for a 15)
- Ops dashboard totals both under the correct bay

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

## Auto-end sessions + smart bay extend/reassign — BUILT 2026-07-10, NOT YET DEPLOYED

**Why:** Russell reported two stuck sessions (SA-005, SA-006 in the org) that
nothing ever closed out — there was no mechanism that ended a session once its
scheduled time was up. Also wanted: (a) a 10-minutes-out prompt on the bay
screen asking the golfer if they want to extend, and (b) if extending would
run into another booking already on that same bay, the system should
intelligently move the *incoming* reservation to whichever bay is actually
free at that time — the group currently playing never moves.

**Root cause found (2026-07-10, per Russell): missing `ServiceTerritoryId`.**
The kiosk's walk-in appointment creation (`createWalkInAppointment` in
`fairway-kiosk/src/App.tsx`) was the only code path building a
`ServiceAppointment` from scratch, and it never set `ServiceTerritoryId`.
Appointments booked through the real Scheduler flow (Experience Cloud) get it
automatically from Salesforce's own candidate-matching, so this only bit
walk-ins — which is consistent with SA-005/SA-006 being stuck. **Fixed:**
- `createWalkInAppointment` now resolves the `ServiceTerritory` named
  `Fairway Golf Club` and sets it on every new `ServiceAppointment`.
- `Fairway_Staff` permission set: added read access to `ServiceTerritory` —
  it was entirely missing, so the kiosk's REST-API lookup would have
  silently returned nothing and reproduced the same bug even with the code
  fix in place.
- Both closing paths (`FairwaySessionAutoEnd` sweep and the staff console's
  manual "End Now" / `endSession`) now backfill `ServiceTerritoryId` from
  the same lookup if it's still blank on a record, before flipping `Status`
  to `Completed` — covers any appointment created before this fix, and any
  future path that might still miss it.

**Immediate fix (run this first, once, to unstick SA-005/SA-006):**
```bash
sf apex run --file force-app/main/default/scripts/end-stuck-sessions.apex --target-org FairwayGolfClub
```
Closes any `ServiceAppointment` with `Status IN ('Dispatched','In Progress')` and `SchedEndTime` already in the past — backfilling `ServiceTerritoryId` from `Fairway Golf Club` first if it's blank. Safe to re-run. If SA-005/SA-006 *still* don't close after this, check in Setup whether they simply have no `SchedEndTime` at all (the query requires one), and whether a `ServiceTerritory` named exactly `Fairway Golf Club` actually exists and is active — the script logs a warning and skips the backfill (but still tries to close) if it can't find one.

**1. Auto-end — `FairwaySessionAutoEnd.cls` (Schedulable)**
- Same logic as the immediate fix above, run automatically.
- After deploying, schedule it **once**:
  ```bash
  sf apex run --file force-app/main/default/scripts/schedule-session-autoend.apex --target-org FairwayGolfClub
  ```
- Runs every 5 minutes (`0 0/5 * * * ?`). Re-running the script is safe — it aborts any existing job with the same name first, so it won't double-schedule.
- Extending a session pushes `SchedEndTime` forward, so an extended session is simply not "overdue" yet — the sweep never fights an active extension.
- Only touches `ServiceAppointment.Status`. Does **not** touch `Golf_Session__c` — that object's lifecycle is owned by the (not-yet-built) session-data/vendor pipeline, and closing it here would be guessing at a contract I don't own.

**2. Smart extend — `FairwaySessionConsoleController.extendSessionSmart()`**
- Replaces the old dumb `extendSession` (kept as a thin wrapper for the existing staff console LWC, which ignores the richer result).
- Given `(appointmentId, requestedMinutes)`:
  1. Finds this appointment's bay via `AssignedResource`.
  2. Checks for another appointment already booked on the **same bay** starting between the current end time and the requested new end time.
  3. If found, looks for **any other bay** with no overlapping booking during that conflicting appointment's window. If one is free, reassigns *that other appointment's* `AssignedResource.ServiceResourceId` to the free bay — the group currently playing keeps their bay and gets the full requested extension.
  4. If no bay is free, caps the extension at the conflicting appointment's start time (never bumps a customer with nowhere to go) and reports how many minutes were actually applied.
  5. Charges the extension (existing `chargeExtension` logic, tiered member/walk-in pricing) scaled to whatever was **actually** applied, not what was requested.
- Returns an `ExtendResult { success, minutesApplied, bayReassigned, reassignedBayName, message }`.

**3. Bay-screen prompt — `fairway-bay`**
- `App.tsx` now selects `SchedEndTime` on the active appointment poll (was missing before) and computes `minutesRemaining`.
- At ≤10 minutes remaining, `ActiveScreen` shows a modal: "X minutes left — want to keep playing?" with **+15 min** / **+30 min** / "No thanks." Only fires once per appointment (tracked via a ref) so it doesn't nag on every 20s poll.
- Tapping extend calls a new Apex REST endpoint — **`FairwaySessionExtendApi`** (`@RestResource(urlMapping='/FairwaySessionExtend/*')`) — via `postApexRest()` in `useSalesforce.ts`, since the bay app talks to Salesforce over plain REST (no Aura/LWC context to invoke `@AuraEnabled` methods directly). The endpoint just wraps `extendSessionSmart`.
- The response message is shown back to the golfer as-is (e.g. "Extended 30 min." or "Extended 12 min. Next booking moved to Bay 2." or "Fully booked right after this session — no time available to extend.").
- The Cloudflare Pages Function proxy (`fairway-bay/functions/sfapi/[[path]].js`) already passes through arbitrary paths/methods/bodies, so `/sfapi/services/apexrest/FairwaySessionExtend/` needed no proxy changes.

**Permission set changes (`Fairway_Staff`):**
- `AssignedResource`: `allowEdit` flipped to `true` (needed to reassign a bay's `ServiceResourceId` on an existing junction record).
- Added `classAccesses` for `FairwaySessionConsoleController` and `FairwaySessionExtendApi` (the console LWC was actually missing this too — pre-existing gap, fixed alongside).

**Deploy sequence:**
```bash
sf project deploy start --source-dir force-app/main/default/classes --target-org FairwayGolfClub
sf project deploy start --source-dir force-app/main/default/permissionsets --target-org FairwayGolfClub
sf org assign permset --name Fairway_Staff --target-org FairwayGolfClub   # if not already assigned to bay-screen staff users
sf apex run --file force-app/main/default/scripts/end-stuck-sessions.apex --target-org FairwayGolfClub
sf apex run --file force-app/main/default/scripts/schedule-session-autoend.apex --target-org FairwayGolfClub
```
Then redeploy `fairway-bay` (push to its Cloudflare Pages project, or trigger a rebuild) to pick up the new prompt/REST-call code — **note `fairway-bay` isn't deployed to Cloudflare Pages yet at all** (see Pending Tasks #9), so this whole feature is inert on the customer-facing bay screen until that deploy happens; the Apex side (auto-end + smart extend) works independently and can be verified via the staff session console today.

**Not yet tested (no Salesforce network access from this session — needs the `sf`-CLI terminal):**
- `end-stuck-sessions.apex` actually clears SA-005/SA-006 now that it backfills `ServiceTerritoryId` — this is the fix for Russell's specific report, confirm it first
- A fresh kiosk walk-in creates a `ServiceAppointment` with `ServiceTerritoryId` populated (not blank) — check the record directly in Setup after a test walk-in
- Scheduled job fires every 5 min and closes a deliberately-overdue test appointment
- Bay-reassignment path: book Bay 1 1:00–2:00, Bay 2 free at 1:45, put an active session on Bay 1 ending 1:30, extend it 30 min at the kiosk/console — confirm the 1:00pm... er, the 2:00pm Bay 1 booking gets moved to Bay 2, not cancelled or double-booked
- Cap path: same setup but with Bay 2 *also* booked during that window — confirm the extension is capped instead of silently overwriting the next booking
- `FairwaySessionExtendApi` REST endpoint reachable with a Fairway_Staff user's OAuth token (once `fairway-bay` is actually deployed)
- Test class `FairwaySessionAutoEndTest` deploys cleanly — it uses `SeeAllData=true` to read an existing `ServiceResource` (no reliable Apex-insert pattern exists for that object in this org; see comment in the class) — if the org has zero `ServiceResource` records the tests short-circuit as a no-op rather than failing, but that means they'd give false confidence, so confirm at least one bay resource exists when running tests

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

9. **Deploy `fairway-bay` to Cloudflare Pages — IN PROGRESS 2026-07-10, misconfigured**
   - New Pages project, root: `fairway-bay`, build: `npm run build`, output: `dist`
   - **Known issue:** the project as created has a **Deploy command** set to `npx wrangler versions upload` (a Workers command), which fails with "Missing entry-point to Worker script" on every deploy — this is a static Pages project, not a Worker. Fix: Settings → Builds & deployments → clear the Deploy command entirely. If it can't be cleared, the project was likely created as a Worker instead of Pages and needs to be deleted/recreated via Workers & Pages → Create → **Pages** → Connect to Git (not "Deploy a Worker").
   - Also hit (fixed in code, needs a fresh deploy to pick up): `npm ci` was failing with an ERESOLVE conflict — `@vitejs/plugin-react ^4.5.2` doesn't support `vite ^8.1.1`. Bumped to `^6.0.3` (matches `fairway-kiosk`) in commit on `main`.
   - Env vars: `VITE_SF_INSTANCE_URL`, `VITE_SF_CLIENT_ID`, `VITE_SF_LOGIN_URL` (same values as kiosk)
   - Custom domain: `bay.fairwaygolfclub.co` — once the Pages project has a working deployment, add this under the project's **Custom domains** tab; since the zone is already on Cloudflare it auto-creates the CNAME, no manual DNS record needed
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
