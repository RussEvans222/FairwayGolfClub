# Fairway Golf Club — Booking & Check-In Process (Intended Design)

**Status: this is a process/requirements spec, dictated by Russell on 2026-07-10 — not an implementation plan.** Nothing described below is built unless a line explicitly says so. Where the description implies something that doesn't exist in the codebase yet, or conflicts with a real technical constraint, that's called out inline and again in the "Open Questions / Gaps" section at the bottom. Treat this the way `SCHEDULER_RESEARCH.md` is treated — the design-of-record to build against, not a changelog.

There are three ways a golfer ends up at a bay. All three converge on the same underlying Salesforce Scheduler objects (`ServiceAppointment`, `ServiceResource`, `AssignedResource` — see `Data Model Key` in `SESSION_SYNC.md`) and the same kiosk/bay-screen hardware; they differ in how the booking gets created and how many people are expected to show up.

---

## Case 1: Pre-arranged scheduled visit (Experience Cloud self-booking)

A member books ahead of time through the Experience Cloud portal.

1. **Booking.** Done through the Experience Cloud site's booking page — today this is the `Fairway Bay Booking` Flow (cloned from Salesforce's "Inbound New Appointment" template; see `SESSION_SYNC.md` → "Manual Salesforce steps" #6/#7). It lives only in the org (Setup → Flows), not in this repo's metadata — any change to the booking step itself happens in Setup, not here, unless someone retrieves it into `force-app/`.
2. **Host + party size.** The member setting up the session becomes the **host**. They specify how many additional players will join them. **Proposed max: 6 per bay** — not yet confirmed technically feasible, see "Open Questions" below (the 4-slot `Session_Participant__c.Simulator_Player_Slot__c` ceiling).
3. **Scheduled buffer.** Every scheduled session should carry a **30-minute buffer** to allow for spillover, protecting the booking from being bumped by whatever's booked next on that bay. **This does not exist today** — there's no buffer/padding field or logic anywhere in the scheduling model. It's a different mechanism from the already-built *reactive* smart-extend/reassign feature (`FairwaySessionConsoleController.extendSessionSmart`), which moves a *later* booking to another bay only after a golfer asks to extend mid-session. A buffer would instead be baked into the booking itself upfront, so the next slot is never scheduled back-to-back with zero gap in the first place.
4. **Night-before confirmation.** The night before the session, all party members are texted to confirm they're set for the tee time. **No SMS/texting integration exists anywhere in this codebase** (confirmed via repo-wide grep — zero hits for Twilio, SMS, or "text message" in `fairway-kiosk`, `fairway-bay`, `fairway-sf`, or `fairway-website`). Vendor undecided.
5. **Hour-before code delivery.** An hour before the session, anyone who doesn't already have their QR code gets it sent to them. The QR mechanism itself is real and already built — `fairway-kiosk/src/screens/QrCheckInScreen.tsx` (scan) and `fairway-kiosk/src/hooks/useQrCode.ts` (generate) — but it encodes a **permanent per-person Contact Id**, generated on-demand at the kiosk, not something proactively pushed out an hour ahead. Delivering it via text an hour before requires the same SMS integration as step 4, plus a scheduled job to trigger the send.
6. **Party confirms via text.** Same SMS dependency as above.
7. **Kiosk check-in.** The party arrives, scans their **member QR code** (the existing permanent-identity QR — no PIN needed, matching the QR-matches-reservation path already built in `handleQrCheckIn` in `fairway-kiosk/src/App.tsx`).
8. **"Is everyone here?" prompt.** The kiosk should ask whether the whole party is checking in together. **Not built today** — the existing QR flow checks a single scanned person straight into `bay-direction`; there's no group-aware prompt.
   - If yes: walk through sign-in for each member of the party in turn. Anyone without a membership creates an account at this point (existing `guest-registration` screen flow, reused).
   - **Offline guest option:** a party member who wants to stay fully anonymous (no account) can still play, but payment is still collected — **at the Standard walk-in rate ($45)**, per Russell's confirmation this session. No new pricing work needed here; the Standard Pricebook + "Bay Session" `PricebookEntry` are already seeded (`fairway-sf/force-app/main/default/scripts/seed-payment-products.apex`).
