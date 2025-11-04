#!/usr/bin/env node

/**
 * Скрипт для тестирования подключения к Google Sheets API
 * Использование: node test-googlesheets.js [SPREADSHEET_ID] [SHEET_NAME]
 */

import { google } from "googleapis";
import { readFileSync, existsSync } from "fs";

const GOOGLE_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const SPREADSHEET_ID = process.argv[2] || process.env.TEST_SPREADSHEET_ID;
const SHEET_NAME = process.argv[3] || "Sheet1";

if (!GOOGLE_CREDENTIALS) {
  console.error("❌ GOOGLE_APPLICATION_CREDENTIALS не установлен");
  console.error("   Установите: export GOOGLE_APPLICATION_CREDENTIALS='path/to/file.json' или JSON строка");
  process.exit(1);
}

console.log("🧪 Тестирование подключения к Google Sheets API...\n");

function initGoogleSheets() {
  let credentials;
  
  if (existsSync(GOOGLE_CREDENTIALS)) {
    console.log(`📁 Чтение credentials из файла: ${GOOGLE_CREDENTIALS}`);
    credentials = JSON.parse(readFileSync(GOOGLE_CREDENTIALS, "utf8"));
  } else {
    console.log("📝 Чтение credentials из переменной окружения");
    credentials = JSON.parse(GOOGLE_CREDENTIALS);
  }
  
  console.log(`   Email: ${credentials.client_email}\n`);
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  
  return google.sheets({ version: "v4", auth });
}

async function testGoogleSheets() {
  try {
    const sheets = initGoogleSheets();
    
    if (!SPREADSHEET_ID) {
      console.log("ℹ️  SPREADSHEET_ID не указан. Тестирую только подключение...\n");
      
      // Просто проверяем, что credentials валидны
      console.log("✅ Credentials загружены успешно");
      console.log("\n💡 Для полного теста укажите SPREADSHEET_ID:");
      console.log("   node test-googlesheets.js SPREADSHEET_ID [SHEET_NAME]");
      return;
    }
    
    console.log(`📊 Тестирование таблицы:`);
    console.log(`   ID: ${SPREADSHEET_ID}`);
    console.log(`   Лист: ${SHEET_NAME}\n`);
    
    // Получаем метаданные таблицы
    console.log("📡 Получение информации о таблице...");
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });
    
    console.log("✅ Подключение успешно!");
    console.log(`\n📋 Название таблицы: ${spreadsheetInfo.data.properties?.title || 'неизвестно'}`);
    
    // Получаем список листов
    const sheetsList = spreadsheetInfo.data.sheets || [];
    console.log(`\n📄 Доступные листы (${sheetsList.length}):`);
    sheetsList.forEach((sheet, index) => {
      const name = sheet.properties?.title || 'неизвестно';
      const isActive = name === SHEET_NAME ? " ← тестируемый" : "";
      console.log(`   ${index + 1}. ${name}${isActive}`);
    });
    
    // Пытаемся прочитать данные
    console.log(`\n📖 Чтение данных из листа "${SHEET_NAME}"...`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:A10`
    });
    
    const rows = response.data.values || [];
    console.log(`✅ Прочитано строк: ${rows.length}`);
    
    if (rows.length > 0) {
      console.log("\n📝 Первые строки:");
      rows.slice(0, 5).forEach((row, index) => {
        console.log(`   ${index + 1}. ${row[0] || '(пусто)'}`);
      });
    } else {
      console.log("⚠️  Таблица пуста или лист не найден");
    }
    
    // Проверяем права на запись
    console.log("\n✍️  Проверка прав на запись...");
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!Z999`,
        valueInputOption: "RAW",
        requestBody: { values: [["test"]] }
      });
      
      // Удаляем тестовую запись
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!Z999`
      });
      
      console.log("✅ Права на запись подтверждены");
    } catch (error) {
      console.error("❌ Нет прав на запись:");
      console.error(`   ${error.message}`);
      console.error("\n💡 Убедитесь, что Service Account имеет права 'Редактор' в таблице");
    }
    
    console.log("\n✨ Google Sheets API работает корректно!");
    
  } catch (error) {
    console.error(`❌ Ошибка: ${error.message}`);
    
    if (error.message.includes("permission")) {
      console.error("\n💡 Возможные причины:");
      console.error("   - Service Account не имеет доступа к таблице");
      console.error("   - Таблица не существует или ID неверный");
      console.error("   - Необходимо поделиться таблицей с email Service Account");
    } else if (error.message.includes("not found")) {
      console.error("\n💡 Таблица не найдена. Проверьте SPREADSHEET_ID");
    }
    
    process.exit(1);
  }
}

testGoogleSheets();

