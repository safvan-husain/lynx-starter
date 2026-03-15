import Foundation

@objc class WebSocketClient: NSObject {
    @objc static let shared = WebSocketClient()

    private var webSocketTask: URLSessionWebSocketTask?
    private var session: URLSession?
    private var statusCallback: ((String) -> Void)?
    private var messageCallback: ((String) -> Void)?
    private var binaryMessageCallback: ((String) -> Void)?

    // Store message callbacks by message content or simply the latest one
    // For a simple echo, we can just resolve the latest pending callback
    private var pendingCompletion: ((String) -> Void)?
    private var messageQueue: [String] = []
    private let messageQueueLock = NSLock()

    @objc func connect(url urlString: String, statusCallback: @escaping (String) -> Void) {
        self.statusCallback = statusCallback
        self.messageCallback = nil
        self.binaryMessageCallback = nil

        guard let url = URL(string: urlString) else {
            statusCallback("error:invalid_url")
            return
        }

        disconnect()

        session = URLSession(configuration: .default)
        webSocketTask = session?.webSocketTask(with: url)
        webSocketTask?.resume()

        statusCallback("connected")

        // Start listening continuously
        receiveLoop()
    }

    /// Connect with message handler for bidirectional communication (SpacetimeDB)
    @objc func connect(url urlString: String, statusCallback: @escaping (String) -> Void, messageCallback: @escaping (String) -> Void) {
        self.statusCallback = statusCallback
        self.messageCallback = messageCallback
        self.binaryMessageCallback = nil

        guard let url = URL(string: urlString) else {
            statusCallback("error:invalid_url")
            return
        }

        disconnect()

        session = URLSession(configuration: .default)
        webSocketTask = session?.webSocketTask(with: url)
        webSocketTask?.resume()

        statusCallback("connected")

        // Start listening continuously
        receiveLoopWithMessages()
    }

    /// Binary-safe connect variant.
    /// Incoming frames are forwarded as base64 strings (for bridge safety).
    ///
    /// - protocol: WebSocket subprotocol (e.g. "v2.bsatn.spacetimedb"). Pass "" for none.
    /// - headersJson: JSON string object of headers, or nil.
    @objc func connectBinary(url urlString: String, `protocol` protocolString: String, headersJson: String?, statusCallback: @escaping (String) -> Void, messageCallback: @escaping (String) -> Void) {
        self.statusCallback = statusCallback
        self.messageCallback = nil
        self.binaryMessageCallback = messageCallback

        guard let url = URL(string: urlString) else {
            statusCallback("error:invalid_url")
            return
        }

        disconnect()

        var request = URLRequest(url: url)

        if !protocolString.isEmpty {
            // URLSessionWebSocketTask doesn't provide a URLRequest + protocols initializer on all iOS versions.
            // Setting the header works for standard subprotocol negotiation.
            request.setValue(protocolString, forHTTPHeaderField: "Sec-WebSocket-Protocol")
        }

        if let headersJson, !headersJson.isEmpty {
            if let data = headersJson.data(using: .utf8) {
                do {
                    let obj = try JSONSerialization.jsonObject(with: data, options: [])
                    if let dict = obj as? [String: Any] {
                        for (k, v) in dict {
                            if let s = v as? String {
                                request.setValue(s, forHTTPHeaderField: k)
                            }
                        }
                    }
                } catch {
                    // Non-fatal; surface a warning and continue.
                    statusCallback("warn:invalid_headers_json")
                }
            }
        }

        session = URLSession(configuration: .default)
        webSocketTask = session?.webSocketTask(with: request)
        webSocketTask?.resume()

        statusCallback("connected")
        receiveLoopBinary()
    }

    private func receiveLoop() {
        webSocketTask?.receive { [weak self] result in
            DispatchQueue.main.async {
                guard let self = self else { return }
                switch result {
                case .success(let response):
                    switch response {
                    case .string(let text):
                        self.pendingCompletion?(text)
                        self.pendingCompletion = nil
                    case .data(let data):
                        self.pendingCompletion?(String(data: data, encoding: .utf8) ?? "")
                        self.pendingCompletion = nil
                    @unknown default:
                        break
                    }
                    // Keep listening
                    self.receiveLoop()
                case .failure(let error):
                    print("WebSocket receive error: \(error)")
                    self.statusCallback?("disconnected")
                    self.disconnect()
                }
            }
        }
    }

    /// Receive loop that handles continuous incoming messages (for SpacetimeDB)
    private func receiveLoopWithMessages() {
        webSocketTask?.receive { [weak self] result in
            DispatchQueue.main.async {
                guard let self = self else { return }
                switch result {
                case .success(let response):
                    var messageText: String?
                    switch response {
                    case .string(let text):
                        messageText = text
                    case .data(let data):
                        messageText = String(data: data, encoding: .utf8)
                    @unknown default:
                        break
                    }

                    if let message = messageText {
                        // Call message callback for continuous updates
                        self.messageCallback?(message)

                        // Also resolve pending completion if waiting
                        self.pendingCompletion?(message)
                        self.pendingCompletion = nil
                    }

                    // Keep listening
                    self.receiveLoopWithMessages()
                case .failure(let error):
                    print("WebSocket receive error: \(error)")
                    self.statusCallback?("disconnected")
                    self.disconnect()
                }
            }
        }
    }

    private func receiveLoopBinary() {
        webSocketTask?.receive { [weak self] result in
            DispatchQueue.main.async {
                guard let self = self else { return }
                switch result {
                case .success(let response):
                    let payload: Data?
                    switch response {
                    case .data(let data):
                        payload = data
                    case .string(let text):
                        payload = text.data(using: .utf8)
                    @unknown default:
                        payload = nil
                    }

                    if let payload {
                        let base64 = payload.base64EncodedString()
                        self.binaryMessageCallback?(base64)
                    }

                    self.receiveLoopBinary()
                case .failure(let error):
                    print("WebSocket receive error: \(error)")
                    self.statusCallback?("disconnected")
                    self.disconnect()
                }
            }
        }
    }

    @objc func sendMessage(_ message: String, completion: @escaping (String) -> Void) {
        guard let task = webSocketTask, task.state == .running else {
            completion("error:not_connected")
            return
        }

        self.pendingCompletion = completion
        let wsMessage = URLSessionWebSocketTask.Message.string(message)
        task.send(wsMessage) { [weak self] error in
            if let error = error {
                DispatchQueue.main.async {
                    completion("error:\(error.localizedDescription)")
                    self?.statusCallback?("error:\(error.localizedDescription)")
                }
            }
        }
    }

    /// Send message without waiting for response (fire and forget)
    @objc func sendMessage(_ message: String) {
        guard let task = webSocketTask, task.state == .running else {
            return
        }

        let wsMessage = URLSessionWebSocketTask.Message.string(message)
        task.send(wsMessage) { error in
            if let error = error {
                print("WebSocket send error: \(error)")
            }
        }
    }

    /// Send a binary message (base64 payload).
    @objc func sendBinary(_ base64: String) {
        guard let task = webSocketTask, task.state == .running else {
            return
        }

        guard let data = Data(base64Encoded: base64) else {
            statusCallback?("error:invalid_base64")
            return
        }

        let wsMessage = URLSessionWebSocketTask.Message.data(data)
        task.send(wsMessage) { error in
            if let error = error {
                print("WebSocket sendBinary error: \(error)")
                self.statusCallback?("error:\(error.localizedDescription)")
            }
        }
    }

    @objc func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        session?.invalidateAndCancel()
        session = nil
        statusCallback = nil
        messageCallback = nil
        binaryMessageCallback = nil
        pendingCompletion = nil
    }
}
