/**
 * Скрипт для проверки валидности ключа OpenRouter
 * 
 * Использование:
 *   node test-openrouter-key.js <ваш-ключ-openrouter>
 * 
 * Или через переменную окружения:
 *   OPENROUTER_KEY=sk-... node test-openrouter-key.js
 */

import fetch from "node-fetch";

const OPENROUTER_KEY = process.argv[2] || process.env.OPENROUTER_KEY;

if (!OPENROUTER_KEY) {
  console.error("❌ Ошибка: ключ OpenRouter не предоставлен");
  console.error("\nИспользование:");
  console.error("  node test-openrouter-key.js <ваш-ключ>");
  console.error("  или");
  console.error("  OPENROUTER_KEY=sk-... node test-openrouter-key.js");
  process.exit(1);
}

console.log("\n🔍 Проверка ключа OpenRouter...\n");
console.log(`   Длина ключа: ${OPENROUTER_KEY.length} символов`);
console.log(`   Префикс: ${OPENROUTER_KEY.substring(0, 6)}...`);
console.log(`   Суффикс: ...${OPENROUTER_KEY.substring(OPENROUTER_KEY.length - 4)}`);

async function testKey() {
  try {
    console.log("\n📡 Отправка тестового запроса к OpenRouter API...");
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/openrouter-sheets",
        "X-Title": "OpenRouter Key Test"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "user", content: "Say 'OK' if you can read this." }
        ],
        max_tokens: 10
      })
    });

    console.log(`   Статус: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("\n❌ ОШИБКА:");
      console.error(`   Код: ${response.status}`);
      console.error(`   Ответ: ${errorText}`);
      
      if (response.status === 401) {
        console.error("\n💡 Возможные причины:");
        console.error("   1. Ключ неправильный или истёк");
        console.error("   2. Ключ не активирован");
        console.error("   3. Ключ не имеет необходимых прав");
        console.error("\n   Проверьте ключ на: https://openrouter.ai/keys");
      } else if (response.status === 402) {
        console.error("\n💡 Недостаточно средств на балансе OpenRouter");
        console.error("   Пополните баланс: https://openrouter.ai/credits");
      }
      
      process.exit(1);
    }

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content || "(пустой ответ)";

    console.log("\n✅ УСПЕХ! Ключ работает!");
    console.log(`   Ответ модели: "${result}"`);
    console.log(`   Модель: ${data?.model || "unknown"}`);
    
    if (data?.usage) {
      console.log(`   Токены: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
    }

    console.log("\n✨ Ключ настроен правильно и готов к использованию!\n");

  } catch (error) {
    console.error("\n❌ Ошибка при тестировании:");
    console.error(`   ${error.message}`);
    
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      console.error("\n💡 Проблема с сетевым подключением к OpenRouter API");
    }
    
    process.exit(1);
  }
}

testKey();

