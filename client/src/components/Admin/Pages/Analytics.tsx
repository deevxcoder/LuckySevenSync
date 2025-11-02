import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Users, Gamepad2, Activity, Crown, RefreshCw, Download, Calendar, AlertCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

interface OverviewStats {
  totalRevenue: number;
  totalWagered: number;
  totalPaidOut: number;
  houseEdge: number;
  totalPlayers: number;
  activePlayers: number;
  totalGames: number;
  lucky7Games: number;
  coinTossGames: number;
}

interface GamePerformance {
  lucky7: {
    totalGames: number;
    averageBetAmount: number;
    popularColors: { red: number; black: number };
  };
  coinToss: {
    totalGames: number;
    averageBetAmount: number;
    results: { heads: number; tails: number };
  };
}

interface PlayerActivity {
  registrationsByDay: { date: string; count: number }[];
  totalPlayers: number;
  activePlayers: number;
  playersWithBets: number;
  conversionRate: string;
}

interface TopPlayers {
  topByGames: { username: string; totalGames: number; wins: number; losses: number; winRate: string }[];
  topByChips: { username: string; chips: number; totalGames: number }[];
}

interface RevenueTrend {
  revenueTrend: { date: string; revenue: number; wagered: number }[];
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [gamePerformance, setGamePerformance] = useState<GamePerformance | null>(null);
  const [playerActivity, setPlayerActivity] = useState<PlayerActivity | null>(null);
  const [topPlayers, setTopPlayers] = useState<TopPlayers | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState('7days');

