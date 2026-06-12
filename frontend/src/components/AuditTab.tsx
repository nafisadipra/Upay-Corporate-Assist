'use client';

import React from 'react';
import { AuditLog } from '@/types';
import { CheckCircle2, ChevronDown, Clock, FileText, ShieldCheck, User } from 'lucide-react';

interface AuditTabProps { logs: AuditLog[]; }

const EVENT_COPY: Record<string, { title: string; summary: string }> = {
  BATCH_UPLOADED: { title: 'Payroll file uploaded', summary: 'HR uploaded a payroll file for checking.' },
  BATCH_UPLOADED_AND_SCREENED: { title: 'Payroll uploaded and checked', summary: 'The payroll file was checked for account and payment issues.' },
  CORE_ACCOUNT_VERIFICATION: { title: 'Employee accounts checked', summary: 'Employee mobile accounts were verified before payment.' },
  AI_RISK_SCREENING_COMPLETED: { title: 'Payroll risk check completed', summary: 'The payroll was checked for unusual payment patterns.' },
  BATCH_SUBMITTED_FOR_CHECKER_REVIEW: { title: 'Payroll sent to Finance', summary: 'HR sent the payroll to Finance for review and approval.' },
  BATCH_CHECKER_REVIEW_SIGNOFF: { title: 'Finance approved the payroll', summary: 'Finance completed its review and approved the batch for disbursement.' },
  BATCH_RETURNED_TO_HR: { title: 'Payroll returned to HR', summary: 'Finance found an issue and returned the affected payroll row for correction.' },
  PAYROLL_ITEM_CORRECTED: { title: 'Payroll row corrected', summary: 'HR corrected the payroll information and checked it again.' },
  RISK_ALERT_REVIEWED: { title: 'Payroll issue reviewed', summary: 'Finance reviewed and recorded a decision on a payroll issue.' },
  BATCH_DISBURSEMENT_EXECUTED: { title: 'Payroll disbursed', summary: 'The approved payroll was paid from the company wallet.' },
  CORPORATE_WALLET_CREATED: { title: 'Company wallet created', summary: 'A new company wallet was added.' },
  CORPORATE_WALLET_UPDATED: { title: 'Company wallet updated', summary: 'The company wallet information or balance was updated.' },
  EMPLOYEE_REGISTRATION_SUBMITTED: { title: 'Employee registrations submitted', summary: 'HR sent employee registrations for approval.' },
  EMPLOYEE_REGISTRATION_APPROVED: { title: 'Employee registration approved', summary: 'The employee was approved and added to the company roster.' },
};

const DETAIL_LABELS: Record<string, string> = {
  file_name: 'Payroll file', payroll_period: 'Payroll month', total_amount: 'Payroll amount', total_records: 'Employees',
  valid_records: 'Ready for payment', invalid_records: 'Records needing attention', flagged_anomalies: 'Issues found',
  notes: 'Note', employee_name: 'Employee', issue_type: 'Issue type', corrected_phone: 'Corrected mobile number',
  raw_phone: 'Previous mobile number', new_validation_status: 'Account check', basic_salary: 'Basic salary',
  gross_salary: 'Gross salary', finance_issues_resolved: 'Finance issues fixed', rows: 'Employees submitted',
  email: 'Email', wallet_details: 'Mobile wallet', opening_balance: 'Opening balance', company_name: 'Company',
  bank_name: 'Bank', account_number: 'Account number', action: 'Decision',
};

const HIDDEN_DETAILS = new Set(['batch_id', 'item_id', 'registration_id', 'review_status', 'algorithm']);
const MONEY_DETAILS = new Set(['total_amount', 'basic_salary', 'gross_salary', 'opening_balance', 'amount']);

function titleCase(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function eventCopy(action: string) {
  return EVENT_COPY[action] || { title: titleCase(action), summary: 'This payroll activity was recorded securely.' };
}

function parseDetails(details: AuditLog['details']): Record<string, unknown> {
  if (typeof details !== 'string') return details || {};
  try {
    const parsed = JSON.parse(details);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return { note: details };
  }
}

function formatDetail(key: string, value: unknown) {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (MONEY_DETAILS.has(key) && typeof value === 'number') return `BDT ${value.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;
  if (key === 'payroll_period' && typeof value === 'string') {
    const date = new Date(`${value.slice(0, 7)}-01T00:00:00`);
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date);
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).join(', ');
  return key.includes('status') || key.includes('type') || key === 'action' ? titleCase(String(value)) : String(value);
}

export const AuditTab: React.FC<AuditTabProps> = ({ logs }) => (
  <div className="space-y-6">
    <section className="card-flat p-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-600" /><h2 className="font-outfit text-xl font-extrabold tracking-tight text-slate-900">Payroll activity history</h2></div>
          <p className="mt-1 text-xs text-slate-500">A clear record of payroll uploads, corrections, approvals, and payments.</p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-900 shadow-xs"><ShieldCheck className="h-4 w-4 text-emerald-600" /><span>Protected activity record</span></div>
      </div>

      <div className="pt-5">
        {logs.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">No payroll activity has been recorded for the selected batch yet.</div>
        ) : (
          <div className="relative ml-4 space-y-5 border-l-2 border-emerald-100 py-2 pl-7">
            {logs.map((log) => {
              const copy = eventCopy(log.action);
              const details = Object.entries(parseDetails(log.details)).filter(([key]) => !HIDDEN_DETAILS.has(key));
              return (
                <article key={log.id} className="relative rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_6px_18px_-18px_rgba(45,49,66,.7)]">
                  <span className="absolute -left-[36px] top-4 grid h-4 w-4 place-items-center rounded-full bg-emerald-600 ring-4 ring-emerald-50"><CheckCircle2 className="h-2.5 w-2.5 text-white" /></span>
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h3 className="font-outfit text-sm font-extrabold text-slate-900">{copy.title}</h3><span className="hidden text-slate-300 sm:inline">•</span><p className="truncate text-xs text-slate-600">{copy.summary}</p></div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-slate-400" /><strong className="text-slate-700">{log.performed_by || 'Authorized user'}</strong></span>
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400" /><time dateTime={log.created_at}>{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.created_at))}</time></span>
                    </div>
                  </div>

                  {details.length > 0 && (
                    <details className="group mt-2 border-t border-slate-100 pt-2">
                      <summary className="flex cursor-pointer list-none items-center gap-1 text-[10px] font-extrabold text-emerald-700 focus:outline-none"><ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />View details</summary>
                      <dl className="mt-2 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
                        {details.map(([key, value]) => (
                          <div key={key} className={key === 'notes' || key === 'note' ? 'sm:col-span-2 lg:col-span-3' : ''}>
                            <dt className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{DETAIL_LABELS[key] || titleCase(key)}</dt>
                            <dd className="mt-0.5 break-words text-xs font-bold text-slate-700">{formatDetail(key, value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  </div>
);
