'use client';

import React, { useRef } from 'react';
import { BatchItem, Batch } from '@/types';
import {
  FileSpreadsheet,
  CloudUpload,
  Edit3,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Download,
  CheckCheck,
  LayoutGrid,
  Clock3,
  RefreshCw,
} from 'lucide-react';

interface UploadTabProps {
  currentBatch: Batch | null;
  items: BatchItem[];
  hasFinanceReviews: boolean;
  onFileUpload: (file: File, payrollPeriod: string) => void;
  onEditTypo: (item: BatchItem) => void;
  onSubmitBatch: () => void;
  onExecuteDisbursal?: () => void;
  payrollPeriod: string;
}

export const UploadTab: React.FC<UploadTabProps> = ({
  currentBatch,
  items,
  hasFinanceReviews,
  onFileUpload,
  onEditTypo,
  onSubmitBatch,
  onExecuteDisbursal,
  payrollPeriod,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const payrollPeriodLabel = payrollPeriod
    ? new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
        new Date(`${payrollPeriod}-01T00:00:00`),
      )
    : 'the selected month';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0], payrollPeriod);
      e.target.value = '';
    }
  };

  const validCount = items.filter(
    (i) =>
      i.account_validation_status === 'VALID' ||
      i.account_validation_status === 'UNRECOGNIZED_PAYEE',
  ).length;
  const errorCount = items.filter(
    (i) =>
      i.account_validation_status !== 'VALID' &&
      i.account_validation_status !== 'UNRECOGNIZED_PAYEE',
  ).length;
  const limitedHistoryCount = items.filter((i) => i.baseline_status === 'BASELINE_PENDING').length;
  const totalGrossSalary = items.reduce((acc, i) => acc + i.gross_salary, 0);

  const isReviewed = currentBatch?.status === 'CHECKER_REVIEWED';
  const isExecuted = currentBatch?.status === 'EXECUTED';
  const canSubmitToFinance =
    !currentBatch ||
    ['DRAFT', 'VALIDATED', 'FLAGGED_RISK', 'RETURNED_TO_HR'].includes(currentBatch.status);
  const sortedItems = [...items].sort((left, right) =>
    left.employee_name.localeCompare(right.employee_name, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  );

  return (
    <div className="space-y-6">
      {/* Ready for Disbursal Notification if Checker has approved */}
      {isReviewed && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div>
            <div className="flex items-center space-x-2 font-bold text-emerald-900">
              <CheckCheck className="w-5 h-5 text-emerald-700" />
              <span className="font-outfit text-base">Finance Director Sign-Off Complete</span>
            </div>
            <p className="text-xs text-emerald-800 mt-1">
              Checker notes: {currentBatch?.checker_notes || 'Approved for disbursement'}. You can
              now give the final look and execute payout.
            </p>
          </div>
          {onExecuteDisbursal && (
            <button
              onClick={onExecuteDisbursal}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 rounded-xl font-extrabold text-xs flex items-center space-x-2 transition-all shadow-md shadow-emerald-900/20 active:scale-[0.98] self-start sm:self-auto"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Final Look & Execute Disbursal</span>
            </button>
          )}
        </div>
      )}

      {isExecuted && (
        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 text-slate-900 flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          <div>
            <span className="font-bold text-xs font-outfit">Payout Batch Executed</span>
            <p className="text-[11px] text-slate-500">
              Funds debited from central disbursement float. Payouts processed to Upay accounts.
            </p>
          </div>
        </div>
      )}

      {/* Upload Zone Panel */}
      <div className="bg-[#ffffff] border border-slate-100 rounded-xl px-8 py-7 shadow-sm">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-9">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#ef8354]/10 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-[#ef8354]" />
              </div>
              <h3 className="font-extrabold text-[#2d3142] text-xl font-outfit tracking-tight">
                HR Bulk Payroll Upload Zone
              </h3>
            </div>
            <p className="text-xs text-[#4f5d75] mt-2 max-w-xl leading-relaxed">
              Upload the spreadsheet for the payroll month selected in the sidebar. That month
              becomes the historical period used in liquidity forecasting.
            </p>
          </div>

          <div className="flex self-start border-t border-slate-100 pt-5 lg:self-auto lg:border-l lg:border-t-0 lg:pl-9 lg:pt-0">
            <a
              href="/templates/payroll-upload-template.xlsx"
              download="upay-payroll-upload-template.xlsx"
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-[#ef8354]/60 bg-[#ffffff] px-6 py-3 text-sm font-bold text-[#ef8354] transition-all hover:bg-[#ef8354]/5 whitespace-nowrap lg:w-auto"
            >
              <Download className="w-4 h-4" />
              <span>Download Sample Spreadsheet</span>
            </a>
          </div>
        </div>
      </div>

      <div
        className={`rounded-xl border p-2 shadow-sm ${currentBatch ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-100 bg-white'}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx, .xls, .csv"
          className="hidden"
        />
        {currentBatch ? (
          <div className="rounded-2xl border border-emerald-200 bg-white px-6 py-6 sm:px-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <FileSpreadsheet className="h-7 w-7" />
                  <span className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-emerald-600 text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-outfit text-base font-extrabold text-[#2d3142]">
                      Spreadsheet uploaded successfully
                    </h4>
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
                      Uploaded
                    </span>
                  </div>
                  <p className="mt-1.5 truncate font-mono text-xs font-bold text-[#4f5d75]">
                    {currentBatch.file_name}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {items.length} payroll rows · {payrollPeriodLabel} · Ready for validation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#ef8354]/60 bg-white px-5 py-3 text-xs font-extrabold text-[#ef8354] transition-all hover:bg-orange-50 active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-[#ef8354]/20"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Replace spreadsheet</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group mx-auto cursor-pointer rounded-2xl border border-dashed border-[#cbd4df] bg-[#fcfcfc] px-6 py-8 text-center transition-all hover:border-[#ef8354] hover:bg-[#ef8354]/5 sm:py-6"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-white text-[#ef8354] shadow-sm transition-transform duration-300 group-hover:scale-105">
              <CloudUpload className="h-8 w-8" />
            </div>
            <h4 className="mt-4 font-outfit text-base font-extrabold text-[#2d3142]">
              Drag &amp; drop your HR Payroll spreadsheet here
            </h4>
            <p className="mt-1.5 text-[13px] text-[#4f5d75]">
              Uploading for <strong className="text-[#2d3142]">{payrollPeriodLabel}</strong> ·
              Supports .xlsx, .xls, .csv files (Up to 16MB)
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-5 inline-flex items-center space-x-2 rounded-xl bg-[#ef8354] px-7 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#d67045] active:scale-[0.98]"
            >
              <CloudUpload className="h-4 w-4" />
              <span>Browse Spreadsheet File</span>
            </button>
          </div>
        )}
      </div>

      {/* Bento Validation Grid Panel */}
      <div className="bg-[#ffffff] border border-slate-100 rounded-xl p-8 shadow-sm mt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 space-y-4 md:space-y-0">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-1">
              <LayoutGrid className="w-5 h-5 text-[#4f5d75]" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#2d3142] text-xl font-outfit tracking-tight">
                Automated Bento Validation Grid
              </h3>
              <p className="text-[13px] text-[#4f5d75] mt-1.5">
                Multi-stage verification: account status, payroll-history coverage, and unusual
                salary variance checks.
              </p>
            </div>
          </div>

          {canSubmitToFinance && !hasFinanceReviews && (
            <button
              onClick={onSubmitBatch}
              disabled={!currentBatch || items.length === 0 || isReviewed || isExecuted}
              className="bg-[#4f5d75] hover:bg-[#3d485c] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-[#ffffff] px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 transition-all shadow-sm shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Submit Batch to Finance Director</span>
            </button>
          )}
          {currentBatch?.status === 'PENDING_CHECKER_REVIEW' && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-amber-900">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-amber-200 bg-white text-amber-600">
                <Clock3 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-extrabold">Waiting for Finance Director review</p>
                <p className="mt-0.5 text-[10px] text-amber-700">
                  The submitted batch is locked until Finance completes the review.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Summary Stat Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#ffffff] p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="font-bold text-[13px] text-[#2d3142]">Valid & Verified</span>
            </div>
            <strong className="text-[#2d3142] font-outfit text-xl font-extrabold">
              {validCount}
            </strong>
          </div>

          <div className="bg-[#ffffff] p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <span className="font-bold text-[13px] text-[#2d3142]">Red Flags (Errors)</span>
            </div>
            <strong className="text-[#2d3142] font-outfit text-xl font-extrabold">
              {errorCount}
            </strong>
          </div>

          <div className="bg-[#ffffff] p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <span className="font-bold text-[13px] text-[#2d3142]">Limited History Checks</span>
            </div>
            <strong className="text-[#2d3142] font-outfit text-xl font-extrabold">
              {limitedHistoryCount}
            </strong>
          </div>

          <div className="bg-[#ffffff] p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                <div className="w-5 h-5 text-[#4f5d75]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                  </svg>
                </div>
              </div>
              <span className="font-bold text-[13px] text-[#2d3142]">Total Gross Salary</span>
            </div>
            <strong className="text-[#2d3142] font-outfit text-base font-extrabold tracking-tight">
              BDT {totalGrossSalary.toLocaleString()}
            </strong>
          </div>
        </div>

        {/* Bento Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-[#bfc0c0] font-extrabold uppercase text-[10px] tracking-wider">
                <th className="pb-4 px-2">#</th>
                <th className="pb-4 px-2">PAYEE NAME</th>
                <th className="pb-4 px-2">PHONE NUMBER</th>
                <th className="pb-4 px-2">DEPARTMENT</th>
                <th className="pb-4 px-2">BASIC SALARY</th>
                <th className="pb-4 px-2">GROSS SALARY</th>
                <th className="pb-4 px-2">ACCOUNT VALIDATION GRID</th>
                <th className="pb-4 px-2">AI BASELINE AUDITOR</th>
                <th className="pb-4 px-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[#bfc0c0]">
                    Upload a spreadsheet to inspect the Bento Validation Grid.
                  </td>
                </tr>
              ) : (
                sortedItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-2 font-mono text-[#bfc0c0]">{idx + 1}</td>
                    <td className="py-4 px-2 font-bold text-[#2d3142] font-outfit">
                      {item.employee_name}
                    </td>
                    <td className="py-4 px-2 font-mono font-medium text-[#2d3142]">
                      {item.corrected_phone_number ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {item.corrected_phone_number} (Fixed)
                        </span>
                      ) : (
                        item.raw_phone_number
                      )}
                    </td>
                    <td className="py-4 px-2 text-[#4f5d75] font-medium">{item.department}</td>
                    <td className="py-4 px-2 font-extrabold text-[#2d3142] font-outfit">
                      BDT {item.basic_salary.toLocaleString()}
                    </td>
                    <td className="py-4 px-2 font-extrabold text-[#2d3142] font-outfit">
                      BDT {item.gross_salary.toLocaleString()}
                    </td>

                    {/* Account Validation Status Column */}
                    <td className="py-4 px-2">
                      {item.account_validation_status === 'VALID' && (
                        <span className="inline-flex items-center space-x-1.5 bg-emerald-50/50 text-emerald-700 border border-emerald-200/60 px-3 py-1 rounded-full text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Valid Account</span>
                        </span>
                      )}

                      {item.account_validation_status === 'UNREGISTERED_ACCOUNT' && (
                        <span className="inline-flex items-center space-x-1.5 bg-red-50/50 text-red-700 border border-red-200/60 px-3 py-1 rounded-full text-[11px] font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Unregistered Account</span>
                        </span>
                      )}

                      {item.account_validation_status === 'INACTIVE_ACCOUNT' && (
                        <span className="inline-flex items-center space-x-1.5 bg-red-50/50 text-red-700 border border-red-200/60 px-3 py-1 rounded-full text-[11px] font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Inactive Account</span>
                        </span>
                      )}

                      {item.account_validation_status === 'UNRECOGNIZED_PAYEE' && (
                        <span className="inline-flex items-center space-x-1.5 bg-amber-50/50 text-amber-700 border border-amber-300/60 px-3 py-1 rounded-full text-[11px] font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Unrecognized Payee (Roster Mismatch)</span>
                        </span>
                      )}
                    </td>

                    {/* AI Baseline Auditor Column */}
                    <td className="py-4 px-2">
                      {item.baseline_status === 'BASELINE_PENDING' ? (
                        <span className="inline-flex items-center space-x-1.5 bg-amber-50/50 text-amber-700 border border-amber-300/60 px-3 py-1 rounded-full text-[11px] font-bold">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Limited history — checked against department average</span>
                        </span>
                      ) : item.is_anomaly ? (
                        <span className="inline-flex items-center space-x-1.5 bg-amber-50/50 text-[#ef8354] border border-[#ef8354]/30 px-3 py-1 rounded-full text-[11px] font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#ef8354]" />
                          <span>AI Variance Flag</span>
                        </span>
                      ) : (
                        <span className="text-[#4f5d75] text-[12px] font-medium">
                          Normal Pattern
                        </span>
                      )}
                    </td>

                    {/* Action Column */}
                    <td className="py-4 px-2 text-right">
                      <button
                        onClick={() => onEditTypo(item)}
                        className="bg-[#ffffff] hover:bg-slate-50 text-[#4f5d75] border border-slate-200 px-3 py-1 rounded-lg font-bold text-[11px] inline-flex items-center space-x-1.5 transition-all shadow-sm whitespace-nowrap"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit row</span>
                      </button>
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