9. **Partial check-in / trickle-in.** If the host checks in but not everyone else has arrived yet:
   - The kiosk shows the list of active sessions.
   - When the next party member walks in, they press on the session to join it — this triggers the same per-user sign-in-or-create-account flow as step 8, adding them as a new tab/participant on the bay screen.
   - This repeats until the party's confirmed player count is reached, at which point the session becomes **unjoinable** — nobody else can tap in.
   - **Gate mechanism:** joining should require a **session/party code**, not open silent joining — distinct from any individual's permanent identity QR. **This does not exist in the codebase today.** Russell's reasoning: the code only needs to reach people who are **already members**, since we have their contact info to text it to them (same SMS dependency as steps 4–6). **Explicitly called out as an unsolved edge case, not an oversight:** a non-member guest who's part of the party but arrives separately (not physically walking in with an already-checked-in member) has no way to receive the code ahead of time — there's no contact info to text it to. The spec as dictated doesn't resolve how that person gets in; presumably they either arrive together with a member who lets them in, or go through the same account-creation-at-the-kiosk path a first-time non-member would anyway (blurring into the "offline guest" case above). Flagged here rather than silently assumed away. Two paths worth weighing before building the code mechanism itself:
     - Hand-roll a new field (e.g. a join code on `ServiceAppointment` or a new object) — this is the direction already chosen for where party-size data itself should live (see below).
     - Or use Salesforce Scheduler's **native Group Appointments feature**, which already has a real attendee-limit/capacity concept (hard-capped at 50 attendees, configurable via `WorkType` or a "Shift Work Topic Record," with a defined precedence hierarchy when both specify a limit) plus native enrollment via a shareable URL/email. This was already flagged as an unimplemented native feature in `SCHEDULER_RESEARCH.md`, just not previously connected to this specific need. **Worth a spike before committing to a fully custom build** — not decided either way yet. (Sources: [Considerations for Group Service Appointments](https://help.salesforce.com/s/articleView?id=platform.ls_considerations_for_group_service_appointments.htm&language=en_US&type=5), [Set Up Group Scheduling](https://help.salesforce.com/s/articleView?id=ind.hc_admin_appointment_management_group_scheduling_setup.htm&language=en_US&type=5).)
   - **Where party size / join code should live:** Russell decided this belongs on `ServiceAppointment` (or a new object), **not** `Bay_Reservation__c` — even though `Bay_Reservation__c` already has `Number_of_Players__c` (Number, 2,0) and `Access_Code__c` (Text, 20) sitting unused for exactly this purpose. `Bay_Reservation__c` is disconnected from the live booking/check-in flow entirely (which runs on `ServiceAppointment`), so resurrecting it would mean wiring up a second, currently-dormant object rather than extending the one already in use. Leave `Bay_Reservation__c` dormant; new field(s) on `ServiceAppointment` (or a new join object) is a follow-up design task, not specified further here.

---

## Case 2: Single walk-in with live join-by-request

