# Структура проекта AlashCloudApp
AlashCloudApp/
│
├─ android/                  # Нативная часть Android (Gradle, сборка APK)
├─ ios/                      # Нативная часть iOS
├─ node_modules/             # Установленные npm-пакеты
│
├─ src/                      # Основной код приложения
│   ├─ api/                  # Работа с REST API / AlashCloud
│   │   ├─ example.ts        
│   ├─ components/           # UI-компоненты, переиспользуемые на разных экранах
│   │   ├─ Example.tsx        
│   ├─ screens/              # Экраны приложения (шаблоны)
│   │   ├─ Example.tsx    
│   ├─ utils/                # Вспомогательные функции и константы
│   │   ├─ example.ts        
│   └─ App.tsx               # Корневой компонент, навигация
│
├─ .eslintrc.js              # Конфигурация ESLint
├─ .prettierrc.js            # Конфигурация Prettier
├─ babel.config.js           # Babel-конфигурация
├─ package.json              # NPM-зависимости и скрипты
├─ tsconfig.json             # TypeScript-конфигурация
├─ metro.config.js           # Metro bundler конфигурация
└─ README.md                 # Документация проекта

