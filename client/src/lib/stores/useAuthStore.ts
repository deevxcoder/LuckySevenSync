import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  username: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const authApi = {
  async login(username: string, password: string): Promise<User> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(errorData.message || 'Login failed');
    }

    return response.json();
  },

  async register(username: string, password: string): Promise<User> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(errorData.message || 'Registration failed');
    }

    return response.json();
  },

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', {
      method: 'POST',
    });
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
        error: null 
      }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),

      login: async (username, password) => {
        const { setLoading, setError, setUser } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          const user = await authApi.login(username, password);
          setUser(user);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          setError(message);
          throw error;
        } finally {
          setLoading(false);
        }
      },

      register: async (username, password) => {
        const { setLoading, setError, setUser } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          const user = await authApi.register(username, password);
          setUser(user);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Registration failed';
          setError(message);
          throw error;
        } finally {
          setLoading(false);
        }
      },

      logout: async () => {
        const { setLoading, setUser } = get();
        
        try {
          setLoading(true);
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          setUser(null);
          setLoading(false);
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);