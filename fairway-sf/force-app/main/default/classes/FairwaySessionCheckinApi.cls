// Apex REST wrapper so the kiosk PWA can ensure a Golf_Session__c exists for
// a checked-in ServiceAppointment, and add the checking-in golfer as the
// primary Session_Participant__c. POST { serviceAppointmentId,
// golferProfileId, displayName, isGuest } to
// /services/apexrest/FairwaySessionCheckin/
@RestResource(urlMapping='/FairwaySessionCheckin/*')
global with sharing class FairwaySessionCheckinApi {

    @HttpPost
    global static FairwaySessionConsoleController.EnsureSessionResult checkin() {
        RestRequest req = RestContext.request;
        Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());

        String serviceAppointmentId = (String) body.get('serviceAppointmentId');
        String golferProfileId      = (String) body.get('golferProfileId');
        String displayName          = (String) body.get('displayName');
        Object isGuestRaw           = body.get('isGuest');
        Boolean isGuest             = isGuestRaw != null ? (Boolean) isGuestRaw : false;

        return FairwaySessionConsoleController.ensureCheckedInSession(
            serviceAppointmentId, golferProfileId, displayName, isGuest);
    }
}
