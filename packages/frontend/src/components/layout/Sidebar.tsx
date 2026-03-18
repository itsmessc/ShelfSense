import { NavLink } from 'react-router-dom';

const links = [
  { to: '/',            label: 'Dashboard',    icon: '📊', end: true },
  { to: '/inventory',   label: 'Inventory',    icon: '📦', end: false },
  { to: '/usage',       label: 'Log Usage',    icon: '📝', end: false },
  { to: '/procurement', label: 'Procurement',  icon: '🌱', end: false },
  { to: '/reorder',     label: 'Reorder Queue',icon: '📋', end: false },
  { to: '/analytics',   label: 'Analytics',    icon: '📈', end: false },
  { to: '/chat',        label: 'AI Assistant', icon: '💬', end: false },
];

export function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-brand-800 text-white flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-brand-700">
        <span className="text-xl font-bold tracking-tight">🌿 ShelfSense</span>
        <p className="text-xs text-brand-300 mt-0.5">Green-Tech Inventory</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-600 text-white' : 'text-brand-200 hover:bg-brand-700 hover:text-white'
              }`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 text-xs text-brand-400 border-t border-brand-700">
        Powered by Gemini AI
      </div>
    </aside>
  );
}
