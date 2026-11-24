import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import GoogleMaps
import FirebaseCore
import RNBootSplash

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
#if DEBUG && targetEnvironment(simulator)
    let localPreview = ProcessInfo.processInfo.environment["ORDERING_LOCAL_SIMULATOR"] == "1"
#else
    let localPreview = false
#endif
    UserDefaults.standard.set(localPreview, forKey: "OrderingLocalSimulatorMode")
    UserDefaults.standard.removeObject(forKey: "OrderingLocalSimulatorConfig")
    if localPreview,
       let raw = ProcessInfo.processInfo.environment["ORDERING_LOCAL_CONFIG"],
       let data = raw.data(using: .utf8),
       let config = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
      UserDefaults.standard.set(config, forKey: "OrderingLocalSimulatorConfig")
    }
    if !localPreview { FirebaseApp.configure() }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // Configurar Google Maps API Key
    if !localPreview { GMSServices.provideAPIKey("_GOOGLE_MAPS_API_KEY_") }

    // The window and React Native start in SceneDelegate (UIScene lifecycle,
    // required from iOS 27); the launch options are kept for it.
    self.launchOptions = launchOptions

    return true
  }

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }

  // Manejo de URLs para deep linking
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    if RCTLinkingManager.application(app, open: url, options: options) {
      return true
    }
    return false
  }
}

/// The app's one scene (UIScene lifecycle): its window hosts React Native, and
/// the URLs it receives (deep links) go to React Native's Linking.
///
/// UIKit no longer calls the app delegate's URL methods once the app has a
/// scene manifest: a link opened while the app runs arrives here and is handed
/// to `RCTLinkingManager` by its scene entry points (its app-delegate ones do
/// nothing once the app has a scene manifest), and the link that launched the
/// app is given to React Native as a launch option (`Linking.getInitialURL()`
/// reads it from there: no JS listens yet).
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "businessApp",
      in: window,
      launchOptions: SceneDelegate.launchOptions(appDelegate.launchOptions, connectionOptions)
    )
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    RCTLinkingManager.scene(scene, openURLContexts: URLContexts)
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.scene(scene, continue: userActivity)
  }

  /// The app's launch options plus what launched the scene: with scenes, the
  /// URL (or the universal link) arrives in the connection options, and the
  /// app delegate's launch options no longer carry it.
  static func launchOptions(
    _ launchOptions: [UIApplication.LaunchOptionsKey: Any]?,
    _ connectionOptions: UIScene.ConnectionOptions
  ) -> [UIApplication.LaunchOptionsKey: Any] {
    var options = launchOptions ?? [:]
    if let url = connectionOptions.urlContexts.first?.url {
      options[.url] = url
    }
    if let activity = connectionOptions.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb }) {
      options[.userActivityDictionary] = [
        UIApplication.LaunchOptionsKey.userActivityType.rawValue: activity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": activity
      ] as [String: Any]
    }
    return options
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  // The launch splash (BootSplash.storyboard) stays over the app until JavaScript hides it.
  override func customize(_ rootView: RCTRootView) {
    super.customize(rootView)
    RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    if UserDefaults.standard.bool(forKey: "OrderingLocalSimulatorMode"),
       let port = ProcessInfo.processInfo.environment["ORDERING_LOCAL_METRO_PORT"],
       let number = Int(port), (1024...65535).contains(number) {
      return URL(string: "http://127.0.0.1:\(number)/index.bundle?platform=ios&dev=true&minify=false")
    }
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
