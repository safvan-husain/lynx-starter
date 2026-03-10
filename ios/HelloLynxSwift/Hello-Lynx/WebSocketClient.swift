import Foundation

@objc class WebSocketClient: NSObject {
    @objc static let shared = WebSocketClient()

    private var webSocketTask: URLSessionWebSocketTask?
    private var session: URLSession?
    private var statusCallback: ((String) -> Void)?
    
    // Store message callbacks by message content or simply the latest one
    // For a simple echo, we can just resolve the latest pending callback
    private var pendingCompletion: ((String) -> Void)?

    @objc func connect(url urlString: String, statusCallback: @escaping (String) -> Void) {
        self.statusCallback = statusCallback

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

    @objc func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        session?.invalidateAndCancel()
        session = nil
    }
}
