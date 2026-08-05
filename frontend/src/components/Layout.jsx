import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ScrollText, LogOut, UserPlus, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BatchEmblem from './BatchEmblem';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/directory', label: 'Directory', icon: Users },
  { to: '/activity', label: 'Activity Log', icon: ScrollText, adminOnly: true },
];

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-parchment-50">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-forest-800 text-parchment-100 min-h-screen sticky top-0">
        <SidebarContent isAdmin={isAdmin} user={user} onLogout={handleLogout} />
      </aside>

      {/* Sidebar - mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-forest-800 text-parchment-100 flex flex-col">
            <button
              className="absolute top-4 right-4 text-parchment-100 focus-ring rounded"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            <SidebarContent isAdmin={isAdmin} user={user} onLogout={handleLogout} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-forest-200 bg-parchment-50 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-forest-700">
            <BatchEmblem size={28} />
            <span className="font-display font-semibold">SSC '82 Directory</span>
          </div>
          <button className="focus-ring rounded p-1" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ isAdmin, user, onLogout, onNavigate }) {
  return (
    <>
      <div className="px-6 pt-8 pb-6 flex items-center gap-3 text-parchment-50">
        <BatchEmblem size={40} />
        <div>
          <p className="font-display text-lg leading-tight font-semibold">SSC 1982</p>
          <p className="text-xs uppercase tracking-[0.15em] text-forest-200">Batch Directory</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors focus-ring ${
                  isActive
                    ? 'bg-forest-600 text-white'
                    : 'text-forest-100 hover:bg-forest-700 hover:text-white'
                }`
              }
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </NavLink>
          ))}

        {isAdmin && (
          <NavLink
            to="/directory/new"
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors focus-ring ${
                isActive ? 'bg-brick-500 text-white' : 'text-brick-50 bg-brick-600/40 hover:bg-brick-500 hover:text-white'
              }`
            }
          >
            <UserPlus size={17} strokeWidth={2} />
            Add Person
          </NavLink>
        )}
      </nav>

      <div className="px-4 py-5 border-t border-forest-600/60 mt-auto">
        <p className="text-sm font-medium text-white truncate">{user?.name}</p>
        <p className="text-xs text-forest-200 truncate mb-3">
          {user?.role === 'admin' ? 'Administrator' : 'General User'} · {user?.email}
        </p>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 justify-center text-sm font-medium px-3 py-2 rounded-md border border-forest-500 text-forest-100 hover:bg-forest-700 hover:text-white transition-colors focus-ring"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </>
  );
}
