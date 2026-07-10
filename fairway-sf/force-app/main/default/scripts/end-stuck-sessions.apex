// One-off fix for sessions that are stuck open because nothing ever closed
// them automatically (the gap FairwaySessionAutoEnd now fills going forward).
// Run this once now to clear SA-005 / SA-006 (and anything else overdue).
// Safe to re-run — it only touches appointments whose scheduled end time has
// already passed, same logic as the recurring sweep.
//
// Also backfills ServiceTerritoryId when blank — the kiosk's walk-in path
// was creating ServiceAppointments without it (fixed 2026-07-10 in
// fairway-kiosk/src/App.tsx), and a blank territory is why SA-005/SA-006
// stayed stuck through the first pass of this script.

DateTime now = DateTime.now();

List<ServiceTerritory> territories = [
    SELECT Id FROM ServiceTerritory WHERE Name = 'Fairway Golf Club' AND IsActive = true LIMIT 1
];
Id territoryId = territories.isEmpty() ? null : territories[0].Id;
if (territoryId == null) {
    System.debug('⚠️ No active ServiceTerritory named "Fairway Golf Club" found — territory backfill will be skipped.');
}

List<ServiceAppointment> overdue = [
    SELECT Id, AppointmentNumber, Status, SchedEndTime, ServiceTerritoryId
    FROM ServiceAppointment
    WHERE Status IN ('Dispatched', 'In Progress')
      AND SchedEndTime < :now
];

if (overdue.isEmpty()) {
    System.debug('Nothing overdue — check Status/SchedEndTime on SA-005 and SA-006 directly if they still look stuck.');
} else {
    for (ServiceAppointment a : overdue) {
        if (a.ServiceTerritoryId == null && territoryId != null) {
            a.ServiceTerritoryId = territoryId;
            System.debug('Backfilling ServiceTerritory on ' + a.AppointmentNumber);
        }
        System.debug('Closing ' + a.AppointmentNumber + ' (was ' + a.Status + ', ended ' + a.SchedEndTime + ')');
        a.Status = 'Completed';
    }
    update overdue;
    System.debug('✅ Closed ' + overdue.size() + ' overdue session(s).');
}
