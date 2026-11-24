import ExpoModulesCore
import UIKit

// Privacy cover for the iOS app switcher. Pain Journal holds health data
// (pain levels, symptoms, AI chat), so while the app isn't in front (the
// switcher, Control Center, Notification Center, a system alert) it shows its
// launch splash instead of the live screen.
//
// Native on purpose: iOS takes the switcher snapshot the moment the app
// resigns active, before a React render could happen, and the cover is added
// to the window itself so it sits above native modal sheets too.
public class PrivacyCoverAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  private var cover: UIView?

  public func applicationWillResignActive(_ application: UIApplication) {
    guard cover == nil, let window = Self.keyWindow() else { return }
    let view = Self.makeCover()
    view.frame = window.bounds
    view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    // No animation: it must be fully there when the snapshot is taken.
    window.addSubview(view)
    cover = view
  }

  public func applicationDidBecomeActive(_ application: UIApplication) {
    guard let view = cover else { return }
    cover = nil
    UIView.animate(
      withDuration: 0.2,
      animations: { view.alpha = 0 },
      completion: { _ in view.removeFromSuperview() }
    )
  }

  // The storyboard expo-splash-screen generates from app.json (background +
  // icon, light and dark), so the cover is exactly the launch splash.
  private static func makeCover() -> UIView {
    if Bundle.main.path(forResource: "SplashScreen", ofType: "storyboardc") != nil,
       let controller = UIStoryboard(name: "SplashScreen", bundle: .main).instantiateInitialViewController() {
      return controller.view
    }
    let view = UIView()
    view.backgroundColor = UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(red: 0x0B / 255, green: 0x14 / 255, blue: 0x10 / 255, alpha: 1)
        : UIColor(red: 0xDD / 255, green: 0xE0 / 255, blue: 0xDD / 255, alpha: 1)
    }
    return view
  }

  private static func keyWindow() -> UIWindow? {
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }
  }
}
