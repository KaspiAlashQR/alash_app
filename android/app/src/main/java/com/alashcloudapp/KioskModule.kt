package com.alashcloudapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class KioskModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "KioskModule"
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
}