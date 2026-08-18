'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, ArrowRight, Building2, ShieldCheck } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid email address or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#f7f9f6] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-4xl w-full grid overflow-hidden rounded-2xl border border-[#dce7dd] bg-white shadow-[0_28px_70px_-42px_rgba(23,51,40,.45)] md:grid-cols-[.9fr_1.1fr]">
        <aside className="hidden bg-emerald-800 p-9 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-yellow-300 text-emerald-950">
              <Building2 className="h-5 w-5" />
            </div>
            <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-emerald-200">upay Corporate Assist</p>
            <h1 className="mt-3 font-outfit text-4xl font-extrabold tracking-tight">Payroll controls, clearly managed.</h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-emerald-100">Securely validate, review, and authorize your corporate payout batches.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-100">
            <ShieldCheck className="h-4 w-4 text-yellow-300" />
            Maker-checker authorization enabled
          </div>
        </aside>
        
        <div className="p-7 sm:p-9 space-y-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-emerald-700">Secure sign in</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#173328] font-outfit">Welcome back</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Use your corporate credentials to access the payout workspace.</p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3.5 rounded-2xl font-medium flex items-center space-x-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Corporate Email Input Field */}
            <div>
              <label className="block text-slate-800 font-bold mb-2 text-xs font-space">
                Corporate Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="i-dipra@upaybd.com"
                  className="w-full pl-11 pr-4 py-3 bg-[#f5f9f5] border border-[#dce7dd] focus:border-emerald-600 focus:bg-white focus:outline-none rounded-xl text-slate-900 font-medium font-mono transition-all text-xs"
                />
              </div>
            </div>

            {/* Password Input Field */}
            <div>
              <label className="block text-slate-800 font-bold mb-2 text-xs font-space">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-[#f5f9f5] border border-[#dce7dd] focus:border-emerald-600 focus:bg-white focus:outline-none rounded-xl text-slate-900 font-medium transition-all text-xs"
                />
              </div>
            </div>

            {/* Sign In Full Width Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 text-sm font-space"
              >
                <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
};
