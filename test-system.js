#!/usr/bin/env node

/**
 * Интерактивный скрипт для тестирования системы
 * Использование: node test-system.js
 */

import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

console.log("🧪 Тестирование системы Google Sheets + OpenRouter\n");
console.log("=".repeat(50));

// Проверка переменных окружения
console.log("\n📋 Шаг 1: Проверка переменных окружения\n");

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const GOOGLE_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;

let hasErrors = false;

if (!OPENROUTER_KEY) {
  console.log("❌ OPENROUTER_KEY не установлен");
  console.log("   Установите: $env:OPENROUTER_KEY = 'your-key'");
  hasErrors = true;
} else {
  console.log(`✅ OPENROUTER_KEY установлен (${OPENROUTER_KEY.substring(0, 10)}...)`);
}

if (!GOOGLE_CREDENTIALS) {
  console.log("❌ GOOGLE_APPLICATION_CREDENTIALS не установлен");
  console.log("   Установите: $env:GOOGLE_APPLICATION_CREDENTIALS = 'path/to/file.json'");
  hasErrors = true;
} else {
  // Проверяем, является ли это файлом или JSON строкой
  if (existsSync(GOOGLE_CREDENTIALS)) {
    console.log(`✅ GOOGLE_APPLICATION_CREDENTIALS установлен (файл: ${GOOGLE_CREDENTIALS})`);
    try {
      const creds = JSON.parse(readFileSync(GOOGLE_CREDENTIALS, "utf8"));
      console.log(`   Email: ${creds.client_email || 'не найден'}`);
    } catch (error) {
      console.log(`   ⚠️  Ошибка чтения файла: ${error.message}`);
      hasErrors = true;
    }
  } else {
    console.log("✅ GOOGLE_APPLICATION_CREDENTIALS установлен (JSON строка)");
    try {
      const creds = JSON.parse(GOOGLE_CREDENTIALS);
      console.log(`   Email: ${creds.client_email || 'не найден'}`);
    } catch (error) {
      console.log(`   ⚠️  Ошибка парсинга JSON: ${error.message}`);
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.log("\n❌ Не все переменные окружения установлены!");
  console.log("\n📖 Инструкции:");
  console.log("   1. Откройте PowerShell");
  console.log("   2. Установите переменные:");
  console.log("      $env:OPENROUTER_KEY = 'your-key'");
  console.log("      $env:GOOGLE_APPLICATION_CREDENTIALS = 'path/to/file.json'");
  console.log("   3. Запустите этот скрипт снова");
  process.exit(1);
}

// Тест OpenRouter
console.log("\n📋 Шаг 2: Тест OpenRouter API\n");
try {
  console.log("Запуск теста OpenRouter...");
  execSync("npm run test:openrouter", { stdio: "inherit" });
  console.log("\n✅ Тест OpenRouter завершен успешно!");
} catch (error) {
  console.log("\n❌ Тест OpenRouter завершился с ошибкой");
  console.log("   Проверьте ваш OPENROUTER_KEY");
  process.exit(1);
}

// Тест Google Sheets
console.log("\n📋 Шаг 3: Тест Google Sheets API\n");
const spreadsheetId = process.argv[2];
const sheetName = process.argv[3] || "Sheet1";

if (spreadsheetId) {
  try {
    console.log(`Запуск теста Google Sheets для таблицы: ${spreadsheetId}`);
    execSync(`npm run test:sheets "${spreadsheetId}" "${sheetName}"`, { stdio: "inherit" });
    console.log("\n✅ Тест Google Sheets завершен успешно!");
  } catch (error) {
    console.log("\n⚠️  Тест Google Sheets завершился с ошибкой");
    console.log("   Проверьте:");
    console.log("   - Правильность SPREADSHEET_ID");
    console.log("   - Доступ Service Account к таблице");
    console.log("   - Права доступа (должны быть 'Редактор')");
  }
} else {
  console.log("ℹ️  SPREADSHEET_ID не указан. Пропускаем тест Google Sheets.");
  console.log("   Для полного теста запустите:");
  console.log(`   node test-system.js SPREADSHEET_ID "${sheetName}"`);
}

// Итоговый отчет
console.log("\n" + "=".repeat(50));
console.log("📊 Итоговый отчет:\n");

if (spreadsheetId) {
  console.log("✅ Все основные тесты пройдены!");
  console.log("\n🚀 Следующие шаги:");
  console.log("   1. Убедитесь, что Apps Script настроен правильно");
  console.log("   2. Проверьте GitHub Secrets (OPENROUTER_KEY, GOOGLE_APPLICATION_CREDENTIALS)");
  console.log("   3. Протестируйте через Google Sheets меню");
} else {
  console.log("✅ Базовые тесты пройдены!");
  console.log("\n📝 Для полного тестирования:");
  console.log("   1. Укажите SPREADSHEET_ID при запуске этого скрипта");
  console.log("   2. Или запустите: npm run test:sheets SPREADSHEET_ID");
  console.log("   3. Затем протестируйте через Google Sheets меню");
}

console.log("\n📖 Подробные инструкции: см. TESTING.md");

