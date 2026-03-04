import UIKit

#if canImport(Lynx)
import Lynx
#endif

final class LynxHostViewController: UIViewController {
    #if canImport(Lynx)
    private var lynxView: LynxView?
    #endif

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        title = "Lynx Host"
        setupContent()
    }

    private func setupContent() {
        #if canImport(Lynx)
        LynxBridge.bootstrapIfNeeded()

        let hostView = LynxView(frame: view.bounds)
        hostView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        hostView.backgroundColor = UIColor.black
        view.addSubview(hostView)
        lynxView = hostView

        hostView.loadTemplate(fromURL: LynxBridge.shared.bundleURL.absoluteString)
        #else
        let label = UILabel(frame: view.bounds)
        label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        label.numberOfLines = 0
        label.textAlignment = .center
        label.textColor = .white
        label.text = """
        Lynx iOS SDK is not linked.
        Add Lynx dependency in Xcode, then rebuild.
        """
        view.addSubview(label)
        #endif
    }
}
