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
