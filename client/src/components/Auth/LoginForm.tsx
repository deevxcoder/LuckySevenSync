import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
  isLoading?: boolean;
  error?: string;
}

export default function LoginForm({ onLogin, onSwitchToRegister, isLoading, error }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      await onLogin(username.trim(), password);
    }
  };

  return (
    <div className="min-h-screen bg-casino-green flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-casino-black border-casino-gold border-2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-casino-gold mb-2">
            🎰 Login to Lucky 7 🎰
          </CardTitle>
          <p className="text-white text-sm">
            Sign in to your account
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="bg-casino-green border-casino-gold text-white placeholder-gray-300"
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="bg-casino-green border-casino-gold text-white placeholder-gray-300"
                disabled={isLoading}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-casino-red hover:bg-red-700 text-white font-bold py-3 text-lg glow-red"
              disabled={isLoading || !username.trim() || !password.trim()}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
            
            <div className="text-center pt-4">
              <p className="text-white text-sm">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-casino-gold hover:underline font-semibold"
                  disabled={isLoading}
                >
                  Sign Up
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}