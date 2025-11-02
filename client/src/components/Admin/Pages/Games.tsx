import { Gamepad2, RefreshCw, History, Cog, TrendingUp, Image } from 'lucide-react';
import { Button } from '../../ui/button';
import { useState } from 'react';

export default function GamesPage() {
  const [lucky7BgUrl, setLucky7BgUrl] = useState('');
  const [cointossBgUrl, setCointossBgUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (gameType: 'lucky7' | 'cointoss', file: File) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('background', file);
      formData.append('gameType', gameType);

      const response = await fetch('/api/admin/game-background', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        alert(`${gameType === 'lucky7' ? 'Lucky 7' : 'CoinToss'} background updated successfully!`);
        window.location.reload();
      } else {
        alert('Failed to upload background image');
      }
    } catch (error) {
      console.error('Error uploading background:', error);
      alert('Error uploading background image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (gameType: 'lucky7' | 'cointoss', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(gameType, file);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-neo-accent mb-2 flex items-center gap-3">
          <Gamepad2 className="w-8 h-8" />
          Game Management
        </h1>
        <p className="text-neo-text-secondary">Control game operations and settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Game Controls */}
        <div className="neo-glass-card p-6">
          <h2 className="text-neo-accent text-xl font-heading font-bold mb-4">Game Controls</h2>
          <div className="space-y-3">
            <Button 
              className="w-full border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading font-semibold py-6 transition-all duration-300"
            >
              <RefreshCw className="w-5 h-5 inline mr-2" />
              Restart All Games
            </Button>
            <p className="text-sm text-neo-text-secondary">
              Restart all running game servers. This will disconnect all players and reinitialize the games.
            </p>
          </div>
        </div>

        {/* Game History */}
        <div className="neo-glass-card p-6">
          <h2 className="text-neo-accent text-xl font-heading font-bold mb-4">Game History</h2>
          <div className="space-y-3">
            <Button 
              variant="outline"
              className="w-full border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading py-6 transition-all duration-300"
            >
              <History className="w-5 h-5 inline mr-2" />
              View Game History
            </Button>
            <p className="text-sm text-neo-text-secondary">
              Access detailed logs and history of all game rounds, bets, and outcomes.
            </p>
          </div>
        </div>

        {/* Game Settings */}
        <div className="neo-glass-card p-6">
          <h2 className="text-neo-accent text-xl font-heading font-bold mb-4">Game Settings</h2>
          <div className="space-y-3">
            <Button 
              variant="outline"
              className="w-full border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading py-6 transition-all duration-300"
            >
              <Cog className="w-5 h-5 inline mr-2" />
              Configure Settings
            </Button>
            <p className="text-sm text-neo-text-secondary">
              Adjust game parameters, bet limits, timers, and other configuration options.
            </p>
          </div>
        </div>

        {/* Analytics */}
        <div className="neo-glass-card p-6">
          <h2 className="text-neo-accent text-xl font-heading font-bold mb-4">Game Analytics</h2>
          <div className="space-y-3">
            <Button 
              variant="outline"
              className="w-full border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading py-6 transition-all duration-300"
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              View Analytics
            </Button>
            <p className="text-sm text-neo-text-secondary">
              Monitor game performance, player engagement, and revenue analytics.
            </p>
          </div>
        </div>
      </div>

      {/* Active Games Status */}
      <div className="neo-glass-card p-6 mt-6">
        <h2 className="text-neo-accent text-xl font-heading font-bold mb-4">Active Games Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-neo-text font-semibold">Lucky 7</span>
            </div>
            <div className="text-right">
              <p className="text-green-400 font-semibold">Running</p>
              <p className="text-sm text-neo-text-secondary">Active players: --</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-neo-text font-semibold">Coin Toss</span>
            </div>
            <div className="text-right">
              <p className="text-green-400 font-semibold">Running</p>
              <p className="text-sm text-neo-text-secondary">Active players: --</p>
            </div>
          </div>
        </div>
      </div>

      {/* Background Settings */}
      <div className="neo-glass-card p-6 mt-6">
        <h2 className="text-neo-accent text-xl font-heading font-bold mb-4 flex items-center gap-2">
          <Image className="w-6 h-6" />
          Game Background Settings
        </h2>
        <p className="text-neo-text-secondary mb-6">Upload custom background images for each game (recommended size: 1920x1080px)</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lucky 7 Background */}
          <div className="border border-neo-accent/30 rounded-lg p-4">
            <h3 className="text-neo-accent font-semibold mb-3">Lucky 7 Background</h3>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="file"
                  id="lucky7-bg-upload"
                  accept="image/*"
                  onChange={(e) => handleFileChange('lucky7', e)}
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="lucky7-bg-upload"
                  className={`block w-full p-3 text-center border-2 border-dashed border-neo-accent/50 rounded-lg cursor-pointer hover:bg-neo-accent/10 transition-all ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Image className="w-8 h-8 mx-auto mb-2 text-neo-accent" />
                  <span className="text-neo-text text-sm">
                    {uploading ? 'Uploading...' : 'Click to upload Lucky 7 background'}
                  </span>
                </label>
              </div>
              <div className="bg-neo-bg/50 rounded p-2 text-xs text-neo-text-secondary">
                Current: /casino-bg.jpg
              </div>
            </div>
          </div>

          {/* CoinToss Background */}
          <div className="border border-neo-accent/30 rounded-lg p-4">
            <h3 className="text-neo-accent font-semibold mb-3">CoinToss Background</h3>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="file"
                  id="cointoss-bg-upload"
                  accept="image/*"
                  onChange={(e) => handleFileChange('cointoss', e)}
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="cointoss-bg-upload"
                  className={`block w-full p-3 text-center border-2 border-dashed border-neo-accent/50 rounded-lg cursor-pointer hover:bg-neo-accent/10 transition-all ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Image className="w-8 h-8 mx-auto mb-2 text-neo-accent" />
                  <span className="text-neo-text text-sm">
                    {uploading ? 'Uploading...' : 'Click to upload CoinToss background'}
                  </span>
                </label>
              </div>
              <div className="bg-neo-bg/50 rounded p-2 text-xs text-neo-text-secondary">
                Current: /cointoss-bg.jpg
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
