# Office Attendance - Система учёта посещений офиса

Production-ready веб-система учёта входа/выхода сотрудников и гостей офиса с Telegram-ботом для просмотра статусов.

## 🚀 Технологии

- **Frontend**: React + TypeScript + Vite, TailwindCSS, React Router, TanStack Query, react-hook-form + zod
- **Backend**: Netlify Functions (Node.js)
- **Database**: Supabase (PostgreSQL + Auth)
- **Telegram Bot**: Webhook на Netlify Function
- **Deployment**: Netlify

## 📋 Функциональность

### Основные возможности

- ✅ Учёт входа/выхода сотрудников (без обеда)
- ✅ Учёт гостей: предварительная регистрация, подтверждение прихода, фиксация ухода
- ✅ Онлайн-статусы по отделам ("В здании"/"Вне здания" + время)
- ✅ Журнал посещений с фильтрами (даты, отделы, сотрудники, поиск, статусы)
- ✅ Отчёты: дневной, месячный, произвольный период (до 90 дней), экспорт XLSX
- ✅ RBAC с детальными правами доступа
- ✅ Telegram-бот для просмотра статусов
- ✅ Автоматическая очистка данных старше 90 дней

### Роли и доступы

1. **Админ** - полный доступ ко всем функциям
2. **Охрана/Ресепшен** - регистрация входов/выходов, подтверждение гостей
3. **Секретарь** - предварительная регистрация гостей, редактирование визитов
4. **Руководитель отдела** - просмотр только своего отдела
5. **Топ-менеджмент** - доступ к нескольким отделам
6. **Генеральный доступ** - просмотр всех данных (без настроек)

## 📁 Структура проекта

```
.
├── apps/
│   └── web/                    # React приложение
│       ├── src/
│       │   ├── components/     # React компоненты
│       │   ├── lib/            # Утилиты и сервисы
│       │   ├── pages/          # Страницы приложения
│       │   ├── types/          # TypeScript типы
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── package.json
│       ├── vite.config.ts
│       └── tailwind.config.js
├── netlify/
│   └── functions/              # Netlify Functions
│       ├── _shared/           # Общие утилиты
│       ├── me.ts              # Профиль пользователя
│       ├── departments.ts     # CRUD отделов
│       ├── employees.ts       # CRUD сотрудников
│       ├── attendance-*.ts    # Регистрация посещений
│       ├── guests-*.ts        # Управление гостями
│       ├── journal.ts         # Журнал посещений
│       ├── reports-xlsx.ts    # Экспорт отчётов
│       ├── admin-users.ts     # Управление пользователями
│       ├── telegram-webhook.ts # Telegram бот
│       └── cleanup.ts         # Очистка старых данных
├── supabase/
│   └── migrations/            # SQL миграции
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_cleanup_function.sql
├── netlify.toml               # Конфигурация Netlify
├── package.json
└── README.md
```

## 🛠️ Установка и запуск

### Предварительные требования

- Node.js 20+
- npm или yarn
- Аккаунт Supabase
- Аккаунт Netlify
- Telegram Bot Token (от @BotFather)

### 1. Клонирование и установка зависимостей

```bash
git clone <repository-url>
cd office-attendance
npm install
cd apps/web
npm install
cd ../../netlify/functions
npm install
```

### 2. Настройка Supabase

