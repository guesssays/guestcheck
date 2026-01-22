import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { hasPermission } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';
import { Plus, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

const guestSchema = z.object({
  guest_full_name: z.string().min(1, 'Обязательно'),
  department_id: z.string().optional(),
  employee_id: z.string().optional(),
  planned_date: z.string().optional(),
  planned_time: z.string().optional(),
  comment: z.string().optional(),
  doc_number: z.string().optional(),
});

type GuestForm = z.infer<typeof guestSchema>;

export default function Guests() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });
  const profile = user?.profile;

  const [tab, setTab] = useState<'expected' | 'all'>('expected');
  const [showForm, setShowForm] = useState(false);

  const canRegister = hasPermission(profile, 'can_register_guests');
  const canEdit = hasPermission(profile, 'can_edit_guests');
  const canConfirm = hasPermission(profile, 'can_confirm_guests');

  const { data: deptsResponse } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments'),
  });

  const { data: employeesResponse } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees'),
  });

  const departments = Array.isArray(deptsResponse?.data) ? deptsResponse.data : [];
  const employees = Array.isArray(employeesResponse?.data) ? employeesResponse.data : [];

  const { data: expectedData } = useQuery({
    queryKey: ['guestsExpected'],
    queryFn: () => api.get('/guests-expected'),
    enabled: canConfirm || canEdit,
  });

  const { data: allData } = useQuery({
    queryKey: ['guestsAll'],
    queryFn: () => api.get('/journal?type=guests'),
    enabled: tab === 'all',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: GuestForm) => api.post('/guests-pre-register', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guestsExpected'] });
      queryClient.invalidateQueries({ queryKey: ['guestsAll'] });
      setShowForm(false);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => api.post('/guests-confirm-in', { guest_visit_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guestsExpected'] });
      queryClient.invalidateQueries({ queryKey: ['guestsAll'] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => api.post('/guests-check-out', { guest_visit_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guestsExpected'] });
      queryClient.invalidateQueries({ queryKey: ['guestsAll'] });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<GuestForm>({
    resolver: zodResolver(guestSchema),
  });

  const onSubmit = (data: GuestForm) => {
    createMutation.mutate(data);
    reset();
  };

  const expectedGuests = Array.isArray(expectedData?.data) ? expectedData.data : [];
  const allGuests = Array.isArray(allData?.data) ? allData.data : [];

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Гости</h1>
          <p className="mt-1 text-sm text-gray-600">Управление гостями</p>
        </div>
        {canRegister && (
          <button
            onClick={() => {
              reset();
              setShowForm(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Предварительная регистрация
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {canConfirm && (
            <button
              onClick={() => setTab('expected')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                tab === 'expected'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ожидаемые ({expectedGuests.length})
            </button>
          )}
          <button
            onClick={() => setTab('all')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              tab === 'all'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Все гости
          </button>
        </nav>
      </div>

      {/* Form Modal */}
      {showForm && canRegister && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-4">Предварительная регистрация гостя</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ФИО гостя *</label>
                <input {...register('guest_full_name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                {errors.guest_full_name && <p className="text-red-600 text-xs">{errors.guest_full_name.message}</p>}
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
                <label className="block text-sm font-medium text-gray-700">Сотрудник</label>
                <select {...register('employee_id')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                  <option value="">Выберите сотрудника</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.last_name} {emp.first_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Планируемая дата</label>
                <input type="date" {...register('planned_date')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Планируемое время</label>
                <input type="time" {...register('planned_time')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Документ</label>
                <input {...register('doc_number')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Комментарий</label>
                <textarea {...register('comment')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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

      {/* Expected Guests */}
      {tab === 'expected' && canConfirm && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            {expectedGuests.length === 0 ? (
              <div className="text-center py-4 text-gray-500">Нет ожидаемых гостей</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {expectedGuests.map((guest: any) => (
                  <li key={guest.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{guest.guest_full_name}</p>
                        <p className="text-sm text-gray-500">
                          {guest.departments?.name || ''} {guest.planned_date ? `- ${format(new Date(guest.planned_date), 'dd.MM.yyyy')}` : ''}
                          {guest.planned_time ? ` ${guest.planned_time}` : ''}
                        </p>
                        {guest.comment && <p className="text-xs text-gray-400">{guest.comment}</p>}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => confirmMutation.mutate(guest.id)}
                          disabled={confirmMutation.isPending}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Подтвердить вход
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* All Guests */}
      {tab === 'all' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Гость</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Отдел</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Вход</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Выход</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  {canRegister && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allGuests.length === 0 ? (
                  <tr>
                    <td colSpan={canRegister ? 7 : 6} className="px-6 py-4 text-center">
                      Нет данных
                    </td>
                  </tr>
                ) : (
                  allGuests.map((guest: any) => (
                    <tr key={guest.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {guest.planned_date ? format(new Date(guest.planned_date), 'dd.MM.yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {guest.guest_full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {guest.departments?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {guest.check_in_at ? format(new Date(guest.check_in_at), 'HH:mm') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {guest.check_out_at ? format(new Date(guest.check_out_at), 'HH:mm') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            guest.status === 'in_building'
                              ? 'bg-green-100 text-green-800'
                              : guest.status === 'expected'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {guest.status === 'expected'
                            ? 'Ожидается'
                            : guest.status === 'in_building'
                            ? 'В здании'
                            : 'Вне здания'}
                        </span>
                      </td>
                      {canRegister && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {guest.status === 'in_building' && (
                            <button
                              onClick={() => checkOutMutation.mutate(guest.id)}
                              disabled={checkOutMutation.isPending}
                              className="text-red-600 hover:text-red-900"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
