import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { hasPermission } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';
import { Plus, Edit, Trash2, Phone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const employeeSchema = z.object({
  last_name: z.string().min(1, 'Обязательно'),
  first_name: z.string().min(1, 'Обязательно'),
  middle_name: z.string().optional(),
  department_id: z.string().optional(),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  position: z.string().optional(),
  note: z.string().optional(),
  tab_number: z.string().optional(),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

export default function Employees() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });
  const profile = user?.profile;

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: deptsResponse } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments'),
  });

  const departments = deptsResponse?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search, selectedDept],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedDept) params.append('department_id', selectedDept);
      return api.get(`/employees?${params.toString()}`);
    },
  });

  const employees = data?.data || [];
  const queryClient = useQueryClient();
  const canManage = hasPermission(profile, 'can_manage_employees');
  const canSeePhones = hasPermission(profile, 'can_see_phones');

  const createMutation = useMutation({
    mutationFn: (data: EmployeeForm) => api.post('/employees', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: EmployeeForm & { id: string }) =>
      api.put('/employees', { id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete('/employees', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
  });

  const onSubmit = (data: EmployeeForm) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
    reset();
  };

  const handleEdit = (emp: any) => {
    setEditingId(emp.id);
    reset({
      last_name: emp.last_name,
      first_name: emp.first_name,
      middle_name: emp.middle_name,
      department_id: emp.department_id,
      phone1: emp.phone1,
      phone2: emp.phone2,
      position: emp.position,
      note: emp.note,
      tab_number: emp.tab_number,
    });
    setShowForm(true);
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Сотрудники</h1>
          <p className="mt-1 text-sm text-gray-600">Справочник сотрудников</p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditingId(null);
              reset();
              setShowForm(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по ФИО или табельному номеру"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="">Все отделы</option>
              {departments.map((dept: any) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && canManage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-4">
              {editingId ? 'Редактировать' : 'Добавить'} сотрудника
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Фамилия *</label>
                <input {...register('last_name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                {errors.last_name && <p className="text-red-600 text-xs">{errors.last_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Имя *</label>
                <input {...register('first_name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                {errors.first_name && <p className="text-red-600 text-xs">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Отчество</label>
                <input {...register('middle_name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Отдел</label>
                <select {...register('department_id')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                  <option value="">Выберите отдел</option>
                  {departments.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Телефон 1</label>
                <input {...register('phone1')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Телефон 2</label>
                <input {...register('phone2')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Должность</label>
                <input {...register('position')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Табельный номер</label>
                <input {...register('tab_number')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Примечание</label>
                <textarea {...register('note')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    reset();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ФИО</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Отдел</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Должность</th>
                {canSeePhones && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефоны</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Табельный</th>
                {canManage && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-6 py-4 text-center">
                    Загрузка...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-6 py-4 text-center">
                    Нет данных
                  </td>
                </tr>
              ) : (
                employees.map((emp: any) => {
                  const name = `${emp.last_name} ${emp.first_name} ${emp.middle_name || ''}`.trim();
                  return (
                    <tr key={emp.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {emp.departments?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.position || '-'}</td>
                      {canSeePhones && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(emp.phone1 || emp.phone2) && (
                            <span className="flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              {emp.phone1 || ''} {emp.phone2 ? `, ${emp.phone2}` : ''}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.tab_number || '-'}</td>
                      {canManage && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(emp)}
                            className="text-primary-600 hover:text-primary-900 mr-3"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Удалить сотрудника?')) {
                                deleteMutation.mutate(emp.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
