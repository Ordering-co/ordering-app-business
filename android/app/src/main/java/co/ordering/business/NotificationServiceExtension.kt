package co.ordering.business

import androidx.annotation.Keep
import androidx.core.app.NotificationCompat
import com.onesignal.notifications.INotificationReceivedEvent
import com.onesignal.notifications.INotificationServiceExtension

/**
 * OneSignal 5's notification service extension (registered in the manifest as the
 * `com.onesignal.NotificationServiceExtension` meta-data). It runs for every push that arrives, in
 * any app state, before OneSignal displays it. OneSignal 5 displays the notification itself when
 * this returns (no `preventDefault`), with the extender applied. It does what the OneSignal 4
 * class it replaces did: puts the push on the new-order channel (`MainApplication`, the app's
 * sound), high priority, visible on the lock screen.
 */
@Keep
class NotificationServiceExtension : INotificationServiceExtension {

  override fun onNotificationReceived(event: INotificationReceivedEvent) {
    try {
      event.notification.setExtender { builder ->
        builder
          .setChannelId(ORDER_CHANNEL_ID)
          .setPriority(NotificationCompat.PRIORITY_HIGH)
          .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      }
    } catch (e: Throwable) {
      // Nothing to undo: without an extender OneSignal displays the original notification.
    }
  }

  private companion object {
    const val ORDER_CHANNEL_ID = "new_order_alarm"
  }
}
