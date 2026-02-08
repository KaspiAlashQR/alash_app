package com.gomarket

import android.content.Context
import android.util.Log
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.lechange.opensdk.media.LCOpenSDK_ParamReal
import com.lechange.opensdk.media.realtime.LCOpenSDK_PlayRealWindow
import com.lechange.opensdk.media.realtime.listener.LCOpenSDK_PlayRealListener
import java.io.File

class ImouPlayerView(context: Context) : FrameLayout(context) {

    companion object {
        private const val TAG = "ImouPlayerView"
    }

    private var playWindow: LCOpenSDK_PlayRealWindow? = null
    private var isPlaying = false
    private var isInitialized = false
    private var isRecording = false
    private var recordFilePath: String? = null

    // Camera parameters
    private var deviceId: String = ""
    private var channelId: Int = 0
    private var accessToken: String = ""
    private var playToken: String = ""
    private var password: String = ""
    private var productId: String = ""
    private var streamType: Int = 1 // 0=HD, 1=SD

    init {
        setupView()
    }

    private fun setupView() {
        // Set black background
        setBackgroundColor(android.graphics.Color.BLACK)
        Log.d(TAG, "ImouPlayerView initialized")
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)

        // Log when layout changes
        val w = right - left
        val h = bottom - top
        Log.d(TAG, "onLayout: ${w}x${h}, changed=$changed, childCount=$childCount")