1. Создайте новый проект в [Supabase](https://supabase.com)
2. Перейдите в SQL Editor
3. Примените миграции в порядке:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_cleanup_function.sql`

4. Получите ключи:
   - `SUPABASE_URL` - из Settings > API
   - `SUPABASE_ANON_KEY` - из Settings > API
   - `SUPABASE_SERVICE_ROLE_KEY` - из Settings > API (секретный ключ)

### 3. Настройка переменных окружения

Создайте файл `apps/web/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Создайте файл `.env` в корне проекта (для Netlify Functions):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=optional-webhook-secret
APP_BASE_URL=http://localhost:8888
NETLIFY_SITE_URL=http://localhost:8888
```

### 4. Создание первого пользователя (админа)

1. В Supabase Dashboard перейдите в Authentication > Users
2. Создайте нового пользователя (email + password)
3. Запишите `user_id` (UUID)

4. В SQL Editor выполните:

```sql
-- Создать профиль админа
INSERT INTO profiles (
  user_id,
  role,
  display_name,
  can_view_online,
  can_view_journal,
  can_view_reports,
  can_view_employee_cards,
  can_view_guest_cards,
  can_see_phones,
  can_export_reports,
  can_register_attendance,
  can_register_guests,
  can_confirm_guests,
  can_edit_guests,
  can_manage_departments,
  can_manage_employees,
  can_manage_users
) VALUES (
  'YOUR_USER_ID_HERE',
  'admin',
  'Администратор',
  true, true, true, true, true, true, true,
  true, true, true, true, true, true, true
);
```

### 5. Локальный запуск

```bash
# Запуск frontend
cd apps/web
npm run dev

# Приложение будет доступно на http://localhost:5173
```

Для тестирования Netlify Functions локально используйте [Netlify CLI](https://docs.netlify.com/cli/get-started/):

```bash
npm install -g netlify-cli
netlify dev
```

## 📦 Деплой на Netlify

### 1. Подготовка репозитория

Убедитесь, что все файлы закоммичены и запушены в Git репозиторий.

### 2. Создание сайта в Netlify

1. Войдите в [Netlify Dashboard](https://app.netlify.com)
2. Нажмите "Add new site" > "Import an existing project"
3. Подключите ваш Git репозиторий
4. Настройки сборки:
   - **Build command**: `npm run build`
   - **Publish directory**: `apps/web/dist`
   - **Base directory**: (оставьте пустым)

### 3. Настройка переменных окружения

В Netlify Dashboard перейдите в Site settings > Environment variables и добавьте:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=optional-webhook-secret
APP_BASE_URL=https://your-site.netlify.app
NETLIFY_SITE_URL=https://your-site.netlify.app
```

### 4. Деплой

Netlify автоматически задеплоит при пуше в основную ветку. Или нажмите "Deploy site" вручную.

### 5. Настройка Telegram Webhook

После деплоя настройте webhook для Telegram бота:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-site.netlify.app/api/telegram-webhook"
```

Или используйте функцию в коде (если добавите endpoint `/api/telegram-set-webhook`).

### 6. Настройка Scheduled Function для очистки

Scheduled Function `cleanup` настроена в `netlify.toml` и будет запускаться ежедневно в 2:00 UTC.

## 👥 Управление пользователями

### Добавление нового пользователя

1. В Supabase Dashboard: Authentication > Users > Add user
2. Создайте пользователя с email и password
3. В веб-интерфейсе (как админ): `/admin` > выберите пользователя > "Редактировать права"
4. Настройте:
   - Роль
   - Права доступа (галочки)
   - Разрешённые отделы

### Настройка Telegram Whitelist

1. Узнайте Telegram ID пользователя (отправьте `/start` боту, посмотрите в логах или используйте @userinfobot)
2. В Supabase SQL Editor:

```sql
INSERT INTO telegram_whitelist (telegram_id, user_id, is_active)
VALUES (123456789, 'USER_UUID_HERE', true);
```

Или добавьте через админку (если реализовано).

## 🔐 Безопасность

- Все API endpoints защищены авторизацией через Supabase Auth
- Row Level Security (RLS) политики в Supabase ограничивают доступ к данным
- Права доступа проверяются на уровне API и UI
- Telegram whitelist ограничивает доступ к боту
- Service Role Key используется только в Netlify Functions (не в frontend)

## 📊 База данных

### Основные таблицы

- `departments` - отделы
- `employees` - сотрудники
- `staff_attendance_events` - события посещений сотрудников
- `guest_visits` - визиты гостей
- `profiles` - профили пользователей с правами
- `user_allowed_departments` - разрешённые отделы для пользователей
- `audit_log` - журнал действий
- `telegram_whitelist` - whitelist Telegram ID

### Хранение данных

- Данные хранятся минимум 90 дней
- Scheduled Function `cleanup` удаляет записи старше 90 дней
- Audit log можно настроить на очистку (закомментировано в миграции)

## 🤖 Telegram Bot

### Команды

- `/start` или `/help` - список команд
- `/now` - кто сейчас в здании
- `/out` - кто вышел сегодня
- `/dept [название]` - статусы по отделу
- `/employee [ФИО]` - статус конкретного сотрудника

### Настройка

1. Создайте бота через [@BotFather](https://t.me/botfather)
2. Получите `TELEGRAM_BOT_TOKEN`
3. Добавьте токен в переменные окружения Netlify
4. Настройте webhook (см. выше)
5. Добавьте пользователей в whitelist

## 🐛 Решение проблем

### Ошибка авторизации

- Проверьте, что `SUPABASE_ANON_KEY` и `SUPABASE_SERVICE_ROLE_KEY` правильные
- Убедитесь, что пользователь создан в Supabase Auth
- Проверьте, что профиль создан в таблице `profiles`

### Telegram бот не отвечает

- Проверьте, что webhook настроен правильно
- Убедитесь, что Telegram ID в whitelist
- Проверьте логи Netlify Functions

### Ошибки RLS

- Убедитесь, что миграции применены
- Проверьте, что пользователь имеет нужные права в `profiles`
- Проверьте `user_allowed_departments` для доступа к отделам

### Функции не работают

- Проверьте переменные окружения в Netlify
- Убедитесь, что `netlify.toml` настроен правильно
- Проверьте логи в Netlify Dashboard > Functions

## 📝 Лицензия

MIT

## 👨‍💻 Поддержка

При возникновении проблем создайте issue в репозитории проекта.