  const fetchAllAnalytics = async () => {
    try {
      const [overviewRes, gamePerformanceRes, playerActivityRes, topPlayersRes, revenueTrendRes] = await Promise.all([
        fetch('/api/admin/analytics/overview', { credentials: 'include' }),
        fetch('/api/admin/analytics/game-performance', { credentials: 'include' }),
        fetch('/api/admin/analytics/player-activity', { credentials: 'include' }),
        fetch('/api/admin/analytics/top-players', { credentials: 'include' }),
        fetch('/api/admin/analytics/revenue-trend', { credentials: 'include' }),
      ]);

      if (overviewRes.ok) {
        setOverview(await overviewRes.json());
      } else {
        console.error('Failed to fetch overview:', await overviewRes.text());
      }

      if (gamePerformanceRes.ok) {
        setGamePerformance(await gamePerformanceRes.json());
      } else {
        console.error('Failed to fetch game performance:', await gamePerformanceRes.text());
      }

      if (playerActivityRes.ok) {
        setPlayerActivity(await playerActivityRes.json());
      } else {
        console.error('Failed to fetch player activity:', await playerActivityRes.text());
      }

      if (topPlayersRes.ok) {
        setTopPlayers(await topPlayersRes.json());
      } else {
        console.error('Failed to fetch top players:', await topPlayersRes.text());
      }

      if (revenueTrendRes.ok) {
        setRevenueTrend(await revenueTrendRes.json());
      } else {
        console.error('Failed to fetch revenue trend:', await revenueTrendRes.text());
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
    
    const interval = setInterval(() => {
      fetchAllAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchAllAnalytics();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(value);
  };

  const COLORS = ['#c026d3', '#9333ea', '#7c3aed', '#6366f1', '#3b82f6', '#06b6d4'];

  const exportToCSV = () => {
    if (!overview || !topPlayers) return;

    const csvData = [
      ['FunRep Analytics Export', new Date().toLocaleDateString()],
      [],
      ['Overview'],
      ['Metric', 'Value'],
      ['Total Revenue', overview.totalRevenue],
      ['Total Wagered', overview.totalWagered],
      ['Total Paid Out', overview.totalPaidOut],
      ['House Edge', `${overview.houseEdge.toFixed(2)}%`],
      ['Total Players', overview.totalPlayers],
      ['Active Players', overview.activePlayers],
      ['Total Games', overview.totalGames],
      [],
      ['Top Players by Games'],
      ['Rank', 'Username', 'Total Games', 'Wins', 'Losses', 'Win Rate'],
      ...topPlayers.topByGames.map((p, i) => [
        i + 1,
        p.username,
        p.totalGames,
        p.wins,
        p.losses,
        `${p.winRate}%`
      ]),
      [],
      ['Top Players by Chips'],
      ['Rank', 'Username', 'Chips', 'Games Played'],
      ...topPlayers.topByChips.map((p, i) => [
        i + 1,
        p.username,
        p.chips,
        p.totalGames
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `funrep-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      overview,
      gamePerformance,
      playerActivity,
      topPlayers,
      revenueTrend
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `funrep-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading && !overview) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-neo-accent mb-2 flex items-center gap-3">
            <TrendingUp className="w-8 h-8" />
            Analytics & Insights
          </h1>
          <p className="text-neo-text-secondary">Monitor performance and revenue metrics</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-12 h-12 text-neo-accent animate-spin" />
            <div className="text-neo-accent text-lg">Loading analytics...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && !overview) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-neo-accent mb-2 flex items-center gap-3">
            <TrendingUp className="w-8 h-8" />
            Analytics & Insights
          </h1>
          <p className="text-neo-text-secondary">Monitor performance and revenue metrics</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <div className="text-neo-text text-lg">Failed to load analytics data</div>
            <p className="text-neo-text-secondary">Please check your connection and try again</p>
            <Button
              onClick={handleRefresh}
              className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading font-semibold transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-neo-accent mb-2 flex items-center gap-3">
              <TrendingUp className="w-8 h-8" />
              Analytics & Insights
            </h1>
            <p className="text-neo-text-secondary">Monitor performance and revenue metrics</p>
            <p className="text-neo-text-secondary text-xs mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
              className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading font-semibold transition-all duration-300"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white font-heading font-semibold transition-all duration-300"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              onClick={exportToJSON}
              variant="outline"
              className="border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-heading font-semibold transition-all duration-300"
            >
              <Download className="w-4 h-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neo-accent" />
            <span className="text-neo-text-secondary text-sm">Date Range:</span>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40 bg-purple-900/20 border-neo-accent/30 text-neo-text">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-black border-neo-accent/30">
              <SelectItem value="24hours">Last 24 Hours</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-neo-text-secondary text-xs">
            (Filter coming soon - currently showing real-time data)
          </span>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="neo-glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-neo-accent text-sm font-heading font-semibold">Total Revenue</h3>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-mono font-bold text-green-400">
            {overview ? formatCurrency(overview.totalRevenue) : '0'}
          </div>
          <p className="text-neo-text-secondary text-sm mt-2">
            House profit from all games
          </p>
        </div>

        <div className="neo-glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-neo-accent text-sm font-heading font-semibold">Active Players</h3>
            <Users className="w-5 h-5 text-neo-accent" />
          </div>
          <div className="text-3xl font-mono font-bold text-neo-text">
            {overview?.activePlayers ?? 0}
            <span className="text-sm text-neo-text-secondary ml-2">/ {overview?.totalPlayers ?? 0}</span>
          </div>
          <p className="text-neo-text-secondary text-sm mt-2">
            Online now / Total registered
          </p>
        </div>

        <div className="neo-glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-neo-accent text-sm font-heading font-semibold">Total Games</h3>
            <Gamepad2 className="w-5 h-5 text-neo-accent" />
          </div>
          <div className="text-3xl font-mono font-bold text-neo-text">
            {overview?.totalGames ?? 0}
          </div>
          <p className="text-neo-text-secondary text-sm mt-2">
            L7: {overview?.lucky7Games ?? 0} | CT: {overview?.coinTossGames ?? 0}
          </p>
        </div>

        <div className="neo-glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-neo-accent text-sm font-heading font-semibold">House Edge</h3>
            <TrendingUp className="w-5 h-5 text-neo-accent" />
          </div>
          <div className="text-3xl font-mono font-bold text-neo-text">
            {overview ? overview.houseEdge.toFixed(2) : '0'}%
          </div>
          <p className="text-neo-text-secondary text-sm mt-2">
            Average profit margin
          </p>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="neo-glass-card p-6 mb-8">
        <h2 className="text-neo-accent text-xl font-heading font-bold mb-6">Revenue Trend (Last 7 Days)</h2>
        {revenueTrend && revenueTrend.revenueTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTrend.revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="date" 
                stroke="#a855f7"
                tick={{ fill: '#d8b4fe' }}
              />
              <YAxis 
                stroke="#a855f7"
                tick={{ fill: '#d8b4fe' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                  border: '1px solid #a855f7',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#a855f7' }}
              />
              <Legend wrapperStyle={{ color: '#d8b4fe' }} />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Revenue"
              />
              <Line 
                type="monotone" 
                dataKey="wagered" 
                stroke="#c026d3" 
                strokeWidth={2}
                name="Total Wagered"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-neo-text-secondary py-8">No revenue data available</p>
        )}
      </div>

      {/* Game Performance and Player Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Game Performance */}
        <div className="neo-glass-card p-6">
          <h2 className="text-neo-accent text-xl font-heading font-bold mb-6">Game Performance</h2>
          {gamePerformance ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-neo-text font-semibold mb-3">Lucky 7</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                    <p className="text-neo-text-secondary text-sm">Total Games</p>
                    <p className="text-2xl font-mono font-bold text-neo-text">
                      {gamePerformance.lucky7.totalGames}
                    </p>
                  </div>
                  <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                    <p className="text-neo-text-secondary text-sm">Avg Bet</p>
                    <p className="text-2xl font-mono font-bold text-neo-text">
                      {gamePerformance.lucky7.averageBetAmount}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-neo-text-secondary text-sm mb-2">Popular Colors</p>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={[
                      { name: 'Red', value: gamePerformance.lucky7.popularColors.red },
                      { name: 'Black', value: gamePerformance.lucky7.popularColors.black },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#a855f7" tick={{ fill: '#d8b4fe' }} />
                      <YAxis stroke="#a855f7" tick={{ fill: '#d8b4fe' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                          border: '1px solid #a855f7',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="value" fill="#c026d3" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border-t border-neo-accent/30 pt-6">
                <h3 className="text-neo-text font-semibold mb-3">Coin Toss</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-500/30">
                    <p className="text-neo-text-secondary text-sm">Total Games</p>
                    <p className="text-2xl font-mono font-bold text-neo-text">
                      {gamePerformance.coinToss.totalGames}
                    </p>
                  </div>
                  <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-500/30">
                    <p className="text-neo-text-secondary text-sm">Avg Bet</p>
                    <p className="text-2xl font-mono font-bold text-neo-text">
                      {gamePerformance.coinToss.averageBetAmount}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-neo-text-secondary text-sm mb-2">Results Distribution</p>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Heads', value: gamePerformance.coinToss.results.heads },
                          { name: 'Tails', value: gamePerformance.coinToss.results.tails },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#f59e0b" />
                        <Cell fill="#eab308" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                          border: '1px solid #a855f7',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-neo-text-secondary py-8">No game data available</p>
          )}
        </div>

        {/* Player Activity */}
        <div className="neo-glass-card p-6">
          <h2 className="text-neo-accent text-xl font-heading font-bold mb-6">Player Activity</h2>
          {playerActivity ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
                  <p className="text-neo-text-secondary text-sm">Total Players</p>
                  <p className="text-2xl font-mono font-bold text-neo-text">
                    {playerActivity.totalPlayers}
                  </p>
                </div>
                <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
                  <p className="text-neo-text-secondary text-sm">Active Now</p>
                  <p className="text-2xl font-mono font-bold text-green-400">
                    {playerActivity.activePlayers}
                  </p>
                </div>
                <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                  <p className="text-neo-text-secondary text-sm">Players w/ Bets</p>
                  <p className="text-2xl font-mono font-bold text-neo-text">
                    {playerActivity.playersWithBets}
                  </p>
                </div>
                <div className="bg-pink-900/20 p-4 rounded-lg border border-pink-500/30">
                  <p className="text-neo-text-secondary text-sm">Conversion</p>
                  <p className="text-2xl font-mono font-bold text-neo-text">
                    {playerActivity.conversionRate}%
                  </p>
                </div>
              </div>

              <div>
                <p className="text-neo-text-secondary text-sm mb-3">Registrations (Last 7 Days)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={playerActivity.registrationsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#a855f7"
                      tick={{ fill: '#d8b4fe', fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#a855f7" tick={{ fill: '#d8b4fe' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                        border: '1px solid #a855f7',
                        borderRadius: '8px'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Bar dataKey="count" fill="#3b82f6" name="New Registrations" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-center text-neo-text-secondary py-8">No player data available</p>
          )}
        </div>
      </div>

      {/* Top Players Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top by Games */}
        <div className="neo-glass-card p-6">
          <h2 className="text-neo-accent text-xl font-heading font-bold mb-6 flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            Top Players by Games
          </h2>
          {topPlayers && topPlayers.topByGames.length > 0 ? (
            <div className="space-y-3">
              {topPlayers.topByGames.map((player, index) => (
                <div 
                  key={player.username} 
                  className="flex items-center justify-between p-3 bg-purple-900/20 rounded-lg border border-purple-500/30 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-orange-700 text-white' :
                      'bg-purple-700 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-neo-text font-semibold">{player.username}</p>
                      <p className="text-xs text-neo-text-secondary">
                        {player.wins}W / {player.losses}L ({player.winRate}% WR)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-mono font-bold text-neo-accent">{player.totalGames}</p>
                    <p className="text-xs text-neo-text-secondary">games</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-neo-text-secondary py-8">No player data available</p>
          )}
        </div>

        {/* Top by Chips */}
        <div className="neo-glass-card p-6">
          <h2 className="text-neo-accent text-xl font-heading font-bold mb-6 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-500" />
            Top Players by Chips
          </h2>
          {topPlayers && topPlayers.topByChips.length > 0 ? (
            <div className="space-y-3">
              {topPlayers.topByChips.map((player, index) => (
                <div 
                  key={player.username} 
                  className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-500/30 hover:border-green-500/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-orange-700 text-white' :
                      'bg-green-700 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-neo-text font-semibold">{player.username}</p>
                      <p className="text-xs text-neo-text-secondary">
                        {player.totalGames} games played
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-mono font-bold text-green-400">{formatCurrency(player.chips)}</p>
                    <p className="text-xs text-neo-text-secondary">chips</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-neo-text-secondary py-8">No player data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
