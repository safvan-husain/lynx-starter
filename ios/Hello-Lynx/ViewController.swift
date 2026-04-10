import UIKit

class ViewController: UIViewController {

  override func viewDidLoad() {
    super.viewDidLoad()

    let config = LynxConfig(provider: DemoLynxProvider())
    // Register WebSocket module for SpacetimeDB support
    config.register(WebSocketModule.self)
    config.register(DebugLogModule.self)
    // Note: HttpModule not registered - fetch polyfill will use XMLHttpRequest fallback

    let lynxView = LynxView { builder in
      builder.config = config
      builder.screenSize = self.view.frame.size
      builder.fontScale = 1.0
    }
    
    lynxView.preferredLayoutWidth = self.view.frame.size.width
    lynxView.preferredLayoutHeight = self.view.frame.size.height
    lynxView.layoutWidthMode = .exact
    lynxView.layoutHeightMode = .exact
    self.view.addSubview(lynxView)

    lynxView.loadTemplate(fromURL: "main.lynx", initData: nil)
  }
}
