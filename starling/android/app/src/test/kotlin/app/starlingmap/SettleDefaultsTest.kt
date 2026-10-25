package app.starlingmap

import org.junit.Assert.assertEquals
import org.junit.Test

// F5-22: the on defaults reach a new install only; an update keeps what it had.
class SettleDefaultsTest {
    private val keep = MainActivity.PREF_KEEP_SHARING
    private val boot = ShareResume.PREF_AUTO_BOOT
    private val update = ShareResume.PREF_AUTO_UPDATE

    @Test fun aFreshInstallHasEverySwitchOn() =
        assertEquals(mapOf(keep to true, boot to true, update to true), ShareResume.settled(emptyMap(), fresh = true))

    @Test fun anUpdateWithNothingSavedKeepsTheOldOff() =
        assertEquals(mapOf(keep to false, boot to false, update to false), ShareResume.settled(emptyMap(), fresh = false))

    @Test fun anUpdateKeepsWhatThePersonSaved() =
        assertEquals(
            mapOf(keep to true, boot to false, update to false),
            ShareResume.settled(mapOf(keep to true, boot to false), fresh = false),
        )

    @Test fun aSavedOffStaysOffEvenOnAFreshInstall() =
        assertEquals(
            mapOf(keep to false, boot to true, update to true),
            ShareResume.settled(mapOf(keep to false), fresh = true),
        )
}
