import { TrendingUp, DollarSign, Users, Gamepad2 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-neo-accent mb-2 flex items-center gap-3">
          <TrendingUp className="w-8 h-8" />
          Analytics & Insights
        </h1>
        <p className="text-neo-text-secondary">Monitor performance and revenue metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="neo-glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-neo-accent text-sm font-heading font-semibold">Total Revenue</h3>
            <DollarSign className="w-5 h-5 text-neo-accent" />
          </div>
          <div className="text-3xl font-mono font-bold text-neo-text">--</div>
          <p className="text-neo-text-secondary text-sm mt-2">Coming soon</p>
        </div>

        <div className="neo-glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-neo-accent text-sm font-heading font-semibold">Active Players</h3>
            <Users className="w-5 h-5 text-neo-accent" />
          </div>
          <div className="text-3xl font-mono font-bold text-neo-text">--</div>
          <p className="text-neo-text-secondary text-sm mt-2">Coming soon</p>
        </div>

        <div className="neo-glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-neo-accent text-sm font-heading font-semibold">Total Bets</h3>
            <Gamepad2 className="w-5 h-5 text-neo-accent" />
          </div>
          <div className="text-3xl font-mono font-bold text-neo-text">--</div>
          <p className="text-neo-text-secondary text-sm mt-2">Coming soon</p>
        </div>

        <div className="neo-glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-neo-accent text-sm font-heading font-semibold">House Edge</h3>
            <TrendingUp className="w-5 h-5 text-neo-accent" />
          </div>
          <div className="text-3xl font-mono font-bold text-neo-text">--</div>
          <p className="text-neo-text-secondary text-sm mt-2">Coming soon</p>
        </div>
      </div>

      <div className="neo-glass-card p-6">
        <h2 className="text-neo-accent text-xl font-heading font-bold mb-4">Analytics Dashboard</h2>
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 text-neo-accent mx-auto mb-4 opacity-50" />
          <p className="text-neo-text-secondary">
            Advanced analytics and reporting features are coming soon.
          </p>
          <p className="text-neo-text-secondary text-sm mt-2">
            This section will include detailed revenue reports, player behavior analytics, game performance metrics, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
