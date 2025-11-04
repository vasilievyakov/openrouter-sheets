/**
 * Конфигурационный файл для Google Apps Script
 * Замените значения на ваши собственные
 */

// URL для GitHub Actions repository_dispatch
// Формат: https://api.github.com/repos/USERNAME/REPO_NAME/dispatches
const WEBHOOK_URL = "https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/dispatches";

// GitHub Personal Access Token (PAT) с правами repo
// Создайте токен здесь: https://github.com/settings/tokens
// Нужны права: repo (для repository_dispatch)
const GITHUB_TOKEN = "ghp_YOUR_PERSONAL_ACCESS_TOKEN_HERE";

// Альтернативный вариант: если используете собственный сервер
// const WEBHOOK_URL = "https://your-server.com/api/process-sheet";
// const GITHUB_TOKEN = ""; // не нужен для собственного сервера

