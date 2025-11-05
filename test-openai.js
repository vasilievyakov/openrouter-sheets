#!/usr/bin/env node

import fetch from "node-fetch";

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY ?? "").trim().replace(/^["']+|["']+$/g, "");
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY не установлен");
  process.exit(1);
}

async function main() {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: "Тест OpenAI" },
          { role: "user", content: "Ответь одним словом: работает" }
        ],
        temperature: 0.3
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`❌ OpenAI API: ${res.status}`);
      console.error(txt);
      process.exit(1);
    }
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content || "";
    console.log("✅ Успех (OpenAI)");
    console.log("Модель:", OPENAI_MODEL);
    console.log("Ответ:", out);
  } catch (e) {
    console.error("❌ Ошибка запроса:", e.message);
    process.exit(1);
  }
}

main();


