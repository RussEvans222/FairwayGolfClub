// Apex REST wrapper so the kiosk PWA (fairway-kiosk) — which talks to
// Salesforce over plain REST, not Aura/LWC — can add a late-arriving golfer
// to an in-progress session. POST { sessionId, golferProfileId, displayName,
// isGuest } to /services/apexrest/FairwaySessionJoin/
@RestResource(urlMapping='/FairwaySessionJoin/*')
global with sharing class FairwaySessionJoinApi {

    @HttpPost
    global static FairwaySessionConsoleController.JoinResult join() {
        RestRequest req = RestContext.request;
        Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());

        String sessionId       = (String) body.get('sessionId');
        String golferProfileId = (String) body.get('golferProfileId');
        String displayName     = (String) body.get('displayName');
        Object isGuestRaw      = body.get('isGuest');
        Boolean isGuest        = isGuestRaw != null ? (Boolean) isGuestRaw : false;

        return FairwaySessionConsoleController.joinSession(sessionId, golferProfileId, displayName, isGuest);
    }
}
