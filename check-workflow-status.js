#!/usr/bin/env node

/**
 * Скрипт для проверки последнего запуска GitHub Actions
 */

import fetch from "node-fetch";

const REPO = "vasilievyakov/openrouter-sheets";
const API_URL = `https://api.github.com/repos/${REPO}`;

console.log("🔍 Проверка последнего запуска GitHub Actions\n");
console.log("=".repeat(60));

try {
  // Получаем последний запуск workflow
  console.log("📡 Запрос последних запусков...");
  const runsResponse = await fetch(`${API_URL}/actions/runs?per_page=1`);
  
  if (!runsResponse.ok) {
    throw new Error(`GitHub API error: ${runsResponse.status}`);
  }
  
  const runsData = await runsResponse.json();
  const latestRun = runsData.workflow_runs?.[0];
  
  if (!latestRun) {
    console.log("⚠️  Запусков не найдено");
    process.exit(0);
  }
  
  console.log("\n📊 Информация о последнем запуске:");
  console.log(`   Workflow: ${latestRun.name}`);
  console.log(`   Статус: ${latestRun.status}`);
  console.log(`   Заключение: ${latestRun.conclusion || 'не завершен'}`);
  console.log(`   Время: ${new Date(latestRun.created_at).toLocaleString('ru-RU')}`);
  console.log(`   Длительность: ${latestRun.run_duration_ms ? Math.round(latestRun.run_duration_ms / 1000) : 'N/A'} секунд`);
  
  // Определяем статус
  const statusEmoji = latestRun.conclusion === 'success' ? '✅' : 
                       latestRun.conclusion === 'failure' ? '❌' : 
                       latestRun.conclusion === 'cancelled' ? '⚠️' : '🟡';
  
  console.log(`\n${statusEmoji} Статус: ${latestRun.conclusion || latestRun.status}`);
  
  // Если есть ошибка, получаем детали
  if (latestRun.conclusion === 'failure') {
    console.log("\n❌ Workflow завершился с ошибкой!");
    console.log("\n📋 Получение деталей ошибки...");
    
    // Получаем детали запуска
    const runDetailsResponse = await fetch(`${API_URL}/actions/runs/${latestRun.id}`);
    const runDetails = await runDetailsResponse.json();
    
    console.log(`\n🔗 URL для просмотра логов:`);
    console.log(`   ${latestRun.html_url}`);
    
    // Получаем список jobs
    const jobsResponse = await fetch(`${API_URL}/actions/runs/${latestRun.id}/jobs`);
    const jobsData = await jobsResponse.json();
    
    if (jobsData.jobs && jobsData.jobs.length > 0) {
      console.log(`\n📦 Jobs в workflow:`);
      jobsData.jobs.forEach((job, index) => {
        console.log(`\n   ${index + 1}. ${job.name}`);
        console.log(`      Статус: ${job.conclusion || job.status}`);
        
        if (job.conclusion === 'failure') {
          console.log(`      ❌ Ошибка в job: ${job.name}`);
          
          // Получаем логи steps
          if (job.steps && job.steps.length > 0) {
            console.log(`\n      📝 Steps:`);
            job.steps.forEach((step, stepIndex) => {
              const stepStatus = step.conclusion === 'failure' ? '❌' : 
                                step.conclusion === 'success' ? '✅' : '🟡';
              console.log(`         ${stepStatus} ${step.name}`);
              if (step.conclusion === 'failure') {
                console.log(`            ⚠️  Этот step завершился с ошибкой`);
              }
            });
          }
        }
      });
    }
    
    console.log(`\n💡 Рекомендации:`);
    console.log(`   1. Откройте ${latestRun.html_url}`);
    console.log(`   2. Найдите job с ошибкой (обычно красным цветом)`);
    console.log(`   3. Откройте его и посмотрите логи`);
    console.log(`   4. Найдите строку с ошибкой (обычно в конце логов)`);
    
    console.log(`\n🔍 Частые причины ошибок:`);
    console.log(`   - OPENROUTER_KEY не установлен в Secrets`);
    console.log(`   - GOOGLE_APPLICATION_CREDENTIALS не установлен или невалидный`);
    console.log(`   - Service Account не имеет доступа к таблице`);
    console.log(`   - Неправильный SPREADSHEET_ID или название листа`);
    console.log(`   - Ошибки в коде Node.js скрипта`);
    
  } else if (latestRun.conclusion === 'success') {
    console.log("\n✅ Workflow выполнен успешно!");
    console.log("\n📋 Проверьте Google Sheet:");
    console.log("   - Должна появиться новая колонка с результатами");
    console.log("   - Колонка должна быть справа от 'Prompt'");
    
  } else {
    console.log(`\n🟡 Workflow еще выполняется или был отменен`);
  }
  
} catch (error) {
  console.error(`\n❌ Ошибка при проверке: ${error.message}`);
  console.error(`\n💡 Убедитесь, что:`);
  console.error(`   - Репозиторий существует`);
  console.error(`   - Вы имеете доступ к репозиторию`);
  console.error(`   - GitHub API доступен`);
}

console.log("\n" + "=".repeat(60));

