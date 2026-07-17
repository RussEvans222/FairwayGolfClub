# ADR-001: Shot Data Storage Architecture for Fairway Golf Club

**Status:** Accepted (POC Phase) — Pending production decision on intermediary layer  
**Date:** 2026-07-06  
**Author:** Data Architecture / Russell Evans  
**Applies to:** fairway-sf Salesforce org + future data infrastructure

---

## Context

Fairway Golf Club operates premium indoor simulator bays equipped with launch-monitor hardware (TrackMan / Foresight / Uneekor class). Every shot generates 15–20 telemetry fields: ball speed, carry distance, spin rate, launch angle, club path, face angle, smash factor, and more.

At the planned operating scale of 2 bays:

| Variable | Value |
|---|---|
| Shots per bay per minute | ~2 |
| Players per bay | 2 |
| Peak sessions per day | 10 |
| Shot records per day | ~1,800 |
| Shot records per year | ~657,000 |

Salesforce paid orgs charge for data storage (standard allocation is 10 GB + 20 MB per user license). At 657K records/year with ~15 fields each, Golf_Shot__c becomes the dominant storage consumer within 18 months. Beyond cost, SOQL queries, reports, and list views degrade when a single object exceeds 1–2 million rows without careful partitioning.

This ADR documents the tiered data architecture decision: what stays in Salesforce permanently, what moves to an intermediary analytics layer, and how the two are kept in sync.

---

## Decision

Adopt a **two-tier data model** separating high-frequency telemetry from low-frequency operational and profile data.

- **Tier 1 — Salesforce (permanent):** Identity, session headers, scoring summaries, AI coaching outputs, and computed aggregate stats. These are the records that drive CRM, marketing, service, and Agentforce interactions.
- **Tier 2 — Intermediary analytics layer (future production):** Raw shot-level telemetry. This layer feeds aggregate computations that are written back to Tier 1.

The intermediary layer choice (Data Cloud vs. Snowflake) is deferred to production go-live and is evaluated in the Options section below. During the POC, Golf_Shot__c remains in Salesforce but is explicitly marked as mock data.

---

## Tier 1: What Stays in Salesforce

These objects remain in Salesforce permanently regardless of which intermediary layer is chosen.

### Golfer_Profile__c
Identity record and computed rollup statistics. One record per golfer. Updated by Apex trigger or Data Cloud Calculated Insight after each session closes.

**Existing fields (retain as-is):**

| Field | Type | Notes |
|---|---|---|
| Contact__c | Lookup(Contact) | CRM identity link |
| Handicap__c | Number | Current self-reported or computed handicap |
| Skill_Segment__c | Picklist | Beginner / Intermediate / Advanced / Competitive |
| Average_Driver_Carry__c | Number | Rolling average, yards |
| Average_7_Iron_Carry__c | Number | Rolling average, yards |
| Last_Session_Date__c | Date | Updated on session close |
| Most_Consistent_Club__c | Text | From shot dispersion analysis |
| Least_Consistent_Club__c | Text | From shot dispersion analysis |
| Typical_Miss__c | Picklist | Pull / Push / Slice / Hook / Thin / Fat |
| Current_Focus__c | Text | Active coaching focus area |
| Preferred_Practice_Mode__c | Picklist | Range / Course Play / Skills Challenge |
| AI_Coaching_Enabled__c | Checkbox | Opt-in for Agentforce coaching |

**New computed fields to add:**

| Field API Name | Type | Populated By | Description |
|---|---|---|---|
| Lifetime_Sessions__c | Number | Apex trigger / DC Insight | Count of all completed Golf_Session__c records for this golfer |
| Avg_Handicap_Trend__c | Number(4,1) | Apex trigger / DC Insight | Handicap delta over last 10 sessions (negative = improving) |
| Most_Played_Course__c | Text(100) | Apex trigger / DC Insight | Course_Played__c value with highest session count |
| Avg_Session_Shots__c | Number(5,0) | Apex trigger / DC Insight | Average total shots per session, lifetime |
| Avg_Driver_Smash_Factor__c | Number(4,2) | Apex trigger / DC Insight | Rolling average smash factor on driver shots |

**Notes on existing fields Average_Driver_Carry__c and Average_7_Iron_Carry__c:** These will continue to be written from whichever compute path is active — Apex trigger in POC, Data Cloud Calculated Insight or Snowflake pipeline in production.

