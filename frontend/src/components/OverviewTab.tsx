'use client';

import React, { useState } from 'react';
import { Company, CentralWallet, Batch } from '@/types';
import { Building2, Wallet, ArrowUpRight, ShieldCheck, Clock, RefreshCw, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

interface OverviewTabProps {
  company: Company | null;
  wallets: CentralWallet[];
  batches: Batch[];
  onUploadClick: () => void;
  onRefreshClick: () => void;
  onCreateWallet: (walletName: string, openingBalance: number) => Promise<void>;
  onUpdateWalletBalance: (walletId: number, balance: number) => Promise<void>;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  company,
  wallets,
  batches,
  onUploadClick,
  onRefreshClick,
  onCreateWallet,
  onUpdateWalletBalance,
}) => {
  const [walletName, setWalletName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [updatedBalance, setUpdatedBalance] = useState('');
  const [walletMessage, setWalletMessage] = useState('');

  const createWallet = async (event: React.FormEvent) => {
    event.preventDefault();
    setWalletMessage('');
    try {
      await onCreateWallet(walletName, Number(openingBalance));
      setWalletName('');
      setOpeningBalance('0');
      setWalletMessage('Wallet created successfully.');
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : 'Unable to create wallet.');
    }
  };

  const updateWalletBalance = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedWalletId) return;
    setWalletMessage('');
    try {
      await onUpdateWalletBalance(Number(selectedWalletId), Number(updatedBalance));
      setUpdatedBalance('');
      setWalletMessage('Wallet balance updated successfully.');
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : 'Unable to update wallet balance.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Asymmetric Top Grid: Company Profile & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Company Profile Card (Spans 2 Cols) */}
        <div className="lg:col-span-2 card-flat p-6 flex flex-col justify-between relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-[#2d3142] text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-md border border-slate-200">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#2d3142] font-outfit tracking-tight">
                  {company?.company_name || 'Leading FMCG Conglomerate (PRAN-RFL Alignment)'}
                </h2>
                <div className="flex items-center space-x-3 text-xs text-slate-500 mt-2">
                  <span className="font-semibold text-[#4f5d75] bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    Account: {company?.corporate_account_number || 'UPAY-CORP-FMCG-1001'}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef8354]"></span>
                    <span>Registered Corporate Client</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onRefreshClick}
              className="p-2.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all self-start sm:self-auto"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-5 text-xs">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Account Status</span>
              <div className="font-bold text-slate-900 mt-1 font-space">{company?.status || 'ACTIVE'}</div>
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Central Wallets</span>
              <div className="font-bold text-slate-900 mt-1 font-mono">{wallets.length} Active Wallets</div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Compliance Status</span>
              <div className="font-bold text-[#ef8354] mt-1 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#ef8354]" />
                <span>Verified Active</span>
              </div>
            </div>
          </div>

        </div>

        {/* Quick Disbursement Action Card (1 Col) */}
        <div className="card-flat bg-white border border-slate-100 p-6 flex flex-col justify-between relative overflow-hidden rounded-xl">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1 rounded-xl text-[11px] font-bold mb-5">
              <Layers className="w-3.5 h-3.5" />
              <span>Bulk Disbursement Engine</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[90%]">
              Upload employee spreadsheets for instant core account verification & AI risk shield audit.
            </p>
          </div>

          <button
            onClick={onUploadClick}
            className="mt-6 bg-[#ef8354] hover:bg-[#ef8354]/90 active:scale-[0.98] text-white font-extrabold px-5 py-3 rounded-xl text-xs flex items-center justify-between transition-all shadow-sm group"
          >
            <span>Start HR Bulk Upload</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>

      </div>

      <div className="card-flat p-6">
        <div className="pb-4 mb-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-900 text-base font-outfit">HR Wallet Management</h3>
          <p className="text-xs text-slate-500 mt-0.5">Create a corporate wallet or update the balance of an existing wallet. Every change is audited.</p>
        </div>
        {walletMessage && <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">{walletMessage}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <form onSubmit={createWallet} className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-800">Create corporate wallet</p>
            <input required value={walletName} onChange={(event) => setWalletName(event.target.value)} placeholder="Wallet name" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
            <input required min="0" step="0.01" type="number" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} placeholder="Opening balance" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
            <button className="rounded-lg bg-[#2d3142] px-3 py-2 text-xs font-bold text-white">Create wallet</button>
          </form>
          <form onSubmit={updateWalletBalance} className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-800">Update wallet balance</p>
            <select required value={selectedWalletId} onChange={(event) => setSelectedWalletId(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="">Select wallet</option>
              {wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.wallet_name} — {wallet.account_number}</option>)}
            </select>
            <input required min="0" step="0.01" type="number" value={updatedBalance} onChange={(event) => setUpdatedBalance(event.target.value)} placeholder="New balance" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
            <button className="rounded-lg bg-[#ef8354] px-3 py-2 text-xs font-bold text-white">Save balance</button>
          </form>
        </div>
      </div>

      {/* Central Wallets Grid */}
      <div className="card-flat p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base font-outfit">Corporate Central Wallets</h3>
            
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">{wallets.length} Accounts</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wallets.length === 0 ? (
            <div className="col-span-2 py-6 text-center text-slate-400 text-xs">No central wallets found.</div>
          ) : (
            wallets.map((w) => (
              <div key={w.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 bg-[#ef8354] text-white rounded-xl flex items-center justify-center font-bold">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#2d3142] font-outfit">{w.wallet_name}</div>
                    <div className="text-[11px] font-mono text-slate-500">{w.account_number} ({w.wallet_type})</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#2d3142] font-mono">
                    BDT {w.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] font-bold text-[#ef8354] uppercase bg-[#ef8354]/10 px-2 py-0.5 rounded-md mt-1 inline-block">
                    {w.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Disbursement Batches History */}
      <div className="card-flat p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base font-outfit">Recent Disbursement Batches</h3>
            <p className="text-xs text-slate-500 mt-0.5">Audit log of submitted HR payroll files and approval state</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">{batches.length} Batches Total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="pb-3">Batch File</th>
                <th className="pb-3">Maker Name</th>
                <th className="pb-3">Total Payees</th>
                <th className="pb-3">Total Payout</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No disbursement history recorded.</td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 font-mono text-slate-900 font-bold">{b.file_name}</td>
                    <td className="py-3.5 font-semibold text-slate-800 font-outfit">{b.maker_name || `Maker #${b.maker_id}`}</td>
                    <td className="py-3.5 font-mono">{b.total_records} Employees</td>
                    <td className="py-3.5 font-bold text-slate-900 font-mono">BDT {b.total_amount.toLocaleString()}</td>
                    <td className="py-3.5">
                      {b.status === 'EXECUTED' || b.status === 'APPROVED' ? (
                        <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Approved & Executed</span>
                        </span>
                      ) : b.status === 'FLAGGED_RISK' ? (
                        <span className="inline-flex items-center space-x-1 bg-[#ef8354]/10 text-[#ef8354] px-2.5 py-1 rounded-xl font-bold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#ef8354]" />
                          <span>Flagged for Review</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-xl font-bold text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Pending Checker Approval</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-right text-slate-500 font-mono">
                      {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
