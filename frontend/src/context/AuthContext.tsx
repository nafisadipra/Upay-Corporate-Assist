'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: Array<'MAKER' | 'CHECKER' | 'ADMIN'>) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const CORPORATE_PORTAL_HEADERS = { 'X-Upay-Portal': 'corporate' };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    void fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: CORPORATE_PORTAL_HEADERS,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch(`${API_BASE_URL}/auth/session`, {
      credentials: 'include',
      headers: CORPORATE_PORTAL_HEADERS,
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (active) setUser(payload?.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener('upay_auth_expired', handleAuthExpired);
    return () => {
      active = false;
      window.removeEventListener('upay_auth_expired', handleAuthExpired);
    };
  }, [logout]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...CORPORATE_PORTAL_HEADERS },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Authentication failed');
    }

    const data = await res.json();
    setUser(data.user);
  };

  const hasRole = (roles: Array<'MAKER' | 'CHECKER' | 'ADMIN'>) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasRole }}>
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
