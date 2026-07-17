@IsTest
private class SessionAggregateHandlerTest {

    @TestSetup
    static void makeData() {
        Simulator_Bay__c bay = new Simulator_Bay__c(
            Bay_Number__c = '1',
            Location__c = 'Test Floor',
            Launch_Monitor_Type__c = 'Foresight',
            Simulator_Software__c = 'FSX 2020',
            Status__c = 'Available',
            Device_Identifier__c = 'TEST-BAY-001'
        );
        insert bay;

        Contact c = new Contact(FirstName = 'Test', LastName = 'Golfer', Email = 'test.golfer@test.fairwaygolfclub.co');
        insert c;

        Golfer_Profile__c profile = new Golfer_Profile__c(
            Contact__c = c.Id,
            Handicap__c = 15,
            Skill_Segment__c = 'Intermediate',
            AI_Coaching_Enabled__c = true
        );
        insert profile;

        Bay_Reservation__c res = new Bay_Reservation__c(
            Bay__c = bay.Id,
            Booker__c = c.Id,
            Start_Time__c = DateTime.now().addHours(-2),
            End_Time__c = DateTime.now().addHours(-0),
            Reservation_Status__c = 'Booked',
            Payment_Status__c = 'Paid',
            Number_of_Players__c = 1,
            Booking_Source__c = 'Walk-in',
            Access_Code__c = '1234'
        );
        insert res;

        Golf_Session__c session = new Golf_Session__c(
            Bay__c = bay.Id,
            Reservation__c = res.Id,
            Session_Type__c = 'Practice',
            Status__c = 'In Progress',
            Session_Start__c = DateTime.now().addHours(-1),
            Course_Played__c = 'Pebble Beach',
            Data_Processing_Status__c = 'Pending'
        );
        insert session;

        Session_Participant__c sp = new Session_Participant__c(
            Golf_Session__c = session.Id,
            Golfer_Profile__c = profile.Id,
            Is_Primary_Booker__c = true,
            Guest_Flag__c = false,
            Simulator_Player_Slot__c = 1,
            Display_Name__c = 'Test Golfer'
        );
        insert sp;

        List<Golf_Shot__c> shots = new List<Golf_Shot__c>();
        for (Integer i = 0; i < 5; i++) {
            shots.add(new Golf_Shot__c(
                Golf_Session__c = session.Id,
                Session_Participant__c = sp.Id,
                Bay__c = bay.Id,
                Shot_Number__c = i + 1,
                Club__c = '7-Iron',
                Carry_Distance__c = 155 + (i * 5),
                Total_Distance__c = 163 + (i * 5),
                Ball_Speed__c = 110 + i,
                Launch_Angle__c = 18.0,
                Spin_Rate__c = 6500,
                Shot_Shape__c = 'Straight',
                Shot_Context__c = 'Range',
                Data_Tier__c = 'Ball Only',
                Is_Mulligan__c = false,
                Timestamp__c = DateTime.now().addMinutes(-30 + (i * 5))
            ));
        }
        shots.add(new Golf_Shot__c(
            Golf_Session__c = session.Id,
            Session_Participant__c = sp.Id,
            Bay__c = bay.Id,
            Shot_Number__c = 6,
            Club__c = 'Driver',
            Carry_Distance__c = 240,
            Total_Distance__c = 260,
            Ball_Speed__c = 150,
            Launch_Angle__c = 12.0,
            Spin_Rate__c = 2500,
            Shot_Shape__c = 'Straight',
            Shot_Context__c = 'Tee',
            Data_Tier__c = 'Ball Only',
            Is_Mulligan__c = false,
            Timestamp__c = DateTime.now().addMinutes(-2)
        ));
        shots.add(new Golf_Shot__c(
            Golf_Session__c = session.Id,
            Session_Participant__c = sp.Id,
            Bay__c = bay.Id,
            Shot_Number__c = 7,
            Club__c = 'Driver',
            Carry_Distance__c = 250,
            Total_Distance__c = 271,
            Ball_Speed__c = 152,
            Launch_Angle__c = 11.5,
            Spin_Rate__c = 2450,
            Shot_Shape__c = 'Straight',
            Shot_Context__c = 'Tee',
            Data_Tier__c = 'Ball Only',
            Is_Mulligan__c = false,
            Timestamp__c = DateTime.now().addMinutes(-1)
        ));
        insert shots;
    }

