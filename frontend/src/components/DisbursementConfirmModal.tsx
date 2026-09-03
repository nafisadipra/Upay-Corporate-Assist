'use client';

import { useEffect } from 'react';
import { AlertTriangle, ArrowRight, Building2, LoaderCircle, X } from 'lucide-react';

interface DisbursementConfirmModalProps {
  isOpen: boolean;
  amount: number;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DisbursementConfirmModal({
  isOpen,
  amount,
  isSubmitting,
  onCancel,
  onConfirm,
}: DisbursementConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen) return null;

  const formattedAmount = new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#182032]/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isSubmitting && onCancel()}>
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="disbursement-title"
        aria-describedby="disbursement-description"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-[#fbfcf9] shadow-[0_28px_80px_-24px_rgba(20,30,45,.65)]"
      >
        <div className="h-1.5 bg-[#ef8354]" />
        <div className="px-6 pb-7 pt-5 sm:px-7">
          <div className="flex items-start justify-between gap-5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-50 text-[#e86f3c]">
              <AlertTriangle className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <button type="button" onClick={onCancel} disabled={isSubmitting} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#2d3142] focus:outline-none focus:ring-2 focus:ring-[#ef8354]/40 disabled:opacity-40" aria-label="Close confirmation">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#ef8354]">Final authorization</p>
            <h2 id="disbursement-title" className="mt-2 font-outfit text-2xl font-extrabold tracking-tight text-[#2d3142]">Execute this payroll?</h2>
            <p id="disbursement-description" className="mt-2 max-w-sm text-sm leading-6 text-slate-500">This will release the approved payroll from the company&apos;s central wallet. This action cannot be undone.</p>
          </div>

          <div className="mt-6 rounded-xl border border-[#dce7dd] bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#2d3142] text-white"><Building2 className="h-4 w-4" /></span>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From</p><p className="mt-0.5 text-xs font-bold text-[#2d3142]">Central wallet</p></div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300" />
              <div className="text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total payout</p><p className="mt-0.5 font-mono text-sm font-extrabold text-[#2d3142]">BDT {formattedAmount}</p></div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <button type="button" onClick={onCancel} disabled={isSubmitting} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-[#4f5d75] transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={onConfirm} disabled={isSubmitting} className="flex items-center justify-center gap-2 rounded-xl bg-[#059669] px-4 py-3 text-sm font-extrabold text-white shadow-[0_10px_24px_-12px_rgba(5,150,105,.8)] transition-all hover:bg-[#047857] active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-[#059669]/35 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70">
              {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Executing…' : 'Confirm & execute'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