        // Layout all children to fill the view
        for (i in 0 until childCount) {
            val child = getChildAt(i)
            child.layout(0, 0, w, h)
            Log.d(TAG, "  Child $i: ${child.javaClass.simpleName}, visibility=${child.visibility}")
        }
    }

    override fun requestLayout() {
        super.requestLayout()
        // Required for React Native to properly layout native views
        post {
            measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
            )
            layout(left, top, right, bottom)
        }
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
            sendEvent("onError", Arguments.createMap().apply {
                putString("error", "Missing deviceId or accessToken")
            })
            return
        }

        Log.d(TAG, "[STEP 0] Preconditions OK")
        Log.d(TAG, "  - deviceId: $deviceId")
        Log.d(TAG, "  - accessToken: ${accessToken.take(30)}...")
        Log.d(TAG, "  - playToken: ${if (playToken.isEmpty()) "EMPTY" else "${playToken.take(30)}..."}")
        Log.d(TAG, "  - view size: ${width}x${height}")

        try {
            // STEP 1: Create PlayWindow (using LCOpenSDK_PlayRealWindow like in OpenCellWindow demo)
            Log.d(TAG, "[STEP 1] Creating LCOpenSDK_PlayRealWindow...")
            playWindow = LCOpenSDK_PlayRealWindow()
            Log.d(TAG, "[STEP 1] Created: ${playWindow != null}")

            // STEP 2: Initialize PlayWindow with 'this' as container (like in demo)
            Log.d(TAG, "[STEP 2] Calling initPlayWindow(context, this, 0, false)...")
            playWindow?.initPlayWindow(context, this, 0, false)
            isInitialized = true
            Log.d(TAG, "[STEP 2] initPlayWindow() completed")

            // Log children after init
            Log.d(TAG, "[STEP 2] After init, childCount=$childCount")
            for (i in 0 until childCount) {
                val child = getChildAt(i)
                Log.d(TAG, "  Child $i: ${child.javaClass.simpleName}")
            }

            // STEP 3: Set listener (using LCOpenSDK_PlayRealListener like in demo)
            Log.d(TAG, "[STEP 3] Setting PlayRealListener...")
            playWindow?.setPlayRealListener(object : LCOpenSDK_PlayRealListener() {
                override fun onPlayBegin(winID: Int, ctx: String?) {
                    super.onPlayBegin(winID, ctx)
                    Log.d(TAG, ">>> CALLBACK: onPlayBegin - winID=$winID")
                    post {
                        isPlaying = true
                        sendEvent("onPlayStart", Arguments.createMap())

                        // Force layout update
                        requestLayout()
                        invalidate()
                    }
                }

                override fun onPlayLoading(winID: Int) {
                    super.onPlayLoading(winID)
                    Log.d(TAG, ">>> CALLBACK: onPlayLoading - winID=$winID")
                }

                override fun onPlayFail(winID: Int, errorCode: String?, errorMsg: String?, type: Int) {
                    super.onPlayFail(winID, errorCode, errorMsg, type)
                    Log.e(TAG, ">>> CALLBACK: onPlayFail - code=$errorCode, msg=$errorMsg, type=$type")
                    post {
                        isPlaying = false
                        sendEvent("onError", Arguments.createMap().apply {
                            putString("code", errorCode ?: "unknown")
                            putString("error", errorMsg ?: "Play failed")
                        })
                    }
                }

                override fun onReceiveData(winID: Int, ctx: String?, len: Int) {
                    super.onReceiveData(winID, ctx, len)
                    Log.v(TAG, ">>> CALLBACK: onReceiveData - len=$len bytes")
                }

                override fun onResolutionChanged(winID: Int, width: Int, height: Int) {
                    super.onResolutionChanged(winID, width, height)
                    Log.d(TAG, ">>> CALLBACK: onResolutionChanged - ${width}x${height}")
                    post {
                        sendEvent("onResolutionChanged", Arguments.createMap().apply {
                            putInt("width", width)
                            putInt("height", height)
                        })
                        // Force layout after resolution change
                        requestLayout()
                    }
                }

                override fun onRecordStop(winID: Int, ctx: String?, error: Int) {
                    super.onRecordStop(winID, ctx, error)
                    Log.d(TAG, ">>> CALLBACK: onRecordStop - error=$error")
                }

                override fun onStreamLogInfo(winID: Int, ctx: String?, logMessage: String?) {
                    super.onStreamLogInfo(winID, ctx, logMessage)
                    Log.d(TAG, ">>> CALLBACK: onStreamLogInfo - $logMessage")
                }

                override fun onProgressStatus(winID: Int, ctx: String?, logMessage: String?) {
                    super.onProgressStatus(winID, ctx, logMessage)
                    Log.d(TAG, ">>> CALLBACK: onProgressStatus - $logMessage")
                }

                override fun onIVSInfo(winID: Int, ivsDirection: Int) {
                    super.onIVSInfo(winID, ivsDirection)
                    Log.d(TAG, ">>> CALLBACK: onIVSInfo - direction=$ivsDirection")
                }

                override fun onAssistFrameInfo(winID: Int, ctx: String) {
                    super.onAssistFrameInfo(winID, ctx)
                    Log.d(TAG, ">>> CALLBACK: onAssistFrameInfo")
                }

                override fun onConnectInfoConfig(winID: Int, ctx: String?, requestId: String?, ip: String?, localPort: Int, remotePort: Int) {
                    super.onConnectInfoConfig(winID, ctx, requestId, ip, localPort, remotePort)
                    Log.d(TAG, ">>> CALLBACK: onConnectInfoConfig - ip=$ip")
                }

                override fun onStreamCallback(winID: Int, ctx: String?, data: ByteArray?, len: Int) {
                    super.onStreamCallback(winID, ctx, data, len)
                }
            })
            Log.d(TAG, "[STEP 3] PlayRealListener set")

            // STEP 4: Prepare parameters
            Log.d(TAG, "[STEP 4] Preparing LCOpenSDK_ParamReal...")
            val psk = if (password.isNotEmpty()) password else deviceId

            Log.d(TAG, "  Parameters:")
            Log.d(TAG, "    accessToken: ${accessToken.take(30)}...")
            Log.d(TAG, "    deviceID: $deviceId")
            Log.d(TAG, "    channelId: $channelId")
            Log.d(TAG, "    psk: $psk")
            Log.d(TAG, "    playToken: ${if (playToken.isEmpty()) "EMPTY" else "${playToken.take(30)}..."}")
            Log.d(TAG, "    streamType: $streamType (0=HD, 1=SD)")
            Log.d(TAG, "    isOpt: true, isOpenAudio: true")
            Log.d(TAG, "    productId: $productId")

            val paramReal = LCOpenSDK_ParamReal(
                accessToken,
                deviceId,
                channelId,
                psk,
                playToken,
                streamType,
                true,   // isOpt
                false,  // isOpenAudio
                -1,     // imageSize
                productId
            )
            Log.d(TAG, "[STEP 4] LCOpenSDK_ParamReal created")

            // STEP 5: Start playback
            Log.d(TAG, "[STEP 5] Calling playRtspReal(paramReal)...")
            val startTime = System.currentTimeMillis()
            playWindow?.playRtspReal(paramReal)
            val elapsed = System.currentTimeMillis() - startTime
            Log.d(TAG, "[STEP 5] playRtspReal() returned after ${elapsed}ms")
            Log.d(TAG, "========== startPreview() COMPLETED ==========")

        } catch (e: Exception) {
            Log.e(TAG, "startPreview() EXCEPTION: ${e.message}", e)
            sendEvent("onError", Arguments.createMap().apply {
                putString("error", e.message ?: "Unknown error")
            })
        }
    }

    fun stopPreview() {
        try {
            stopRecord()
            if (isPlaying) {
                playWindow?.stopRtspReal(true)
                isPlaying = false
                Log.d(TAG, "Preview stopped")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping preview: ${e.message}")
        }
    }

    fun startRecord(orderId: String): Boolean {
        if (!isPlaying) {
            Log.w(TAG, "startRecord aborted: preview not playing")
            sendEvent("onRecordError", Arguments.createMap().apply {
                putString("error", "Preview not playing")
            })
            return false
        }

        if (orderId.isBlank()) {
            Log.w(TAG, "startRecord aborted: orderId is empty")
            sendEvent("onRecordError", Arguments.createMap().apply {
                putString("error", "OrderId is empty")
            })
            return false
        }

        if (isRecording) {
            Log.w(TAG, "startRecord ignored: already recording")
            return true
        }

        return try {
            val recordsDir = File(context.getExternalFilesDir(null), "imou_records")
            if (!recordsDir.exists()) {
                recordsDir.mkdirs()
            }
            Log.d(TAG, "Record dir: ${recordsDir.absolutePath}, exists=${recordsDir.exists()}, writable=${recordsDir.canWrite()}")
            val fileName = "${orderId}.mp4"
            val file = File(recordsDir, fileName)
            recordFilePath = file.absolutePath

            val path = recordFilePath ?: return false
            val ret = playWindow?.startRecord(path, 1, 0x7FFFFFFF) == true
            if (ret) {
                isRecording = true
                sendEvent("onRecordStart", Arguments.createMap().apply {
                    putString("filePath", recordFilePath)
                })
                Log.d(TAG, "Record started: $recordFilePath")
            } else {
                recordFilePath = null
                sendEvent("onRecordError", Arguments.createMap().apply {
                    putString("error", "startRecord failed")
                })
            }
            ret
        } catch (e: Exception) {
            Log.e(TAG, "startRecord exception: ${e.message}", e)
            sendEvent("onRecordError", Arguments.createMap().apply {
                putString("error", e.message ?: "startRecord error")
            })
            false
        }
    }

    fun stopRecord(): Boolean {
        if (!isRecording) {
            return true
        }
        return try {
            val ret = playWindow?.stopRecord() == true
            if (ret) {
                sendEvent("onRecordStop", Arguments.createMap().apply {
                    putString("filePath", recordFilePath ?: "")
                })
            } else {
                sendEvent("onRecordError", Arguments.createMap().apply {
                    putString("error", "stopRecord failed")
                })
            }
            isRecording = false
            recordFilePath = null
            ret
        } catch (e: Exception) {
            Log.e(TAG, "stopRecord exception: ${e.message}", e)
            sendEvent("onRecordError", Arguments.createMap().apply {
                putString("error", e.message ?: "stopRecord error")
            })
            isRecording = false
            recordFilePath = null
            false
        }
    }

    fun release() {
        try {
            stopPreview()
            if (isInitialized) {
                playWindow?.uninitPlayWindow()
                isInitialized = false
            }
            playWindow = null
            Log.d(TAG, "Resources released")
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing: ${e.message}")
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
