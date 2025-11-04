# Инструкция по быстрому старту

## Шаг 1: Настройка Google Service Account

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте проект или выберите существующий
3. Включите **Google Sheets API**:
   - APIs & Services → Enable APIs and Services → поиск "Google Sheets API" → Enable
4. Создайте Service Account:
   - IAM & Admin → Service Accounts → Create Service Account
   - Название: `sheets-openrouter`
   - Создайте ключ: Keys → Add Key → Create new key → JSON
   - Скачайте JSON файл
5. Откройте Google Sheet и поделитесь им с email Service Account:
   - Кнопка "Поделиться" → вставьте email (например: `sheets-openrouter@project-id.iam.gserviceaccount.com`)
   - Дайте права "Редактор"

## Шаг 2: Создание GitHub Personal Access Token

1. Перейдите на https://github.com/settings/tokens
2. Generate new token → Generate new token (classic)
3. Название: `OpenRouter Sheets Integration`
4. Выберите права: `repo` (полный доступ к репозиториям)
5. Generate token → **скопируйте токен** (он показывается только один раз!)

## Шаг 3: Настройка Apps Script

1. Откройте ваш Google Sheet
2. Extensions → Apps Script
3. Удалите содержимое `Code.gs` (если есть)
4. Создайте файл `main.gs` и скопируйте содержимое из `apps-script/main.gs`
5. Создайте файл `config.gs` и заполните:
   ```javascript
   const WEBHOOK_URL = "https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/dispatches";
   const GITHUB_TOKEN = "ghp_your_token_here";
   ```
6. Сохраните проект (Ctrl+S)
7. Обновите страницу Google Sheet → появится меню "LLM Tools"

## Шаг 4: Настройка GitHub Secrets

1. В вашем репозитории: Settings → Secrets and variables → Actions → New repository secret

2. Добавьте `OPENROUTER_KEY`:
   - Name: `OPENROUTER_KEY`
   - Secret: ваш ключ с https://openrouter.ai/

3. Добавьте `GOOGLE_APPLICATION_CREDENTIALS`:
   - Name: `GOOGLE_APPLICATION_CREDENTIALS`
   - Secret: скопируйте **весь JSON** из файла Service Account (в одну строку)

## Шаг 5: Проверка работы

1. Откройте Google Sheet с данными (минимум 2 строки: заголовок + данные)
2. LLM Tools → Обработать новости
3. Введите промпт: "Translate this into English"
4. Нажмите OK
5. Через несколько минут проверьте GitHub Actions:
   - Actions → Process Google Sheet → последний запуск
6. Результаты должны появиться в новой колонке таблицы

## Устранение проблем

### Ошибка "401 Unauthorized" в GitHub Actions
- Проверьте, что `GITHUB_TOKEN` правильный в `config.gs`
- Убедитесь, что токен имеет права `repo`

### Ошибка "Permission denied" при чтении таблицы
- Убедитесь, что Service Account имеет доступ к таблице
- Проверьте, что email Service Account добавлен как редактор

### Ошибка "OPENROUTER_KEY is required"
- Проверьте, что секрет `OPENROUTER_KEY` добавлен в GitHub Secrets
- Убедитесь, что имя секрета точно `OPENROUTER_KEY` (регистр важен)

### Колонка не создается
- Проверьте логи Apps Script: View → Logs
- Убедитесь, что `WEBHOOK_URL` и `GITHUB_TOKEN` правильно настроены

