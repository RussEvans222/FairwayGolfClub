// Closes out bay sessions automatically once their scheduled end time has
// passed. Extending a session (FairwaySessionConsoleController.extendSession)
// pushes SchedEndTime forward, so an extended session simply won't be
// "overdue" yet — this sweep never fights an active extension. Scheduled to
// run every 5 minutes; see scripts/schedule-session-autoend.apex.
//
// Also backfills ServiceTerritoryId when blank before closing — some
// appointment-creation paths (the kiosk's walk-in flow, before 2026-07-10)
// didn't set it, which is what left SA-005/SA-006 stuck open.
public with sharing class FairwaySessionAutoEnd implements Schedulable {

    public void execute(SchedulableContext ctx) {
        DateTime now = DateTime.now();

        List<ServiceAppointment> overdue = [
            SELECT Id, Status, ServiceTerritoryId
            FROM ServiceAppointment
            WHERE Status IN ('Dispatched', 'In Progress')
              AND SchedEndTime < :now
        ];

        if (overdue.isEmpty()) return;

        Id territoryId = resolveTerritoryId(overdue);

        for (ServiceAppointment a : overdue) {
            if (a.ServiceTerritoryId == null && territoryId != null) {
                a.ServiceTerritoryId = territoryId;
            }
            a.Status = 'Completed';
        }
        update overdue;
    }

    private Id resolveTerritoryId(List<ServiceAppointment> overdue) {
        Boolean anyMissing = false;
        for (ServiceAppointment a : overdue) {
            if (a.ServiceTerritoryId == null) { anyMissing = true; break; }
        }
        if (!anyMissing) return null;

        List<ServiceTerritory> territories = [
            SELECT Id FROM ServiceTerritory WHERE Name = 'Fairway Golf Club' AND IsActive = true LIMIT 1
        ];
        return territories.isEmpty() ? null : territories[0].Id;
    }
}
