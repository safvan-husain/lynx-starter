import Foundation

#if canImport(Lynx)
import Lynx
#endif

final class LynxBridge {
    static let shared = LynxBridge()

    // Use your rspeedy dev URL for simulator.
    // If your dev server runs on another port, update this URL.
    let bundleURL = URL(string: "http://127.0.0.1:3000/main.lynx.bundle")!

    private static var isBootstrapped = false

    private init() {}

    static func bootstrapIfNeeded() {
        #if canImport(Lynx)
        guard !isBootstrapped else { return }
        isBootstrapped = true

        let classNameCandidates = [
            "NativeImagePickerModule",
            // If this ever becomes a Swift class, the runtime name can include the module prefix.
            "lynx_ios.NativeImagePickerModule",
        ]

        for className in classNameCandidates {
            guard let anyClass = NSClassFromString(className) else { continue }
            if let moduleType = anyClass as? (any LynxModule.Type) {
                LynxEnv.sharedInstance().config.register(moduleType)
                break
            }
        }
        #endif
    }
}
