# Fairway Golf Club — POC Implementation Master Plan

> **Scope:** This document covers the full proof-of-concept build: Salesforce data model, membership tiers, Experience Cloud, iPad kiosk React app, and migration path to a paid commercial org. All work here is POC-only; production architecture notes are called out explicitly.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PHYSICAL LOCATIONS                           │
│                                                                     │
│  ┌──────────────────────┐     ┌──────────────────────────────────┐  │
│  │  iPad Kiosk (Bay)    │     │  iPad Kiosk (Mobile Event)       │  │
│  │  React PWA           │     │  React PWA (same app)            │  │
│  │  Fullscreen kiosk    │     │  Guest registration flow         │  │
│  └──────────┬───────────┘     └──────────────┬───────────────────┘  │
└─────────────┼────────────────────────────────┼─────────────────────┘
              │  OAuth 2.0 (Connected App)      │
              ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SALESFORCE ORG                                  │
│                                                                     │
│  ┌─────────────────┐    ┌──────────────────────────────────────┐   │
│  │  Experience      │    │  Core Data Model (always in SF)      │   │
│  │  Cloud           │    │                                      │   │
│  │  Member Portal   │    │  Contact → Golfer_Profile__c         │   │
│  │  (LWC/React)     │    │  Simulator_Bay__c                    │   │
│  │                  │    │  Bay_Reservation__c                  │   │
│  │  Fairway_Member  │    │  Golf_Session__c (summary only)      │   │
│  │  Fairway_Founding│    │  Session_Participant__c              │   │
│  │  Fairway_Guest   │    │  Practice_Insight__c (AI output)     │   │
│  └─────────────────┘    │  Round_Hole_Result__c / Game_Result__c│   │
│                          │  Membership__c                       │   │
│  ┌─────────────────┐    └──────────────────────────────────────┘   │
│  │  Fairway_Ops     │                                               │
│  │  Lightning App   │    ┌──────────────────────────────────────┐   │
│  │  (Staff/Admin)   │    │  POC Only (move out in production)   │   │
│  └─────────────────┘    │  Golf_Shot__c (mock data only)       │   │
│                          └──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
              │
              │  (Production — Phase 2)
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│               DATA LAYER (Production architecture)                  │
│                                                                     │
│  Option A: Salesforce Data Cloud                                    │
│    Simulator API → Data Cloud Data Stream → Calculated Insights     │
│    → pushes aggregates back to Golfer_Profile__c                    │
│                                                                     │
│  Option B: Snowflake + Middleware                                   │
│    Simulator API → Kafka/REST middleware → Snowflake                │
│    → dbt aggregates → Salesforce API writes back                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Model — Complete Object Inventory

### Existing Objects (deployed from repo)

| Object | Purpose | Key Fields |
|--------|---------|------------|
| `Simulator_Bay__c` | Physical bay record | Bay_Number, Location, Launch_Monitor_Type, Status, Device_Identifier |
| `Bay_Reservation__c` | Booked time block | Bay__c, Booker__c, Start/End_Time, Reservation_Status, Payment_Status, Access_Code |
| `Golf_Session__c` | Session header | Bay__c, Reservation__c, Session_Type, Status, Session_Start/End, Total_Shots, Course_Played |
| `Session_Participant__c` | Bridge: golfer ↔ session | Golf_Session__c, Golfer_Profile__c, Simulator_Player_Slot, Guest_Flag, Team__c |
| `Golfer_Profile__c` | Golfer360 identity | Contact__c, Handicap, Skill_Segment, Average carries, AI_Coaching_Enabled |
| `Golf_Shot__c` | Atomic shot (POC only) | 27 fields: ball speed, carry, spin, club data, Bay__c, Session_Participant__c |
| `Practice_Insight__c` | AI coaching output | Observation, Recommendation, Insight_Type, Severity, Confidence_Score |
| `Round_Hole_Result__c` | Score per hole (rounds) | Hole_Number, Par, Strokes, Score_To_Par, Session_Participant__c |
| `Game_Result__c` | Score per game format | Game_Type, Score, Rank, Session_Participant__c |

