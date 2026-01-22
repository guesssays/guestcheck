export interface PermissionDefinition {
  key: string;
  label: string;
  group: string;
  description: string;
}

export const PERMISSIONS: PermissionDefinition[] = [
  // Просмотр
  {
    key: 'can_view_online',
    label: 'Онлайн статусы',
    group: 'Просмотр',
    description: 'Видеть кто в здании/вне здания в реальном времени',
  },
  {
    key: 'can_view_journal',
    label: 'Журнал посещений',
    group: 'Просмотр',
    description: 'Просматривать историю входов и выходов',
  },
  {
    key: 'can_view_reports',
    label: 'Отчёты',
    group: 'Просмотр',
    description: 'Доступ к просмотру отчётов',
  },
  {
    key: 'can_view_employee_cards',
    label: 'Карточки сотрудников',
    group: 'Просмотр',
    description: 'Просматривать информацию о сотрудниках',
  },
  {
    key: 'can_view_guest_cards',
    label: 'Карточки гостей',
    group: 'Просмотр',
    description: 'Просматривать информацию о гостях',
  },
  {
    key: 'can_see_phones',
    label: 'Видеть телефоны',
    group: 'Просмотр',
    description: 'Отображать контактные телефоны сотрудников',
  },

  // Посещения сотрудников
  {
    key: 'can_register_attendance',
    label: 'Регистрация посещений',
    group: 'Посещения сотрудников',
    description: 'Регистрировать вход и выход сотрудников',
  },

  // Гости
  {
    key: 'can_register_guests',
    label: 'Регистрация гостей',
    group: 'Гости',
    description: 'Создавать записи о гостях',
  },
  {
    key: 'can_confirm_guests',
    label: 'Подтверждение гостей',
    group: 'Гости',
    description: 'Подтверждать приход ожидаемых гостей',
  },
  {
    key: 'can_edit_guests',
    label: 'Редактирование гостей',
    group: 'Гости',
    description: 'Редактировать и переносить визиты гостей',
  },

  // Справочники
  {
    key: 'can_manage_departments',
    label: 'Управление отделами',
    group: 'Справочники',
    description: 'Создавать, редактировать и деактивировать отделы',
  },
  {
    key: 'can_manage_employees',
    label: 'Управление сотрудниками',
    group: 'Справочники',
    description: 'Создавать, редактировать и деактивировать сотрудников',
  },

  // Администрирование
  {
    key: 'can_manage_users',
    label: 'Управление пользователями',
    group: 'Администрирование',
    description: 'Настраивать права доступа пользователей',
  },

  // Отчёты/Экспорт
  {
    key: 'can_export_reports',
    label: 'Экспорт отчётов',
    group: 'Отчёты/Экспорт',
    description: 'Скачивать отчёты в формате XLSX',
  },
];

export const PERMISSION_GROUPS = Array.from(new Set(PERMISSIONS.map((p) => p.group)));

export function getPermissionsByGroup(group: string): PermissionDefinition[] {
  return PERMISSIONS.filter((p) => p.group === group);
}

export function getPermissionDefinition(key: string): PermissionDefinition | undefined {
  return PERMISSIONS.find((p) => p.key === key);
}

// Ролевые шаблоны
export const ROLE_PRESETS: Record<string, Partial<Record<string, boolean>>> = {
  admin: {
    can_view_online: true,
    can_view_journal: true,
    can_view_reports: true,
    can_view_employee_cards: true,
    can_view_guest_cards: true,
    can_see_phones: true,
    can_export_reports: true,
    can_register_attendance: true,
    can_register_guests: true,
    can_confirm_guests: true,
    can_edit_guests: true,
    can_manage_departments: true,
    can_manage_employees: true,
    can_manage_users: true,
  },
  security: {
    can_view_online: true,
    can_view_journal: true,
    can_see_phones: true,
    can_register_attendance: true,
    can_register_guests: true,
    can_confirm_guests: true,
  },
  secretary: {
    can_view_online: true,
    can_view_journal: true,
    can_view_employee_cards: true,
    can_view_guest_cards: true,
    can_register_guests: true,
    can_edit_guests: true,
    can_confirm_guests: true,
  },
  manager: {
    can_view_online: true,
    can_view_journal: true,
    can_view_reports: true,
    can_view_employee_cards: true,
    can_see_phones: true,
    can_export_reports: true,
  },
  top_manager: {
    can_view_online: true,
    can_view_journal: true,
    can_view_reports: true,
    can_view_employee_cards: true,
    can_view_guest_cards: true,
    can_see_phones: true,
    can_export_reports: true,
  },
  general: {
    can_view_online: true,
    can_view_journal: true,
    can_view_reports: true,
    can_view_employee_cards: true,
    can_view_guest_cards: true,
    can_see_phones: true,
    can_export_reports: true,
  },
};
