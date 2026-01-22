import type { Handler } from '@netlify/functions';
import { supabase } from './_shared/supabase';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: { id: number; type: string };
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface UserContext {
  telegramId: number;
  userId: string;
  profile: any;
  allowedDepartmentIds: string[];
  canSeePhones: boolean;
}

async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: any
) {
  const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  });
  return response.json();
}

async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: any
) {
  const response = await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  });
  return response.json();
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const response = await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: !!text,
    }),
  });
  return response.json();
}

function createMainMenu() {
  return {
    inline_keyboard: [
      [
        { text: '🏢 Сейчас в здании', callback_data: 'menu_in_building' },
        { text: '🚶 Вне здания', callback_data: 'menu_outside' },
      ],
      [
        { text: '🏬 По отделу', callback_data: 'menu_by_department' },
        { text: '🔎 По сотруднику', callback_data: 'menu_by_employee' },
      ],
    ],
  };
}

async function checkWhitelist(chatId: number | string): Promise<boolean> {
  // Check if chat_id is in whitelist
  // Convert to number for comparison (Supabase BIGINT may return as string)
  const chatIdNum = typeof chatId === 'string' ? parseInt(chatId, 10) : chatId;
  if (isNaN(chatIdNum)) {
    return false;
  }

  const { data } = await supabase
    .from('telegram_whitelist')
    .select('chat_id')
    .eq('chat_id', chatIdNum)
    .single();

  return !!data;
}

