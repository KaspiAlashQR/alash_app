package com.gomarket

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import android.os.Handler
import android.os.Looper
import android.app.admin.DevicePolicyManager
import android.content.ComponentName

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        Log.d("AlashKiosk", "BootReceiver получил: ${intent?.action}")
        
        when (intent?.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_PACKAGE_REPLACED -> {
                Log.d("AlashKiosk", "Проверяем статус Device Owner для автозапуска")
                
                // Проверяем Device Owner статус
                val devicePolicyManager = context?.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
                val isDeviceOwner = devicePolicyManager?.isDeviceOwnerApp(context.packageName) ?: false
                
                if (isDeviceOwner) {
                    Log.d("AlashKiosk", "Device Owner активен - запускаем киоск-режим")
                    
                    // Запускаем с небольшой задержкой для надежности
                    Handler(Looper.getMainLooper()).postDelayed({
                        startKioskMode(context)
                    }, 3000) // 3 секунды задержки
                    
                    // Также пробуем запустить сразу
                    startKioskMode(context)
                } else {
                    Log.d("AlashKiosk", "Device Owner НЕ активен - используется обычный лаунчер")
                    // В обычном режиме Android сам запустит NormalLauncherActivity
                }
            }
        }
    }
    
    private fun startKioskMode(context: Context?) {
        try {
            Log.d("AlashKiosk", "Запускаем киоск-режим (MainActivity)...")
            
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION)
                addFlags(Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
                addFlags(Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT)
            }
            
            context?.startActivity(launchIntent)
            Log.d("AlashKiosk", "Киоск-режим запущен успешно")
            
        } catch (e: Exception) {
            Log.e("AlashKiosk", "Ошибка автозапуска киоска: ${e.message}")
        }
    }
}