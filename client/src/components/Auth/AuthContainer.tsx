import { useState } from 'react';
import { useAuthStore } from '../../lib/stores/useAuthStore';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

export default function AuthContainer() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const { login, register, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async (username: string, password: string) => {
    try {
      await login(username, password);
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleRegister = async (username: string, password: string) => {
    try {
      await register(username, password);
    } catch (error) {
      // Error is handled by the store
    }
  };

  const switchToLogin = () => {
    setIsLoginMode(true);
    clearError();
  };

  const switchToRegister = () => {
    setIsLoginMode(false);
    clearError();
  };

  if (isLoginMode) {
    return (
      <LoginForm
        onLogin={handleLogin}
        onSwitchToRegister={switchToRegister}
        isLoading={isLoading}
        error={error || undefined}
      />
    );
  }

  return (
    <RegisterForm
      onRegister={handleRegister}
      onSwitchToLogin={switchToLogin}
      isLoading={isLoading}
      error={error || undefined}
    />
  );
}