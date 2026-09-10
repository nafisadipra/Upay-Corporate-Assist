'use client';

import React, { useState } from 'react';
import { RiskAlert, Batch, BatchItem } from '@/types';
import { Check, UserCheck, AlertTriangle, CheckCircle2, Bell, ShieldCheck, FileSpreadsheet, Flag, X, Download, LoaderCircle } from 'lucide-react';

interface CheckerTabProps {
  alerts: RiskAlert[];
  currentBatch: Batch | null;
  items: BatchItem[];
  onReviewAlert: (alertId: number, action: 'OVERRIDDEN_BY_CHECKER', notes: string) => void;
  onApproveBatch: (notes: string) => void;
  onRaiseIssue: (itemId: number, issueType: string, notes: string) => Promise<void>;
  onDownloadBatch: () => Promise<void>;
}

export const CheckerTab: React.FC<CheckerTabProps> = ({
  alerts,
  currentBatch,
  items,
  onReviewAlert,
  onApproveBatch,
  onRaiseIssue,
  onDownloadBatch,
}) => {
  const [selectedNotes, setSelectedNotes] = useState<{ [key: number]: string }>({});
  const [batchNotes, setBatchNotes] = useState('All payroll items and flagged anomalies reviewed & approved for disbursement.');
  const [flaggedItem, setFlaggedItem] = useState<BatchItem | null>(null);
  const [issueType, setIssueType] = useState('INCORRECT_SALARY');
  const [issueNotes, setIssueNotes] = useState('');
  const [isReturning, setIsReturning] = useState(false);
  const [activeAlertView, setActiveAlertView] = useState<'ai' | 'manual' | 'resolved' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleNotesChange = (alertId: number, text: string) => {
    setSelectedNotes((prev) => ({ ...prev, [alertId]: text }));
  };

  const openAiAlerts = alerts.filter((alert) => alert.review_status === 'PENDING_REVIEW' && !alert.flag_type.startsWith('MANUAL_'));
  const manualAlerts = alerts.filter((alert) => alert.review_status === 'PENDING_REVIEW' && alert.flag_type.startsWith('MANUAL_'));
  const hasOpenAlerts = openAiAlerts.length > 0 || manualAlerts.length > 0;
  const reviewedAlerts = alerts.filter((a) => a.review_status !== 'PENDING_REVIEW');
  const alertSections = [
    {
      key: 'ai',
      title: 'AI Risk Shield Alerts',
      description: 'System-detected payroll patterns that require Finance review.',
      empty: 'No AI alerts. The uploaded payroll rows are within the available baseline.',
      alerts: openAiAlerts,
      accent: 'indigo',
    },
    {
      key: 'manual',
      title: 'Finance-raised issues',
      description: 'Issues identified manually by Finance and returned to HR for correction.',
      empty: 'No manual issues have been raised for this payroll.',
      alerts: manualAlerts,
      accent: 'orange',
    },
    {
      key: 'resolved',
      title: 'Resolved alerts',
      description: 'AI and Finance-raised findings already signed off by Finance.',
      empty: 'No alerts have been resolved for this payroll yet.',
      alerts: reviewedAlerts,
      accent: 'emerald',
    },
  ];
  const activeSection = alertSections.find((section) => section.key === activeAlertView);
  const isReviewed = currentBatch?.status === 'CHECKER_REVIEWED';
  const isExecuted = currentBatch?.status === 'EXECUTED';
  const sortedItems = [...items].sort((left, right) => left.employee_name.localeCompare(right.employee_name, undefined, { numeric: true, sensitivity: 'base' }));

  const submitManualIssue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!flaggedItem || !issueNotes.trim() || isReturning) return;
    setIsReturning(true);
    try {
      await onRaiseIssue(flaggedItem.id, issueType, issueNotes.trim());
      setFlaggedItem(null);
      setIssueNotes('');
      setIssueType('INCORRECT_SALARY');
    } finally {
      setIsReturning(false);
    }
  };

  const formatAmount = (amount: number) => `BDT ${new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;

  const downloadSelectedBatch = async () => {
    if (!currentBatch || isDownloading) return;
    setIsDownloading(true);
    try {
      await onDownloadBatch();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Governance Sign-off Header Card */}
      <div className="card-flat p-6 bg-white border border-slate-100 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 space-y-4 sm:space-y-0 relative z-10">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
                <UserCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-[#2d3142] font-outfit tracking-tight">
                Finance Director Governance & Disbursal Sign-off
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-2 max-w-xl">
              Review AI anomaly alerts, authorize high-variance transactions, and sign off batch for Maker final disbursement.
            </p>
          </div>

          {(isReviewed || isExecuted) && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <span>{isExecuted ? 'Batch Executed' : 'Batch Sign-Off Complete'}</span>
            </div>
          )}
        </div>

        {/* Governance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-6 text-xs relative z-10">
          <button type="button" disabled={!currentBatch || isDownloading} onClick={() => void downloadSelectedBatch()} className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60">
            <div className="min-w-0 pr-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Selected batch</span>
              <div className="mt-1 truncate font-outfit text-sm font-extrabold text-[#2d3142]" title={currentBatch?.file_name}>
                {currentBatch?.file_name || 'No batch selected'}
              </div>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-full bg-indigo-100/80 text-indigo-600 flex items-center justify-center">
              {isDownloading ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            </div>
          </button>

          <button type="button" onClick={() => setActiveAlertView('ai')} className="bg-red-50/50 p-4 rounded-xl border border-red-100 flex items-center justify-between text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-red-200">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Open AI Risk Alerts</span>
              <div className="mt-1 font-outfit text-lg font-extrabold text-red-600 flex items-center gap-1.5">
                {openAiAlerts.length} <span className="text-sm font-medium">Alerts</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-100/80 text-red-500 flex items-center justify-center">
               <Bell className="w-5 h-5" />
            </div>
          </button>

          <button type="button" onClick={() => setActiveAlertView('manual')} className="bg-orange-50/60 p-4 rounded-xl border border-orange-200 flex items-center justify-between text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-200">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Finance-raised issues</span>
              <div className="mt-1 font-outfit text-lg font-extrabold text-[#d56538] flex items-center gap-1.5">
                {manualAlerts.length} <span className="text-sm font-medium">Issues</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-100 text-[#ef8354] flex items-center justify-center"><Flag className="w-5 h-5" /></div>
          </button>
          
          <button type="button" onClick={() => setActiveAlertView('resolved')} className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Signed-off Alerts</span>
              <div className="mt-1 font-outfit text-lg font-extrabold text-emerald-700 flex items-center gap-1.5">
                {reviewedAlerts.length} <span className="text-sm font-medium">Resolved</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100/80 text-emerald-600 flex items-center justify-center">
               <ShieldCheck className="w-5 h-5" />
            </div>
          </button>
          
        </div>

        {currentBatch?.status === 'PENDING_CHECKER_REVIEW' && (
          <div className={`mt-6 border-t border-slate-100 p-3 pt-4 relative z-10 flex flex-col items-center gap-4 rounded-xl border-dashed sm:flex-row ${hasOpenAlerts ? 'bg-amber-50/70' : 'bg-slate-50/50'}`}>
            <div className="flex items-center gap-2 flex-1 pl-2">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${hasOpenAlerts ? 'bg-amber-500' : 'bg-[#059669]'}`}>
                {hasOpenAlerts ? <AlertTriangle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              </div>
              {hasOpenAlerts ? (
                <div><p className="text-xs font-extrabold text-amber-900">AI recheck found {openAiAlerts.length + manualAlerts.length} remaining {openAiAlerts.length + manualAlerts.length === 1 ? 'issue' : 'issues'}</p><p className="mt-0.5 text-[10px] text-amber-700">Open the alert cards above and resolve every issue before Finance sign-off.</p></div>
              ) : (
                <input
                  type="text"
                  placeholder="Sign-off notes for HR Maker..."
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-slate-600 focus:outline-none font-medium placeholder-slate-400"
                />
              )}
            </div>
            <button
              type="button"
              disabled={hasOpenAlerts}
              onClick={() => onApproveBatch(batchNotes)}
              title={hasOpenAlerts ? 'Override each valid exception or raise an issue before signing off.' : undefined}
              className="bg-white hover:bg-slate-50 text-[#059669] border border-[#059669] px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all shadow-sm disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{hasOpenAlerts ? 'Sign-off locked' : 'Sign-Off &amp; Approve Batch'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Payroll spreadsheet preview */}
      <div className="card-flat overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-outfit text-base font-extrabold text-[#2d3142]">Payroll sheet preview</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {currentBatch ? `${currentBatch.file_name} · ${items.length} uploaded payroll rows` : 'Select a payroll batch to inspect its uploaded rows.'}
              </p>
            </div>
          </div>
          {currentBatch && (
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-right">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Total payroll</p>
              <p className="mt-0.5 font-mono text-sm font-extrabold text-slate-800">{formatAmount(currentBatch.total_amount)}</p>
            </div>
          )}
        </div>

        {!currentBatch ? (
          <div className="px-6 py-12 text-center text-xs text-slate-400">No payroll batch is available for review.</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-slate-400">Loading the uploaded payroll sheet…</div>
        ) : (
          <div className="max-h-[460px] overflow-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="border-b border-slate-200 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                  <th className="px-5 py-3">#</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Mobile number</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-right">Basic salary</th>
                  <th className="px-4 py-3 text-right">Gross salary</th>
                  <th className="px-4 py-3">Validation</th>
                  <th className="px-4 py-3">Risk review</th>
                  <th className="w-[132px] min-w-[132px] px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.map((item, index) => {
                  const hasRisk = item.is_anomaly || item.account_validation_status !== 'VALID';
                  const hasOpenManualIssue = manualAlerts.some((alert) => alert.batch_item_id === item.id);
                  return (
                    <tr key={item.id} className={hasRisk ? 'bg-amber-50/30' : 'hover:bg-slate-50/60'}>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-800">{item.employee_name}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{item.effective_phone_number}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{item.department || '—'}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-700">{formatAmount(item.basic_salary)}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs font-bold text-slate-800">{formatAmount(item.gross_salary)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${
                          item.account_validation_status === 'VALID'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {item.account_validation_status.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${
                          hasRisk ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {hasRisk ? 'Needs review' : 'Within baseline'}
                        </span>
                      </td>
                      <td className="w-[132px] min-w-[132px] px-4 py-3.5 text-right">
                        {hasOpenManualIssue ? (
                          <span className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-[10px] font-extrabold text-slate-500">
                            <Flag className="h-3.5 w-3.5 shrink-0" />
                            On Review
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!['PENDING_CHECKER_REVIEW', 'RETURNED_TO_HR'].includes(currentBatch.status)}
                            onClick={() => setFlaggedItem(item)}
                            className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-3 py-2 text-[10px] font-extrabold text-[#d56538] shadow-sm transition hover:border-orange-300 hover:bg-orange-50 active:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-[#ef8354]/25 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Flag className="h-3.5 w-3.5 shrink-0" />
                            Raise issue
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeSection && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) setActiveAlertView(null); }}>
      <div className={`card-flat max-h-[80vh] w-full max-w-5xl overflow-auto bg-white p-6 rounded-3xl shadow-2xl border ${activeSection.accent === 'orange' ? 'border-orange-200' : activeSection.accent === 'emerald' ? 'border-emerald-200' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between pb-4 mb-2">
          <div>
            <h3 className="font-extrabold text-[#2d3142] text-lg font-outfit">{activeSection.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{activeSection.description}</p>
          </div>
          <div className="flex items-center gap-3"><span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${activeSection.accent === 'orange' ? 'border-orange-200 bg-orange-50 text-orange-700' : activeSection.accent === 'emerald' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-indigo-100 bg-indigo-50 text-indigo-800'}`}>{activeSection.alerts.length} {activeSection.key === 'manual' ? 'Manual issues' : activeSection.key === 'resolved' ? 'Resolved' : 'AI alerts'}</span><button type="button" onClick={() => setActiveAlertView(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button></div>
        </div>

        <div className="w-full">
          {activeSection.alerts.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              {activeSection.empty}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                    <th className="pb-3 px-2 w-[35%]">Alert</th>
                    <th className="pb-3 px-2 w-[25%]">Description</th>
                    <th className="pb-3 px-2 w-[25%]"></th>
                    <th className="pb-3 px-2 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeSection.alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-2">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeSection.key === 'manual' ? 'bg-orange-50 text-[#ef8354]' : activeSection.key === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                            {activeSection.key === 'manual' ? <Flag className="w-5 h-5" /> : activeSection.key === 'resolved' ? <ShieldCheck className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-outfit text-[11px] font-extrabold text-[#2d3142] uppercase tracking-wide">
                              {alert.flag_type.replace('MANUAL_', '').replaceAll('_', ' ')}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Alert #{alert.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-[11px] text-slate-600 font-medium leading-relaxed pr-6">
                        {alert.anomaly_reason || `${alert.flag_type.replaceAll('_', ' ')} requires Finance Director review.`}
                      </td>
                      <td className="py-4 px-2">
                        {alert.review_status === 'PENDING_REVIEW' && activeSection.key === 'ai' ? (
                          <input
                            type="text"
                            placeholder="Reason for exception..."
                            value={selectedNotes[alert.id] || ''}
                            onChange={(e) => handleNotesChange(alert.id, e.target.value)}
                            className="w-full px-3 py-2 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#ef8354] text-slate-700"
                          />
                        ) : alert.review_status !== 'PENDING_REVIEW' ? (
                          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 inline-block px-2.5 py-1 rounded border border-emerald-200">
                            ✓ {alert.review_status === 'RESOLVED_BY_HR' ? `Resolved by ${alert.reviewer_name || 'HR'}` : `Reviewed by ${alert.reviewer_name || 'Finance'}`}
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-orange-700 bg-orange-50 inline-block px-2.5 py-1 rounded border border-orange-200">
                            Awaiting HR correction
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          {alert.review_status === 'PENDING_REVIEW' && activeSection.key === 'ai' && ['PENDING_CHECKER_REVIEW', 'CHECKER_REVIEWED'].includes(currentBatch?.status || '') ? (
                            <>
                              <button
                                onClick={() => onReviewAlert(alert.id, 'OVERRIDDEN_BY_CHECKER', selectedNotes[alert.id] || 'Exception authorized by Finance Director')}
                                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#ef8354] px-3 py-2 text-[10px] font-bold text-white transition-all hover:bg-[#ef8354]/90"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Override</span>
                              </button>
                              <button
                                onClick={() => setFlaggedItem(items.find((item) => item.id === alert.batch_item_id) || null)}
                                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-[10px] font-bold text-white transition-all hover:bg-red-700"
                              >
                                <Flag className="w-3.5 h-3.5" />
                                <span>Raise issue</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                              {alert.review_status}
                            </span>
                          )}
                          <span className={`ml-2 px-2 py-1 rounded font-bold text-[10px] w-[56px] text-center ${
                            alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-orange-50 text-orange-600'
                          }`}>
                            {alert.severity}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>
      )}

      {flaggedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={submitManualIssue} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-[#ef8354]"><Flag className="h-5 w-5" /></span>
                <div><h3 className="font-outfit text-base font-extrabold text-slate-900">Return row to HR</h3><p className="mt-1 text-xs text-slate-500">{flaggedItem.employee_name} · {formatAmount(flaggedItem.gross_salary)}</p></div>
              </div>
              <button type="button" onClick={() => setFlaggedItem(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>
            <label className="mt-5 block text-xs font-extrabold text-slate-700">Issue type
              <select value={issueType} onChange={(event) => setIssueType(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-800 focus:border-[#ef8354] focus:outline-none">
                <option value="INCORRECT_SALARY">Incorrect salary</option>
                <option value="WRONG_EMPLOYEE">Wrong employee</option>
                <option value="INCORRECT_PHONE">Incorrect phone number</option>
                <option value="DUPLICATE_PAYMENT">Possible duplicate payment</option>
                <option value="OTHER">Other payroll issue</option>
              </select>
            </label>
            <label className="mt-4 block text-xs font-extrabold text-slate-700">Instructions for HR
              <textarea required minLength={3} rows={4} value={issueNotes} onChange={(event) => setIssueNotes(event.target.value)} placeholder="Explain what looks wrong and what HR should verify…" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-relaxed text-slate-800 focus:border-[#ef8354] focus:outline-none" />
            </label>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Returning this row pauses Finance approval. HR will see your note, correct the payroll row, and resubmit the batch.</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setFlaggedItem(null)} className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-xs font-extrabold text-slate-700 hover:bg-slate-200">Cancel</button>
              <button type="submit" disabled={!issueNotes.trim() || isReturning} className="flex-1 rounded-xl bg-[#ef8354] px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-[#d67045] disabled:cursor-not-allowed disabled:opacity-50">{isReturning ? 'Returning…' : 'Return to HR'}</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
