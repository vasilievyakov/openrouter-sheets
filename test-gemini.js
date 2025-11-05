#!/usr/bin/env node

import fetch from "node-fetch";

const API_KEY = (process.env.GOOGLE_AI_API_KEY ?? "").trim().replace(/^["']+|["']+$/g, "");
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";

if (!API_KEY) {
  console.error("❌ GOOGLE_AI_API_KEY не установлен");
  process.exit(1);
}

async function main() {
  // Пробуем v1, при ошибке fallback на v1beta
  const urlV1 = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(MODEL)}:generateContent?key=${API_KEY}`;
  const urlV1beta = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${API_KEY}`;
  try {
    let res = await fetch(urlV1, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [ { role: "user", parts: [ { text: "Ответь одним словом: работает" } ] } ]
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      // fallback на v1beta, если 404/400 на v1
      if (res.status === 404 || res.status === 400) {
        res = await fetch(urlV1beta, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [ { role: "user", parts: [ { text: "Ответь одним словом: работает" } ] } ]
          })
        });
      } else {
        console.error(`❌ Gemini API: ${res.status}`);
        console.error(txt);
        process.exit(1);
      }
    }
    if (!res.ok) {
      const txt = await res.text();
      console.error(`❌ Gemini API: ${res.status}`);
      console.error(txt);
      process.exit(1);
    }
    const data = await res.json();
    const out = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("✅ Успех (Gemini)");
    console.log("Модель:", MODEL);
    console.log("Ответ:", out);
  } catch (e) {
    console.error("❌ Ошибка запроса:", e.message);
    process.exit(1);
  }
}

main();