### New Objects to Create

#### `Membership__c`
Tracks a member's active tier, billing cycle, and status. One record per active membership per Contact.

| Field | Type | Notes |
|-------|------|-------|
| `Contact__c` | Lookup(Contact) | Required — the member |
| `Membership_Tier__c` | Picklist | Guest / Member / Founding Member / Staff |
| `Founding_Tier__c` | Picklist | Bronze / Silver / Gold / Platinum / Angel (only for Founding Members) |
| `Status__c` | Picklist | Active / Suspended / Expired / Complimentary |
| `Start_Date__c` | Date | Required |
| `Renewal_Date__c` | Date | Null for lifetime/complimentary |
| `Billing_Cycle__c` | Picklist | Monthly / Annual / Lifetime / Complimentary |
| `Monthly_Rate__c` | Currency | Actual rate charged (0 for complimentary) |
| `Complimentary_Years_Remaining__c` | Number | For investor perk tiers |
| `Notes__c` | Long Text Area | Manual notes |

### New Fields on Existing Objects

#### `Golf_Session__c` — Session Aggregate Fields
(Computed by Apex trigger after session closes; eliminates need to query Golf_Shot__c for reports)

| Field | Type | Notes |
|-------|------|-------|
| `Avg_Ball_Speed__c` | Number(4,1) | Average ball speed across all shots |
| `Avg_Carry_Distance__c` | Number(5,1) | Average carry distance |
| `Avg_Club_Speed__c` | Number(4,1) | Average club speed (if Data_Tier = Ball+Club) |
| `Best_Carry__c` | Number(5,1) | Maximum carry of the session |
| `Fairways_Hit__c` | Number(3,0) | Rounds only |
| `Total_Putts__c` | Number(3,0) | Rounds only |
| `Shots_By_Club__c` | Long Text Area | JSON: {"Driver":12,"7-Iron":18,...} |
| `Session_Duration_Minutes__c` | Number(4,0) | Computed from Start/End |

#### `Golfer_Profile__c` — Lifetime Computed Fields
(Updated by Apex trigger after each session closes)

| Field | Type | Notes |
|-------|------|-------|
| `Lifetime_Sessions__c` | Number(5,0) | Total sessions played |
| `Lifetime_Shots__c` | Number(7,0) | Total shots hit (from Golf_Shot__c count, POC) |
| `Avg_Handicap_Trend__c` | Number(4,1) | Rolling 10-session handicap average |
| `Most_Played_Course__c` | Text(80) | Mode of Course_Played__c across sessions |
| `Favorite_Club__c` | Text(40) | Most-used club by shot count |

---

## 3. Membership Tier System

### 3.1 Two Separate Tier Systems

**Investor/Fundraising Tiers** (already built — `Investor_Tier__c` on Lead):
Bronze $5K+ / Silver $15K+ / Gold $25K+ / Platinum $50K+ / Angel $350K+
These are the fundraising tiers that determine investor perks.

