# Инструкция по настройке Telegram Whitelist

## Быстрая проверка

1. **Примените миграции в Supabase:**
   ```sql
   -- Выполните в порядке:
   -- 1. 001_initial_schema.sql (если еще не применена)
   -- 2. 002_rls_policies.sql (если еще не применена)
   -- 3. 004_telegram_whitelist_update.sql (новая)
   -- 4. 005_telegram_whitelist_rls_update.sql (новая)
   ```

2. **Добавьте chat_id в whitelist:**
   - Откройте админку: `/admin` > вкладка "Telegram"
   - Нажмите "Добавить"
   - Введите chat_id (например, `123456789`)
   - Опционально: username, full_name, note
   - Сохраните

3. **Проверьте доступ:**
   - Отправьте боту `/start` с аккаунта, chat_id которого добавлен
   - Бот должен показать главное меню
   - Если chat_id не в whitelist, бот покажет сообщение с chat_id для добавления

## Структура таблицы

После миграции таблица `telegram_whitelist` содержит:
- `id` (UUID, PRIMARY KEY)
- `chat_id` (BIGINT, UNIQUE, NOT NULL) - основной идентификатор
- `username` (TEXT, NULL)
- `full_name` (TEXT, NULL)
- `note` (TEXT, NULL)
- `added_by` (UUID, NULL) - кто добавил запись
- `created_at` (TIMESTAMPTZ)
- `user_id` (UUID, NULL) - опциональная привязка к пользователю системы
- `telegram_id` (BIGINT, NULL) - legacy поле, мигрировано в chat_id

## API Endpoints

- `GET /api/telegram-whitelist?search=...` - список записей (с поиском)
- `POST /api/telegram-whitelist` - добавить запись
- `PUT /api/telegram-whitelist` - обновить запись
- `DELETE /api/telegram-whitelist?chat_id=...` - удалить запись

Все endpoints требуют авторизацию как admin.

## Webhook логика

1. Webhook получает update от Telegram
2. Извлекает `chat_id` из `update.message.chat.id` или `update.callback_query.message.chat.id`
3. Проверяет наличие `chat_id` в таблице `telegram_whitelist`
4. Если не найден - отправляет сообщение с chat_id и завершает обработку
5. Если найден - продолжает обработку команды

## Примеры

### Добавление через API:
```bash
curl -X POST "https://your-site.netlify.app/api/telegram-whitelist" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "123456789",
    "username": "@username",
    "full_name": "Иван Иванов",
    "note": "Тестовый пользователь"
  }'
```

### Поиск:
```bash
curl "https://your-site.netlify.app/api/telegram-whitelist?search=123456789" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
