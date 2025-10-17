import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../../ui/button';
import { useAuthStore } from '../../../lib/stores/useAuthStore';
import { 
  LayoutDashboard, 
  Users, 
  Gamepad2, 
  Target, 
  Settings,
  LogOut,
  TrendingUp
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navigation = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Games', href: '/admin/games', icon: Gamepad2 },
    { name: 'Results Control', href: '/admin/results', icon: Target },
    { name: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-neo-bg flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-purple-900/30 to-black/50 border-r border-neo-accent/30">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <Settings className="w-8 h-8 text-neo-accent" />
            <div>
              <h1 className="text-xl font-heading font-bold text-neo-accent">Admin Panel</h1>
              <p className="text-xs text-neo-text-secondary">KingGames</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-neo-accent text-neo-bg font-semibold'
                      : 'text-neo-text hover:bg-white/10 hover:text-neo-accent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-heading">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 w-64 p-6 border-t border-neo-accent/30">
          <div className="mb-4">
            <p className="text-sm text-neo-text-secondary">Logged in as</p>
            <p className="text-sm font-semibold text-neo-accent">{user?.username}</p>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="w-full border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
