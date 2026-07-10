# Salesforce Scheduler — Research Notes
**Researched:** 2026-07-09  
**Source:** Official Salesforce Help docs (help.salesforce.com)

---

## Key Architectural Finding

Salesforce's **native QR code** feature is for walk-in/waitlist (drop-in) appointments only — it is NOT designed to check in a pre-scheduled `ServiceAppointment`. For Fairway's scenario (golfer walks up, scans a code, gets checked into their bay), we build it ourselves using the standard REST API. This gives full control and fits the existing kiosk architecture perfectly.

---

## QR Code Check-In — How to Build It for Fairway

### The flow
1. After a member books (or checks in via kiosk), **generate a QR code** containing their `ServiceAppointment` Id
2. Display it on the kiosk confirmation screen OR email it to them
3. At the bay entrance or on the wall-mounted display, a QR scanner reads it
4. The app calls the SF REST API: `PATCH /services/data/v67.0/sobjects/ServiceAppointment/{Id}` with `{"Status": "Checked In"}`
5. Done — no PIN needed

### Evolution path
- **Today:** QR code = identity token (contains `ServiceAppointment` Id)
- **Next:** QR code = member token (contains Contact Id or Golfer_Profile__c Id, app looks up their active appointment)
- **Future:** Biometric facial recognition = identity token (same SF-side logic, different resolution layer)

The Salesforce side never changes — it always just receives a `ServiceAppointment` Id and patches the status. The identity resolution layer is what evolves.

---

## Status Ladder — Add `Checked In`

Salesforce Scheduler has a proper **`Checked In`** status category built in. Current kiosk skips straight from `Scheduled` to `Dispatched`. Richer ladder:

| Status | Trigger | Meaning |
|---|---|---|
| `Scheduled` | Reservation created | Appointment booked |
| `Checked In` | QR scan at entrance | Golfer arrived at club |
| `Dispatched` | Bay assigned | Golfer sent to their bay |
| `In Progress` | Session timer starts | Playing |
| `Completed` | End session | Done |

**To implement:** Add `Checked In` as a custom status value (Status Category: `Checked In`) in Salesforce Scheduler setup, then update the kiosk to write `Status = "Checked In"` when a QR code is scanned instead of jumping straight to `Dispatched`.

---

## Native Scheduler Features Worth Using at Fairway

### 1. Lobby Management Dashboard
- Internal-facing Lightning dashboard for greeters/staff
- Shows today's appointments + drop-in waitlist
- Greeter can: Check In, Reschedule, Reassign Resource, Mark No-Show
- This is what the `fairwaySessionConsole` LWC partially duplicates — worth evaluating whether to extend Lobby Management instead
- **Requires:** Salesforce Scheduler Greeter Permission Set License (PSL)

### 2. Waitlist / Drop-In Object (native bay queue)
- The current kiosk bay queue is in-memory React state (lost on restart)
- Salesforce has a native `Waitlist` object for exactly this use case
- Drop-in participants show up in Lobby Management
- **Benefit:** Staff can see the queue in Salesforce without looking at the kiosk
- **Recommendation:** Replace in-memory `bayQueue` array with `Waitlist` records

### 3. `Checked In` Status Category
- Built into Scheduler — no custom code needed
- Use it as the QR scan confirmation step before bay assignment
- Distinct from `Dispatched` (which means "go to bay X")

### 4. Group Service Appointments
- Create one appointment for a group (multiple golfers)
- Customers can enroll/unenroll via URL or email
- **Fairway use case:** Corporate events, league play, multi-bay group bookings

### 5. Guest Appointment Management via Email Links
- Guests (unauthenticated users) can reschedule, cancel, or create new appointments via links in confirmation emails
- No login required
- **Fairway use case:** Let members manage reservations without logging into Experience Cloud

### 6. `AppointmentSchedulingEvent` Platform Event
- SF fires this platform event when appointment status changes
- The bay display currently polls every 20s — subscribing to this event would make it **instant/push-based**
- **Recommendation:** Upgrade `fairway-bay` from polling to CometD/Platform Event subscription in a future phase

### 7. Multi-Resource Scheduling
- Book multiple bays in a single appointment (e.g., two bays for a large group)
- **Fairway use case:** Tournament day, corporate buyouts

### 8. LMS Event for Greeter Dashboard
- `lightning__appointmentBooking_greeterDashboard` LMS event
- Custom LWC components can subscribe to territory changes in the greeter dashboard
- **Fairway use case:** Real-time bay status widget in Fairway Ops Lightning app

### 9. Email Prompt Template (AI)
- LLM-generated appointment invitation emails using Salesforce prompt templates
- **Fairway use case:** AI-personalized booking confirmations referencing golfer's last session stats

---

## Official Documentation URLs

| Topic | URL |
|---|---|
| Overview | https://help.salesforce.com/s/articleView?id=platform.ls_overview.htm&type=5 |
| Full feature list | https://help.salesforce.com/s/articleView?id=platform.ls_whats_included_in_salesforce_scheduler.htm&type=5 |
| Capabilities | https://help.salesforce.com/s/articleView?id=platform.ls_capabilities_of_salesforce_scheduler.htm&type=5 |
| Status categories | https://help.salesforce.com/s/articleView?id=platform.ls_appointment_statuses_and_status_categories_in_salesforce_scheduler.htm&type=5 |
| Lobby Management overview | https://help.salesforce.com/s/articleView?id=platform.ls_self_checkin_for_endusers_with_lobby.htm&type=5 |
| QR code generation | https://help.salesforce.com/s/articleView?id=platform.ls_generate_qr_codes_for_lobby.htm&type=5 |
| QR code component setup | https://help.salesforce.com/s/articleView?id=platform.ls_setup_qr_codes_for_lobby.htm&type=5 |
| Experience site for self check-in | https://help.salesforce.com/s/articleView?id=platform.ls_set_up_experience_site_for_self_check_in_with_qr.htm&type=5 |
| Customer QR scan flow | https://help.salesforce.com/s/articleView?id=platform.ls_scan_lobby_qr_code_on_your_mobile.htm&type=5 |
| Greeter check-in for scheduled appts | https://help.salesforce.com/s/articleView?id=platform.ls_manage_scheduled_appointments_in_lobby_management.htm&type=5 |
| Waitlist / drop-in management | https://help.salesforce.com/s/articleView?id=platform.ls_manage_drop_in_participants_with_waitlist_management.htm&type=5 |
| Lobby Management considerations | https://help.salesforce.com/s/articleView?id=platform.ls_lobby_management_considerations.htm&type=5 |
| **Developer guide** (open in browser) | https://developer.salesforce.com/docs/atlas.en-us.salesforce_scheduler_developer_guide.meta/salesforce_scheduler_developer_guide/salesforce_scheduler_api_overview.htm |

---

## Pending Build Items (from this research)

- [ ] **Add QR code to kiosk confirmation screen** — generate QR from `ServiceAppointment` Id, display on `bay-direction` screen so golfer can scan at the bay entrance
- [ ] **Add `Checked In` status step** — update kiosk + session console to use `Checked In` before `Dispatched`
- [ ] **Replace in-memory bay queue with Salesforce Waitlist object** — persist queue in SF, visible in Lobby Management
- [ ] **Evaluate Lobby Management PSL** — does the STORM org have Greeter PSL? If so, wire up the native dashboard
- [ ] **Future: subscribe to `AppointmentSchedulingEvent`** — replace 20s polling in `fairway-bay` with push-based updates
