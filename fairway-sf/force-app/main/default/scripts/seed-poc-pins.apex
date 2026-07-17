// Seed Member PINs for kiosk testing
// Marcus: 1234, Sarah: 5678
// Also reschedules today's reservation so it shows on the kiosk schedule

// Set PINs
Golfer_Profile__c marcus = [SELECT Id FROM Golfer_Profile__c
    WHERE Contact__c IN (SELECT Id FROM Contact WHERE Email = 'marcus.webb@poc.fairwaygolfclub.co') LIMIT 1];
Golfer_Profile__c sarah = [SELECT Id FROM Golfer_Profile__c
    WHERE Contact__c IN (SELECT Id FROM Contact WHERE Email = 'sarah.chen@poc.fairwaygolfclub.co') LIMIT 1];

marcus.Member_PIN__c = '1234';
sarah.Member_PIN__c  = '5678';
update new List<Golfer_Profile__c>{ marcus, sarah };

// Move reservation to today so it shows on the kiosk schedule
List<Bay_Reservation__c> reservations = [
    SELECT Id, Start_Time__c, End_Time__c FROM Bay_Reservation__c
    ORDER BY CreatedDate DESC LIMIT 1
];
if (!reservations.isEmpty()) {
    Bay_Reservation__c res = reservations[0];
    Date today = Date.today();
    res.Start_Time__c = DateTime.newInstance(today, Time.newInstance(14, 0, 0, 0)); // 2:00 PM today
    res.End_Time__c   = DateTime.newInstance(today, Time.newInstance(15, 0, 0, 0)); // 3:00 PM today
    res.Reservation_Status__c = 'Booked';
    update res;
    System.debug('✅ Reservation rescheduled to today 2–3 PM: ' + res.Id);
}

System.debug('✅ PINs set — Marcus: 1234, Sarah: 5678');
System.debug('Marcus profile: ' + marcus.Id);
System.debug('Sarah profile: ' + sarah.Id);
