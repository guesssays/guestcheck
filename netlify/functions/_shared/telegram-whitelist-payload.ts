type ParseResult =
  | { ok: true; chatId: number }
  | { ok: false; error: string; status: number };

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Resolves chat id from request body. Accepts chat_id (canonical) and legacy aliases
 * telegram_id / telegramId for backward compatibility with older clients.
 */
export function parseWhitelistChatId(body: Record<string, unknown>): ParseResult {
  const raw = body.chat_id ?? body.telegram_id ?? body.telegramId;
  if (raw === undefined || raw === null || raw === '') {
    return { ok: false, error: 'chat_id is required', status: 400 };
  }
  const chatId = coerceNumber(raw);
  if (chatId === null) {
    return { ok: false, error: 'chat_id must be a valid integer', status: 400 };
  }
  return { ok: true, chatId };
}

export function mapTelegramWhitelistDbError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('telegram_id') && m.includes('null') && m.includes('not-null')) {
    return 'Сохранение не удалось: устаревшая колонка telegram_id в БД. Примените миграцию 006_telegram_whitelist_telegram_id_nullable.sql в Supabase.';
  }
  if (m.includes('duplicate') || m.includes('unique')) {
    return 'Такая запись уже существует (нарушение уникальности).';
  }
  return raw;
}
