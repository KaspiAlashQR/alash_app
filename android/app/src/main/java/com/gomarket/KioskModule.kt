package com.gomarket

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableNativeMap

class KioskModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "KioskModule"
    }

    override fun getConstants(): Map<String, Any> {
        return mapOf(
            "versionName" to BuildConfig.VERSION_NAME,
            "versionCode" to BuildConfig.VERSION_CODE
        )
    }

    @ReactMethod
    fun enableKioskMode(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity as? MainActivity
            if (activity != null) {
                activity.enableKioskMode()
                promise.resolve("Киоск режим включен")
            } else {
                promise.reject("ERROR", "Activity не найден")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun disableKioskMode(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity as? MainActivity
            if (activity != null) {
                activity.disableKioskMode()
                promise.resolve("Киоск режим отключен")
            } else {
                promise.reject("ERROR", "Activity не найден")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun isKioskModeEnabled(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity as? MainActivity
            if (activity != null) {
                val isEnabled = activity.isInKioskMode()
                promise.resolve(isEnabled)
            } else {
                promise.reject("ERROR", "Activity не найден")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getKioskStatus(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity as? MainActivity
            if (activity != null) {
                val status = activity.getDetailedKioskStatus()
                promise.resolve(status)
            } else {
                promise.reject("ERROR", "Activity не найден")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun toggleFullScreenMode(enable: Boolean, promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity as? MainActivity
            if (activity != null) {
                if (enable) {
                    activity.enableFullScreenMode()
                } else {
                    activity.disableFullScreenMode()
                }
                promise.resolve("Полноэкранный режим ${if (enable) "включен" else "отключен"}")
            } else {
                promise.reject("ERROR", "Activity не найден")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun toggleLockTaskMode(enable: Boolean, promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity as? MainActivity
            if (activity != null) {
                if (enable) {
                    activity.startLockTaskMode()
                } else {
                    activity.stopLockTaskMode()
                }
                promise.resolve("Lock Task режим ${if (enable) "включен" else "отключен"}")
            } else {
                promise.reject("ERROR", "Activity не найден")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun disableDeviceOwner(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity as? MainActivity
            if (activity != null) {
                val success = activity.disableDeviceOwner()
                if (success) {
                    promise.resolve("Device Owner отключен, переходим в обычный режим")
                } else {
                    promise.reject("ERROR", "Не удалось отключить Device Owner")
                }
            } else {
                promise.reject("ERROR", "Activity не найден")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun installApk(filePath: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val file = java.io.File(filePath)
            if (!file.exists()) {
                promise.reject("ERROR", "APK файл не найден: $filePath")
                return
            }
            val apkUri = androidx.core.content.FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file
            )
            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or
                        android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION
            }
            context.startActivity(intent)
            promise.resolve("Установка APK запущена")
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}