import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';

interface RegisterFormProps {
  onRegister: (username: string, password: string) => Promise<void>;
  onSwitchToLogin: () => void;
  onBackToHome?: () => void;
  isLoading?: boolean;
  error?: string;
}

export default function RegisterForm({ onRegister, onSwitchToLogin, onBackToHome, isLoading, error }: RegisterFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      setValidationError('All fields are required');
      return;
    }

    if (username.trim().length < 3) {
      setValidationError('Username must be at least 3 characters long');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    await onRegister(username.trim(), password);
  };

  const displayError = validationError || error;

  return (
    <div className="min-h-screen bg-casino-green flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-casino-black border-casino-gold border-2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-casino-gold mb-2">
            👑 Join KingGames 👑
          </CardTitle>
          <p className="text-white text-sm">
            Create your account
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {displayError && (
              <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
                {displayError}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username (min 3 chars)"
                className="bg-casino-green border-casino-gold text-white placeholder-gray-300"
                disabled={isLoading}
                required
                minLength={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password (min 6 chars)"
                className="bg-casino-green border-casino-gold text-white placeholder-gray-300"
                disabled={isLoading}
                required
                minLength={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="bg-casino-green border-casino-gold text-white placeholder-gray-300"
                disabled={isLoading}
                required
                minLength={6}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-casino-red hover:bg-red-700 text-white font-bold py-3 text-lg glow-red"
              disabled={isLoading || !username.trim() || !password.trim() || !confirmPassword.trim()}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
            
            <div className="text-center pt-4 space-y-2">
              <p className="text-white text-sm">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-casino-gold hover:underline font-semibold"
                  disabled={isLoading}
                >
                  Sign In
                </button>
              </p>
              {onBackToHome && (
                <p className="text-white text-sm">
                  <button
                    type="button"
                    onClick={onBackToHome}
                    className="text-casino-gold hover:underline font-semibold"
                    disabled={isLoading}
                  >
                    ← Back to Home
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