@IsTest
private class GolfSessionSyncHandlerTest {

    @TestSetup
    static void makeData() {
        Simulator_Bay__c bay = new Simulator_Bay__c(
            Bay_Number__c = '1',
            Location__c = 'Test Floor',
            Launch_Monitor_Type__c = 'Foresight',
            Simulator_Software__c = 'FSX 2020',
            Status__c = 'Available',
            Device_Identifier__c = 'TEST-BAY-SYNC-001'
        );
        insert bay;

        Account acct = new Account(Name = 'Test Golfer Account');
        insert acct;
        Contact c = new Contact(FirstName = 'Test', LastName = 'Golfer', AccountId = acct.Id);
        insert c;

        WorkType wt = new WorkType(Name = 'Test Session Sync', EstimatedDuration = 60, DurationType = 'Minutes');
        insert wt;

        DateTime now = DateTime.now();
        ServiceAppointment sa = new ServiceAppointment(
            ParentRecordId = acct.Id,
            ContactId      = c.Id,
            WorkTypeId     = wt.Id,
            SchedStartTime = now.addMinutes(-60),
            SchedEndTime   = now,
            Status         = 'Dispatched'
        );
        insert sa;

        Golf_Session__c session = new Golf_Session__c(
            Bay__c = bay.Id,
            Service_Appointment__c = sa.Id,
            Session_Type__c = 'Practice',
            Status__c = 'In Progress',
            Session_Start__c = now.addMinutes(-45),
            Data_Processing_Status__c = 'Pending'
        );
        insert session;
    }

    @IsTest
    static void testSessionClosesWhenAppointmentCompletes() {
        ServiceAppointment sa = [SELECT Id FROM ServiceAppointment LIMIT 1];

        Test.startTest();
        sa.Status = 'Completed';
        update sa;
        Test.stopTest();

        Golf_Session__c session = [SELECT Status__c FROM Golf_Session__c LIMIT 1];
        System.assertEquals('Completed', session.Status__c,
            'Linked Golf_Session__c should close when its ServiceAppointment completes');
    }

    @IsTest
    static void testSessionUntouchedOnNonCompletingStatusChange() {
        ServiceAppointment sa = [SELECT Id FROM ServiceAppointment LIMIT 1];

        Test.startTest();
        sa.Status = 'In Progress';
        update sa;
        Test.stopTest();

        Golf_Session__c session = [SELECT Status__c FROM Golf_Session__c LIMIT 1];
        System.assertEquals('In Progress', session.Status__c,
            'Session should not be touched by a non-Completed status change');
    }

    @IsTest
    static void testAlreadyCompletedSessionIsIdempotent() {
        Golf_Session__c session = [SELECT Id FROM Golf_Session__c LIMIT 1];
        session.Status__c = 'Completed';
        update session;

        ServiceAppointment sa = [SELECT Id FROM ServiceAppointment LIMIT 1];

        Test.startTest();
        sa.Status = 'Completed';
        update sa; // no-op transition (already Completed -> Completed on the appointment itself is skipped by
                   // the trigger's old/new comparison, but exercise the handler directly too via a real change)
        sa.Status = 'Cannot Complete';
        update sa;
        sa.Status = 'Completed';
        update sa;
        Test.stopTest();

        Golf_Session__c updated = [SELECT Status__c FROM Golf_Session__c WHERE Id = :session.Id];
        System.assertEquals('Completed', updated.Status__c, 'Already-completed session should remain Completed, no error');
    }

    @IsTest
    static void testAppointmentWithNoLinkedSessionDoesNotThrow() {
        Account acct = new Account(Name = 'Unlinked Appt Account');
        insert acct;
        Contact c = new Contact(FirstName = 'No', LastName = 'Session', AccountId = acct.Id);
        insert c;
        WorkType wt = [SELECT Id FROM WorkType LIMIT 1];

        DateTime now = DateTime.now();
        ServiceAppointment sa = new ServiceAppointment(
            ParentRecordId = acct.Id,
            ContactId      = c.Id,
            WorkTypeId     = wt.Id,
            SchedStartTime = now.addMinutes(-30),
            SchedEndTime   = now,
            Status         = 'Dispatched'
        );
        insert sa;

        Test.startTest();
        ServiceAppointment toClose = [SELECT Id FROM ServiceAppointment WHERE Id = :sa.Id];
        toClose.Status = 'Completed';
        update toClose;
        Test.stopTest();

        // No exception thrown = pass.
        System.assertEquals('Completed', [SELECT Status FROM ServiceAppointment WHERE Id = :sa.Id].Status);
    }
}
