// Reset + seed two active bay sessions for walk-in kiosk testing
// Both bays occupied, dispatched, ending ~45 min from now
// Walk-in should see wait timer and suggestion card

// ── 1. Delete all today's appointments + assignments ─────────────────────
List<ServiceAppointment> todayAppts = [
    SELECT Id FROM ServiceAppointment
    WHERE SchedStartTime >= :DateTime.newInstance(Date.today(), Time.newInstance(0,0,0,0))
      AND SchedStartTime <  :DateTime.newInstance(Date.today().addDays(1), Time.newInstance(0,0,0,0))
];
if (!todayAppts.isEmpty()) {
    List<Id> apptIds = new List<Id>();
    for (ServiceAppointment a : todayAppts) apptIds.add(a.Id);
    delete [SELECT Id FROM AssignedResource WHERE ServiceAppointmentId IN :apptIds];
    delete todayAppts;
    System.debug('Deleted ' + todayAppts.size() + ' existing appointment(s)');
}

// ── 2. Resolve references ────────────────────────────────────────────────
Contact marcus = [SELECT Id FROM Contact WHERE Email = 'marcus.webb@poc.fairwaygolfclub.co' LIMIT 1];
Contact sarah  = [SELECT Id FROM Contact WHERE Email = 'sarah.chen@poc.fairwaygolfclub.co'  LIMIT 1];

ServiceResource bay1 = [SELECT Id FROM ServiceResource WHERE Name = 'Bay Number One' LIMIT 1];
ServiceResource bay2 = [SELECT Id FROM ServiceResource WHERE Name = 'Bay Number 2'   LIMIT 1];

WorkType practiceType = [SELECT Id FROM WorkType WHERE Name = 'Practice' LIMIT 1];

List<WorkOrder> existingWO = [SELECT Id FROM WorkOrder WHERE Subject = 'Fairway POC Bay Sessions' LIMIT 1];
WorkOrder wo;
if (existingWO.isEmpty()) {
    wo = new WorkOrder(Subject = 'Fairway POC Bay Sessions');
    insert wo;
} else {
    wo = existingWO[0];
}

// ── 3. Create two sessions: started 15 min ago, end 45 min from now ──────
DateTime now       = DateTime.now();
DateTime startTime = now.addMinutes(-15);   // started 15 min ago
DateTime endTime   = now.addMinutes(45);    // 45 min remaining

// Bay 1 — Marcus, Dispatched (checked in, heading to bay)
ServiceAppointment appt1 = new ServiceAppointment(
    ParentRecordId = wo.Id,
    ContactId      = marcus.Id,
    WorkTypeId     = practiceType.Id,
    SchedStartTime = startTime,
    SchedEndTime   = endTime,
    Status         = 'Dispatched',
    Description    = 'Test — Marcus active in Bay 1'
);
insert appt1;
insert new AssignedResource(ServiceAppointmentId = appt1.Id, ServiceResourceId = bay1.Id);

// Bay 2 — Sarah, In Progress
ServiceAppointment appt2 = new ServiceAppointment(
    ParentRecordId = wo.Id,
    ContactId      = sarah.Id,
    WorkTypeId     = practiceType.Id,
    SchedStartTime = startTime,
    SchedEndTime   = endTime,
    Status         = 'In Progress',
    Description    = 'Test — Sarah active in Bay 2'
);
insert appt2;
insert new AssignedResource(ServiceAppointmentId = appt2.Id, ServiceResourceId = bay2.Id);

System.debug('✅ Reset complete');
System.debug('  Bay 1 → Marcus Webb  | ' + appt1.Id + ' | Dispatched | ends ' + endTime);
System.debug('  Bay 2 → Sarah Chen   | ' + appt2.Id + ' | In Progress | ends ' + endTime);
System.debug('  Walk-in should see ~45 min wait + suggestion card');
