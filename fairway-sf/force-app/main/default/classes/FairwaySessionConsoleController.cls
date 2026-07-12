// global: encloses ExtendResult, which FairwaySessionExtendApi's global REST
// method returns — Apex requires the enclosing class of a global inner type
// to itself be global.
global with sharing class FairwaySessionConsoleController {

    // ── Data transfer object ──────────────────────────────────────────────────
    public class BaySessionDTO {
        @AuraEnabled public String appointmentId;
        @AuraEnabled public String contactName;
        @AuraEnabled public String bayName;
        @AuraEnabled public String bayResourceId;
        @AuraEnabled public String status;
        @AuraEnabled public String statusLabel;
        @AuraEnabled public String schedStart;
        @AuraEnabled public String schedEnd;
        @AuraEnabled public Integer minutesRemaining;
        @AuraEnabled public Boolean isOvertime;
        // ── Bay Control-only fields (populated by getBaySession) ──────────────
        @AuraEnabled public Integer partySize;
        @AuraEnabled public String simulatorType;
        @AuraEnabled public String rateLabel;
        @AuraEnabled public Decimal ratePerSession;
        @AuraEnabled public Decimal sessionTotal;
    }

    // ── Resolved session rate (Standard vs. Member pricing) ────────────────────
    private class RateInfo {
        Decimal amount;
        String label;
    }

    // ── Result of a smart extend (may cap or reassign a bay) ──────────────────
    // global: FairwaySessionExtendApi's @RestResource method returns this type,
    // and a global method's return type must itself be global.
    global class ExtendResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public Integer minutesApplied;
        @AuraEnabled public Boolean bayReassigned;
        @AuraEnabled public String reassignedBayName;
        @AuraEnabled public String message;
    }

    // ── Result of a join-in-progress-party attempt ─────────────────────────────
    // global: FairwaySessionJoinApi's @RestResource method returns this type,
    // and a global method's return type must itself be global.
    global class JoinResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public String message;
        @AuraEnabled public String participantId;
        @AuraEnabled public Integer slotAssigned;
        @AuraEnabled public String bayName;
    }

    // ── Fetch all active + today's scheduled sessions ─────────────────────────
    @AuraEnabled(cacheable=false)
    public static List<BaySessionDTO> getActiveSessions() {
        DateTime dayStart = DateTime.newInstance(Date.today(), Time.newInstance(0, 0, 0, 0));
        DateTime dayEnd   = DateTime.newInstance(Date.today().addDays(1), Time.newInstance(0, 0, 0, 0));

        List<ServiceAppointment> appts = [
            SELECT Id, ContactId, Contact.Name, Status, SchedStartTime, SchedEndTime
            FROM ServiceAppointment
            WHERE SchedStartTime >= :dayStart
              AND SchedStartTime <  :dayEnd
              AND Status NOT IN ('Completed', 'Canceled')
            ORDER BY SchedStartTime ASC
        ];

        Map<Id, AssignedResource> assignedMap = new Map<Id, AssignedResource>();
        List<Id> apptIds = new List<Id>();
        for (ServiceAppointment a : appts) apptIds.add(a.Id);

        for (AssignedResource ar : [
            SELECT Id, ServiceAppointmentId, ServiceResourceId, ServiceResource.Name
            FROM AssignedResource
            WHERE ServiceAppointmentId IN :apptIds
        ]) {
            assignedMap.put(ar.ServiceAppointmentId, ar);
        }

        DateTime now = DateTime.now();
        List<BaySessionDTO> result = new List<BaySessionDTO>();

        for (ServiceAppointment a : appts) {
            BaySessionDTO dto = new BaySessionDTO();
            dto.appointmentId = a.Id;
            dto.contactName   = a.Contact != null ? a.Contact.Name : 'Unknown Golfer';
            dto.status        = a.Status;
            dto.statusLabel   = statusLabel(a.Status);
            dto.schedStart    = a.SchedStartTime != null ? a.SchedStartTime.format() : null;
            dto.schedEnd      = a.SchedEndTime   != null ? a.SchedEndTime.format()   : null;

            AssignedResource ar = assignedMap.get(a.Id);
            if (ar != null) {
                dto.bayName       = ar.ServiceResource.Name;
                dto.bayResourceId = ar.ServiceResourceId;
            } else {
                dto.bayName = 'Unassigned';
            }

            if (a.SchedEndTime != null) {
                Long ms = a.SchedEndTime.getTime() - now.getTime();
                dto.minutesRemaining = (Integer) Math.round(ms / 60000.0);
                dto.isOvertime       = dto.minutesRemaining < 0;
            }

            result.add(dto);
        }
        return result;
    }

    // ── Fetch the current/next session for a single bay (Bay Control record page) ──
    @AuraEnabled(cacheable=false)
    public static BaySessionDTO getBaySession(String serviceResourceId) {
        DateTime dayStart = DateTime.newInstance(Date.today(), Time.newInstance(0, 0, 0, 0));
        DateTime dayEnd   = DateTime.newInstance(Date.today().addDays(1), Time.newInstance(0, 0, 0, 0));

        List<AssignedResource> ars = [
            SELECT ServiceAppointmentId, ServiceResource.Name,
                   ServiceAppointment.Id, ServiceAppointment.ContactId, ServiceAppointment.Contact.Name,
                   ServiceAppointment.Status, ServiceAppointment.SchedStartTime, ServiceAppointment.SchedEndTime,
                   ServiceAppointment.Party_Size__c
            FROM AssignedResource
            WHERE ServiceResourceId = :serviceResourceId
              AND ServiceAppointment.SchedStartTime >= :dayStart
              AND ServiceAppointment.SchedStartTime <  :dayEnd
              AND ServiceAppointment.Status NOT IN ('Completed', 'Canceled')
            ORDER BY ServiceAppointment.SchedStartTime ASC
        ];
        if (ars.isEmpty()) return null;

        // Prefer an in-flight session (Dispatched/In Progress) over a merely scheduled one.
        AssignedResource chosen = ars[0];
        for (AssignedResource ar : ars) {
            if (ar.ServiceAppointment.Status == 'Dispatched' || ar.ServiceAppointment.Status == 'In Progress') {
                chosen = ar;
                break;
            }
        }

        ServiceAppointment sa = chosen.ServiceAppointment;
        BaySessionDTO dto = new BaySessionDTO();
        dto.appointmentId = sa.Id;
        dto.contactName   = sa.Contact != null ? sa.Contact.Name : 'Unknown Golfer';
        dto.status        = sa.Status;
        dto.statusLabel   = statusLabel(sa.Status);
        dto.schedStart    = sa.SchedStartTime != null ? sa.SchedStartTime.format() : null;
        dto.schedEnd      = sa.SchedEndTime   != null ? sa.SchedEndTime.format()   : null;
        dto.bayName       = chosen.ServiceResource.Name;
        dto.bayResourceId = serviceResourceId;
        dto.partySize     = sa.Party_Size__c != null ? Integer.valueOf(sa.Party_Size__c) : null;
        // Real monitor type would need the not-yet-built ServiceResource<->Simulator_Bay__c
        // link — hardcoded to match the same placeholder already used in
        // FairwayOpsDashboardController.getBayStatus().
        dto.simulatorType = 'TrackMan';

        if (sa.SchedEndTime != null) {
            Long ms = sa.SchedEndTime.getTime() - DateTime.now().getTime();
            dto.minutesRemaining = (Integer) Math.round(ms / 60000.0);
            dto.isOvertime       = dto.minutesRemaining < 0;
        }

        RateInfo rate      = resolveSessionRate(sa.ContactId);
        dto.rateLabel      = rate.label;
        dto.ratePerSession = rate.amount;

        for (AggregateResult ar : [
            SELECT SUM(TotalPrice) total
            FROM OrderItem
            WHERE Order.Service_Appointment__c = :sa.Id
        ]) {
            Object total = ar.get('total');
            if (total != null) dto.sessionTotal = (Decimal) total;
        }

        return dto;
    }

    // ── Resolve this contact's session rate (mirrors fairway-kiosk's resolvePricebookId) ──
    // Standard vs. "Member Pricing" Pricebook2, keyed off an Active/Complimentary
    // Membership__c row — same binary split the kiosk already uses at checkout time.
    // If finer-grained tier pricing is added later, it's just more Pricebook2 rows;
    // this resolution logic doesn't need to change.
    private static RateInfo resolveSessionRate(Id contactId) {
        RateInfo info = new RateInfo();
        Boolean isMember = false;

        if (contactId != null) {
            List<Membership__c> memberships = [
                SELECT Id FROM Membership__c
                WHERE Contact__c = :contactId AND Status__c IN ('Active', 'Complimentary')
                LIMIT 1
            ];
            isMember = !memberships.isEmpty();
        }

        List<Pricebook2> pbs = isMember
            ? [SELECT Id FROM Pricebook2 WHERE Name = 'Member Pricing' AND IsActive = true LIMIT 1]
            : [SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1];
        if (pbs.isEmpty()) {
            info.label = 'Rate unavailable';
            return info;
        }

        List<PricebookEntry> entries = [
            SELECT UnitPrice FROM PricebookEntry
            WHERE Product2.Name = 'Bay Session' AND Pricebook2Id = :pbs[0].Id AND IsActive = true
            LIMIT 1
        ];
        if (entries.isEmpty()) {
            info.label = 'Rate unavailable';
            return info;
        }

        info.amount = entries[0].UnitPrice;
        info.label  = isMember ? 'Member rate' : 'Standard rate';
        return info;
    }

    // ── End session now ───────────────────────────────────────────────────────
    @AuraEnabled
    public static void endSession(String appointmentId) {
        ServiceAppointment a = [SELECT Id, Status, ServiceTerritoryId FROM ServiceAppointment WHERE Id = :appointmentId LIMIT 1];
        if (a.ServiceTerritoryId == null) {
            List<ServiceTerritory> territories = [
                SELECT Id FROM ServiceTerritory WHERE Name = 'Fairway Golf Club' AND IsActive = true LIMIT 1
            ];
            if (!territories.isEmpty()) a.ServiceTerritoryId = territories[0].Id;
        }
        a.Status       = 'Completed';
        a.SchedEndTime = DateTime.now();
        update a;
    }

    // ── Restart session: reset to Dispatched + extend end time ───────────────
    @AuraEnabled
    public static void restartSession(String appointmentId) {
        ServiceAppointment a = [SELECT Id, SchedStartTime, SchedEndTime FROM ServiceAppointment WHERE Id = :appointmentId LIMIT 1];
        DateTime now = DateTime.now();
        Decimal originalDuration = a.SchedEndTime != null && a.SchedStartTime != null
            ? (a.SchedEndTime.getTime() - a.SchedStartTime.getTime()) / 60000.0
            : 60;
        a.Status         = 'Dispatched';
        a.SchedStartTime = now;
        a.SchedEndTime   = now.addMinutes((Integer) originalDuration);
        update a;
    }

    // ── Extend session by N minutes (staff console — result not surfaced) ─────
    @AuraEnabled
    public static void extendSession(String appointmentId, Integer minutes) {
        extendSessionSmart(appointmentId, minutes);
    }

    // ── Extend session by N minutes, resolving bay conflicts intelligently ────
    // If extending would run into another appointment already booked on this
    // same bay, look for a free bay to move THAT booking to (the group
    // currently playing never moves) and let the extension proceed in full.
    // If no other bay is free, cap the extension at the conflicting booking's
    // start time instead of bumping the incoming customer with nowhere to go.
    @AuraEnabled
    public static ExtendResult extendSessionSmart(String appointmentId, Integer requestedMinutes) {
        ExtendResult result = new ExtendResult();
        result.bayReassigned = false;

        if (requestedMinutes == null || requestedMinutes <= 0) {
            result.success = false;
            result.minutesApplied = 0;
            result.message = 'Invalid extension length.';
            return result;
        }

        ServiceAppointment appt = [SELECT Id, SchedEndTime FROM ServiceAppointment WHERE Id = :appointmentId LIMIT 1];
        DateTime originalEnd  = appt.SchedEndTime != null ? appt.SchedEndTime : DateTime.now();
        DateTime requestedEnd = originalEnd.addMinutes(requestedMinutes);
        DateTime finalEnd     = requestedEnd;

        List<AssignedResource> myAr = [
            SELECT Id, ServiceResourceId
            FROM AssignedResource
            WHERE ServiceAppointmentId = :appointmentId
            LIMIT 1
        ];
        Id thisBayId = myAr.isEmpty() ? null : myAr[0].ServiceResourceId;

        if (thisBayId != null) {
            List<AssignedResource> conflictArs = [
                SELECT ServiceAppointmentId, ServiceAppointment.SchedStartTime, ServiceAppointment.SchedEndTime
                FROM AssignedResource
                WHERE ServiceResourceId = :thisBayId
                  AND ServiceAppointmentId != :appointmentId
                  AND ServiceAppointment.Status NOT IN ('Completed', 'Canceled')
                  AND ServiceAppointment.SchedStartTime < :requestedEnd
                  AND ServiceAppointment.SchedStartTime >= :originalEnd
                ORDER BY ServiceAppointment.SchedStartTime ASC
                LIMIT 1
            ];

            if (!conflictArs.isEmpty()) {
                DateTime conflictStart = conflictArs[0].ServiceAppointment.SchedStartTime;
                DateTime conflictEnd   = conflictArs[0].ServiceAppointment.SchedEndTime;
                Id conflictApptId      = conflictArs[0].ServiceAppointmentId;

                Id freeBayId; String freeBayName;
                for (ServiceResource other : [SELECT Id, Name FROM ServiceResource WHERE Id != :thisBayId]) {
                    Integer overlapCount = [
                        SELECT COUNT()
                        FROM AssignedResource
                        WHERE ServiceResourceId = :other.Id
                          AND ServiceAppointment.Status NOT IN ('Completed', 'Canceled')
                          AND ServiceAppointment.SchedStartTime < :conflictEnd
                          AND ServiceAppointment.SchedEndTime > :conflictStart
                    ];
                    if (overlapCount == 0) {
                        freeBayId   = other.Id;
                        freeBayName = other.Name;
                        break;
                    }
                }

                if (freeBayId != null) {
                    List<AssignedResource> conflictAr = [
                        SELECT Id FROM AssignedResource WHERE ServiceAppointmentId = :conflictApptId LIMIT 1
                    ];
                    if (!conflictAr.isEmpty()) {
                        conflictAr[0].ServiceResourceId = freeBayId;
                        update conflictAr[0];
                        result.bayReassigned      = true;
                        result.reassignedBayName  = freeBayName;
                    }
                } else {
                    // No open bay to move the incoming booking to — cap the
                    // extension so we never encroach on their reservation.
                    finalEnd = conflictStart;
                }
            }
        }

        Integer minutesApplied = (Integer) ((finalEnd.getTime() - originalEnd.getTime()) / 60000);
        if (minutesApplied <= 0) {
            result.success        = false;
            result.minutesApplied = 0;
            result.message        = 'Fully booked right after this session — no time available to extend.';
            return result;
        }

        appt.SchedEndTime = finalEnd;
        update appt;

        chargeExtension(appointmentId, minutesApplied);

        result.success        = true;
        result.minutesApplied = minutesApplied;
        result.message        = result.bayReassigned
            ? ('Extended ' + minutesApplied + ' min. Next booking moved to ' + result.reassignedBayName + '.')
            : ('Extended ' + minutesApplied + ' min.');
        return result;
    }

    // Adds an OrderItem for this extension to the visit's existing Order (opened
    // when the walk-in checked in). Quantity scales with minutes so a +15
    // charges half of a +30 against the same "30-Minute Extension" rate.
    // Silently no-ops if there's no Order for this appointment (e.g. a
    // reservation check-in, which doesn't open one) or the extension
    // product/pricebook entry hasn't been seeded yet — see
    // scripts/seed-payment-products.apex.
    private static void chargeExtension(String appointmentId, Integer minutes) {
        List<Order> orders = [
            SELECT Id, Pricebook2Id FROM Order
            WHERE Service_Appointment__c = :appointmentId
            LIMIT 1
        ];
        if (orders.isEmpty()) return;

        List<PricebookEntry> entries = [
            SELECT Id, UnitPrice FROM PricebookEntry
            WHERE Product2.Name = '30-Minute Extension'
              AND Pricebook2Id = :orders[0].Pricebook2Id
              AND IsActive = true
            LIMIT 1
        ];
        if (entries.isEmpty()) return;

        insert new OrderItem(
            OrderId          = orders[0].Id,
            PricebookEntryId = entries[0].Id,
            Quantity         = minutes / 30.0,
            UnitPrice        = entries[0].UnitPrice
        );
    }

    // ── Join an in-progress session as a late-arriving party member ───────────
    // Silent add — no approve/deny prompt on the bay screen (fairway-bay just
    // picks up the new Session_Participant__c row on its next 20s poll, no
    // code changes needed there). Payment isn't collected here: an individual
    // Order/OrderItem for this player is created by the kiosk caller before
    // this method runs (see fairway-kiosk's createSessionOrder) — settled at
    // a not-yet-built bay checkout step, not at check-in.
    //
    // FOR UPDATE locks the parent Golf_Session__c row to serialize concurrent
    // joins against the same session — nothing else enforces
    // Simulator_Player_Slot__c uniqueness (no validation rule exists on
    // Session_Participant__c at all).
    @AuraEnabled
    global static JoinResult joinSession(String sessionId, String golferProfileId, String displayName, Boolean isGuest) {
        JoinResult result = new JoinResult();

        if (String.isBlank(sessionId) || String.isBlank(displayName)) {
            result.success = false;
            result.message = 'Missing session or player info.';
            return result;
        }

        List<Golf_Session__c> sessions = [
            SELECT Id, Status__c, Bay__r.Name
            FROM Golf_Session__c
            WHERE Id = :sessionId
            FOR UPDATE
        ];
        if (sessions.isEmpty() || sessions[0].Status__c != 'In Progress') {
            result.success = false;
            result.message = 'That session is no longer active. Please check in another way.';
            return result;
        }
        Golf_Session__c session = sessions[0];

        Set<Integer> usedSlots = new Set<Integer>();
        for (Session_Participant__c sp : [
            SELECT Simulator_Player_Slot__c, Golfer_Profile__c
            FROM Session_Participant__c
            WHERE Golf_Session__c = :sessionId
        ]) {
            usedSlots.add((Integer) sp.Simulator_Player_Slot__c);
            if (golferProfileId != null && sp.Golfer_Profile__c == golferProfileId) {
                result.success = false;
                result.message = 'You\'re already checked in to this session.';
                return result;
            }
        }

        Integer freeSlot = null;
        for (Integer i = 1; i <= 4; i++) {
            if (!usedSlots.contains(i)) { freeSlot = i; break; }
        }
        if (freeSlot == null) {
            result.success = false;
            result.message = 'This session already has 4 players — it\'s full.';
            return result;
        }

        try {
            Session_Participant__c sp = new Session_Participant__c(
                Golf_Session__c          = sessionId,
                Golfer_Profile__c        = String.isBlank(golferProfileId) ? null : golferProfileId,
                Display_Name__c          = displayName,
                Is_Primary_Booker__c     = false,
                Guest_Flag__c            = isGuest == true,
                Simulator_Player_Slot__c = freeSlot
            );
            insert sp;

            result.success       = true;
            result.participantId = sp.Id;
            result.slotAssigned  = freeSlot;
            result.bayName       = session.Bay__r != null ? session.Bay__r.Name : null;
            result.message       = 'Added to ' + result.bayName + '.';
        } catch (DmlException e) {
            result.success = false;
            result.message = 'Something went wrong adding you to that session. Please ask staff for help.';
        }
        return result;
    }

    // ── Change status directly ────────────────────────────────────────────────
    @AuraEnabled
    public static void changeStatus(String appointmentId, String newStatus) {
        ServiceAppointment a = [SELECT Id, Status FROM ServiceAppointment WHERE Id = :appointmentId LIMIT 1];
        a.Status = newStatus;
        update a;
    }

    // ── Private helpers ───────────────────────────────────────────────────────
    private static String statusLabel(String s) {
        if (s == 'Dispatched')   return 'Checked In';
        if (s == 'In Progress')  return 'Active';
        if (s == 'Scheduled')    return 'Upcoming';
        if (s == 'Completed')    return 'Done';
        return s;
    }
}
