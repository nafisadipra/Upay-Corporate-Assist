'use client';

import React, { createContext, useContext, useState, useEffect, startTransition, useCallback } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: Array<'MAKER' | 'CHECKER' | 'ADMIN'>) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

/** Returns the expiry time in milliseconds, or null when the JWT is malformed. */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenUsable(token: string): boolean {
  const expiresAt = getTokenExpiry(token);
  return expiresAt !== null && expiresAt > Date.now();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('upay_auth_token');
      localStorage.removeItem('upay_auth_user');
    }
  }, []);

  useEffect(() => {
    // Check saved session in localStorage
    const savedToken = localStorage.getItem('upay_auth_token');
    const savedUser = localStorage.getItem('upay_auth_user');

    if (savedToken && savedUser && isTokenUsable(savedToken)) {
      try {
        const parsed = JSON.parse(savedUser) as User;
        startTransition(() => {
          setToken(savedToken);
          setUser(parsed);
        });
      } catch {
        localStorage.removeItem('upay_auth_token');
        localStorage.removeItem('upay_auth_user');
      }
    } else if (savedToken || savedUser) {
      localStorage.removeItem('upay_auth_token');
      localStorage.removeItem('upay_auth_user');
    }

    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener('upay_auth_expired', handleAuthExpired);
    startTransition(() => {
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener('upay_auth_expired', handleAuthExpired);
    };
  }, [logout]);

  useEffect(() => {
    if (!token) return;

    const expiresAt = getTokenExpiry(token);
    if (expiresAt === null) return;

    const timeout = window.setTimeout(logout, Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [token, logout]);

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

  const hasRole = (roles: Array<'MAKER' | 'CHECKER' | 'ADMIN'>) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, hasRole }}>
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
