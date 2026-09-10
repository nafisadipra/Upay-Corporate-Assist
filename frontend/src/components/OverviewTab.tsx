'use client';

import React, { useState } from 'react';
import { Company, CentralWallet, Batch } from '@/types';
import { Building2, Wallet, ArrowUpRight, ArrowRightLeft, ShieldCheck, Clock, RefreshCw, CheckCircle2, AlertTriangle, Layers, Plus, ChevronDown } from 'lucide-react';

interface OverviewTabProps {
  company: Company | null;
  wallets: CentralWallet[];
  batches: Batch[];
  onUploadClick: () => void;
  onRefreshClick: () => void;
  onCreateWallet: (walletName: string, walletType: string) => Promise<void>;
  onTransferFunds: (sourceWalletId: number, destinationWalletId: number, amount: number) => Promise<void>;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  company,
  wallets,
  batches,
  onUploadClick,
  onRefreshClick,
  onCreateWallet,
  onTransferFunds,
}) => {
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState('OPERATIONAL');
  const [destinationWalletId, setDestinationWalletId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [walletMessage, setWalletMessage] = useState('');
  const [walletError, setWalletError] = useState('');
  const [walletAction, setWalletAction] = useState<'create' | 'transfer' | null>(null);

  const normalizedWalletType = (wallet: CentralWallet) => wallet.wallet_type.trim().toUpperCase();
  const isActiveWallet = (wallet: CentralWallet) => wallet.status.trim().toUpperCase() === 'ACTIVE';
  const mainWallet = wallets.find((wallet) => normalizedWalletType(wallet) === 'MAIN' && isActiveWallet(wallet));
  const subWallets = wallets.filter((wallet) => normalizedWalletType(wallet) !== 'MAIN' && isActiveWallet(wallet));
  const selectedDestinationWallet = subWallets.find((wallet) => wallet.id === Number(destinationWalletId)) ?? subWallets[0];

  const createWallet = async (event: React.FormEvent) => {
    event.preventDefault();
    setWalletMessage('');
    setWalletError('');
    setWalletAction('create');
    try {
      await onCreateWallet(walletName.trim(), walletType);
      setWalletName('');
      setWalletMessage('Sub-wallet created with a zero balance. You can now allocate funds to it.');
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Unable to create wallet.');
    } finally {
      setWalletAction(null);
    }
  };

  const transferFunds = async (event: React.FormEvent) => {
    event.preventDefault();
    setWalletMessage('');
    setWalletError('');
    const amount = Number(transferAmount);
    if (!mainWallet || !selectedDestinationWallet || !Number.isFinite(amount) || amount <= 0) {
      setWalletError('Choose a destination wallet and enter a valid positive amount.');
      return;
    }
    setWalletAction('transfer');
    try {
      await onTransferFunds(mainWallet.id, selectedDestinationWallet.id, amount);
      setTransferAmount('');
      setWalletMessage('Funds allocated from the Main wallet successfully.');
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Unable to transfer wallet funds.');
    } finally {
      setWalletAction(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
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
                  {company?.company_name || 'Company data unavailable'}
                </h2>
                <div className="flex items-center space-x-3 text-xs text-slate-500 mt-2">
                  <span className="font-semibold text-[#4f5d75] bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    Account: {company?.corporate_account_number || 'Not available'}
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
              <div className="font-bold text-slate-900 mt-1 font-space">{company?.status || 'Unavailable'}</div>
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

      <div className="order-2 card-flat p-6">
        <div className="pb-4 mb-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-900 text-base font-outfit">HR Wallet Management</h3>
          <p className="text-xs text-slate-500 mt-1">Create sub-wallets and allocate existing funds from the Main central wallet. Every transfer is audited.</p>
        </div>

        {walletMessage && <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{walletMessage}</p>}
        {walletError && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{walletError}</p>}

        <div className="grid gap-4 lg:grid-cols-2">
          <form noValidate onSubmit={createWallet} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Plus className="h-4 w-4 text-[#ef8354]" />
              <p className="text-xs font-bold">Create a sub-wallet</p>
            </div>
            <input
              required
              value={walletName}
              onChange={(event) => setWalletName(event.target.value)}
              placeholder="For example: Festival Bonus"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
            <select value={walletType} onChange={(event) => setWalletType(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none">
              <option value="PAYROLL">Payroll</option>
              <option value="OPERATIONAL">Operational</option>
              <option value="FESTIVAL_BONUS">Festival bonus</option>
              <option value="VENDOR">Vendor</option>
            </select>
            <p className="text-[11px] text-slate-500">New wallets start at BDT 0.00 so company funds remain fully accounted for.</p>
            <button disabled={walletAction !== null} className="mt-auto rounded-lg bg-[#2d3142] px-3 py-2.5 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60">
              {walletAction === 'create' ? 'Creating...' : 'Create sub-wallet'}
            </button>
          </form>

          <form noValidate onSubmit={transferFunds} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-800">
              <ArrowRightLeft className="h-4 w-4 text-[#ef8354]" />
              <p className="text-xs font-bold">Allocate from Main wallet</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs">
              <span className="text-slate-500">Available in Main</span>
              <strong className="float-right font-mono text-slate-900">BDT {(mainWallet?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
            <label htmlFor="destination-wallet" className="text-[11px] font-bold text-slate-600">
              Select destination wallet
            </label>
            <div className="relative">
              <select
                id="destination-wallet"
                value={selectedDestinationWallet ? String(selectedDestinationWallet.id) : ''}
                onChange={(event) => setDestinationWalletId(event.target.value)}
                disabled={subWallets.length === 0 || walletAction !== null}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-[#ef8354] focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              >
                {subWallets.length === 0 ? (
                  <option value="">No sub-wallet available</option>
                ) : subWallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.wallet_name} · {wallet.wallet_type} · BDT {wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
            {subWallets.length === 0 && (
              <p className="text-[11px] text-slate-500">Create a Payroll, Operational, Bonus, or Vendor wallet first.</p>
            )}
            <input
              required
              min="0.01"
              max={mainWallet?.balance}
              step="0.01"
              type="number"
              value={transferAmount}
              onChange={(event) => setTransferAmount(event.target.value)}
              placeholder="Amount to allocate"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
            {!mainWallet && <p className="text-[11px] font-semibold text-red-700">No MAIN wallet is available. Ask upay Admin to fund the company; the top-up process provisions the MAIN wallet automatically.</p>}
            <button disabled={walletAction !== null || !mainWallet || !selectedDestinationWallet} className="mt-auto rounded-lg bg-[#ef8354] px-3 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {walletAction === 'transfer' ? 'Transferring...' : 'Transfer funds'}
            </button>
          </form>
        </div>
      </div>

      {/* Central Wallets Grid */}
      <div className="order-3 card-flat p-6">
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
      <div className="order-4 card-flat p-6">
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
