const fs = require('fs');
const path = require('path');

// Размеры иконок для Android
const iconSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

const sourceIcon = path.join(__dirname, 'src', 'Icon.png');
const androidResPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

console.log('Генерация иконок Android из Icon.png...');
console.log('Исходный файл:', sourceIcon);

// Проверяем наличие исходного файла
if (!fs.existsSync(sourceIcon)) {
  console.error('Ошибка: файл Icon.png не найден в src/Icon.png');
  process.exit(1);
}

// Инструкции для пользователя
console.log('\n=== ИНСТРУКЦИЯ ПО ГЕНЕРАЦИИ ИКОНОК ===\n');
console.log('Для генерации иконок Android вам нужно:');
console.log('1. Установить библиотеку для обработки изображений:');
console.log('   npm install --save-dev sharp\n');
console.log('2. Запустить скрипт с sharp:');
console.log('   node generate-icons-sharp.js\n');
console.log('ИЛИ использовать онлайн-сервис:');
console.log('   https://icon.kitchen/');
console.log('   https://www.appicon.co/');
console.log('   https://makeappicon.com/\n');
console.log('=== РАЗМЕРЫ ИКОНОК ДЛЯ ANDROID ===\n');
console.log('Нужно создать следующие размеры:');
Object.entries(iconSizes).forEach(([folder, size]) => {
  console.log(`  ${folder}: ${size}x${size}px`);
  console.log(`    - ic_launcher.png (${size}x${size})`);
  console.log(`    - ic_launcher_round.png (${size}x${size}, круглый)`);
});
console.log('\n=== ПУТИ К ФАЙЛАМ ===\n');
Object.keys(iconSizes).forEach(folder => {
  const folderPath = path.join(androidResPath, folder);
  console.log(`${folder}:`);
  console.log(`  ${path.join(folderPath, 'ic_launcher.png')}`);
  console.log(`  ${path.join(folderPath, 'ic_launcher_round.png')}`);
  console.log('');
});

