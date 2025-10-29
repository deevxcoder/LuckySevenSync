import { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle, Info, XCircle, Filter, Download } from 'lucide-react';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'game' | 'user' | 'admin' | 'system';
  message: string;
  details?: string;
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    const mockLogs: LogEntry[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        type: 'success',
        category: 'game',
        message: 'Lucky 7 round completed',
        details: 'Game ID: 1234, Total bets: 5, Winner: Red'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
        type: 'info',
        category: 'user',
        message: 'New user registration',
        details: 'Username: player123'
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
        type: 'warning',
        category: 'admin',
        message: 'Admin override result for Lucky 7',
        details: 'Admin: admin, Game ID: 1233, Override: Black'
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
        type: 'success',
        category: 'game',
        message: 'Coin Toss round completed',
        details: 'Game ID: 456, Total bets: 3, Result: Heads'
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
        type: 'info',
        category: 'user',
        message: 'User login',
        details: 'Username: player456'
      },
      {
        id: '6',
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        type: 'error',
        category: 'system',
        message: 'Database connection timeout',
        details: 'Retry successful after 2 attempts'
      },
      {
        id: '7',
        timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
        type: 'success',
        category: 'admin',
        message: 'User status updated',
        details: 'Admin: admin, User: player789, Status: suspended'
      },
      {
        id: '8',
        timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
        type: 'info',
        category: 'game',
        message: 'New game room created',
        details: 'Room ID: GLOBAL, Game: Lucky 7'
      },
    ];

    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.type === filterType);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(log => log.category === filterCategory);
    }

    setFilteredLogs(filtered);
  }, [filterType, filterCategory, logs]);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-500/30 bg-green-900/10';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-900/10';
      case 'error':
        return 'border-red-500/30 bg-red-900/10';
      default:
        return 'border-blue-500/30 bg-blue-900/10';
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      game: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      user: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      admin: 'bg-red-500/20 text-red-300 border-red-500/30',
      system: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    };
    return colors[category as keyof typeof colors] || colors.system;
  };

  const exportLogs = () => {
    const csvData = [
      ['KingGames Activity Logs Export', new Date().toLocaleDateString()],
      [],
      ['Timestamp', 'Type', 'Category', 'Message', 'Details'],
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.type,
        log.category,
        log.message,
        log.details || ''
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinggames-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-neo-accent mb-2 flex items-center gap-3">
              <Activity className="w-8 h-8" />
              Activity Logs
            </h1>
            <p className="text-neo-text-secondary">Monitor system activities and events</p>
          </div>
          <Button
            onClick={exportLogs}
            variant="outline"
            className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading font-semibold transition-all duration-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Logs
          </Button>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neo-accent" />
            <span className="text-neo-text-secondary text-sm">Filters:</span>
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 bg-purple-900/20 border-neo-accent/30 text-neo-text">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-black border-neo-accent/30">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40 bg-purple-900/20 border-neo-accent/30 text-neo-text">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-black border-neo-accent/30">
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="game">Game</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-neo-text-secondary text-sm">
            Showing {filteredLogs.length} of {logs.length} logs
          </span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="neo-glass-card p-4">
          <div className="flex items-center gap-3">
            <Info className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-neo-text-secondary text-sm">Info</p>
              <p className="text-2xl font-mono font-bold text-neo-text">
                {logs.filter(l => l.type === 'info').length}
              </p>
            </div>
          </div>
        </div>

        <div className="neo-glass-card p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-neo-text-secondary text-sm">Success</p>
              <p className="text-2xl font-mono font-bold text-green-400">
                {logs.filter(l => l.type === 'success').length}
              </p>
            </div>
          </div>
        </div>

        <div className="neo-glass-card p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-neo-text-secondary text-sm">Warning</p>
              <p className="text-2xl font-mono font-bold text-yellow-400">
                {logs.filter(l => l.type === 'warning').length}
              </p>
            </div>
          </div>
        </div>

        <div className="neo-glass-card p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-neo-text-secondary text-sm">Error</p>
              <p className="text-2xl font-mono font-bold text-red-400">
                {logs.filter(l => l.type === 'error').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="neo-glass-card p-6">
        <h2 className="text-neo-accent text-xl font-heading font-bold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {filteredLogs.length > 0 ? (
            filteredLogs.map(log => (
              <div 
                key={log.id} 
                className={`p-4 rounded-lg border transition-all hover:border-opacity-70 ${getLogColor(log.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getLogIcon(log.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs rounded border font-semibold ${getCategoryBadge(log.category)}`}>
                          {log.category.toUpperCase()}
                        </span>
                        <span className="text-neo-text-secondary text-sm">
                          {new Date(log.timestamp).toLocaleTimeString()} - {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-neo-text font-semibold">{log.message}</p>
                      {log.details && (
                        <p className="text-neo-text-secondary text-sm mt-1">{log.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-neo-text-secondary py-8">No logs match the selected filters</p>
          )}
        </div>
      </div>
    </div>
  );
}