    @IsTest
    static void testAggregatesComputedOnSessionClose() {
        Golf_Session__c session = [SELECT Id, Status__c, Session_Start__c FROM Golf_Session__c LIMIT 1];

        Test.startTest();
        session.Status__c = 'Completed';
        session.Session_End__c = DateTime.now();
        update session;
        Test.stopTest();

        Golf_Session__c updated = [
            SELECT Avg_Ball_Speed__c, Avg_Carry_Distance__c, Best_Carry__c, Session_Duration_Minutes__c
            FROM Golf_Session__c
            WHERE Id = :session.Id
        ];

        System.assertNotEquals(null, updated.Avg_Ball_Speed__c, 'Avg ball speed should be computed');
        System.assertNotEquals(null, updated.Avg_Carry_Distance__c, 'Avg carry should be computed');
        System.assertNotEquals(null, updated.Best_Carry__c, 'Best carry should be computed');
        // Best carry of 5 shots: 155, 160, 165, 170, 175 — max should be 175
        System.assertEquals(250, updated.Best_Carry__c, 'Best carry should be 250 yds');
        System.assertNotEquals(null, updated.Session_Duration_Minutes__c, 'Duration should be computed');
    }

    @IsTest
    static void testGolferProfileLifetimeSessionsUpdated() {
        Golf_Session__c session = [SELECT Id FROM Golf_Session__c LIMIT 1];
        Golfer_Profile__c profile = [SELECT Id, Lifetime_Sessions__c FROM Golfer_Profile__c LIMIT 1];

        Test.startTest();
        session.Status__c = 'Completed';
        session.Session_End__c = DateTime.now();
        update session;
        Test.stopTest();

        Golfer_Profile__c updated = [
            SELECT Lifetime_Sessions__c, Lifetime_Shots__c, Last_Session_Date__c,
                   Average_Driver_Carry__c, Average_7_Iron_Carry__c,
                   Favorite_Club__c, Most_Played_Course__c
            FROM Golfer_Profile__c WHERE Id = :profile.Id
        ];
        System.assertEquals(1, updated.Lifetime_Sessions__c, 'Lifetime sessions should be 1 after first session closes');
        System.assertEquals(7, updated.Lifetime_Shots__c, 'Lifetime shots should be 7 (from @TestSetup shots)');
        System.assertEquals(Date.today(), updated.Last_Session_Date__c, 'Last session date should be today');
        System.assertEquals(245, updated.Average_Driver_Carry__c, 'Average driver carry should roll up from driver shots');
        System.assertEquals(165, updated.Average_7_Iron_Carry__c, 'Average 7-iron carry should roll up from 7-iron shots');
        System.assertEquals('7-Iron', updated.Favorite_Club__c, 'Favorite club should be the most-used club');
        System.assertEquals('Pebble Beach', updated.Most_Played_Course__c, 'Most played course should roll up from completed sessions');
    }

    @IsTest
    static void testNoTriggerOnNonCompletedUpdate() {
        Golf_Session__c session = [SELECT Id, Status__c FROM Golf_Session__c LIMIT 1];

        Test.startTest();
        // Update to a non-Completed status — handler should NOT fire
        session.Status__c = 'In Progress';
        update session;
        Test.stopTest();

        Golf_Session__c updated = [SELECT Avg_Ball_Speed__c FROM Golf_Session__c WHERE Id = :session.Id];
        System.assertEquals(null, updated.Avg_Ball_Speed__c, 'Aggregates should not be computed for non-Completed update');
    }

    @IsTest
    static void testEmptySessionHandledGracefully() {
        // Session with no shots — handler should not throw
        Simulator_Bay__c bay = [SELECT Id FROM Simulator_Bay__c LIMIT 1];
        Contact c = [SELECT Id FROM Contact LIMIT 1];

        Bay_Reservation__c res = new Bay_Reservation__c(
            Bay__c = bay.Id,
            Booker__c = c.Id,
            Start_Time__c = DateTime.now().addHours(-1),
            End_Time__c = DateTime.now(),
            Reservation_Status__c = 'Booked',
            Payment_Status__c = 'Paid',
            Number_of_Players__c = 1,
            Booking_Source__c = 'Walk-in',
            Access_Code__c = '9999'
        );
        insert res;

        Golf_Session__c emptySession = new Golf_Session__c(
            Bay__c = bay.Id,
            Reservation__c = res.Id,
            Session_Type__c = 'Practice',
            Status__c = 'In Progress',
            Session_Start__c = DateTime.now().addMinutes(-30),
            Data_Processing_Status__c = 'Pending'
        );
        insert emptySession;

        Test.startTest();
        emptySession.Status__c = 'Completed';
        emptySession.Session_End__c = DateTime.now();
        update emptySession;
        Test.stopTest();

        // No exception thrown = pass. Aggregates should be null (no shots)
        Golf_Session__c updated = [SELECT Avg_Ball_Speed__c FROM Golf_Session__c WHERE Id = :emptySession.Id];
        System.assertEquals(null, updated.Avg_Ball_Speed__c, 'No shots means null avg ball speed');
    }
}
