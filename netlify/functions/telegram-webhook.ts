import type { Handler } from '@netlify/functions';
import { supabase } from './_shared/supabase';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const update = JSON.parse(event.body || '{}');

    if (!update.message) {
      return { statusCode: 200, body: 'OK' };
    }

    const chatId = update.message.chat.id;
    const text = update.message.text || '';
    const telegramId = update.message.from.id;

    // Check whitelist
    const { data: whitelist } = await supabase
      .from('telegram_whitelist')
      .select('user_id, is_active')
      .eq('telegram_id', telegramId)
      .eq('is_active', true)
      .single();

    if (!whitelist) {
      await sendTelegramMessage(chatId, '❌ Доступ запрещен. Ваш Telegram ID не в whitelist.');
      return { statusCode: 200, body: 'OK' };
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, user_allowed_departments(department_id)')
      .eq('user_id', whitelist.user_id)
      .single();

    if (!profile) {
      await sendTelegramMessage(chatId, '❌ Профиль не найден.');
      return { statusCode: 200, body: 'OK' };
    }

    const command = text.split(' ')[0].toLowerCase();
    const args = text.split(' ').slice(1);

    if (command === '/start' || command === '/help') {
      const helpText = `
📋 <b>Доступные команды:</b>

/now - Сейчас в здании
/out - Вне здания
/dept [название] - По отделу
/employee [ФИО] - По сотруднику
      `;
      await sendTelegramMessage(chatId, helpText);
    } else if (command === '/now') {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('staff_attendance_events')
        .select('*, employees(*, departments(name))')
        .eq('date', today)
        .eq('status', 'in_building')
        .order('check_in_at', { ascending: false });

      if (!data || data.length === 0) {
        await sendTelegramMessage(chatId, '👥 Сейчас в здании: 0 человек');
      } else {
        const list = data
          .map((row: any) => {
            const emp = row.employees;
            const name = `${emp?.last_name || ''} ${emp?.first_name || ''} ${emp?.middle_name || ''}`.trim();
            const dept = emp?.departments?.name || '';
            const time = row.check_in_at ? new Date(row.check_in_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
            return `• ${name} (${dept}) - с ${time}`;
          })
          .join('\n');
        await sendTelegramMessage(chatId, `👥 <b>Сейчас в здании:</b>\n\n${list}`);
      }
    } else if (command === '/out') {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('staff_attendance_events')
        .select('*, employees(*, departments(name))')
        .eq('date', today)
        .eq('status', 'outside')
        .not('check_out_at', 'is', null)
        .order('check_out_at', { ascending: false })
        .limit(20);

      if (!data || data.length === 0) {
        await sendTelegramMessage(chatId, '🚪 Сегодня вышли: нет данных');
      } else {
        const list = data
          .map((row: any) => {
            const emp = row.employees;
            const name = `${emp?.last_name || ''} ${emp?.first_name || ''} ${emp?.middle_name || ''}`.trim();
            const dept = emp?.departments?.name || '';
            const time = row.check_out_at ? new Date(row.check_out_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
            return `• ${name} (${dept}) - ${time}`;
          })
          .join('\n');
        await sendTelegramMessage(chatId, `🚪 <b>Сегодня вышли:</b>\n\n${list}`);
      }
    } else if (command === '/dept') {
      const deptName = args.join(' ');
      if (!deptName) {
        await sendTelegramMessage(chatId, '❌ Укажите название отдела');
        return { statusCode: 200, body: 'OK' };
      }

      const { data: dept } = await supabase
        .from('departments')
        .select('id')
        .ilike('name', `%${deptName}%`)
        .single();

      if (!dept) {
        await sendTelegramMessage(chatId, '❌ Отдел не найден');
        return { statusCode: 200, body: 'OK' };
      }

      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('staff_attendance_events')
        .select('*, employees(*, departments(name))')
        .eq('date', today)
        .eq('employees.department_id', dept.id)
        .order('check_in_at', { ascending: false });

      if (!data || data.length === 0) {
        await sendTelegramMessage(chatId, `👥 Отдел "${deptName}": нет данных`);
      } else {
        const inBuilding = data.filter((r: any) => r.status === 'in_building');
        const outside = data.filter((r: any) => r.status === 'outside');
        const list = inBuilding
          .map((row: any) => {
            const emp = row.employees;
            const name = `${emp?.last_name || ''} ${emp?.first_name || ''}`.trim();
            const time = row.check_in_at ? new Date(row.check_in_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
            return `• ${name} - с ${time}`;
          })
          .join('\n');
        await sendTelegramMessage(chatId, `👥 <b>Отдел "${deptName}":</b>\n\nВ здании (${inBuilding.length}):\n${list || 'нет'}\n\nВне здания: ${outside.length}`);
      }
    } else if (command === '/employee') {
      const searchName = args.join(' ');
      if (!searchName) {
        await sendTelegramMessage(chatId, '❌ Укажите ФИО сотрудника');
        return { statusCode: 200, body: 'OK' };
      }

      const { data: employees } = await supabase
        .from('employees')
        .select('id, last_name, first_name, middle_name, phone1, phone2, departments(name)')
        .or(`last_name.ilike.%${searchName}%,first_name.ilike.%${searchName}%`)
        .limit(5);

      if (!employees || employees.length === 0) {
        await sendTelegramMessage(chatId, '❌ Сотрудник не найден');
        return { statusCode: 200, body: 'OK' };
      }

      const today = new Date().toISOString().split('T')[0];
      const emp = employees[0];
      const { data: attendance } = await supabase
        .from('staff_attendance_events')
        .select('*')
        .eq('employee_id', emp.id)
        .eq('date', today)
        .single();

      const name = `${emp.last_name} ${emp.first_name} ${emp.middle_name || ''}`.trim();
      const dept = (emp as any).departments?.name || '';
      let statusText = '❌ Нет данных';
      if (attendance) {
        if (attendance.status === 'in_building') {
          const time = attendance.check_in_at ? new Date(attendance.check_in_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
          statusText = `✅ В здании с ${time}`;
        } else {
          const outTime = attendance.check_out_at ? new Date(attendance.check_out_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
          statusText = `🚪 Вне здания (выход: ${outTime})`;
        }
      }

      let phoneText = '';
      if (profile.can_see_phones && (emp.phone1 || emp.phone2)) {
        phoneText = `\n📞 ${emp.phone1 || ''} ${emp.phone2 || ''}`.trim();
      }

      await sendTelegramMessage(chatId, `👤 <b>${name}</b>\n${dept}\n${statusText}${phoneText}`);
    } else {
      await sendTelegramMessage(chatId, '❌ Неизвестная команда. Используйте /help');
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
