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

        // Lifetime_Shots__c — total shots across every session this golfer has ever
        // participated in (any slot, not just primary booker), same scope as sessionCount above.
        Map<Id, AggregateResult> shotCountByProfile = new Map<Id, AggregateResult>();
        for (AggregateResult ar : [
            SELECT gsh.Session_Participant__r.Golfer_Profile__c profileId, COUNT(Id) shotCount
            FROM Golf_Shot__c gsh
            WHERE gsh.Session_Participant__r.Golfer_Profile__c IN :profileIds
            GROUP BY gsh.Session_Participant__r.Golfer_Profile__c
        ]) {
            shotCountByProfile.put((Id)ar.get('profileId'), ar);
        }

        Map<Id, ProfileLifetimeAgg> lifetimeByProfile = new Map<Id, ProfileLifetimeAgg>();
        for (Id profileId : profileIds) {
            lifetimeByProfile.put(profileId, new ProfileLifetimeAgg());
        }

        for (AggregateResult ar : [
            SELECT gsh.Session_Participant__r.Golfer_Profile__c profileId,
                   gsh.Club__c club,
                   COUNT(Id) shotCount,
                   AVG(gsh.Carry_Distance__c) avgCarry
            FROM Golf_Shot__c gsh
            WHERE gsh.Session_Participant__r.Golfer_Profile__c IN :profileIds
              AND gsh.Club__c != null
            GROUP BY gsh.Session_Participant__r.Golfer_Profile__c, gsh.Club__c
        ]) {
            Id profileId = (Id)ar.get('profileId');
            ProfileLifetimeAgg agg = lifetimeByProfile.get(profileId);
            if (agg == null) continue;

            String club = (String)ar.get('club');
            Integer shotCount = (Integer)ar.get('shotCount');
            Decimal avgCarry = (Decimal)ar.get('avgCarry');
            agg.totalClubShots += shotCount != null ? shotCount : 0;

            if (club != null) {
                Integer clubCount = shotCount != null ? shotCount : 0;
                if (agg.favoriteClub == null || clubCount > agg.favoriteClubShotCount) {
                    agg.favoriteClub = club;
                    agg.favoriteClubShotCount = clubCount;
                }
            }

            String normalizedClub = normalizeClubName(club);
            if (normalizedClub == 'driver') {
                agg.driverCarryTotal = avgCarry;
                agg.driverShotCount = shotCount != null ? shotCount : 0;
            } else if (normalizedClub == '7iron') {
                agg.sevenIronCarryTotal = avgCarry;
                agg.sevenIronShotCount = shotCount != null ? shotCount : 0;
            }
        }

        Map<Id, AggregateResult> mostPlayedCourseByProfile = new Map<Id, AggregateResult>();
        for (AggregateResult ar : [
            SELECT sp.Golfer_Profile__c profileId, sp.Golf_Session__r.Course_Played__c course, COUNT(Golf_Session__c) sessionCount
            FROM Session_Participant__c sp
            WHERE sp.Golfer_Profile__c IN :profileIds
              AND sp.Is_Primary_Booker__c = true
              AND sp.Golf_Session__r.Course_Played__c != null
            GROUP BY sp.Golfer_Profile__c, sp.Golf_Session__r.Course_Played__c
        ]) {
            Id profileId = (Id)ar.get('profileId');
            ProfileLifetimeAgg agg = lifetimeByProfile.get(profileId);
            if (agg == null) continue;

            Integer sessionCount = (Integer)ar.get('sessionCount');
            if (sessionCount != null && sessionCount > agg.mostPlayedCourseCount) {
                agg.mostPlayedCourse = (String)ar.get('course');
                agg.mostPlayedCourseCount = sessionCount;
            }
        }

        // Last_Session_Date__c — most recent session end date across any participation.
        Map<Id, AggregateResult> lastSessionByProfile = new Map<Id, AggregateResult>();
        for (AggregateResult ar : [
            SELECT sp.Golfer_Profile__c profileId, MAX(sp.Golf_Session__r.Session_End__c) lastDate
            FROM Session_Participant__c sp
            WHERE sp.Golfer_Profile__c IN :profileIds
            GROUP BY sp.Golfer_Profile__c
        ]) {
            lastSessionByProfile.put((Id)ar.get('profileId'), ar);
        }

        List<Golfer_Profile__c> profilesToUpdate = new List<Golfer_Profile__c>();
        for (Id profileId : profileIds) {
            Golfer_Profile__c upd = new Golfer_Profile__c(Id = profileId);
            if (sessionCountByProfile.containsKey(profileId)) {
                upd.Lifetime_Sessions__c = (Integer)sessionCountByProfile.get(profileId).get('sessionCount');
            }
            if (shotCountByProfile.containsKey(profileId)) {
                upd.Lifetime_Shots__c = (Integer)shotCountByProfile.get(profileId).get('shotCount');
            }
            ProfileLifetimeAgg lifetime = lifetimeByProfile.get(profileId);
            if (lifetime != null) {
                if (lifetime.driverCarryTotal != null) upd.Average_Driver_Carry__c = lifetime.driverCarryTotal.setScale(1);
                if (lifetime.sevenIronCarryTotal != null) upd.Average_7_Iron_Carry__c = lifetime.sevenIronCarryTotal.setScale(1);
                if (lifetime.favoriteClub != null) upd.Favorite_Club__c = lifetime.favoriteClub;
                if (lifetime.mostPlayedCourse != null) upd.Most_Played_Course__c = lifetime.mostPlayedCourse;
            }
            if (lastSessionByProfile.containsKey(profileId)) {
                Datetime lastDt = (Datetime)lastSessionByProfile.get(profileId).get('lastDate');
                if (lastDt != null) upd.Last_Session_Date__c = lastDt.date();
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

    private class ProfileLifetimeAgg {
        Decimal driverCarryTotal;
        Integer driverShotCount = 0;
        Decimal sevenIronCarryTotal;
        Integer sevenIronShotCount = 0;
        String favoriteClub;
        Integer favoriteClubShotCount = 0;
        String mostPlayedCourse;
        Integer mostPlayedCourseCount = 0;
        Integer totalClubShots = 0;
    }

    private static String normalizeClubName(String club) {
        if (String.isBlank(club)) return null;
        return club.replaceAll('[^A-Za-z0-9]', '').toLowerCase();
    }
}
