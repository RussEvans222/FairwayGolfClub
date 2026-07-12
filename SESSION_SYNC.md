# Fairway Golf Club — Session Sync

**Last updated:** 2026-07-12 (cross-session double-booking guard extended to new bookings, plus a live regression fix — see "Session Update — 2026-07-12 (booking-time conflict check + Join-a-Party regression fix)" immediately below)  
**Last commit:** `97016b3` on `main`, pushed.  
**Ongoing hazard:** a second AI agent (Codex) is working this same repo concurrently and periodically commits/pushes to `main` on its own schedule, sometimes sweeping up uncommitted local files alongside its own unrelated changes — and, this session, shipped a real regression to `main` (see below). Always `git status`/`git diff` immediately before staging, stage explicit file lists (never `git add -A`), and don't assume a file you didn't touch is unchanged.

**For whoever picks this up next:** `ServiceAppointment` ("bay session" in Russell's words) now has a real link to `Golf_Session__c`/`Session_Participant__c` for the first time — previously these two data models were completely disconnected, and no live flow ever created a `Golf_Session__c` at all (only manual seed scripts did). Every kiosk check-in path now creates one automatically and adds the checking-in golfer as the primary participant, so a new `fairwaySessionParticipants` LWC can show "who's checked in" on a `ServiceAppointment` record. See that section for the full detail, including two wrong-guess Flexipage component names that had to be walked back, and the still-outstanding manual Setup step (page activation) that needs a human. See prior entries below for the still-outstanding Salesforce backend/kiosk items (Checked In status ladder live-test, PaymentLink checkout error, etc.) — none of that was touched this session.

---

## Session Update — 2026-07-12 (booking-time conflict check + Join-a-Party regression fix)

Follow-up to the same-day duplicate-join fix (see next section down): that fix only stopped a golfer already active in one bay from *joining* a second one via Join-a-Party. Russell's "we should address that" pointed at the gap explicitly flagged at the end of that fix — the kiosk's own bay-assignment logic (`findAvailableBay()`) had no idea "is this golfer already checked in elsewhere" at all, so a normal walk-in or reservation check-in could still double-book someone into a second bay via a brand-new `ServiceAppointment`, entirely separate from the join-a-party path.

**New Apex REST endpoint `FairwaySessionConflictApi.cls`** (`/services/apexrest/FairwaySessionConflict/`) — thin wrapper around `FairwaySessionConsoleController.findConflictingActiveBay()` (made `public static`, was `private`; already existed from the prior fix). POST `{ golferProfileId }` → `{ conflictBayName }` (null when clear). **Caught via `curl` byte-counting before it could break the kiosk:** a bare `String` return type on an Apex REST method serializes a null result as a genuinely empty (0-byte) HTTP body, not the JSON literal `null` — would have thrown `SyntaxError: Unexpected end of JSON input` in the kiosk's `res.json()`. Fixed by wrapping the return in a `ConflictCheckResult` DTO so the body is always valid JSON. `FairwaySessionConflictApiTest.cls` (2 tests) passes. `Fairway_Staff` permission set granted access; also had to re-add a `classAccesses` entry for `FairwaySessionCheckinApi` that had gone missing (collateral from a concurrent Codex commit reverting it) — deployed immediately after editing per the established mitigation.

**Kiosk (`fairway-kiosk/src/App.tsx`)** — new `checkAlreadyActive(golferProfileId)` helper, a *blocking* check (unlike the existing best-effort `ensureKioskSession`), wired in right before any new booking/state-mutation would occur in all 5 check-in completion paths: `handlePinConfirm`, `handlePinSetup`, `handleQrCheckIn`'s reservation-match branch, `handleMemberWalkInComplete`, `handleGuestComplete`. On conflict, shows `"<name> is already checked into <bay>."` and bails before `findAvailableBay()`/`createWalkInAppointment()` ever run. Fails open (returns `null`) on a network error, matching this app's existing tradeoff elsewhere (e.g. `resolveWalkInChannelId`) — a transient hiccup can't strand someone at the kiosk.

**Verified end-to-end against the live org via a fake-auth headless-Chromium Playwright run** (not just curl/Apex tests): registered as "Russell Evans" (`russellevansdemo@gmail.com`, real contact, actively checked into Bay Number 2 via SA-0044) through the kiosk's New Guest flow and hit Pay — kiosk correctly showed **"Russell is already checked into Bay Number 2."** and created no new `ServiceAppointment`.

**Real regression found and fixed along the way, unrelated to the above but discovered while reconciling git state before committing:** between this session's Apex deploy and the kiosk-side commit, Codex's own concurrent commit (`a48ed50`, already pushed to `main` before this was caught) added its own conflict check inside `handleJoinPartyComplete()` — but called the new endpoint expecting a bare string back (`postApexRest<string | null>(...)`), when it actually returns `{ conflictBayName }`. An object is always truthy, so that check was **unconditionally blocking every single Join-a-Party attempt** with a nonsensical `"You're already checked into [object Object]."` — this was live on `main` at the point it was found. Fixed by pointing that call site at the same `checkAlreadyActive` helper instead of a second ad-hoc `postApexRest` call. Verified both directions with a live Playwright run: a fresh, conflict-free guest successfully joined an in-progress Bay Number One session (new `Session_Participant__c`, slot 2, confirmed via SOQL) with no error shown. Committed as `97016b3`, pushed — `git log origin/main..HEAD` confirmed clean before and after. All test data from both Playwright runs (contacts, Person Accounts, `Golfer_Profile__c` records, Orders, the one leftover `ServiceAppointment`/`AssignedResource`/Order combo from an earlier test pass) deleted afterward.

**Known gap, not addressed this session (separate, lower-severity issue noticed in passing):** `Golf_Session__c.Status__c` doesn't get synced when its linked `ServiceAppointment` is marked `Completed` at the bay — SA-0044 (Russell, Bay Number 2) shows `Completed` on the appointment but its `Golf_Session__c` (`a07ak00001XXH23AAH`) is still `In Progress`. This is why `findConflictingActiveBay` still (correctly, given current data) treats Russell as active in Bay 2 — it's reading a stale `Golf_Session__c` status, not a bug in the conflict-check logic itself. Worth fixing whenever the "whole check out process at the bay" (mentioned earlier this session, not yet designed) gets built — that's presumably where `Golf_Session__c.Status__c` should get flipped to `Completed` in lockstep with the `ServiceAppointment`.

---

## Session Update — 2026-07-12 (session linking + participants LWC)

Follow-up to the Join-a-Party work earlier the same day: the user asked how a joiner gets associated with the "bay session" in Salesforce. Answer, after investigating: it doesn't — `ServiceAppointment` (Scheduler's booking object, what every kiosk check-in flow runs on) has zero field-level connection to `Golf_Session__c`/`Session_Participant__c` (the Golfer360 shot-tracking objects), confirmed by grepping every field on both sides. Worse, **no live flow ever created a `Golf_Session__c`** — only `scripts/seed-poc-data.apex` did. Join-a-Party could only ever attach to a session that happened to already exist from seed data. User's actual ask, once this was explained: open a `ServiceAppointment` in Salesforce and see every golfer checked into it, via a custom LWC. Planned in plan mode first (same plan file as the check-in funnel work, overwritten — `/Users/russevans/.claude/plans/the-tap-to-start-generic-journal.md`).

