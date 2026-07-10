// Closes out bay sessions automatically once their scheduled end time has
// passed. Extending a session (FairwaySessionConsoleController.extendSession)
// pushes SchedEndTime forward, so an extended session simply won't be
// "overdue" yet — this sweep never fights an active extension. Scheduled to
// run every 5 minutes; see scripts/schedule-session-autoend.apex.
public with sharing class FairwaySessionAutoEnd implements Schedulable {

    public void execute(SchedulableContext ctx) {
        DateTime now = DateTime.now();

        List<ServiceAppointment> overdue = [
            SELECT Id, Status
            FROM ServiceAppointment
            WHERE Status IN ('Dispatched', 'In Progress')
              AND SchedEndTime < :now
        ];

        if (overdue.isEmpty()) return;

        for (ServiceAppointment a : overdue) {
            a.Status = 'Completed';
        }
        update overdue;
    }
}
