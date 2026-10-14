import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      preconditionFailure("Expected an application window scene and AppDelegate")
    }

    if let window = appDelegate.window {
      window.windowScene = windowScene
      self.window = window
      window.makeKeyAndVisible()
      self.scene(scene, openURLContexts: connectionOptions.urlContexts)
      for activity in connectionOptions.userActivities {
        self.scene(scene, continue: activity)
      }
    } else {
      let window = UIWindow(windowScene: windowScene)
      self.window = window
      appDelegate.startReactNative(in: window, connectionOptions: connectionOptions)
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      preconditionFailure("Expected AppDelegate")
    }
    for context in URLContexts {
      _ = appDelegate.application(
        UIApplication.shared,
        open: context.url,
        options: AppDelegate.openURLOptions(for: context)
      )
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      preconditionFailure("Expected AppDelegate")
    }
    _ = appDelegate.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}
