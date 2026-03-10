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

class WebSocketModule(context: Context) : LynxModule(context) {

    private var webSocket: WebSocket? = null
    private val client = OkHttpClient()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var statusCallback: Callback? = null
    private var messageCallback: Callback? = null

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

    @LynxMethod
    fun connect(url: String, callback: Callback) {
        writeLog("INFO", "Connect method called with URL: $url")
        statusCallback = callback
        val request = try {
            Request.Builder().url(url).build()
        } catch (e: Exception) {
            writeLog("ERROR", "URL Parsing crashed: ${e.message}")
            callback.invoke("error:invalid_url")
            return
        }

        disconnectInternal()

        writeLog("INFO", "Initializing okhttp newWebSocket...")
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                writeLog("SUCCESS", "WebSocket successfully connected! Response: $response")
                mainHandler.post {
                    statusCallback?.invoke("connected")
                    // Note: In Lynx, standard Callbacks cannot be called more than once! 
                    // So we must nullify it after invoking.
                    statusCallback = null 
                }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                writeLog("INFO", "Received WS Message: $text")
                mainHandler.post {
                    messageCallback?.invoke(text)
                    messageCallback = null
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
        messageCallback = callback
        val success = webSocket?.send(message) == true
        if (!success) {
            writeLog("ERROR", "send() returned false")
            callback.invoke("error:send_failed")
        } else {
            writeLog("SUCCESS", "Message sent across the socket.")
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
    }
}

