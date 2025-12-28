package com.gomarket

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.util.Log
import android.view.View
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context

class NormalLauncherActivity : Activity() {

    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var adminComponentName: ComponentName

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d("AlashLauncher", "NormalLauncherActivity запущен")
        
        // Инициализация Device Policy Manager
        devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponentName = ComponentName(this, KioskAdminReceiver::class.java)
        
        // Проверяем, является ли приложение Device Owner
        if (devicePolicyManager.isDeviceOwnerApp(packageName)) {
            Log.d("AlashLauncher", "Device Owner активен, переключение на MainActivity")
            launchKioskMode()
            return
        }
        
        setupUI()
    }

    private fun setupUI() {
        // Создаем простой UI программно
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(64, 64, 64, 64)
        }

        // Заголовок
        val titleText = TextView(this).apply {
            text = "Go Market Launcher"
            textSize = 24f
            setPadding(0, 0, 0, 32)
        }
        layout.addView(titleText)

        // Статус Device Owner
        val statusText = TextView(this).apply {
            textSize = 16f
            setPadding(0, 0, 0, 16)
            updateDeviceOwnerStatus(this)
        }
        layout.addView(statusText)

        // Кнопка запуска киоск-режима
        val launchKioskButton = Button(this).apply {
            text = "Запустить Киоск-режим"
            setPadding(0, 16, 0, 16)
            setOnClickListener {
                launchKioskMode()
            }
        }
        layout.addView(launchKioskButton)

        // Кнопка настроек Android
        val settingsButton = Button(this).apply {
            text = "Настройки Android"
            setPadding(0, 16, 0, 16)
            setOnClickListener {
                openAndroidSettings()
            }
        }
        layout.addView(settingsButton)

        // Информационный текст
        val infoText = TextView(this).apply {
            text = """
                
                📱 Обычный режим планшета
                
                • Все функции Android доступны
                • Можно устанавливать приложения
                • Доступ к настройкам системы
                
                Для активации киоск-режима:
                1. Установите Device Owner через ADB
                2. Киоск запустится автоматически
            """.trimIndent()
            textSize = 14f
            setPadding(0, 32, 0, 0)
        }
        layout.addView(infoText)

        setContentView(layout)
    }

    private fun updateDeviceOwnerStatus(textView: TextView) {
        val isDeviceOwner = devicePolicyManager.isDeviceOwnerApp(packageName)
        
        if (isDeviceOwner) {
            textView.text = "🟢 Device Owner: АКТИВЕН (Киоск-режим доступен)"
            textView.setTextColor(0xFF4CAF50.toInt()) // Зеленый
        } else {
            textView.text = "🔴 Device Owner: НЕ АКТИВЕН (Обычный режим)"
            textView.setTextColor(0xFFF44336.toInt()) // Красный
        }
    }

    private fun launchKioskMode() {
        try {
            Log.d("AlashLauncher", "Запуск киоск-режима...")
            
            val isDeviceOwner = devicePolicyManager.isDeviceOwnerApp(packageName)
            
            if (isDeviceOwner) {
                // Если Device Owner активен, запускаем MainActivity
                val intent = Intent(this, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK)
                }
                startActivity(intent)
                finish()
            } else {
                // Если Device Owner не активен, показываем инструкцию
                val infoIntent = Intent().apply {
                    action = "android.settings.APPLICATION_DETAILS_SETTINGS"
                    data = android.net.Uri.fromParts("package", packageName, null)
                }
                startActivity(infoIntent)
            }
        } catch (e: Exception) {
            Log.e("AlashLauncher", "Ошибка запуска киоск-режима: ${e.message}")
        }
    }

    private fun openAndroidSettings() {
        try {
            val intent = Intent().apply {
                action = android.provider.Settings.ACTION_SETTINGS
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        } catch (e: Exception) {
            Log.e("AlashLauncher", "Ошибка открытия настроек: ${e.message}")
        }
    }

    override fun onResume() {
        super.onResume()
        
        // Обновляем статус при возврате на экран
        val statusText = findViewById<TextView>(android.R.id.text1)
        statusText?.let { updateDeviceOwnerStatus(it) }
        
        Log.d("AlashLauncher", "NormalLauncherActivity возобновлен")
    }
}