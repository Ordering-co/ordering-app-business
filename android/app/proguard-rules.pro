# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Minify is off (android/app/build.gradle, enableProguardInReleaseBuilds): the rules below are what R8 needed on 2026-11-23,
# measured on an emulator, and are read only once it is turned on. Before that: print on a real Star printer (its rule was
# written from the library, never run), receive a real push, and make one build in the Builder (docs/deps/release-builds.md).

# react-native-esc-pos-printer (Epson ePOS2): libepos2.so's JNI_OnLoad looks classes up by name (FindClass com.epson.epsonio.bluetooth.NetBt) and aborts the process if R8 renamed or removed them; the SDK ships no rules
-keep class com.epson.** { *; }

# react-native-star-io10: libStarPRNTCommandUtil.so / libStarXpandCommandParser.so / libStarLogger.so bind their natives by name (Java_com_starmicronics_...) and call back into com.starmicronics.stario10.internal.starxpandcommand.a; the AAR's proguard.txt is empty
-keep class com.starmicronics.** { *; }

# react-native-device-info (its README, "Proguard"): the Install Referrer client is reached by reflection (RNInstallReferrerClient logged NoSuchMethodException newBuilder at every launch)
-keep class com.android.installreferrer.api.** { *; }

# react-native-notify-kit: WarmupHelper pre-loads these classes by name at startup (Class.forName); renamed, it logs "Warmup class not found" and skips the warm-up. Only the names are kept, unused code is still removed
-keepnames class app.notifee.core.ForegroundService
-keepnames class app.notifee.core.NotificationManager
-keepnames class app.notifee.core.model.NotificationModel
-keepnames class app.notifee.core.model.NotificationAndroidModel
-keepnames class app.notifee.core.model.ChannelModel
-keepnames class androidx.core.app.NotificationCompat$Builder
-keepnames class androidx.core.app.NotificationManagerCompat
