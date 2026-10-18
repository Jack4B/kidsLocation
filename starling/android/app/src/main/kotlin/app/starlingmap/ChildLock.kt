package app.starlingmap

import android.Manifest
import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.os.UserManager
import org.json.JSONObject

// Set as device owner once, over USB (docs: OCHRONA-TELEFONU-DZIECKA.md).
class AdminReceiver : DeviceAdminReceiver()

// Child mode with teeth: only a device owner app can stop a person turning
// location off or force-stopping the app. The page holds the PIN; this only
// applies or lifts the restrictions when child mode changes.
object ChildLock {

    private val RESTRICTIONS = listOf(
        UserManager.DISALLOW_CONFIG_LOCATION,
        UserManager.DISALLOW_APPS_CONTROL,
        UserManager.DISALLOW_SAFE_BOOT,
        UserManager.DISALLOW_FACTORY_RESET,
        UserManager.DISALLOW_AIRPLANE_MODE,
    )

    private val PERMISSIONS = buildList {
        add(Manifest.permission.ACCESS_FINE_LOCATION)
        add(Manifest.permission.ACCESS_COARSE_LOCATION)
        add(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.POST_NOTIFICATIONS)
    }

    private fun dpm(ctx: Context) = ctx.getSystemService(DevicePolicyManager::class.java)

    private fun admin(ctx: Context) = ComponentName(ctx, AdminReceiver::class.java)

    fun isOwner(ctx: Context): Boolean = runCatching { dpm(ctx)?.isDeviceOwnerApp(ctx.packageName) == true }.getOrDefault(false)

    fun state(ctx: Context): String {
        val owner = isOwner(ctx)
        val applied = owner && runCatching {
            ctx.getSystemService(UserManager::class.java)?.hasUserRestriction(UserManager.DISALLOW_APPS_CONTROL) == true
        }.getOrDefault(false)
        return JSONObject().put("owner", owner).put("applied", applied).toString()
    }

    fun apply(ctx: Context, on: Boolean): String {
        if (!isOwner(ctx)) return state(ctx)
        val d = dpm(ctx) ?: return state(ctx)
        val a = admin(ctx)
        for (r in RESTRICTIONS) runCatching { if (on) d.addUserRestriction(a, r) else d.clearUserRestriction(a, r) }
        runCatching { d.setUninstallBlocked(a, ctx.packageName, on) }
        val grant = if (on) DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED else DevicePolicyManager.PERMISSION_GRANT_STATE_DEFAULT
        for (p in PERMISSIONS) runCatching { d.setPermissionGrantState(a, ctx.packageName, p, grant) }
        if (on && Build.VERSION.SDK_INT >= 30) runCatching { d.setLocationEnabled(a, true) }
        return state(ctx)
    }

    // Gives the phone back: restrictions off, then the app stops being device owner.
    fun release(ctx: Context): String {
        if (!isOwner(ctx)) return state(ctx)
        apply(ctx, false)
        runCatching { dpm(ctx)?.clearDeviceOwnerApp(ctx.packageName) }
        return state(ctx)
    }
}
