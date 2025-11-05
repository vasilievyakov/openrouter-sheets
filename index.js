import fetch from "node-fetch";
import { google } from "googleapis";
import { readFileSync, existsSync } from "fs";

// Accept both OPENROUTER_KEY and OPENROUTER_API_KEY; strip accidental surrounding quotes
const rawOpenRouterKey = process.env.OPENROUTER_KEY ?? process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_KEY = rawOpenRouterKey.trim().replace(/^['"]+|['"]+$/g, "");
const GOOGLE_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
// Google AI Studio (Gemini)
const rawGoogleApiKey = process.env.GOOGLE_AI_API_KEY ?? "";
const GOOGLE_AI_API_KEY = rawGoogleApiKey.trim().replace(/^['"]+|['"]+$/g, "");
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "20");
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // мс
const RATE_LIMIT_DELAY = 100; // задержка между батчами для Google Sheets API (100 req/sec)
// Ограничение частоты для LLM (во избежание 429 у Gemini free tier ~10 rpm)
const LLM_CONCURRENCY = parseInt(process.env.LLM_CONCURRENCY || "1");
const LLM_REQUEST_INTERVAL_MS = parseInt(process.env.LLM_REQUEST_INTERVAL_MS || "6500");

// Кэш для уже обработанных запросов (в памяти)
const cache = new Map();

/**
 * Инициализирует Google Sheets API клиент
 */
function initGoogleSheets() {
  if (!GOOGLE_CREDENTIALS) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS environment variable is required");
  }

  let credentials;

  // Проверяем, является ли значение путем к файлу
  if (existsSync(GOOGLE_CREDENTIALS)) {
    try {
      credentials = JSON.parse(readFileSync(GOOGLE_CREDENTIALS, "utf8"));
    } catch (error) {
      throw new Error(`Failed to read credentials file: ${error.message}`);
    }
  } else {
    // Иначе пытаемся парсить как JSON строку
    try {
      credentials = JSON.parse(GOOGLE_CREDENTIALS);
    } catch (error) {
      throw new Error(`Invalid GOOGLE_APPLICATION_CREDENTIALS JSON: ${error.message}`);
    }
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return google.sheets({ version: "v4", auth });
}

/**
 * Выполняет запрос к OpenRouter API с retry логикой
 */
async function callOpenRouter(text, prompt, retryCount = 0) {
  const cacheKey = `${prompt}:${text}`;
  
  // Проверяем кэш
  if (cache.has(cacheKey)) {
    console.log(`[CACHE] Использован кэш для: ${text.substring(0, 50)}...`);
    return cache.get(cacheKey);
  }

  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: "Ты анализируешь новости. Отвечай кратко и точно." },
      { role: "user", content: `${prompt}\n\n${text}` }
    ],
    temperature: 0.3
  };

  // Проверяем, что ключ установлен и не пустой
  if (!OPENROUTER_KEY || OPENROUTER_KEY.length === 0) {
    throw new Error("OPENROUTER_KEY не установлен или пустой");
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.HTTP_REFERER || "https://github.com/openrouter-sheets",
        "X-Title": "Google Sheets OpenRouter Integration"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorText = await res.text();
      
      // Для ошибки 401 выводим более подробную информацию
      if (res.status === 401) {
        const keyPreview = OPENROUTER_KEY 
          ? `${OPENROUTER_KEY.substring(0, 10)}...${OPENROUTER_KEY.substring(OPENROUTER_KEY.length - 4)}` 
          : 'N/A';
        console.error(`\n❌ ОШИБКА АВТОРИЗАЦИИ (401):`);
        console.error(`   Статус: ${res.status} ${res.statusText}`);
        console.error(`   Ответ: ${errorText}`);
        console.error(`   Ключ установлен: ${OPENROUTER_KEY ? 'ДА' : 'НЕТ'}`);
        console.error(`   Длина ключа: ${OPENROUTER_KEY ? OPENROUTER_KEY.length : 0}`);
        console.error(`   Ключ (превью): ${keyPreview}`);
        console.error(`   Заголовок Authorization: Bearer ${keyPreview}`);
        console.error(`\n   Проверьте:`);
        console.error(`   1. Секрет OPENROUTER_KEY установлен в GitHub Secrets`);
        console.error(`   2. Ключ действителен и не истёк (https://openrouter.ai/keys)`);
        console.error(`   3. Ключ не содержит лишних пробелов или символов`);
        console.error(`   4. На балансе OpenRouter есть средства`);
        console.error(`   5. Ключ имеет правильный формат (обычно начинается с sk-or-v1-)\n`);
        throw new Error(`OpenRouter auth error: ${errorText}`);
      }
      
      // Обработка rate limit (429)
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") || "60");
        if (retryCount < MAX_RETRIES) {
          console.log(`[RETRY] Rate limit, ожидание ${retryAfter} секунд...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return callOpenRouter(text, prompt, retryCount + 1);
        }
        throw new Error(`Rate limit exceeded after ${MAX_RETRIES} retries`);
      }

      // Обработка серверных ошибок (500, 502, 503)
      if (res.status >= 500 && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
        console.log(`[RETRY] Server error ${res.status}, повтор через ${delay}мс...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callOpenRouter(text, prompt, retryCount + 1);
      }

      throw new Error(`OpenRouter API error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    const result = data?.choices?.[0]?.message?.content || "";

    // Сохраняем в кэш
    cache.set(cacheKey, result);

    return result;
  } catch (error) {
    if (retryCount < MAX_RETRIES && !error.message.includes("Rate limit")) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`[RETRY] Ошибка сети, повтор через ${delay}мс: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callOpenRouter(text, prompt, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Выполняет запрос к Google AI Studio (Gemini) с retry логикой
 */
async function callGemini(text, prompt, retryCount = 0) {
  const cacheKey = `gemini:${prompt}:${text}`;

  if (cache.has(cacheKey)) {
    console.log(`[CACHE] Использован кэш (Gemini) для: ${text.substring(0, 50)}...`);
    return cache.get(cacheKey);
  }

  if (!GOOGLE_AI_API_KEY || GOOGLE_AI_API_KEY.length === 0) {
    throw new Error("GOOGLE_AI_API_KEY не установлен или пустой");
  }

  // Пробуем v1, при необходимости клиенский код может fallback на v1beta
  const baseUrlV1 = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  const baseUrlV1beta = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: `Ты анализируешь новости. Отвечай кратко и точно.\n\n${prompt}\n\n${text}` }
        ]
      }
    ]
  };

  try {
    let res = await fetch(baseUrlV1 + `?key=${GOOGLE_AI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      let errorText = await res.text();
      if ((res.status === 404 || res.status === 400)) {
        // Fallback на v1beta для несовместимых слугов
        res = await fetch(baseUrlV1beta + `?key=${GOOGLE_AI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      }
      if (res.status === 429 && retryCount < MAX_RETRIES) {
        // Пытаемся извлечь Retry-After/RetryInfo
        let delay = RETRY_DELAY * Math.pow(2, retryCount);
        try {
          const parsed = JSON.parse(errorText || '{}');
          const details = parsed?.error?.details || [];
          const retry = details.find(d => (d['@type'] || '').includes('google.rpc.RetryInfo'));
          if (retry?.retryDelay) {
            const m = /^(\d+)(?:\.(\d+))?s$/.exec(retry.retryDelay);
            if (m) {
              const secs = parseInt(m[1], 10);
              const frac = m[2] ? parseInt(m[2], 10) / Math.pow(10, m[2].length) : 0;
              delay = Math.max(delay, Math.ceil((secs + frac) * 1000));
            }
          }
        } catch (_) {}
        console.log(`[RETRY] Gemini 429, ожидание ${delay}мс...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callGemini(text, prompt, retryCount + 1);
      }
      if (!res.ok) {
        const txt2 = await res.text().catch(() => errorText);
        throw new Error(`Gemini API error: ${res.status} - ${txt2 || errorText}`);
      }
    }

    const data = await res.json();
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`[RETRY] Ошибка сети (Gemini), повтор через ${delay}мс: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGemini(text, prompt, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Маршрутизатор провайдера: если есть GOOGLE_AI_API_KEY, используем Gemini; иначе OpenRouter
 */
async function callLLM(text, prompt, retryCount = 0) {
  if (GOOGLE_AI_API_KEY) {
    return callGemini(text, prompt, retryCount);
  }
  return callOpenRouter(text, prompt, retryCount);
}

/**
 * Обрабатывает батч текстов через выбранный LLM
 */
async function processBatch(texts, prompt) {
  // Ограничиваем параллелизм и частоту запросов к LLM, чтобы избежать 429
  const results = new Array(texts.length);
  let index = 0;

  async function worker(workerId) {
    while (true) {
      const current = index++;
      if (current >= texts.length) break;
      const text = texts[current] || "";
      try {
        const r = await callLLM(text, prompt);
        results[current] = r;
      } catch (error) {
        console.error(`Ошибка обработки текста: ${error.message}`);
        results[current] = `[ОШИБКА: ${error.message}]`;
      }
      // Пауза между запросами (даже при параллелизме каждый worker будет ждать)
      if (current + 1 < texts.length) {
        await new Promise(resolve => setTimeout(resolve, LLM_REQUEST_INTERVAL_MS));
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, LLM_CONCURRENCY) }, (_, i) => worker(i));
  await Promise.all(workers);
  return results;
}

/**
 * Получает данные из Google Sheet
 */
async function getSheetData(sheets, spreadsheetId, sheetName) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:A`
    });

    const rows = response.data.values || [];
    return rows.map(row => row[0] || "").filter(text => text.trim() !== "");
  } catch (error) {
    throw new Error(`Ошибка чтения данных из таблицы: ${error.message}`);
  }
}

/**
 * Конвертирует номер колонки в букву (A, B, ..., Z, AA, AB, ...)
 */
function columnIndexToLetter(columnIndex) {
  let result = "";
  while (columnIndex > 0) {
    columnIndex--;
    result = String.fromCharCode(65 + (columnIndex % 26)) + result;
    columnIndex = Math.floor(columnIndex / 26);
  }
  return result;
}

/**
 * Записывает результаты в Google Sheet с учетом rate limiting
 */
async function writeResults(sheets, spreadsheetId, sheetName, results, startRow, columnIndex) {
  const values = results.map(r => [r || ""]);
  const columnLetter = columnIndexToLetter(columnIndex);
  const range = `${sheetName}!${columnLetter}${startRow + 2}:${columnLetter}${startRow + values.length + 1}`;

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values }
    });
  } catch (error) {
    throw new Error(`Ошибка записи в таблицу: ${error.message}`);
  }
}

/**
 * Валидация входных параметров
 */
function validateInputs(spreadsheetId, sheetName, prompt, columnIndex) {
  const errors = [];
  
  if (!spreadsheetId || typeof spreadsheetId !== "string" || spreadsheetId.trim() === "") {
    errors.push("spreadsheetId обязателен и должен быть непустой строкой");
  }
  
  if (!sheetName || typeof sheetName !== "string" || sheetName.trim() === "") {
    errors.push("sheetName обязателен и должен быть непустой строкой");
  }
  
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    errors.push("prompt обязателен и должен быть непустой строкой");
  }
  
  if (!Number.isInteger(columnIndex) || columnIndex < 1) {
    errors.push("columnIndex должен быть целым числом >= 1");
  }
  
  if (errors.length > 0) {
    throw new Error(`Ошибки валидации:\n${errors.map(e => `  - ${e}`).join("\n")}`);
  }
}

/**
 * Основная функция обработки таблицы
 */
export async function processSheet(spreadsheetId, sheetName, prompt, columnIndex) {
  // Требуем хотя бы один провайдер
  if (!GOOGLE_AI_API_KEY && (!OPENROUTER_KEY || OPENROUTER_KEY.trim().length === 0)) {
    throw new Error("Нужен хотя бы один ключ: GOOGLE_AI_API_KEY (Gemini) или OPENROUTER_KEY");
  }

  if (!GOOGLE_AI_API_KEY && OPENROUTER_KEY) {
    const trimmedKey = OPENROUTER_KEY.trim();
    if (!trimmedKey.startsWith('sk-or-v1-') && !trimmedKey.startsWith('sk-')) {
      console.warn(`⚠️  Внимание: Ключ не начинается с ожидаемого префикса (sk-or-v1- или sk-)`);
      console.warn(`   Префикс ключа: ${trimmedKey.substring(0, 10)}...`);
    }
  }

  // Валидация входных данных
  validateInputs(spreadsheetId, sheetName, prompt, columnIndex);

  console.log(`\n🚀 Начало обработки таблицы:`);
  console.log(`   Spreadsheet ID: ${spreadsheetId}`);
  console.log(`   Sheet: ${sheetName}`);
  console.log(`   Prompt: ${prompt}`);
  console.log(`   Column: ${columnIndex}`);
  if (GOOGLE_AI_API_KEY) {
    console.log(`   Provider: Google AI (Gemini)`);
    console.log(`   Model: ${GEMINI_MODEL}`);
  } else {
    console.log(`   Provider: OpenRouter`);
    console.log(`   Model: ${MODEL}`);
  }
  console.log(`   Batch size: ${BATCH_SIZE}\n`);

  const sheets = initGoogleSheets();
  
  // Получаем данные из таблицы
  console.log("📖 Чтение данных из таблицы...");
  const texts = await getSheetData(sheets, spreadsheetId, sheetName);
  console.log(`   Найдено ${texts.length} строк для обработки\n`);

  if (texts.length === 0) {
    console.log("⚠️  Нет данных для обработки");
    return;
  }

  let processed = 0;
  const total = texts.length;

  // Обрабатываем батчами
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(texts.length / BATCH_SIZE);

    console.log(`\n📦 Батч ${batchNumber}/${totalBatches} (строки ${i + 1}-${Math.min(i + BATCH_SIZE, total)})`);

    // Обрабатываем батч
    const results = await processBatch(batch, prompt);

    // Записываем результаты
    await writeResults(sheets, spreadsheetId, sheetName, results, i, columnIndex);

    processed += batch.length;
    const progress = ((processed / total) * 100).toFixed(1);
    console.log(`   ✅ Обработано: ${processed}/${total} (${progress}%)`);

    // Задержка для соблюдения rate limit Google Sheets API
    if (i + BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  console.log(`\n✨ Обработка завершена! Всего обработано: ${processed} строк`);
}

/**
 * Обработка webhook от GitHub Actions или прямого вызова
 */
async function main() {
  let payload = {};

  // Проверяем, запущено ли через GitHub Actions
  if (process.env.GITHUB_EVENT_PATH) {
    try {
      const fs = await import("fs");
      const eventData = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
      // repository_dispatch → client_payload; workflow_dispatch → inputs
      payload = eventData.client_payload || eventData.inputs || {};
      console.log("📥 Получены данные из GitHub Actions события");
    } catch (error) {
      console.error(`Ошибка чтения GitHub события: ${error.message}`);
    }
  }

  // Или из аргументов командной строки (для локального тестирования)
  const args = process.argv.slice(2);
  if (args.length >= 4) {
    const [a0, a1, a2, a3] = args;
    const allFilled = [a0, a1, a2, a3].every(v => typeof v === "string" && v.trim() !== "");
    if (allFilled) {
      payload.spreadsheetId = a0;
      payload.sheetName = a1;
      payload.prompt = a2;
      payload.columnIndex = parseInt(a3);
      console.log("📥 Получены данные из аргументов командной строки");
    }
  }

  // Валидация payload
  const missingFields = [];
  if (!payload.spreadsheetId) missingFields.push("spreadsheetId");
  if (!payload.sheetName) missingFields.push("sheetName");
  if (!payload.prompt) missingFields.push("prompt");
  if (!payload.columnIndex) missingFields.push("columnIndex");

  if (missingFields.length > 0) {
    console.error("\n❌ Недостаточно данных для обработки");
    console.error(`Отсутствуют поля: ${missingFields.join(", ")}`);
    console.error("\nИспользование:");
    console.error("  node index.js <spreadsheetId> <sheetName> <prompt> <columnIndex>");
    console.error("\nПример:");
    console.error('  node index.js "1abc123..." "Sheet1" "Определи бренд" 2');
    console.error("\nИли через GitHub Actions repository_dispatch");
    console.error("\n💡 Проверьте, что:");
    console.error("   - Все переменные окружения установлены");
    console.error("   - Payload содержит все необходимые поля");
    console.error("   - GitHub Actions правильно передает client_payload");
    // Если это ручной запуск без inputs, завершаем успешно (smoke/noop)
    if ((process.env.GITHUB_EVENT_NAME || "").trim() === "workflow_dispatch") {
      console.log("\nℹ️  Ручной запуск без входных параметров — пропускаем обработку (noop)\n");
      process.exit(0);
    }
    process.exit(1);
  }

  try {
    await processSheet(
      payload.spreadsheetId,
      payload.sheetName,
      payload.prompt,
      payload.columnIndex
    );
  } catch (error) {
    console.error(`\n❌ Критическая ошибка: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск main функции
main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

