import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { Save } from 'lucide-react';

export default function Admin() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  if (user?.profile?.role !== 'admin') {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12">
          <p className="text-gray-500">У вас нет доступа к админке</p>
        </div>
      </div>
    );
  }

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => api.get('/admin-users'),
  });

  const { data: deptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments'),
  });

  const users = Array.isArray(usersData?.data) ? usersData.data : [];
  const departments = Array.isArray(deptsData?.data) ? deptsData.data : [];
  const queryClient = useQueryClient();

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<any>(null);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put('/admin-users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setEditingUserId(null);
      setUserPermissions(null);
    },
  });

  const handleEdit = (u: any) => {
    setEditingUserId(u.id);
    setUserPermissions({
      ...u.profile,
      allowed_department_ids: u.allowed_department_ids || [],
    });
  };

  const handleSave = () => {
    if (!editingUserId || !userPermissions) return;
    updateMutation.mutate({
      user_id: editingUserId,
      profile: userPermissions,
      allowed_department_ids: userPermissions.allowed_department_ids,
    });
  };

  const togglePermission = (key: string) => {
    setUserPermissions((prev: any) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleDepartment = (deptId: string) => {
    setUserPermissions((prev: any) => {
      const depts = prev.allowed_department_ids || [];
      if (depts.includes(deptId)) {
        return { ...prev, allowed_department_ids: depts.filter((id: string) => id !== deptId) };
      } else {
        return { ...prev, allowed_department_ids: [...depts, deptId] };
      }
    });
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Админка</h1>
        <p className="mt-1 text-sm text-gray-600">Управление пользователями и правами</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Загрузка...</div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u: any) => (
                  <tr key={u.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {u.profile?.role || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(u)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Редактировать права
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {editingUserId && userPermissions && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-4">Права пользователя</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Роль</label>
                <select
                  value={userPermissions.role || ''}
                  onChange={(e) =>
                    setUserPermissions({ ...userPermissions, role: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm"
                >
                  <option value="admin">Админ</option>
                  <option value="security">Охрана/Ресепшен</option>
                  <option value="secretary">Секретарь</option>
                  <option value="manager">Руководитель отдела</option>
                  <option value="top_manager">Топ-менеджмент</option>
                  <option value="general">Генеральный доступ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Права</label>
                <div className="space-y-2">
                  {[
                    'can_view_online',
                    'can_view_journal',
                    'can_view_reports',
                    'can_view_employee_cards',
                    'can_view_guest_cards',
                    'can_see_phones',
                    'can_export_reports',
                    'can_register_attendance',
                    'can_register_guests',
                    'can_confirm_guests',
                    'can_edit_guests',
                    'can_manage_departments',
                    'can_manage_employees',
                    'can_manage_users',
                  ].map((perm) => (
                    <label key={perm} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={userPermissions[perm] || false}
                        onChange={() => togglePermission(perm)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Разрешённые отделы</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {departments.map((dept: any) => (
                    <label key={dept.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={userPermissions.allowed_department_ids?.includes(dept.id) || false}
                        onChange={() => toggleDepartment(dept.id)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{dept.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setEditingUserId(null);
                  setUserPermissions(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
