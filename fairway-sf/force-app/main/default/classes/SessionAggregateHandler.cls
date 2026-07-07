public with sharing class SessionAggregateHandler {

    public static void computeAggregates(List<Golf_Session__c> closedSessions) {
        if (closedSessions.isEmpty()) return;

        Set<Id> sessionIds = new Map<Id, Golf_Session__c>(closedSessions).keySet();

        // Aggregate shots per session
        Map<Id, ShotAgg> aggBySession = new Map<Id, ShotAgg>();
        for (Id sid : sessionIds) {
            aggBySession.put(sid, new ShotAgg());
        }

        List<AggregateResult> shotAggs = [
            SELECT Golf_Session__c sid,
                   AVG(Ball_Speed__c) avgBallSpeed,
                   AVG(Carry_Distance__c) avgCarry,
                   AVG(Club_Speed__c) avgClubSpeed,
                   MAX(Carry_Distance__c) bestCarry,
                   COUNT(Id) shotCount
            FROM Golf_Shot__c
            WHERE Golf_Session__c IN :sessionIds
            GROUP BY Golf_Session__c
        ];

        for (AggregateResult ar : shotAggs) {
            Id sid = (Id)ar.get('sid');
            if (aggBySession.containsKey(sid)) {
                ShotAgg a = aggBySession.get(sid);
                a.avgBallSpeed   = (Decimal)ar.get('avgBallSpeed');
                a.avgCarry       = (Decimal)ar.get('avgCarry');
                a.avgClubSpeed   = (Decimal)ar.get('avgClubSpeed');
                a.bestCarry      = (Decimal)ar.get('bestCarry');
                a.shotCount      = (Integer)ar.get('shotCount');
            }
        }

        // Update Golf_Session__c aggregate fields
        List<Golf_Session__c> sessionsToUpdate = new List<Golf_Session__c>();
        for (Golf_Session__c s : closedSessions) {
            ShotAgg a = aggBySession.get(s.Id);
            Golf_Session__c upd = new Golf_Session__c(Id = s.Id);
            if (a.avgBallSpeed   != null) upd.Avg_Ball_Speed__c       = a.avgBallSpeed.setScale(1);
            if (a.avgCarry       != null) upd.Avg_Carry_Distance__c   = a.avgCarry.setScale(1);
            if (a.avgClubSpeed   != null) upd.Avg_Club_Speed__c       = a.avgClubSpeed.setScale(1);
            if (a.bestCarry      != null) upd.Best_Carry__c           = a.bestCarry.setScale(1);
            if (s.Session_Start__c != null && s.Session_End__c != null) {
                Long diffMs = s.Session_End__c.getTime() - s.Session_Start__c.getTime();
                upd.Session_Duration_Minutes__c = (Integer)(diffMs / 60000);
            }
            sessionsToUpdate.add(upd);
        }
        if (!sessionsToUpdate.isEmpty()) update sessionsToUpdate;

        // Update Golfer_Profile__c lifetime stats
        // Get all participant golfer profiles for these sessions
        Map<Id, Id> profileBySession = new Map<Id, Id>();
        for (Session_Participant__c sp : [
            SELECT Golf_Session__c, Golfer_Profile__c
            FROM Session_Participant__c
            WHERE Golf_Session__c IN :sessionIds
              AND Is_Primary_Booker__c = true
              AND Golfer_Profile__c != null
        ]) {
            profileBySession.put(sp.Golf_Session__c, sp.Golfer_Profile__c);
        }

        Set<Id> profileIds = new Set<Id>(profileBySession.values());
        if (profileIds.isEmpty()) return;

        Map<Id, AggregateResult> sessionCountByProfile = new Map<Id, AggregateResult>();
        for (AggregateResult ar : [
            SELECT sp.Golfer_Profile__c profileId, COUNT(Golf_Session__c) sessionCount
            FROM Session_Participant__c sp
            WHERE sp.Golfer_Profile__c IN :profileIds
            GROUP BY sp.Golfer_Profile__c
        ]) {
            sessionCountByProfile.put((Id)ar.get('profileId'), ar);
        }

        List<Golfer_Profile__c> profilesToUpdate = new List<Golfer_Profile__c>();
        for (Id profileId : profileIds) {
            Golfer_Profile__c upd = new Golfer_Profile__c(Id = profileId);
            if (sessionCountByProfile.containsKey(profileId)) {
                upd.Lifetime_Sessions__c = (Integer)sessionCountByProfile.get(profileId).get('sessionCount');
            }
            profilesToUpdate.add(upd);
        }
        if (!profilesToUpdate.isEmpty()) update profilesToUpdate;
    }

    private class ShotAgg {
        Decimal avgBallSpeed;
        Decimal avgCarry;
        Decimal avgClubSpeed;
        Decimal bestCarry;
        Integer shotCount = 0;
    }
}
