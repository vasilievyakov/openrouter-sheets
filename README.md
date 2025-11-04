# Google Sheets + OpenRouter Integration

Система для автоматической обработки новостей в Google Sheets через OpenRouter API.

## Описание

Позволяет пользователю:
1. Работать с Google Sheets таблицей (например, 4000 новостных строк)
2. Нажать кнопку "Run prompt"
3. Ввести текст промпта (например: "Определи бренд")
4. Получить новую колонку с результатами обработки через OpenRouter API

## Доступные команды

```bash
npm run check           # Проверка конфигурации системы
npm run test:openrouter # Тест подключения к OpenRouter API
npm run test:sheets     # Тест подключения к Google Sheets API
npm start               # Запуск основного скрипта
```

## Установка и настройка

1. Создайте Google Sheet с названием "News Analyzer"
2. В столбце A разместите список новостей (пример: 4000 строк)
3. Откройте **Extensions → Apps Script**
4. Скопируйте содержимое файлов `apps-script/main.gs` и `apps-script/config.gs` в соответствующие файлы в Apps Script

### 2. Настройка конфигурации

#### В Apps Script (`apps-script/config.gs`):
1. Укажите `WEBHOOK_URL` — URL вашего GitHub Actions webhook:
   ```
   const WEBHOOK_URL = "https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/dispatches";
   ```
   Замените `YOUR_USERNAME` и `YOUR_REPO` на ваши значения.

2. Укажите `GITHUB_TOKEN` — GitHub Personal Access Token:
   - Перейдите на https://github.com/settings/tokens
   - Создайте новый токен (Generate new token → Generate new token (classic))
   - Выберите права: `repo` (для repository_dispatch)
   - Скопируйте токен и вставьте в `config.gs`:
   ```
   const GITHUB_TOKEN = "ghp_your_token_here";
   ```

#### В GitHub Secrets (Settings → Secrets and variables → Actions):
- `OPENROUTER_KEY` — ваш API ключ OpenRouter (получить на https://openrouter.ai/)
- `GOOGLE_APPLICATION_CREDENTIALS` — JSON с учетными данными Google Service Account (см. шаг 3)

### 3. Создание Google Service Account

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google Sheets API
4. Создайте Service Account:
   - IAM & Admin → Service Accounts → Create Service Account
   - Скачайте JSON ключ
5. Поделитесь Google Sheet с email Service Account (например: `your-service-account@project-id.iam.gserviceaccount.com`)
6. Скопируйте содержимое JSON файла в GitHub Secret `GOOGLE_APPLICATION_CREDENTIALS`

### 4. Настройка GitHub Actions

1. Создайте репозиторий на GitHub и загрузите код:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. Добавьте Secrets в Settings → Secrets and variables → Actions:
   - `OPENROUTER_KEY` — ваш API ключ OpenRouter
   - `GOOGLE_APPLICATION_CREDENTIALS` — JSON содержимое файла с учетными данными Service Account

3. Убедитесь, что в `apps-script/config.gs` указаны правильные значения:
   - `WEBHOOK_URL` — должен соответствовать вашему репозиторию
   - `GITHUB_TOKEN` — ваш Personal Access Token

### 5. Установка зависимостей

```bash
npm install
```

## Использование

1. Откройте Google Sheet "News Analyzer"
2. В меню выберите **LLM Tools → Обработать новости**
3. Введите промпт (например: "Определи бренд, упомянутый в новости")
4. Нажмите OK
5. Результаты появятся в новой колонке через несколько минут

## Архитектура

- **Apps Script** (`apps-script/`) — интерфейс в Google Sheets, отправляет webhook
- **Node.js скрипт** (`index.js`) — обрабатывает данные через OpenRouter API
- **GitHub Actions** (`.github/workflows/run.yml`) — автоматизирует выполнение

## Особенности

- ✅ Rate limiting для Google Sheets API (100 запросов/сек)
- ✅ Ограничение параллельности OpenRouter до 20 запросов
- ✅ Retry логика для ошибок 429/500
- ✅ Логирование прогресса
- ✅ Кэширование ответов (в будущем)

## Тестирование

### Локальное тестирование

Вы можете протестировать скрипт локально перед настройкой GitHub Actions:

```bash
# Установите переменные окружения
export OPENROUTER_KEY="your-openrouter-key"
export GOOGLE_APPLICATION_CREDENTIALS='{"type":"service_account",...}'

# Запустите скрипт
node index.js "SPREADSHEET_ID" "Sheet1" "Translate this into English" 2
```

Где:
- `SPREADSHEET_ID` — ID вашей таблицы (из URL)
- `Sheet1` — название листа
- `"Translate this into English"` — промпт
- `2` — номер колонки для записи результатов

### Тестирование через Google Sheets

1. Создайте тестовую таблицу на 10 строк
2. Запустите обработку через меню **LLM Tools → Обработать новости**
3. Введите простой промпт: "Translate this into English"
4. Проверьте:
   - Создалась новая колонка
   - Все ячейки заполнены ответами
   - Нет ошибок в логах GitHub Actions (Actions → ваш workflow → последний запуск)

## Лимиты

- Google Sheets API: 100 запросов/сек
- OpenRouter: рекомендуется не более 20 параллельных запросов
- Batch обработка: 20 строк за раз

