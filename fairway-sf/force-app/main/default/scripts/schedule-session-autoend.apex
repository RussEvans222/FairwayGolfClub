// One-time setup: schedule FairwaySessionAutoEnd to sweep every 5 minutes.
// There's no metadata type for CronTrigger, so this has to be run manually
// once after deploying the class (`sf apex run --file ...`). Safe to re-run —
// it deletes any existing job with the same name first so you don't end up
// with duplicate schedules.

String jobName = 'Fairway Session Auto-End';

for (CronTrigger existing : [SELECT Id FROM CronTrigger WHERE CronJobDetail.Name = :jobName]) {
    System.abortJob(existing.Id);
}

// Every 5 minutes, on the 0/5/10/.../55 mark.
String cronExpr = '0 0/5 * * * ?';
Id jobId = System.schedule(jobName, cronExpr, new FairwaySessionAutoEnd());
System.debug('✅ Scheduled ' + jobName + ' (' + jobId + ') — runs every 5 minutes.');
