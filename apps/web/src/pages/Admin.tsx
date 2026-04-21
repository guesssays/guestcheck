import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { Save, RotateCcw, User, MessageSquare, Plus, Trash2, Search } from 'lucide-react';
import { PERMISSION_GROUPS, getPermissionsByGroup, ROLE_PRESETS } from '@/lib/permissions';

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
    </>
  );
}

function TelegramWhitelistTab() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    chat_id: '',
    username: '',
    full_name: '',
    note: '',
  });
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: whitelistData, isLoading } = useQuery({
    queryKey: ['telegramWhitelist', search],
    queryFn: () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      return api.get(`/telegram-whitelist${params}`);
    },
  });

  const whitelist = Array.isArray(whitelistData) ? whitelistData : [];

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/telegram-whitelist', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegramWhitelist'] });
      setShowAddModal(false);
      setFormData({ chat_id: '', username: '', full_name: '', note: '' });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message || 'Ошибка при добавлении');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (chatId: string) => api.delete(`/telegram-whitelist?chat_id=${chatId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegramWhitelist'] });
    },
  });

  const handleAdd = () => {
    const rawChat = formData.chat_id.trim();
    if (!rawChat) {
      setError('Chat ID обязателен');
      return;
    }
    if (!/^-?\d+$/.test(rawChat)) {
      setError('Chat ID должен быть целым числом');
      return;
    }

    setError(null);
    addMutation.mutate({
      chat_id: rawChat,
      username: formData.username.trim() || undefined,
      full_name: formData.full_name.trim() || undefined,
      note: formData.note.trim() || undefined,
    });
  };

  const handleDelete = (chatId: string | number) => {
    const chatIdStr = String(chatId);
    if (confirm(`Удалить запись с chat_id ${chatIdStr} из whitelist?`)) {
      deleteMutation.mutate(chatIdStr);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Telegram Whitelist</h2>
          <p className="text-sm text-gray-600">
            Управление доступом к Telegram-боту. Пользователи должны отправить /start боту, чтобы узнать свой chat_id.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по chat_id, username или full_name..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12">Загрузка...</div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chat ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {whitelist.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                      {search ? 'Ничего не найдено' : 'Нет записей в whitelist'}
                    </td>
                  </tr>
                ) : (
                  whitelist.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {String(item.chat_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.username || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.full_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.note || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.added_by_email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDelete(String(item.chat_id))}
                          className="text-red-600 hover:text-red-900"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-4">Добавить в whitelist</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chat ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.chat_id}
                  onChange={(e) => setFormData({ ...formData, chat_id: e.target.value })}
                  placeholder="123456789"
                  className="w-full rounded-md border-gray-300 shadow-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Пользователь может узнать свой chat_id, отправив /start боту
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="@username"
                  className="w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Имя Фамилия"
                  className="w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Заметка (опционально)"
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ chat_id: '', username: '', full_name: '', note: '' });
                  setError(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleAdd}
                disabled={!formData.chat_id.trim() || addMutation.isPending}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                {addMutation.isPending ? 'Добавление...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
