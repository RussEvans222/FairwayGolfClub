// ── Seed Membership + Badge Data (run after schema propagation) ───────
// Run this ~15 minutes after the initial objects deploy to allow
// the new fields (Membership__c all fields, Founding_Member_Badge__c) to propagate.

// Find the POC contacts
Contact marcus = [SELECT Id FROM Contact WHERE Email = 'marcus.webb@poc.fairwaygolfclub.co' LIMIT 1];
Contact sarah  = [SELECT Id FROM Contact WHERE Email = 'sarah.chen@poc.fairwaygolfclub.co'  LIMIT 1];

// Memberships (AutoNumber Name — do not set)
// Optional fields (Billing_Cycle__c, Monthly_Rate__c, Notes__c, Renewal_Date__c,
// Complimentary_Years_Remaining__c, Founding_Tier__c) omitted until they propagate.
Membership__c marcusMembership = new Membership__c(
    Contact__c = marcus.Id,
    Membership_Tier__c = 'Founding Member',
    Status__c = 'Complimentary',
    Start_Date__c = Date.today().addMonths(-2)
);
Membership__c sarahMembership = new Membership__c(
    Contact__c = sarah.Id,
    Membership_Tier__c = 'Member',
    Status__c = 'Active',
    Start_Date__c = Date.today().addMonths(-1)
);
insert new List<Membership__c>{ marcusMembership, sarahMembership };

// Founding_Member_Badge__c not yet propagated — skipped for now
// Golfer_Profile__c marcusProfile = [SELECT Id FROM Golfer_Profile__c WHERE Contact__c = :marcus.Id LIMIT 1];
// marcusProfile.Founding_Member_Badge__c = true;
// update marcusProfile;

// Add Practice Insight (look up Marcus profile directly)
Golfer_Profile__c marcusProfile = [SELECT Id FROM Golfer_Profile__c WHERE Contact__c = :marcus.Id LIMIT 1];
Practice_Insight__c insight = new Practice_Insight__c(
    Golf_Session__c = [SELECT Id FROM Golf_Session__c ORDER BY CreatedDate DESC LIMIT 1].Id,
    Golfer_Profile__c = marcusProfile.Id,
    Insight_Type__c = 'Distance Consistency',
    Severity__c = 'Medium',
    Observation__c = 'Your 7-iron carry variance was 19 yards this session (155–174 yds). Your center 6 shots clustered tightly at 163–172 yds.',
    Recommendation__c = 'Focus on a consistent pre-shot routine and ball position. Your tempo on the 174-yd shot was ideal — replicate that.',
    Confidence_Score__c = 87,
    Created_By_AI__c = true,
    Club__c = '7-Iron',
    Viewed_By_Golfer__c = false
);
insert insight;

System.debug('✅ Membership + Insight seeded (badges deferred — fields not yet propagated).');
System.debug('Marcus membership: ' + marcusMembership.Id);
System.debug('Sarah membership: ' + sarahMembership.Id);
System.debug('Insight: ' + insight.Id);
