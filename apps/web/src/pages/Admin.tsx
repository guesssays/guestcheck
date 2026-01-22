import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { Save, RotateCcw, User, Plus, Trash2, Edit, MessageSquare } from 'lucide-react';
import { PERMISSIONS, PERMISSION_GROUPS, getPermissionsByGroup, ROLE_PRESETS } from '@/lib/permissions';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'users' | 'telegram'>('users');
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

  const users = Array.isArray(usersData) ? usersData : [];
  const departments = Array.isArray(deptsData) ? deptsData : [];
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

  const applyRolePreset = (role: string) => {
    const preset = ROLE_PRESETS[role];
    if (!preset) return;

    setUserPermissions((prev: any) => {
      const updated = { ...prev };
      // Apply all permissions from preset
      Object.keys(preset).forEach((key) => {
        updated[key] = preset[key];
      });
      return updated;
    });
  };

  const resetPermissions = () => {
    if (!editingUserId) return;
    const user = users.find((u: any) => u.id === editingUserId);
    if (user) {
      setUserPermissions({
        ...user.profile,
        allowed_department_ids: user.allowed_department_ids || [],
      });
    }
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

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <User className="inline h-4 w-4 mr-2" />
            Пользователи
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={`${
              activeTab === 'telegram'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <MessageSquare className="inline h-4 w-4 mr-2" />
            Telegram
          </button>
        </nav>
      </div>

      {activeTab === 'telegram' ? (
        <TelegramWhitelistTab />
      ) : (
        <UsersTab
          users={users}
          departments={departments}
          isLoading={isLoading}
          editingUserId={editingUserId}
          userPermissions={userPermissions}
          setEditingUserId={setEditingUserId}
          setUserPermissions={setUserPermissions}
          handleEdit={handleEdit}
          handleSave={handleSave}
          togglePermission={togglePermission}
          toggleDepartment={toggleDepartment}
          applyRolePreset={applyRolePreset}
          resetPermissions={resetPermissions}
          updateMutation={updateMutation}
        />
      )}
    </div>
  );
}

function UsersTab({
  users,
  departments,
  isLoading,
  editingUserId,
  userPermissions,
  setEditingUserId,
  setUserPermissions,
  handleEdit,
  handleSave,
  togglePermission,
  toggleDepartment,
  applyRolePreset,
  resetPermissions,
  updateMutation,
}: any) {
  return (
    <>

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
          <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Права пользователя</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{users.find((u: any) => u.id === editingUserId)?.email}</span>
              </div>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Роль</label>
                <div className="flex items-center space-x-2">
                  <select
                    value={userPermissions.role || ''}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setUserPermissions({ ...userPermissions, role: newRole });
                      // Auto-apply preset if exists
                      if (ROLE_PRESETS[newRole]) {
                        setTimeout(() => applyRolePreset(newRole), 100);
                      }
                    }}
                    className="flex-1 rounded-md border-gray-300 shadow-sm"
                  >
                    <option value="admin">Админ</option>
                    <option value="security">Охрана/Ресепшен</option>
                    <option value="secretary">Секретарь</option>
                    <option value="manager">Руководитель отдела</option>
                    <option value="top_manager">Топ-менеджмент</option>
                    <option value="general">Генеральный доступ</option>
                  </select>
                  <button
                    onClick={() => applyRolePreset(userPermissions.role || '')}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    title="Применить шаблон роли"
                  >
                    Применить шаблон
                  </button>
                  <button
                    onClick={resetPermissions}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    title="Сбросить изменения"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Permissions by Groups */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Права доступа</label>
                <div className="space-y-6">
                  {PERMISSION_GROUPS.map((group) => {
                    const groupPermissions = getPermissionsByGroup(group);
                    return (
                      <div key={group} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">{group}</h4>
                        <div className="space-y-3">
                          {groupPermissions.map((perm) => (
                            <div key={perm.key} className="flex items-start">
                              <div className="flex items-center h-5">
                                <input
                                  type="checkbox"
                                  checked={userPermissions[perm.key] || false}
                                  onChange={() => togglePermission(perm.key)}
                                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                />
                              </div>
                              <div className="ml-3 flex-1">
                                <label className="text-sm font-medium text-gray-900 cursor-pointer">
                                  {perm.label}
                                </label>
                                <p className="text-xs text-gray-500 mt-0.5">{perm.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
