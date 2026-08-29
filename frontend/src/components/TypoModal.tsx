'use client';

import React, { useState } from 'react';
import { BatchItem } from '@/types';
import { Edit3, CheckCircle2, Phone, X } from 'lucide-react';

interface TypoModalProps {
  isOpen: boolean;
  item: BatchItem | null;
  onClose: () => void;
  onSave: (itemId: number, correctedPhone: string) => void;
}

function TypoForm({
  item,
  onClose,
  onSave,
}: {
  item: BatchItem;
  onClose: () => void;
  onSave: (itemId: number, correctedPhone: string) => void;
}) {
  const [phone, setPhone] = useState(item.corrected_phone_number || item.raw_phone_number);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(item.id, phone);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div>
        <label className="block text-slate-700 font-bold mb-1.5 font-space">Corrected Upay Phone Number</label>
        <div className="relative">
          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01711112233"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none rounded-xl text-slate-900 font-mono text-sm"
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-1">Re-runs core account DB lookup instantly upon saving.</p>
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
          <span>Verify & Save</span>
        </button>
      </div>
    </form>
  );
}

export const TypoModal: React.FC<TypoModalProps> = ({
  isOpen,
  item,
  onClose,
  onSave,
}) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white max-w-md w-full rounded-3xl border border-slate-200 shadow-xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-bold">
              <Edit3 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-space">Fix Phone Typo Inline</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
          <div className="font-bold text-slate-900 font-space text-sm">{item.employee_name}</div>
          <div className="text-slate-500 font-mono">Department: {item.department} | Payout: BDT {item.amount.toLocaleString()}</div>
          <div className="text-red-700 font-semibold pt-1">
            Status: {item.account_validation_status}
          </div>
        </div>

        <TypoForm key={item.id} item={item} onClose={onClose} onSave={onSave} />

      </div>
    </div>
  );
};
