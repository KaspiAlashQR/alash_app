package com.gomarket

import android.content.Context
import android.util.Log
import android.view.ViewGroup
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.lechange.opensdk.media.realtime.LCOpenSDK_PlayRealWindow
import com.lechange.opensdk.media.LCOpenSDK_ParamReal
import com.lechange.opensdk.media.realtime.listener.LCOpenSDK_PlayRealListener
import com.lechange.opensdk.utils.LCOpenSDK_DeviceInfo_Util

class ImouPlayerView(context: Context) : FrameLayout(context) {

    companion object {
        private const val TAG = "ImouPlayerView"
    }

    private var playWindow: LCOpenSDK_PlayRealWindow? = null
    private var isPlaying = false
    private var contentView: FrameLayout? = null

    // Camera parameters
    private var deviceId: String = ""
    private var channelId: Int = 0
    private var accessToken: String = ""
    private var playToken: String = ""
    private var password: String = ""  // Пароль камеры (psk)
    private var productId: String = "" // Product ID из API (НЕ deviceId!)
    private var streamType: Int = 1 // 0=HD, 1=SD

    init {
        setupView()
    }

    private fun setupView() {
        // Create content container for video rendering
        contentView = FrameLayout(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        }
        addView(contentView)

        Log.d(TAG, "ImouPlayerView initialized")
    }

    fun setDeviceId(id: String) {
        this.deviceId = id
        Log.d(TAG, "Device ID set: $id")
    }

    fun setChannelId(id: Int) {
        this.channelId = id
        Log.d(TAG, "Channel ID set: $id")
    }

    fun setAccessToken(token: String) {
        this.accessToken = token
        Log.d(TAG, "Access token set")
    }

    fun setPlayToken(token: String) {
        this.playToken = token
        Log.d(TAG, "Play token set")
    }

    fun setPassword(pwd: String) {
        this.password = pwd
        Log.d(TAG, "Password set")
    }

    fun setStreamType(type: Int) {
        this.streamType = type
        Log.d(TAG, "Stream type set: $type")
    }

    fun setProductId(id: String) {
        this.productId = id
        Log.d(TAG, "Product ID set: $id")
    }

