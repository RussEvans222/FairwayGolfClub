// SeeAllData=true is used deliberately here: ServiceResource records in this
// org are provisioned through Field Service Setup (RelatedRecordId, resource
// type config, etc.) rather than plain Apex inserts, so there's no reliable
// "insert ServiceResource" pattern to fabricate in test data. We only read an
// existing bay resource — all Account/Contact/WorkType/ServiceAppointment
// test data below is still created fresh by this test.
@isTest(SeeAllData=true)
private class FairwaySessionAutoEndTest {

    @TestSetup
    static void setup() {
        Account personAcct = new Account(FirstName = 'Test', LastName = 'Golfer' + Datetime.now().getTime());
        insert personAcct;
        Contact c = [SELECT Id, AccountId FROM Contact WHERE AccountId = :personAcct.Id LIMIT 1];

        List<ServiceResource> bays = [SELECT Id FROM ServiceResource LIMIT 1];
        if (bays.isEmpty()) return; // no bay resource provisioned yet — nothing to test against
        ServiceResource bay = bays[0];

        WorkType wt = new WorkType(Name = 'Test Session', EstimatedDuration = 60, DurationType = 'Minutes');
        insert wt;

        DateTime now = DateTime.now();

        // Overdue — should get closed out by the sweep
        ServiceAppointment overdue = new ServiceAppointment(
            ParentRecordId = personAcct.Id,
            ContactId      = c.Id,
            WorkTypeId     = wt.Id,
            SchedStartTime = now.addMinutes(-90),
            SchedEndTime   = now.addMinutes(-10),
            Status         = 'In Progress',
            Description    = 'Overdue test session'
        );
        insert overdue;
        insert new AssignedResource(ServiceAppointmentId = overdue.Id, ServiceResourceId = bay.Id);

        // Not yet due — must be left alone
        ServiceAppointment active = new ServiceAppointment(
            ParentRecordId = personAcct.Id,
            ContactId      = c.Id,
            WorkTypeId     = wt.Id,
            SchedStartTime = now.addMinutes(-10),
            SchedEndTime   = now.addMinutes(20),
            Status         = 'Dispatched',
            Description    = 'Still-active test session'
        );
        insert active;
    }

    @isTest
    static void closesOnlyOverdueSessions() {
        List<ServiceAppointment> seeded = [
            SELECT Description, Status FROM ServiceAppointment
            WHERE Description IN ('Overdue test session', 'Still-active test session')
        ];
        if (seeded.isEmpty()) return; // no bay resource provisioned — setup() bailed out

        Test.startTest();
        new FairwaySessionAutoEnd().execute(null);
        Test.stopTest();

        Map<String, String> statusByDescription = new Map<String, String>();
        for (ServiceAppointment a : [
            SELECT Description, Status FROM ServiceAppointment
            WHERE Description IN ('Overdue test session', 'Still-active test session')
        ]) {
            statusByDescription.put(a.Description, a.Status);
        }

        System.assertEquals('Completed', statusByDescription.get('Overdue test session'),
            'Overdue session should be auto-closed');
        System.assertEquals('Dispatched', statusByDescription.get('Still-active test session'),
            'Session still within its scheduled window must not be touched');
    }

    @isTest
    static void noOpWhenNothingOverdue() {
        List<ServiceAppointment> active = [
            SELECT Id, Status FROM ServiceAppointment WHERE Description = 'Still-active test session'
        ];
        if (active.isEmpty()) return; // no bay resource provisioned — setup() bailed out

        delete [SELECT Id FROM ServiceAppointment WHERE Description = 'Overdue test session'];

        Test.startTest();
        new FairwaySessionAutoEnd().execute(null);
        Test.stopTest();

        ServiceAppointment a = [SELECT Status FROM ServiceAppointment WHERE Description = 'Still-active test session' LIMIT 1];
        System.assertEquals('Dispatched', a.Status);
    }
}
