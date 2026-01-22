# Структура проекта Office Attendance

```
office-attendance/
├── apps/
│   └── web/                          # React приложение (Frontend)
│       ├── src/
│       │   ├── components/
│       │   │   └── Layout.tsx        # Основной layout с навигацией
│       │   ├── lib/
│       │   │   ├── api.ts            # API клиент
│       │   │   ├── auth.ts            # Авторизация
│       │   │   └── supabase.ts       # Supabase клиент
│       │   ├── pages/
│       │   │   ├── Login.tsx         # Страница входа
│       │   │   ├── Dashboard.tsx     # Главная страница
│       │   │   ├── OnlineStatus.tsx  # Онлайн статусы
│       │   │   ├── Journal.tsx       # Журнал посещений
│       │   │   ├── Reports.tsx       # Отчёты
│       │   │   ├── Employees.tsx     # Справочник сотрудников
│       │   │   ├── Departments.tsx   # Справочник отделов
│       │   │   ├── Guests.tsx        # Управление гостями
│       │   │   └── Admin.tsx         # Админка
│       │   ├── types/
│       │   │   └── index.ts          # TypeScript типы
│       │   ├── App.tsx               # Главный компонент
│       │   ├── main.tsx              # Точка входа
│       │   └── index.css             # Глобальные стили
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       └── postcss.config.js
│
├── netlify/
│   └── functions/                    # Netlify Functions (Backend API)
│       ├── _shared/
│       │   ├── supabase.ts           # Supabase клиент для функций
│       │   └── audit.ts              # Логирование действий
│       ├── me.ts                     # GET /api/me - профиль пользователя
│       ├── departments.ts            # CRUD /api/departments
│       ├── employees.ts              # CRUD /api/employees
│       ├── attendance-check-in.ts    # POST /api/attendance-check-in
│       ├── attendance-check-out.ts   # POST /api/attendance-check-out
│       ├── online-status.ts          # GET /api/online-status
│       ├── guests-pre-register.ts    # POST /api/guests-pre-register
│       ├── guests-expected.ts        # GET /api/guests-expected
│       ├── guests-confirm-in.ts      # POST /api/guests-confirm-in
│       ├── guests-check-out.ts       # POST /api/guests-check-out
│       ├── journal.ts                # GET /api/journal
│       ├── reports-xlsx.ts            # GET /api/reports-xlsx
│       ├── admin-users.ts            # GET/PUT /api/admin-users
│       ├── telegram-webhook.ts       # POST /api/telegram-webhook
│       ├── cleanup.ts                # Scheduled function для очистки
│       └── package.json
│
├── supabase/
│   └── migrations/                   # SQL миграции
│       ├── 001_initial_schema.sql    # Схема БД (таблицы, индексы, триггеры)
│       ├── 002_rls_policies.sql      # Row Level Security политики
│       └── 003_cleanup_function.sql  # Функция очистки старых данных
│
├── .gitignore
├── netlify.toml                      # Конфигурация Netlify
├── package.json                      # Root package.json (workspaces)
├── env.example                       # Пример переменных окружения
├── README.md                         # Документация
└── PROJECT_STRUCTURE.md              # Этот файл
```

## Описание компонентов

### Frontend (apps/web)

- **React + TypeScript + Vite** - современный стек для разработки
- **TailwindCSS** - утилитарный CSS фреймворк
- **React Router** - маршрутизация
- **TanStack Query** - управление состоянием сервера
- **react-hook-form + zod** - формы и валидация

### Backend (netlify/functions)

- **Netlify Functions** - serverless функции на Node.js
- **Supabase JS Client** - для работы с БД
- **XLSX (SheetJS)** - генерация Excel отчётов

### Database (supabase/migrations)

- **PostgreSQL** - основная БД
- **Row Level Security (RLS)** - безопасность на уровне БД
- **Scheduled Functions** - автоматическая очистка данных

## Ключевые файлы

### Конфигурация

- `netlify.toml` - настройки деплоя, redirects, scheduled functions
- `apps/web/vite.config.ts` - конфигурация Vite
- `apps/web/tailwind.config.js` - конфигурация TailwindCSS

### Миграции БД

1. **001_initial_schema.sql** - создаёт все таблицы, индексы, триггеры
2. **002_rls_policies.sql** - настраивает RLS политики для безопасности
3. **003_cleanup_function.sql** - функция для очистки данных старше 90 дней

### API Endpoints

Все endpoints находятся в `netlify/functions/`:

- `/api/me` - профиль текущего пользователя
- `/api/departments` - CRUD отделов
- `/api/employees` - CRUD сотрудников
- `/api/attendance-check-in` - регистрация входа
- `/api/attendance-check-out` - регистрация выхода
- `/api/online-status` - онлайн статусы
- `/api/guests-*` - управление гостями
- `/api/journal` - журнал посещений
- `/api/reports-xlsx` - экспорт отчётов
- `/api/admin-users` - управление пользователями
- `/api/telegram-webhook` - webhook для Telegram бота

## Переменные окружения

### Frontend (.env.local)

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Backend (Netlify Environment Variables)

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
APP_BASE_URL=...
NETLIFY_SITE_URL=...
```

## Схема базы данных

### Основные таблицы

- `departments` - отделы
- `employees` - сотрудники
- `staff_attendance_events` - события посещений сотрудников
- `guest_visits` - визиты гостей
- `profiles` - профили пользователей с правами
- `user_allowed_departments` - разрешённые отделы
- `audit_log` - журнал действий
- `telegram_whitelist` - whitelist для Telegram бота

### Связи

- `employees.department_id` → `departments.id`
- `staff_attendance_events.employee_id` → `employees.id`
- `guest_visits.department_id` → `departments.id`
- `profiles.user_id` → `auth.users.id`
- `user_allowed_departments` - many-to-many между users и departments

## Безопасность

- Все API endpoints требуют авторизации
- RLS политики в Supabase ограничивают доступ к данным
- Права проверяются на уровне API и UI
- Service Role Key используется только в serverless функциях
