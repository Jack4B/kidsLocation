// Build-time settings. This committed copy is the safe fallback: it names no
// relay, so an app built from a plain checkout asks for the family relay's
// address on first run and talks to nobody before that. The Android build
// (android/app/build.gradle.kts) and tools/gen-build-config.mjs write their
// own copy into the build output, never into git, from the RELAY_URL value.
export const BUILD_RELAY = "";
