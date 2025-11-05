#!/usr/bin/env node

import fetch from "node-fetch";

const OPENROUTER_KEY = (process.env.OPENROUTER_KEY ?? process.env.OPENROUTER_API_KEY ?? "")
  .trim()
  .replace(/^["']+|["']+$/g, "");

const filter = process.argv[2] || "deepseek|chimera|r1"; // regex OR
const current = process.env.OPENROUTER_MODEL || "(not set)";

if (!OPENROUTER_KEY) {
  console.error("❌ OPENROUTER_KEY/OPENROUTER_API_KEY is not set");
  process.exit(1);
}

async function main() {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": process.env.HTTP_REFERER || "https://github.com/openrouter-sheets",
        "X-Title": "List Models Script"
      }
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ Failed to fetch models: ${res.status} ${res.statusText}`);
      console.error(text);
      process.exit(1);
    }

    const data = await res.json();
    const regex = new RegExp(filter, "i");
    const models = (data?.data || []).filter(m => regex.test(m.id));

    console.log("\n🧠 Current OPENROUTER_MODEL:", current);
    console.log("\n📋 Matching models (id):\n");
    models.forEach(m => console.log(" -", m.id));

    if (models.length === 0) {
      console.log("\n⚠️  No models matched filter:", filter);
    }

    // Suggest a default DeepSeek R1 free slug if found
    const r1Free = models.find(m => /deepseek\/(deepseek-)?r1:free/i.test(m.id));
    if (r1Free) {
      console.log("\n✅ Suggested slug:", r1Free.id);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main();


