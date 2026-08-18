'use client';

import React, { useState } from 'react';
import { KeyRound, ShieldCheck, CheckCircle2, X, Sparkles } from 'lucide-react';

interface OtpModalProps {
  isOpen: boolean;
  demoOtpCode: string;
  onClose: () => void;
  onAuthorize: (otpCode: string) => void;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  demoOtpCode,
  onClose,
  onAuthorize,
}) => {
  const [otp, setOtp] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAuthorize(otp);
  };

  const handleUseDemoOtp = () => {
    setOtp(demoOtpCode || '123456');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white max-w-md w-full rounded-3xl border border-slate-200 shadow-xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-bold">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-space">2FA OTP Disbursal Authorization</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-300/80 text-amber-950 space-y-1.5 text-xs">
          <div className="flex items-center justify-between font-bold font-space text-amber-900">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Simulated SMS OTP Token Generated</span>
            </span>
            <button
              type="button"
              onClick={handleUseDemoOtp}
              className="text-[11px] font-bold text-emerald-800 hover:underline bg-white px-2 py-0.5 rounded-md border border-amber-300"
            >
              Fill OTP
            </button>
          </div>
          <div className="font-mono text-base font-extrabold text-amber-950 tracking-wider">
            {demoOtpCode || '123456'}
          </div>
          <p className="text-[11px] opacity-80">Enter this 6-digit SHA-256 hashed token to authorize central wallet disbursal.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 font-space">Enter 6-Digit OTP Code</label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none rounded-xl text-slate-900 font-mono text-center tracking-widest text-base font-bold"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Authorize Disbursal</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
