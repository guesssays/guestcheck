import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from '@/lib/auth';
import { User } from '@/types';
import { hasPermission } from '@/lib/auth';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
}

export default function Layout({ children, user }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const profile = user.profile;
  const isAdmin = profile?.role === 'admin';

  const navItems = [
    { path: '/', label: 'Главная', show: true },
    { path: '/online', label: 'Онлайн статусы', show: hasPermission(profile, 'can_view_online') },
    { path: '/journal', label: 'Журнал', show: hasPermission(profile, 'can_view_journal') },
    { path: '/reports', label: 'Отчёты', show: hasPermission(profile, 'can_view_reports') },
    { path: '/employees', label: 'Сотрудники', show: hasPermission(profile, 'can_view_employee_cards') },
    { path: '/departments', label: 'Отделы', show: hasPermission(profile, 'can_manage_departments') },
    { path: '/guests', label: 'Гости', show: hasPermission(profile, 'can_view_guest_cards') },
    { path: '/admin', label: 'Админка', show: isAdmin },
  ].filter((item) => item.show);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Office Attendance</h1>
              </div>
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location.pathname === item.path
                        ? 'border-primary-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4 hidden md:block">
                {profile?.display_name || user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Выход</span>
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden ml-2 p-2"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    location.pathname === item.path
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
