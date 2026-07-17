trigger ServiceAppointmentTrigger on ServiceAppointment (after update) {
    List<Id> justCompleted = new List<Id>();
    for (ServiceAppointment a : Trigger.new) {
        ServiceAppointment old = Trigger.oldMap.get(a.Id);
        if (a.Status == 'Completed' && old.Status != 'Completed') {
            justCompleted.add(a.Id);
        }
    }
    if (!justCompleted.isEmpty()) {
        GolfSessionSyncHandler.closeSessionsForAppointments(justCompleted);
    }
}