**Schema (`fairway-sf/force-app/main/default/objects/`):**
- New `Simulator_Bay__c.Service_Resource__c` (Lookup → ServiceResource) — the missing FK. `fairway-bay`'s only prior attempt to bridge these two objects was a hardcoded 2-bay name-matching hack (`resources.find(r => r.Name.includes(...'one':'2'))`) that's provably broken as a general pattern — the real names don't even match ("Bay Number 2" vs "Bay Number Two"). Migrated the 2 existing bays via `sf data update record` (not a checked-in script — one-time, two-record fixture, not repeatable data).
- New `Golf_Session__c.Service_Appointment__c` (Lookup → ServiceAppointment) — mirrors the existing `Order.Service_Appointment__c` pattern exactly.
- **Relaxed `Golf_Session__c.Reservation__c` from required to optional**, instead of the first plan draft's idea of auto-creating a "shadow" `Bay_Reservation__c` on every check-in just to satisfy the required lookup — that would have directly contradicted `BOOKING_CHECKIN_PROCESS.md`'s explicit guidance to leave `Bay_Reservation__c` dormant. Confirmed no production Apex reads this field before relaxing it (only a test fixture sets it).
- **Real platform constraint discovered the hard way:** Salesforce does **not** support a `<unique>` tag on Lookup-type CustomFields at all (`Can not specify 'unique' for a CustomField of type Lookup`) — the first draft of both new fields tried this for data-integrity insurance; removed, replaced with a code comment explaining uniqueness is enforced by `ensureCheckedInSession`'s own idempotency check + `FOR UPDATE` lock instead, not the platform.
- FLS added to both `Fairway_Admin` and `Fairway_Staff` for both new fields.

