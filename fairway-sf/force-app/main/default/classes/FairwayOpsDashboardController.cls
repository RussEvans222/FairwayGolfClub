public with sharing class FairwayOpsDashboardController {

    public class SessionRow {
        @AuraEnabled public String appointmentId;
        @AuraEnabled public String contactName;
        @AuraEnabled public String bayName;
        @AuraEnabled public DateTime schedStart;
        @AuraEnabled public DateTime schedEnd;
        @AuraEnabled public String status;       // Scheduled / Dispatched / In Progress / Completed
        @AuraEnabled public Boolean isLate;      // scheduled but not dispatched and past start time
        @AuraEnabled public Boolean isCheckedIn; // Dispatched or later
    }

    public class BayRow {
        @AuraEnabled public String bayId;
        @AuraEnabled public String bayName;
        @AuraEnabled public String monitorType;
        @AuraEnabled public String currentGolfer;
        @AuraEnabled public String lastGolfer;
        @AuraEnabled public String appointmentStatus;  // Idle / Scheduled / Active / Done
        @AuraEnabled public Integer sessionsToday;
        @AuraEnabled public Decimal revenueToday;      // sum of today's OrderItem.TotalPrice for this bay — walk-ins only for now
        @AuraEnabled public Boolean dataSynced;
        @AuraEnabled public Date lastCalibration;
    }

    public class DailyStats {
        @AuraEnabled public Integer totalSessions;
        @AuraEnabled public Integer checkedIn;
        @AuraEnabled public Integer scheduled;
        @AuraEnabled public Integer late;
        @AuraEnabled public Integer baysActive;
        @AuraEnabled public Integer baysIdle;
        @AuraEnabled public Decimal usagePercent;   // sessions today / usage goal
        @AuraEnabled public Integer usageGoal;
        @AuraEnabled public Decimal totalRevenue;   // sum of today's OrderItem.TotalPrice across all bays — walk-ins only for now
    }

    // ── Today's scheduled sessions ──────────────────────────────────────────
    @AuraEnabled(cacheable=false)
    public static List<SessionRow> getTodaySessions() {
        List<SessionRow> rows = new List<SessionRow>();
        DateTime now = DateTime.now();

        for (ServiceAppointment sa : [
            SELECT Id, Status, SchedStartTime, SchedEndTime,
                   Contact.Name,
                   (SELECT ServiceResource.Name FROM ServiceResources LIMIT 1)
            FROM ServiceAppointment
            WHERE SchedStartTime = TODAY
              AND Status IN ('Scheduled','Dispatched','In Progress','Completed')
            ORDER BY SchedStartTime ASC
            LIMIT 200
        ]) {
            SessionRow r = new SessionRow();
            r.appointmentId = sa.Id;
            r.contactName   = sa.Contact != null ? sa.Contact.Name : 'Guest';
            r.schedStart    = sa.SchedStartTime;
            r.schedEnd      = sa.SchedEndTime;
            r.status        = sa.Status;
            r.isCheckedIn   = sa.Status == 'Dispatched' || sa.Status == 'In Progress' || sa.Status == 'Completed';
            r.isLate        = sa.Status == 'Scheduled' && sa.SchedStartTime < now;

            if (sa.ServiceResources != null && !sa.ServiceResources.isEmpty()
                    && sa.ServiceResources[0].ServiceResource != null) {
                r.bayName = sa.ServiceResources[0].ServiceResource.Name;
            } else {
                r.bayName = '—';
            }
            rows.add(r);
        }
        return rows;
    }

    // ── Bay status overview ─────────────────────────────────────────────────
    @AuraEnabled(cacheable=false)
    public static List<BayRow> getBayStatus() {
        // Get all ServiceResources (bays)
        Map<String, BayRow> rowsByName = new Map<String, BayRow>();
        for (ServiceResource sr : [
            SELECT Id, Name, RelatedRecordId
            FROM ServiceResource
            WHERE IsActive = true
            ORDER BY Name ASC
        ]) {
            BayRow b = new BayRow();
            b.bayId            = sr.Id;
            b.bayName          = sr.Name;
            b.monitorType      = 'TrackMan';
            b.sessionsToday    = 0;
            b.revenueToday     = 0;
            b.appointmentStatus = 'Idle';
            b.dataSynced       = true;
            b.currentGolfer    = null;
            b.lastGolfer       = null;
            rowsByName.put(sr.Name, b);
        }

        // Match today's appointments to bays
        DateTime now = DateTime.now();
        Map<Id, String> apptIdToBayName = new Map<Id, String>();
        for (ServiceAppointment sa : [
            SELECT Id, Status, SchedStartTime, SchedEndTime,
                   Contact.Name,
                   (SELECT ServiceResource.Name FROM ServiceResources LIMIT 1)
            FROM ServiceAppointment
            WHERE SchedStartTime = TODAY
              AND Status IN ('Scheduled','Dispatched','In Progress','Completed')
            ORDER BY SchedStartTime ASC
            LIMIT 200
        ]) {
            String bName = null;
            if (sa.ServiceResources != null && !sa.ServiceResources.isEmpty()
                    && sa.ServiceResources[0].ServiceResource != null) {
                bName = sa.ServiceResources[0].ServiceResource.Name;
            }
            if (bName == null || !rowsByName.containsKey(bName)) continue;

            BayRow b = rowsByName.get(bName);
            b.sessionsToday++;
            apptIdToBayName.put(sa.Id, bName);

            String golfer = sa.Contact != null ? sa.Contact.Name : 'Guest';
            Boolean active = sa.Status == 'Dispatched' || sa.Status == 'In Progress';
            Boolean upcoming = sa.Status == 'Scheduled' && sa.SchedStartTime > now;
            Boolean completed = sa.Status == 'Completed';

            if (active) {
                b.currentGolfer     = golfer;
                b.appointmentStatus = 'Active';
            } else if (upcoming && b.appointmentStatus == 'Idle') {
                b.appointmentStatus = 'Scheduled';
            } else if (completed && b.currentGolfer == null) {
                b.lastGolfer        = golfer;
                if (b.appointmentStatus == 'Idle') b.appointmentStatus = 'Done';
            }
        }

        // Revenue: every charge (base session fee + extensions) is an OrderItem
        // on an Order tied back to the visit's ServiceAppointment. Walk-ins
        // only — reservation check-ins don't open an Order today.
        if (!apptIdToBayName.isEmpty()) {
            for (OrderItem oi : [
                SELECT TotalPrice, Order.Service_Appointment__c
                FROM OrderItem
                WHERE Order.Service_Appointment__c IN :apptIdToBayName.keySet()
            ]) {
                String bName = apptIdToBayName.get(oi.Order.Service_Appointment__c);
                if (bName == null || !rowsByName.containsKey(bName)) continue;
                rowsByName.get(bName).revenueToday += oi.TotalPrice;
            }
        }

        return rowsByName.values();
    }

    // ── Daily stats header ──────────────────────────────────────────────────
    @AuraEnabled(cacheable=false)
    public static DailyStats getDailyStats() {
        DailyStats s = new DailyStats();
        s.usageGoal   = 10; // target sessions per day to cover operating budget
        s.totalSessions = 0;
        s.checkedIn   = 0;
        s.scheduled   = 0;
        s.late        = 0;
        s.baysActive  = 0;
        s.baysIdle    = 0;
        s.totalRevenue = 0;

        DateTime now = DateTime.now();
        Set<Id> apptIdsToday = new Set<Id>();
        for (ServiceAppointment sa : [
            SELECT Id, Status, SchedStartTime
            FROM ServiceAppointment
            WHERE SchedStartTime = TODAY
              AND Status IN ('Scheduled','Dispatched','In Progress','Completed')
        ]) {
            s.totalSessions++;
            apptIdsToday.add(sa.Id);
            if (sa.Status == 'Dispatched' || sa.Status == 'In Progress' || sa.Status == 'Completed') {
                s.checkedIn++;
            } else if (sa.Status == 'Scheduled' && sa.SchedStartTime < now) {
                s.late++;
            } else {
                s.scheduled++;
            }
        }

        if (!apptIdsToday.isEmpty()) {
            for (AggregateResult ar : [
                SELECT SUM(TotalPrice) total
                FROM OrderItem
                WHERE Order.Service_Appointment__c IN :apptIdsToday
            ]) {
                Object total = ar.get('total');
                if (total != null) s.totalRevenue = (Decimal) total;
            }
        }

        Integer activeBays = [
            SELECT COUNT() FROM ServiceAppointment
            WHERE SchedStartTime = TODAY
              AND Status IN ('Dispatched','In Progress')
        ];
        s.baysActive = activeBays;

        Integer totalBays = [SELECT COUNT() FROM ServiceResource WHERE IsActive = true];
        s.baysIdle = Math.max(0, totalBays - activeBays);

        s.usagePercent = s.usageGoal > 0
            ? (Decimal.valueOf(s.totalSessions) / s.usageGoal * 100).setScale(0)
            : 0;

        return s;
    }

    // ── Bay greeting: golfer profile + latest insight ───────────────────────
    public class GreetingData {
        @AuraEnabled public String firstName;
        @AuraEnabled public String bayName;
        @AuraEnabled public Decimal avgCarry;
        @AuraEnabled public Decimal avgBallSpeed;
        @AuraEnabled public Integer lifetimeSessions;
        @AuraEnabled public String skillSegment;
        @AuraEnabled public String currentFocus;
        @AuraEnabled public String insightObservation;
        @AuraEnabled public String insightRecommendation;
        @AuraEnabled public String insightClub;
        @AuraEnabled public String aiGreeting;
    }

    @AuraEnabled(cacheable=false)
    public static GreetingData getBayGreeting(String appointmentId) {
        GreetingData g = new GreetingData();

        List<ServiceAppointment> appts = [
            SELECT Id, Contact.FirstName, Contact.LastName, Contact.Id,
                   (SELECT ServiceResource.Name FROM ServiceResources LIMIT 1)
            FROM ServiceAppointment
            WHERE Id = :appointmentId
            LIMIT 1
        ];
        if (appts.isEmpty()) return g;

        ServiceAppointment sa = appts[0];
        g.firstName = sa.Contact != null ? sa.Contact.FirstName : 'Golfer';

        if (sa.ServiceResources != null && !sa.ServiceResources.isEmpty()
                && sa.ServiceResources[0].ServiceResource != null) {
            g.bayName = sa.ServiceResources[0].ServiceResource.Name;
        }

        if (sa.Contact != null) {
            List<Golfer_Profile__c> profiles = [
                SELECT Avg_Handicap_Trend__c, Average_Driver_Carry__c, Average_7_Iron_Carry__c,
                       Lifetime_Sessions__c, Skill_Segment__c, Current_Focus__c
                FROM Golfer_Profile__c
                WHERE Contact__c = :sa.Contact.Id
                LIMIT 1
            ];
            if (!profiles.isEmpty()) {
                Golfer_Profile__c p = profiles[0];
                g.avgCarry        = p.Average_Driver_Carry__c;
                g.avgBallSpeed    = null;
                g.lifetimeSessions = p.Lifetime_Sessions__c != null ? Integer.valueOf(p.Lifetime_Sessions__c) : 0;
                g.skillSegment    = p.Skill_Segment__c;
                g.currentFocus    = p.Current_Focus__c;

                List<Practice_Insight__c> insights = [
                    SELECT Observation__c, Recommendation__c, Club__c
                    FROM Practice_Insight__c
                    WHERE Golfer_Profile__c = :p.Id
                    ORDER BY CreatedDate DESC
                    LIMIT 1
                ];
                if (!insights.isEmpty()) {
                    g.insightObservation    = insights[0].Observation__c;
                    g.insightRecommendation = insights[0].Recommendation__c;
                    g.insightClub           = insights[0].Club__c;
                }
            }
        }

        // Build greeting text
        g.aiGreeting = buildGreeting(g);
        return g;
    }

    private static String buildGreeting(GreetingData g) {
        String name = g.firstName != null ? g.firstName : 'Golfer';
        List<String> parts = new List<String>();

        parts.add('Welcome back, ' + name + '!');

        if (g.lifetimeSessions != null && g.lifetimeSessions > 1) {
            parts.add('This is session #' + g.lifetimeSessions + ' at Fairway.');
        }

        if (g.currentFocus != null && g.currentFocus.length() > 0) {
            parts.add('Your current focus area is ' + g.currentFocus + '.');
        }

        if (g.insightRecommendation != null && g.insightRecommendation.length() > 0) {
            parts.add('Last session insight: ' + g.insightRecommendation);
        } else if (g.avgCarry != null && g.avgCarry > 0) {
            parts.add('Your driver carry average is ' + g.avgCarry.setScale(0) + ' yards — let\'s push it further today.');
        }

        return String.join(parts, ' ');
    }
}
