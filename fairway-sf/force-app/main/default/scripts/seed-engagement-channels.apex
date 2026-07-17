// Seed the 3 EngagementChannelType records Business Stats' walk-in-vs-booked
// split (FairwayOpsDashboardController.getChannelSplit) depends on.
// EngagementChannelType is data, not metadata — can't be deployed via
// `sf project deploy`, so this has to be run once with `sf apex run`.
// Safe to re-run — skips creation if a channel of that name already exists.
//
// "In Person" = walk-in (set by fairway-kiosk's createWalkInAppointment).
// "Phone" and "Community" = booked ahead (Case 3 phone/staff-booked and
// Case 1 Experience Cloud self-booking, per BOOKING_CHECKIN_PROCESS.md) —
// neither of those write paths sets EngagementChannelTypeId yet; that's a
// separate follow-up (the Experience Cloud booking Flow lives only in Setup,
// no source control, so it has to be wired up there by hand).
//
// If your org rejects EngagementChannelType inserts via anonymous Apex
// (some Scheduler feature objects require Setup UI), create these 3 records
// manually instead: Setup → Salesforce Scheduler → Engagement Channels.
public class FairwayEngagementChannelSeed {
    public void run() {
        for (String channelName : new List<String>{ 'In Person', 'Phone', 'Community' }) {
            List<EngagementChannelType> existing = [
                SELECT Id FROM EngagementChannelType WHERE Name = :channelName LIMIT 1
            ];
            if (existing.isEmpty()) {
                insert new EngagementChannelType(Name = channelName, IsActive = true);
                System.debug('Created EngagementChannelType: ' + channelName);
            } else {
                System.debug('Reusing EngagementChannelType: ' + channelName + ' (' + existing[0].Id + ')');
            }
        }
        System.debug('✅ Engagement channels seeded. Verify in Setup → Salesforce Scheduler → '
            + 'Engagement Channels, and confirm "Schedule Appointments Using Engagement Channels" is enabled.');
    }
}

new FairwayEngagementChannelSeed().run();
