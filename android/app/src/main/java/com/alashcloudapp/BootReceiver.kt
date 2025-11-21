package com.alashcloudapp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import android.os.Handler
import android.os.Looper

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        Log.d("AlashKiosk", "BootReceiver получил: ${intent?.action}")
        
        when (intent?.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_PACKAGE_REPLACED -> {
                Log.d("AlashKiosk", "Начинаем автозапуск приложения")
                
                // Запускаем с небольшой задержкой для надежности
                Handler(Looper.getMainLooper()).postDelayed({
                    startApp(context)
                }, 3000) // 3 секунды задержки
                
                // Также пробуем запустить сразу
                startApp(context)
            }
        }
    }
    
    private fun startApp(context: Context?) {
        try {
            Log.d("AlashKiosk", "Запускаем приложение...")
            
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION)
                addFlags(Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
                addFlags(Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT)
            }
            
            context?.startActivity(launchIntent)
            Log.d("AlashKiosk", "Приложение запущено успешно")
            
        } catch (e: Exception) {
            Log.e("AlashKiosk", "Ошибка автозапуска: ${e.message}")
        }
    }
}