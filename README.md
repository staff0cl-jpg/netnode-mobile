# NetNode Mobile

Мобильное приложение для мониторинга сети NetNode — React Native / Expo.

## Функциональность

- **Dashboard** — KPI карточки (всего устройств, онлайн, алерты, средняя нагрузка), топ-5 устройств, down-транки
- **Inventory** — полный список устройств с поиском и фильтрами по статусу
- **Alerts** — активные алерты: оффлайн-устройства, warning-устройства, down trunk-порты
- **Settings** — настройка API URL, тест соединения, управление сессией

## Запуск

### Требования

- [Node.js](https://nodejs.org/) 18+
- [Expo Go](https://expo.dev/go) на телефоне (iOS или Android)

### Установка и запуск

```bash
# Установить зависимости (если ещё не установлены)
npm install

# Запустить dev-сервер
npx expo start
```

Отсканируй QR-код в приложении **Expo Go** на телефоне.

## Настройка

1. Открой вкладку **Settings** в приложении
2. Введи URL твоего сервера NetNode, например: `http://192.168.1.100:3000`
3. Нажми **Test Connection** — убедись, что соединение работает
4. Нажми **Save**

> Важно: телефон и сервер должны быть в одной сети (или использовать публичный URL).

## Структура проекта

```
NetNode-mobile/
├── app/
│   ├── _layout.tsx          # Root layout (expo-router)
│   └── (tabs)/
│       ├── _layout.tsx      # Tab навигация
│       ├── index.tsx        # Dashboard
│       ├── inventory.tsx    # Inventory
│       ├── alerts.tsx       # Alerts
│       └── settings.tsx     # Settings
├── lib/
│   ├── api.ts               # API клиент
│   └── storage.ts           # AsyncStorage утилиты
├── constants/
│   └── colors.ts            # Цветовая схема (тёмная)
└── app.json                 # Expo конфигурация
```

## Технологии

- [Expo](https://expo.dev/) SDK 54
- [expo-router](https://expo.github.io/router/) v6
- React Native 0.81
- TypeScript
- AsyncStorage для хранения настроек