A golfer walks in alone, gets a bay (today's built walk-in flow — `guest-registration`/`member-walkin` → `guest-payment` → bay assignment), then calls a friend to come join.

1. The friend arrives, walks up to the kiosk, and presses on the active session (shown in the day's active-sessions list).
2. They **request to join** — this is different from Case 1's trickle-in, because this person was never part of a pre-planned party and isn't expected by name.
3. The bay screen (`fairway-bay`) pops a notification: *"[name] is attempting to join in on the fun"* with **Approve** / **Deny** buttons, shown to whoever's already playing.
4. On approve, the requester goes through the same sign-in-or-create-account flow and gets added as a new participant tab.

**This supersedes the existing Pending Task #7 in `SESSION_SYNC.md`** ("Guest 'join a session' flow") — that task's original design was a *silent* join (guest picks an active bay, gets added, no approval step). Case 2 replaces that with an **approval-gated** version. Anywhere Task #7 is referenced going forward, treat this description as the current design.

**New capability needed:** a live approve/deny prompt requires near-real-time delivery to the bay screen. `fairway-bay` currently only polls Salesforce every 20 seconds (`POLL_INTERVAL_MS` in `fairway-bay/src/App.tsx`) — adequate for stat updates, too slow to feel responsive for someone standing at the kiosk waiting on an answer. `SCHEDULER_RESEARCH.md` already recommended Salesforce's `AppointmentSchedulingEvent` platform event as a push-based alternative to polling for a different reason (real-time stat updates) — the same mechanism is the natural fit here too. Not decided; flagged as the implementation option to evaluate.

---

## Case 3: Phone-in / staff-booked reservation

Someone calls the club (or a staff member books on a member's behalf) instead of self-booking through the portal.

- Same underlying booking mechanics as Case 1 (`ServiceAppointment` via Salesforce Scheduler) and the same eventual kiosk QR-check-in / partial-check-in flow — but **no self-service portal step**, and (implicitly) **no night-before/hour-before SMS confirmation loop**, since staff is coordinating directly with the customer on the phone at booking time.
- **Open question, not yet resolved:** does this golfer get a permanent QR code generated proactively at booking time (e.g. emailed by staff) so they can show it on arrival, or do they go through the same "generate on first kiosk visit" path as today's walk-in flow? Case 1 assumes the golfer already has portal/kiosk history to draw a QR from; a phone-in booking might be this person's very first contact with the system.

---

## Open Questions / Gaps

Consolidated from all three cases above, so this is scannable without re-reading everything:

| Gap | Detail |
|---|---|
| **Party size ceiling** | `Session_Participant__c.Simulator_Player_Slot__c` is explicitly documented as a 1–4 slot join-key tied to launch-monitor software capability. Russell's proposed max party size is **6 per bay**. Unconfirmed whether the sim software actually supports 6 concurrent tracked players, whether only 4 of the 6 can be actively shot-tracked at once, or whether the number needs to come down. **Needs resolution before Case 1's party-size cap can be implemented.** |
| **No SMS/texting integration** | Zero SMS/Twilio code anywhere in the repo. Needed for: night-before confirmation, hour-before QR delivery, "confirm via text." Vendor undecided. |
| **No session/party join-code mechanism** | Needed for Case 1's trickle-in gating. Native Salesforce Scheduler Group Appointments (attendee limit + URL/email enrollment) is a real alternative to a hand-rolled code — worth a spike, not decided. See Case 1 above. |
| **Non-member party guest arriving separately** | The session code can only be texted to people who are already members (we have no contact info for anyone else). Unresolved: how does a non-member guest who's part of a Case 1 party, but arrives on their own rather than physically with a member, actually get in. See Case 1 above. |
| **No real-time approve/deny UI pattern** | `fairway-bay` is poll-only today (20s interval). Needed for Case 2's live join-request notification. `AppointmentSchedulingEvent` platform event is the flagged option. |
| **`Bay_Reservation__c` vs. `ServiceAppointment`** | `Bay_Reservation__c` already has `Number_of_Players__c` and `Access_Code__c` sitting completely unused — it's not wired into the live booking flow at all. Decision made: build new field(s) on `ServiceAppointment` (or a new object) instead of resurrecting `Bay_Reservation__c`. |
| **No buffer/padding-time concept** | Nothing in the scheduling model pads a booking to prevent back-to-back zero-gap scheduling. Distinct from the already-built reactive smart-extend/reassign (`FairwaySessionConsoleController.extendSessionSmart`), which only kicks in when a golfer asks to extend mid-session. |
| **Guest pricing** | Already resolved — the offline/unreachable guest in Case 1 pays the existing Standard walk-in rate ($45), already seeded. No new pricing work needed. |
| **Booking flow has no source control** | The Experience Cloud "Fairway Bay Booking" Flow lives only in the org (cloned via Setup UI), not in this repo's metadata. Any future change to Case 1/3's booking step happens in Setup unless someone retrieves it into `force-app/`. |
| **Case 3 QR delivery timing** | Unresolved — see Case 3 above. |

---

*This captures Cases 1–3 as dictated by Russell on 2026-07-10. Revisit and extend this file if more cases come up.*
