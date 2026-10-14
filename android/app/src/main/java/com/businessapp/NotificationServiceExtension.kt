package com.businessapp

import android.content.Context
import androidx.core.app.NotificationCompat
import com.onesignal.OSNotificationReceivedEvent
import com.onesignal.OneSignal

class NotificationServiceExtension : OneSignal.OSRemoteNotificationReceivedHandler {

  override fun remoteNotificationReceived(context: Context, event: OSNotificationReceivedEvent) {
    try {
      val mutated = event.notification.mutableCopy()
      mutated.setExtender { builder ->
        builder
          .setChannelId(ORDER_CHANNEL_ID)
          .setPriority(NotificationCompat.PRIORITY_HIGH)
          .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      }
      event.complete(mutated)
    } catch (e: Throwable) {
      event.complete(event.notification)
    }
  }

  private companion object {
    const val ORDER_CHANNEL_ID = "new_order_alarm"
  }
}
