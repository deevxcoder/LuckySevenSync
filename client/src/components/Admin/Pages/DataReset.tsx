import { useState } from 'react';
import { Trash2, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';

type ResetType = 'all_game_data' | 'all_user_data' | 'complete_reset' | null;

export default function DataReset() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [resetType, setResetType] = useState<ResetType>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);

  const resetOptions = [
    {
      type: 'all_game_data' as const,
      title: 'Reset All Game Data',
      description: 'Delete all games, bets, and chat messages. User accounts and chips will remain.',
      icon: Database,
      color: 'yellow',
      confirmPhrase: 'RESET GAMES',
      items: ['All Lucky 7 games', 'All Coin Toss games', 'All bets (Lucky 7 & Coin Toss)', 'All chat messages']
    },
    {
      type: 'all_user_data' as const,
      title: 'Reset All User Data',
      description: 'Delete all user accounts and player data. Games history will remain.',
      icon: Trash2,
      color: 'orange',
      confirmPhrase: 'RESET USERS',
      items: ['All user accounts', 'All player profiles', 'All player chips and stats']
    },
    {
      type: 'complete_reset' as const,
      title: 'Complete Database Reset',
      description: 'WARNING: Delete everything - all users, games, bets, and data. This cannot be undone!',
      icon: AlertTriangle,
      color: 'red',
      confirmPhrase: 'RESET EVERYTHING',
      items: ['All user accounts', 'All player data', 'All games (Lucky 7 & Coin Toss)', 'All bets', 'All chat messages', 'All settings']
    }
  ];

  const handleResetClick = (type: ResetType) => {
    setResetType(type);
    setConfirmText('');
    setShowConfirmDialog(true);
  };

  const handleConfirmReset = async () => {
    if (!resetType) return;

    const option = resetOptions.find(opt => opt.type === resetType);
    if (confirmText !== option?.confirmPhrase) {
      setShowError('Confirmation text does not match');
      return;
    }

    setIsResetting(true);
    setShowError(null);

    try {
      const response = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resetType })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset data');
      }

      setShowSuccess(true);
      setShowConfirmDialog(false);
      setTimeout(() => {
        setShowSuccess(false);
        // If complete reset or user data reset, might need to logout
        if (resetType === 'complete_reset' || resetType === 'all_user_data') {
          window.location.href = '/';
        }
      }, 3000);
    } catch (error) {
      console.error('Reset error:', error);
      setShowError(error instanceof Error ? error.message : 'Failed to reset data');
    } finally {
      setIsResetting(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colors = {
      yellow: 'border-yellow-500/30 bg-yellow-900/10 hover:bg-yellow-900/20',
      orange: 'border-orange-500/30 bg-orange-900/10 hover:bg-orange-900/20',
      red: 'border-red-500/30 bg-red-900/10 hover:bg-red-900/20'
    };
    return colors[color as keyof typeof colors] || colors.yellow;
  };

  const getButtonColorClasses = (color: string) => {
    const colors = {
      yellow: 'border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black',
      orange: 'border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black',
      red: 'border-red-500 text-red-500 hover:bg-red-500 hover:text-white'
    };
    return colors[color as keyof typeof colors] || colors.yellow;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-neo-accent mb-2 flex items-center gap-3">
          <Database className="w-8 h-8" />
          Data Reset
        </h1>
        <p className="text-neo-text-secondary">Permanently delete site and game data</p>
      </div>

      {/* Warning Banner */}
      <div className="neo-glass-card p-6 mb-6 border-2 border-red-500/50 bg-red-900/20">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-red-400 font-heading font-bold text-lg mb-2">
              Danger Zone - Irreversible Actions
            </h3>
            <p className="text-neo-text-secondary text-sm mb-2">
              These actions permanently delete data from the database and cannot be undone.
            </p>
            <p className="text-neo-text-secondary text-sm">
              Make sure you have backups before proceeding with any reset operation.
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="neo-glass-card p-6 mb-6 border-2 border-green-500/50 bg-green-900/20">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 text-green-500" />
            <p className="text-green-400 font-semibold">Data reset completed successfully!</p>
          </div>
        </div>
      )}

      {/* Reset Options */}
      <div className="grid grid-cols-1 gap-6">
        {resetOptions.map((option) => {
          const Icon = option.icon;
          return (
            <div
              key={option.type}
              className={`neo-glass-card p-6 border-2 transition-all duration-300 ${getColorClasses(option.color)}`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4">
                  <Icon className={`w-8 h-8 flex-shrink-0 mt-1 text-${option.color}-500`} />
                  <div>
                    <h3 className="text-neo-accent font-heading font-bold text-xl mb-2">
                      {option.title}
                    </h3>
                    <p className="text-neo-text-secondary mb-4">{option.description}</p>
                    <div className="space-y-1">
                      <p className="text-neo-text-secondary text-sm font-semibold mb-2">
                        This will delete:
                      </p>
                      {option.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-neo-text-secondary">
                          <span className="w-1.5 h-1.5 bg-neo-accent rounded-full"></span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleResetClick(option.type)}
                  variant="outline"
                  className={`border-2 font-heading font-semibold transition-all duration-300 ${getButtonColorClasses(option.color)}`}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-neo-bg border-2 border-neo-accent/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading font-bold text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Confirm Data Reset
            </DialogTitle>
            <DialogDescription className="text-neo-text-secondary">
              This action is permanent and cannot be undone!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="neo-glass-card p-4 border border-neo-accent/30">
              <p className="text-neo-text mb-2">
                You are about to:{' '}
                <span className="font-bold text-red-400">
                  {resetOptions.find(opt => opt.type === resetType)?.title}
                </span>
              </p>
              <p className="text-neo-text-secondary text-sm">
                Type <span className="font-mono font-bold text-neo-accent">
                  {resetOptions.find(opt => opt.type === resetType)?.confirmPhrase}
                </span> to confirm
              </p>
            </div>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type confirmation text"
              className="w-full px-4 py-2 bg-neo-bg border-2 border-neo-accent/30 rounded-lg text-neo-text focus:outline-none focus:border-neo-accent"
              disabled={isResetting}
            />

            {showError && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{showError}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowConfirmDialog(false)}
              variant="outline"
              className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg"
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReset}
              variant="outline"
              className="border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-semibold"
              disabled={isResetting || confirmText !== resetOptions.find(opt => opt.type === resetType)?.confirmPhrase}
            >
              {isResetting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Confirm Reset
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
