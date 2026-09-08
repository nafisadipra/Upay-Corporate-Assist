'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DashboardTab, Header } from '@/components/Header';
import { CheckerTab } from '@/components/CheckerTab';
import { AuditTab } from '@/components/AuditTab';
import { LoginForm } from '@/components/LoginForm';
import { Batch, BatchItem, AuditLog, RiskAlert } from '@/types';
import * as api from '@/lib/api';
import { History, ShieldAlert, BarChart3, Shield, MoreHorizontal, FileText, CheckCircle2, PlayCircle, XCircle, Hourglass } from 'lucide-react';

type ChartItem = { label: string; value: number; color: string };

const REVIEW_STATUSES = ['FLAGGED_RISK', 'PENDING_CHECKER_REVIEW', 'PENDING_CHECKER_APPROVAL', 'RETURNED_TO_HR'];

function formatAmount(amount: number) {
  return amount >= 1_000_000 ? `BDT ${(amount / 1_000_000).toFixed(1)}M` : `BDT ${amount.toLocaleString()}`;
}

function DonutChart({ items, centreLabel, centreValue }: { items: ChartItem[]; centreLabel: string; centreValue: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const visibleItems = items.filter((item) => item.value > 0);
  const gradient = visibleItems.map((item, index) => {
    const precedingValue = visibleItems.slice(0, index).reduce((sum, segment) => sum + segment.value, 0);
    const start = total ? (precedingValue / total) * 100 : 0;
    const end = total ? ((precedingValue + item.value) / total) * 100 : 0;
    return `${item.color} ${start}% ${end}%`;
  }).join(', ') || '#e2e8f0 0% 100%';

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center justify-between px-4 mt-2">
      <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="absolute inset-[14px] grid place-items-center rounded-full bg-white text-center">
          <div>
            <strong className="block font-outfit text-4xl font-extrabold text-slate-900">{centreValue}</strong>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{centreLabel}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 min-w-[120px]">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-slate-600 font-medium">{item.label}</span>
            </div>
            <strong className="font-mono text-slate-900 font-extrabold">{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function DisbursementCards({ items }: { items: ChartItem[] }) {
  const bgColors = ['bg-orange-50/50', 'bg-emerald-50/50', 'bg-blue-50/50', 'bg-red-50/50'];
  const textColors = ['text-orange-600', 'text-emerald-600', 'text-blue-600', 'text-red-600'];
  const borderColors = ['border-t-orange-500', 'border-t-emerald-500', 'border-t-blue-500', 'border-t-red-500'];
  const icons = [
    <div key="0" className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-500 mb-3"><span className="text-sm font-bold font-serif">৳</span></div>,
    <div key="1" className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3"><CheckCircle2 className="h-4 w-4" /></div>,
    <div key="2" className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-3"><PlayCircle className="h-4 w-4 fill-current" /></div>,
    <div key="3" className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3"><XCircle className="h-4 w-4" /></div>,
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      {items.map((item, index) => (
        <div key={item.label} className={`flex flex-col rounded-xl shadow-sm border-t-4 border-l border-r border-b border-slate-100 p-4 ${bgColors[index]} ${borderColors[index]}`}>
          {icons[index]}
          <p className={`text-[10px] font-extrabold uppercase tracking-widest ${textColors[index]}`}>{item.label}</p>
          <strong className="block font-mono text-xs font-extrabold text-slate-900 mt-1">{formatAmount(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function SeverityCards({ items }: { items: ChartItem[] }) {
  const bgColors = ['bg-emerald-50/50', 'bg-amber-50/50', 'bg-orange-50/50', 'bg-red-50/50'];
  const textColors = ['text-emerald-600', 'text-amber-600', 'text-orange-600', 'text-red-600'];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      {items.map((item, index) => (
        <div key={item.label} className={`flex flex-col rounded-xl border border-slate-100 p-5 items-center justify-center text-center ${bgColors[index]}`}>
          <strong className={`block font-mono text-3xl font-extrabold ${textColors[index]}`}>{item.value}</strong>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mt-2">{item.label}</p>
          <span className="text-[10px] text-slate-400 mt-1">{item.value} alerts</span>
        </div>
      ))}
    </div>
  );
}

function PipelineFlow({ items }: { items: ChartItem[] }) {
  const icons = [
    <div key="0" className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white z-10"><Hourglass className="h-5 w-5" /></div>,
    <div key="1" className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white z-10"><CheckCircle2 className="h-5 w-5" /></div>,
    <div key="2" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white z-10"><PlayCircle className="h-5 w-5 fill-current" /></div>,
    <div key="3" className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white z-10"><XCircle className="h-5 w-5" /></div>,
  ];

  let progressPercent = 0;
  let progressColor = 'bg-slate-200';
  
  if (items[3].value > 0) {
    progressPercent = 100;
    progressColor = 'bg-red-500';
  } else if (items[2].value > 0) {
    progressPercent = 66.6;
    progressColor = 'bg-blue-500';
  } else if (items[1].value > 0) {
    progressPercent = 33.3;
    progressColor = 'bg-emerald-500';
  } else if (items[0].value > 0) {
    progressPercent = 16.6;
    progressColor = 'bg-orange-500';
  }

  return (
    <div className="relative mt-8 mb-4 px-6">
      <div className="absolute left-[12%] right-[12%] top-5 h-[2px] bg-slate-200 z-0">
        <div 
          className={`absolute left-0 top-0 h-full transition-all duration-1000 ${progressColor}`} 
          style={{ width: `${progressPercent}%` }} 
        />
      </div>
      <div className="relative z-10 flex justify-between">
        {items.map((item, index) => (
          <div key={item.label} className="flex flex-col items-center gap-4 bg-white px-2">
            {icons[index]}
            <div className="text-center">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{item.label}</p>
              <strong className="block font-mono text-xl font-extrabold text-slate-900 mt-1">{item.value}</strong>
              <span className="text-[10px] text-slate-400">batches</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatYAxis(value: number) {
  if (value === 0) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return value.toString();
}

function LineTrend({ items }: { items: ChartItem[] }) {
  const width = 600; 
  const height = 180; 
  const marginLeft = 40; 
  const marginBottom = 24; 
  const marginTop = 10; 
  const marginRight = 10;
  
  const chartWidth = width - marginLeft - marginRight;
  const chartHeight = height - marginTop - marginBottom;
  
  const actualMax = Math.max(...items.map((item) => item.value), 600000);
  // Round up to nearest nice number if needed, for now just use actualMax
  const maxValue = actualMax;
  
  const yTicks = [0, maxValue * 0.333, maxValue * 0.666, maxValue];

  const points = items.map((item, index) => {
    const x = marginLeft + index * (chartWidth / Math.max(items.length - 1, 1));
    const y = marginTop + chartHeight - (item.value / maxValue) * chartHeight;
    return { ...item, x, y };
  });

  const isSinglePoint = points.length === 1;
  const path = isSinglePoint
    ? `M ${marginLeft} ${points[0].y} L ${width - marginRight} ${points[0].y}`
    : points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = isSinglePoint
    ? `M ${marginLeft} ${marginTop + chartHeight} L ${marginLeft} ${points[0].y} L ${width - marginRight} ${points[0].y} L ${width - marginRight} ${marginTop + chartHeight} Z`
    : points.length ? `M ${points[0].x} ${marginTop + chartHeight} L ${points.map((point) => `${point.x} ${point.y}`).join(' L ')} L ${points[points.length - 1].x} ${marginTop + chartHeight} Z` : '';
  
  return (
    <div className="mt-6">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full overflow-visible">
        <defs>
          <linearGradient id="checkerTrend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Y-axis grid and labels */}
        {yTicks.map((tick, i) => {
          const y = marginTop + chartHeight - (tick / maxValue) * chartHeight;
          return (
            <g key={i}>
              <text x={marginLeft - 8} y={y + 4} textAnchor="end" className="fill-slate-500 text-[11px] font-medium font-mono">
                {formatYAxis(tick)}
              </text>
              <line x1={marginLeft} y1={y} x2={width - marginRight} y2={y} stroke="#f1f5f9" strokeDasharray={i === 0 ? "" : "4 4"} strokeWidth={i === 0 ? "2" : "1"} />
            </g>
          );
        })}
        
        <path d={area} fill="url(#checkerTrend)" />
        <path d={path} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Points and X-axis labels */}
        {points.map((point, index) => (
          <g key={index}>
            <circle cx={point.x} cy={point.y} r="4.5" fill="#ffffff" stroke="#f97316" strokeWidth="2.5" />
            <text x={point.x} y={height - 2} textAnchor="middle" className="fill-slate-500 text-[11px] font-medium">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function renderDashboard(batches: Batch[], alerts: RiskAlert[], selectedPeriod: string, disbursementHistory: Array<{ period: string; amount: number }>) {
  const periodLabel = selectedPeriod
    ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(`${selectedPeriod}-01T00:00:00`))
    : 'Selected month';
  const statusGroups = [
    { label: 'Pending', statuses: REVIEW_STATUSES, color: '#f97316' },
    { label: 'Approved', statuses: ['CHECKER_REVIEWED', 'APPROVED'], color: '#059669' },
    { label: 'Executed', statuses: ['EXECUTED'], color: '#2563eb' },
    { label: 'Rejected', statuses: ['REJECTED', 'CANCELLED'], color: '#dc2626' },
  ];
  const batchStatusData = statusGroups.map((group) => ({ label: group.label, value: batches.filter((batch) => group.statuses.includes(batch.status)).length, color: group.color }));
  const payoutStatusData = statusGroups.map((group) => ({ label: group.label, value: batches.filter((batch) => group.statuses.includes(batch.status)).reduce((sum, batch) => sum + batch.total_amount, 0), color: group.color }));
  
  const riskStatusData: ChartItem[] = [
    { label: 'Unresolved', value: alerts.filter((alert) => alert.review_status === 'PENDING_REVIEW').length, color: '#dc2626' },
    { label: 'Overridden', value: alerts.filter((alert) => alert.review_status === 'OVERRIDDEN_BY_CHECKER').length, color: '#f97316' },
    { label: 'Approved', value: alerts.filter((alert) => alert.review_status === 'APPROVED_BY_CHECKER').length, color: '#059669' },
    { label: 'Rejected', value: alerts.filter((alert) => alert.review_status === 'REJECTED_BY_CHECKER').length, color: '#64748b' },
  ];
  
  const severityData: ChartItem[] = [
    { label: 'Low', value: alerts.filter((alert) => alert.severity === 'LOW').length, color: '#059669' },
    { label: 'Medium', value: alerts.filter((alert) => alert.severity === 'MEDIUM').length, color: '#d97706' },
    { label: 'High', value: alerts.filter((alert) => alert.severity === 'HIGH').length, color: '#ea580c' },
    { label: 'Critical', value: alerts.filter((alert) => alert.severity === 'CRITICAL').length, color: '#be123c' },
  ];
  
  const selectedDate = selectedPeriod ? new Date(`${selectedPeriod}-01T00:00:00`) : new Date();
  const chartYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const recentPayouts = Array.from({ length: selectedMonth + 1 }, (_, month) => {
    const period = `${chartYear}-${String(month + 1).padStart(2, '0')}`;
    const executedTotal = disbursementHistory.find((item) => item.period === period)?.amount || 0;
    return {
      label: new Date(chartYear, month, 1).toLocaleDateString('en-US', { month: 'short' }),
      value: executedTotal,
      color: '#f97316',
    };
  });
  
  const recentActivity = [...batches].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1.1fr]">
        <article className="rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-outfit text-base font-extrabold text-slate-900">Batch approval flow</h2>
                <p className="mt-0.5 text-xs text-slate-500">Where {periodLabel} payroll batches sit in the disbursement pipeline.</p>
              </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="h-5 w-5" /></button>
          </div>
          <PipelineFlow items={batchStatusData} />
        </article>

        <article className="rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-outfit text-base font-extrabold text-slate-900">Risk posture</h2>
                <p className="mt-0.5 text-xs text-slate-500">Outcome of payroll flaws flagged in {periodLabel}.</p>
              </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="h-5 w-5" /></button>
          </div>
          <DonutChart items={riskStatusData} centreValue={String(alerts.length)} centreLabel="Flaws" />
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <article className="rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-outfit text-base font-extrabold text-slate-900">Disbursement value</h2>
                <p className="mt-0.5 text-xs text-slate-500">{periodLabel} payroll value held at each control stage.</p>
              </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="h-5 w-5" /></button>
          </div>
          <DisbursementCards items={payoutStatusData} />
        </article>

        <article className="rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-outfit text-base font-extrabold text-slate-900">Severity mix</h2>
                <p className="mt-0.5 text-xs text-slate-500">{periodLabel} risk findings by review severity.</p>
              </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="h-5 w-5" /></button>
          </div>
          <SeverityCards items={severityData} />
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <article className="rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-outfit text-base font-extrabold text-slate-900">Recorded disbursement volume</h2>
              <p className="mt-0.5 text-xs text-slate-500">Payroll value from January through {periodLabel}.</p>
            </div>
            <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">{chartYear}</span>
          </div>
          {recentPayouts.length ? <LineTrend items={recentPayouts} /> : <div className="grid h-40 place-items-center text-xs text-slate-400">No disbursement data is available yet.</div>}
        </article>

        <article className="rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-outfit text-base font-extrabold text-slate-900">Recent pipeline activity</h2>
              <p className="mt-0.5 text-xs text-slate-500">Read-only batch movement.</p>
            </div>
            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="h-5 w-5" /></button>
          </div>
          <div className="flex-1">
            {recentActivity.length ? recentActivity.map((batch) => (
              <div key={batch.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/50 text-slate-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate font-mono text-[12px] font-bold text-slate-900">{batch.file_name}</p>
                      <span className="shrink-0 rounded bg-red-100 px-2 py-0.5 text-[9px] font-extrabold text-red-600">{batch.status.replaceAll('_', ' ')}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{formatAmount(batch.total_amount)} • {new Date(batch.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            )) : <div className="py-8 text-center text-xs text-slate-400">No recent batch activity.</div>}
          </div>
          <button className="mt-4 text-left text-sm font-bold text-orange-500 hover:text-orange-600">View all activity &rarr;</button>
        </article>
      </section>
    </div>
  );
}

function CheckerWorkspace() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [disbursementHistory, setDisbursementHistory] = useState<Array<{ period: string; amount: number }>>([]);
  const [message, setMessage] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');

  const loadData = useCallback(async () => {
    if (!user?.company_id) return;

    try {
      setMessage('');
      const [batchData, historyData] = await Promise.all([
        api.fetchBatches(user.company_id),
        api.fetchDisbursementHistory(user.company_id),
      ]);
      setDisbursementHistory(historyData.historical_series || []);
      const companyBatches = batchData.batches || [];
      const preferredBatch = companyBatches.find((batch: Batch) =>
        REVIEW_STATUSES.includes(batch.status),
      ) || companyBatches[0] || null;
      const activePeriod = selectedPeriod || preferredBatch?.payroll_period?.slice(0, 7) || '';
      const reviewBatch = companyBatches.find((batch: Batch) => batch.payroll_period?.slice(0, 7) === activePeriod) || null;

      setBatches(companyBatches);
      setCurrentBatch(reviewBatch);
      if (!selectedPeriod && activePeriod) setSelectedPeriod(activePeriod);

      if (reviewBatch) {
        const [logData, itemData, alertData] = await Promise.all([
          api.fetchAuditLogs(reviewBatch.id),
          api.fetchBatchItems(reviewBatch.id),
          api.fetchRiskAlerts(reviewBatch.id),
        ]);
        setAuditLogs(logData.audit_logs || []);
        setBatchItems(itemData.items || []);
        setAlerts(alertData.risk_alerts || []);
      } else {
        setAuditLogs([]);
        setBatchItems([]);
        setAlerts([]);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to load checker review data.');
    }
  }, [selectedPeriod, user]);

  useEffect(() => {
    if (user?.role !== 'CHECKER') return;
    void (async () => {
      await loadData();
    })();
    const refreshTimer = window.setInterval(() => void loadData(), 15_000);
    return () => window.clearInterval(refreshTimer);
  }, [loadData, user]);

  useEffect(() => {
    if (user?.role === 'MAKER') {
      router.replace('/maker');
    }
  }, [router, user]);

  if (isLoading) {
    return <div className="min-h-[100dvh] bg-[#f7f9f6]" />;
  }

  if (!user) {
    return <LoginForm />;
  }

  if (user.role === 'MAKER') {
    return null;
  }

  const handleReviewAlert = async (alertId: number, action: 'OVERRIDDEN_BY_CHECKER', notes: string) => {
    try {
      await api.reviewRiskAlert(alertId, action, notes);
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to record the alert review.');
    }
  };

  const handleApproveBatch = async (notes: string) => {
    if (!currentBatch) return;
    try {
      await api.checkerReviewBatch(currentBatch.id, 'APPROVED_BY_CHECKER', notes);
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to record the batch sign-off.');
    }
  };

  const handleRaiseIssue = async (itemId: number, issueType: string, notes: string) => {
    try {
      await api.createManualRiskAlert(itemId, issueType, notes);
      await loadData();
      setMessage('Issue sent to HR. This payroll is locked until HR corrects and resubmits it.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to return the issue to HR.');
      throw err;
    }
  };

  const filteredBatches = batches.filter((batch) => batch.payroll_period?.slice(0, 7) === selectedPeriod);
  const pendingAlertCount = alerts.filter((alert) => alert.review_status === 'PENDING_REVIEW').length;
  const fixedIssueCount = currentBatch && ['FLAGGED_RISK', 'PENDING_CHECKER_REVIEW'].includes(currentBatch.status)
    ? alerts.filter((alert) => alert.flag_type.startsWith('MANUAL_') && alert.review_status === 'RESOLVED_BY_HR').length
    : 0;

  return (
    <div className="app-shell text-slate-900 font-sans antialiased flex flex-col justify-between">
      <div className="lg:pl-[272px]">
        <Header activeTab={activeTab} onTabChange={setActiveTab} riskAlertCount={pendingAlertCount} fixedIssueCount={fixedIssueCount} selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {message && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-900">{message}</div>}

          {activeTab === 'overview' && renderDashboard(filteredBatches, alerts, selectedPeriod, disbursementHistory)}

          {activeTab === 'checker' && (
            <CheckerTab
              alerts={alerts}
              currentBatch={currentBatch}
              items={batchItems}
              onReviewAlert={handleReviewAlert}
              onApproveBatch={handleApproveBatch}
              onRaiseIssue={handleRaiseIssue}
              onDownloadBatch={async () => {
                if (!currentBatch) return;
                try {
                  await api.downloadBatchWorkbook(currentBatch.id, currentBatch.file_name);
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : 'Failed to download the selected payroll batch.');
                }
              }}
            />
          )}

          {activeTab === 'audit' && <AuditTab logs={auditLogs} />}
        </main>
      </div>
    </div>
  );
}

export default function Checker() {
  return <AuthProvider><CheckerWorkspace /></AuthProvider>;
}
