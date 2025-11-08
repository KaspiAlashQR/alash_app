# Установка AlashCloud как Device Owner для киоск-режима

## Подготовка устройства
1. Включить режим разработчика на планшете:
   - Настройки → О планшете → Номер сборки (тапнуть 7 раз)

2. Включить отладку по USB:
   - Настройки → Для разработчиков → Отладка по USB ✓

3. **ВАЖНО!** Выполнить сброс устройства до заводских настроек
   - Device Owner можно установить только на чистом устройстве
   - Не добавлять Google аккаунт или другие аккаунты

## Установка приложения как Device Owner

### Шаг 1: Сборка и установка приложения
```bash
cd c:\Users\amang\Desktop\AlashCloudApp
npx react-native run-android --mode=release
```

### Шаг 2: Получение имени пакета
```bash
adb shell pm list packages | findstr alash
```
Результат: `package:com.alashcloudapp`

### Шаг 3: Установка как Device Owner
```bash
adb shell dpm set-device-owner com.alashcloudapp/.KioskAdminReceiver
```

**Ожидаемый результат:**
```
Success: Device owner set to package com.alashcloudapp
Active admin set to com.alashcloudapp/.KioskAdminReceiver
```

### Шаг 4: Проверка установки
```bash
adb shell dpm list-owners
```
Должно показать: `Device owner component: com.alashcloudapp/.KioskAdminReceiver`

## Возможные ошибки и решения

### Ошибка: "Not allowed to set the device owner"
**Причина:** На устройстве уже есть аккаунты пользователей
**Решение:** Сбросить устройство до заводских настроек

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
adb shell dpm remove-active-admin com.alashcloudapp/.KioskAdminReceiver
```

## После установки Device Owner
Приложение получит права:
- ✓ Включать/выключать Lock Task Mode
- ✓ Блокировать системные жесты
- ✓ Контролировать установку приложений
- ✓ Управлять системными настройками