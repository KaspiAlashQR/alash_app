const sharp = require('sharp');
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

async function generateIcons() {
  try {
    // Проверяем наличие исходного файла
    if (!fs.existsSync(sourceIcon)) {
      console.error('Ошибка: файл Icon.png не найден в src/Icon.png');
      process.exit(1);
    }

    console.log('Генерация иконок Android из Icon.png...\n');

    // Генерируем иконки для каждой папки
    for (const [folder, size] of Object.entries(iconSizes)) {
      const folderPath = path.join(androidResPath, folder);
      
      // Создаем папку если её нет
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      // Генерируем обычную иконку (квадратную)
      const squareIconPath = path.join(folderPath, 'ic_launcher.png');
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(squareIconPath);
      console.log(`✓ Создан ${squareIconPath} (${size}x${size})`);

      // Генерируем круглую иконку
      const roundIconPath = path.join(folderPath, 'ic_launcher_round.png');
      
      // Создаем круглую маску
      const rounded = await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
      .composite([
        {
          input: Buffer.from(
            `<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
          ),
          blend: 'dest-in'
        }
      ])
      .png()
      .toBuffer();

      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .composite([{ input: rounded, blend: 'dest-in' }])
        .png()
        .toFile(roundIconPath);
      console.log(`✓ Создан ${roundIconPath} (${size}x${size}, круглый)`);
    }

    console.log('\n✓ Все иконки успешно сгенерированы!');
    console.log('\nТеперь пересоберите приложение:');
    console.log('  cd android');
    console.log('  ./gradlew clean');
    console.log('  ./gradlew assembleRelease');

  } catch (error) {
    console.error('Ошибка при генерации иконок:', error);
    process.exit(1);
  }
}

generateIcons();

