'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Company, CentralWallet, Batch, BatchItem, RiskAlert, LiquidityForecast, AuditLog } from '@/types';
import * as api from '@/lib/api';
import { Header } from '@/components/Header';
import { OverviewTab } from '@/components/OverviewTab';
import { UploadTab } from '@/components/UploadTab';
import { AnalyticsTab } from '@/components/AnalyticsTab';
import { AuditTab } from '@/components/AuditTab';
import { TypoModal } from '@/components/TypoModal';
import { LoginForm } from '@/components/LoginForm';
import { EmployeeRegistrationTab } from '@/components/EmployeeRegistrationTab';
import { Vault, Send, AlertTriangle, Clock } from 'lucide-react';

export type WorkspaceTab = 'overview' | 'upload' | 'registration' | 'checker' | 'analytics' | 'audit';

type WorkspaceProps = {
  initialTab?: WorkspaceTab;
};

function DashboardContent({ initialTab = 'overview' }: WorkspaceProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  
  // Live State from PostgreSQL via Flask API
  const [company, setCompany] = useState<Company | null>(null);
  const [wallets, setWallets] = useState<CentralWallet[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [forecasts, setForecasts] = useState<LiquidityForecast[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modal States
  const [isTypoModalOpen, setIsTypoModalOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<BatchItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      const compId = user?.company_id || 1;
      const compData = await api.fetchCompany(compId);
      setCompany(compData.company);
      setWallets(compData.company.wallets || []);

      const batchData = await api.fetchBatches(compId);
      setBatches(batchData.batches || []);
      
      const activeB = batchData.batches && batchData.batches.length > 0 ? batchData.batches[0] : null;
      setCurrentBatch(activeB);

      if (activeB) {
        const itemsData = await api.fetchBatchItems(activeB.id);
        setItems(itemsData.items || []);

        const logsData = await api.fetchAuditLogs(activeB.id);
        setAuditLogs(logsData.audit_logs || []);
      }

      const alertsData = await api.fetchRiskAlerts();
      setRiskAlerts(alertsData.risk_alerts || []);

      const forecastData = await api.fetchLiquidityForecast(compId);
      setForecasts(forecastData.liquidity_forecasts || []);

    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Your session is no longer valid. Please sign in again.') {
        return;
      }
      console.error('API Load Error:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void (async () => {
        await loadData();
      })();
    }
  }, [user, loadData]);

  useEffect(() => {
    if (user?.role === 'CHECKER') {
      router.replace('/checker');
    }
  }, [router, user]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#f7f9f6] flex items-center justify-center">
        <div className="text-emerald-700 font-bold text-xs font-outfit">
          Authenticating session against PostgreSQL...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  if (user.role === 'CHECKER') {
    return null;
  }

  // Upload Spreadsheet Handler (MAKER Scope)
  const handleFileUpload = async (file: File) => {
    try {
      const res = await api.uploadPayrollFile(file, user.company_id || 1, user.id);
      setCurrentBatch(res.batch);
      setItems(res.items);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'File upload failed');
    }
  };

  const handleLoadSample = async () => {
    try {
      const res = await api.fetchBatchItems(1);
      setItems(res.items);
      loadData();
    } catch {
      loadData();
    }
  };

  const handleEditTypoClick = (item: BatchItem) => {
    setSelectedItemForEdit(item);
    setIsTypoModalOpen(true);
  };

  const handleSaveTypoCorrection = async (itemId: number, correctedPhone: string) => {
    try {
      await api.correctItemPhone(itemId, correctedPhone);
      setIsTypoModalOpen(false);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save correction');
    }
  };

  const handleSubmitBatch = async () => {
    if (!currentBatch) return;
    try {
      await api.submitBatch(currentBatch.id);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to submit batch');
    }
  };

  const handleExecuteDisbursal = async () => {
    if (!currentBatch) return;
    if (!confirm(`Execute final disbursement of BDT ${currentBatch.total_amount.toLocaleString()} from central wallet?`)) return;
    try {
      await api.executeBatch(currentBatch.id);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to execute disbursement');
    }
  };

  const handleCreateWallet = async (walletName: string, openingBalance: number) => {
    if (!user?.company_id) throw new Error('A company assignment is required to create a wallet.');
    await api.createCompanyWallet(user.company_id, { wallet_name: walletName, opening_balance: openingBalance });
    await loadData();
  };

  const handleUpdateWalletBalance = async (walletId: number, balance: number) => {
    if (!user?.company_id) throw new Error('A company assignment is required to update a wallet.');
    await api.updateCompanyWallet(user.company_id, walletId, { balance });
    await loadData();
  };

  const walletBal = company?.central_wallet_balance || 0;
  const totalDisbursed = batches
    .filter((b) => b.status === 'APPROVED' || b.status === 'EXECUTED')
    .reduce((acc, b) => acc + b.total_amount, 0);

  const flaggedCount = items.filter((i) => i.is_anomaly || i.account_validation_status !== 'VALID').length;
  const pendingApprovalAmount = batches
    .filter((b) => b.status === 'FLAGGED_RISK' || b.status === 'PENDING_CHECKER_REVIEW' || b.status === 'CHECKER_REVIEWED')
    .reduce((acc, b) => acc + b.total_amount, 0);

  return (
    <div className="app-shell text-slate-900 font-sans antialiased flex flex-col justify-between">
      
      <div className="lg:pl-[272px]">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          riskAlertCount={riskAlerts.filter((a) => a.review_status === 'PENDING_REVIEW').length}
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          
          {/* KPI Cards embedded directly */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Wallet Balance Card */}
              <div className="card-flat bg-white border border-slate-100 rounded-xl p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Central Wallet Vault</span>
                  <div className="w-10 h-10 bg-[#2d3142] rounded-lg flex items-center justify-center text-white">
                    <Vault className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-extrabold text-[#2d3142] font-outfit tracking-tight">
                    BDT <span className="font-mono">{walletBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-xs text-slate-600 font-bold mt-1 flex items-center space-x-1">
                    
                  </div>
                </div>
              </div>

              {/* Total Disbursed Card */}
              <div className="card-flat bg-white border border-slate-100 rounded-xl p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Total Disbursed</span>
                  <div className="w-10 h-10 bg-[#2d3142] rounded-lg flex items-center justify-center text-white">
                    <Send className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-extrabold text-[#2d3142] font-outfit tracking-tight">
                    BDT <span className="font-mono">{totalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-1">
                    
                  </div>
                </div>
              </div>

              {/* Bento Grid Flags Card (Orange Accent) */}
              <div className="card-flat bg-white border border-slate-100 rounded-xl p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Bento Grid Flags</span>
                  <div className="w-10 h-10 bg-[#ef8354] rounded-lg flex items-center justify-center text-white">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-extrabold text-[#2d3142] font-outfit tracking-tight">
                    {flaggedCount} {flaggedCount === 1 ? 'Item' : 'Items'}
                  </div>
                  
                </div>
              </div>

              {/* Pending Approvals Card */}
              <div className="card-flat bg-white border border-slate-100 rounded-xl p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Pending Approval</span>
                  <div className="w-10 h-10 bg-[#2d3142] rounded-lg flex items-center justify-center text-white">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-extrabold text-[#2d3142] font-outfit tracking-tight">
                    BDT <span className="font-mono">{pendingApprovalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">
                    
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Tab Views */}
          {activeTab === 'overview' && (
            <OverviewTab
              company={company}
              wallets={wallets}
              batches={batches}
              onUploadClick={() => setActiveTab('upload')}
              onRefreshClick={loadData}
              onCreateWallet={handleCreateWallet}
              onUpdateWalletBalance={handleUpdateWalletBalance}
            />
          )}

          {activeTab === 'upload' && (
            <UploadTab
              currentBatch={currentBatch}
              items={items}
              onFileUpload={handleFileUpload}
              onEditTypo={handleEditTypoClick}
              onSubmitBatch={handleSubmitBatch}
              onLoadSample={handleLoadSample}
              onExecuteDisbursal={handleExecuteDisbursal}
            />
          )}

          {activeTab === 'registration' && <EmployeeRegistrationTab />}

          {activeTab === 'analytics' && (
            <AnalyticsTab forecasts={forecasts} />
          )}

          {activeTab === 'audit' && (
            <AuditTab logs={auditLogs} />
          )}

        </main>
      </div>

      {/* Inline Typo Correction Modal */}
      <TypoModal
        isOpen={isTypoModalOpen}
        item={selectedItemForEdit}
        onClose={() => setIsTypoModalOpen(false)}
        onSave={handleSaveTypoCorrection}
      />

    </div>
  );
}

export default function Maker({ initialTab }: WorkspaceProps) {
  return (
    <AuthProvider>
      <DashboardContent initialTab={initialTab} />
    </AuthProvider>
  );
}
