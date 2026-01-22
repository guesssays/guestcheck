import type { Handler } from '@netlify/functions';
import { getAuthUser, errorResponse } from './_shared/supabase';
import { supabase } from './_shared/supabase';
// @ts-ignore
import * as XLSX from 'xlsx';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await getAuthUser(event as any);
  if (!auth) {
    return errorResponse('Unauthorized', 401);
  }

  const { profile } = auth;

  if (profile?.role !== 'admin' && !profile?.can_export_reports) {
    return errorResponse('Forbidden', 403);
  }

  const url = new URL(event.rawUrl || `https://example.com${event.path}`);
  const type = url.searchParams.get('type'); // 'day', 'month', 'period'
  const date = url.searchParams.get('date');
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const departmentId = url.searchParams.get('department_id');

  let start: string;
  let end: string;

  if (type === 'day' && date) {
    start = date;
    end = date;
  } else if (type === 'month' && date) {
    const d = new Date(date);
    start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  } else if (type === 'period' && startDate && endDate) {
    start = startDate;
    end = endDate;
    // Check 90 days limit
    const daysDiff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 90) {
      return errorResponse('Period cannot exceed 90 days', 400);
    }
  } else {
    return errorResponse('Invalid parameters', 400);
  }

  // Fetch staff attendance
  let staffQuery = supabase
    .from('staff_attendance_events')
    .select('*, employees(*, departments(name))')
    .gte('date', start)
    .lte('date', end)
    .order('date')
    .order('check_in_at');

  if (departmentId) {
    staffQuery = staffQuery.eq('employees.department_id', departmentId);
  }

  const { data: staffData } = await staffQuery;

  // Fetch guest visits
  let guestQuery = supabase
    .from('guest_visits')
    .select('*, departments(name), employees(last_name, first_name, middle_name)')
    .gte('planned_date', start)
    .lte('planned_date', end)
    .order('planned_date')
    .order('planned_time');

  if (departmentId) {
    guestQuery = guestQuery.eq('department_id', departmentId);
  }

  const { data: guestData } = await guestQuery;

  // Prepare staff sheet
  const staffRows = (staffData || []).map((row: any) => ({
    'Дата': row.date,
    'Фамилия': row.employees?.last_name || '',
    'Имя': row.employees?.first_name || '',
    'Отчество': row.employees?.middle_name || '',
    'Отдел': row.employees?.departments?.name || '',
    'Вход': row.check_in_at ? new Date(row.check_in_at).toLocaleString('ru-RU') : '',
    'Выход': row.check_out_at ? new Date(row.check_out_at).toLocaleString('ru-RU') : '',
    'Статус': row.status === 'in_building' ? 'В здании' : 'Вне здания',
  }));

  // Prepare guests sheet
  const guestRows = (guestData || []).map((row: any) => ({
    'Дата': row.planned_date || '',
    'Время': row.planned_time || '',
    'ФИО гостя': row.guest_full_name,
    'Отдел': row.departments?.name || '',
    'Сотрудник': `${row.employees?.last_name || ''} ${row.employees?.first_name || ''} ${row.employees?.middle_name || ''}`.trim(),
    'Документ': row.doc_number || '',
    'Вход': row.check_in_at ? new Date(row.check_in_at).toLocaleString('ru-RU') : '',
    'Выход': row.check_out_at ? new Date(row.check_out_at).toLocaleString('ru-RU') : '',
    'Статус': row.status === 'expected' ? 'Ожидается' : row.status === 'in_building' ? 'В здании' : 'Вне здания',
    'Комментарий': row.comment || '',
  }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  const staffWs = XLSX.utils.json_to_sheet(staffRows);
  const guestWs = XLSX.utils.json_to_sheet(guestRows);

  XLSX.utils.book_append_sheet(wb, staffWs, 'Сотрудники');
  XLSX.utils.book_append_sheet(wb, guestWs, 'Гости');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="attendance-report-${start}-${end}.xlsx"`,
    },
    body: buffer.toString('base64'),
    isBase64Encoded: true,
  };
};
