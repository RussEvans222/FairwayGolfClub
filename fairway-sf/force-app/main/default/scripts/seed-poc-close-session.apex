// ── Close POC Session (run after schema propagation) ─────────────────
// Fires GolfSessionTrigger to compute aggregate fields on Golf_Session__c
// and increment Golfer_Profile__c.Lifetime_Sessions__c.
// Run ~15 minutes after the objects deploy.

Golf_Session__c session = [
    SELECT Id, Status__c FROM Golf_Session__c
    WHERE Status__c = 'In Progress'
    ORDER BY CreatedDate DESC
    LIMIT 1
];
session.Status__c = 'Completed';
session.Session_End__c = DateTime.now().addMinutes(-5);
session.Total_Shots__c = 10;
session.Data_Processing_Status__c = 'Processed';
update session;

// Aggregate fields (Avg_Ball_Speed__c etc.) not yet propagated — verify status only
Golf_Session__c result = [SELECT Id, Status__c FROM Golf_Session__c WHERE Id = :session.Id];
System.debug('✅ Session closed. Status: ' + result.Status__c);
System.debug('Aggregate field verification deferred — fields not yet in Apex execution engine.');
