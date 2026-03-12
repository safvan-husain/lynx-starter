package com.lynx.kotlinemptyproject

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule
import com.lynx.react.bridge.Callback
import okhttp3.*
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * WebSocket Module for Lynx
 * Supports both simple echo patterns and SpacetimeDB-style bidirectional communication
 */
class WebSocketModule(context: Context) : LynxModule(context) {

    private var webSocket: WebSocket? = null
    private val client = OkHttpClient()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var statusCallback: Callback? = null
    private var messageCallback: Callback? = null
    private var pendingResponseCallback: Callback? = null
    private val messageQueue = ConcurrentLinkedQueue<String>()

    private fun writeLog(level: String, msg: String) {
        // 1. Write to standard logcat
        Log.d("Lynx_WS", "[$level] $msg")

        // 2. Write to a local text file that can be read by the developer!
        try {
            val timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())
            val logLine = "$timestamp [$level] $msg\n"
            val file = File(mContext.getExternalFilesDir(null), "websocket_logs.txt")
            file.appendText(logLine)
        } catch (e: Exception) {
            Log.e("Lynx_WS", "Failed to write to external file: ${e.message}")
        }
    }

    /**
     * Connect with message handler for SpacetimeDB-style bidirectional communication
     * The messageCallback will be called for every incoming message
     */
    @LynxMethod
    fun connectWithMessageHandler(url: String, statusCallback: Callback, messageCallback: Callback) {
        writeLog("INFO", "ConnectWithMessageHandler called with URL: $url")
        this.statusCallback = statusCallback
        this.messageCallback = messageCallback
        connectInternal(url)
    }

    /**
     * Simple connect for echo pattern (original behavior)
     */
    @LynxMethod
    fun connect(url: String, callback: Callback) {
        writeLog("INFO", "Connect method called with URL: $url")
        this.statusCallback = callback
        this.messageCallback = null
        connectInternal(url)
    }

    private fun connectInternal(url: String) {
        val request = try {
            Request.Builder().url(url).build()
        } catch (e: Exception) {
            writeLog("ERROR", "URL Parsing crashed: ${e.message}")
            statusCallback?.invoke("error:invalid_url")
            return
        }

        disconnectInternal()

        writeLog("INFO", "Initializing okhttp newWebSocket...")
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                writeLog("SUCCESS", "WebSocket successfully connected! Response: $response")
                mainHandler.post {
                    statusCallback?.invoke("connected")
                    // Don't nullify statusCallback for bidirectional mode
                    if (messageCallback == null) {
                        statusCallback = null
                    }
                }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                writeLog("INFO", "Received WS Message: $text")
                mainHandler.post {
                    // For SpacetimeDB mode, call messageCallback for all incoming messages
                    messageCallback?.invoke(text)

                    // Also resolve pending response callback if waiting
                    pendingResponseCallback?.invoke(text)
                    pendingResponseCallback = null
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                writeLog("ERROR", "WebSocket onFailure hit: ${t.message} | cause: ${t.cause}")
                mainHandler.post {
                    statusCallback?.invoke("error:" + t.message)
                    statusCallback = null
                }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                writeLog("INFO", "WebSocket onClosed hit. Code: $code, Reason: $reason")
                mainHandler.post {
                    statusCallback?.invoke("disconnected")
                    statusCallback = null
                    messageCallback = null
                }
            }
        })
    }

    @LynxMethod
    fun sendMessage(message: String, callback: Callback) {
        writeLog("INFO", "Attempting to send message to server: $message")
        if (webSocket == null) {
            writeLog("ERROR", "webSocket is null, unable to send!")
            callback.invoke("error:not_connected")
            return
        }
        pendingResponseCallback = callback
        val success = webSocket?.send(message) == true
        if (!success) {
            writeLog("ERROR", "send() returned false")
            pendingResponseCallback = null
            callback.invoke("error:send_failed")
        } else {
            writeLog("SUCCESS", "Message sent across the socket.")
        }
    }

    /**
     * Send message without waiting for response (fire and forget)
     * Used by SpacetimeDB for reducer calls
     */
    @LynxMethod
    fun sendMessageAsync(message: String) {
        writeLog("INFO", "Sending async message: $message")
        if (webSocket == null) {
            writeLog("ERROR", "webSocket is null, unable to send async!")
            return
        }
        val success = webSocket?.send(message) == true
        if (!success) {
            writeLog("ERROR", "async send() returned false")
        }
    }

    private fun disconnectInternal() {
        if (webSocket != null) {
            writeLog("INFO", "disconnectInternal closing existing socket")
            webSocket?.close(1000, "disconnected")
            webSocket = null
        }
    }

    @LynxMethod
    fun disconnect() {
        writeLog("INFO", "User called disconnect()")
        disconnectInternal()
        statusCallback?.invoke("disconnected")
        statusCallback = null
        messageCallback = null
        pendingResponseCallback = null
    }
}

