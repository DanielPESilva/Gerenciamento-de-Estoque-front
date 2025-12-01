'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { User, LoginRequest } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  updateUser: (data: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const syncUser = (nextUser: User | null) => {
    if (nextUser) {
      localStorage.setItem('user', JSON.stringify(nextUser));
    } else {
      localStorage.removeItem('user');
    }
    setUser(nextUser);
  };

  const login = async (data: LoginRequest) => {
    try {
      const response = await authService.login(data);
      
      // A API retorna { data: { user, accessToken, refreshToken }, error: false }
      if (response.data && !response.error) {
        const { user, accessToken, refreshToken } = response.data;
        
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        syncUser(user);
        router.push('/dashboard');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    syncUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        updateUser: syncUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
