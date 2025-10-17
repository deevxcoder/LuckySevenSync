import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface AdminUser {
  id: number;
  username: string;
}

export default function Overview() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-neo-accent mb-2">Dashboard Overview</h1>
        <p className="text-neo-text-secondary">Monitor system status and key metrics</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="neo-glass-card p-6">
          <h3 className="text-neo-accent text-lg font-heading font-semibold mb-2">Total Users</h3>
          <div className="text-4xl font-mono font-bold text-neo-text">
            {isLoading ? '...' : users.length}
          </div>
          <p className="text-neo-text-secondary text-sm mt-2">Registered players</p>
        </div>

        <div className="neo-glass-card p-6">
          <h3 className="text-neo-accent text-lg font-heading font-semibold mb-2">Active Games</h3>
          <div className="text-4xl font-mono font-bold text-neo-success flex items-center gap-2">
            1 <span className="live-indicator"></span>
          </div>
          <p className="text-neo-text-secondary text-sm mt-2">Current running games</p>
        </div>

        <div className="neo-glass-card p-6">
          <h3 className="text-neo-accent text-lg font-heading font-semibold mb-2">System Status</h3>
          <div className="text-4xl font-mono font-bold text-neo-success flex items-center gap-2">
            <CheckCircle className="w-10 h-10" />
            Online
          </div>
          <p className="text-neo-text-secondary text-sm mt-2">All systems operational</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="neo-glass-card p-6">
        <h2 className="text-neo-accent text-xl font-heading font-bold mb-4">System Health</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-neo-text">Database Connection</span>
            </div>
            <span className="text-green-400 font-semibold">Healthy</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-neo-text">WebSocket Server</span>
            </div>
            <span className="text-green-400 font-semibold">Active</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-neo-text">Game Services</span>
            </div>
            <span className="text-green-400 font-semibold">Running</span>
          </div>
        </div>
      </div>
    </div>
  );
}
