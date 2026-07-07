// Seed Salesforce Scheduler data for Fairway Golf Club POC
// - Create WorkTypes: Practice, Round, Game
// - Create a ServiceAppointment for today (2–3 PM) assigned to Bay 1 with Marcus
// NOTE: Existing ServiceResources stay as-is (type 'S') — ResourceType can't be changed
//       in place on STORM. The kiosk queries by ServiceResource Name, not type.

// Create WorkTypes (skip if already exist)
Set<String> existingNames = new Set<String>();
for (WorkType wt : [SELECT Name FROM WorkType]) existingNames.add(wt.Name);

List<WorkType> toInsert = new List<WorkType>();
if (!existingNames.contains('Practice'))
    toInsert.add(new WorkType(Name='Practice', EstimatedDuration=60, DurationType='Hours'));
if (!existingNames.contains('Round'))
    toInsert.add(new WorkType(Name='Round',    EstimatedDuration=90, DurationType='Hours'));
if (!existingNames.contains('Game'))
    toInsert.add(new WorkType(Name='Game',     EstimatedDuration=60, DurationType='Hours'));
if (!toInsert.isEmpty()) insert toInsert;
System.debug('WorkTypes ready: ' + (existingNames.size() + toInsert.size()));

// Get contacts + work type
Contact marcus = [SELECT Id FROM Contact WHERE Email = 'marcus.webb@poc.fairwaygolfclub.co' LIMIT 1];
WorkType practiceType = [SELECT Id FROM WorkType WHERE Name = 'Practice' LIMIT 1];

// ServiceAppointment requires a ParentRecordId — create or reuse a WorkOrder
List<WorkOrder> existingWO = [SELECT Id FROM WorkOrder WHERE Subject = 'Fairway POC Bay Sessions' LIMIT 1];
WorkOrder wo;
if (existingWO.isEmpty()) {
    wo = new WorkOrder(Subject='Fairway POC Bay Sessions');
    insert wo;
    System.debug('Created WorkOrder: ' + wo.Id);
} else {
    wo = existingWO[0];
    System.debug('Reused WorkOrder: ' + wo.Id);
}

// Create appointment for today 2–3 PM (skip if one already exists for Marcus today)
List<ServiceAppointment> existing = [
    SELECT Id FROM ServiceAppointment
    WHERE ContactId = :marcus.Id
      AND SchedStartTime >= :DateTime.newInstance(Date.today(), Time.newInstance(0,0,0,0))
      AND SchedStartTime <  :DateTime.newInstance(Date.today().addDays(1), Time.newInstance(0,0,0,0))
    LIMIT 1
];

ServiceAppointment appt;
if (existing.isEmpty()) {
    DateTime startTime = DateTime.newInstance(Date.today(), Time.newInstance(14, 0, 0, 0));
    DateTime endTime   = DateTime.newInstance(Date.today(), Time.newInstance(15, 0, 0, 0));

    appt = new ServiceAppointment(
        ParentRecordId = wo.Id,
        ContactId      = marcus.Id,
        WorkTypeId     = practiceType.Id,
        SchedStartTime = startTime,
        SchedEndTime   = endTime,
        Status         = 'Scheduled',
        Description    = 'POC — Marcus + Sarah, Practice session'
    );
    insert appt;
    System.debug('Created appointment: ' + appt.Id);
} else {
    appt = existing[0];
    System.debug('Appointment already exists: ' + appt.Id);
}

// Assign Bay 1 (skip if already assigned)
ServiceResource bay1 = [SELECT Id FROM ServiceResource WHERE Name = 'Bay Number One' LIMIT 1];

List<AssignedResource> existingAR = [
    SELECT Id FROM AssignedResource
    WHERE ServiceAppointmentId = :appt.Id AND ServiceResourceId = :bay1.Id LIMIT 1
];
if (existingAR.isEmpty()) {
    insert new AssignedResource(
        ServiceAppointmentId = appt.Id,
        ServiceResourceId    = bay1.Id
    );
    System.debug('Bay 1 assigned to appointment');
} else {
    System.debug('Bay 1 already assigned');
}

System.debug('✅ Scheduler seed complete');
System.debug('  Appointment: ' + appt.Id);
System.debug('  Bay: Bay Number One (' + bay1.Id + ')');
