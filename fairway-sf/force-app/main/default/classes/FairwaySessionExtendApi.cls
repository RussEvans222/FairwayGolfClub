// Apex REST wrapper so the bay-screen PWA (fairway-bay) — which talks to
// Salesforce over plain REST, not Aura/LWC — can call the same smart-extend
// logic the staff session console uses. POST { appointmentId, minutes } to
// /services/apexrest/FairwaySessionExtend/
@RestResource(urlMapping='/FairwaySessionExtend/*')
global with sharing class FairwaySessionExtendApi {

    @HttpPost
    global static FairwaySessionConsoleController.ExtendResult extend() {
        RestRequest req = RestContext.request;
        Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());

        String appointmentId = (String) body.get('appointmentId');
        Object minutesRaw    = body.get('minutes');
        Integer minutes      = minutesRaw != null ? Integer.valueOf(String.valueOf(minutesRaw)) : null;

        return FairwaySessionConsoleController.extendSessionSmart(appointmentId, minutes);
    }
}
