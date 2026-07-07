import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuthContext } from '~/hooks';

export default function AdminConsoleLayout() {
  const { user, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    { path: 'admins', label: 'Admin Management', icon: ShieldPlus },
    { path: 'tickets', label: 'Support Tickets', icon: Ticket },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-secondary text-text-primary">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border-light bg-surface-primary flex flex-col justify-between flex-shrink-0 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Header */}
          <div className="p-6 border-b border-border-light flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-6 text-blue-500" />
              <div>
                <h1 className="font-bold text-base leading-tight">Admin Console</h1>
                <p className="text-xs text-text-secondary">Manage System Settings</p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-tertiary md:hidden transition-colors"
              aria-label="Close sidebar"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={`/admin-console/${item.path}`}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600/10 text-blue-500 font-semibold'
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
        <div className="p-4 border-t border-border-light">
          <button
            onClick={() => {
              setIsSidebarOpen(false);
              navigate('/c/new');
            }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-all duration-200"
          >
            <ArrowLeft className="size-5" />
            Back to Chat
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-surface-secondary">
        {/* Header bar */}
        <header className="h-16 border-b border-border-light bg-surface-primary px-4 md:px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-tertiary md:hidden transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="size-6" />
            </button>
            <h2 className="text-base md:text-lg font-bold">
              {navItems.find((item) => location.pathname.endsWith(item.path))?.label || 'Overview'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 font-semibold border border-blue-500/20 flex-shrink-0">
              System Admin
            </span>
            <span className="hidden sm:inline text-sm font-medium text-text-secondary truncate max-w-[150px] md:max-w-none">
              {user?.email}
            </span>
          </div>
        </header>

        {/* Scrollable sub-views */}
        <section className="flex-grow overflow-y-auto p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
