'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark, ArrowRight, Lock, Mail } from 'lucide-react';
import * as api from '@/lib/api';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@upay.com.bd');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const token = localStorage.getItem('upay_admin_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const session = await api.login(email, password);
      if (session.user.role !== 'ADMIN') {
        throw new Error('This workspace is available to upay administrators only.');
      }
      localStorage.setItem('upay_admin_token', session.token);
      localStorage.setItem('upay_admin_user', JSON.stringify(session.user));
      router.push('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="signin-page-wrapper">
      {/* Left Form Section */}
      <section className="signin-form-section">
        <div className="signin-card-container">
          <div className="signin-brand-header">
            <div className="signin-logo-badge">
              <Landmark size={24} color="#ffffff" />
            </div>
            <div>
              <span className="signin-app-tag">UPAY CORPORATE ASSIST</span>
              <h1 className="signin-title">Control room</h1>
              <p className="signin-subtitle">Portfolio funding and corporate payout oversight.</p>
            </div>
          </div>
          
          <form className="signin-form-element" onSubmit={submit}>
            <div className="form-field-group">
              <label htmlFor="emailInput" className="form-label">
                Email address
              </label>
              <div className="input-with-icon-wrap">
                <Mail size={18} className="input-icon" />
                <input 
                  id="emailInput"
                  type="email" 
                  className="custom-text-input"
                  placeholder="admin@upay.com.bd"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="form-field-group">
              <label htmlFor="passwordInput" className="form-label">
                Password
              </label>
              <div className="input-with-icon-wrap">
                <Lock size={18} className="input-icon" />
                <input 
                  id="passwordInput"
                  type="password" 
                  className="custom-text-input"
                  placeholder="Enter your password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>

            {error && (
              <div className="signin-error-alert">
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="signin-submit-btn"
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign in'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </section>
      
      {/* Right Hero Section */}
      <aside className="signin-hero-aside" aria-hidden="true">
        <div className="hero-decor-circle circle-1" />
        <div className="hero-decor-circle circle-2" />
        
        <div className="hero-aside-content">
          <span className="hero-aside-tag">CORPORATE LIQUIDITY</span>
          <strong className="hero-aside-heading">
            See the funding position before payroll day.
          </strong>
          <p className="hero-aside-subtext">
            Real-time analytics, automated liquidity forecasting, and multi-tenant disbursement oversight.
          </p>
        </div>
      </aside>
    </main>
  );
}
