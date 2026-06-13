'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Clock3, Edit3, Send, ShieldCheck } from 'lucide-react';
import { Batch, BatchItem, RiskAlert } from '@/types';

interface ReviewTabProps {
  currentBatch: Batch | null;
  items: BatchItem[];
  alerts: RiskAlert[];
  onEditItem: (item: BatchItem) => void;
  onSubmitBatch: () => void;
}

const issueLabel = (flagType: RiskAlert['flag_type']) => flagType
  .replace('MANUAL_', '')
  .replaceAll('_', ' ')
  .toLowerCase()
  .replace(/^./, (letter) => letter.toUpperCase());

export const ReviewTab: React.FC<ReviewTabProps> = ({ currentBatch, items, alerts, onEditItem, onSubmitBatch }) => {
  const financeIssues = alerts.filter((alert) => alert.flag_type.startsWith('MANUAL_'));
  const openIssues = financeIssues.filter((alert) => alert.review_status === 'PENDING_REVIEW');
  const resolvedIssues = financeIssues.filter((alert) => alert.review_status === 'RESOLVED_BY_HR');
  const canResubmit = Boolean(currentBatch)
    && ['RETURNED_TO_HR', 'FLAGGED_RISK'].includes(currentBatch!.status)
    && openIssues.length === 0
    && resolvedIssues.length > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-[#ef8354]"><ShieldCheck className="h-5 w-5" /></span>
            <div>
              <h2 className="font-outfit text-xl font-extrabold tracking-tight text-[#2d3142]">HR Review</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Review issues returned by Finance, correct the affected payroll rows, and send the batch back for approval.</p>
            </div>
          </div>
          {currentBatch && <span className="max-w-full truncate rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] font-bold text-slate-600">{currentBatch.file_name}</span>}
        </div>
      </section>

      {!currentBatch || financeIssues.length === 0 ? (
        <section className="rounded-2xl border border-slate-100 bg-white px-6 py-14 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h3 className="mt-3 font-outfit text-base font-extrabold text-slate-800">No Finance reviews for this payroll month</h3>
          <p className="mt-1 text-xs text-slate-500">Returned payroll issues will appear here with the Finance note and affected row.</p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#ef8354]" />
              <div>
                <h3 className="font-outfit text-sm font-extrabold text-orange-950">{openIssues.length > 0 ? `${openIssues.length} ${openIssues.length === 1 ? 'issue requires' : 'issues require'} correction` : 'All returned issues are fixed'}</h3>
                <p className="mt-1 text-xs text-orange-800">{openIssues.length > 0 ? 'Open an issue below to edit its payroll row.' : 'The corrected batch is ready to be sent back to Finance.'}</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            {financeIssues.map((alert) => {
              const item = items.find((candidate) => candidate.id === alert.batch_item_id);
              const isOpen = alert.review_status === 'PENDING_REVIEW';
              return (
                <article key={alert.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${isOpen ? 'border-orange-200' : 'border-emerald-200'}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isOpen ? 'bg-orange-50 text-[#ef8354]' : 'bg-emerald-50 text-emerald-600'}`}>
                      {isOpen ? <Edit3 className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-outfit text-sm font-extrabold text-[#2d3142]">{alert.employee_name || item?.employee_name || `Payroll row #${alert.batch_item_id}`}</h3>
                        <span className={`rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider ${isOpen ? 'bg-orange-100 text-orange-800' : 'bg-emerald-50 text-emerald-700'}`}>{isOpen ? 'Needs correction' : 'Fixed by HR'}</span>
                      </div>
                      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{issueLabel(alert.flag_type)}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-700">{alert.anomaly_reason || alert.review_notes || 'Finance requested that HR verify this payroll row.'}</p>
                    </div>
                    {isOpen && item ? (
                      <button type="button" onClick={() => onEditItem(item)} className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-orange-200 px-4 py-2.5 text-xs font-extrabold text-[#d56538] transition hover:bg-orange-50">
                        Fix row <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : isOpen ? (
                      <span className="text-[11px] font-bold text-red-600">Payroll row unavailable</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-slate-400" />
              <div><p className="text-xs font-extrabold text-slate-800">Finance resubmission</p><p className="mt-0.5 text-[11px] text-slate-500">Every returned issue must be fixed before resubmission.</p></div>
            </div>
            <button type="button" onClick={onSubmitBatch} disabled={!canResubmit} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4f5d75] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#3d485c] disabled:cursor-not-allowed disabled:opacity-45">
              <Send className="h-4 w-4" />
              {openIssues.length > 0 ? `Fix ${openIssues.length} remaining ${openIssues.length === 1 ? 'issue' : 'issues'} first` : currentBatch?.status === 'PENDING_CHECKER_REVIEW' ? 'Sent to Finance' : 'Send corrected batch to Finance'}
            </button>
          </section>
        </>
      )}
    </div>
  );
};
