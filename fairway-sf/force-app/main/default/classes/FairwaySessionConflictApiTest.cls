// SeeAllData=true — same reason as the other kiosk REST test classes:
// ServiceResource/Simulator_Bay__c mapping isn't reliably fabricated via
// plain Apex inserts in this org, so this reads a real migrated bay rather
// than creating one.
@isTest
private class FairwaySessionConflictApiTest {

    static Map<String, Id> setupData() {
        List<Simulator_Bay__c> bays = [SELECT Id, Service_Resource__c FROM Simulator_Bay__c WHERE Service_Resource__c != null LIMIT 1];
        if (bays.isEmpty()) return new Map<String, Id>();

        Account acct = new Account(FirstName = 'Test', LastName = 'Conflict' + Datetime.now().getTime());
        insert acct;
        Contact c = [SELECT Id FROM Contact WHERE AccountId = :acct.Id LIMIT 1];
        Golfer_Profile__c profile = new Golfer_Profile__c(Contact__c = c.Id, Skill_Segment__c = 'Intermediate');
        insert profile;

        WorkType wt = new WorkType(Name = 'Test Conflict Session', EstimatedDuration = 60, DurationType = 'Minutes');
        insert wt;
        ServiceAppointment appt = new ServiceAppointment(
            ParentRecordId = acct.Id, ContactId = c.Id, WorkTypeId = wt.Id,
            SchedStartTime = DateTime.now(), SchedEndTime = DateTime.now().addHours(1),
            Status = 'Dispatched', Description = 'FairwaySessionConflictApiTest'
        );
        insert appt;
        insert new AssignedResource(ServiceAppointmentId = appt.Id, ServiceResourceId = bays[0].Service_Resource__c);

        FairwaySessionConsoleController.EnsureSessionResult ensured =
            FairwaySessionConsoleController.ensureCheckedInSession(appt.Id, profile.Id, 'Conflict Test Golfer', false);
        System.assertEquals(true, ensured.success, ensured.message);

        return new Map<String, Id>{ 'profileId' => profile.Id };
    }

    @isTest(SeeAllData=true)
    static void returnsConflictingBayWhenAlreadyActive() {
        Map<String, Id> ids = setupData();
        if (ids.isEmpty()) return;

        RestContext.request = new RestRequest();
        RestContext.request.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'golferProfileId' => ids.get('profileId')
        }));

        Test.startTest();
        FairwaySessionConflictApi.ConflictCheckResult result = FairwaySessionConflictApi.check();
        Test.stopTest();

        System.assertNotEquals(null, result.conflictBayName, 'should report the bay the golfer is already checked into');
    }

    @isTest(SeeAllData=true)
    static void returnsNullWhenNoConflict() {
        RestContext.request = new RestRequest();
        RestContext.request.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'golferProfileId' => null
        }));

        Test.startTest();
        FairwaySessionConflictApi.ConflictCheckResult result = FairwaySessionConflictApi.check();
        Test.stopTest();

        System.assertEquals(null, result.conflictBayName);
    }
}
