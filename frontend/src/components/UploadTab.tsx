'use client';

import React, { useRef } from 'react';
import { BatchItem, Batch } from '@/types';
import { FileSpreadsheet, CloudUpload, Edit3, Send, CheckCircle2, XCircle, AlertTriangle, HelpCircle, Sparkles, CheckCheck, LayoutGrid } from 'lucide-react';

interface UploadTabProps {
  currentBatch: Batch | null;
  items: BatchItem[];
  onFileUpload: (file: File) => void;
  onEditTypo: (item: BatchItem) => void;
  onSubmitBatch: () => void;
  onLoadSample: () => void;
  onExecuteDisbursal?: () => void;
}

export const UploadTab: React.FC<UploadTabProps> = ({
  currentBatch,
  items,
  onFileUpload,
  onEditTypo,
  onSubmitBatch,
  onLoadSample,
  onExecuteDisbursal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const validCount = items.filter((i) => i.account_validation_status === 'VALID' || i.account_validation_status === 'UNRECOGNIZED_PAYEE').length;
  const errorCount = items.filter((i) => i.account_validation_status !== 'VALID' && i.account_validation_status !== 'UNRECOGNIZED_PAYEE').length;
  const anomalyCount = items.filter((i) => i.is_anomaly || i.baseline_status === 'BASELINE_PENDING').length;
  const totalAmount = items.reduce((acc, i) => acc + i.amount, 0);

  const isReviewed = currentBatch?.status === 'CHECKER_REVIEWED';
  const isExecuted = currentBatch?.status === 'EXECUTED';

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
              Checker notes: {currentBatch?.checker_notes || 'Approved for disbursement'}. You can now give the final look and execute payout.
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
            <p className="text-[11px] text-slate-500">Funds debited from central disbursement float. Payouts processed to Upay accounts.</p>
          </div>
        </div>
      )}

      {/* Upload Zone Panel */}
      <div className="bg-[#ffffff] border border-slate-100 rounded-xl p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-100 space-y-4 sm:space-y-0">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#ef8354]/10 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-[#ef8354]" />
              </div>
              <h3 className="font-extrabold text-[#2d3142] text-xl font-outfit tracking-tight">HR Bulk Payroll Upload Zone</h3>
            </div>
            <p className="text-xs text-[#4f5d75] mt-2 max-w-xl leading-relaxed">
              Upload corporate payroll spreadsheet (.xlsx, .csv). Automated scanner verifies phone numbers against PostgreSQL core accounts & HR roster.
            </p>
          </div>

          <button
            onClick={onLoadSample}
            className="bg-[#ffffff] hover:bg-[#ef8354]/5 text-[#ef8354] border border-[#ef8354]/30 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 transition-all self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>Load Sample Spreadsheet</span>
          </button>
        </div>

        {/* Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-[#bfc0c0] hover:border-[#ef8354] bg-[#fcfcfc] hover:bg-[#ef8354]/5 p-12 rounded-2xl text-center cursor-pointer transition-all group max-w-4xl mx-auto"
        >
          <div className="w-16 h-16 bg-[#ffffff] rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center mx-auto text-[#ef8354] group-hover:scale-105 transition-transform duration-300">
            <CloudUpload className="w-8 h-8" />
          </div>
          <h4 className="mt-5 font-extrabold text-[#2d3142] text-base font-outfit">Drag & drop your HR Payroll spreadsheet here</h4>
          <p className="text-[13px] text-[#4f5d75] mt-1.5">Supports .xlsx, .xls, .csv files (Up to 16MB)</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="mt-6 bg-[#ef8354] hover:bg-[#d67045] active:scale-[0.98] text-[#ffffff] px-6 py-3 rounded-xl text-sm font-bold transition-all inline-flex items-center space-x-2 shadow-sm"
          >
            <span>Browse Spreadsheet File</span>
          </button>
        </div>
      </div>

      {/* Bento Validation Grid Panel */}
      <div className="bg-[#ffffff] border border-slate-100 rounded-xl p-8 shadow-sm mt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 space-y-4 md:space-y-0">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-1">
              <LayoutGrid className="w-5 h-5 text-[#4f5d75]" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#2d3142] text-xl font-outfit tracking-tight">Automated Bento Validation Grid</h3>
              <p className="text-[13px] text-[#4f5d75] mt-1.5">
                Multi-stage verification: Green (Valid), Red (Unregistered/Inactive), Yellow (Ghost Employee Check & AI Anomaly)
              </p>
            </div>
          </div>

          <button
            onClick={onSubmitBatch}
            disabled={!currentBatch || items.length === 0 || isReviewed || isExecuted}
            className="bg-[#4f5d75] hover:bg-[#3d485c] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-[#ffffff] px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 transition-all shadow-sm shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>{currentBatch?.status === 'PENDING_CHECKER_REVIEW' ? 'Submitted to Checker' : 'Submit Batch to Finance Director'}</span>
          </button>
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
            <strong className="text-[#2d3142] font-outfit text-xl font-extrabold">{validCount}</strong>
          </div>
          
          <div className="bg-[#ffffff] p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <span className="font-bold text-[13px] text-[#2d3142]">Red Flags (Errors)</span>
            </div>
            <strong className="text-[#2d3142] font-outfit text-xl font-extrabold">{errorCount}</strong>
          </div>
          
          <div className="bg-[#ffffff] p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <span className="font-bold text-[13px] text-[#2d3142]">Orange Flags (AI Risk)</span>
            </div>
            <strong className="text-[#2d3142] font-outfit text-xl font-extrabold">{anomalyCount}</strong>
          </div>
          
          <div className="bg-[#ffffff] p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                <div className="w-5 h-5 text-[#4f5d75]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                </div>
              </div>
              <span className="font-bold text-[13px] text-[#2d3142]">Total Payout</span>
            </div>
            <strong className="text-[#2d3142] font-outfit text-base font-extrabold tracking-tight">BDT {totalAmount.toLocaleString()}</strong>
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
                <th className="pb-4 px-2">AMOUNT</th>
                <th className="pb-4 px-2">ACCOUNT VALIDATION GRID</th>
                <th className="pb-4 px-2">AI BASELINE AUDITOR</th>
                <th className="pb-4 px-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#bfc0c0]">
                    Upload a spreadsheet or click &quot;Load Sample Spreadsheet&quot; to inspect the Bento Validation Grid.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-2 font-mono text-[#bfc0c0]">{idx + 1}</td>
                    <td className="py-4 px-2 font-bold text-[#2d3142] font-outfit">{item.employee_name}</td>
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
                    <td className="py-4 px-2 font-extrabold text-[#2d3142] font-outfit">BDT {item.amount.toLocaleString()}</td>
                    
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
                          <span>Baseline Pending (Dept Avg Fallback)</span>
                        </span>
                      ) : item.is_anomaly ? (
                        <span className="inline-flex items-center space-x-1.5 bg-amber-50/50 text-[#ef8354] border border-[#ef8354]/30 px-3 py-1 rounded-full text-[11px] font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#ef8354]" />
                          <span>AI Variance Flag</span>
                        </span>
                      ) : (
                        <span className="text-[#4f5d75] text-[12px] font-medium">Normal Pattern</span>
                      )}
                    </td>

                    {/* Action Column */}
                    <td className="py-4 px-2 text-right">
                      <button
                        onClick={() => onEditTypo(item)}
                        className="bg-[#ffffff] hover:bg-slate-50 text-[#4f5d75] border border-slate-200 px-3 py-1 rounded-lg font-bold text-[11px] inline-flex items-center space-x-1.5 transition-all shadow-sm whitespace-nowrap"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Fix Typo</span>
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
