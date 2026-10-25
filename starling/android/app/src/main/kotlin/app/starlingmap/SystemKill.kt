package app.starlingmap

import android.app.ActivityManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject

// HyperOS force-stops the whole app when the lock screen, the recents swipe or
// the one-tap cleaner tidies up ("LockScreenClean", "SwipeUpClean",
// "OneKeyClean"), even with Autostart, no battery limits and location all the
// time allowed. A force stop wipes every alarm and job, so nothing of ours
// runs until a process starts again. When one does, this reads how the last
// one died, and a share the cleaner killed is brought back instead of being
// taken for a person's stop.
object SystemKill {
    const val TAG = "killed"
    private const val PREF_SEEN_AT = "kill_seen_at"
    private const val PREF_WHY = "kill_why"
    private const val PREF_AT = "kill_at"
    private const val PREF_GAP = "kill_gap_ms"
    private const val PREF_NOTICE = "kill_notice"
    private const val PREF_FGS_DENIED = "fgs_denied"
    private const val PREF_FGS_DENIED_AT = "fgs_denied_at"

    val CLEANERS = listOf("LockScreenClean", "SwipeUpClean", "OneKeyClean")

    // ApplicationExitInfo.REASON_USER_REQUESTED and REASON_OTHER: HyperOS files
    // its cleaners under either, and names itself in the description.
    private val REASONS = setOf(10, 13)

    // Late enough that a window being opened has made its page by then.
    private const val SETTLE_MS = 3_000L

    // The cleaner's name when this exit is one of HyperOS's cleaners, else null.
    fun cleaner(reason: Int, description: String?): String? {
        if (reason !in REASONS) return null
        val d = description ?: return null
        return CLEANERS.firstOrNull { d.contains(it) }
    }

    fun isXiaomi(manufacturer: String = Build.MANUFACTURER, brand: String = Build.BRAND): Boolean {
        val names = setOf("xiaomi", "redmi", "poco")
        return manufacturer.lowercase() in names || brand.lowercase() in names
    }

    // From StarlingApp, on every process start (an open, a restart, an update, an alarm), off the main thread.
    fun onProcessStart(ctx: Context) {
        if (Build.VERSION.SDK_INT < 30) return
        val app = ctx.applicationContext
        val exit = runCatching {
            app.getSystemService(ActivityManager::class.java)
                .getHistoricalProcessExitReasons(app.packageName, 0, 1)
                .firstOrNull()
        }.getOrNull() ?: return
        val p = prefs(app)
        if (exit.timestamp <= p.getLong(PREF_SEEN_AT, 0L)) return
        p.edit().putLong(PREF_SEEN_AT, exit.timestamp).apply()
        val why = cleaner(exit.reason, exit.description) ?: return
        if (!ShareResume.sharingWhenKilled(app, exit.timestamp)) return
        val now = System.currentTimeMillis()
        p.edit()
            .putString(PREF_WHY, why)
            .putLong(PREF_AT, exit.timestamp)
            .putLong(PREF_GAP, (now - exit.timestamp).coerceAtLeast(0L))
            .putBoolean(PREF_NOTICE, true)
            .apply()
        Events.postKilled(app)
        // A window on its way resumes the share by its own rules; anything
        // else (a restart, an update, an alarm) gets the headless path.
        Handler(Looper.getMainLooper()).postDelayed({ ShareResume.onKilled(app) }, SETTLE_MS)
    }

    // For the sharing report and the page's notice. No position, no circle.
    fun record(ctx: Context): JSONObject? {
        val p = prefs(ctx)
        val why = p.getString(PREF_WHY, null)?.takeIf { it in CLEANERS } ?: return null
        return JSONObject()
            .put("why", why)
            .put("at", p.getLong(PREF_AT, 0L))
            .put("gapMs", p.getLong(PREF_GAP, 0L))
            .put("notice", p.getBoolean(PREF_NOTICE, false))
            .put("xiaomi", isXiaomi())
    }

    fun noticeSeen(ctx: Context) {
        prefs(ctx).edit().putBoolean(PREF_NOTICE, false).apply()
        runCatching { Events.cancel(ctx, TAG) }
    }

    // Android 12 and up refuse a foreground service started from the
    // background; the report says when that last happened.
    fun noteFgsDenied(ctx: Context) {
        val p = prefs(ctx)
        p.edit().putInt(PREF_FGS_DENIED, p.getInt(PREF_FGS_DENIED, 0) + 1)
            .putLong(PREF_FGS_DENIED_AT, System.currentTimeMillis()).apply()
    }

    fun fgsDenied(ctx: Context): JSONObject {
        val p = prefs(ctx)
        val at = p.getLong(PREF_FGS_DENIED_AT, 0L)
        return JSONObject()
            .put("count", p.getInt(PREF_FGS_DENIED, 0))
            .put("agoMs", if (at > 0L) System.currentTimeMillis() - at else JSONObject.NULL)
    }

    fun isFgsDenied(e: Throwable): Boolean =
        Build.VERSION.SDK_INT >= 31 && e.javaClass.name == "android.app.ForegroundServiceStartNotAllowedException"

    // The help screen's buttons. Every vendor screen may be missing or renamed
    // on some HyperOS build, so each falls back to Blisko's own app settings.
    fun openHelp(ctx: Context, which: String): Boolean {
        val target = when (which) {
            "autostart" -> Intent().setComponent(
                ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
            )
            "battery" -> Intent().setComponent(
                ComponentName("com.miui.powerkeeper", "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"),
            ).putExtra("package_name", ctx.packageName).putExtra("package_label", ctx.getString(R.string.app_name))
            else -> null
        }
        if (target != null && start(ctx, target)) return true
        return start(
            ctx,
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", ctx.packageName, null)),
        )
    }

    private fun start(ctx: Context, intent: Intent): Boolean = runCatching {
        ctx.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        true
    }.recoverCatching { e -> if (e is ActivityNotFoundException || e is SecurityException) false else throw e }
        .getOrDefault(false)

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE)
}

// Every process start passes through here first.
class StarlingApp : android.app.Application() {
    companion object {
        // One scope for the process's background work; a failed job never cancels the others.
        val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    }

    override fun onCreate() {
        super.onCreate()
        // Before any receiver reads a switch, so a short local write on the main thread.
        runCatching { ShareResume.settleDefaults(this) }
        // The exit history is an IPC call; it waits for nothing that comes after it.
        appScope.launch { runCatching { SystemKill.onProcessStart(this@StarlingApp) } }
    }
}
