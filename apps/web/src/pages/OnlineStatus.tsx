import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { hasPermission } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function OnlineStatus() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });
  const profile = user?.profile;

  const [selectedDept, setSelectedDept] = useState<string>('');

  const { data: deptsResponse } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments'),
  });

  const departments = Array.isArray(deptsResponse?.data) ? deptsResponse.data : [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['onlineStatus', selectedDept],
    queryFn: () => {
      const params = selectedDept ? `?department_id=${selectedDept}` : '';
      return api.get(`/online-status${params}`);
    },
    enabled: hasPermission(profile, 'can_view_online'),
    refetchInterval: 30000,
  });

  const queryClient = useQueryClient();

  const checkInMutation = useMutation({
    mutationFn: (employeeId: string) =>
      api.post('/attendance-check-in', { employee_id: employeeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onlineStatus'] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (employeeId: string) =>
      api.post('/attendance-check-out', { employee_id: employeeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onlineStatus'] });
    },
  });

  const canRegister = hasPermission(profile, 'can_register_attendance');
  const canSeePhones = hasPermission(profile, 'can_see_phones');

  const onlineData = data?.data as { in_building?: any[]; outside?: any[] } | undefined;
  const inBuilding = Array.isArray(onlineData?.in_building) ? onlineData.in_building : [];
  const outside = Array.isArray(onlineData?.outside) ? onlineData.outside : [];

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Онлайн статусы</h1>
          <p className="mt-1 text-sm text-gray-600">Текущее состояние по отделам</p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </button>
      </div>

      {departments.length > 0 && (
        <div className="mb-4">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">Все отделы</option>
            {departments.map((dept: any) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* In Building */}
        <div>
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                В здании ({inBuilding.length})
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {isLoading ? (
                <div className="text-center py-4">Загрузка...</div>
              ) : inBuilding.length === 0 ? (
                <div className="text-center py-4 text-gray-500">Нет данных</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {inBuilding.map((item: any) => {
                    const emp = item.employees;
                    const name = `${emp?.last_name || ''} ${emp?.first_name || ''} ${emp?.middle_name || ''}`.trim();
                    const dept = emp?.departments?.name || '';
                    const time = item.check_in_at
                      ? new Date(item.check_in_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                    return (
                      <li key={item.id} className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{name}</p>
                            <p className="text-sm text-gray-500">{dept}</p>
                            <p className="text-xs text-gray-400">Вход: {time}</p>
                            {canSeePhones && (emp?.phone1 || emp?.phone2) && (
                              <p className="text-xs text-gray-400">
                                📞 {emp.phone1 || ''} {emp.phone2 || ''}
                              </p>
                            )}
                          </div>
                          {canRegister && (
                            <button
                              onClick={() => checkOutMutation.mutate(item.employee_id)}
                              disabled={checkOutMutation.isPending}
                              className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none disabled:opacity-50"
                            >
                              Выход
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Outside */}
        <div>
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <XCircle className="h-5 w-5 text-gray-400 mr-2" />
                Вне здания ({outside.length})
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {isLoading ? (
                <div className="text-center py-4">Загрузка...</div>
              ) : outside.length === 0 ? (
                <div className="text-center py-4 text-gray-500">Нет данных</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {outside.map((item: any) => {
                    const emp = item.employees;
                    const name = `${emp?.last_name || ''} ${emp?.first_name || ''} ${emp?.middle_name || ''}`.trim();
                    const dept = emp?.departments?.name || '';
                    const outTime = item.check_out_at
                      ? new Date(item.check_out_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                    return (
                      <li key={item.id} className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{name}</p>
                            <p className="text-sm text-gray-500">{dept}</p>
                            <p className="text-xs text-gray-400">Выход: {outTime}</p>
                            {canSeePhones && (emp?.phone1 || emp?.phone2) && (
                              <p className="text-xs text-gray-400">
                                📞 {emp.phone1 || ''} {emp.phone2 || ''}
                              </p>
                            )}
                          </div>
                          {canRegister && (
                            <button
                              onClick={() => {
                                if (confirm('Подтвердить повторный вход?')) {
                                  checkInMutation.mutate(item.employee_id);
                                }
                              }}
                              disabled={checkInMutation.isPending}
                              className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:opacity-50"
                            >
                              Вход
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
