package app.starlingmap

import android.app.Activity
import android.content.Intent
import android.os.Bundle

// Check in from the sharing notification below Android 12, where only an activity makes a locked phone ask for the unlock.
class CheckinActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        startService(Intent(this, LocationService::class.java).setAction(LocationService.ACTION_CHECKIN))
        finish()
    }
}
