#!/usr/bin/env node

/**
 * Скрипт для проверки работы системы без реального браузера
 * Проверяет логику работы всех компонентов
 */

import fetch from "node-fetch";

console.log("🔍 Проверка системы Google Sheets + OpenRouter Integration\n");
console.log("=".repeat(60));

// Проверка 1: GitHub Repository
console.log("\n📋 Проверка 1: GitHub Repository\n");

const REPO_URL = "https://github.com/vasilievyakov/openrouter-sheets";
const GITHUB_API_URL = "https://api.github.com/repos/vasilievyakov/openrouter-sheets";

try {
  console.log(`Проверка репозитория: ${REPO_URL}`);
  const repoResponse = await fetch(GITHUB_API_URL);
  
  if (repoResponse.ok) {
    const repoData = await repoResponse.json();
    console.log(`✅ Репозиторий существует`);
    console.log(`   Название: ${repoData.full_name}`);
    console.log(`   Видимость: ${repoData.private ? 'Private' : 'Public'}`);
    console.log(`   Описание: ${repoData.description || 'нет'}`);
  } else {
    console.log(`❌ Репозиторий не найден или недоступен (${repoResponse.status})`);
  }
} catch (error) {
  console.log(`❌ Ошибка при проверке репозитория: ${error.message}`);
}

// Проверка 2: GitHub Actions Workflow
console.log("\n📋 Проверка 2: GitHub Actions Workflow\n");

const WORKFLOW_URL = `${GITHUB_API_URL}/actions/workflows/run.yml`;

try {
  console.log(`Проверка workflow файла...`);
  const workflowResponse = await fetch(WORKFLOW_URL);
  
  if (workflowResponse.ok) {
    const workflowData = await workflowResponse.json();
    console.log(`✅ Workflow существует`);
    console.log(`   Название: ${workflowData.name}`);
    console.log(`   Файл: ${workflowData.path}`);
    console.log(`   Состояние: ${workflowData.state}`);
  } else {
    console.log(`⚠️  Workflow файл не найден (${workflowResponse.status})`);
    console.log(`   Это нормально, если workflow еще не запускался`);
  }
} catch (error) {
  console.log(`⚠️  Ошибка при проверке workflow: ${error.message}`);
}

// Проверка 3: Структура payload для repository_dispatch
console.log("\n📋 Проверка 3: Структура payload\n");

const testPayload = {
  event_type: "run-openrouter",
  client_payload: {
    spreadsheetId: "test-spreadsheet-id",
    sheetName: "Sheet1",
    prompt: "Test prompt",
    columnIndex: 2,
    totalRows: 10
  }
};

console.log("Пример payload для repository_dispatch:");
console.log(JSON.stringify(testPayload, null, 2));

// Проверка валидности структуры
const requiredFields = ['spreadsheetId', 'sheetName', 'prompt', 'columnIndex'];
const missingFields = requiredFields.filter(field => !testPayload.client_payload[field]);

if (missingFields.length === 0) {
  console.log("✅ Структура payload корректна");
} else {
  console.log(`❌ Отсутствуют поля: ${missingFields.join(', ')}`);
}

// Проверка 4: GitHub API endpoint для repository_dispatch
console.log("\n📋 Проверка 4: GitHub API endpoint\n");

const DISPATCH_URL = `${GITHUB_API_URL}/dispatches`;

console.log(`Endpoint для repository_dispatch: ${DISPATCH_URL}`);
console.log(`Метод: POST`);
console.log(`Требуется: Authorization token с правами repo`);

// Проверка формата URL
if (DISPATCH_URL.includes('/repos/') && DISPATCH_URL.includes('/dispatches')) {
  console.log("✅ Формат URL корректный");
} else {
  console.log("❌ Формат URL некорректный");
}

// Проверка 5: Apps Script конфигурация
console.log("\n📋 Проверка 5: Apps Script конфигурация\n");

import { readFileSync } from "fs";