**Apex (`FairwaySessionConsoleController.cls`, additive):**
- New `ensureCheckedInSession(serviceAppointmentId, golferProfileId, displayName, isGuest)` → `EnsureSessionResult`: idempotent find-or-create — locks the `ServiceAppointment` row (`FOR UPDATE`), checks for an existing linked `Golf_Session__c` first (returns `sessionWasCreated=false` and no-ops if a primary participant already exists — this is what makes retries/double-taps safe), otherwise resolves the bay via the new FK chain (`AssignedResource` → `Simulator_Bay__c.Service_Resource__c` — **not** string-matching) and creates the session (`Session_Type__c` must be set explicitly — confirmed the picklist `<default>` only applies via the New Record UI form, not Apex `insert`) plus the primary `Session_Participant__c`. Deliberately does **not** create a `Bay_Reservation__c` (see schema note above). `joinSession()` (built last session) was left completely untouched rather than refactored to share logic — it's already shipped and verified, not worth the risk for ~10 duplicated lines.
- New `getSessionParticipants(serviceAppointmentId)` → `List<ParticipantDTO>` — backs the new LWC.
- New `FairwaySessionCheckinApi.cls` (`@RestResource(urlMapping='/FairwaySessionCheckin/*')`) — mirrors `FairwaySessionJoinApi.cls` exactly, for the kiosk to call over REST.
- New `FairwaySessionCheckinApiTest.cls` (4 tests, all passing): first-call creates session+participant; second call is a no-op; graceful failure with no bay mapping; guest path sets `Guest_Flag__c`/null profile. Follows the `SeeAllData=true` pattern already established by `FairwaySessionAutoEndTest` (reads a real `ServiceResource`/migrated `Simulator_Bay__c` rather than fabricating one — same reason: `ServiceResource` isn't reliably insertable via plain Apex in this org).
- **Real bug caught by live verification, not the unit tests:** the first working version returned `bayName: null` on a brand-new session — a freshly-`insert`ed sObject doesn't have its parent relationship fields (`session.Bay__r`) populated in memory the way a re-queried one does. Fixed by tracking a separate `resolvedBayName` local variable through both the create and existing-session paths. Redeployed, re-verified, cleaned up the exposed test data.
- `Fairway_Staff` permission set: added `classAccesses` for `FairwaySessionCheckinApi` (mirrors `FairwaySessionJoinApi`'s existing entry — `Fairway_Admin` doesn't grant either kiosk REST endpoint, confirmed intentional/pre-existing).

**Kiosk (`fairway-kiosk/src/App.tsx`) — new `ensureKioskSession` helper, wired into all 5 check-in completion points** (PIN confirm, PIN setup, QR reservation-match, member walk-in complete, guest walk-in complete) right before each routes to `bay-direction`. Swallows all failures internally (never blocks or errors out the actual check-in — this is a tracking enhancement) so every call site is a bare `await` with no try/catch. Explicitly not wired into the bay-queue branches (no appointment exists yet) or `handleJoinPartyComplete` (already creates its own participant via the existing `joinSession` path).

**New LWC `fairwaySessionParticipants`** (`force-app/main/default/lwc/fairwaySessionParticipants/`) — follows `fairwayBayControl`'s exact conventions (the established record-page-component template in this repo): `@api recordId`, imperative Apex import (never `@wire`, matching every LWC here), 30s poll, the same `:host { --fwc-* }` CSS token block copied verbatim. Shows display name, slot, Primary/Guest badges.

**New Flexipage `ServiceAppointment_Session_Detail`** — two wrong guesses before landing on what actually deploys: `flexipage:relatedListsSingleColumn` and `flexipage:highlightsPanel` both failed with *"We couldn't retrieve the design time component information for component..."* — neither is a valid standard-component name in this org's metadata registry (at least not spelled that way). Rather than keep guessing blind, fell back to the **proven working pattern already live in this org** — `ServiceResource_Bay_Control.flexipage-meta.xml`'s component-only single-region approach — so the deployed page currently shows **only** the participants list, no standard fields/related lists. Also hit (and fixed): a `FlexiPage` region can only have one `componentInstance` per `itemInstances` block (two components need two separate `itemInstances`), and `description` has a hard 255-char cap.

**Still needs a human — cannot be done from this environment:**
1. **Activate the Flexipage** — Setup → Object Manager → Service Appointment → Lightning Record Pages (or open any `ServiceAppointment` record → gear icon → Edit Page) → find "ServiceAppointment Session Detail" → Activation tab → **Assign as App Default → `Fairway Ops` only** → Save. Do **not** check Org Default (`ServiceAppointment` is Scheduler/Field Service infrastructure this project doesn't fully own — see the full reasoning in the plan file's Context section, same precedent as why `ServiceResource_Bay_Control` isn't org-default either).
2. **Add standard fields/related lists back via the App Builder UI** (drag-and-drop from the component palette — trivial there, unlike hand-authoring the XML blind) if wanted alongside the participants list. Not done this session after two failed guesses at the right component names.
3. **Final visual check** once activated: open a real `ServiceAppointment` inside `Fairway Ops`, confirm the participants list renders correctly with real data, confirm the page is untouched outside that app.

**Verification performed (everything short of the 3 items above):** all 4 new Apex tests pass; `ensureCheckedInSession`/`getSessionParticipants` verified directly via Execute Anonymous (including the bayName bug found and fixed this way) and via a raw REST `curl` call proving the permission grants work end-to-end; **full kiosk-driven browser test against the live org** — real guest walk-in through the actual UI, confirmed the resulting `Golf_Session__c` (Practice, In Progress, correct bay) and primary `Session_Participant__c` (guest flag, slot 1) were created exactly as designed. All test data (participants, sessions, Orders/OrderItems, and two leftover walk-in `ServiceAppointment`s that were blocking bay availability for testing) cleaned up / marked Completed afterward — live org is back to a clean state.

---

## Session Update — 2026-07-12 (check-in funnel rework + join-a-party)

Two changes requested together: (1) turn the Welcome screen's background into a slideshow and collapse the post-tap flow into one screen with an always-on QR scanner, and (2) build a real "join an in-progress party" feature for late-arriving group members — a genuine gap, since a live session only ever modeled one player. Planned in plan mode first (`/Users/russevans/.claude/plans/the-tap-to-start-generic-journal.md`), with the user correcting the payment model mid-plan-review before implementation started.

**Kiosk (`fairway-kiosk/`):**
- **`WelcomeScreen.tsx`:** background is now `components/BackgroundSlideshow.tsx`, cycling through 4 photos (`welcome-bg.jpg` plus 3 newly-resized: `welcome-bg-simulator.jpg`, `welcome-bg-lounge.jpg`, `welcome-bg-bar.jpg`) with a 1.5s crossfade every 9s. Tap-anywhere-to-advance-screen is unaffected — the slideshow has no click handling of its own.
- **New `CheckInScreen.tsx`** (reached via `handleStart` → `screen = 'check-in'`, replacing the old direct jump to `'scheduled-sessions'`): embedded live QR scanner as the visual centerpiece (2/3 width) plus three equal-weight tiles (1/3 column) — New User, Walk-In Check-In, Join a Party (new `checkin-join.jpg`, resized from `coaching.png`). Scanner logic extracted from the retired `QrCheckInScreen.tsx` into `hooks/useQrScanner.ts` — same `qr-scanner` package, same behavior, just embeddable instead of full-screen.
- **Retired:** `QrCheckInScreen.tsx`, `PlayerTypeScreen.tsx` (deleted). Their destinations are absorbed: New Guest and QR scan are now top-level on `CheckInScreen`; "I Have a Reservation" is `ScheduledSessionsScreen`'s reservation list, reached via "Walk-In Check-In"; "Member Walk-In" moved onto `ScheduledSessionsScreen` itself (renamed prop `onWalkIn` → `onMemberWalkIn`, dropped the now-redundant "Scan QR" button, added a Back button to `check-in`).
- **New "Join a Party":** `JoinPartyScreen.tsx` lists live `Golf_Session__c` rows (`Status__c = 'In Progress'`, queried fresh — the kiosk never queried this object before, its schedule view is entirely `ServiceAppointment`-based) with a real participant count via a `(SELECT Id FROM Session_Participants__r)` subquery. Picking one reuses the *exact same* `member-walkin`/`member-walkin-pin`/`guest-registration` → `guest-payment` screens as a normal walk-in — the only new branch point is at the `guest-payment` confirm handler, which checks a new `selectedJoinSession` state to route to `handleJoinPartyComplete()` instead of the normal walk-in completion handlers.
- **`handleJoinPartyComplete()`** (`App.tsx`): resolves identity (member via `pendingMember`, or guest via the newly-extracted `resolveGuestIdentity()` helper — pulled out of `handleGuestComplete` so it's not duplicated a third time), records the session fee via the newly-extracted `createSessionOrder()` helper (pulled out of `createWalkInAppointment`), then calls the new `FairwaySessionJoinApi` endpoint via a new `postApexRest` addition to `hooks/useSalesforce.ts` (mirrored from `fairway-bay`'s hook, which already had one for the smart-extend feature). On success, builds a synthetic session using the existing `reservationId: 'walk-in'` sentinel (`BayDirectionScreen` already special-cases this) and routes to `bay-direction`; on failure (session went stale, or hit the 4-player cap), shows the Apex layer's friendly message inline.
- **Payment-model correction, mid-plan-review:** the first plan draft had Join-a-Party show a "tap to pay $35" confirmation like the existing `GuestPaymentScreen` implies. Russell corrected this before implementation: **every player gets their own individual Order, created at check-in but not paid there** — payment happens at session completion via a bay-side checkout process that isn't designed yet ("more ideas to come"). `createSessionOrder()` reflects this: it just records the OrderItem, no payment confirmation gate. `GuestPaymentScreen`'s existing "Pay $X — Tap to Continue" / "Payment confirmed" copy is now known-stale for *every* path that uses it (not just this new one) — not rewritten this session, flagged for whenever the real checkout flow gets designed.

**Salesforce (`fairway-sf/`) — deployed to the live org, not just committed:**
- **New `FairwaySessionJoinApi.cls`** (`@RestResource(urlMapping='/FairwaySessionJoin/*')`), mirrors `FairwaySessionExtendApi.cls`'s pattern exactly.
- **New `FairwaySessionConsoleController.joinSession()`** + `JoinResult` DTO: locks the parent `Golf_Session__c` row (`FOR UPDATE`) to serialize concurrent joins (nothing else enforces `Simulator_Player_Slot__c` uniqueness — confirmed no validation rule exists on `Session_Participant__c` at all), picks the lowest free slot 1–4, rejects gracefully (not an exception — a `success:false` + friendly `message`) if the session isn't `In Progress` anymore, the golfer's already a participant, or all 4 slots are taken.
- **`Fairway_Staff` permission set** — added `classAccesses` for `FairwaySessionJoinApi`.
- **Deployed via `sf project deploy start`, then verified for real** — not just trusted to compile:
  - Execute Anonymous against the actual live `In Progress` session (`Bay Number One`, `a07ak00001Vim2mAAB`) confirmed: successful join picks the right next slot; re-joining the same profile is rejected; filling all 4 slots then trying a 5th is rejected; trying to join a `Completed` session is rejected.
  - Raw `curl` POST to `/services/apexrest/FairwaySessionJoin/` with a real bearer token confirmed the REST wrapper + permission-set grant work end-to-end, independent of the underlying Apex logic.
  - **Full browser-driven end-to-end pass against the live org** (not the fake-auth technique used for pure visual checks last session — a real token from `sf org display`, since this run needed real query results): Welcome slideshow → tap → `CheckInScreen` → Walk-In Check-In → `ScheduledSessionsScreen` (real "no sessions today" data) → Back → Join a Party → real live session listed correctly ("Bay Number One", "2 playing") → selected it → searched a real member's email → PIN entry → fee-info screen → confirmed → real `Session_Participant__c` (slot 3, correct `Golfer_Profile__c`) and a real individual Order/OrderItem (`Service_Appointment__c` correctly null) created → `bay-direction` screen showed the correct bay and welcome copy. **All test records (participant, Order, OrderItem, and an incidentally-set `Member_PIN__c`) were deleted/reset afterward** — the live org is back to its pre-test state.
  - Confirmed via code reading (not a live `fairway-bay` browser session — didn't spin up a second dev server against prod data) that `fairway-bay`'s existing poll loop already does `SELECT ... FROM Session_Participant__c WHERE Golf_Session__c = :id` every 20s with a paged multi-player UI already built (`ActiveScreen.tsx`, dot indicators, "Player X of Y") — a stale comment in that file (`// New player added silently — don't change index`) already anticipated this exact feature. High confidence, not empirically re-verified in a browser this session.

**Explicitly out of scope this pass** (per the user's own scoping during planning): no SMS/texting, no approve/deny UI in `fairway-bay` (`BOOKING_CHECKIN_PROCESS.md` Case 2's fuller design — this implements Pending Task #7's original *silent-join* version instead, see that entry above), no join-code/party-pre-registration mechanism, no change to the 1–4 `Simulator_Player_Slot__c` ceiling (6-player question stays unresolved), no bay checkout UX.

**Status as of end of session:** everything above is committed and pushed (`c1f4e01` on `main`) — Cloudflare Pages will auto-deploy the kiosk changes from this push. The Salesforce/Apex side was deployed straight to the org earlier in the session, independent of this commit. This file's own "Pending Task #7" entry above was updated to match (`CLAUDE.md` doesn't reference these specific kiosk screens, so nothing there needed changing).

---

## Session Update — 2026-07-11 (Heritage Green kiosk redesign)

Redesigned `fairway-kiosk`'s Welcome screen and check-in-selection screen (`PlayerTypeScreen`, the "Who's Playing? → I Have a Reservation / Member Walk-In / New Guest" screen) against two Stitch-generated mockups the user dropped in `Assets/stitch_fairway_sim_kiosk_redesign/` (`welcome_screen_glass_gold_refinement/`, `check_in_options_asymmetric_grid/`) plus the `heritage_green/DESIGN.md` token spec. Scope was explicitly agreed with the user up front as "these two screens + shared theme tokens, not a full app-wide reskin."

- **Fonts:** added Playfair Display (headings) + Work Sans (body/labels) via Google Fonts `<link>` tags in `fairway-kiosk/index.html`; `body` font-family in `index.css` switched to Work Sans app-wide (low-risk, doesn't change layout).
- **Design tokens:** `fairway-kiosk/src/index.css` gained Heritage Green CSS variables (`--hg-forest`, `--hg-forest-container`, `--hg-sage`, `--hg-cognac`, `--hg-cognac-dark`, `--font-display`, `--font-body`) and shared utility classes (`.hg-vignette`, `.hg-gold-shimmer`, `.hg-glass-panel`, `.hg-glass-button`, `.hg-logo-white`) — kept the existing `--gold #C9A84C` brand gold rather than swapping in the mockup's generic `#e9c349`, since `#C9A84C` is the documented brand color used site-wide (see `CLAUDE.md`).
- **Real photography instead of the mockups' placeholder stock images:** the Stitch HTML referenced `lh3.googleusercontent.com` placeholder URLs. Used actual Fairway interior photos from `fairway-website/images/` instead (resized to 1920px-wide JPEGs via `sips`, landed in `fairway-kiosk/public/images/`): `bar-lounge.png` → Welcome background, `reception.png` → "I Have a Reservation" tile, `lounge-detail.png` → "Member Walk-In" tile, `bays-social.png` → "New Guest" tile.
- **`WelcomeScreen.tsx`:** full-bleed background photo + dark gradient/vignette, glass-panel treatment on the bay-availability chip / wait-timer / drink-suggestion / active-bay-status blocks, Playfair Display headline with a gold-shimmer gradient on "Golfer.", glass-gold "Tap to Start" button replacing the old circle+finger-emoji hint. All existing dynamic logic (wait countdown, per-bay status, tagline rotation, drink suggestion by hour) is untouched — this was a visual pass only.
- **`PlayerTypeScreen.tsx`:** rebuilt as the mockup's asymmetric grid — "I Have a Reservation" as a 2/3-width hero tile, "Member Walk-In" / "New Guest" stacked in the remaining 1/3 column, each with its own full-bleed photo + gradient overlay + gold label. Back button restyled as a glass pill. Routing/handlers (`onMember` / `onWalkInMember` / `onGuest`) unchanged.
- **Mid-session addition — logo swap:** the user asked (mid-turn) to replace every kiosk/bay logo mark with the real `fairway-website/images/logo-text.png` wordmark, white-filtered (`filter: brightness(0) invert(1)` via the new `.hg-logo-white` class — the PNG has a real alpha channel, confirmed with `sips -g hasAlpha` / a `file` check, so the filter reads as "white wordmark on transparent" rather than a solid white box). Applied to: `WelcomeScreen`, `PlayerTypeScreen` header, `StaffLoginScreen`, `ScheduledSessionsScreen` header (all kiosk), and the Salesforce `fairwayBayGreeting` LWC (`.logo` emoji+text span → `<img>` against the `fgcImages` static resource, which now also contains `logo-text.png`). Did **not** touch the internal staff-facing ops LWCs (`fairwayOpsDashboard`, `fairwayBusinessStats`, `fairwayDailySchedule`, `fairwaySessionConsole`) — out of the stated "kiosk + bay" scope.
- **Verification:** ran the kiosk dev server and drove it with a scripted headless-Chromium (Playwright, installed ad hoc for this — not added as a project dependency) pass since the app gates on real Salesforce OAuth. Faked a session by patching `window.fetch` for `/sfapi/*` calls to return empty success responses before triggering `refreshAuth()` via the existing "Use environment token" skip link (this avoids the app's real `SESSION_EXPIRED` → `clearAuth()` handling that a genuinely invalid token would trigger). Both screens confirmed visually correct against the mockups. **Not tested on real kiosk touch hardware, and the `fairwayBayGreeting` LWC change has not been deployed to the org** — same "built and committed, not yet deployed" caveat that applies elsewhere in this repo (see `CLAUDE.md`'s Golfer360 section).

---

## Session Update — 2026-07-10 (CLI deploy pass)

A session with actual `sf` CLI access ran through the deploy backlog this file had been accumulating. Everything below marked "not yet deployed" / "untested — no SF access" earlier in this doc **is now deployed**, except where a section explicitly says otherwise. Real bugs surfaced during deploy (the code as written didn't actually compile/run in the org) — all fixed and deployed:

- **Apex classes** (`FairwaySessionAutoEnd`, `FairwaySessionExtendApi`, updated `FairwaySessionConsoleController`) — fixed: (1) `FairwaySessionConsoleController.ExtendResult` had to become a `global` inner class since `FairwaySessionExtendApi`'s `@RestResource` method returns it, which forced the **enclosing class to also be `global`** (Apex requires this); (2) `FairwaySessionAutoEndTest` combined `@testSetup` with class-level `@isTest(SeeAllData=true)` — not allowed together; restructured to a plain `setupData()` helper called per test method, each annotated `@isTest(SeeAllData=true)` individually; (3) the test queried `ServiceAppointment.Description` in a `WHERE` clause — long text area fields can't be filtered in SOQL; switched to tracking record Ids instead.
- **`Fairway_Staff` permission set** — fixed: (1) `Pricebook2` `viewAllRecords=true` failed with "user license doesn't allow View All Pricebook2" (same fix applied preemptively to `PricebookEntry`/`Product2`); (2) `ServiceTerritory` `viewAllRecords=true` demanded `OperatingHours` read access too — resolved by dropping `viewAllRecords` on `ServiceTerritory` (plain read is enough for the kiosk's name-based lookup); (3) FLS entries for two **required** fields (`Membership__c.Contact__c`, `Membership__c.Status__c`) aren't deployable — Salesforce implicitly grants full access to required fields and rejects explicit FLS metadata for them — removed both blocks.
- **`Order.Service_Appointment__c` field** deployed first (classes referencing it would otherwise fail to compile in the org).
- **Session auto-end sweep scheduled** — `schedule-session-autoend.apex` originally used `'0 0/5 * * * ?'` (then a comma list) for "every 5 minutes" — **Apex's cron parser doesn't support `/` increments or comma lists for seconds/minutes at all, only a single literal integer**, unlike standard cron/Quartz. Rewrote to schedule 12 separate jobs (`Fairway Session Auto-End :00` through `:55`), one per 5-minute mark.
- **`seed-payment-products.apex`** — anonymous Apex wraps the whole script body in an implicit outer method, so a class defined inline becomes a *nested* type, and Apex disallows `static` methods on nested types. Converted `FairwayPaymentSeed` to instance methods + `new FairwayPaymentSeed().run()`. Ran successfully — Member Pricing Pricebook2 + both products' entries on both pricebooks are seeded at the documented rates.
- **Golfer360 data model** — all 9 custom objects + tabs + `Fairway_Ops` app deployed (139 components, 0 errors). Confirmed queryable; some already had data in the org from earlier work (4 `Golfer_Profile__c`, 61 `Golf_Shot__c`, etc. — Jim Richard's seeded practice session, see below).
- **SA-0005 / SA-0006** (the stuck sessions this whole auto-end feature was built to fix) — turned out to already be soft-deleted by the time this session ran `end-stuck-sessions.apex` (deleted at 03:28:40–47 UTC that day, mid-session, not by anything this session ran — likely cleaned up directly in Salesforce). Nothing left to fix there specifically, but the sweep is now deployed and scheduled so it won't recur.

**New bug found (unrelated to any of the above, not yet fixed):** see "PaymentLink checkout error" under Known Issues.

---

## Session Update — 2026-07-10 (`fairway-bay` goes live + per-golfer recap)

Later the same day, with live Cloudflare + `sf` CLI access:

- **`fairway-bay` deployed to Cloudflare Pages — RESOLVED.** The project's Deploy command was wrongly set to `npx wrangler versions upload` (a Workers command), so every build had been failing silently and nothing had ever actually gone through `npm run build` → `dist/` — what was live was an empty placeholder. Russell cleared the Deploy command field in the dashboard; the site now builds and loads. Pending Tasks #9 is resolved.
- **OAuth `redirect_uri_mismatch` on first login — RESOLVED.** `bay.fairwaygolfclub.co` was never added to the shared Connected App (`Fairway_Kiosk_App`)'s callback URL list. Retrieved the live metadata (don't hand-edit Connected Apps — Setup UI changes don't stay in sync with the repo), added `https://bay.fairwaygolfclub.co/`, `https://fairway-bay.pages.dev/`, and `http://localhost:5181/` (bay's dev port, matching the existing kiosk entries), deployed. Confirmed live via a fresh retrieve.
- **Jim Richard's live check-in verified end-to-end in Salesforce:** `ServiceAppointment` (Dispatched, `ServiceTerritory` correctly populated, correct 1-hour window), `AssignedResource` → Bay Number One, `Order` (Draft, Standard Pricebook, $45 — correct since Jim has no `Membership__c` record) + `OrderItem`. No double-booking. `ActualStartTime`/`ActualEndTime` still null (known pending item, unrelated). Field history isn't enabled on `ServiceAppointment.Status`, so the momentary `Checked In` write couldn't be directly confirmed from history, but the end state is correct.
- **Real bug found & fixed: `SessionAggregateHandler` had never successfully run.** `GolfSessionTrigger` fires `SessionAggregateHandler.computeAggregates()` when a `Golf_Session__c` closes, updating session-level averages (`Avg_Ball_Speed__c`, `Avg_Carry_Distance__c`, `Best_Carry__c`, `Session_Duration_Minutes__c` on `Golf_Session__c`) and lifetime golfer stats (`Lifetime_Sessions__c` on `Golfer_Profile__c`). All of these fields were **missing from `Fairway_Admin`'s field-level security** — the permission set was never updated when these aggregate fields were added to the objects, so every write has been silently failing with `CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY` since this was first deployed (same "profile alone doesn't grant FLS, permission set must" pattern documented elsewhere in this org). Added FLS grants for all 6 fields to `Fairway_Admin`, deployed, confirmed via `SessionAggregateHandlerTest` (0/4 → 4/4 passing). **Practically low-impact today** since nothing yet sets `Golf_Session__c.Status__c = 'Completed'` in the live kiosk flow (that's owned by the not-yet-built vendor/session-data pipeline) — but would have silently broken the moment that pipeline existed, so worth having caught now.
- **New: `Lifetime_Shots__c` and `Last_Session_Date__c` wired up.** Both fields existed on `Golfer_Profile__c` but were dead — never written by `SessionAggregateHandler`. Added: `Lifetime_Shots__c` = total shots across every session a golfer has ever participated in (any slot, not just primary booker); `Last_Session_Date__c` = most recent session end date across the same scope. Deployed + covered by an extended `testGolferProfileLifetimeSessionsUpdated` assertion.
- **New: `fairway-bay` shows a per-golfer "last session" recap on check-in.** Requested by Russell using a competitor app's Session Summary screen as a *content* reference (date, total shots, per-club shots-hit + avg-carry) — explicitly not a design reference; implementation uses the existing gold/dark bay-screen visual system. Design decision made with Russell: the recap follows **the specific golfer who checked in** (their own history, any bay), not the bay itself — the pre-existing `IdleScreen` recap (last completed session *on this bay*, regardless of who) stays as-is and unchanged, this is additive.
  - `App.tsx`: new `loadPlayerRecap(profileId, displayName)` — finds the golfer's own most recent `Status__c = 'Completed'` `Golf_Session__c` (via a semi-join on `Session_Participant__c.Golfer_Profile__c`, since `Golf_Session__c` has no direct golfer lookup), aggregates their clubs/best-carry from that session's `Golf_Shot__c` records. Attached to `PlayerSession.lastSessionRecap`, populated inside `buildPlayerStats` whenever a participant has a `profileId` (skipped for the guest/no-profile fallback path).
  - Club-average aggregation logic was duplicated three ways (live stats, bay recap, new player recap) — factored into shared `aggregateClubAverages()` / `bestCarryOf()` helpers at module scope in `App.tsx`.
  - `ActiveScreen.tsx`: while `shotCount === 0` for the active player (i.e. checked in, hasn't hit a shot yet today), shows the recap panel instead of the (empty) live shot card + club table. Once they hit their first shot, it flips to the normal live view.
  - `IdleScreen.tsx`'s existing bay-based recap also now shows shots-per-club (data already existed in `ClubAverage.shotCount`, just wasn't rendered) — small content-parity fix, not a behavior change.
  - **Verified against live data, not yet visually tested in a browser:** confirmed the exact `loadPlayerRecap` SOQL returns Jim's seeded practice session (`a07ak00001Wh67sAAB`) when queried with his `Golfer_Profile__c` Id. `tsc -b` and `vite build` both pass. **Caveat: Jim's real check-in today won't show this recap** — his new `ServiceAppointment` has no `Golf_Session__c`/`Session_Participant__c` yet (that link only exists via manual seeding today, not the live kiosk flow — same "mock data only" limitation as the rest of Golfer360). Needs a real browser check once a session has that link, or a manually seeded "today" session to confirm the panel renders and clears correctly on first shot.
- **Housekeeping:** installed 90 Salesforce-focused skills from `forcedotcom/afv-library` via `npx skills add` (SOQL query, metadata deploy/retrieve, permission-set/validation-rule/sharing-rule generation, Agentforce tracing, etc.) — landed in `.agents/skills/` + `skills-lock.json`, not yet committed. Not reviewed in detail; the installer's own output warns "review skills before use, they run with full agent permissions."
- Noted but untouched: `fairway-bay/dist/` is git-tracked (unlike `fairway-kiosk/dist/`, which is gitignored) — local `npm run build` runs during this session produced diff noise there, reverted before anything was committed. Worth adding `fairway-bay/dist/` to `.gitignore` at some point for consistency, since Cloudflare Pages builds its own `dist/` independently and doesn't read the committed one.

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

**Status:** Deployed and live at `bay.fairwaygolfclub.co` as of 2026-07-10 — see "Session Update — 2026-07-10 (`fairway-bay` goes live + per-golfer recap)" above.

**Screens:**
- `login` — SF OAuth implicit flow (same connected app as kiosk)
- `bay-select` — picks Bay 1 or Bay 2 (persists until changed)
- `idle` — "READY" screen + **bay-based** last session recap (whoever last used this physical bay — player name, date, shots-per-club + avg carry, best carry)
- `active` — live session stats, polls SF every 20s:
  - **While the checked-in golfer has 0 shots today:** shows their own **personal** last-session recap instead (any bay, requires their `Golfer_Profile__c` to be linked) — see "per-golfer recap" in the Session Update above for how this differs from the idle screen's bay-based one
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

**Deploy steps (done, kept here for reference):**
1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git
2. Repo: `RussEvans222/FairwayGolfClub`, root directory: `fairway-bay`
3. Build command: `npm run build`, output directory: `dist` — **Deploy command must be left blank**; it was mistakenly set to a Workers command (`npx wrangler versions upload`) initially, which fails every build with "Missing entry-point to Worker script"
4. Add the three env vars above (Production + Preview)
5. Add custom domain: `bay.fairwaygolfclub.co`
6. Connected App OAuth callback URLs — done via `sf` CLI, not Setup UI (see Session Update above)

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

- `QrCheckInScreen.tsx` (**retired 2026-07-12** — logic moved into `hooks/useQrScanner.ts`, embedded on `CheckInScreen` instead of a standalone screen; see "Session Update — 2026-07-12") — uses the `qr-scanner` npm package (camera access via `getUserMedia`, decodes in a WebWorker, no manual worker-path config needed with Vite) to scan a code and read a **Contact Id**
- Entry point (**as of 2026-07-12**): always-on camera on `CheckInScreen`, the screen shown immediately after tapping Welcome — no longer a "Scan QR" button on `ScheduledSessionsScreen` (that button was dropped, see 2026-07-12 entry)
- `handleQrCheckIn(contactId)` in `App.tsx` — two paths:
  1. **Has a not-yet-checked-in reservation today** → same `Scheduled → Dispatched` transition PIN entry uses, just without a PIN
  2. **No reservation today** → looks up the Contact by Id, resolves their Person Account (`resolvePersonAccount`, same helper the regular member walk-in uses), sets `pendingMember`, and jumps straight to the `guest-payment` screen — fast-tracked past the email search and PIN screen since scanning the badge already proves identity. Payment/bay-assignment then proceeds exactly like any other walk-in (`handleMemberWalkInComplete`).
- **Where the code is generated (no email/SMS pipeline yet — on-screen only):**
  - `BayDirectionScreen.tsx` — shown **immediately at check-in**, inline (not behind a tap), for anyone with a `contactId` — this is the primary moment: a brand-new guest sees their permanent code the instant they're checked in, before they've even played, not after an entire session
  - `QrCodeModal.tsx` — a ▦ icon next to each not-yet-checked-in player on `ScheduledSessionsScreen` shows their permanent code (encodes `p.contactId`, guarded — hidden if null); useful for staff to pull up anyone's code on demand
  - `SessionSummaryScreen.tsx` — "Save your check-in code" section at the end of every session too, as a second reminder — harmless redundancy since it's the same permanent code every time
  - Both `QrCodeModal` and the inline display on `BayDirectionScreen` share a `useQrCode(value)` hook (`src/hooks/useQrCode.ts`) instead of duplicating the async QR-generation boilerplate
- **QR payload:** bare 18-char Contact Id (or a URL ending in `/{id}` — `QrCheckInScreen` splits on `/` and takes the last segment, so a future check-in URL scheme doesn't require changing this)
- **Now writes the `Checked In` status** — see "Checked In status ladder — BUILT 2026-07-10" below.
- **Not yet tested against the live org** — no Salesforce or Cloudflare network access from this environment. `tsc -b` and `vite build` both pass; the `qr-scanner-worker` chunk bundles correctly. Needs an actual camera + a real contact to verify end to end, both the has-reservation and fast-track-walk-in paths.

**Checked In status ladder — BUILT 2026-07-10 (kiosk code), picklist value CONFIRMED in org 2026-07-10, kiosk build still NOT YET TESTED against the live org**

Russell: *"The status on the session needs to be set to checked in automatically once they check in."* Every check-in path in the kiosk now writes `Status: 'Checked In'` before `'Dispatched'`, instead of skipping straight to `Dispatched` as before.

- New `markCheckedIn(appointmentId)` helper in `App.tsx` — two sequential `patch()` calls, `'Checked In'` then `'Dispatched'`. Used by both PIN-entry check-in paths (with and without PIN setup) and the QR-reservation-match path in `handleQrCheckIn`.
- `createWalkInAppointment` now **creates** the `ServiceAppointment` with `Status: 'Checked In'` directly, then patches to `'Dispatched'` once the `AssignedResource` (bay) is created — covers both plain walk-ins and the QR fast-track-as-walk-in path, since both call this same function.
- All four check-in paths resolve the bay in the same action today, so the gap between the two writes is milliseconds — this is about leaving a real `Checked In` entry in the record's history, not adding a UX step. Local React state (`selectedSession.status`, etc.) is only ever set to the final `'Dispatched'` value, matching what settles in Salesforce.
- **Deliberately did not touch** any of the `Status IN ('Dispatched', 'In Progress')` occupancy filters elsewhere in the codebase (fairway-bay's `pollBay`, `FairwaySessionConsoleController.getActiveSessions`, `FairwaySessionAutoEnd`, the kiosk's own wait-time calculations) — since `Checked In` is only ever held for the instant between the two patches, no session should ever be observed sitting in that state by a poll, so those filters don't need `'Checked In'` added. If a partial-failure edge case ever leaves a session stuck on `Checked In` (e.g. the second patch throws), it would currently look "available" to those filters — not yet a known issue, just worth knowing if a bay ever seems to double-book.

**Hard prerequisite — RESOLVED 2026-07-10.** `Checked In` must exist as an active value on `ServiceAppointment.Status` in the org before deploying this kiosk build (it's a restricted picklist — an unrecognized value fails with `INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST`, breaking every check-in path at once). Russell confirmed via screenshot of the Status field dropdown on a live Bay Session record: full value set is `None / Scheduled / Dispatched / In Progress / Cannot Complete / Completed / Canceled / Checked In` — `Checked In` is present. Not yet confirmed which `statusCategory` it's mapped to (should be `CheckedIn`) — worth a quick check in Object Manager → Service Appointment → Fields & Relationships → Status if the kiosk test below behaves oddly, but the picklist-write blocker itself is cleared.

**Still needed: live functional test**, not just picklist existence — test one check-in of each type (PIN with existing PIN, PIN setup flow, QR-matches-reservation, walk-in, QR-fast-track-as-walk-in) and confirm the appointment ends up `Dispatched` with no error toast on the kiosk, and that a `Checked In` entry briefly appears in field history.

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

**Custom objects:** `Golf_Session__c`, `Golfer_Profile__c`, and the rest of the Golfer360 model — **deployed 2026-07-10** (139 components, 0 errors), confirmed queryable. See "Session Update — 2026-07-10" at the top of this file.

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

### `PaymentLink` checkout error — OPEN, blocks member walk-in check-in (found 2026-07-10)

**Symptom:** Checking in as a member and paying at the kiosk fails after "Payment confirmed" with:
```
[ServiceAppointment] INVALID_TYPE: SELECT Id FROM PaymentLink WHERE ServiceAppointmentId
sObject type 'PaymentLink' is not supported.
```

**Confirmed root cause is NOT kiosk code, NOT any of our Apex/metadata:**
- Reproduces on a **bare `insert ServiceAppointment` via raw anonymous Apex**, run as the admin user, zero kiosk/custom code involved.
- Grep across the entire repo (triggers, flows, workflow rules, validation rules, duplicate/matching rules) — nothing references `PaymentLink`. It isn't ours.
- `PaymentLink` doesn't exist as an entity at all in this org's schema (`EntityDefinition` query: 0 rows) — but ~69 *other* Payment-related standard objects do (`Payment`, `PaymentGateway`, `PaymentRequest`, `PaymentMethod`, etc.), confirming Salesforce Payments is provisioned org-wide, just missing/mismatched on this specific object.
- **Not tied to the calling user's permissions** — tested both ways: the admin user (`storm.bd727290084d27`) has the "Salesforce Payments Internal" PSL + "Payments Administrator" permission set assigned and hits the error; the kiosk's own service user (`kiosk@fairwaygolfclub.co`) has **neither** and also hits the error. It's an org-wide platform behavior, not permission-gated.
- Checked (all clean, none reference Payments/PaymentLink): `AppointmentSchedulingPolicy` metadata (no payment field), `WorkType`/`ServiceAppointment`/`ServiceTerritory` field describes, all Flow/WorkflowRule/ValidationRule/DuplicateRule/MatchingRule metadata in the org.
- Russell confirmed in Setup: **Salesforce Payments can't be disabled once activated** (matches Salesforce's documented behavior — tied to financial audit trail retention, not a simple toggle).

**Leading theory:** Salesforce Scheduler has a relatively new "Collect Payments for Appointments" integration that, once the org has Salesforce Payments provisioned at all, silently checks for a `PaymentLink` on every `ServiceAppointment` insert — and this org's `PaymentLink` object specifically isn't fully provisioned, causing `INVALID_TYPE` instead of a clean empty result.

**Next things to try (unresolved as of this session):**
- Setup → Quick Find → **"Scheduler"** (not "Payments") → look for a **Salesforce Scheduler Settings** page with a payment-collection toggle scoped to Scheduler specifically, separate from the org-wide (non-disableable) Payments feature.
- If nothing there: this may need a Salesforce Support case, since it reproduces on a bare insert with zero custom code — looks like a genuine provisioning mismatch in this org/edition.
- Unexplored: whether *completing* Payments setup (e.g. configuring a test/sandbox Payment Gateway) provisions the missing `PaymentLink` object and makes the query resolve (return 0 rows) instead of erroring — vs. actually disabling the Scheduler integration. Worth trying if the Scheduler-specific toggle doesn't exist.

**Current test members:**
| Member | Email | Contact ID | Person Account ID |
|---|---|---|---|
| Russell Evans | `russellevansdemo@gmail.com` | `003ak00001h3fqAAAQ` | `001ak00002yxWptAAE` |
| Jim Richard | `russ@russevans.me` | `003ak00001hl8IgAAI` | `001ak00002ztBoHAAU` |

---

## Auto-end sessions + smart bay extend/reassign — BUILT 2026-07-10, Apex deployed + scheduled same day (fairway-bay still not deployed to Cloudflare)

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

**Deployed and verified 2026-07-10:**
- `end-stuck-sessions.apex` ran — SA-0005/SA-0006 turned out to already be soft-deleted (not by this session; see "Session Update" at top), so nothing to clear, but the script itself ran cleanly and correctly reported "nothing overdue."
- `FairwaySessionAutoEndTest` deploys cleanly — required fixing two real Apex bugs first (`@testSetup` + class-level `SeeAllData=true` isn't allowed together; `Description` field isn't SOQL-filterable). See "Session Update" at top for details.
- Scheduled job is live — 12 jobs (`Fairway Session Auto-End :00` through `:55`), one per 5-minute mark, since Apex's cron parser doesn't support `/` or comma-list syntax (only a single literal integer). Not yet observed firing/closing a real overdue appointment.

**Still not tested (needs real usage, not just deploy verification):**
- A fresh kiosk walk-in creates a `ServiceAppointment` with `ServiceTerritoryId` populated (not blank) — check the record directly in Setup after a test walk-in
- Scheduled job actually closes a deliberately-overdue test appointment when it fires
- Bay-reassignment path: book Bay 1 1:00–2:00, Bay 2 free at 1:45, put an active session on Bay 1 ending 1:30, extend it 30 min at the kiosk/console — confirm the 1:00pm... er, the 2:00pm Bay 1 booking gets moved to Bay 2, not cancelled or double-booked
- Cap path: same setup but with Bay 2 *also* booked during that window — confirm the extension is capped instead of silently overwriting the next booking
- `FairwaySessionExtendApi` REST endpoint reachable with a Fairway_Staff user's OAuth token (once `fairway-bay` is actually deployed)

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
   - See `BOOKING_CHECKIN_PROCESS.md` for how this relates to the fuller intended booking/check-in design (party trickle-in, join requests)

3. **Membership upsell price**
   - `SessionSummaryScreen` upsell card says `"$X/month"` — fill in real price once decided

4. **QR code check-in — BUILT 2026-07-10 (identity-based), needs live testing**
   - Permanent per-person code (Contact Id), not per-booking — see "QR check-in — reworked" above for the full design
   - As of 2026-07-12, the scanner lives on `CheckInScreen` (embedded, always-on camera) via the extracted `useQrScanner` hook — the standalone `QrCheckInScreen` it used to live on was retired, see "Session Update — 2026-07-12" below. Scanning behavior itself (`qr-scanner` package, Contact-Id-from-URL parsing) is unchanged. `QrCodeModal` still generates a real code per person (`qrcode` package) — shown on `ScheduledSessionsScreen` (▦ icon per player) and automatically at the end of every session on `SessionSummaryScreen`
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

7. **Guest "join a session" flow (kiosk) — BUILT 2026-07-12, as the original *silent-join* design below, NOT `BOOKING_CHECKIN_PROCESS.md` Case 2's approval-gated version**
   - Russell explicitly directed building the silent-join version this pass — no approve/deny prompt on `fairway-bay`, that app is untouched. Treat `BOOKING_CHECKIN_PROCESS.md` Case 2 as future work if an approval gate is wanted later, not as a description of what's live today.
   - Kiosk: new `JoinPartyScreen` (reached via the "Join a Party" tile on the new `CheckInScreen`) lists `Golf_Session__c` rows with `Status__c = 'In Progress'`; picking one reuses the existing `member-walkin`/`guest-registration` → `guest-payment` chain for sign-in-or-create-account, then calls `FairwaySessionJoinApi` (new Apex REST endpoint, mirrors `FairwaySessionExtendApi`'s pattern) → `FairwaySessionConsoleController.joinSession()`, which locks the `Golf_Session__c` row (`FOR UPDATE`), picks the next free `Simulator_Player_Slot__c` (1–4), and inserts a real `Session_Participant__c`. `fairway-bay` needed **zero code changes** — its poll loop already queried `Session_Participant__c` per session and is fully multi-participant-aware; the new participant just shows up on its next 20s poll.
   - Each joiner gets **their own individual Order/OrderItem** (no `Service_Appointment__c` link, since there's no new booking) — Russell corrected an earlier draft of this plan that had a "pay now" kiosk gate; payment is recorded as owed, not collected, at check-in. Settled at a not-yet-designed bay checkout step ("more ideas to come" — Russell's words).
   - Verified end-to-end against the live org (not just Execute Anonymous): joined a real in-progress session (`Bay Number One`) as a real member through the full browser flow, confirmed the `Session_Participant__c` (slot 3) and individual Order/OrderItem were created correctly, then cleaned up the test records. Also verified the Apex layer's edge cases directly: duplicate-join rejection, 4-player-full rejection, stale/completed-session rejection.
   - See "Session Update — 2026-07-12" below for the full session's changes (also retired `QrCheckInScreen`/`PlayerTypeScreen` and reworked the check-in funnel).

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

9. ~~Deploy `fairway-bay` to Cloudflare Pages~~ — **done 2026-07-10**, see "Session Update — 2026-07-10 (`fairway-bay` goes live + per-golfer recap)" at top. Deploy command cleared, OAuth callback URLs added via `sf` CLI, site live at `bay.fairwaygolfclub.co`.

10. **`kiosk.fairwaygolfclub.co` custom domain**
    - DNS CNAME is set but Cloudflare Pages custom domain activation needs confirming in the Cloudflare dashboard

11. ~~Deploy Golfer360 data model to org~~ — **done 2026-07-10**, see "Session Update" at top

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
