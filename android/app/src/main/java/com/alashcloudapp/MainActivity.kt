package com.alashcloudapp

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  private lateinit var devicePolicyManager: DevicePolicyManager
  private lateinit var adminComponentName: ComponentName

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
      android.util.Log.d("AlashKiosk", "Device Owner активен, включаем киоск режим")
      setupKioskMode()
    } else {
      android.util.Log.w("AlashKiosk", "Device Owner НЕ активен!")
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "AlashCloudApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  private fun setupFullScreenMode() {
    android.util.Log.d("AlashKiosk", "Настраиваем полноэкранный режим")
    
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
        // Полностью останавливаем Lock Task
        stopLockTask()
        android.util.Log.d("AlashKiosk", "Lock Task остановлен")
        
        // Восстанавливаем нормальный UI для админки
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
        android.util.Log.d("AlashKiosk", "Системный UI восстановлен")
        
        android.util.Log.d("AlashKiosk", "Киоск режим полностью отключен")
      } catch (e: Exception) {
        android.util.Log.e("AlashKiosk", "Ошибка отключения киоска: ${e.message}")
        e.printStackTrace()
      }
    }
  }

  fun isInKioskMode(): Boolean {
    return devicePolicyManager.isLockTaskPermitted(packageName)
  }

  override fun onBackPressed() {
    android.util.Log.d("AlashKiosk", "onBackPressed: попытка выхода")
    // Блокируем кнопку "Назад" только в Lock Task режиме
    if (devicePolicyManager.isDeviceOwnerApp(packageName) && isInLockTaskMode()) {
      android.util.Log.d("AlashKiosk", "Кнопка Back заблокирована - Lock Task активен")
      // Не делаем ничего - блокируем выход
      return
    }
    android.util.Log.d("AlashKiosk", "Разрешаем выход - Lock Task неактивен")
    super.onBackPressed()
  }

  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    android.util.Log.d("AlashKiosk", "onKeyDown: keyCode=$keyCode")
    
    // Блокируем системные кнопки только в Lock Task режиме
    if (devicePolicyManager.isDeviceOwnerApp(packageName) && isInLockTaskMode()) {
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
      android.util.Log.d("AlashKiosk", "Lock Task выключен - кнопки работают нормально")
    }
    
    return super.onKeyDown(keyCode, event)
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus && devicePolicyManager.isDeviceOwnerApp(packageName)) {
      // Восстанавливаем fullscreen только если Lock Task активен
      if (isInLockTaskMode()) {
        setupFullScreenMode()
        android.util.Log.d("AlashKiosk", "Fullscreen восстановлен в Lock Task режиме")
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
