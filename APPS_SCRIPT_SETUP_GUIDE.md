# Настройка Apps Script - Пошаговая инструкция

## Что нужно сделать

У вас уже есть GitHub Actions workflow, теперь нужно связать Google Sheets с GitHub через Apps Script.

---

## Шаг 1: Получите GitHub Personal Access Token

1. Перейдите: https://github.com/settings/tokens/new
2. Заполните форму:
   - **Note:** `OpenRouter Sheets Integration`
   - **Expiration:** выберите срок (рекомендуется 90 days)
   - **Select scopes:** отметьте **только** `repo` ✅
3. Нажмите **"Generate token"**
4. **СКОПИРУЙТЕ ТОКЕН!** Он начинается с `ghp_...` и показывается только один раз

---

## Шаг 2: Откройте Google Sheet

1. Откройте вашу Google Таблицу (где будут обрабатываться данные)
2. Убедитесь, что:
   - В столбце **A** есть данные (текст новостей)
   - Есть строка заголовков (строка 1)
   - Минимум одна строка с данными

**Пример таблицы:**
```
A1: Новость
A2: Apple выпустила новый iPhone 15
A3: Google анонсировал обновление Android
A4: Microsoft представил новую версию Windows
```

---

## Шаг 3: Откройте Apps Script

1. В Google Sheet: **Extensions** → **Apps Script**
2. Откроется редактор кода

---

## Шаг 4: Создайте файлы

### Файл 1: `config.gs`

1. Если есть файл `Code.gs`, удалите его содержимое
2. Создайте новый файл: **File** → **New** → **Script file**
3. Название: `config`
4. Вставьте код:

```javascript
/**
 * Конфигурационный файл для Google Apps Script
 */

// URL для GitHub Actions repository_dispatch
const WEBHOOK_URL = "https://api.github.com/repos/vasilievyakov/openrouter-sheets/dispatches";

// Ваш GitHub Personal Access Token
// ⚠️ ЗАМЕНИТЕ на реальный токен, который вы получили!
const GITHUB_TOKEN = "ghp_ВАШ_ТОКЕН_ЗДЕСЬ";
```

**⚠️ ВАЖНО:** Замените `"ghp_ВАШ_ТОКЕН_ЗДЕСЬ"` на реальный токен!

### Файл 2: `main.gs`

1. Создайте новый файл: **File** → **New** → **Script file**
2. Название: `main`
3. Скопируйте содержимое из `apps-script/main.gs` (в вашем локальном репозитории)

Или используйте этот код:

```javascript
/**
 * Главный файл Google Apps Script
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("LLM Tools")
    .addItem("Обработать новости", "runPrompt")
    .addToUi();
}

function runPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Введите ваш промпт для каждой новости:",
    "Например: Определи бренд, упомянутый в новости",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const prompt = response.getResponseText();
  if (!prompt || prompt.trim() === "") {
    ui.alert("Промпт не может быть пустым!");
    return;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    ui.alert("В таблице нет данных для обработки!");
    return;
  }

  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newColumnIndex = headerRow.length + 1;
  
  // Создаем заголовок новой колонки
  const timestamp = new Date().toLocaleString("ru-RU");
  sheet.getRange(1, newColumnIndex).setValue(`Prompt: ${prompt} (${timestamp})`);

  // Формируем payload
  const payload = {
    spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
    sheetName: sheet.getName(),
    prompt: prompt,
    columnIndex: newColumnIndex,
    totalRows: lastRow - 1
  };

  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Google-Apps-Script"
      },
      payload: JSON.stringify({
        event_type: "run-openrouter",
        client_payload: payload
      }),
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    
    if (statusCode >= 200 && statusCode < 300) {
      ui.alert(
        "Запрос отправлен в OpenRouter",
        `Обработка начата для ${payload.totalRows} строк.\nРезультаты появятся в новой колонке через несколько минут.`,
        ui.ButtonSet.OK
      );
    } else {
      const errorText = response.getContentText();
      Logger.log(`Ошибка webhook: ${statusCode} - ${errorText}`);
      ui.alert(
        "Ошибка при отправке запроса",
        `Статус: ${statusCode}\nПроверьте настройки WEBHOOK_URL и GITHUB_TOKEN`,
        ui.ButtonSet.OK
      );
    }
  } catch (error) {
    Logger.log(`Исключение: ${error.toString()}`);
    ui.alert(
      "Ошибка",
      `Не удалось отправить запрос: ${error.toString()}`,
      ui.ButtonSet.OK
    );
  }
}
```

---

## Шаг 5: Сохраните и обновите

1. Нажмите **Ctrl+S** (или **File** → **Save**)
2. Дайте проекту название: `OpenRouter Integration`
3. **Закройте и снова откройте** Google Sheet
4. После перезагрузки появится новое меню: **LLM Tools**

---

## Шаг 6: Дайте разрешения Google Service Account

Чтобы GitHub Actions мог записывать результаты обратно в таблицу:

1. В Google Sheet нажмите **Share** (Поделиться)
2. Найдите email вашего Service Account:
   - Он выглядит как: `sheets-openrouter@project-id.iam.gserviceaccount.com`
   - Его можно найти в JSON файле Google Credentials (поле `client_email`)
3. Вставьте этот email в поле "Add people"
4. Дайте права: **Editor** (Редактор)
5. Нажмите **Send**

---

## Шаг 7: Проверьте работу!

1. Убедитесь, что в таблице есть данные в столбце A
2. Откройте меню **LLM Tools** → **Обработать новости**
3. Введите тестовый промпт: `Переведи на английский`
4. Нажмите **OK**
5. Через несколько секунд появится уведомление о начале обработки
6. Проверьте GitHub Actions:
   - https://github.com/vasilievyakov/openrouter-sheets/actions
   - Должен появиться новый запуск "Process Google Sheet"
7. Через 1-2 минуты результаты появятся в новой колонке таблицы!

---

## ❗ Частые ошибки

### Меню "LLM Tools" не появляется
- Закройте и снова откройте Google Sheet
- Проверьте, что файл `main.gs` содержит функцию `onOpen()`

### Ошибка "401 Unauthorized" в Apps Script
- Проверьте, что `GITHUB_TOKEN` правильный
- Токен должен иметь права `repo`
- Токен не должен истечь

### GitHub Actions не запускается
- Проверьте `WEBHOOK_URL` (должен содержать ваш username и repo name)
- Проверьте, что токен имеет права `repo`

### Результаты не появляются в таблице
- Проверьте, что Service Account имеет права Editor
- Проверьте логи GitHub Actions на наличие ошибок

---

## 🎉 Готово!

Теперь вы можете обрабатывать любой текст в Google Sheets через LLM модели!

**Полезные ссылки:**
- Ключи OpenRouter: https://openrouter.ai/keys
- Баланс OpenRouter: https://openrouter.ai/credits
- GitHub Actions: https://github.com/vasilievyakov/openrouter-sheets/actions
- GitHub Tokens: https://github.com/settings/tokens

