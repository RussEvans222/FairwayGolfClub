// Seed a today-scheduled ServiceAppointment for Jim Richard so there's a real
// reservation to test QR check-in against (his existing seeded session is a
// historical practice session, not something in today's kiosk schedule).
// Safe to re-run — skips creation if a Scheduled appointment already exists for him today.

Contact jim = [SELECT Id, AccountId FROM Contact WHERE Email = 'russ@russevans.me' LIMIT 1];
if (jim.AccountId == null) {
    throw new System.CalloutException('Jim has no linked Person Account — check SESSION_SYNC.md Person Account fix.');
}

List<ServiceAppointment> existing = [
    SELECT Id, Status FROM ServiceAppointment
    WHERE ContactId = :jim.Id
      AND SchedStartTime >= :DateTime.newInstance(Date.today(), Time.newInstance(0,0,0,0))
      AND SchedStartTime <  :DateTime.newInstance(Date.today().addDays(1), Time.newInstance(0,0,0,0))
      AND Status = 'Scheduled'
    LIMIT 1
];

ServiceAppointment appt;
if (!existing.isEmpty()) {
    appt = existing[0];
    System.debug('Reusing existing Scheduled appointment for Jim: ' + appt.Id);
} else {
    WorkType bayType = [SELECT Id FROM WorkType WHERE Name = 'Bay Session' LIMIT 1];

    DateTime startTime = DateTime.now().addMinutes(5);
    DateTime endTime   = startTime.addMinutes(60);

    appt = new ServiceAppointment(
        ParentRecordId = jim.AccountId,
        ContactId      = jim.Id,
        WorkTypeId     = bayType.Id,
        SchedStartTime = startTime,
        SchedEndTime   = endTime,
        Status         = 'Scheduled',
        Description    = 'QR check-in test — Jim Richard'
    );
    insert appt;
    System.debug('Created appointment for Jim: ' + appt.Id);

    ServiceResource bay = [SELECT Id, Name FROM ServiceResource WHERE IsActive = true ORDER BY Name ASC LIMIT 1];
    insert new AssignedResource(
        ServiceAppointmentId = appt.Id,
        ServiceResourceId    = bay.Id
    );
    System.debug('Assigned bay: ' + bay.Name);
}

System.debug('✅ Jim is ready to check in today. ServiceAppointment Id: ' + appt.Id);
System.debug('   Open the kiosk → Reservation → find Jim → tap the ▦ QR icon next to his name to generate the code.');
