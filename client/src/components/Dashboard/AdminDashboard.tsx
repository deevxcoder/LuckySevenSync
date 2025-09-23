import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useAuthStore } from '../../lib/stores/useAuthStore';

interface AdminUser {
  id: number;
  username: string;
}

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/admin/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleLogout = () => {
    logout();
  };

  const handleBackToGame = () => {
    window.location.reload(); // Simple way to go back to game
  };

  return (
    <div className="min-h-screen bg-casino-green p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-casino-gold">
              🛠️ Admin Dashboard
            </h1>
            <p className="text-white mt-1">
              Manage Lucky 7 users and game oversight
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleBackToGame}
              variant="outline"
              className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
            >
              🎰 Back to Game
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="bg-casino-red border-casino-gold text-white hover:bg-red-700"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-casino-black border-casino-gold">
            <CardHeader className="pb-2">
              <CardTitle className="text-casino-gold text-lg">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {users.length}
              </div>
              <p className="text-gray-400 text-sm">Registered players</p>
            </CardContent>
          </Card>

          <Card className="bg-casino-black border-casino-gold">
            <CardHeader className="pb-2">
              <CardTitle className="text-casino-gold text-lg">Active Games</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                1
              </div>
              <p className="text-gray-400 text-sm">Current running games</p>
            </CardContent>
          </Card>

          <Card className="bg-casino-black border-casino-gold">
            <CardHeader className="pb-2">
              <CardTitle className="text-casino-gold text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                ✅ Online
              </div>
              <p className="text-gray-400 text-sm">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Management */}
        <Card className="bg-casino-black border-casino-gold">
          <CardHeader>
            <CardTitle className="text-casino-gold text-xl">👥 User Management</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-white py-8">
                Loading users...
              </div>
            ) : error ? (
              <div className="text-center text-red-300 py-8">
                {error}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No users registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-casino-gold hover:bg-casino-green/20">
                      <TableHead className="text-casino-gold">ID</TableHead>
                      <TableHead className="text-casino-gold">Username</TableHead>
                      <TableHead className="text-casino-gold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow 
                        key={user.id}
                        className="border-casino-gold/50 hover:bg-casino-green/20"
                      >
                        <TableCell className="text-white font-medium">
                          {user.id}
                        </TableCell>
                        <TableCell className="text-white">
                          {user.username}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
                            >
                              View Stats
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                            >
                              Manage
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Game Management */}
        <Card className="bg-casino-black border-casino-gold mt-6">
          <CardHeader>
            <CardTitle className="text-casino-gold text-xl">🎮 Game Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                className="bg-casino-red hover:bg-red-700 text-white font-bold py-3 px-4"
              >
                🔄 Restart Games
              </Button>
              <Button 
                variant="outline"
                className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
              >
                📊 Game History
              </Button>
              <Button 
                variant="outline"
                className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
              >
                ⚙️ Game Settings
              </Button>
              <Button 
                variant="outline"
                className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
              >
                📈 Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}