# Установка AlashCloud как Device Owner для киоск-режима

## Подготовка устройства
1. Включить режим разработчика на планшете:
   - Настройки → О планшете → Номер сборки (тапнуть 7 раз)

2. Включить отладку по USB:
   - Настройки → Для разработчиков → Отладка по USB ✓

3. **ВАЖНО!** Выполнить сброс устройства до заводских настроек
   - Device Owner можно установить только на чистом устройстве
   - Не добавлять Google аккаунт или другие аккаунты

## Сборка Release APK

### Шаг 1: Сборка production версии
```bash
cd D:\Workspace\alash_app
npx react-native build-android --mode=release
```

### Шаг 2: Альтернативная сборка через Gradle
```bash
cd android
.\gradlew assembleRelease
```

### Шаг 3: Найти собранный APK
APK файл будет в:
```
D:\Workspace\alash_app\android\app\build\outputs\apk\release\app-release.apk
```

## Установка приложения как Device Owner

### Шаг 4: Подключение устройства
```bash
# Проверить подключение
& "$env:ANDROID_HOME\platform-tools\adb.exe" devices
```

### Шаг 5: Установка APK на устройство
```bash
# Установить release APK
& "$env:ANDROID_HOME\platform-tools\adb.exe" install "D:\Workspace\alash_app\android\app\build\outputs\apk\release\app-release.apk"

# Проверить установку
& "$env:ANDROID_HOME\platform-tools\adb.exe" shell pm list packages | findstr alash
```

### Шаг 6: Установка как Device Owner
```bash
& "$env:ANDROID_HOME\platform-tools\adb.exe" shell dpm set-device-owner com.gomarket/.KioskAdminReceiver
```

**Ожидаемый результат:**
```
Success: Device owner set to package com.gomarket
Active admin set to com.gomarket/.KioskAdminReceiver
```

### Шаг 7: Проверка установки Device Owner
```bash
& "$env:ANDROID_HOME\platform-tools\adb.exe" shell dumpsys device_policy
```

**Должно показать:**
```
Device Owner:
  admin=ComponentInfo{com.gomarket/com.gomarket.KioskAdminReceiver}
  name=
  package=com.gomarket
```

## Активация киоск режима

### Шаг 8: Запуск приложения
```bash
& "$env:ANDROID_HOME\platform-tools\adb.exe" shell am start -n com.gomarket/.MainActivity
```

### Шаг 9: Проверка логов киоска
```bash
& "$env:ANDROID_HOME\platform-tools\adb.exe" logcat | findstr AlashKiosk
```

**Ожидаемые логи:**
```
D AlashKiosk: Device Owner активен, включаем киоск режим
D AlashKiosk: Lock Task packages установлены
D AlashKiosk: Keyguard отключен
D AlashKiosk: Установлен как launcher по умолчанию
D AlashKiosk: Lock Task активирован!
```

## Тестирование киоск режима

### Шаг 10: Проверка функций
- ✅ **Кнопка Home** - заблокирована
- ✅ **Кнопка Back** - заблокирована  
- ✅ **Recent Apps** - заблокированы
- ✅ **Панель уведомлений** - недоступна
- ✅ **Полноэкранный режим** - активен
- ✅ **PIN 202501** - открывает админку

### Шаг 11: Тест автозапуска
```bash
# Перезагрузить устройство
& "$env:ANDROID_HOME\platform-tools\adb.exe" reboot

# Проверить автозапуск в логах
& "$env:ANDROID_HOME\platform-tools\adb.exe" logcat | findstr AlashKiosk
```

**Ожидаемый результат после перезагрузки:**
- Устройство включается БЕЗ экрана блокировки
- Приложение запускается автоматически  
- Киоск режим активируется сразу

## Возможные ошибки и решения

### Ошибка: "Not allowed to set the device owner"
**Причина:** На устройстве уже есть аккаунты пользователей
**Решение:** 
1. Сбросить устройство до заводских настроек
2. НЕ добавлять Google аккаунт
3. Переустановить APK
4. Повторить установку Device Owner

### Ошибка: "Component not found"
**Причина:** APK не установлен или неправильное имя
**Решение:**
```bash
# Удалить старую версию
& "$env:ANDROID_HOME\platform-tools\adb.exe" shell pm uninstall com.gomarket

# Переустановить APK
& "$env:ANDROID_HOME\platform-tools\adb.exe" install "путь\к\app-release.apk"
```

### Киоск режим не активируется
**Проверить:**
```bash
# Статус Lock Task
& "$env:ANDROID_HOME\platform-tools\adb.exe" shell dumpsys activity | findstr -i lock

# Принудительная активация
& "$env:ANDROID_HOME\platform-tools\adb.exe" shell appops set com.gomarket SYSTEM_ALERT_WINDOW allow
```

## Удаление Device Owner (если нужно)
```bash
& "$env:ANDROID_HOME\platform-tools\adb.exe" shell dpm remove-active-admin com.gomarket/.KioskAdminReceiver
```

## Финальная проверка ✅

После успешной установки Device Owner приложение получит полные права:
- 🔒 **Полная блокировка кнопок** - Home, Back, Recent заблокированы
- 📱 **Полноэкранный режим** - без системных элементов
- 🚫 **Невозможность выхода** - Lock Task Mode активен  
- 🔄 **Автозапуск** - после перезагрузки без экрана блокировки
- 🔑 **PIN 202501** - для доступа к админке
- ⚡ **Восстановление после сбоев питания** - автоматический перезапуск

## Команды быстрого доступа

### Основные команды
```bash
# Проверка устройств
& "$env:ANDROID_HOME\platform-tools\adb.exe" devices

# Установка APK
& "$env:ANDROID_HOME\platform-tools\adb.exe" install app-release.apk

# Установка Device Owner
& "$env:ANDROID_HOME\platform-tools\adb.exe" shell dpm set-device-owner com.gomarket/.KioskAdminReceiver

# Логи киоска
& "$env:ANDROID_HOME\platform-tools\adb.exe" logcat | findstr AlashKiosk

# Перезагрузка
& "$env:ANDROID_HOME\platform-tools\adb.exe" reboot
```

**🎉 Киоск режим готов к работе!**

### Ошибка: "Admin receiver class not found"  
**Причина:** Приложение не установлено или неправильное имя класса
**Решение:** 
1. Убедиться что приложение установлено: `adb shell pm list packages | findstr alash`
2. Проверить правильность пути к классу

### Ошибка: "Package not found"
**Причина:** Неправильное имя пакета
**Решение:** Проверить applicationId в android/app/build.gradle

## Удаление Device Owner (если нужно)
```bash
adb shell dpm remove-active-admin com.gomarket/.KioskAdminReceiver
```

## После установки Device Owner
Приложение получит права:
- ✓ Включать/выключать Lock Task Mode
- ✓ Блокировать системные жесты
- ✓ Контролировать установку приложений
- ✓ Управлять системными настройками