#!/usr/bin/env node

/**
 * Скрипт для проверки логов последнего запуска workflow
 */

import fetch from "node-fetch";

const REPO = "vasilievyakov/openrouter-sheets";
const API_URL = `https://api.github.com/repos/${REPO}`;

console.log("🔍 Проверка последнего запуска workflow\n");
console.log("=".repeat(60));

try {
  // Получаем последний запуск
  const runsResponse = await fetch(`${API_URL}/actions/runs?per_page=1`);
  const runsData = await runsResponse.json();
  const latestRun = runsData.workflow_runs?.[0];
  
  if (!latestRun) {
    console.log("⚠️  Запусков не найдено");
    process.exit(0);
  }
  
  console.log(`\n📊 Последний запуск:`);
  console.log(`   ID: ${latestRun.id}`);
  console.log(`   Время: ${new Date(latestRun.created_at).toLocaleString('ru-RU')}`);
  console.log(`   Статус: ${latestRun.status}`);
  console.log(`   Заключение: ${latestRun.conclusion || 'не завершен'}`);
  console.log(`   URL: ${latestRun.html_url}`);
  
  // Получаем jobs
  const jobsResponse = await fetch(`${API_URL}/actions/runs/${latestRun.id}/jobs`);
  const jobsData = await jobsResponse.json();
  
  if (jobsData.jobs && jobsData.jobs.length > 0) {
    const job = jobsData.jobs[0];
    
    console.log(`\n📦 Job: ${job.name}`);
    console.log(`   Статус: ${job.status}`);
    console.log(`   Заключение: ${job.conclusion || 'не завершен'}`);
    
    // Находим шаг Setup Node.js
    const setupStep = job.steps?.find(s => s.name === "Setup Node.js");
    
    if (setupStep) {
      console.log(`\n🔍 Шаг "Setup Node.js":`);
      console.log(`   Статус: ${setupStep.status}`);
      console.log(`   Заключение: ${setupStep.conclusion || 'не завершен'}`);
      
      if (setupStep.conclusion === 'failure') {
        console.log(`\n❌ Ошибка в шаге Setup Node.js`);
        console.log(`\n💡 Откройте логи для просмотра деталей:`);
        console.log(`   ${latestRun.html_url}`);
        console.log(`\n📝 В логах должно быть:`);
        console.log(`   - Если используется setup-node@v4 → старая версия workflow`);
        console.log(`   - Если есть "Checking Node.js..." → новая версия workflow`);
      }
    }
  }
  
  // Проверяем, какой workflow файл используется
  console.log(`\n📄 Workflow файл:`);
  console.log(`   Путь: ${latestRun.path}`);
  console.log(`   Head SHA: ${latestRun.head_sha}`);
  
  console.log(`\n🔗 Проверьте напрямую:`);
  console.log(`   ${latestRun.html_url}`);
  
} catch (error) {
  console.error(`\n❌ Ошибка: ${error.message}`);
}

console.log("\n" + "=".repeat(60));

