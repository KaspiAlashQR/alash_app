package com.gomarket

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

class MainActivity : ReactActivity() {

  private lateinit var devicePolicyManager: DevicePolicyManager
  private lateinit var adminComponentName: ComponentName
  private var isAdminModeActive = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Инициализация Device Policy Manager
    devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    adminComponentName = ComponentName(this, KioskAdminReceiver::class.java)
    
    // Настройка полноэкранного режима
    setupFullScreenMode()
    
    // Автоматическая активация киоск режима
    android.util.Log.d("AlashKiosk", "onCreate: проверяем Device Owner статус")
    if (devicePolicyManager.isDeviceOwnerApp(packageName)) {
      android.util.Log.d("AlashKiosk", "Device Owner активен, настраиваем киоск режим")
      setupKioskMode()
    } else {
      android.util.Log.w("AlashKiosk", "Device Owner НЕ активен - работаем как обычное приложение")
      // Если Device Owner не активен, не включаем киоск-ограничения
      // Это позволяет запускать MainActivity из NormalLauncherActivity для тестирования
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "gomarket"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  private fun setupFullScreenMode() {
    android.util.Log.d("AlashKiosk", "Настраиваем полноэкранный режим")
    if (!isFinishing && window != null) {
      window.setFlags(
        WindowManager.LayoutParams.FLAG_FULLSCREEN or
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
        WindowManager.LayoutParams.FLAG_FULLSCREEN or
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
      // Принудительное скрытие системных элементов
      window.decorView.systemUiVisibility = (
        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        or View.SYSTEM_UI_FLAG_FULLSCREEN
        or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        or View.SYSTEM_UI_FLAG_LOW_PROFILE
      )
    } else {
      android.util.Log.w("AlashKiosk", "setupFullScreenMode: window is null or finishing")
    }
  }

  private fun setupKioskMode() {
    android.util.Log.d("AlashKiosk", "setupKioskMode: начинаем настройку киоск режима")
    
    try {
      // Разрешаем Lock Task для нашего приложения
      devicePolicyManager.setLockTaskPackages(adminComponentName, arrayOf(packageName))
      android.util.Log.d("AlashKiosk", "Lock Task packages установлены")
      
      // Отключаем экран блокировки через Device Policy
      try {
        devicePolicyManager.setKeyguardDisabled(adminComponentName, true)
        android.util.Log.d("AlashKiosk", "Keyguard отключен")
      } catch (e: Exception) {
        android.util.Log.w("AlashKiosk", "Не удалось отключить Keyguard: ${e.message}")
      }
      
      // Устанавливаем наше приложение как launcher по умолчанию
      try {
        val intentFilter = android.content.IntentFilter().apply {
          addAction(android.content.Intent.ACTION_MAIN)
          addCategory(android.content.Intent.CATEGORY_HOME)
          addCategory(android.content.Intent.CATEGORY_DEFAULT)
        }
        
        devicePolicyManager.addPersistentPreferredActivity(
          adminComponentName,
          intentFilter,
          android.content.ComponentName(packageName, MainActivity::class.java.name)
        )
        android.util.Log.d("AlashKiosk", "Установлен как launcher по умолчанию")
      } catch (e: Exception) {
        android.util.Log.w("AlashKiosk", "Не удалось установить как launcher: ${e.message}")
      }
      
      // Принудительно активируем Lock Task
      startLockTask()
      android.util.Log.d("AlashKiosk", "Lock Task активирован!")
      
    } catch (e: Exception) {
      android.util.Log.e("AlashKiosk", "Ошибка настройки киоска: ${e.message}")
      e.printStackTrace()
    }
  }

  fun enableKioskMode() {
    android.util.Log.d("AlashKiosk", "enableKioskMode вызван")
    if (devicePolicyManager.isDeviceOwnerApp(packageName)) {
      try {
        // Сбрасываем флаг админ-режима
        isAdminModeActive = false
        
        // Сначала восстанавливаем fullscreen
        setupFullScreenMode()
        
        // Затем активируем Lock Task
        devicePolicyManager.setLockTaskPackages(adminComponentName, arrayOf(packageName))
        startLockTask()
        android.util.Log.d("AlashKiosk", "Киоск режим включен")
      } catch (e: Exception) {
        android.util.Log.e("AlashKiosk", "Ошибка включения киоска: ${e.message}")
        e.printStackTrace()
      }
    } else {
      android.util.Log.w("AlashKiosk", "Device Owner не активен")
    }
  }

  fun disableKioskMode() {
    android.util.Log.d("AlashKiosk", "disableKioskMode вызван")
    if (devicePolicyManager.isDeviceOwnerApp(packageName)) {
      try {
        // Устанавливаем флаг админ-режима
        isAdminModeActive = true
        // Полностью останавливаем Lock Task
        try {
          stopLockTask()
          android.util.Log.d("AlashKiosk", "Lock Task остановлен")
        } catch (e: Exception) {
          android.util.Log.w("AlashKiosk", "Lock Task уже был остановлен: ${e.message}")
        }
        // Снимаем все ограничения Device Owner
        try {
          devicePolicyManager.setLockTaskPackages(adminComponentName, arrayOf())
        } catch (e: Exception) {
          android.util.Log.w("AlashKiosk", "Не удалось очистить LockTaskPackages: ${e.message}")
        }
        try {
          devicePolicyManager.setKeyguardDisabled(adminComponentName, false)
        } catch (e: Exception) {
          android.util.Log.w("AlashKiosk", "Не удалось включить keyguard: ${e.message}")
        }
        try {
          devicePolicyManager.clearPackagePersistentPreferredActivities(adminComponentName, packageName)
        } catch (e: Exception) {
          android.util.Log.w("AlashKiosk", "Не удалось очистить preferred activities: ${e.message}")
        }
        // Восстанавливаем нормальный UI для админки
        if (!isFinishing && window != null) {
          window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
          android.util.Log.d("AlashKiosk", "Системный UI восстановлен")
        }
        android.util.Log.d("AlashKiosk", "Киоск режим полностью отключен, админ-режим активен")
        // Переводим приложение в фон, чтобы пользователь мог выйти
        moveTaskToBack(true)
      } catch (e: Exception) {
        android.util.Log.e("AlashKiosk", "Ошибка отключения киоска: ${e.message}")
        e.printStackTrace()
      }
    }
  }

  fun isInKioskMode(): Boolean {
    return isInLockTaskMode()
  }

  fun getDetailedKioskStatus(): WritableMap {
    val status = Arguments.createMap()
    val isInLockTask = isInLockTaskMode()
    
    status.putBoolean("lockTaskMode", isInLockTask)
    status.putBoolean("fullscreenMode", isInLockTask)
    status.putBoolean("homeButtonBlocked", isInLockTask)
    status.putBoolean("backButtonBlocked", isInLockTask)
    status.putBoolean("menuButtonBlocked", isInLockTask)
    status.putBoolean("recentAppsBlocked", isInLockTask)
    status.putBoolean("landscapeOrientation", true) // Всегда true в манифесте
    status.putBoolean("keyguardDisabled", devicePolicyManager.isDeviceOwnerApp(packageName))
    status.putBoolean("defaultLauncher", devicePolicyManager.isDeviceOwnerApp(packageName))
    status.putBoolean("autoStart", devicePolicyManager.isDeviceOwnerApp(packageName))
    
    return status
  }

  fun enableFullScreenMode() {
    android.util.Log.d("AlashKiosk", "enableFullScreenMode вызван")
    setupFullScreenMode()
  }

  fun disableFullScreenMode() {
    android.util.Log.d("AlashKiosk", "disableFullScreenMode вызван")
    window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
  }

  fun startLockTaskMode() {
    android.util.Log.d("AlashKiosk", "startLockTaskMode вызван")
    if (devicePolicyManager.isDeviceOwnerApp(packageName)) {
      try {
        devicePolicyManager.setLockTaskPackages(adminComponentName, arrayOf(packageName))
        startLockTask()
        android.util.Log.d("AlashKiosk", "Lock Task активирован")
      } catch (e: Exception) {
        android.util.Log.e("AlashKiosk", "Ошибка активации Lock Task: ${e.message}")
      }
    }
  }

  fun stopLockTaskMode() {
    android.util.Log.d("AlashKiosk", "stopLockTaskMode вызван")
    if (devicePolicyManager.isDeviceOwnerApp(packageName)) {
      try {
        stopLockTask()
        android.util.Log.d("AlashKiosk", "Lock Task остановлен")
      } catch (e: Exception) {
        android.util.Log.e("AlashKiosk", "Ошибка остановки Lock Task: ${e.message}")
      }
    }
  }

  fun disableDeviceOwner(): Boolean {
    android.util.Log.d("AlashKiosk", "disableDeviceOwner вызван")
    return if (devicePolicyManager.isDeviceOwnerApp(packageName)) {
      try {
        // Сначала останавливаем все киоск-функции
        if (isInLockTaskMode()) {
          stopLockTask()
        }
        
        // Очищаем Lock Task разрешения
        devicePolicyManager.setLockTaskPackages(adminComponentName, arrayOf())
        
        // Включаем keyguard обратно
        try {
          devicePolicyManager.setKeyguardDisabled(adminComponentName, false)
        } catch (e: Exception) {
          android.util.Log.w("AlashKiosk", "Не удалось включить keyguard: ${e.message}")
        }
        
        // Очищаем persistent preferred activity
        try {
          devicePolicyManager.clearPackagePersistentPreferredActivities(adminComponentName, packageName)
        } catch (e: Exception) {
          android.util.Log.w("AlashKiosk", "Не удалось очистить preferred activities: ${e.message}")
        }
        
        android.util.Log.d("AlashKiosk", "Device Owner функции отключены, возвращаемся к обычному лаунчеру")
        
        // Запускаем обычный лаунчер
        val intent = Intent(this, NormalLauncherActivity::class.java).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        startActivity(intent)
        finish()
        
        true
      } catch (e: Exception) {
        android.util.Log.e("AlashKiosk", "Ошибка отключения Device Owner: ${e.message}")
        e.printStackTrace()
        false
      }
    } else {
      android.util.Log.w("AlashKiosk", "Device Owner не активен")
      false
    }
  }

  override fun onBackPressed() {
    android.util.Log.d("AlashKiosk", "onBackPressed: попытка выхода, админ-режим: $isAdminModeActive")
    // Блокируем кнопку "Назад" только если НЕ в админ-режиме и Lock Task активен
    if (devicePolicyManager.isDeviceOwnerApp(packageName) && !isAdminModeActive && isInLockTaskMode()) {
      android.util.Log.d("AlashKiosk", "Кнопка Back заблокирована - Lock Task активен, админ-режим выключен")
      // Не делаем ничего - блокируем выход
      return
    }
    android.util.Log.d("AlashKiosk", "Разрешаем выход - админ-режим или Lock Task неактивен")
    super.onBackPressed()
  }

  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    android.util.Log.d("AlashKiosk", "onKeyDown: keyCode=$keyCode, админ-режим: $isAdminModeActive")
    
    // Блокируем системные кнопки только если НЕ в админ-режиме и Lock Task активен
    if (devicePolicyManager.isDeviceOwnerApp(packageName) && !isAdminModeActive && isInLockTaskMode()) {
      when (keyCode) {
        KeyEvent.KEYCODE_HOME -> {
          android.util.Log.d("AlashKiosk", "Кнопка Home заблокирована")
          return true // Блокируем
        }
        KeyEvent.KEYCODE_BACK -> {
          android.util.Log.d("AlashKiosk", "Кнопка Back заблокирована")
          return true // Блокируем
        }
        KeyEvent.KEYCODE_APP_SWITCH -> {
          android.util.Log.d("AlashKiosk", "Recent Apps заблокирован")
          return true // Блокируем
        }
        KeyEvent.KEYCODE_MENU -> {
          android.util.Log.d("AlashKiosk", "Menu заблокирован")
          return true // Блокируем
        }
      }
    } else {
      android.util.Log.d("AlashKiosk", "Админ-режим или Lock Task выключен - кнопки работают нормально")
    }
    
    return super.onKeyDown(keyCode, event)
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus && devicePolicyManager.isDeviceOwnerApp(packageName)) {
      // Восстанавливаем fullscreen только если НЕ в админ-режиме и Lock Task активен
      if (!isAdminModeActive && isInLockTaskMode()) {
        setupFullScreenMode()
        android.util.Log.d("AlashKiosk", "Fullscreen восстановлен в Lock Task режиме")
      } else if (isAdminModeActive) {
        android.util.Log.d("AlashKiosk", "Админ-режим активен - fullscreen не применяется")
      } else {
        android.util.Log.d("AlashKiosk", "Lock Task неактивен - fullscreen не применяется")
      }
    }
  }

  private fun isInLockTaskMode(): Boolean {
    val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
    return activityManager.lockTaskModeState != android.app.ActivityManager.LOCK_TASK_MODE_NONE
  }
}
