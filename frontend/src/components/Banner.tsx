'use client';

import React from 'react';
import { CircleCheck } from 'lucide-react';

export const Banner: React.FC = () => {
  return (
    <div className="rounded-xl border border-[#dce7dd] bg-white p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_10px_24px_-22px_rgba(23,51,40,.4)]">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700">
          <CircleCheck className="w-4 h-4" />
        </div>
        <p className="text-xs text-slate-700 font-medium">Your payroll workspace is ready.</p>
      </div>

      <div className="inline-flex items-center space-x-1.5 bg-[#fff7dc] text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg text-[11px] font-bold">
        <span>Secure payroll processing</span>
      </div>
    </div>
  );
};
