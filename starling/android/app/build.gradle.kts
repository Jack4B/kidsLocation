plugins {
    // AGP 9 ships built-in Kotlin support; no separate Kotlin plugin wanted.
    id("com.android.application") version "9.3.0"
}

// Family build counter (the CI run number). Every CI build gets a higher
// versionCode than the one before, so a new APK installs over the old one.
// Upstream's versionCode stays the high part, so upstream bumps keep it rising.
val familyBuild = (System.getenv("FAMILY_BUILD") ?: "0").toInt()

// The family relay (RELAY_URL, a CI secret) never lives in git. A build that
// has it makes it the app's default relay (js/build-config.js in the web
// assets) and the App Links host, so invite links on it open the app. A build
// without it (forks, pull requests from forks) still succeeds: the app asks
// for a relay on first run and the link filter claims only the reserved,
// unresolvable relay.invalid. Same rule as tools/gen-build-config.mjs; the
// value is never printed.
val relayOrigin: String = (System.getenv("RELAY_URL") ?: "").trim().trimEnd('/').lowercase().also {
    require(it.isEmpty() || Regex("^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$").matches(it)) {
        "RELAY_URL must be a bare https origin, like https://relay.example.org"
    }
}
val relayHost: String =
    if (relayOrigin.isEmpty()) "relay.invalid" else relayOrigin.removePrefix("https://").substringBefore(':')

android {
    namespace = "app.starlingmap"
    compileSdk = 36

    defaultConfig {
        // Own id: the family build installs next to upstream Starling, never over it,
        // and only APKs signed with the family key can update it.
        applicationId = "app.kidslocation"
        minSdk = 28
        targetSdk = 36
        versionCode = 2100 * 1000 + familyBuild
        versionName = "0.21.0"
        manifestPlaceholders["relayHost"] = relayHost
        buildConfigField("String", "RELAY_HOST", "\"$relayHost\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            // Unsigned on purpose: tools/release-android.sh signs with apksigner
            // so F-Droid's reproducible-build flow can byte-compare the APK and
            // copy the developer signature onto its own rebuild.
            isMinifyEnabled = false
            isShrinkResources = false
            vcsInfo.include = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}


dependencyLocking {
    lockAllConfigurations()
}

// The web app IS the app. Every build syncs ../../app into assets so the
// wrapper never drifts from the web code. sw.js stays out:
// WebView never wires up service worker interception and the assets are
// already local. _headers is server config, not content. js/build-config.js
// is then rewritten in the output (never in the source tree) with the relay.
val syncWebAssets = tasks.register<Sync>("syncWebAssets") {
    val webDir = rootProject.layout.projectDirectory.dir("../app")
    val origin = relayOrigin
    val configOut = layout.buildDirectory.file("webassets/js/build-config.js")
    inputs.property("relayOrigin", origin)
    doFirst {
        val leaflet = webDir.file("vendor/leaflet/leaflet.js").asFile
        check(leaflet.isFile) {
            "app/vendor/leaflet is missing. Run: npm ci && bash tools/sync-vendor.sh (from the repo root)"
        }
    }
    from(webDir) {
        exclude("sw.js", "_headers")
    }
    into(layout.buildDirectory.dir("webassets"))
    doLast {
        configOut.get().asFile.writeText(
            "// Generated at build time by android/app/build.gradle.kts. Not in git.\n" +
                "export const BUILD_RELAY = \"$origin\";\n",
        )
    }
}

android.sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("webassets").get().asFile)

tasks.named("preBuild") {
    dependsOn(syncWebAssets)
}

dependencies {
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.activity:activity-ktx:1.11.0")
    implementation("androidx.fragment:fragment-ktx:1.8.9")
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("info.guardianproject.panic:panic:1.0")
    testImplementation("junit:junit:4.13.2")
}
