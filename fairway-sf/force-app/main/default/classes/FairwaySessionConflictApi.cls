// Apex REST wrapper so the kiosk PWA can check, *before* creating a new
// ServiceAppointment/bay assignment, whether a golfer is already an active
// participant in a different in-progress session. A golfer can't physically
// be in two bays at once — this is the early check; joinSession() and
// ensureCheckedInSession() also guard the same rule as a backstop for
// whatever slips past this one (e.g. two kiosks racing at the same moment).
// POST { golferProfileId } to /services/apexrest/FairwaySessionConflict/ —
// returns { conflictBayName } (null when clear). Wrapped in an object rather
// than returning a bare String: a null String REST response body comes back
// as a genuinely empty (0-byte) response, not the 4-char JSON literal
// "null" — which would throw in the kiosk's res.json() parsing. An object
// always serializes to valid JSON even when its one field is null.
@RestResource(urlMapping='/FairwaySessionConflict/*')
global with sharing class FairwaySessionConflictApi {

    global class ConflictCheckResult {
        @AuraEnabled public String conflictBayName;
    }

    @HttpPost
    global static ConflictCheckResult check() {
        RestRequest req = RestContext.request;
        Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());

        String golferProfileId = (String) body.get('golferProfileId');
        ConflictCheckResult result = new ConflictCheckResult();
        result.conflictBayName = FairwaySessionConsoleController.findConflictingActiveBay(golferProfileId, null);
        return result;
    }
}
