'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsDemo: (role: 'MAKER' | 'CHECKER' | 'ADMIN') => Promise<void>;
  logout: () => void;
  hasRole: (roles: Array<'MAKER' | 'CHECKER' | 'ADMIN'>) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check saved session in localStorage
    const savedToken = localStorage.getItem('upay_auth_token');
    const savedUser = localStorage.getItem('upay_auth_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('upay_auth_token');
        localStorage.removeItem('upay_auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Authentication failed');
    }

    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('upay_auth_token', data.token);
    localStorage.setItem('upay_auth_user', JSON.stringify(data.user));
  };

  const loginAsDemo = async (role: 'MAKER' | 'CHECKER' | 'ADMIN') => {
    let email = 'maker.tanvir@fmcg-corp.com';
    if (role === 'CHECKER') email = 'checker.dipra@fmcg-corp.com';
    if (role === 'ADMIN') email = 'admin@upay.com.bd';

    await login(email, 'password123');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('upay_auth_token');
    localStorage.removeItem('upay_auth_user');
  };

  const hasRole = (roles: Array<'MAKER' | 'CHECKER' | 'ADMIN'>) => {
    if (!user) return false;
    return roles.includes(user.role as any);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, loginAsDemo, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
