package co.ordering.business

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  // The New Architecture has no ReactNativeHost: the host is built from the package list (the
  // autolinked packages; the app has none of its own).
  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages,
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    createOrderNotificationChannel()
  }

  private fun createOrderNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java) ?: return

    val sound = Uri.parse("android.resource://$packageName/raw/order_sound_notification")
    val audioAttributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    val channel = NotificationChannel(
      ORDER_CHANNEL_ID,
      "New orders",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Alert when a new order arrives"
      setSound(sound, audioAttributes)
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
    manager.deleteNotificationChannel("orders")
  }

  companion object {
    const val ORDER_CHANNEL_ID = "new_order_alarm"
  }
}
