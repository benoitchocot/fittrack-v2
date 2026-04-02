import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/',           label: 'Accueil',    exact: true,  icon: '⊞' },
  { to: '/sessions',   label: 'Séances',    exact: false, icon: '📋' },
  { to: '/templates',  label: 'Templates',  exact: false, icon: '📌' },
  { to: '/exercises',  label: 'Exercices',  exact: false, icon: '💪' },
  { to: '/profile',    label: 'Profil',     exact: false, icon: '👤' },
];

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-16 md:pb-0">
      {/* Desktop top nav */}
      <nav className="hidden md:flex bg-gray-900 border-b border-gray-800 px-4 py-3 items-center justify-between">
        <span className="font-bold text-lg text-white">FitTrack</span>
        <div className="flex items-center gap-1">
          {navItems.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <button
            onClick={logout}
            className="ml-4 px-3 py-1.5 rounded text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Mobile top bar */}
      <div className="md:hidden bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-white">FitTrack</span>
        <button
          onClick={() => navigate('/sessions/new')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          + Séance
        </button>
      </div>

      {/* Page content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex">
        {navItems.map(({ to, label, exact, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
                isActive ? 'text-indigo-400' : 'text-gray-500'
              }`
            }
          >
            <span className="text-lg leading-none">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
