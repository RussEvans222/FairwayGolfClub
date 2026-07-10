// One-off fix for sessions that are stuck open because nothing ever closed
// them automatically (the gap FairwaySessionAutoEnd now fills going forward).
// Run this once now to clear SA-005 / SA-006 (and anything else overdue).
// Safe to re-run — it only touches appointments whose scheduled end time has
// already passed, same logic as the recurring sweep.

DateTime now = DateTime.now();

List<ServiceAppointment> overdue = [
    SELECT Id, AppointmentNumber, Status, SchedEndTime
    FROM ServiceAppointment
    WHERE Status IN ('Dispatched', 'In Progress')
      AND SchedEndTime < :now
];

if (overdue.isEmpty()) {
    System.debug('Nothing overdue — check Status/SchedEndTime on SA-005 and SA-006 directly if they still look stuck.');
} else {
    for (ServiceAppointment a : overdue) {
        System.debug('Closing ' + a.AppointmentNumber + ' (was ' + a.Status + ', ended ' + a.SchedEndTime + ')');
        a.Status = 'Completed';
    }
    update overdue;
    System.debug('✅ Closed ' + overdue.size() + ' overdue session(s).');
}
