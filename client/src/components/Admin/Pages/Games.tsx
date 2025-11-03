import { Gamepad2, RefreshCw, History, Cog, TrendingUp, Image, MessageSquare } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export default function GamesPage() {
  const [lucky7BgUrl, setLucky7BgUrl] = useState('');
  const [cointossBgUrl, setCointossBgUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [depositMessage, setDepositMessage] = useState('');
  const [savingDepositSettings, setSavingDepositSettings] = useState(false);
  const [bgImageVersion, setBgImageVersion] = useState<number>(Date.now());

  const handleImageUpload = async (gameType: 'lucky7' | 'cointoss', file: File) => {
    if (!file) return;
    
    setUploading(true);
    const uploadToast = toast.loading(`Uploading ${gameType === 'lucky7' ? 'Lucky 7' : 'CoinToss'} background...`);
    
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
        
        // Update the image version to force preview refresh
        setBgImageVersion(Date.now());
        
        toast.success(`${gameType === 'lucky7' ? 'Lucky 7' : 'CoinToss'} background updated successfully!`, {
          id: uploadToast,
          description: 'Your changes will be visible immediately in the game.',
          duration: 3000
        });
        
        // Force cache bust by reloading after a brief delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        toast.error('Failed to upload background image', {
          id: uploadToast,
          description: errorData.message || 'Please try again',
          duration: 4000
        });
      }
    } catch (error) {
      console.error('Error uploading background:', error);
      toast.error('Error uploading background image', {
        id: uploadToast,
        description: 'Please check your connection and try again',
        duration: 4000
      });
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

  // Fetch deposit settings on component mount
  useEffect(() => {
    const fetchDepositSettings = async () => {
      try {
        const response = await fetch('/api/admin/deposit-settings', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setWhatsappNumber(data.whatsappNumber || '');
          setDepositMessage(data.depositMessage || '');
        }
      } catch (error) {
        console.error('Error fetching deposit settings:', error);
      }
    };

    fetchDepositSettings();
  }, []);

  const handleSaveDepositSettings = async () => {
    if (!whatsappNumber || !depositMessage) {
      toast.error('Missing Information', {
        description: 'Please fill in both WhatsApp number and deposit message',
        duration: 3000
      });
      return;
    }

    setSavingDepositSettings(true);
    const saveToast = toast.loading('Saving deposit settings...');
    
    try {
      const response = await fetch('/api/admin/deposit-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          whatsappNumber,
          depositMessage
        })
      });

      if (response.ok) {
        toast.success('Deposit settings saved successfully!', {
          id: saveToast,
          description: 'Users will now see your WhatsApp contact for deposits/withdrawals',
          duration: 3000
        });
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        toast.error('Failed to save deposit settings', {
          id: saveToast,
          description: errorData.message || 'Please try again',
          duration: 4000
        });
      }
    } catch (error) {
      console.error('Error saving deposit settings:', error);
      toast.error('Error saving deposit settings', {
        id: saveToast,
        description: 'Please check your connection and try again',
        duration: 4000
      });
    } finally {
      setSavingDepositSettings(false);
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
              {/* Image Preview */}
              <div className="aspect-video w-full border-2 border-neo-accent/20 rounded-lg overflow-hidden bg-neo-bg/50">
                <img 
                  src={`/casino-bg.jpg?v=${bgImageVersion}`} 
                  alt="Lucky 7 Background Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="225"%3E%3Crect fill="%23141420" width="400" height="225"/%3E%3Ctext fill="%2300FFC6" font-family="Arial" font-size="16" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo image uploaded yet%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
              
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
                File: casino-bg.jpg
              </div>
            </div>
          </div>

          {/* CoinToss Background */}
          <div className="border border-neo-accent/30 rounded-lg p-4">
            <h3 className="text-neo-accent font-semibold mb-3">CoinToss Background</h3>
            <div className="space-y-3">
              {/* Image Preview */}
              <div className="aspect-video w-full border-2 border-neo-accent/20 rounded-lg overflow-hidden bg-neo-bg/50">
                <img 
                  src={`/cointoss-bg.jpg?v=${bgImageVersion}`} 
                  alt="CoinToss Background Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="225"%3E%3Crect fill="%23141420" width="400" height="225"/%3E%3Ctext fill="%2300FFC6" font-family="Arial" font-size="16" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo image uploaded yet%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
              
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
                File: cointoss-bg.jpg
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit/Withdraw Settings */}
      <div className="neo-glass-card p-6 mt-6">
        <h2 className="text-neo-accent text-xl font-heading font-bold mb-4 flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Deposit / Withdraw Settings
        </h2>
        <p className="text-neo-text-secondary mb-6">Configure WhatsApp contact for user deposits and withdrawals</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-neo-text font-semibold mb-2">WhatsApp Number (with country code)</label>
            <Input
              type="text"
              placeholder="e.g., 919876543210"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="bg-neo-bg border-neo-border text-neo-text"
            />
            <p className="text-xs text-neo-text-secondary mt-1">Enter number with country code (no + or spaces)</p>
          </div>

          <div>
            <label className="block text-neo-text font-semibold mb-2">Deposit Message</label>
            <Textarea
              placeholder="Enter the message users will see when they want to deposit/withdraw..."
              value={depositMessage}
              onChange={(e) => setDepositMessage(e.target.value)}
              rows={4}
              className="bg-neo-bg border-neo-border text-neo-text"
            />
            <p className="text-xs text-neo-text-secondary mt-1">This message will be shown to users before they contact via WhatsApp</p>
          </div>

          <Button
            onClick={handleSaveDepositSettings}
            disabled={savingDepositSettings || !whatsappNumber || !depositMessage}
            className="w-full bg-neo-accent hover:bg-neo-accent/90 text-neo-bg font-heading font-semibold py-3 transition-all duration-300"
          >
            {savingDepositSettings ? 'Saving...' : 'Save Deposit Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
