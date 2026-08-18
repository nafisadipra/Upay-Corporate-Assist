'use client';

import React from 'react';
import { Vault, Send, AlertTriangle, Clock } from 'lucide-react';

interface KpiCardsProps {
  walletBalance: number;
  totalDisbursed: number;
  flaggedCount: number;
  pendingApprovalAmount: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  walletBalance,
  totalDisbursed,
  flaggedCount,
  pendingApprovalAmount,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Wallet Balance Card */}
      <div className="card-flat p-5 flex flex-col justify-between border-t-4 border-t-emerald-700">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Central Wallet Vault</span>
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700">
            <Vault className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-extrabold text-slate-900 font-outfit tracking-tight">
            BDT <span className="font-mono">{walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="text-xs text-emerald-700 font-bold mt-1 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>Pre-funded settlement wallet</span>
          </div>
        </div>
      </div>

      {/* Total Disbursed Card */}
      <div className="card-flat p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Disbursed</span>
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700">
            <Send className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-extrabold text-slate-900 font-outfit tracking-tight">
            BDT <span className="font-mono">{totalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="text-xs text-emerald-700 font-bold mt-1">
            Executed payout disbursements
          </div>
        </div>
      </div>

      {/* Bento Grid Flags Card (5% Yellow Accent) */}
      <div className="card-flat p-5 flex flex-col justify-between border-amber-300 bg-[#fffdf5]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">Bento Grid Flags</span>
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 border border-amber-300">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-extrabold text-amber-950 font-outfit tracking-tight">
            {flaggedCount} {flaggedCount === 1 ? 'Item' : 'Items'}
          </div>
          <div className="text-xs font-bold text-amber-950 mt-1 inline-flex items-center space-x-1 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
            <span>Requires Director Review</span>
          </div>
        </div>
      </div>

      {/* Pending Approvals Card */}
      <div className="card-flat p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pending Approval</span>
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-extrabold text-slate-900 font-outfit tracking-tight">
            BDT <span className="font-mono">{pendingApprovalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="text-xs text-slate-500 font-semibold mt-1">
            Awaiting 2FA OTP Sign-off
          </div>
        </div>
      </div>

    </div>
  );
};
