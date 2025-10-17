import { useNavigate } from 'react-router-dom';
import { Target, Coins } from 'lucide-react';

export default function ResultsControl() {
  const navigate = useNavigate();

  const games = [
    {
      id: 'lucky7',
      name: 'Lucky 7',
      icon: '🎯',
      description: 'Control and override Lucky 7 card game results during countdown phase',
      bgGradient: 'bg-gradient-to-br from-purple-600/20 to-purple-900/20',
      borderColor: 'border-purple-500/30',
      hoverColor: 'hover:border-purple-500',
      route: '/admin/results/lucky7',
      IconComponent: Target
    },
    {
      id: 'cointoss',
      name: 'Coin Toss',
      icon: '🪙',
      description: 'Control and override Coin Toss game results during countdown phase',
      bgGradient: 'bg-gradient-to-br from-yellow-600/20 to-yellow-900/20',
      borderColor: 'border-yellow-500/30',
      hoverColor: 'hover:border-yellow-500',
      route: '/admin/results/cointoss',
      IconComponent: Coins
    }
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-neo-accent mb-2 flex items-center gap-3">
          <Target className="w-8 h-8" />
          Results Control
        </h1>
        <p className="text-neo-text-secondary">Select a game to manage and override results</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => {
          const Icon = game.IconComponent;
          
          return (
            <button
              key={game.id}
              onClick={() => navigate(game.route)}
              className={`neo-glass-card p-6 text-left transition-all duration-300 cursor-pointer ${game.bgGradient} ${game.hoverColor} border-2 ${game.borderColor}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{game.icon}</span>
                  <div>
                    <h3 className="text-xl font-heading font-bold text-neo-accent">{game.name}</h3>
                  </div>
                </div>
                <Icon className="w-6 h-6 text-neo-accent" />
              </div>
              
              <p className="text-neo-text-secondary text-sm leading-relaxed">
                {game.description}
              </p>
              
              <div className="mt-4 flex items-center justify-end text-neo-accent font-semibold text-sm">
                Manage Results →
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 neo-glass-card p-6 border-2 border-neo-accent/20">
        <h2 className="text-neo-accent text-lg font-heading font-bold mb-3">ℹ️ How to Use Results Control</h2>
        <div className="space-y-2 text-neo-text-secondary text-sm">
          <p>• Select a game card above to access its result override controls</p>
          <p>• Results can only be overridden during the countdown phase</p>
          <p>• Override actions are permanent and cannot be undone</p>
          <p>• Use this feature only when necessary for game management</p>
        </div>
      </div>
    </div>
  );
}
