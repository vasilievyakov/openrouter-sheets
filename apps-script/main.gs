/**
 * Главный файл Google Apps Script
 * Создает меню и обрабатывает пользовательский ввод
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("LLM Tools")
    .addItem("Обработать новости", "runPrompt")
    .addToUi();
}

/**
 * Запускает диалог для ввода промпта и отправляет запрос на обработку
 */
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
    ui.alert("В таблице нет данных для обработки (нужна минимум одна строка с данными)!");
    return;
  }

  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newColumnIndex = headerRow.length + 1;
  
  // Создаем заголовок новой колонки
  const timestamp = new Date().toLocaleString("ru-RU");
  sheet.getRange(1, newColumnIndex).setValue(`Prompt: ${prompt} (${timestamp})`);

  // Формируем payload для webhook
  const payload = {
    spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
    sheetName: sheet.getName(),
    prompt: prompt,
    columnIndex: newColumnIndex,
    totalRows: lastRow - 1 // Минус заголовок
  };

  try {
    // Отправляем запрос на GitHub Actions repository_dispatch
    // Формат: https://api.github.com/repos/OWNER/REPO/dispatches
    const response = UrlFetchApp.fetch(getWebhookUrl(), {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": `token ${getGitHubToken()}`,
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
        `Статус: ${statusCode}\nПроверьте логи или настройки webhook.\n\nУбедитесь, что:\n1. WEBHOOK_URL настроен правильно\n2. GITHUB_TOKEN установлен в config.gs`,
        ui.ButtonSet.OK
      );
    }
  } catch (error) {
    Logger.log(`Исключение при отправке: ${error.toString()}`);
    ui.alert(
      "Ошибка",
      `Не удалось отправить запрос: ${error.toString()}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Быстрая проверка авторизации к GitHub из Apps Script.
 * Вызывает /user с вашим GITHUB_TOKEN и выводит статус.
 */
function testGithubAuth() {
  try {
    var token = getGitHubToken();
    if (!token || token.length < 10) {
      SpreadsheetApp.getUi().alert("GITHUB_TOKEN отсутствует или слишком короткий");
      return;
    }
    var res = UrlFetchApp.fetch("https://api.github.com/user", {
      method: "get",
      headers: {
        Authorization: "token " + token,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Google-Apps-Script"
      },
      muteHttpExceptions: true
    });
    var msg = "Status: " + res.getResponseCode() + "\n" + res.getContentText();
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    SpreadsheetApp.getUi().alert("Ошибка теста: " + e);
  }
}

