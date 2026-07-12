public with sharing class GolfSessionSyncHandler {

    public static void closeSessionsForAppointments(List<Id> appointmentIds) {
        List<Golf_Session__c> openSessions = [
            SELECT Id, Status__c
            FROM Golf_Session__c
            WHERE Service_Appointment__c IN :appointmentIds
              AND Status__c != 'Completed'
        ];
        if (openSessions.isEmpty()) return;

        for (Golf_Session__c s : openSessions) {
            s.Status__c = 'Completed';
        }
        update openSessions;
    }
}
