#!/usr/bin/env node

/**
 * Скрипт для проверки конфигурации и тестирования подключений
 * Использование: node check-config.js
 */

import { existsSync, readFileSync } from "fs";

console.log("🔍 Проверка конфигурации системы...\n");

let errors = [];
let warnings = [];

// Проверка переменных окружения
console.log("📋 Проверка переменных окружения:");

const requiredEnvVars = {
  OPENROUTER_KEY: "OpenRouter API ключ",
  GOOGLE_APPLICATION_CREDENTIALS: "Google Service Account credentials"
};

for (const [key, description] of Object.entries(requiredEnvVars)) {
  if (process.env[key]) {
    console.log(`  ✅ ${key} установлен`);
    
    // Специальная проверка для GOOGLE_APPLICATION_CREDENTIALS
    if (key === "GOOGLE_APPLICATION_CREDENTIALS") {
      try {
        let credentials;
        if (existsSync(process.env[key])) {
          credentials = JSON.parse(readFileSync(process.env[key], "utf8"));
        } else {
          credentials = JSON.parse(process.env[key]);
        }
        
        if (!credentials.client_email) {
          errors.push(`GOOGLE_APPLICATION_CREDENTIALS не содержит client_email`);
        } else {
          console.log(`     Email: ${credentials.client_email}`);
        }
        
        if (!credentials.private_key) {
          errors.push(`GOOGLE_APPLICATION_CREDENTIALS не содержит private_key`);
        }
      } catch (error) {
        errors.push(`GOOGLE_APPLICATION_CREDENTIALS невалидный JSON: ${error.message}`);
      }
    }
  } else {
    errors.push(`${key} не установлен (${description})`);
    console.log(`  ❌ ${key} не установлен`);
  }
}

// Проверка опциональных переменных
console.log("\n📋 Опциональные переменные:");
const optionalEnvVars = {
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
  BATCH_SIZE: process.env.BATCH_SIZE || "20"
};

for (const [key, value] of Object.entries(optionalEnvVars)) {
  console.log(`  ℹ️  ${key}: ${value}`);
}

// Проверка файлов проекта
console.log("\n📁 Проверка файлов проекта:");

const requiredFiles = [
  "index.js",
  "package.json",
  ".github/workflows/run.yml",
  "apps-script/main.gs",
  "apps-script/config.gs"
];

for (const file of requiredFiles) {
  if (existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    warnings.push(`Файл ${file} не найден`);
    console.log(`  ⚠️  ${file} не найден`);
  }
}

// Проверка package.json
console.log("\n📦 Проверка зависимостей:");
if (existsSync("package.json")) {
  try {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    console.log(`  ✅ package.json валиден`);
    
    if (pkg.dependencies) {
      console.log("  📚 Зависимости:");
      for (const [dep, version] of Object.entries(pkg.dependencies)) {
        console.log(`     - ${dep}: ${version}`);
      }
    }
    
    if (!existsSync("node_modules")) {
      warnings.push("node_modules не найдена. Запустите: npm install");
      console.log("  ⚠️  node_modules не найдена. Запустите: npm install");
    } else {
      console.log("  ✅ node_modules установлена");
    }
  } catch (error) {
    errors.push(`package.json невалиден: ${error.message}`);
  }
}

// Проверка Apps Script конфигурации
console.log("\n📝 Проверка Apps Script конфигурации:");
if (existsSync("apps-script/config.gs")) {
  const configContent = readFileSync("apps-script/config.gs", "utf8");
  
  if (configContent.includes("YOUR_USERNAME") || configContent.includes("YOUR_REPO")) {
    warnings.push("apps-script/config.gs содержит плейсхолдеры. Нужно настроить WEBHOOK_URL");
    console.log("  ⚠️  WEBHOOK_URL содержит плейсхолдеры (YOUR_USERNAME/YOUR_REPO)");
  } else {
    console.log("  ✅ WEBHOOK_URL настроен");
  }
  
  if (configContent.includes("ghp_YOUR_PERSONAL_ACCESS_TOKEN_HERE")) {
    warnings.push("apps-script/config.gs содержит плейсхолдер для GITHUB_TOKEN");
    console.log("  ⚠️  GITHUB_TOKEN не настроен");
  } else {
    console.log("  ✅ GITHUB_TOKEN настроен");
  }
}

// Итоговый отчет
console.log("\n" + "=".repeat(50));
console.log("📊 Итоговый отчет:\n");

if (errors.length === 0 && warnings.length === 0) {
  console.log("✅ Все проверки пройдены! Система готова к использованию.");
} else {
  if (errors.length > 0) {
    console.log(`❌ Найдено ошибок: ${errors.length}`);
    errors.forEach(err => console.log(`   - ${err}`));
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  Предупреждений: ${warnings.length}`);
    warnings.forEach(warn => console.log(`   - ${warn}`));
  }
  
  console.log("\n📖 Инструкции по настройке:");
  console.log("   1. Прочитайте SETUP.md для подробных инструкций");
  console.log("   2. Следуйте чеклисту в CHECKLIST.md");
  console.log("   3. Установите зависимости: npm install");
}

process.exit(errors.length > 0 ? 1 : 0);

