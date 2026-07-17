// Backfill profile/session rollups from existing completed sessions.
// Safe to run more than once — it recomputes aggregate fields from live data.

List<Golf_Session__c> completedSessions = [
    SELECT Id, Session_Start__c, Session_End__c, Status__c
    FROM Golf_Session__c
    WHERE Status__c = 'Completed'
];

if (completedSessions.isEmpty()) {
    System.debug('No completed sessions found to backfill.');
} else {
    SessionAggregateHandler.computeAggregates(completedSessions);
    System.debug('Recomputed rollups for ' + completedSessions.size() + ' completed sessions.');
}
