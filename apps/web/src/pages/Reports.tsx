import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { Download } from 'lucide-react';

export default function Reports() {
  const [reportType, setReportType] = useState<'day' | 'month' | 'period'>('day');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [departmentId, setDepartmentId] = useState('');

  const { data: deptsResponse } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments'),
  });

  const departments = Array.isArray(deptsResponse) ? deptsResponse : [];

  const handleDownload = async () => {
    try {
      const params = new URLSearchParams();
      params.append('type', reportType);
      if (reportType === 'day') {
        params.append('date', date);
      } else if (reportType === 'month') {
        params.append('date', date);
      } else {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      }
      if (departmentId) params.append('department_id', departmentId);

      const response = await fetch(`/api/reports-xlsx?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to download');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${reportType}-${date || startDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Ошибка при скачивании отчёта');
      console.error(error);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Отчёты</h1>
        <p className="mt-1 text-sm text-gray-600">Генерация и экспорт отчётов</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип отчёта</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'day' | 'month' | 'period')}
              className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="day">Дневной</option>
              <option value="month">Месячный</option>
              <option value="period">Произвольный период (до 90 дней)</option>
            </select>
          </div>

          {reportType === 'day' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          )}

          {reportType === 'month' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Месяц</label>
              <input
                type="month"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          )}

          {reportType === 'period' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">С даты</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">По дату</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Отдел (опционально)</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
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

          <div>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Скачать XLSX
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
