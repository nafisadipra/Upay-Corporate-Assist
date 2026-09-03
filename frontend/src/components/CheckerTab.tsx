'use client';

import React, { useState } from 'react';
import { RiskAlert, Batch, BatchItem } from '@/types';
import { Check, UserCheck, AlertTriangle, CheckCircle2, Bell, ShieldCheck, Shield, FileSpreadsheet } from 'lucide-react';

interface CheckerTabProps {
  alerts: RiskAlert[];
  currentBatch: Batch | null;
  items: BatchItem[];
  onReviewAlert: (alertId: number, action: 'APPROVED' | 'OVERRIDDEN' | 'REJECTED', notes: string) => void;
  onApproveBatch: (notes: string) => void;
}

export const CheckerTab: React.FC<CheckerTabProps> = ({
  alerts,
  currentBatch,
  items,
  onReviewAlert,
  onApproveBatch,
}) => {
  const [selectedNotes, setSelectedNotes] = useState<{ [key: number]: string }>({});
  const [batchNotes, setBatchNotes] = useState('All payroll items and flagged anomalies reviewed & approved for disbursement.');

  const handleNotesChange = (alertId: number, text: string) => {
    setSelectedNotes((prev) => ({ ...prev, [alertId]: text }));
  };

  const openAlerts = alerts.filter((a) => a.review_status === 'PENDING_REVIEW');
  const reviewedAlerts = alerts.filter((a) => a.review_status !== 'PENDING_REVIEW');
  const isReviewed = currentBatch?.status === 'CHECKER_REVIEWED';
  const isExecuted = currentBatch?.status === 'EXECUTED';

  const formatAmount = (amount: number) => `BDT ${new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs relative z-10">
          <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Open AI Risk Alerts</span>
              <div className="mt-1 font-outfit text-lg font-extrabold text-red-600 flex items-center gap-1.5">
                {openAlerts.length} <span className="text-sm font-medium">Alerts</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-100/80 text-red-500 flex items-center justify-center">
               <Bell className="w-5 h-5" />
            </div>
          </div>
          
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Signed-off Alerts</span>
              <div className="mt-1 font-outfit text-lg font-extrabold text-emerald-700 flex items-center gap-1.5">
                {reviewedAlerts.length} <span className="text-sm font-medium">Resolved</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100/80 text-emerald-600 flex items-center justify-center">
               <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Maker-Checker Policy</span>
              <div className="mt-1 font-outfit text-sm font-bold text-[#2d3142]">
                Dual Control Sign-off
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200/50 text-slate-500 flex items-center justify-center">
               <Shield className="w-5 h-5" />
            </div>
          </div>
        </div>

        {!isReviewed && !isExecuted && currentBatch && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center relative z-10 bg-slate-50/50 p-3 rounded-xl border-dashed">
            <div className="flex items-center gap-2 flex-1 pl-2">
              <div className="w-6 h-6 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                placeholder="Sign-off notes for HR Maker..."
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
                className="flex-1 bg-transparent text-xs text-slate-600 focus:outline-none font-medium placeholder-slate-400"
              />
            </div>
            <button
              onClick={() => onApproveBatch(batchNotes)}
              className="bg-white hover:bg-slate-50 text-[#059669] border border-[#059669] px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Sign-Off &amp; Approve Batch</span>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const hasRisk = item.is_anomaly || item.account_validation_status !== 'VALID';
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Risk Alerts Review List */}
      <div className="card-flat bg-white border border-slate-100 p-6 rounded-2xl shadow-sm mt-6">
        <div className="flex items-center justify-between pb-4 mb-2">
          <div>
            <h3 className="font-extrabold text-[#2d3142] text-base font-outfit">AI Risk Shield Alerts Audit</h3>
            <p className="text-xs text-slate-500 mt-0.5">Scikit-Learn Isolation Forest anomalies requiring Finance Director sign-off</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            {alerts.length} Total Alerts
          </span>
        </div>

        <div className="w-full">
          {alerts.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              No risk alerts flagged. All uploaded payout items fall within normal baseline parameters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                    <th className="pb-3 px-2 w-[35%]">Alert</th>
                    <th className="pb-3 px-2 w-[25%]">Description</th>
                    <th className="pb-3 px-2 w-[25%]"></th>
                    <th className="pb-3 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-2">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                            <Bell className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-outfit text-[11px] font-extrabold text-[#2d3142] uppercase tracking-wide">
                              {alert.flag_type}
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
                        {alert.review_status === 'PENDING_REVIEW' ? (
                          <input
                            type="text"
                            placeholder="Sign-off audit notes..."
                            value={selectedNotes[alert.id] || ''}
                            onChange={(e) => handleNotesChange(alert.id, e.target.value)}
                            className="w-full px-3 py-2 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#ef8354] text-slate-700"
                          />
                        ) : (
                          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 inline-block px-2.5 py-1 rounded border border-emerald-200">
                            ✓ Reviewed by {alert.reviewer_name || 'Checker'}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center justify-center gap-2">
                          {alert.review_status === 'PENDING_REVIEW' ? (
                            <>
                              <button
                                onClick={() => onReviewAlert(alert.id, 'APPROVED', selectedNotes[alert.id] || 'Approved by Finance Director')}
                                className="bg-[#059669] hover:bg-[#047857] text-white font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center space-x-1 transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => onReviewAlert(alert.id, 'OVERRIDDEN', selectedNotes[alert.id] || 'Override authorized')}
                                className="bg-[#ef8354] hover:bg-[#ef8354]/90 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center space-x-1 transition-all"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Override</span>
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
  );
};
