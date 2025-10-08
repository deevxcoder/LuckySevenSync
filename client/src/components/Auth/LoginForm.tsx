import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { LogIn, ArrowLeft } from 'lucide-react';

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
  onBackToHome?: () => void;
  isLoading?: boolean;
  error?: string;
}

export default function LoginForm({ onLogin, onSwitchToRegister, onBackToHome, isLoading, error }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      await onLogin(username.trim(), password);
    }
  };

  return (
    <div className="min-h-screen bg-neo-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md neo-glass-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <LogIn className="w-12 h-12 text-neo-accent" />
          </div>
          <CardTitle className="heading-primary text-neo-accent mb-2">
            Welcome Back
          </CardTitle>
          <p className="text-neo-text-secondary text-sm">
            Sign in to your account
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-neo-danger/20 border border-neo-danger rounded-lg text-neo-danger text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username" className="text-neo-text">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="bg-neo-card/50 border-neo-border text-neo-text placeholder-neo-text-secondary focus:border-neo-accent transition-colors"
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-neo-text">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="bg-neo-card/50 border-neo-border text-neo-text placeholder-neo-text-secondary focus:border-neo-accent transition-colors"
                disabled={isLoading}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-neo-accent hover:bg-neo-accent/90 text-neo-bg font-bold py-3 text-lg transition-all hover:shadow-[0_0_20px_rgba(0,255,198,0.5)]"
              disabled={isLoading || !username.trim() || !password.trim()}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
            
            <div className="text-center pt-4 space-y-2">
              <p className="text-neo-text-secondary text-sm">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-neo-accent hover:text-neo-accent/80 font-semibold transition-colors"
                  disabled={isLoading}
                >
                  Sign Up
                </button>
              </p>
              {onBackToHome && (
                <p className="text-neo-text-secondary text-sm">
                  <button
                    type="button"
                    onClick={onBackToHome}
                    className="text-neo-accent hover:text-neo-accent/80 font-semibold transition-colors inline-flex items-center gap-1"
                    disabled={isLoading}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                  </button>
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
