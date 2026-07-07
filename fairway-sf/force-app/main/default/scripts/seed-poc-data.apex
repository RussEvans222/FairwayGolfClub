// ── Seed POC Data for Fairway Golf Club ──────────────────────────────
// Uses only fields from the original objects deploy batch (pre-propagation safe).
// New fields (Founding_Member_Badge__c, Lifetime_Sessions__c, Membership__c fields, etc.)
// will be visible once the STORM org finishes schema propagation (~15 min after deploy).

// Simulator Bays (AutoNumber Name — do not set, Bay_Number__c is Text)
Simulator_Bay__c bay1 = new Simulator_Bay__c(
    Bay_Number__c = 'BAY-1',
    Location__c = 'Main Floor',
    Launch_Monitor_Type__c = 'Foresight',
    Simulator_Software__c = 'FSX 2020',
    Status__c = 'Available',
    Device_Identifier__c = 'BAY-001-FGQ'
);
Simulator_Bay__c bay2 = new Simulator_Bay__c(
    Bay_Number__c = 'BAY-2',
    Location__c = 'Main Floor',
    Launch_Monitor_Type__c = 'Foresight',
    Simulator_Software__c = 'FSX 2020',
    Status__c = 'Available',
    Device_Identifier__c = 'BAY-002-FGQ'
);
insert new List<Simulator_Bay__c>{ bay1, bay2 };

// Contacts
Contact marcus = new Contact(
    FirstName = 'Marcus',
    LastName = 'Webb',
    Email = 'marcus.webb@poc.fairwaygolfclub.co',
    Phone = '(571) 555-0101',
    MailingCity = 'Fairfax',
    MailingState = 'VA'
);
Contact sarah = new Contact(
    FirstName = 'Sarah',
    LastName = 'Chen',
    Email = 'sarah.chen@poc.fairwaygolfclub.co',
    Phone = '(571) 555-0202',
    MailingCity = 'Alexandria',
    MailingState = 'VA'
);
insert new List<Contact>{ marcus, sarah };

// Golfer Profiles (AutoNumber Name — do not set)
Golfer_Profile__c marcusProfile = new Golfer_Profile__c(
    Contact__c = marcus.Id,
    Handicap__c = 12,
    Skill_Segment__c = 'Intermediate',
    AI_Coaching_Enabled__c = true,
    Current_Focus__c = 'Approach shot consistency',
    Preferred_Practice_Mode__c = 'Range',
    Average_Driver_Carry__c = 241,
    Average_7_Iron_Carry__c = 163,
    Typical_Miss__c = 'Slight fade',
    Most_Consistent_Club__c = '8-Iron',
    Least_Consistent_Club__c = 'Driver'
);
Golfer_Profile__c sarahProfile = new Golfer_Profile__c(
    Contact__c = sarah.Id,
    Handicap__c = 24,
    Skill_Segment__c = 'Beginner',
    AI_Coaching_Enabled__c = true,
    Current_Focus__c = 'Ball contact fundamentals',
    Preferred_Practice_Mode__c = 'Range',
    Average_Driver_Carry__c = 168,
    Average_7_Iron_Carry__c = 110,
    Typical_Miss__c = 'Pull-left'
);
insert new List<Golfer_Profile__c>{ marcusProfile, sarahProfile };

// Reservation (AutoNumber Name — do not set)
Bay_Reservation__c reservation = new Bay_Reservation__c(
    Bay__c = bay1.Id,
    Booker__c = marcus.Id,
    Start_Time__c = DateTime.now().addHours(-2),
    End_Time__c = DateTime.now(),
    Reservation_Status__c = 'Completed',  // 'Completed' per picklist
    Payment_Status__c = 'Paid',
    Number_of_Players__c = 2,
    Booking_Source__c = 'Walk-in',
    Access_Code__c = '7421'
);
insert reservation;

// Golf Session (AutoNumber Name — do not set)
Golf_Session__c session = new Golf_Session__c(
    Bay__c = bay1.Id,
    Reservation__c = reservation.Id,
    Session_Type__c = 'Practice',
    Status__c = 'In Progress',
    Session_Start__c = DateTime.now().addHours(-2),
    Data_Processing_Status__c = 'Pending'
);
insert session;

// Session Participants (AutoNumber Name — do not set)
Session_Participant__c marcusSP = new Session_Participant__c(
    Golf_Session__c = session.Id,
    Golfer_Profile__c = marcusProfile.Id,
    Is_Primary_Booker__c = true,
    Guest_Flag__c = false,
    Simulator_Player_Slot__c = 1,
    Display_Name__c = 'Marcus',
    Handicap_At_Time_Of_Play__c = 12,
    AI_Coaching_Enabled_For_Session__c = true
);
Session_Participant__c guestSP = new Session_Participant__c(
    Golf_Session__c = session.Id,
    Golfer_Profile__c = sarahProfile.Id,
    Is_Primary_Booker__c = false,
    Guest_Flag__c = false,
    Simulator_Player_Slot__c = 2,
    Display_Name__c = 'Sarah',
    Handicap_At_Time_Of_Play__c = 24,
    AI_Coaching_Enabled_For_Session__c = false
);
insert new List<Session_Participant__c>{ marcusSP, guestSP };

// Golf Shots — 10 mock 7-iron practice shots for Marcus (AutoNumber Name — do not set)
List<Golf_Shot__c> shots = new List<Golf_Shot__c>();
Decimal[] carrys = new Decimal[]{ 158, 165, 172, 161, 170, 168, 163, 174, 155, 171 };
Decimal[] ballSpeeds = new Decimal[]{ 112, 117, 121, 114, 120, 119, 116, 122, 110, 120 };
for (Integer i = 0; i < 10; i++) {
    shots.add(new Golf_Shot__c(
        Golf_Session__c = session.Id,
        Session_Participant__c = marcusSP.Id,
        Bay__c = bay1.Id,
        Shot_Number__c = i + 1,
        Club__c = '7-Iron',
        Carry_Distance__c = carrys[i],
        Total_Distance__c = carrys[i] + 8,
        Ball_Speed__c = ballSpeeds[i],
        Launch_Angle__c = 18.5,
        Spin_Rate__c = 6800,
        Shot_Shape__c = 'Straight',
        Shot_Context__c = 'Range',
        Data_Tier__c = 'Ball Only',
        Is_Mulligan__c = false,
        Timestamp__c = DateTime.now().addMinutes(-(10 - i) * 7)
    ));
}
insert shots;

// NOTE: Session is left In Progress intentionally.
// Close it manually (or via seed-poc-close-session.apex) after schema propagation (~15 min)
// so the GolfSessionTrigger can write to the aggregate fields (Avg_Ball_Speed__c, etc.).

System.debug('✅ POC seed data created. Session left In Progress — close it after schema propagation.');
System.debug('Bay 1: ' + bay1.Id + ' | Bay 2: ' + bay2.Id);
System.debug('Marcus Contact: ' + marcus.Id + ' | Profile: ' + marcusProfile.Id);
System.debug('Sarah Contact: ' + sarah.Id + ' | Profile: ' + sarahProfile.Id);
System.debug('Session: ' + session.Id);
System.debug('Shots: ' + shots.size() + ' records inserted');
System.debug('NOTE: Membership records and Founding_Member_Badge__c require schema propagation — run seed-poc-memberships.apex after ~15 min');
