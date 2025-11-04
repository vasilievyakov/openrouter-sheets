#!/usr/bin/env node

/**
 * Скрипт для быстрого тестирования подключения к OpenRouter API
 * Использование: node test-openrouter.js
 */

import fetch from "node-fetch";

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

if (!OPENROUTER_KEY) {
  console.error("❌ OPENROUTER_KEY не установлен");
  console.error("   Установите: export OPENROUTER_KEY='your-key'");
  process.exit(1);
}

console.log("🧪 Тестирование подключения к OpenRouter API...\n");
console.log(`📝 Модель: ${MODEL}`);
console.log(`🔑 Ключ: ${OPENROUTER_KEY.substring(0, 10)}...\n`);

async function testOpenRouter() {
  try {
    console.log("📡 Отправка тестового запроса...");
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/openrouter-sheets",
        "X-Title": "Google Sheets OpenRouter Integration"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "Ты помощник для тестирования." },
          { role: "user", content: "Ответь одним словом: работает" }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Ошибка API: ${response.status}`);
      console.error(`   Ответ: ${errorText}`);
      
      if (response.status === 401) {
        console.error("\n💡 Возможные причины:");
        console.error("   - Неверный API ключ");
        console.error("   - Ключ истек или отозван");
      } else if (response.status === 429) {
        console.error("\n💡 Превышен лимит запросов. Попробуйте позже.");
      }
      
      process.exit(1);
    }

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content || "";
    
    console.log("✅ Подключение успешно!");
    console.log(`\n📥 Ответ от модели: "${result}"`);
    console.log(`\n📊 Детали запроса:`);
    console.log(`   - Токенов использовано: ${data.usage?.total_tokens || 'неизвестно'}`);
    console.log(`   - Модель: ${data.model || MODEL}`);
    
    console.log("\n✨ OpenRouter API работает корректно!");
    
  } catch (error) {
    console.error(`❌ Ошибка подключения: ${error.message}`);
    console.error("\n💡 Проверьте:");
    console.error("   - Интернет соединение");
    console.error("   - Правильность API ключа");
    console.error("   - Доступность openrouter.ai");
    process.exit(1);
  }
}

testOpenRouter();

