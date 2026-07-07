trigger GolfSessionTrigger on Golf_Session__c (after update) {
    List<Golf_Session__c> justClosed = new List<Golf_Session__c>();
    for (Golf_Session__c s : Trigger.new) {
        Golf_Session__c old = Trigger.oldMap.get(s.Id);
        if (s.Status__c == 'Completed' && old.Status__c != 'Completed') {
            justClosed.add(s);
        }
    }
    if (!justClosed.isEmpty()) {
        SessionAggregateHandler.computeAggregates(justClosed);
    }
}
