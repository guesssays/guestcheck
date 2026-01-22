import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { X, Search, UserCheck, UserX } from 'lucide-react';

interface AttendanceRegisterProps {
  mode: 'in' | 'out';
  onClose: () => void;
}

export default function AttendanceRegister({ mode, onClose }: AttendanceRegisterProps) {
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn: () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      return api.get(`/employees${params}`);
    },
    enabled: search.length >= 2 || search.length === 0,
  });

  const employees = Array.isArray(employeesData) ? employeesData : [];
  const selectedEmployee = employees.find((emp: any) => emp.id === selectedEmployeeId);

  const queryClient = useQueryClient();

  const checkInMutation = useMutation({
    mutationFn: ({ employeeId, allowRecheckin }: { employeeId: string; allowRecheckin: boolean }) =>
      api.post('/attendance-check-in', { employee_id: employeeId, allow_recheckin: allowRecheckin }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onlineStatus'] });
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      showToast('Вход зарегистрирован', 'success');
      onClose();
    },
    onError: (error: any) => {
      const message = error?.message || 'Ошибка при регистрации';
      if (message.includes('already checked in') || message.includes('Allow recheckin')) {
        if (confirm('Сотрудник уже зарегистрирован. Разрешить повторный вход?')) {
          checkInMutation.mutate({ employeeId: selectedEmployeeId!, allowRecheckin: true });
        }
      } else {
        showToast(message, 'error');
      }
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (employeeId: string) =>
      api.post('/attendance-check-out', { employee_id: employeeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onlineStatus'] });
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      showToast('Уход зарегистрирован', 'success');
      onClose();
    },
    onError: (error: any) => {
      showToast(error?.message || 'Ошибка при регистрации ухода', 'error');
    },
  });

  const handleSubmit = () => {
    if (!selectedEmployeeId) {
      showToast('Выберите сотрудника', 'error');
      return;
    }

    if (mode === 'in') {
      checkInMutation.mutate({ employeeId: selectedEmployeeId, allowRecheckin: false });
    } else {
      checkOutMutation.mutate(selectedEmployeeId);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-lg ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">
            {mode === 'in' ? 'Регистрация входа' : 'Регистрация ухода'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Поиск сотрудника
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Введите ФИО или табельный номер"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {search.length >= 2 && (
            <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
              {employeesLoading ? (
                <div className="p-4 text-center text-gray-500">Поиск...</div>
              ) : employees.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Сотрудники не найдены</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {employees.map((emp: any) => {
                    const name = `${emp.last_name} ${emp.first_name} ${emp.middle_name || ''}`.trim();
                    const isSelected = selectedEmployeeId === emp.id;
                    return (
                      <li
                        key={emp.id}
                        onClick={() => setSelectedEmployeeId(emp.id)}
                        className={`p-3 cursor-pointer hover:bg-gray-50 ${
                          isSelected ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{name}</p>
                            <p className="text-xs text-gray-500">
                              {emp.departments?.name || 'Без отдела'} {emp.tab_number ? `• ${emp.tab_number}` : ''}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="text-primary-600">
                              {mode === 'in' ? <UserCheck className="h-5 w-5" /> : <UserX className="h-5 w-5" />}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {selectedEmployee && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm font-medium text-gray-900 mb-1">Выбранный сотрудник:</p>
              <p className="text-sm text-gray-700">
                {selectedEmployee.last_name} {selectedEmployee.first_name} {selectedEmployee.middle_name || ''}
              </p>
              {selectedEmployee.departments?.name && (
                <p className="text-xs text-gray-500 mt-1">Отдел: {selectedEmployee.departments.name}</p>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedEmployeeId || checkInMutation.isPending || checkOutMutation.isPending}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                mode === 'in'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {checkInMutation.isPending || checkOutMutation.isPending ? (
                'Обработка...'
              ) : mode === 'in' ? (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Подтвердить вход
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Подтвердить уход
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
