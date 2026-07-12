// SeeAllData=true for the same reason as FairwaySessionAutoEndTest: ServiceResource
// (and, here, its migrated Simulator_Bay__c counterpart) are provisioned outside
// plain Apex inserts in this org, so tests read existing ones rather than
// fabricating them. Everything else (Account/Contact/WorkType/ServiceAppointment/
// AssignedResource/Golf_Session__c/Session_Participant__c) is created fresh per test.
@isTest
private class FairwaySessionCheckinApiTest {

    static Map<String, Id> setupData() {
        List<Simulator_Bay__c> bays = [SELECT Id, Service_Resource__c FROM Simulator_Bay__c WHERE Service_Resource__c != null LIMIT 1];
        if (bays.isEmpty()) return new Map<String, Id>(); // no migrated bay — nothing to test against

        Account personAcct = new Account(FirstName = 'Test', LastName = 'Checkin' + Datetime.now().getTime());
        insert personAcct;
        Contact c = [SELECT Id FROM Contact WHERE AccountId = :personAcct.Id LIMIT 1];

        WorkType wt = new WorkType(Name = 'Test Checkin Session', EstimatedDuration = 60, DurationType = 'Minutes');
        insert wt;

        ServiceAppointment appt = new ServiceAppointment(
            ParentRecordId = personAcct.Id,
            ContactId      = c.Id,
            WorkTypeId     = wt.Id,
            SchedStartTime = DateTime.now(),
            SchedEndTime   = DateTime.now().addHours(1),
            Status         = 'Dispatched',
            Description    = 'FairwaySessionCheckinApiTest'
        );
        insert appt;
        insert new AssignedResource(ServiceAppointmentId = appt.Id, ServiceResourceId = bays[0].Service_Resource__c);

        return new Map<String, Id>{ 'appointmentId' => appt.Id };
    }

    @isTest(SeeAllData=true)
    static void firstCallCreatesSessionAndPrimaryParticipant() {
        Map<String, Id> ids = setupData();
        if (ids.isEmpty()) return;

        RestRequest req = new RestRequest();
        req.requestUri = '/services/apexrest/FairwaySessionCheckin/';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'serviceAppointmentId' => ids.get('appointmentId'),
            'golferProfileId'      => null,
            'displayName'          => 'Test Golfer',
            'isGuest'              => false
        }));
        RestContext.request = req;

        Test.startTest();
        FairwaySessionConsoleController.EnsureSessionResult result = FairwaySessionCheckinApi.checkin();
        Test.stopTest();

        System.assertEquals(true, result.success, result.message);
        System.assertEquals(true, result.sessionWasCreated);
        System.assertEquals(1, result.slotAssigned);

        List<Golf_Session__c> sessions = [SELECT Id, Status__c, Session_Type__c FROM Golf_Session__c WHERE Service_Appointment__c = :ids.get('appointmentId')];
        System.assertEquals(1, sessions.size(), 'exactly one Golf_Session__c should exist');
        System.assertEquals('In Progress', sessions[0].Status__c);
        System.assertEquals('Practice', sessions[0].Session_Type__c);

        List<Session_Participant__c> sps = [SELECT Is_Primary_Booker__c, Display_Name__c FROM Session_Participant__c WHERE Golf_Session__c = :sessions[0].Id];
        System.assertEquals(1, sps.size());
        System.assertEquals(true, sps[0].Is_Primary_Booker__c);
        System.assertEquals('Test Golfer', sps[0].Display_Name__c);
    }

    @isTest(SeeAllData=true)
    static void secondCallForSameAppointmentIsNoOp() {
        Map<String, Id> ids = setupData();
        if (ids.isEmpty()) return;

        Map<String, Object> body = new Map<String, Object>{
            'serviceAppointmentId' => ids.get('appointmentId'),
            'golferProfileId'      => null,
            'displayName'          => 'Test Golfer',
            'isGuest'              => false
        };
        RestContext.request = new RestRequest();
        RestContext.request.requestBody = Blob.valueOf(JSON.serialize(body));

        Test.startTest();
        FairwaySessionConsoleController.EnsureSessionResult first = FairwaySessionCheckinApi.checkin();
        RestContext.request = new RestRequest();
        RestContext.request.requestBody = Blob.valueOf(JSON.serialize(body));
        FairwaySessionConsoleController.EnsureSessionResult second = FairwaySessionCheckinApi.checkin();
        Test.stopTest();

        System.assertEquals(true, first.success);
        System.assertEquals(true, second.success);
        System.assertEquals(false, second.sessionWasCreated, 'second call must not create another session');
        System.assertEquals(first.sessionId, second.sessionId);
        System.assertEquals(first.participantId, second.participantId);

        System.assertEquals(1, [SELECT COUNT() FROM Golf_Session__c WHERE Service_Appointment__c = :ids.get('appointmentId')]);
        System.assertEquals(1, [SELECT COUNT() FROM Session_Participant__c WHERE Golf_Session__c = :first.sessionId]);
    }

    @isTest(SeeAllData=true)
    static void failsGracefullyWithNoBayMapping() {
        Account personAcct = new Account(FirstName = 'Test', LastName = 'NoResource' + Datetime.now().getTime());
        insert personAcct;
        Contact c = [SELECT Id FROM Contact WHERE AccountId = :personAcct.Id LIMIT 1];
        WorkType wt = new WorkType(Name = 'Test No-Resource Session', EstimatedDuration = 60, DurationType = 'Minutes');
        insert wt;
        ServiceAppointment appt = new ServiceAppointment(
            ParentRecordId = personAcct.Id,
            ContactId      = c.Id,
            WorkTypeId     = wt.Id,
            SchedStartTime = DateTime.now(),
            SchedEndTime   = DateTime.now().addHours(1),
            Status         = 'Dispatched',
            Description    = 'FairwaySessionCheckinApiTest no AssignedResource'
        );
        insert appt;
        // Deliberately no AssignedResource inserted.

        RestContext.request = new RestRequest();
        RestContext.request.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'serviceAppointmentId' => appt.Id,
            'golferProfileId'      => null,
            'displayName'          => 'Test Golfer',
            'isGuest'              => false
        }));

        Test.startTest();
        FairwaySessionConsoleController.EnsureSessionResult result = FairwaySessionCheckinApi.checkin();
        Test.stopTest();

        System.assertEquals(false, result.success);
        System.assertEquals(0, [SELECT COUNT() FROM Golf_Session__c WHERE Service_Appointment__c = :appt.Id]);
    }

    @isTest(SeeAllData=true)
    static void guestPathSetsGuestFlagAndNullProfile() {
        Map<String, Id> ids = setupData();
        if (ids.isEmpty()) return;

        RestContext.request = new RestRequest();
        RestContext.request.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'serviceAppointmentId' => ids.get('appointmentId'),
            'golferProfileId'      => null,
            'displayName'          => 'Test Guest',
            'isGuest'              => true
        }));

        Test.startTest();
        FairwaySessionConsoleController.EnsureSessionResult result = FairwaySessionCheckinApi.checkin();
        Test.stopTest();

        System.assertEquals(true, result.success, result.message);
        Session_Participant__c sp = [SELECT Guest_Flag__c, Golfer_Profile__c FROM Session_Participant__c WHERE Id = :result.participantId];
        System.assertEquals(true, sp.Guest_Flag__c);
        System.assertEquals(null, sp.Golfer_Profile__c);
    }
}