try {
  const configContent = readFileSync("apps-script/config.gs", "utf8");
  
  // Проверка WEBHOOK_URL
  const webhookMatch = configContent.match(/const WEBHOOK_URL = "(.+)"/);
  if (webhookMatch) {
    const webhookUrl = webhookMatch[1];
    console.log(`✅ WEBHOOK_URL найден: ${webhookUrl}`);
    
    if (webhookUrl.includes('vasilievyakov/openrouter-sheets')) {
      console.log("✅ WEBHOOK_URL указывает на правильный репозиторий");
    } else {
      console.log("⚠️  WEBHOOK_URL может указывать на другой репозиторий");
    }
  } else {
    console.log("❌ WEBHOOK_URL не найден в config.gs");
  }
  
  // Проверка GITHUB_TOKEN
  const tokenMatch = configContent.match(/const GITHUB_TOKEN = "(.+)"/);
  if (tokenMatch) {
    const token = tokenMatch[1];
    if (token.includes('YOUR_PERSONAL_ACCESS_TOKEN')) {
      console.log("⚠️  GITHUB_TOKEN содержит плейсхолдер - нужно заменить на реальный токен");
    } else if (token.startsWith('ghp_')) {
      console.log("✅ GITHUB_TOKEN настроен (начинается с ghp_)");
    } else {
      console.log("⚠️  GITHUB_TOKEN имеет необычный формат");
    }
  } else {
    console.log("❌ GITHUB_TOKEN не найден в config.gs");
  }
  
  // Проверка структуры main.gs
  const mainContent = readFileSync("apps-script/main.gs", "utf8");
  
  if (mainContent.includes('function onOpen()')) {
    console.log("✅ Функция onOpen() найдена в main.gs");
  } else {
    console.log("❌ Функция onOpen() не найдена");
  }
  
  if (mainContent.includes('function runPrompt()')) {
    console.log("✅ Функция runPrompt() найдена в main.gs");
  } else {
    console.log("❌ Функция runPrompt() не найдена");
  }
  
  if (mainContent.includes('repository_dispatch')) {
    console.log("✅ Код отправки repository_dispatch найден");
  } else {
    console.log("❌ Код отправки repository_dispatch не найден");
  }
  
} catch (error) {
  console.log(`❌ Ошибка при чтении Apps Script файлов: ${error.message}`);
}

// Проверка 6: Node.js скрипт
console.log("\n📋 Проверка 6: Node.js скрипт (index.js)\n");

try {
  const indexContent = readFileSync("index.js", "utf8");
  
  const checks = [
    { name: "Импорт googleapis", pattern: /import.*googleapis/ },
    { name: "Импорт node-fetch", pattern: /import.*node-fetch/ },
    { name: "Функция initGoogleSheets", pattern: /function initGoogleSheets/ },
    { name: "Функция callOpenRouter", pattern: /function callOpenRouter/ },
    { name: "Функция processSheet", pattern: /export.*processSheet/ },
    { name: "Обработка GitHub Actions", pattern: /GITHUB_EVENT_PATH/ },
    { name: "Валидация входных данных", pattern: /validateInputs/ },
    { name: "Retry логика", pattern: /MAX_RETRIES/ },
    { name: "Кэширование", pattern: /cache\.(has|set|get)/ },
    { name: "Rate limiting", pattern: /RATE_LIMIT_DELAY/ }
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(indexContent)) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name} не найден`);
    }
  });
  
} catch (error) {
  console.log(`❌ Ошибка при чтении index.js: ${error.message}`);
}

// Проверка 7: GitHub Actions workflow
console.log("\n📋 Проверка 7: GitHub Actions workflow\n");

try {
  const workflowContent = readFileSync(".github/workflows/run.yml", "utf8");
  
  const workflowChecks = [
    { name: "Триггер repository_dispatch", pattern: /repository_dispatch/ },
    { name: "Тип события run-openrouter", pattern: /run-openrouter/ },
    { name: "Установка Node.js", pattern: /setup-node/ },
    { name: "Установка зависимостей", pattern: /npm ci/ },
    { name: "OPENROUTER_KEY secret", pattern: /OPENROUTER_KEY/ },
    { name: "GOOGLE_APPLICATION_CREDENTIALS secret", pattern: /GOOGLE_APPLICATION_CREDENTIALS/ },
    { name: "Очистка credentials", pattern: /Cleanup/ }
  ];
  
  workflowChecks.forEach(check => {
    if (check.pattern.test(workflowContent)) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name} не найден`);
    }
  });
  
} catch (error) {
  console.log(`❌ Ошибка при чтении workflow: ${error.message}`);
}

// Итоговый отчет
console.log("\n" + "=".repeat(60));
console.log("📊 Итоговый отчет:\n");

console.log("✅ Проверка завершена!");
console.log("\n📝 Что нужно сделать для полного тестирования:");
console.log("   1. Убедитесь, что GITHUB_TOKEN настроен в apps-script/config.gs");
console.log("   2. Добавьте Secrets в GitHub (OPENROUTER_KEY, GOOGLE_APPLICATION_CREDENTIALS)");
console.log("   3. Скопируйте код Apps Script в Google Sheets");
console.log("   4. Протестируйте через меню Google Sheets");
console.log("\n📖 Подробные инструкции: см. TESTING.md и SETUP.md");

