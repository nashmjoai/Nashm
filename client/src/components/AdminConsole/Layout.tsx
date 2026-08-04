import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users as UsersIcon,
  Sliders,
  Ticket,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  ShieldPlus,
  Menu,
  X,
  RefreshCw,
  ToggleRight,
  TriangleAlert,
} from 'lucide-react';
import { useAuthContext } from '~/hooks';

export default function AdminConsoleLayout() {
  const { user, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();

  const isFetchingAdmin =
    useIsFetching({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('adminConsole');
      },
    }) > 0;

  const handleReload = () => {
    queryClient.refetchQueries({
      type: 'active',
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('adminConsole');
      },
    });
  };

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(() => {
      queryClient.refetchQueries({
        type: 'active',
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('adminConsole');
        },
      });
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, queryClient]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (user?.role !== 'ADMIN' && user?.role !== 'EDITOR') {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'EDITOR')) {
    return null;
  }

  const navItems = [
    { path: 'overview', label: 'Overview', icon: LayoutDashboard },
    { path: 'users', label: 'Users & Subscriptions', icon: UsersIcon },
    { path: 'plans', label: 'Plans & Tokens', icon: CreditCard },
    { path: 'models', label: 'Models Access', icon: Sliders },
    { path: 'features', label: 'Features Toggle', icon: ToggleRight },
    { path: 'admins', label: 'Admin Management', icon: ShieldPlus },
    { path: 'tickets', label: 'Support Tickets', icon: Ticket },
    { path: 'errors', label: 'Error Activity', icon: TriangleAlert },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-secondary text-text-primary">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-shrink-0 flex-col justify-between border-r border-border-light bg-surface-primary transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border-light p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-6 text-blue-500" />
              <div>
                <h1 className="text-base font-bold leading-tight">Admin Console</h1>
                <p className="text-xs text-text-secondary">Manage System Settings</p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary md:hidden"
              aria-label="Close sidebar"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={`/admin-console/${item.path}`}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600/10 font-semibold text-blue-500'
                        : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
                    }`
                  }
                >
                  <Icon className="size-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="border-t border-border-light p-4">
          <button
            onClick={() => {
              setIsSidebarOpen(false);
              navigate('/c/new');
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-surface-tertiary hover:text-text-primary"
          >
            <ArrowLeft className="size-5" />
            Back to Chat
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col overflow-hidden bg-surface-secondary">
        {/* Header bar */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border-light bg-surface-primary px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="size-6" />
            </button>
            <h2 className="text-base font-bold md:text-lg">
              {navItems.find((item) => location.pathname.endsWith(item.path))?.label || 'Overview'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Auto-Refresh Toggle Pill */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-300 ${
                autoRefresh
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 shadow-[0_0_12px_-3px_rgba(16,185,129,0.25)] dark:border-emerald-500/30 dark:text-emerald-400'
                  : 'border-border-light bg-surface-tertiary text-text-secondary'
              }`}
              title={
                autoRefresh ? 'Disable automatic updates' : 'Enable automatic updates (every 10s)'
              }
            >
              <span
                className={`size-2 rounded-full ${autoRefresh ? 'animate-pulse bg-emerald-500' : 'bg-text-secondary'}`}
              />
              <span className="xs:inline hidden">Auto-Refresh</span>
            </button>

            {/* Manual Reload Button */}
            <button
              onClick={handleReload}
              disabled={isFetchingAdmin}
              className={`flex items-center justify-center rounded-xl border border-border-light bg-surface-primary p-2 text-text-secondary transition-all hover:bg-surface-tertiary hover:text-text-primary active:scale-95 disabled:opacity-50 ${
                isFetchingAdmin ? 'text-blue-500' : ''
              }`}
              aria-label="Reload dashboard data"
              title="Reload current page data"
            >
              <RefreshCw className={`size-4 ${isFetchingAdmin ? 'animate-spin' : ''}`} />
            </button>

            <span className="flex-shrink-0 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-500">
              System Admin
            </span>
            <span className="hidden max-w-[150px] truncate text-sm font-medium text-text-secondary sm:inline md:max-w-none">
              {user?.email}
            </span>
          </div>
        </header>

        {/* Scrollable sub-views */}
        <section className="mx-auto w-full max-w-7xl flex-grow overflow-y-auto p-4 md:p-8">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