---

### Golf_Session__c
Session header. One record per simulator session. This is the primary reporting object for operations, utilization, and coaching.

**Existing fields (retain as-is):**

| Field | Type | Notes |
|---|---|---|
| Bay__c | Lookup(Simulator_Bay__c) | Which bay |
| Session_Start__c | DateTime | |
| Session_End__c | DateTime | |
| Session_Type__c | Picklist | Range / Course Play / Skills Challenge / Lesson |
| Course_Played__c | Text | If Session_Type = Course Play |
| Status__c | Picklist | Scheduled / In Progress / Completed / Cancelled |
| Reservation__c | Lookup(Bay_Reservation__c) | |
| Simulator_Session_Id__c | Text(50) | External ID from simulator hardware API |
| Total_Shots__c | Number | Rollup or trigger-computed total |
| Data_Processing_Status__c | Picklist | Pending / Processing / Synced / Error |

**New session-aggregate fields to add:**

These fields make Golf_Session__c self-contained for reporting even when shot-level data lives in the intermediary layer. They are populated when the session closes, either by Apex (POC) or by an outbound pipeline from Data Cloud / Snowflake (production).

| Field API Name | Type | Description |
|---|---|---|
| Avg_Ball_Speed__c | Number(5,1) | Average ball speed (mph) across all shots in session |
| Avg_Carry_Distance__c | Number(5,1) | Average carry distance (yards) across all shots |
| Avg_Club_Speed__c | Number(5,1) | Average club head speed (mph) |
| Avg_Smash_Factor__c | Number(4,2) | Average smash factor (ball speed / club speed) |
| Avg_Launch_Angle__c | Number(4,1) | Average launch angle (degrees) |
| Avg_Spin_Rate__c | Number(6,0) | Average spin rate (rpm) |
| Max_Ball_Speed__c | Number(5,1) | Peak ball speed in session |
| Max_Carry_Distance__c | Number(5,1) | Longest carry of the session |
| Driver_Shots__c | Number(4,0) | Count of driver shots in session |
| Avg_Driver_Carry__c | Number(5,1) | Session-specific driver carry average |
| Fairways_Hit__c | Number(3,0) | For Course Play sessions: fairways in regulation |
| Fairways_Attempted__c | Number(3,0) | Total fairway holes played |
| Greens_In_Regulation__c | Number(3,0) | For Course Play sessions |
| Total_Putts__c | Number(3,0) | For Course Play sessions |
| Shot_Dispersion_Score__c | Number(4,1) | Computed consistency metric (lower = tighter dispersion) |
| Session_Notes__c | LongTextArea(2000) | Staff or coach notes |

**Computation source by phase:**

| Phase | Source of aggregate fields |
|---|---|
| POC | Apex trigger on Golf_Shot__c insert batch, runs after session close |
| Production (Data Cloud) | Data Cloud Calculated Insight writes back via Connected Output |
| Production (Snowflake) | dbt aggregate job writes back via REST API or MuleSoft |

---

### Session_Participant__c
Junction between Golf_Session__c and Golfer_Profile__c (or Contact). One record per player per session.

