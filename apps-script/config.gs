/**
 * Конфигурационный файл для Google Apps Script
 * Замените значения на ваши собственные
 */

// URL для GitHub Actions repository_dispatch
// Формат: https://api.github.com/repos/USERNAME/REPO_NAME/dispatches
const WEBHOOK_URL = "https://api.github.com/repos/vasilievyakov/openrouter-sheets/dispatches";

// GitHub Personal Access Token (PAT) с правами repo
// Создайте токен здесь: https://github.com/settings/tokens
// Нужны права: repo (для repository_dispatch)
const GITHUB_TOKEN = "ghp_YOUR_PERSONAL_ACCESS_TOKEN_HERE";
/**
 * Возвращает GitHub Personal Access Token из Script Properties или из константы.
 */
function getGitHubToken() {
  var prop = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  var value = (prop && prop.trim() !== '') ? prop : GITHUB_TOKEN;
  // Удаляем случайные пробелы/кавычки вокруг токена
  return value ? value.trim().replace(/^["']+|["']+$/g, '') : value;
}

/**
 * Возвращает WEBHOOK_URL из Script Properties или из константы.
 */
function getWebhookUrl() {
  var prop = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');
  return (prop && prop.trim() !== '') ? prop : WEBHOOK_URL;
}


// Альтернативный вариант: если используете собственный сервер
// const WEBHOOK_URL = "https://your-server.com/api/process-sheet";
// const GITHUB_TOKEN = ""; // не нужен для собственного сервера

