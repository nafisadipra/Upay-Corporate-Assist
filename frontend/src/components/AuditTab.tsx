'use client';

import React from 'react';
import { AuditLog } from '@/types';
import { FileText, ShieldCheck, Clock, User } from 'lucide-react';

interface AuditTabProps {
  logs: AuditLog[];
}

export const AuditTab: React.FC<AuditTabProps> = ({ logs }) => {
  return (
    <div className="space-y-6">
      
      {/* Compliance Header */}
      <div className="card-flat p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 space-y-3 sm:space-y-0">
          <div>
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-extrabold text-slate-900 font-outfit tracking-tight">
                Bangladesh Bank Regulatory Audit Trail
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Immutable event log tracking spreadsheet uploads, typo corrections, risk alert sign-offs, and 2FA OTP payout execution.
            </p>
          </div>

          <div className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Immutable Regulatory Event Log</span>
          </div>
        </div>

        {/* Timeline Log Stream */}
        <div className="pt-4">
          {logs.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              No audit events logged for current active batch. Submit or modify a batch to generate compliance events.
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pl-6 py-2">
              {logs.map((log) => {
                const detailsText = typeof log.details === 'string' ? log.details : JSON.stringify(log.details);
                return (
                  <div key={log.id} className="relative group">
                    
                    {/* Timeline Dot */}
                    <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white ring-4 ring-slate-50"></div>

                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs space-y-1 sm:space-y-0">
                        <div className="flex items-center space-x-2 font-bold text-slate-900 font-outfit">
                          <span>{log.action}</span>
                          <span className="text-slate-400">●</span>
                          <span className="font-mono text-slate-500 font-normal">Log #{log.id}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 font-medium">
                        {detailsText}
                      </p>

                      <div className="flex items-center space-x-4 pt-1 text-[11px] text-slate-500 font-mono">
                        <span className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Performed By: {log.performed_by || `User #${log.user_id}`}</span>
                        </span>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
