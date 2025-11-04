# Структура проекта

```
openrouter-sheets/
├── .github/
│   └── workflows/
│       └── run.yml              # GitHub Actions workflow для автоматизации
├── apps-script/
│   ├── main.gs                  # Главный файл Google Apps Script
│   ├── config.gs                # Конфигурация (WEBHOOK_URL, GITHUB_TOKEN)
│   └── README.md                # Инструкции по установке Apps Script
├── index.js                     # Node.js скрипт для обработки данных
├── package.json                 # Зависимости проекта
├── .gitignore                   # Игнорируемые файлы
├── README.md                    # Основная документация
├── SETUP.md                     # Подробная инструкция по настройке
└── EXAMPLES.md                  # Примеры использования промптов
```

## Компоненты системы

### 1. Google Apps Script (`apps-script/`)
- **main.gs** — создает меню в Google Sheets, обрабатывает пользовательский ввод
- **config.gs** — хранит конфигурацию (URL webhook, GitHub token)

### 2. Node.js скрипт (`index.js`)
- Читает данные из Google Sheets
- Отправляет запросы к OpenRouter API
- Записывает результаты обратно в таблицу
- Обрабатывает ошибки и retry логику
- Поддерживает rate limiting

### 3. GitHub Actions (`.github/workflows/run.yml`)
- Автоматически запускается при получении webhook
- Устанавливает зависимости
- Выполняет скрипт обработки

### 4. Документация
- **README.md** — обзор проекта и базовые инструкции
- **SETUP.md** — пошаговая настройка с примерами
- **EXAMPLES.md** — примеры промптов и использования

## Поток данных

```
Google Sheets (Apps Script)
    ↓
GitHub Actions (repository_dispatch)
    ↓
Node.js скрипт (index.js)
    ↓
OpenRouter API
    ↓
Результаты обратно в Google Sheets
```

## Ключевые особенности

- ✅ Rate limiting (100 запросов/сек для Google Sheets API)
- ✅ Batch обработка (20 запросов параллельно к OpenRouter)
- ✅ Retry логика для ошибок 429/500
- ✅ Кэширование одинаковых запросов
- ✅ Логирование прогресса
- ✅ Поддержка колонок после Z (AA, AB, ...)
- ✅ Обработка ошибок с понятными сообщениями

## Требования

- Node.js 20+
- Google Cloud проект с включенным Sheets API
- GitHub репозиторий
- OpenRouter API ключ
- GitHub Personal Access Token

## Быстрый старт

1. Следуйте инструкциям в `SETUP.md`
2. Настройте `apps-script/config.gs`
3. Добавьте Secrets в GitHub
4. Запустите через меню в Google Sheets

Подробности в `README.md` и `SETUP.md`.

