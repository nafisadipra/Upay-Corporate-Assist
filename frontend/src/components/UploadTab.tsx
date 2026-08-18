'use client';

import React, { useRef } from 'react';
import { BatchItem, Batch } from '@/types';
import { FileSpreadsheet, CloudUpload, Edit3, Send, CheckCircle2, XCircle, AlertTriangle, HelpCircle, Sparkles } from 'lucide-react';

interface UploadTabProps {
  currentBatch: Batch | null;
  items: BatchItem[];
  onFileUpload: (file: File) => void;
  onEditTypo: (item: BatchItem) => void;
  onSubmitBatch: () => void;
  onLoadSample: () => void;
}

export const UploadTab: React.FC<UploadTabProps> = ({
  currentBatch,
  items,
  onFileUpload,
  onEditTypo,
  onSubmitBatch,
  onLoadSample,
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

  return (
    <div className="space-y-6">
      
      {/* Upload Zone Panel */}
      <div className="card-flat p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 space-y-3 sm:space-y-0">
          <div>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 text-lg font-outfit">HR Bulk Payroll Upload Zone</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Upload corporate payroll spreadsheet (.xlsx, .csv). Automated scanner verifies phone numbers against PostgreSQL core accounts & HR roster.
            </p>
          </div>

          {/* 5% Yellow Highlight CTA Button */}
          <button
            onClick={onLoadSample}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all self-start sm:self-auto shadow-xs hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Load Sample Spreadsheet</span>
          </button>
        </div>

        {/* Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30 p-8 rounded-2xl text-center cursor-pointer transition-all group"
        >
          <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center mx-auto text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-all">
            <CloudUpload className="w-7 h-7" />
          </div>
          <h4 className="mt-3 font-extrabold text-slate-900 text-sm font-outfit">Drag & drop your HR Payroll spreadsheet here</h4>
          <p className="text-xs text-slate-400 mt-1">Supports .xlsx, .xls, .csv files (Up to 16MB)</p>
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
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all inline-flex items-center space-x-2 shadow-xs"
          >
            <span>Browse Spreadsheet File</span>
          </button>
        </div>
      </div>

      {/* Bento Validation Grid Panel */}
      <div className="card-flat p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 space-y-3 sm:space-y-0">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg font-outfit">Automated Bento Validation Grid</h3>
            <p className="text-xs text-slate-500 mt-1">
              Multi-stage verification: Green (Valid), Red (Unregistered/Inactive), Yellow (Ghost Employee Check & AI Anomaly)
            </p>
          </div>

          <button
            onClick={onSubmitBatch}
            disabled={!currentBatch || items.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center space-x-2 transition-all shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span>Submit Batch to Finance Director</span>
          </button>
        </div>

        {/* Summary Stat Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-xs">
          <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 text-emerald-900 flex items-center justify-between">
            <span className="font-medium">Valid & Verified:</span>
            <strong className="text-emerald-950 font-mono text-sm">{validCount}</strong>
          </div>
          <div className="bg-red-50/80 p-3.5 rounded-xl border border-red-200 text-red-900 flex items-center justify-between">
            <span className="font-medium">Red Flags (Errors):</span>
            <strong className="text-red-950 font-mono text-sm">{errorCount}</strong>
          </div>
          <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-300 text-amber-950 flex items-center justify-between">
            <span className="font-medium">Orange Flags (AI Risk):</span>
            <strong className="text-amber-950 font-mono text-sm">{anomalyCount}</strong>
          </div>
          <div className="bg-slate-100/80 p-3.5 rounded-xl border border-slate-200 text-slate-900 flex items-center justify-between">
            <span className="font-medium">Total Payout:</span>
            <strong className="text-slate-950 font-mono text-sm">BDT {totalAmount.toLocaleString()}</strong>
          </div>
        </div>

        {/* Bento Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="pb-3">#</th>
                <th className="pb-3">Payee Name</th>
                <th className="pb-3">Phone Number</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Account Validation Grid</th>
                <th className="pb-3">AI Baseline Auditor</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Upload a spreadsheet or click "Load Sample Spreadsheet" to inspect the Bento Validation Grid.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3.5 font-bold text-slate-900 font-outfit">{item.employee_name}</td>
                    <td className="py-3.5 font-mono">
                      {item.corrected_phone_number ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {item.corrected_phone_number} (Fixed)
                        </span>
                      ) : (
                        <span className="text-slate-800">{item.raw_phone_number}</span>
                      )}
                    </td>
                    <td className="py-3.5 text-slate-600">{item.department}</td>
                    <td className="py-3.5 font-extrabold text-slate-900 font-mono">BDT {item.amount.toLocaleString()}</td>
                    
                    {/* Account Validation Status Column */}
                    <td className="py-3.5">
                      {item.account_validation_status === 'VALID' && (
                        <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Valid Account</span>
                        </span>
                      )}

                      {item.account_validation_status === 'UNREGISTERED_ACCOUNT' && (
                        <span className="inline-flex items-center space-x-1.5 bg-red-50 text-red-800 border border-red-200 px-2.5 py-1 rounded-xl text-[11px] font-bold">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>Unregistered Account</span>
                        </span>
                      )}

                      {item.account_validation_status === 'INACTIVE_ACCOUNT' && (
                        <span className="inline-flex items-center space-x-1.5 bg-red-50 text-red-800 border border-red-200 px-2.5 py-1 rounded-xl text-[11px] font-bold">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>Inactive Account</span>
                        </span>
                      )}

                      {item.account_validation_status === 'UNRECOGNIZED_PAYEE' && (
                        <span className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-xl text-[11px] font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Unrecognized Payee (Roster Mismatch)</span>
                        </span>
                      )}
                    </td>

                    {/* AI Baseline Auditor Column */}
                    <td className="py-3.5">
                      {item.baseline_status === 'BASELINE_PENDING' ? (
                        <span className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-950 border border-amber-300 px-2.5 py-1 rounded-xl text-[11px] font-bold">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Baseline Pending (Dept Avg Fallback)</span>
                        </span>
                      ) : item.is_anomaly ? (
                        <span className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-950 border border-amber-300 px-2.5 py-1 rounded-xl text-[11px] font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>AI Variance Flag</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-medium">Normal Pattern</span>
                      )}
                    </td>

                    {/* Action Column */}
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => onEditTypo(item)}
                        className="bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 px-3 py-1 rounded-xl font-bold text-[11px] inline-flex items-center space-x-1 transition-all hover:scale-[1.02]"
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
