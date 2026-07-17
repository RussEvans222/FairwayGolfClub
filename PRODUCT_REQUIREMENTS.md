> **Private / internal document.** Names the target venue explicitly. See `CLAUDE.md` → "What NOT to Do" for the public-site rule (does not apply here).

# Fairway Golf Club — Product Requirements

What we're actually building: the physical space and the phased tech experience layered on top of it. Complements `PROJECT_BRIEF.md` (why/business case) and `OPERATIONAL_PLAN.md` (how it gets built and paid for). The Salesforce data model these phases write to is documented in `CLAUDE.md` → "Golfer360 Data Model."

---

## Site Concept — 2,000 sq ft "Proof-of-Concept" Prototype

A lean, strategic layout, not the earlier larger "Suite" concept (see note below) — sized to prove the model at minimum viable footprint before the 4-bay expansion.

| Zone | Contents |
|---|---|
| Arrival Lobby | Warm walk-in lobby — check-in, first impression, waiting area |
| Bag Storage | Member/guest club storage |
| Bay 1 | Premium overhead simulator bay |
| Bay 2 | Premium overhead simulator bay |
| Men's Restroom | Vintage country-club locker-room aesthetic — wood panels, brass fixtures, luxury amenities |
| Ladies' Restroom | Same aesthetic, mirrored |

**Note on prior space-plan work:** the private `fairway-website/space-plan/` page (built earlier) described a larger "Suite" concept — 2 bays + a shared social lounge + separate wash-and-change rooms with shower stalls, ~1,320–1,500 sq ft. This Product Requirements doc reflects the newer, leaner 2,000 sq ft Proof-of-Concept direction (arrival lobby + bag storage + restrooms, no shared social lounge or showers called out). **These two haven't been reconciled yet** — treat this file as the current source of truth for the site concept, and revisit/update the `space-plan` page before sharing it externally again. Tracked as an open item in `CLAUDE.md`.

**Overhead bay format:** simulators are overhead-mounted (Uneekor EYE XO2 / Trackman iO — see Golfer360 Connected Bay phase below), not floor/ceiling doppler units — relevant to ceiling height and enclosure design.

---

## The "Golfer360" Customer Journey — 4 Phases

### Phase 1 — Community Ingestion (Mobile Unit)
Deploy a mobile inflatable simulator bay at local Workhouse community events. Free 15-minute swing-check / putting games draw people in. Users scan a QR code to play, which instantly creates their `Golfer_Profile__c` record in Salesforce — building the Golfer360 pipeline before the physical location even opens. This is also the primary pre-launch lead-gen channel (see `MARKETING_ROADMAP.md`).

### Phase 2 — Touchless Lounge Kiosk
Walk-ins and members check in via inexpensive iPad kiosks in the arrival lobby.
- Members: fast-tracked via QR code scan.
- If both bays are full: the system dynamically calculates wait time, directs the guest to get a drink (Bunnyman Brewing tap — see `MARKETING_ROADMAP.md` partnership section), and **texts them when a bay is ready.**
- This maps to `Bay_Reservation__c` / `Golf_Session__c` status transitions already in the data model (`Reservation_Status__c`, `Golf_Session__c.Status__c`).

### Phase 3 — Connected Bay Experience
Overhead launch monitors (**Uneekor EYE XO2** or **Trackman iO**) capture live shot, swing, and putting data and push it via API into the custom Salesforce backend. On check-in, the bay displays a **personalized welcome KPI** pulled from the golfer's history — e.g. *"Welcome back, Russ. Let's work on your 7-iron consistency today."*
- This is the live version of the `Golf_Shot__c` / `Session_Participant__c` attribution chain already modeled in Salesforce — this phase is where a real vendor API integration (Option A in the original architecture memo, see `CLAUDE.md` → Golfer360 Data Model) actually gets built, replacing the mock-data-only MVP.
- `Data_Tier__c` on `Golf_Shot__c` matters here: confirm whether the chosen unit (EYE XO2 vs Trackman iO) delivers Ball Only or Ball + Club data before promising club-delivery metrics in the welcome-KPI messaging.

### Phase 4 — Sloped Auto-Tee
A subtle **1.5-degree floor slope** beneath the screen rolls the ball to a central collection trough, which routes to a **quiet, under-floor motorized lift actuator** that automatically tees up the next ball. Removes the manual "walk up and place your own ball" friction entirely.
- Construction implication: this is a self-contained, freestanding structural element — see `OPERATIONAL_PLAN.md` for how this is built as a modular pod rather than altering the historic building envelope.

---

## Open Questions / Follow-Ups

- Reconcile this site concept with the existing `fairway-website/space-plan/` private page (different room program — see note above).
- Confirm EYE XO2 vs. Trackman iO data tier (Ball Only vs Ball + Club) before finalizing what the Phase 3 welcome-KPI messaging can promise.
- Kiosk check-in and dynamic wait-time texting are new functional requirements not yet reflected in the Salesforce data model or any Experience Cloud/portal plan — will need their own design pass once the physical build is closer.
