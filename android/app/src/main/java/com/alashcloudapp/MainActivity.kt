package com.alashcloudapp

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Bundle
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
    window.setFlags(
      WindowManager.LayoutParams.FLAG_FULLSCREEN,
      WindowManager.LayoutParams.FLAG_FULLSCREEN
    )
    
    // Скрыть системную навигацию
    window.decorView.systemUiVisibility = (
      View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
      or View.SYSTEM_UI_FLAG_FULLSCREEN
      or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
      or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
      or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
      or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
    )
  }

  fun enableKioskMode() {
    if (devicePolicyManager.isDeviceOwnerApp(packageName)) {
      try {
        startLockTask()
      } catch (e: Exception) {
        e.printStackTrace()
      }
    }
  }

  fun disableKioskMode() {
    if (devicePolicyManager.isDeviceOwnerApp(packageName)) {
      try {
        stopLockTask()
      } catch (e: Exception) {
        e.printStackTrace()
      }
    }
  }

  fun isInKioskMode(): Boolean {
    return devicePolicyManager.isLockTaskPermitted(packageName)
  }

  override fun onBackPressed() {
    // В киоск режиме блокируем кнопку "Назад"
    if (devicePolicyManager.isDeviceOwnerApp(packageName) && isInLockTaskMode()) {
      // Не делаем ничего - блокируем выход
      return
    }
    super.onBackPressed()
  }

  private fun isInLockTaskMode(): Boolean {
    val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
    return activityManager.lockTaskModeState != android.app.ActivityManager.LOCK_TASK_MODE_NONE
  }
}
