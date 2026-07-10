// One-time setup: schedule FairwaySessionAutoEnd to sweep every 5 minutes.
// There's no metadata type for CronTrigger, so this has to be run manually
// once after deploying the class (`sf apex run --file ...`). Safe to re-run —
// it deletes any existing jobs with the same name prefix first so you don't
// end up with duplicate schedules.
//
// Apex's cron parser (unlike standard cron/Quartz) only accepts a single
// literal integer for the minutes field — no comma lists, no "/" increment
// syntax. So "every 5 minutes" has to be 12 separate jobs, one per mark.

String jobNamePrefix = 'Fairway Session Auto-End';

for (CronTrigger existing : [
    SELECT Id FROM CronTrigger WHERE CronJobDetail.Name LIKE :(jobNamePrefix + '%')
]) {
    System.abortJob(existing.Id);
}

List<Integer> minuteMarks = new List<Integer>{ 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 };
for (Integer minute : minuteMarks) {
    String jobName = jobNamePrefix + ' :' + (minute < 10 ? '0' + minute : String.valueOf(minute));
    String cronExpr = '0 ' + minute + ' * * * ?';
    System.schedule(jobName, cronExpr, new FairwaySessionAutoEnd());
}
System.debug('✅ Scheduled ' + minuteMarks.size() + ' jobs under "' + jobNamePrefix + '" — sweep runs every 5 minutes.');
