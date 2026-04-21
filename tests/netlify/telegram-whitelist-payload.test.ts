import { describe, it, expect } from 'vitest';
import {
  mapTelegramWhitelistDbError,
  parseWhitelistChatId,
} from '../../netlify/functions/_shared/telegram-whitelist-payload';

describe('parseWhitelistChatId', () => {
  it('accepts chat_id string', () => {
    expect(parseWhitelistChatId({ chat_id: '670272952' })).toEqual({ ok: true, chatId: 670272952 });
  });

  it('accepts chat_id number', () => {
    expect(parseWhitelistChatId({ chat_id: 670272952 })).toEqual({ ok: true, chatId: 670272952 });
  });

  it('accepts telegram_id alias', () => {
    expect(parseWhitelistChatId({ telegram_id: '123' })).toEqual({ ok: true, chatId: 123 });
  });

  it('accepts telegramId alias', () => {
    expect(parseWhitelistChatId({ telegramId: 99 })).toEqual({ ok: true, chatId: 99 });
  });

  it('prefers chat_id over aliases', () => {
    expect(parseWhitelistChatId({ chat_id: '1', telegram_id: '2' })).toEqual({ ok: true, chatId: 1 });
  });

  it('rejects missing', () => {
    const r = parseWhitelistChatId({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it('rejects invalid', () => {
    const r = parseWhitelistChatId({ chat_id: 'abc' });
    expect(r.ok).toBe(false);
  });
});

describe('mapTelegramWhitelistDbError', () => {
  it('maps telegram_id not-null', () => {
    const msg = mapTelegramWhitelistDbError(
      'null value in column "telegram_id" of relation "telegram_whitelist" violates not-null constraint'
    );
    expect(msg).toContain('006');
  });

  it('passes through unknown', () => {
    expect(mapTelegramWhitelistDbError('something else')).toBe('something else');
  });
});