async function getUserContext(telegramId: number, chatId: number | string): Promise<UserContext | null> {
  // Check whitelist by chat_id
  const isWhitelisted = await checkWhitelist(chatId);
  if (!isWhitelisted) {
    return null;
  }

  // Convert chatId to number for query
  const chatIdNum = typeof chatId === 'string' ? parseInt(chatId, 10) : chatId;
  if (isNaN(chatIdNum)) {
    return null;
  }

  // Get whitelist entry to check if user_id is set
  const { data: whitelist } = await supabase
    .from('telegram_whitelist')
    .select('user_id')
    .eq('chat_id', chatIdNum)
    .single();

  // If no user_id is set, return basic context (no profile-based permissions)
  if (!whitelist?.user_id) {
    // Get all departments for basic access
    const { data: allDepts } = await supabase
      .from('departments')
      .select('id')
      .eq('is_active', true);

    return {
      telegramId,
      userId: '',
      profile: { role: 'general', can_see_phones: false },
      allowedDepartmentIds: Array.isArray(allDepts) ? allDepts.map((d) => d.id) : [],
      canSeePhones: false,
    };
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', whitelist.user_id)
    .single();

  if (!profile) {
    return null;
  }

  // Get allowed departments
  const { data: allowedDepts } = await supabase
    .from('user_allowed_departments')
    .select('department_id')
    .eq('user_id', whitelist.user_id);

  const allowedDepartmentIds = Array.isArray(allowedDepts)
    ? allowedDepts.map((d) => d.department_id)
    : [];

  // Admin sees all departments
  const isAdmin = profile.role === 'admin';
  let finalDepartmentIds = allowedDepartmentIds;

  if (isAdmin) {
    const { data: allDepts } = await supabase
      .from('departments')
      .select('id')
      .eq('is_active', true);
    finalDepartmentIds = Array.isArray(allDepts) ? allDepts.map((d) => d.id) : [];
  } else if (profile.department_id) {
    // Include user's own department if set
    if (!finalDepartmentIds.includes(profile.department_id)) {
      finalDepartmentIds.push(profile.department_id);
    }
  }

  return {
    telegramId,
    userId: whitelist.user_id,
    profile,
    allowedDepartmentIds: finalDepartmentIds,
    canSeePhones: profile.can_see_phones || false,
  };
}

async function getInBuilding(ctx: UserContext): Promise<string> {
  const today = new Date().toISOString().split('T')[0];

  const { data: allData } = await supabase
    .from('staff_attendance_events')
    .select('*, employees(*, departments(name))')
    .eq('date', today)
    .eq('status', 'in_building')
    .order('check_in_at', { ascending: false });

  // Filter by allowed departments
  let data = allData;
  if (ctx.profile.role !== 'admin' && ctx.allowedDepartmentIds.length > 0) {
    data = (allData || []).filter(
      (row: any) =>
        row.employees?.department_id &&
        ctx.allowedDepartmentIds.includes(row.employees.department_id)
    );
  }

  if (!data || data.length === 0) {
    return '👥 <b>Сейчас в здании:</b>\n\nНет сотрудников';
  }

  const items = data.map((row: any) => {
    const emp = row.employees;
    const name = `${emp?.last_name || ''} ${emp?.first_name || ''} ${emp?.middle_name || ''}`.trim();
    const dept = emp?.departments?.name || 'Без отдела';
    const time = row.check_in_at
      ? new Date(row.check_in_at).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
    return `• <b>${name}</b>\n  ${dept} - с ${time}`;
  });

  return `👥 <b>Сейчас в здании (${data.length}):</b>\n\n${items.join('\n\n')}`;
}

async function getOutside(ctx: UserContext): Promise<string> {
  const today = new Date().toISOString().split('T')[0];

  const { data: allData } = await supabase
    .from('staff_attendance_events')
    .select('*, employees(*, departments(name))')
    .eq('date', today)
    .eq('status', 'outside')
    .not('check_out_at', 'is', null)
    .order('check_out_at', { ascending: false })
    .limit(50);

  // Filter by allowed departments
  let data = allData;
  if (ctx.profile.role !== 'admin' && ctx.allowedDepartmentIds.length > 0) {
    data = (allData || []).filter(
      (row: any) =>
        row.employees?.department_id &&
        ctx.allowedDepartmentIds.includes(row.employees.department_id)
    );
  }

  if (!data || data.length === 0) {
    return '🚪 <b>Вне здания:</b>\n\nНет данных';
  }

  const items = data.map((row: any) => {
    const emp = row.employees;
    const name = `${emp?.last_name || ''} ${emp?.first_name || ''} ${emp?.middle_name || ''}`.trim();
    const dept = emp?.departments?.name || 'Без отдела';
    const time = row.check_out_at
      ? new Date(row.check_out_at).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
    return `• <b>${name}</b>\n  ${dept} - ${time}`;
  });

  return `🚪 <b>Вне здания (${data.length}):</b>\n\n${items.join('\n\n')}`;
}

async function getDepartmentsList(ctx: UserContext): Promise<any> {
  let query = supabase
    .from('departments')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  // Filter by allowed departments
  if (ctx.profile.role !== 'admin' && ctx.allowedDepartmentIds.length > 0) {
    query = query.in('id', ctx.allowedDepartmentIds);
  }

  const { data: departments } = await query;

  if (!departments || departments.length === 0) {
    return {
      text: '❌ Нет доступных отделов',
      keyboard: null,
    };
  }

  const buttons = departments.map((dept: any) => [
    { text: dept.name, callback_data: `dept_${dept.id}` },
  ]);

  return {
    text: '🏬 <b>Выберите отдел:</b>',
    keyboard: {
      inline_keyboard: [
        ...buttons,
        [{ text: '◀️ Назад', callback_data: 'menu_back' }],
      ],
    },
  };
}

async function getDepartmentStatus(
  ctx: UserContext,
  departmentId: string
): Promise<string> {
  const today = new Date().toISOString().split('T')[0];

  // Check if user has access to this department
  if (
    ctx.profile.role !== 'admin' &&
    !ctx.allowedDepartmentIds.includes(departmentId)
  ) {
    return '❌ Доступ запрещён';
  }

  const { data: dept } = await supabase
    .from('departments')
    .select('name')
    .eq('id', departmentId)
    .single();

  if (!dept) {
    return '❌ Отдел не найден';
  }

  const { data } = await supabase
    .from('staff_attendance_events')
    .select('*, employees(*, departments(name))')
    .eq('date', today)
    .eq('employees.department_id', departmentId)
    .order('check_in_at', { ascending: false });

  if (!data || data.length === 0) {
    return `🏬 <b>Отдел "${dept.name}":</b>\n\nНет данных за сегодня`;
  }

  const inBuilding = data.filter((r: any) => r.status === 'in_building');
  const outside = data.filter((r: any) => r.status === 'outside');

  const inBuildingList =
    inBuilding.length > 0
      ? inBuilding
          .map((row: any) => {
            const emp = row.employees;
            const name = `${emp?.last_name || ''} ${emp?.first_name || ''}`.trim();
            const time = row.check_in_at
              ? new Date(row.check_in_at).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';
            return `• <b>${name}</b> - с ${time}`;
          })
          .join('\n')
      : 'нет';

  const outsideList =
    outside.length > 0
      ? outside
          .map((row: any) => {
            const emp = row.employees;
            const name = `${emp?.last_name || ''} ${emp?.first_name || ''}`.trim();
            const outTime = row.check_out_at
              ? new Date(row.check_out_at).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';
            return `• <b>${name}</b> - ${outTime}`;
          })
          .join('\n')
      : 'нет';

  return `🏬 <b>Отдел "${dept.name}":</b>\n\n<b>В здании (${inBuilding.length}):</b>\n${inBuildingList}\n\n<b>Вне здания (${outside.length}):</b>\n${outsideList}`;
}

async function searchEmployee(
  ctx: UserContext,
  searchText: string
): Promise<string> {
  if (!searchText || searchText.trim().length < 2) {
    return '❌ Введите минимум 2 символа для поиска';
  }

  const search = `%${searchText.trim()}%`;

  let query = supabase
    .from('employees')
    .select('id, last_name, first_name, middle_name, phone1, phone2, departments(name)')
    .or(`last_name.ilike.${search},first_name.ilike.${search},middle_name.ilike.${search}`)
    .eq('is_active', true)
    .limit(10);

  // Filter by allowed departments
  if (ctx.profile.role !== 'admin' && ctx.allowedDepartmentIds.length > 0) {
    query = query.in('department_id', ctx.allowedDepartmentIds);
  }

  const { data: employees } = await query;

  if (!employees || employees.length === 0) {
    return `❌ Сотрудники не найдены по запросу "${searchText}"`;
  }

  const today = new Date().toISOString().split('T')[0];

  const results = await Promise.all(
    employees.map(async (emp: any) => {
      const { data: attendance } = await supabase
        .from('staff_attendance_events')
        .select('*')
        .eq('employee_id', emp.id)
        .eq('date', today)
        .single();

      const name = `${emp.last_name} ${emp.first_name} ${emp.middle_name || ''}`.trim();
      const dept = (emp as any).departments?.name || 'Без отдела';

      let statusText = '❌ Нет данных';
      if (attendance) {
        if (attendance.status === 'in_building') {
          const time = attendance.check_in_at
            ? new Date(attendance.check_in_at).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';
          statusText = `✅ В здании с ${time}`;
        } else {
          const outTime = attendance.check_out_at
            ? new Date(attendance.check_out_at).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';
          statusText = `🚪 Вне здания (выход: ${outTime})`;
        }
      }

      let phoneText = '';
      if (ctx.canSeePhones && (emp.phone1 || emp.phone2)) {
        const phones = [emp.phone1, emp.phone2].filter(Boolean).join(', ');
        phoneText = `\n📞 ${phones}`;
      }

      return `👤 <b>${name}</b>\n${dept}\n${statusText}${phoneText}`;
    })
  );

  return `<b>Результаты поиска "${searchText}" (${results.length}):</b>\n\n${results.join('\n\n')}`;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const update: TelegramUpdate = JSON.parse(event.body || '{}');

    // Extract chat_id from different update types
    let chatId: number | undefined;
    let telegramId: number | undefined;

    if (update.callback_query) {
      // Callback query (inline keyboard button click)
      chatId = update.callback_query.message?.chat.id || update.callback_query.from.id;
      telegramId = update.callback_query.from.id;
    } else if (update.message) {
      // Regular message
      chatId = update.message.chat.id;
      telegramId = update.message.from.id;
    } else if (update.edited_message) {
      // Edited message
      chatId = update.edited_message.chat.id;
      telegramId = update.edited_message.from.id;
    }

    // If no chat_id found, return OK (unknown update type)
    if (!chatId || !telegramId) {
      return { statusCode: 200, body: 'OK' };
    }

    // Handle callback_query (button clicks)
    if (update.callback_query) {
      const callback = update.callback_query;
      const messageId = callback.message?.message_id;

      await answerCallbackQuery(callback.id);

      const ctx = await getUserContext(telegramId, chatId);
      if (!ctx) {
        await sendTelegramMessage(
          chatId,
          `❌ Доступ запрещён. Обратитесь к администратору.\n\nВаш chat_id: <code>${chatId}</code>`
        );
        return { statusCode: 200, body: 'OK' };
      }

      const data = callback.data;

      if (data === 'menu_back') {
        const menu = createMainMenu();
        await editMessageText(chatId, messageId!, '📋 <b>Главное меню:</b>', menu);
      } else if (data === 'menu_in_building') {
        const text = await getInBuilding(ctx);
        const menu = createMainMenu();
        await editMessageText(chatId, messageId!, text, menu);
      } else if (data === 'menu_outside') {
        const text = await getOutside(ctx);
        const menu = createMainMenu();
        await editMessageText(chatId, messageId!, text, menu);
      } else if (data === 'menu_by_department') {
        const deptList = await getDepartmentsList(ctx);
        if (deptList.keyboard) {
          await editMessageText(chatId, messageId!, deptList.text, deptList.keyboard);
        } else {
          await editMessageText(chatId, messageId!, deptList.text);
        }
      } else if (data === 'menu_by_employee') {
        await editMessageText(
          chatId,
          messageId!,
          '🔎 <b>Поиск по сотруднику</b>\n\nВведите ФИО или часть имени:'
        );
      } else if (data.startsWith('dept_')) {
        const deptId = data.replace('dept_', '');
        const text = await getDepartmentStatus(ctx, deptId);
        const deptList = await getDepartmentsList(ctx);
        if (deptList.keyboard) {
          await editMessageText(chatId, messageId!, text, deptList.keyboard);
        } else {
          await editMessageText(chatId, messageId!, text);
        }
      }

      return { statusCode: 200, body: 'OK' };
    }

    // Handle messages (regular or edited)
    const message = update.message || update.edited_message;
    if (!message) {
      return { statusCode: 200, body: 'OK' };
    }

    const text = message.text || '';
    const username = message.from.username || null;
    const fullName = `${message.from.first_name || ''} ${message.from.last_name || ''}`.trim() || null;

    // Check access
    const ctx = await getUserContext(telegramId, chatId);
    if (!ctx) {
      // If user sends /start, show chat_id for admin to add
      const command = text.split(' ')[0].toLowerCase();
      if (command === '/start') {
        await sendTelegramMessage(
          chatId,
          `❌ Доступ запрещён. Обратитесь к администратору.\n\nВаш chat_id: <code>${chatId}</code>\nПередайте этот ID администратору для добавления в whitelist.`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `❌ Доступ запрещён. Обратитесь к администратору.\n\nВаш chat_id: <code>${chatId}</code>`
        );
      }
      return { statusCode: 200, body: 'OK' };
    }

    const command = text.split(' ')[0].toLowerCase();
    const args = text.split(' ').slice(1).join(' ');

    if (command === '/start' || command === '/help') {
      const menu = createMainMenu();
      await sendTelegramMessage(
        chatId,
        '📋 <b>Добро пожаловать!</b>\n\nВыберите действие:',
        menu
      );
    } else if (command === '/id') {
      await sendTelegramMessage(
        chatId,
        `🆔 <b>Ваш Telegram ID:</b>\n<code>${telegramId}</code>\n\nПередайте этот ID администратору для добавления в whitelist.`
      );
    } else if (command === '/now' || text === '🏢 Сейчас в здании') {
      const responseText = await getInBuilding(ctx);
      const menu = createMainMenu();
      await sendTelegramMessage(chatId, responseText, menu);
    } else if (command === '/out' || text === '🚶 Вне здания') {
      const responseText = await getOutside(ctx);
      const menu = createMainMenu();
      await sendTelegramMessage(chatId, responseText, menu);
    } else if (command === '/dept' || text === '🏬 По отделу') {
      const deptList = await getDepartmentsList(ctx);
      if (deptList.keyboard) {
        await sendTelegramMessage(chatId, deptList.text, deptList.keyboard);
      } else {
        await sendTelegramMessage(chatId, deptList.text);
      }
    } else if (command === '/employee' || text === '🔎 По сотруднику') {
      if (args) {
        const responseText = await searchEmployee(ctx, args);
        const menu = createMainMenu();
        await sendTelegramMessage(chatId, responseText, menu);
      } else {
        await sendTelegramMessage(
          chatId,
          '🔎 <b>Поиск по сотруднику</b>\n\nВведите ФИО или часть имени:'
        );
      }
    } else if (text.trim().length >= 2) {
      // If it's not a command, treat as employee search
      const responseText = await searchEmployee(ctx, text);
      const menu = createMainMenu();
      await sendTelegramMessage(chatId, responseText, menu);
    } else {
      const menu = createMainMenu();
      await sendTelegramMessage(
        chatId,
        '❌ Неизвестная команда. Используйте меню или /help',
        menu
      );
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
