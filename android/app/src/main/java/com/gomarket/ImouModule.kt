package com.gomarket

import android.content.Context
import android.media.MediaMetadataRetriever
import java.io.File
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiConfiguration
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.Message
import android.util.Log
import com.facebook.react.bridge.*
import com.lechange.opensdk.api.InitParams
import com.lechange.opensdk.api.LCOpenSDK_Api
import com.lechange.opensdk.softap.LCOpenSDK_SoftAPConfig
import com.lechange.opensdk.searchwifi.WlanInfo
import com.lechange.opensdk.utils.LCOpenSDK_Utils

class ImouModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        fun isValidRecording(path: String): Boolean {
            if (!File(path).isFile || File(path).length() == 0L) return false
            val retriever = MediaMetadataRetriever()
            return try {
                retriever.setDataSource(path)
                val duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
                duration > 0 && retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_VIDEO) == "yes"
            } catch (_: Exception) {
                false
            } finally {
                retriever.release()
            }
        }
        private const val TAG = "ImouModule"
        private const val APP_ID = "lce44d2053bfc5420d"
        private const val APP_SECRET = "53ba141bde8640dfa0f12cff504e6b"
        private const val API_HOST = "openapi-sg.easy4ip.com:443"
    }

    private var isInitialized = false
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var previousSsid: String? = null

    override fun getName(): String = "ImouModule"

    @ReactMethod
    fun validateRecording(filePath: String, promise: Promise) {
        promise.resolve(isValidRecording(filePath))
    }

    @ReactMethod
    fun initSDK(token: String, promise: Promise) {
        initSDKWithHost(token, null, promise)
    }

    @ReactMethod
    fun initSDKWithHost(token: String, apiHost: String?, promise: Promise) {
        try {
            if (isInitialized) {
                Log.d(TAG, "SDK already initialized, skipping")
                promise.resolve(true)
                return
            }

            val host = apiHost ?: API_HOST
            LCOpenSDK_Utils.enableLogPrint(true)
            LCOpenSDK_Utils.setLogLevel(4)
            Log.d(TAG, "SDK logs enabled at DEBUG level")
            Log.d(TAG, "Initializing SDK with token: ${token.take(20)}...")
            Log.d(TAG, "API Host: $host")

            LCOpenSDK_Api.setSystem(APP_ID, APP_SECRET)
            Log.d(TAG, "setSystem called with appId: $APP_ID")

            val context = reactApplicationContext
            val initParams = InitParams(context, host, token)
            val result = LCOpenSDK_Api.initOpenApi(initParams)

            if (result == 0) {
                isInitialized = true
                Log.d(TAG, "Imou SDK initialized successfully")
                promise.resolve(true)
            } else {
                Log.e(TAG, "Imou SDK init failed with code: $result")
                promise.reject("INIT_ERROR", "SDK initialization failed with code: $result")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Imou SDK init error: ${e.message}")
            promise.reject("INIT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setLogLevel(level: Int) {
        try {
            LCOpenSDK_Utils.setLogLevel(level)
            Log.d(TAG, "Log level set to: $level")
        } catch (e: Exception) {
            Log.e(TAG, "Error setting log level: ${e.message}")
        }
    }

    @ReactMethod
    fun enableLogPrint(enable: Boolean) {
        try {
            LCOpenSDK_Utils.enableLogPrint(enable)
            Log.d(TAG, "Log print enabled: $enable")
        } catch (e: Exception) {
            Log.e(TAG, "Error enabling log print: ${e.message}")
        }
    }

    @ReactMethod
    fun isSDKInitialized(promise: Promise) {
        promise.resolve(isInitialized)
    }

    @ReactMethod
    fun getAppCredentials(promise: Promise) {
        val result = Arguments.createMap().apply {
            putString("appId", APP_ID)
            putString("appSecret", APP_SECRET)
            putString("apiHost", API_HOST)
        }
        promise.resolve(result)
    }

    /**
     * Get current WiFi SSID that phone is connected to
     */
    @ReactMethod
    fun getCurrentWifiSsid(promise: Promise) {
        try {
            val wifiManager = reactApplicationContext.applicationContext
                .getSystemService(Context.WIFI_SERVICE) as WifiManager
            val wifiInfo = wifiManager.connectionInfo
            var ssid = wifiInfo.ssid ?: ""
            // Remove quotes if present
            if (ssid.startsWith("\"") && ssid.endsWith("\"")) {
                ssid = ssid.substring(1, ssid.length - 1)
            }
            Log.d(TAG, "Current WiFi SSID: $ssid")
            promise.resolve(ssid)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting WiFi SSID: ${e.message}")
            promise.reject("WIFI_ERROR", e.message)
        }
    }

    /**
     * Connect phone to device's Soft AP WiFi network (Android 10+)
     */
    @ReactMethod
    fun connectToDeviceAp(ssid: String, password: String, promise: Promise) {
        try {
            Log.d(TAG, "Connecting to Soft AP: $ssid")

            // Save current SSID before switching
            val wifiManager = reactApplicationContext.applicationContext
                .getSystemService(Context.WIFI_SERVICE) as WifiManager
            val currentInfo = wifiManager.connectionInfo
            var currentSsid = currentInfo?.ssid ?: ""
            if (currentSsid.startsWith("\"") && currentSsid.endsWith("\"")) {
                currentSsid = currentSsid.substring(1, currentSsid.length - 1)
            }
            if (currentSsid.isNotEmpty() && currentSsid != "<unknown ssid>") {
                previousSsid = currentSsid
                Log.d(TAG, "Saved previous SSID: $previousSsid")
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ uses NetworkSpecifier
                connectToApAndroid10Plus(ssid, password, promise)
            } else {
                // Android 9 and below uses WifiConfiguration
                connectToApLegacy(ssid, password, promise)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error connecting to AP: ${e.message}")
            promise.reject("WIFI_ERROR", e.message)
        }
    }

    private fun connectToApAndroid10Plus(ssid: String, password: String, promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val specifierBuilder = WifiNetworkSpecifier.Builder()
                .setSsid(ssid)

            if (password.isNotEmpty()) {
                specifierBuilder.setWpa2Passphrase(password)
            }

            val specifier = specifierBuilder.build()

            val request = NetworkRequest.Builder()
                .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
                .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .setNetworkSpecifier(specifier)
                .build()

            val connectivityManager = reactApplicationContext
                .getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

            // Unregister previous callback if exists
            networkCallback?.let {
                try {
                    connectivityManager.unregisterNetworkCallback(it)
                } catch (e: Exception) {
                    Log.w(TAG, "Error unregistering previous callback: ${e.message}")
                }
            }

            networkCallback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    Log.d(TAG, "Connected to Soft AP network: $ssid")
                    // Bind process to this network for local communication
                    connectivityManager.bindProcessToNetwork(network)
                    promise.resolve(true)
                }

                override fun onUnavailable() {
                    Log.e(TAG, "Failed to connect to Soft AP: $ssid")
                    promise.reject("WIFI_ERROR", "Failed to connect to WiFi: $ssid")
                }
            }

            connectivityManager.requestNetwork(request, networkCallback!!)
        }
    }

    @Suppress("DEPRECATION")
    private fun connectToApLegacy(ssid: String, password: String, promise: Promise) {
        try {
            val wifiManager = reactApplicationContext.applicationContext
                .getSystemService(Context.WIFI_SERVICE) as WifiManager

            if (!wifiManager.isWifiEnabled) {
                wifiManager.isWifiEnabled = true
            }

            val wifiConfig = WifiConfiguration().apply {
                SSID = "\"$ssid\""
                if (password.isNotEmpty()) {
                    preSharedKey = "\"$password\""
                    allowedKeyManagement.set(WifiConfiguration.KeyMgmt.WPA_PSK)
                } else {
                    allowedKeyManagement.set(WifiConfiguration.KeyMgmt.NONE)
                }
            }

            val networkId = wifiManager.addNetwork(wifiConfig)
            if (networkId == -1) {
                promise.reject("WIFI_ERROR", "Failed to add network configuration")
                return
            }

            wifiManager.disconnect()
            val enabled = wifiManager.enableNetwork(networkId, true)
            val reconnected = wifiManager.reconnect()

            if (enabled && reconnected) {
                Log.d(TAG, "Connected to Soft AP (legacy): $ssid")
                promise.resolve(true)
            } else {
                promise.reject("WIFI_ERROR", "Failed to connect to WiFi")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Legacy connect error: ${e.message}")
            promise.reject("WIFI_ERROR", e.message)
        }
    }

    /**
     * Disconnect from device's Soft AP and return to previous WiFi
     */
    @ReactMethod
    fun disconnectFromDeviceAp(promise: Promise) {
        try {
            Log.d(TAG, "Disconnecting from Soft AP, previous SSID: $previousSsid")

            val connectivityManager = reactApplicationContext
                .getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Unbind process from network
                connectivityManager.bindProcessToNetwork(null)
            }

            // Unregister network callback
            networkCallback?.let {
                try {
                    connectivityManager.unregisterNetworkCallback(it)
                    networkCallback = null
                } catch (e: Exception) {
                    Log.w(TAG, "Error unregistering callback: ${e.message}")
                }
            }

            // For legacy Android, try to reconnect to previous network
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && !previousSsid.isNullOrEmpty()) {
                reconnectToPreviousWifi()
            }

            previousSsid = null
            Log.d(TAG, "Disconnected from Soft AP")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error disconnecting from AP: ${e.message}")
            promise.reject("WIFI_ERROR", e.message)
        }
    }

    @Suppress("DEPRECATION")
    private fun reconnectToPreviousWifi() {
        if (previousSsid.isNullOrEmpty()) return

        try {
            val wifiManager = reactApplicationContext.applicationContext
                .getSystemService(Context.WIFI_SERVICE) as WifiManager

            val configuredNetworks = wifiManager.configuredNetworks ?: return
            for (config in configuredNetworks) {
                var configSsid = config.SSID ?: continue
                if (configSsid.startsWith("\"") && configSsid.endsWith("\"")) {
                    configSsid = configSsid.substring(1, configSsid.length - 1)
                }
                if (configSsid == previousSsid) {
                    wifiManager.disconnect()
                    wifiManager.enableNetwork(config.networkId, true)
                    wifiManager.reconnect()
                    Log.d(TAG, "Reconnected to previous WiFi: $previousSsid")
                    break
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reconnecting to previous WiFi: ${e.message}")
        }
    }

    /**
     * Get saved previous WiFi SSID
     */
    @ReactMethod
    fun getPreviousWifiSsid(promise: Promise) {
        promise.resolve(previousSsid ?: "")
    }

    /**
     * Check if phone is connected to a specific WiFi SSID
     */
    @ReactMethod
    fun isConnectedToSsid(targetSsid: String, promise: Promise) {
        try {
            val wifiManager = reactApplicationContext.applicationContext
                .getSystemService(Context.WIFI_SERVICE) as WifiManager
            val wifiInfo = wifiManager.connectionInfo
            var currentSsid = wifiInfo?.ssid ?: ""
            if (currentSsid.startsWith("\"") && currentSsid.endsWith("\"")) {
                currentSsid = currentSsid.substring(1, currentSsid.length - 1)
            }
            val isConnected = currentSsid == targetSsid
            Log.d(TAG, "isConnectedToSsid: current=$currentSsid, target=$targetSsid, result=$isConnected")
            promise.resolve(isConnected)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking SSID connection: ${e.message}")
            promise.reject("WIFI_ERROR", e.message)
        }
    }

    // ============ Soft AP Configuration Methods ============

    /**
     * Get gateway IP address (device IP when connected to Soft AP)
     */
    @ReactMethod
    fun getGatewayIp(promise: Promise) {
        try {
            val wifiManager = reactApplicationContext.applicationContext
                .getSystemService(Context.WIFI_SERVICE) as WifiManager
            val dhcpInfo = wifiManager.dhcpInfo
            val gatewayIp = dhcpInfo?.gateway ?: 0

            if (gatewayIp == 0) {
                promise.reject("WIFI_ERROR", "No gateway IP found")
                return
            }

            // Convert to IP string
            val ip = String.format(
                "%d.%d.%d.%d",
                gatewayIp and 0xFF,
                (gatewayIp shr 8) and 0xFF,
                (gatewayIp shr 16) and 0xFF,
                (gatewayIp shr 24) and 0xFF
            )
            Log.d(TAG, "Gateway IP: $ip")
            promise.resolve(ip)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting gateway IP: ${e.message}")
            promise.reject("WIFI_ERROR", e.message)
        }
    }

    /**
     * Get WiFi list from device via Soft AP (local SDK call)
     * @param gatewayIp - Device IP (usually 192.168.x.1)
     * @param devicePassword - Device password (SC code)
     * @param isScDevice - true if device uses SC code (no login required)
     */
    @ReactMethod
    fun getSoftApWifiList(gatewayIp: String, devicePassword: String, isScDevice: Boolean, promise: Promise) {
        Log.d(TAG, "getSoftApWifiList: gatewayIp=$gatewayIp, isScDevice=$isScDevice")

        try {
            val handler = object : Handler(Looper.getMainLooper()) {
                override fun handleMessage(msg: Message) {
                    Log.d(TAG, "getSoftApWifiList response: arg1=${msg.arg1}, arg2=${msg.arg2}")

                    if (msg.arg1 == 0) {
                        // Success
                        val wifiList = Arguments.createArray()
                        val wlanInfoList = msg.obj as? List<*>

                        Log.d(TAG, "========== WiFi List from SDK ==========")
                        Log.d(TAG, "Raw list size: ${wlanInfoList?.size ?: 0}")

                        wlanInfoList?.forEachIndexed { index, item ->
                            if (item is WlanInfo) {
                                Log.d(TAG, "WiFi[$index]: SSID='${item.wlanSSID}', Signal=${item.wlanQuality}, Auth=${item.wlanAuthMode}, Encr=${item.wlanEncrAlgr}")
                                val wifiItem = Arguments.createMap().apply {
                                    putString("ssid", item.wlanSSID ?: "")
                                    putInt("encryptionType", item.wlanEncry)
                                    putInt("signal", item.wlanQuality)
                                    // Check if open network (authMode=0 and encrAlgr=0)
                                    val isOpen = item.wlanAuthMode == 0 && item.wlanEncrAlgr == 0
                                    putBoolean("isOpen", isOpen)
                                    putInt("authMode", item.wlanAuthMode)
                                }
                                wifiList.pushMap(wifiItem)
                            }
                        }

                        Log.d(TAG, "========================================")
                        Log.d(TAG, "WiFi list count returned to JS: ${wifiList.size()}")
                        promise.resolve(wifiList)
                    } else {
                        val errorMsg = if (msg.obj != null) msg.obj.toString() else "Unknown error"
                        Log.e(TAG, "getSoftApWifiList failed: $errorMsg")
                        promise.reject("SOFTAP_ERROR", "Failed to get WiFi list: $errorMsg")
                    }
                }
            }

            // Call SDK method
            if (isScDevice) {
                LCOpenSDK_SoftAPConfig.getSoftApWifiList(gatewayIp, "", true, handler)
            } else {
                LCOpenSDK_SoftAPConfig.getSoftApWifiList(gatewayIp, devicePassword, false, handler)
            }
        } catch (e: Exception) {
            Log.e(TAG, "getSoftApWifiList error: ${e.message}")
            promise.reject("SOFTAP_ERROR", e.message)
        }
    }

    /**
     * Send WiFi credentials to device via Soft AP (local SDK call)
     * @param ssid - Target WiFi SSID
     * @param password - Target WiFi password
     * @param encryptionType - Encryption type from WlanInfo
     * @param gatewayIp - Device IP
     * @param devicePassword - Device password (SC code)
     * @param deviceSn - Device serial number
     */
    @ReactMethod
    fun startSoftApConfig(
        ssid: String,
        password: String,
        encryptionType: Int,
        gatewayIp: String,
        devicePassword: String,
        deviceSn: String,
        promise: Promise
    ) {
        Log.d(TAG, "startSoftApConfig: ssid=$ssid, gatewayIp=$gatewayIp, deviceSn=$deviceSn, encryptionType=$encryptionType")

        try {
            val handler = object : Handler(Looper.getMainLooper()) {
                override fun handleMessage(msg: Message) {
                    Log.d(TAG, "startSoftApConfig response: arg1=${msg.arg1}, arg2=${msg.arg2}")

                    if (msg.arg1 == 0) {
                        Log.d(TAG, "WiFi config sent successfully")
                        promise.resolve(true)
                    } else {
                        val errorMsg = if (msg.obj != null) msg.obj.toString() else "Unknown error"
                        Log.e(TAG, "startSoftApConfig failed: $errorMsg")
                        promise.reject("SOFTAP_ERROR", "Failed to configure WiFi: $errorMsg")
                    }
                }
            }

            // Call SDK method
            // Parameters: ssid, password, encryptionType, gatewayIp, devicePassword,
            //             isNeedInit, handler, timeout, deviceSn, productId
            LCOpenSDK_SoftAPConfig.startSoftAPConfig(
                ssid,
                password,
                encryptionType,
                gatewayIp,
                devicePassword,
                true,           // isNeedInit
                handler,
                30000,          // 30 seconds timeout
                deviceSn,
                ""              // productId (optional)
            )
        } catch (e: Exception) {
            Log.e(TAG, "startSoftApConfig error: ${e.message}")
            promise.reject("SOFTAP_ERROR", e.message)
        }
    }
}