    fun startPreview() {
        Log.d(TAG, "========== startPreview() CALLED ==========")
        Log.d(TAG, "[STEP 0] Checking preconditions...")

        if (isPlaying) {
            Log.w(TAG, "[STEP 0] ABORT: Preview already playing")
            return
        }

        if (deviceId.isEmpty() || accessToken.isEmpty()) {
            Log.e(TAG, "[STEP 0] ABORT: Missing required parameters")
            Log.e(TAG, "  - deviceId: '${deviceId}' (empty=${deviceId.isEmpty()})")
            Log.e(TAG, "  - accessToken: ${if (accessToken.isEmpty()) "EMPTY" else "${accessToken.take(20)}..."}")
            sendEvent("onError", Arguments.createMap().apply {
                putString("error", "Missing deviceId or accessToken")
            })
            return
        }

        Log.d(TAG, "[STEP 0] Preconditions OK")
        Log.d(TAG, "  - deviceId: ${deviceId}")
        Log.d(TAG, "  - accessToken: ${accessToken.take(30)}...")
        Log.d(TAG, "  - playToken: ${if (playToken.isEmpty()) "EMPTY (will use old protocol)" else "${playToken.take(30)}..."}")
        Log.d(TAG, "  - password: ${if (password.isEmpty()) "EMPTY" else "${password.take(5)}..."}")
        Log.d(TAG, "  - channelId: $channelId")
        Log.d(TAG, "  - streamType: $streamType (0=HD, 1=SD)")

        try {
            // STEP 1: Create PlayWindow
            Log.d(TAG, "[STEP 1] Creating LCOpenSDK_PlayRealWindow...")
            playWindow = LCOpenSDK_PlayRealWindow()
            Log.d(TAG, "[STEP 1] LCOpenSDK_PlayRealWindow created: ${playWindow != null}")

            // STEP 2: Initialize PlayWindow
            Log.d(TAG, "[STEP 2] Calling initPlayWindow(context, contentView, 0, false)...")
            Log.d(TAG, "  - contentView: ${contentView != null}, size: ${contentView?.width}x${contentView?.height}")
            playWindow?.initPlayWindow(context, contentView as ViewGroup, 0, false)
            Log.d(TAG, "[STEP 2] initPlayWindow() completed")

            // STEP 3: Set event listener
            Log.d(TAG, "[STEP 3] Setting PlayRealListener...")
            playWindow?.setPlayRealListener(object : LCOpenSDK_PlayRealListener() {
                override fun onPlayBegin(winID: Int, context: String?) {
                    Log.d(TAG, ">>> CALLBACK: onPlayBegin - winID=$winID, context=$context")
                    post {
                        isPlaying = true
                        sendEvent("onPlayStart", Arguments.createMap())
                    }
                }

                override fun onPlayLoading(winID: Int) {
                    Log.d(TAG, ">>> CALLBACK: onPlayLoading - winID=$winID")
                }

                override fun onPlayFail(winID: Int, errorCode: String?, errorType: String?, resultSource: Int) {
                    Log.e(TAG, ">>> CALLBACK: onPlayFail <<<")
                    Log.e(TAG, "  - winID: $winID")
                    Log.e(TAG, "  - errorCode: $errorCode")
                    Log.e(TAG, "  - errorType: $errorType")
                    Log.e(TAG, "  - resultSource: $resultSource")
                    post {
                        isPlaying = false
                        sendEvent("onError", Arguments.createMap().apply {
                            putString("code", errorCode ?: "unknown")
                            putString("error", "Play failed: $errorCode ($errorType)")
                        })
                    }
                }

                override fun onReceiveData(winID: Int, context: String?, len: Int) {
                    Log.v(TAG, ">>> CALLBACK: onReceiveData - len=$len bytes")
                }

                override fun onResolutionChanged(winID: Int, width: Int, height: Int) {
                    Log.d(TAG, ">>> CALLBACK: onResolutionChanged - ${width}x${height}")
                    post {
                        sendEvent("onResolutionChanged", Arguments.createMap().apply {
                            putInt("width", width)
                            putInt("height", height)
                        })
                    }
                }

                override fun onRecordStop(winID: Int, context: String?, error: Int) {
                    Log.d(TAG, ">>> CALLBACK: onRecordStop - error=$error")
                }

                override fun onStreamLogInfo(winID: Int, context: String?, logMessage: String?) {
                    Log.d(TAG, ">>> CALLBACK: onStreamLogInfo - $logMessage")
                }

                override fun onConnectInfoConfig(winID: Int, context: String?, requestId: String?, ip: String?, localPort: Int, remotePort: Int) {
                    Log.d(TAG, ">>> CALLBACK: onConnectInfoConfig")
                    Log.d(TAG, "  - requestId: $requestId")
                    Log.d(TAG, "  - ip: $ip")
                    Log.d(TAG, "  - localPort: $localPort, remotePort: $remotePort")
                }

                override fun onStreamCallback(winID: Int, context: String?, data: ByteArray?, len: Int) {
                    // Stream data callback - too verbose
                }

                override fun onProgressStatus(winID: Int, context: String?, logMessage: String?) {
                    Log.d(TAG, ">>> CALLBACK: onProgressStatus - $logMessage")
                }

                override fun onIVSInfo(winID: Int, ivsDirection: Int) {
                    Log.d(TAG, ">>> CALLBACK: onIVSInfo - direction=$ivsDirection")
                }

                override fun onAssistFrameInfo(winID: Int, context: String) {
                    Log.d(TAG, ">>> CALLBACK: onAssistFrameInfo - context=$context")
                }
            })
            Log.d(TAG, "[STEP 3] PlayRealListener set")

            // STEP 4: Prepare parameters
            Log.d(TAG, "[STEP 4] Preparing LCOpenSDK_ParamReal...")
            // productId из API (может быть пустым - это нормально, как в демо проекте)
            val productId = this.productId
            val psk = if (this.password.isNotEmpty()) this.password else this.deviceId

            Log.d(TAG, "  Parameters for LCOpenSDK_ParamReal:")
            Log.d(TAG, "    1. accessToken: ${this.accessToken.take(30)}...")
            Log.d(TAG, "    2. deviceID: ${this.deviceId}")
            Log.d(TAG, "    3. channelId: ${this.channelId}")
            Log.d(TAG, "    4. psk: $psk")
            Log.d(TAG, "    5. playToken: ${if (this.playToken.isEmpty()) "EMPTY" else "${this.playToken.take(30)}..."}")
            Log.d(TAG, "    6. bateMode (streamType): ${this.streamType}")
            Log.d(TAG, "    7. isOpt: true")
            Log.d(TAG, "    8. isOpenAudio: false")
            Log.d(TAG, "    9. imageSize: -1")
            Log.d(TAG, "   10. productId: $productId")

            val paramReal = LCOpenSDK_ParamReal(
                this.accessToken,
                this.deviceId,
                this.channelId,
                psk,
                this.playToken,
                this.streamType,
                true,
                false,
                -1,
                productId
            )
            Log.d(TAG, "[STEP 4] LCOpenSDK_ParamReal created")

            // STEP 5: Start playback
            Log.d(TAG, "[STEP 5] Calling playRtspReal(paramReal)...")
            Log.d(TAG, "  playWindow is null: ${playWindow == null}")
            val startTime = System.currentTimeMillis()
            playWindow?.playRtspReal(paramReal)
            val elapsed = System.currentTimeMillis() - startTime
            Log.d(TAG, "[STEP 5] playRtspReal() returned after ${elapsed}ms")
            Log.d(TAG, "========== startPreview() COMPLETED (waiting for callbacks) ==========")

        } catch (e: Exception) {
            Log.e(TAG, "========== startPreview() EXCEPTION ==========")
            Log.e(TAG, "Exception type: ${e.javaClass.name}")
            Log.e(TAG, "Exception message: ${e.message}")
            Log.e(TAG, "Stack trace:", e)
            sendEvent("onError", Arguments.createMap().apply {
                putString("error", e.message ?: "Unknown error")
            })
        }
    }

    fun stopPreview() {
        try {
            if (isPlaying) {
                playWindow?.stopRtspReal(true)
                isPlaying = false
                Log.d(TAG, "Preview stopped")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping preview: ${e.message}")
        }
    }

    fun release() {
        try {
            stopPreview()
            playWindow?.uninitPlayWindow()
            playWindow = null
            Log.d(TAG, "Resources released")
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing resources: ${e.message}")
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        val reactContext = context as? ReactContext ?: return
        reactContext.getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, eventName, params)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        release()
    }
}
