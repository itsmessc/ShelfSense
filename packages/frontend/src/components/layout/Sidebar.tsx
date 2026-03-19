import { NavLink } from 'react-router-dom';

const links = [
  { to: '/',            label: 'Dashboard',        icon: '📊', end: true },
  { to: '/inventory',   label: 'Inventory',         icon: '📦', end: false },
  { to: '/expiry',      label: 'Expiry Calendar',   icon: '📅', end: false },
  { to: '/usage',       label: 'Log Usage',         icon: '📝', end: false },
  { to: '/procurement', label: 'Procurement',       icon: '🌱', end: false },
  { to: '/reorder',     label: 'Reorder Queue',     icon: '📋', end: false },
  { to: '/analytics',   label: 'Analytics',         icon: '📈', end: false },
  { to: '/audit',       label: 'Audit Log',         icon: '🕵️', end: false },
  { to: '/chat',        label: 'AI Assistant',      icon: '💬', end: false },
];

export function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-brand-900 text-white flex flex-col shrink-0 shadow-xl z-20">
      <div className="px-6 py-8 border-b border-brand-800/50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-brand-300 bg-clip-text text-transparent">
            ShelfSense
          </span>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-400 mt-2 opacity-80">
          Sustainable Inventory
        </p>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {links.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                isActive 
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50 translate-x-1' 
                  : 'text-brand-300 hover:bg-brand-800/50 hover:text-white hover:translate-x-1'
              }`
            }
          >
            <span className="text-lg group-hover:scale-110 transition-transform duration-200">{icon}</span>
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-6 text-[10px] font-medium text-brand-500 border-t border-brand-800/50 bg-brand-950/30">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          Powered by Gemini AI
        </div>
      </div>
    </aside>
  );
}