No new fields required for the ADR scope. Existing fields capture participation. If per-player session aggregates are needed (e.g., each player's avg carry in a shared session), those can be added here in parallel with Golf_Session__c aggregate fields.

---

### Practice_Insight__c
AI coaching output records. Generated by Agentforce or a scheduled coaching pipeline. Contains qualitative analysis, drill recommendations, and trend observations derived from shot aggregates. These are low-volume (1–5 per session) and must persist in Salesforce for coach and member access.

No structural changes required for this ADR.

---

### Round_Hole_Result__c and Game_Result__c
Score summaries for round play and game modes (closest-to-pin, longest drive competitions, etc.). These are intentionally score-only records — they capture outcomes, not physics telemetry. They stay in Salesforce permanently as the official record of game results.

No structural changes required for this ADR.

---

## Tier 2: What Moves to the Intermediary Layer (Production)

### Golf_Shot__c — raw telemetry

In production, individual shot records will not be written to Salesforce. Instead, the simulator API publishes each shot as an event that is consumed by the intermediary layer.

**Fields that move to Tier 2:**

| Field | Notes |
|---|---|
| Ball_Speed__c | mph |
| Carry_Distance__c | yards |
| Total_Distance__c | yards |
| Side_Carry__c | yards, negative = left |
| Club_Speed__c | mph |
| Smash_Factor__c | computed ratio |
| Launch_Angle__c | degrees |
| Spin_Rate__c | rpm |
| Spin_Axis__c | degrees |
| Attack_Angle__c | degrees |
| Club_Path__c | degrees |
| Face_Angle__c | degrees |
| Dynamic_Loft__c | degrees |
| Apex__c | feet |
| Shot_Shape__c | Draw / Fade / Straight / Push / Pull / Hook / Slice |
| Club__c | Driver / 3W / 5W / 4i … PW / SW / LW / Putter |
| Shot_Context__c | Tee / Fairway / Rough / Bunker / Approach / Putt |
| Hole_Number__c | for Course Play sessions |
| Shot_Number__c | sequential within session |
| Is_Mulligan__c | boolean |
| Timestamp__c | datetime of shot |
| Raw_Payload_JSON__c | full simulator payload for debugging |
| Golf_Session__c (FK) | session identifier — stored as external reference in Tier 2 |
| Session_Participant__c (FK) | player identifier — stored as external reference |
| Bay__c (FK) | bay identifier |
| Game_Result__c (FK) | if shot belongs to a scored game |

**Schema in the intermediary layer:** This is a flat, wide table. No Salesforce relationship constraints. Foreign keys are the Salesforce record IDs (or Simulator_Session_Id__c as the natural join key to Golf_Session__c).

**Data ingestion path (production):**

```
Simulator Hardware (TrackMan/Foresight/Uneekor)
  -> Simulator API webhook / WebSocket
    -> Ingestion endpoint (Salesforce Platform Event OR direct API)
      -> Intermediary Layer (Data Cloud DLO or Snowflake table)
        -> Aggregate computation
          -> Write-back to Golf_Session__c aggregate fields
          -> Write-back to Golfer_Profile__c computed stats
```

---

## Option A: Salesforce Data Cloud

### Overview
Data Cloud is Salesforce's native customer data platform, operating as a separate but deeply integrated layer within the Salesforce ecosystem.

### How it works for Fairway
1. A Data Cloud Data Stream ingests shot events from the simulator API (or from a Platform Event relay).
2. Shot data lands in a Data Lake Object (DLO) — not in CRM object storage.
3. Calculated Insights run SQL-style aggregations over the DLO on a schedule or near-real-time.
4. Calculated Insight output is published to a Connected Output, which writes aggregate fields back to Golf_Session__c and Golfer_Profile__c via standard Salesforce field update.
5. Agentforce agents can query both the CRM records and the Data Cloud DLOs directly using natural language, enabling richer coaching AI with full shot history.

### Advantages
- Native Salesforce: no external middleware, no custom API maintenance
- Calculated Insights push-back to CRM objects is declarative — no Apex required in production
- Agentforce prompt templates can reference DLO data directly for AI coaching depth
- Unified identity resolution links Contact, Golfer_Profile__c, and shot events automatically
- Data governance, consent management, and segmentation built-in (relevant if marketing automation is added later)

### Disadvantages
- License cost: a meaningful Data Cloud implementation starts at approximately $50,000/year. For a 2-bay startup this is a significant line item — potentially 25–30% of the first-year technology budget.
- Overkill at early volumes: at 650K shots/year, standard database tools can handle this trivially. Data Cloud is designed for tens of millions of events.
- Calculated Insight refresh is not always real-time — near-real-time modes require additional configuration.

### When this becomes the right choice
- When Fairway reaches 5+ bays and 3M+ shot records/year
- When marketing automation (Journey Builder, Marketing Cloud) or loyalty programs are added
- When Agentforce AI coaching needs shot-level context, not just session aggregates
- When the technology budget can absorb the license cost

---

## Option B: Snowflake

### Overview
Snowflake is a cloud-native data warehouse with a consumption-based pricing model. It is vendor-agnostic and widely used in analytics-heavy businesses.

### How it works for Fairway
1. An ingestion layer (AWS Lambda, Google Cloud Function, or a simple Node.js service) receives simulator API events and writes them to a Snowflake table via the Snowflake REST API or Snowpipe.
2. dbt (data build tool) or SQL tasks compute session and profile aggregates on a scheduled basis.
3. A write-back mechanism (MuleSoft Anypoint, a custom Apex callout, or Salesforce Flow with HTTP action) pushes aggregates back to Golf_Session__c and Golfer_Profile__c in the CRM.
4. BI tooling (Tableau, Sigma, Metabase) can connect directly to Snowflake for rich analytics dashboards without touching Salesforce storage.

### Advantages
- Extremely low cost at startup volume: ~$25–50/month at 650K rows/year on Snowflake's smallest compute tier
- Excellent analytics ecosystem: native connectors for Tableau, Looker, Sigma, dbt
- No vendor lock-in to Salesforce licensing
- dbt makes the aggregation logic transparent, version-controlled, and testable

### Disadvantages
- Requires middleware engineering for the Salesforce write-back: either MuleSoft (expensive license), a custom Apex scheduled job that callouts to Snowflake, or a lightweight API bridge
- Agentforce cannot query Snowflake natively — AI coaching depth is limited to what has been written back to CRM fields
- Two systems to maintain, monitor, and secure
- Data governance is manual — no built-in Salesforce consent or identity resolution

### When this becomes the right choice
- At startup phase when license budget is constrained
- When the team has software engineering resources to build and maintain the pipeline
- When BI/analytics are a priority over Agentforce AI coaching depth
- As a stepping stone: Snowflake can be replaced by Data Cloud later without changing the Salesforce data model

---

## Comparison Summary

| Dimension | Data Cloud (Option A) | Snowflake (Option B) |
|---|---|---|
| Year 1 cost | ~$50,000+ | ~$300–600 |
| Engineering to implement | Low (declarative) | Medium (custom pipeline) |
| Agentforce AI depth | High (DLO access) | Low (aggregates only) |
| BI/analytics | Basic (Einstein Analytics) | Excellent (Tableau, etc.) |
| Write-back to Salesforce | Native / declarative | Custom middleware |
| Data governance | Built-in | Manual |
| Right scale | 5+ bays, 3M+ shots/yr | 2–4 bays, startup phase |
| Operational complexity | Low | Medium |
| Vendor lock-in | High (Salesforce) | Low |

**Recommendation:** Start with Snowflake for production go-live when Fairway has 2 bays. Revisit Data Cloud at the point of expansion to 4–5 bays, when the AI coaching product warrants the investment and Agentforce prompt templates need full shot-level context rather than session aggregates.

---

## POC Strategy

### Current state
Golf_Shot__c **remains in Salesforce** for the POC phase. All existing fields and relationships are preserved. This is intentional: the POC needs to demonstrate the full data model, shot ingestion, aggregate computation, and Agentforce coaching without requiring an intermediary layer to be provisioned.

### POC data classification
The existing `Data_Tier__c` field on Golf_Shot__c serves as the classification marker.

| Value | Meaning |
|---|---|
| `Mock` | Synthetic or manually entered data — used during POC and demos |
| `Live_CRM` | Real shot data written directly to Salesforce (POC live mode, pre-migration) |
| `Archived` | Record has been migrated to the intermediary layer; Salesforce copy is a stub |

During the POC, all Golf_Shot__c records should have `Data_Tier__c = Mock`. No production shot data should be imported at scale into the paid org.

### POC aggregate computation
The session aggregate fields on Golf_Session__c and the computed fields on Golfer_Profile__c are populated during POC by an Apex trigger on Golf_Shot__c. The trigger fires after shot insert and recalculates session-level averages. On session close (Status__c transitions to `Completed`), a second trigger path updates Golfer_Profile__c.

This Apex code is intentionally simple and is not designed for production shot volumes. It serves as a working demonstration of the data flow that Data Cloud or Snowflake will replace.

### Future migration path

**Step 1 — Provision the intermediary layer (Data Cloud or Snowflake)**
- Stand up the shot telemetry schema in the chosen layer
- Configure the simulator API webhook to point to the new ingestion endpoint

**Step 2 — Run in parallel**
- New live sessions write shots to both Salesforce (Data_Tier__c = Live_CRM) and the intermediary layer
- Validate that aggregates from the intermediary layer match Apex-computed values

**Step 3 — Cutover**
- Disable the Apex trigger aggregate path on Golf_Session__c and Golfer_Profile__c
- Enable the intermediary layer write-back as the authoritative aggregate source
- New Golf_Shot__c records are no longer written to Salesforce

**Step 4 — Archive or delete historical POC records**
- Set Data_Tier__c = Archived on all existing Golf_Shot__c records
- Run a batch delete or use Big Object archiving to reclaim storage
- Golf_Session__c and Golfer_Profile__c aggregates remain intact

**Step 5 — Remove Golf_Shot__c from active use**
- Deprecate the object from page layouts, record types, and user permissions
- Retain the object definition for emergency re-activation if needed

---

## Metadata Changes Required

### New fields on Golf_Session__c (to be deployed)

The following 16 fields need to be created and deployed to the org. API names use the `__c` suffix as custom fields.

```
Avg_Ball_Speed__c         Number(5,1)
Avg_Carry_Distance__c     Number(5,1)
Avg_Club_Speed__c         Number(5,1)
Avg_Smash_Factor__c       Number(4,2)
Avg_Launch_Angle__c       Number(4,1)
Avg_Spin_Rate__c          Number(6,0)
Max_Ball_Speed__c         Number(5,1)
Max_Carry_Distance__c     Number(5,1)
Driver_Shots__c           Number(4,0)
Avg_Driver_Carry__c       Number(5,1)
Fairways_Hit__c           Number(3,0)
Fairways_Attempted__c     Number(3,0)
Greens_In_Regulation__c   Number(3,0)
Total_Putts__c            Number(3,0)
Shot_Dispersion_Score__c  Number(4,1)
Session_Notes__c          LongTextArea(2000)
```

### New computed fields on Golfer_Profile__c (to be deployed)

```
Lifetime_Sessions__c        Number(5,0)
Avg_Handicap_Trend__c       Number(4,1)
Most_Played_Course__c       Text(100)
Avg_Session_Shots__c        Number(5,0)
Avg_Driver_Smash_Factor__c  Number(4,2)
```

### Apex artifacts (POC)

- `GolfShotTrigger.trigger` — fires on after insert of Golf_Shot__c, calls handler
- `GolfShotTriggerHandler.cls` — computes session aggregates in-transaction
- `SessionCloseAggregateService.cls` — invoked when Session Status transitions to Completed, updates Golfer_Profile__c computed fields
- `GolfShotTriggerTest.cls` — test coverage for handler

---

## Consequences

**Positive:**
- Salesforce storage remains bounded regardless of how many shots are hit. Growth in Salesforce records is driven by golfer count and session count, not shot volume.
- Golf_Session__c is self-contained for reporting — dashboards and Einstein analytics can operate entirely on session records without requiring shot-level joins.
- Golfer_Profile__c computed fields enable Agentforce coaching responses without Data Cloud at POC stage.
- The migration path is non-destructive: Golf_Shot__c is retained as an object; cutover is a matter of directing writes and disabling Apex triggers.

**Negative / risks:**
- POC Apex trigger path will not scale beyond ~5,000 shots per session without hitting governor limits. This is acceptable for POC with mock data but must not be used with real high-frequency ingestion.
- If Snowflake is chosen and MuleSoft is not available, the write-back pipeline requires custom engineering that must be staffed and maintained.
- If Golf_Shot__c mock data is not clearly segregated (Data_Tier__c = Mock), there is a risk of accidentally treating demo records as production data in reports or AI coaching outputs.

---

## References

- Golf_Shot__c object: `fairway-sf/force-app/main/default/objects/Golf_Shot__c/`
- Golf_Session__c object: `fairway-sf/force-app/main/default/objects/Golf_Session__c/`
- Golfer_Profile__c object: `fairway-sf/force-app/main/default/objects/Golfer_Profile__c/`
- Salesforce Data Cloud documentation: https://help.salesforce.com/s/articleView?id=sf.c360_a_data_cloud.htm
- Snowflake pricing calculator: https://www.snowflake.com/pricing/
- dbt Core documentation: https://docs.getdbt.com/

---

*This document is a living ADR. The production intermediary layer decision (Option A vs. Option B) should be revisited when Fairway reaches operating capacity and when the AI coaching product roadmap is finalized.*
