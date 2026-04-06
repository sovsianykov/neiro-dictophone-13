# Диктофон (PWA)

Офлайн-first приложение на **Next.js** (App Router): распознавание речи в браузере, **IndexedDB**, синхронизация с **PostgreSQL** через **Prisma**, вход через **NextAuth** (Credentials + JWT).

> В шаблоне используется **Next.js 16** и **React 19**. Для **next-pwa** сборка выполняется с **webpack** (`npm run build` уже вызывает `next build --webpack`). **Prisma** зафиксирована на **5.22** (классическая схема с `DATABASE_URL` в `schema.prisma`; Prisma 7 требует отдельный конфиг и адаптеры).

## Требования

- Node.js 20+
- PostgreSQL

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

| Переменная      | Назначение                                      |
|-----------------|-------------------------------------------------|
| `DATABASE_URL`  | Строка подключения PostgreSQL для Prisma        |
| `AUTH_SECRET`   | Секрет подписи сессии (`openssl rand -base64 32`) |
| `NEXTAUTH_URL`  | Публичный URL приложения, локально: `http://localhost:3000` |

## Установка и база данных

```bash
npm install
```

Применить схему к БД (выберите один вариант):

```bash
# миграции (рекомендуется для продакшена)
npm run db:migrate

# или быстрый push без файлов миграций (удобно для разработки)
npm run db:push
```

Клиент Prisma генерируется на `postinstall` и вручную:

```bash
npm run db:generate
```

## Запуск в разработке

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) — произойдёт редирект на `/login`.

**Аккаунты:** регистрация на [`/register`](/register), вход на [`/login`](/login). Пользователи хранятся в PostgreSQL (модель `User`, пароль — bcrypt).

После изменения схемы обязательно выполните миграцию или `db:push` (см. выше).

## Сборка и PWA

```bash
npm run build
npm start
```

Service Worker **next-pwa** отключён в `development` и подключается в production (см. `components/providers.tsx`). После `build` в `public/` появятся `sw.js` и файлы Workbox — они перечислены в `.gitignore`.

Иконки `public/icon-192.png` и `icon-512.png` сейчас — минимальные заглушки; для продакшена замените на нормальные маскируемые иконки.

## Структура

- `app/` — маршруты, API (`/api/auth`, `/api/transcriptions`), страницы
- `components/` — UI, провайдеры
- `hooks/useSpeechRecognition.ts` — Web Speech API, debounce промежуточного текста
- `lib/transcriptions-idb.ts` — IndexedDB (idb)
- `lib/sync-transcriptions.ts` — синхронизация на сервер
- `db/schema.prisma`, `db/client.ts` — Prisma
- `auth.ts` — NextAuth (Credentials, JWT)
- `middleware.ts` — защита страниц и 401 для API без сессии
- `public/manifest.json` — манифест PWA

## Поведение

1. Текст диктуется через **Web Speech API** (лучше всего Chrome / Edge); языки **ru-RU** и **uk-UA**.
2. **Сохранить** записывает фразу в **IndexedDB** с полями `text`, `createdAt`, `synced`.
3. При **онлайн** после сохранения и по событию `online` вызывается `syncTranscriptions()`: `POST /api/transcriptions` (только с сессией), затем локальная запись помечается `synced: true`.

## Лицензия

Как у исходного шаблона Next.js / вашего проекта.
