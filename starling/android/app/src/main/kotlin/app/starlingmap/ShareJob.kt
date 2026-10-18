package app.starlingmap

import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context

// A second watchdog beside the alarm: HyperOS has been seen dropping one and
// not the other. Same check as the alarm, so a resume never runs twice.
class ShareJob : JobService() {

    override fun onStartJob(params: JobParameters?): Boolean {
        runCatching { ShareResume.onWatchdog(applicationContext) }
        return false
    }

    override fun onStopJob(params: JobParameters?): Boolean = true

    companion object {
        private const val JOB_ID = 7107
        private const val PERIOD_MS = 15 * 60_000L

        fun schedule(ctx: Context) {
            val js = ctx.getSystemService(JobScheduler::class.java) ?: return
            if (js.getPendingJob(JOB_ID) != null) return
            val job = JobInfo.Builder(JOB_ID, ComponentName(ctx, ShareJob::class.java))
                .setPeriodic(PERIOD_MS)
                .setPersisted(true)
                .build()
            runCatching { js.schedule(job) }
        }

        fun cancel(ctx: Context) {
            runCatching { ctx.getSystemService(JobScheduler::class.java)?.cancel(JOB_ID) }
        }
    }
}