**Member Experience Tiers** (what we're building now — `Membership__c` object):
Guest / Member / Founding Member / Staff
These control what someone can see and do in the kiosk and portal.

**The link between them:**
An investor who reaches Silver+ gets a complimentary Founding Member membership. Tracked manually in `Membership__c.Founding_Tier__c` field.

### 3.2 Experience Cloud Permission Sets

**Strategy: One Community Profile + Three Permission Sets**

Use a single `Customer Community` or `Customer Community Plus` profile for all Experience Cloud users — this is the standard Salesforce approach. Permission sets layer on top to differentiate tiers. Avoids managing multiple profiles and the FLS complexity that comes with it.

#### `Fairway_Guest_Access`
For anonymous or event-only guests (may not even have an Experience Cloud login).

| Object | Access |
|--------|--------|
| `Golfer_Profile__c` | Read own record only |
| `Golf_Session__c` | Read own sessions only |
| `Session_Participant__c` | Read own records only |
| `Practice_Insight__c` | Read own insights only |
| `Simulator_Bay__c` | Read (bay name/number only) |
| `Bay_Reservation__c` | No access |
| `Golf_Shot__c` | No access (guests don't get shot history) |

#### `Fairway_Member_Access`
Standard paying member. Full self-service.

All `Fairway_Guest_Access` permissions plus:

| Object | Access |
|--------|--------|
| `Bay_Reservation__c` | Create/Read own reservations |
| `Golf_Shot__c` | Read own shots (own sessions) |
| `Golfer_Profile__c` | Edit own profile fields (Current_Focus, Preferred_Practice_Mode, AI_Coaching_Enabled) |
| `Practice_Insight__c` | Edit `Accepted_Dismissed__c`, `Viewed_By_Golfer__c` |
| `Membership__c` | Read own record |

#### `Fairway_Founding_Member_Access`
Investor perk tier (Silver+). Extends Member.

All `Fairway_Member_Access` permissions plus:

| Object/Field | Access |
|--------|--------|
| `Membership__c.Founding_Tier__c` | Read |
| `Membership__c.Complimentary_Years_Remaining__c` | Read |
| `Simulator_Bay__c.Status__c` | Read (so they can see bay availability) |
| Custom Founding Member badge field on `Golfer_Profile__c` | Read |

#### `Fairway_Admin` (existing, internal)
Full access to all 9 custom objects + Lead + Contact. Already built. Covers staff check-in operations, session management, bay status updates.

### 3.3 Contact → Golfer Profile → Experience Cloud User Flow

**Kiosk Registration (new person):**
1. Kiosk collects: First Name, Last Name, Email, Phone, Skill Level
2. React app POSTs to Salesforce REST API:
   - Creates `Contact` (FirstName, LastName, Email, Phone)
   - Creates `Golfer_Profile__c` (Contact__c = new Contact, Skill_Segment__c from self-reported level)
3. A 4-digit access PIN is generated and stored on `Bay_Reservation__c.Access_Code__c` or `Golfer_Profile__c` (TBD) for future kiosk logins
4. **Experience Cloud user NOT created at registration** — only created if member upgrades to a paid plan and wants portal access
5. When portal access is granted: `sf community create user` or via Setup UI → Contact → Enable Customer User

**Returning Member Check-in:**
1. Member enters email or 4-digit PIN on kiosk
2. App queries: `SELECT Id, Name, Handicap__c FROM Golfer_Profile__c WHERE Contact__r.Email = '...'`
3. Profile loads → session starts

---

## 4. Shot Data Architecture — Decision Record

### Decision: Golf_Shot__c is POC-only in Salesforce

**Context:** At 2 bays with real traffic, shot record volume reaches 650K+/year. In a paid Salesforce org (Enterprise/Unlimited), storage costs $5/MB. 650K records at ~2KB each = ~1.3GB = ~$6,500/year in storage alone, before any performance impact.

**Decision:** Keep `Golf_Shot__c` in Salesforce for POC with mock data only. In production, raw shot data routes to an external data layer.

**What stays in Salesforce forever (low volume, high value):**
- `Golfer_Profile__c` — identity + computed lifetime stats (one per golfer)
- `Golf_Session__c` — session headers + aggregate fields (one per session)
- `Session_Participant__c` — session membership (one per player per session)
- `Practice_Insight__c` — AI coaching outputs (a few per session)
- `Round_Hole_Result__c` / `Game_Result__c` — score summaries

**What moves to the data layer in production:**
- `Golf_Shot__c` raw ball-flight data
- Real-time streaming from simulator launch monitors

### Production Data Layer Options

| | Data Cloud | Snowflake |
|---|---|---|
| **Cost** | ~$50K+/yr (license) | ~$25-200/mo (usage-based) |
| **Integration** | Native SF connector, no middleware | Needs MuleSoft or custom REST middleware |
| **AI/Agentforce** | Direct — Calculated Insights feed Agentforce | Manual push back to Salesforce |
| **Analytics** | CRM Analytics (native) | Tableau, Looker, dbt |
| **When to choose** | Once Agentforce coaching is the core product | If multi-system warehouse or BI flexibility is needed |

**Recommendation for Fairway:** Start with Snowflake (low cost while volume is small, no vendor lock-in). Add Data Cloud when Agentforce AI coaching becomes the core differentiator — likely Year 2-3.

### POC → Production Migration for Shot Data
1. Export `Golf_Shot__c` records from POC org to CSV
2. Load CSV into Snowflake `golf_shots` table
3. Build dbt model to compute session aggregates
4. Write aggregates back to `Golf_Session__c` + `Golfer_Profile__c` via Salesforce Bulk API
5. Delete `Golf_Shot__c` from production org and remove from permission sets
6. Deploy middleware (Cloudflare Worker or AWS Lambda) to intercept simulator API webhooks → Snowflake

---

## 5. iPad Kiosk App Architecture

### 5.1 Overview

**Tech stack:** React 18 + Vite, TypeScript, Tailwind CSS, hosted on Cloudflare Pages
**Auth:** Salesforce Connected App, OAuth 2.0 Device Flow (kiosk stays permanently logged in with a refresh token)
**API:** Salesforce REST API (standard object endpoints — no custom Apex needed for POC)
**Form factor:** iPad 10th gen landscape, fullscreen PWA (no browser chrome), touch-first

### 5.2 UX Flows

#### Flow A — New Guest Registration (Mobile Event)
```
Welcome Screen (idle/attract loop)
    ↓ [Tap to Start]
New or Returning?
    ↓ [New Guest]
Enter Name + Email (optional for walk-ins)
    ↓
Pick Skill Level (Beginner / Casual / Intermediate / Serious / Competitive)
    ↓
How many players? (1–4)
    ↓ (if group) Add player names for slots 2-4
    ↓
[Start Session] →
    Creates: Contact (if email provided), Golfer_Profile__c, Golf_Session__c, Session_Participant__c records
    ↓
Session Active Screen (timer, bay number, session type badge)
    ↓ [End Session / Staff ends it]
Session Summary: shots hit, avg carry, AI tip (if any Practice_Insight__c), "Claim Your Profile" QR code
```

#### Flow B — Returning Member Check-in (In-Bay)
```
Welcome Screen
    ↓ [I'm a Member]
Enter Email or 4-digit PIN
    ↓
Profile Loads: Name, Handicap, Last Session stats, Current Focus
    ↓
Choose Session Type: Practice / Round / Sim Game / Lesson / League
    ↓ (if Round) Choose Course from list
    ↓ (if Game) Choose Game Format (Closest to Pin / Long Drive / Wolf / Vegas)
    ↓
Add Players? (up to 3 more — each can be member lookup or guest name)
    ↓
[Start Session]
Session Active Screen
```

#### Flow C — End-of-Session Summary
```
Session Summary Screen:
  ┌─────────────────────────────────┐
  │  Great Session, Marcus!         │
  │                                 │
  │  47 shots  ·  Bay 1  ·  54 min  │
  │                                 │
  │  Avg Carry    Best Shot         │
  │  187 yds      224 yds           │
  │                                 │
  │  🧠 Coach Tip:                  │
  │  "Your carry improved 8 yds     │
  │   from last session. Focus on   │
  │   maintaining lag through        │
  │   impact with your irons."      │
  │                                 │
  │  [Email My Summary]  [Done]     │
  └─────────────────────────────────┘
```

### 5.3 React Component Hierarchy

```
App
├── Router
│   ├── WelcomeScreen         (idle attract, tap to start)
│   ├── PlayerTypeScreen      (new / returning / staff)
│   ├── GuestRegistration     (name, email, skill level)
│   │   └── PlayerSlotSetup   (add group members)
│   ├── MemberLogin           (email or PIN entry)
│   │   └── ProfilePreview    (handicap, last session)
│   ├── SessionConfig         (type, course, game format)
│   ├── SessionActive         (timer, live bay status)
│   └── SessionSummary        (stats, AI tip, email CTA)
│
├── components/
│   ├── KeypadInput           (numeric PIN entry, touch-optimized)
│   ├── SkillPicker           (visual tile selector)
│   ├── PlayerSlot            (name + profile lookup per slot)
│   ├── StatCard              (reusable number + label tile)
│   ├── CoachTip              (Practice_Insight__c display)
│   └── GoldButton            (brand-styled CTA button)
│
└── hooks/
    ├── useSalesforce         (auth + fetch wrapper)
    ├── useSession            (current session state)
    └── useGolferProfile      (profile load + update)
```

### 5.4 Salesforce API Calls Per Screen

| Screen | API Call | Object |
|--------|----------|--------|
| Member Login | `GET /query?q=SELECT...WHERE Email=...` | Contact + Golfer_Profile__c |
| Start Session | `POST /sobjects/Golf_Session__c` | Golf_Session__c |
| Add Participants | `POST /sobjects/Session_Participant__c` (×N) | Session_Participant__c |
| End Session | `PATCH /sobjects/Golf_Session__c/{id}` | Golf_Session__c |
| Load AI Tip | `GET /query?q=SELECT...WHERE Golf_Session__c=...` | Practice_Insight__c |
| New Guest | `POST /sobjects/Contact` then `POST /sobjects/Golfer_Profile__c` | Contact, Golfer_Profile__c |

### 5.5 Auth Configuration

A Salesforce Connected App (`Fairway_Kiosk_App`) will be created with:
- OAuth scopes: `api`, `refresh_token`, `offline_access`
- Callback URL: `https://kiosk.fairwaygolfclub.co/auth/callback` (separate Cloudflare Pages deployment)
- The kiosk authenticates once (Device Flow), stores the refresh token in iPad secure storage (Keychain via WKWebView or as a PWA localStorage value — acceptable for a dedicated device)

---

## 6. Deploy Runbook

### Prerequisites
```bash
cd fairway-sf
sf --version        # should be 2.x
sf org list         # confirm FairwayGolfClub shows Connected
sf config get target-org  # confirm = FairwayGolfClub
```

### Step 1 — Deploy Existing Data Model (9 objects + app + tabs + permset)
```bash
sf project deploy start \
  --source-dir force-app/main/default/objects \
  --target-org FairwayGolfClub \
  --wait 30 --json

sf project deploy start \
  --source-dir force-app/main/default/tabs \
  --target-org FairwayGolfClub \
  --wait 30 --json

sf project deploy start \
  --source-dir force-app/main/default/applications \
  --target-org FairwayGolfClub \
  --wait 30 --json

sf project deploy start \
  --source-dir force-app/main/default/permissionsets \
  --target-org FairwayGolfClub \
  --wait 30 --json

# Assign admin permset to your user
sf org assign permset --name Fairway_Admin --target-org FairwayGolfClub
```

**Verify:** Open org → App Launcher → Fairway Ops → confirm all 9 tabs appear.

### Step 2 — Deploy Membership__c (new object)
```bash
sf project deploy start \
  --source-dir force-app/main/default/objects/Membership__c \
  --target-org FairwayGolfClub \
  --wait 30 --json
```

### Step 3 — Deploy Session Aggregate Fields + Golfer Computed Fields
```bash
sf project deploy start \
  --source-dir force-app/main/default/objects/Golf_Session__c/fields \
  --target-org FairwayGolfClub \
  --wait 30 --json

sf project deploy start \
  --source-dir force-app/main/default/objects/Golfer_Profile__c/fields \
  --target-org FairwayGolfClub \
  --wait 30 --json
```

### Step 4 — Deploy Experience Cloud Permission Sets
```bash
sf project deploy start \
  --source-dir force-app/main/default/permissionsets \
  --target-org FairwayGolfClub \
  --wait 30 --json
```

### Step 5 — Deploy Connected App (Kiosk OAuth)
```bash
sf project deploy start \
  --source-dir force-app/main/default/connectedApps \
  --target-org FairwayGolfClub \
  --wait 30 --json
```

### Step 6 — Create Seed Data (test user simulation)
```bash
# Done via sf data commands or Apex anonymous — see Section 7
sf apex run --file scripts/seed-poc-data.apex --target-org FairwayGolfClub
```

**Verify:** Query each object — should have 1 bay, 1 reservation, 1 session, 2 participants (1 member + 1 guest), 5 shots, 1 insight.

### Step 7 — Assign Experience Cloud Permission Sets to Test User
```bash
sf org assign permset --name Fairway_Member_Access --on-behalf-of testmember@fairwaygolfclub.poc --target-org FairwayGolfClub
```

---

## 7. Seed Data Plan (POC Test User)

### Test personas to create:
1. **Marcus Webb** — Founding Member (Gold tier), Handicap 12, 3 prior sessions
2. **Sarah Chen** — Standard Member, Handicap 24, 1 prior session
3. **Walk-in Guest** — No account, mobile event registration

### Seed record chain for Marcus (full flow):
```
Contact: Marcus Webb / marcus.webb@example.com
  └── Golfer_Profile__c: Handicap=12, Skill_Segment=Intermediate, AI_Coaching_Enabled=true
        └── Membership__c: Tier=Founding Member, Founding_Tier=Gold, Status=Active, Billing_Cycle=Lifetime
              └── Session_Participant__c (×3 past sessions)

Simulator_Bay__c: Bay 1 / Launch_Monitor_Type=Foresight_GCQuad / Status=Available
  └── Bay_Reservation__c: Today, 6pm-8pm, Status=Confirmed, Booker=Marcus
        └── Golf_Session__c: Status=Completed, Type=Round, Course=Pebble Beach
              └── Session_Participant__c: Marcus, Slot=1, Is_Primary_Booker=true
                    └── Round_Hole_Result__c (×9 holes)
                    └── Golf_Shot__c (×45 shots — POC mock data)
                          └── Practice_Insight__c: "Your approach shots from 150yds improved..."
```

---

## 8. Migration to Paid Commercial Org Checklist

When moving from the STORM demo org to a paid org:

### Pre-migration
- [ ] Export all metadata via `sf project retrieve start --source-dir force-app` from POC org
- [ ] Confirm all permission sets are fully documented (FLS, object access, tab visibility)
- [ ] Export seed/test data to CSV for reference
- [ ] Document Connected App consumer key/secret (will change in new org)
- [ ] Screenshot Experience Cloud network settings, guest profile config

### Salesforce Setup (new org)
- [ ] Enable Experience Cloud (Setup → Digital Experiences → Settings)
- [ ] Create Experience Cloud site (Customer Account Portal or Build Your Own)
- [ ] Deploy metadata in order: objects → tabs → app → permsets → connected app
- [ ] Assign Fairway_Admin permset to admin user
- [ ] Verify all 9 custom objects + Membership__c deployed cleanly
- [ ] Re-create Connected App for kiosk (new consumer key/secret)
- [ ] Update kiosk app `.env` with new Connected App credentials + org URL

### Experience Cloud (new org)
- [ ] Assign Experience Cloud permission sets to test users
- [ ] Configure guest user profile (what unauthenticated visitors can see)
- [ ] Set login page branding (logo, colors)
- [ ] Configure sharing rules for Golfer_Profile__c (owner-based sharing)

### Data
- [ ] Import production Contact + Golfer_Profile__c records via Data Loader
- [ ] Import Membership__c records
- [ ] Do NOT import Golf_Shot__c (that goes to Snowflake/Data Cloud)
- [ ] Validate all lookup relationships intact after import

### Kiosk App
- [ ] Update `VITE_SF_INSTANCE_URL` and `VITE_SF_CLIENT_ID` in Cloudflare Pages env vars
- [ ] Re-authenticate kiosk device (Device Flow) with new org credentials
- [ ] Smoke test all 3 UX flows (guest registration, member check-in, session summary)

### Golf Shot Data (production)
- [ ] Provision Snowflake account (or Data Cloud license)
- [ ] Create `golf_shots` table schema matching Golf_Shot__c fields
- [ ] Deploy middleware (Cloudflare Worker) to route simulator API events → Snowflake
- [ ] Build dbt model for session aggregates
- [ ] Test aggregate write-back to Golf_Session__c + Golfer_Profile__c via Bulk API
- [ ] Remove Golf_Shot__c from Fairway_Member_Access permission set
- [ ] Consider archiving or deleting Golf_Shot__c object from production org

---

## 9. File Creation Checklist

All files to be created and added to the repo:

### New Salesforce Metadata
```
fairway-sf/force-app/main/default/
  objects/
    Membership__c/
      Membership__c.object-meta.xml
      fields/
        Contact__c.field-meta.xml
        Membership_Tier__c.field-meta.xml
        Founding_Tier__c.field-meta.xml
        Status__c.field-meta.xml
        Start_Date__c.field-meta.xml
        Renewal_Date__c.field-meta.xml
        Billing_Cycle__c.field-meta.xml
        Monthly_Rate__c.field-meta.xml
        Complimentary_Years_Remaining__c.field-meta.xml
        Notes__c.field-meta.xml
    Golf_Session__c/fields/
      Avg_Ball_Speed__c.field-meta.xml
      Avg_Carry_Distance__c.field-meta.xml
      Avg_Club_Speed__c.field-meta.xml
      Best_Carry__c.field-meta.xml
      Fairways_Hit__c.field-meta.xml
      Total_Putts__c.field-meta.xml
      Session_Duration_Minutes__c.field-meta.xml
    Golfer_Profile__c/fields/
      Lifetime_Sessions__c.field-meta.xml
      Lifetime_Shots__c.field-meta.xml
      Avg_Handicap_Trend__c.field-meta.xml
      Most_Played_Course__c.field-meta.xml
      Favorite_Club__c.field-meta.xml
      Founding_Member_Badge__c.field-meta.xml
  permissionsets/
    Fairway_Guest_Access.permissionset-meta.xml
    Fairway_Member_Access.permissionset-meta.xml
    Fairway_Founding_Member_Access.permissionset-meta.xml
  connectedApps/
    Fairway_Kiosk_App.connectedApp-meta.xml
  tabs/
    Membership__c.tab-meta.xml
  classes/
    SessionAggregateHandler.cls
    SessionAggregateHandler.cls-meta.xml
    SessionAggregateHandlerTest.cls
    SessionAggregateHandlerTest.cls-meta.xml
  triggers/
    GolfSessionTrigger.trigger
    GolfSessionTrigger.trigger-meta.xml
  scripts/
    seed-poc-data.apex

### React Kiosk App
fairway-kiosk/
  package.json
  vite.config.ts
  tailwind.config.ts
  index.html
  public/
    manifest.json           (PWA manifest — fullscreen, no chrome)
  src/
    main.tsx
    App.tsx
    hooks/
      useSalesforce.ts
      useSession.ts
      useGolferProfile.ts
    components/
      KeypadInput.tsx
      SkillPicker.tsx
      PlayerSlot.tsx
      StatCard.tsx
      CoachTip.tsx
      GoldButton.tsx
    screens/
      WelcomeScreen.tsx
      PlayerTypeScreen.tsx
      GuestRegistration.tsx
      MemberLogin.tsx
      ProfilePreview.tsx
      SessionConfig.tsx
      SessionActive.tsx
      SessionSummary.tsx
    lib/
      salesforce.ts         (REST API client)
      auth.ts               (OAuth Device Flow)
      types.ts              (TS interfaces matching SF objects)
```

---

## 10. Open Questions / Decisions Deferred

| Question | Options | Recommendation |
|----------|---------|----------------|
| Shot data layer | Snowflake vs Data Cloud | Snowflake for POC/Year 1 — add Data Cloud when Agentforce coaching is priority |
| Kiosk auth persistence | Refresh token in localStorage vs native keychain | localStorage acceptable for dedicated kiosk device; keychain for production |
| Membership billing | Stripe + webhook vs Salesforce Subscription Mgmt | Stripe for now — simpler, cheaper |
| Member portal (Experience Cloud) | LWC vs React UI Bundle vs External React app | React UI Bundle for portal (inside SF auth), separate React PWA for kiosk |
| AI coaching source | Agentforce vs custom LLM call vs rule-based | Rule-based for POC; Agentforce when Data Cloud is wired up |
| RFID/QR check-in | QR code vs 4-digit PIN vs NFC badge | 4-digit PIN for POC (zero hardware cost); NFC badge for production bays |
