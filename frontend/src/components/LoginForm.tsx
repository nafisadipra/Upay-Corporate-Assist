'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, ArrowRight, Building2, ShieldCheck } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === 'MAKER') router.replace('/maker');
    if (user?.role === 'CHECKER') router.replace('/checker');
  }, [router, user]);

  const visibleError = error || (user?.role === 'ADMIN'
    ? 'Administrator accounts must use the upay Admin portal on port 3001.'
    : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email address or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#f7f9f6] flex items-center justify-center">
        <div className="text-emerald-700 font-bold text-xs font-outfit">Checking your session...</div>
      </div>
    );
  }

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
            <span>Maker-Checker Governance Architecture</span>
          </div>
        </aside>

        <section className="p-7 sm:p-10 flex flex-col justify-center">
          <div className="md:hidden flex items-center space-x-2.5 mb-6">
            <div className="w-8 h-8 bg-emerald-800 text-yellow-300 rounded-lg flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-outfit font-extrabold text-slate-900 tracking-tight">upay Corporate Assist</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-outfit">Sign in to your corporate workspace</h2>
            <p className="mt-1 text-xs text-slate-500">Enter your credentials to access your organization dashboard.</p>
          </div>

          {visibleError && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs font-semibold text-red-900 animate-in fade-in">
              {visibleError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 font-outfit">Corporate Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maker.tanvir@fmcg-corp.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white focus:outline-none rounded-xl text-slate-900 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5 font-outfit">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white focus:outline-none rounded-xl text-slate-900 transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-emerald-800 hover:bg-emerald-900 active:scale-[0.99] disabled:opacity-60 text-white font-extrabold py-3 rounded-xl transition-all shadow-md shadow-emerald-950/20 flex items-center justify-center space-x-2 text-xs"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </section>
      </div>
    </div>
  );
};
