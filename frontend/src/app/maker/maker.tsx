'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Company, CentralWallet, Batch, BatchItem, RiskAlert, ForecastResponse, ForecastSettings, AuditLog } from '@/types';
import * as api from '@/lib/api';
import { Header } from '@/components/Header';
import { OverviewTab } from '@/components/OverviewTab';
import { UploadTab } from '@/components/UploadTab';
import { AnalyticsTab } from '@/components/AnalyticsTab';
import { AuditTab } from '@/components/AuditTab';
import { PayrollItemCorrection, TypoModal } from '@/components/TypoModal';
import { EmployeeRegistrationTab } from '@/components/EmployeeRegistrationTab';
import { DisbursementConfirmModal } from '@/components/DisbursementConfirmModal';
import { PayrollArchiveTab } from '@/components/PayrollArchiveTab';
import { ReviewTab } from '@/components/ReviewTab';
import { Vault, Send, AlertTriangle, Clock } from 'lucide-react';

export type WorkspaceTab = 'overview' | 'upload' | 'review' | 'registration' | 'checker' | 'analytics' | 'audit' | 'archive';

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
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [isForecastRefreshing, setIsForecastRefreshing] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');

  // Modal States
  const [isTypoModalOpen, setIsTypoModalOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<BatchItem | null>(null);
  const [isDisbursementModalOpen, setIsDisbursementModalOpen] = useState(false);
  const [isExecutingDisbursement, setIsExecutingDisbursement] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const compId = user?.company_id || 1;
      const compData = await api.fetchCompany(compId);
      setCompany(compData.company);
      setWallets(compData.company.wallets || []);

      const batchData = await api.fetchBatches(compId);
      setBatches(batchData.batches || []);
      
      const availableBatches: Batch[] = batchData.batches || [];
      const defaultBatch = availableBatches[0] || null;
      const activePeriod = selectedPeriod || defaultBatch?.payroll_period?.slice(0, 7) || '';
      const activeB = availableBatches.find((batch) => batch.payroll_period?.slice(0, 7) === activePeriod) || null;
      setCurrentBatch(activeB);
      if (!selectedPeriod && activePeriod) setSelectedPeriod(activePeriod);

      if (activeB) {
        const itemsData = await api.fetchBatchItems(activeB.id);
        setItems(itemsData.items || []);

        const logsData = await api.fetchAuditLogs(activeB.id);
        setAuditLogs(logsData.audit_logs || []);
      } else {
        setItems([]);
        setAuditLogs([]);
      }

      if (activeB) {
        const alertsData = await api.fetchRiskAlerts(activeB.id);
        setRiskAlerts(alertsData.risk_alerts || []);
      } else {
        setRiskAlerts([]);
      }

      const forecastData = await api.fetchLiquidityForecast(compId);
      setForecast(forecastData as ForecastResponse);

    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Your session is no longer valid. Please sign in again.') {
        return;
      }
      console.error('API Load Error:', err);
    }
  }, [selectedPeriod, user]);

  useEffect(() => {
    if (user?.role !== 'MAKER') return;
    void (async () => {
      await loadData();
    })();
    const refreshTimer = window.setInterval(() => void loadData(), 15_000);
    return () => window.clearInterval(refreshTimer);
  }, [user, loadData]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace('/');
    else if (user.role === 'CHECKER') router.replace('/checker');
    else if (user.role !== 'MAKER') router.replace('/');
  }, [isLoading, router, user]);

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
    return null;
  }

  if (user.role !== 'MAKER') {
    return null;
  }

  // Upload Spreadsheet Handler (MAKER Scope)
  const handleFileUpload = async (file: File, payrollPeriod: string) => {
    try {
      const res = await api.uploadPayrollFile(file, user.company_id || 1, user.id, payrollPeriod);
      setSelectedPeriod(payrollPeriod);
      setCurrentBatch(res.batch);
      setItems(res.items);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'File upload failed');
    }
  };

  const handleEditTypoClick = (item: BatchItem) => {
    setSelectedItemForEdit(item);
    setIsTypoModalOpen(true);
  };

  const handleSaveTypoCorrection = async (itemId: number, correction: PayrollItemCorrection) => {
    try {
      await api.correctPayrollItem(itemId, correction);
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
    setIsDisbursementModalOpen(true);
  };

  const confirmExecuteDisbursal = async () => {
    if (!currentBatch || isExecutingDisbursement) return;
    setIsExecutingDisbursement(true);
    try {
      await api.executeBatch(currentBatch.id);
      setIsDisbursementModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to execute disbursement');
    } finally {
      setIsExecutingDisbursement(false);
    }
  };

  const handleRefreshForecast = async () => {
    if (!user?.company_id) return;
    setIsForecastRefreshing(true);
    try {
      const refreshedForecast = await api.refreshLiquidityForecast(user.company_id);
      setForecast(refreshedForecast as ForecastResponse);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Unable to refresh your company forecast');
    } finally {
      setIsForecastRefreshing(false);
    }
  };

  const handleSaveForecastSettings = async (settings: ForecastSettings) => {
    if (!user?.company_id) throw new Error('A company assignment is required to update forecast settings.');
    await api.updateForecastSettings(user.company_id, settings);
    const updatedForecast = await api.fetchLiquidityForecast(user.company_id);
    setForecast(updatedForecast as ForecastResponse);
  };

  const handleCreateWallet = async (walletName: string, walletType: string) => {
    if (!user?.company_id) throw new Error('A company assignment is required to create a wallet.');
    await api.createCompanyWallet(user.company_id, { wallet_name: walletName, wallet_type: walletType });
    await loadData();
  };

  const handleTransferWalletFunds = async (sourceWalletId: number, destinationWalletId: number, amount: number) => {
    if (!user?.company_id) throw new Error('A company assignment is required to transfer wallet funds.');
    await api.transferCompanyWalletFunds(user.company_id, {
      source_wallet_id: sourceWalletId,
      destination_wallet_id: destinationWalletId,
      amount,
    });
    await loadData();
  };

  const walletBal = company?.central_wallet_balance || 0;
  const filteredBatches = batches.filter((batch) => batch.payroll_period?.slice(0, 7) === selectedPeriod);
  const totalDisbursed = filteredBatches
    .filter((b) => b.status === 'EXECUTED')
    .reduce((acc, b) => acc + b.total_amount, 0);

  const flaggedCount = items.filter((i) => i.is_anomaly || i.account_validation_status !== 'VALID').length;
  const pendingApprovalAmount = filteredBatches
    .filter((b) => b.status === 'FLAGGED_RISK' || b.status === 'PENDING_CHECKER_REVIEW' || b.status === 'CHECKER_REVIEWED')
    .reduce((acc, b) => acc + b.total_amount, 0);

  return (
    <div className="app-shell text-slate-900 font-sans antialiased flex flex-col justify-between">
      
      <div className="lg:pl-[272px]">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          riskAlertCount={riskAlerts.filter((alert) => alert.review_status === 'PENDING_REVIEW' && alert.flag_type.startsWith('MANUAL_')).length}
          financeSignOffReady={currentBatch?.status === 'CHECKER_REVIEWED'}
          batchStatus={currentBatch?.status}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
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
              batches={filteredBatches}
              onUploadClick={() => setActiveTab('upload')}
              onRefreshClick={loadData}
              onCreateWallet={handleCreateWallet}
              onTransferFunds={handleTransferWalletFunds}
            />
          )}

          {activeTab === 'upload' && (
            <UploadTab
              currentBatch={currentBatch}
              items={items}
              hasFinanceReviews={riskAlerts.some((alert) => alert.flag_type.startsWith('MANUAL_'))}
              onFileUpload={handleFileUpload}
              onEditTypo={handleEditTypoClick}
              onSubmitBatch={handleSubmitBatch}
              onExecuteDisbursal={handleExecuteDisbursal}
              payrollPeriod={selectedPeriod}
            />
          )}

          {activeTab === 'registration' && <EmployeeRegistrationTab />}

          {activeTab === 'review' && (
            <ReviewTab
              currentBatch={currentBatch}
              items={items}
              alerts={riskAlerts}
              onEditItem={handleEditTypoClick}
              onSubmitBatch={handleSubmitBatch}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab forecast={forecast} onRefresh={handleRefreshForecast} refreshing={isForecastRefreshing} onSaveSettings={handleSaveForecastSettings} />
          )}

          {activeTab === 'archive' && <PayrollArchiveTab batches={batches} onDownload={(batch) => api.downloadPayrollArchive(batch.id, `payroll-archive-${batch.payroll_period?.slice(0, 7) || batch.id}.xlsx`)} />}

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

      <DisbursementConfirmModal
        isOpen={isDisbursementModalOpen}
        amount={currentBatch?.total_amount || 0}
        isSubmitting={isExecutingDisbursement}
        onCancel={() => setIsDisbursementModalOpen(false)}
        onConfirm={confirmExecuteDisbursal}
      />

    </div>
  );
}

export default function Maker({ initialTab }: WorkspaceProps) {
  return <DashboardContent initialTab={initialTab} />;
}
