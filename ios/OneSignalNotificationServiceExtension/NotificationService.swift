import UserNotifications

import OneSignalExtension

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var receivedRequest: UNNotificationRequest!
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.receivedRequest = request
        self.bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        // OneSignal 5 hands the content back through the handler it is given (after it has
        // downloaded attachments and filled the rich fields): the order alarm is applied there,
        // so it is on the content the system finally shows.
        let wrappedHandler: (UNNotificationContent) -> Void = { content in
            if let mutable = content.mutableCopy() as? UNMutableNotificationContent {
                self.applyOrderSound(to: mutable)
                contentHandler(mutable)
            } else {
                contentHandler(content)
            }
        }
        self.contentHandler = wrappedHandler

        if let bestAttemptContent = bestAttemptContent {
            OneSignalExtension.didReceiveNotificationExtensionRequest(self.receivedRequest, with: bestAttemptContent, withContentHandler: wrappedHandler)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        // Called just before the extension will be terminated by the system.
        // Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            applyOrderSound(to: bestAttemptContent)
            OneSignalExtension.serviceExtensionTimeWillExpireRequest(self.receivedRequest, with: self.bestAttemptContent)
            contentHandler(bestAttemptContent)
        }
    }

    private func applyOrderSound(to content: UNMutableNotificationContent) {
        content.sound = UNNotificationSound(named: UNNotificationSoundName("order_sound_notification.caf"))

        if #available(iOS 15.0, *) {
            content.interruptionLevel = .timeSensitive
            content.relevanceScore = 1.0
        }
    }

}
