# Google Apps Script файлы

Эти файлы нужно скопировать в Google Apps Script редактор.

## Установка

1. Откройте ваш Google Sheet
2. Перейдите в **Extensions → Apps Script**
3. Удалите содержимое файла `Code.gs` (если есть)
4. Создайте два новых файла:
   - `main.gs` — скопируйте содержимое из `main.gs`
   - `config.gs` — скопируйте содержимое из `config.gs`
5. В файле `config.gs` укажите ваш `WEBHOOK_URL`
6. Сохраните проект (Ctrl+S или Cmd+S)
7. Обновите страницу Google Sheet — появится меню "LLM Tools"

## Настройка WEBHOOK_URL

Замените `YOUR_USERNAME` и `YOUR_REPO` на ваши значения:

```javascript
const WEBHOOK_URL = "https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/dispatches";
```

## Права доступа

При первом запуске Google запросит разрешения:
- Доступ к Google Sheets (чтение/запись)
- Доступ к внешним URL (для отправки webhook)

Разрешите эти доступы для корректной работы.

