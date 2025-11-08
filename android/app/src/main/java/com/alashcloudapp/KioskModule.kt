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
}