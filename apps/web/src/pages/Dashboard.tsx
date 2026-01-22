import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

import { hasPermission } from '@/lib/auth';
import { UserPlus, UserMinus, Users, Clock, Building2 } from 'lucide-react';

export default function Dashboard() {
const { data: userResponse } = useQuery({
  queryKey: ['currentUser'],
  queryFn: () => api.get<{ user: any; profile: any }>('/me'),
});

const profile = userResponse?.profile;


  const { data: onlineData } = useQuery({
    queryKey: ['onlineStatus'],
    queryFn: () => api.get<{ in_building: any[]; outside: any[] }>('/online-status'),
    enabled: hasPermission(profile, 'can_view_online'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const canRegisterAttendance = hasPermission(profile, 'can_register_attendance');
  const canRegisterGuests = hasPermission(profile, 'can_register_guests');
  const canConfirmGuests = hasPermission(profile, 'can_confirm_guests');

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Главная</h1>
        <p className="mt-1 text-sm text-gray-600">Быстрый доступ к основным функциям</p>
      </div>

      {/* Quick Actions */}
      {(canRegisterAttendance || canRegisterGuests) && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {canRegisterAttendance && (
              <>
                <Link
                  to="/online"
                  className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                >
                  <div className="flex-shrink-0">
                    <UserPlus className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="absolute inset-0" aria-hidden="true" />
                    <p className="text-sm font-medium text-gray-900">Регистрация входа</p>
                    <p className="text-sm text-gray-500 truncate">Сотрудник</p>
                  </div>
                </Link>
                <Link
                  to="/online"
                  className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                >
                  <div className="flex-shrink-0">
                    <UserMinus className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="absolute inset-0" aria-hidden="true" />
                    <p className="text-sm font-medium text-gray-900">Регистрация ухода</p>
                    <p className="text-sm text-gray-500 truncate">Сотрудник</p>
                  </div>
                </Link>
              </>
            )}
            {canRegisterGuests && (
              <Link
                to="/guests"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
              >
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Гость: вход</p>
                  <p className="text-sm text-gray-500 truncate">Зарегистрировать</p>
                </div>
              </Link>
            )}
            {canConfirmGuests && (
              <Link
                to="/guests?tab=expected"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
              >
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Ожидаемые гости</p>
                  <p className="text-sm text-gray-500 truncate">Подтвердить</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Online Status Summary */}
      {hasPermission(profile, 'can_view_online') && onlineData && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Онлайн статусы</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">В здании</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {onlineData.in_building?.length || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building2 className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Вне здания</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {onlineData.outside?.length || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <Link
              to="/online"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building2 className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Подробнее</dt>
                      <dd className="text-lg font-medium text-primary-600">→</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
