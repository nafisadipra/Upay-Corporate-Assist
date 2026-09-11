'use client';

import { useState } from 'react';
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  LoaderCircle,
} from 'lucide-react';
import { Batch } from '@/types';

interface PayrollArchiveTabProps {
  batches: Batch[];
  onDownload: (batch: Batch) => Promise<void>;
}

const formatPeriod = (period?: string | null) =>
  period
    ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
        new Date(`${period.slice(0, 7)}-01T00:00:00`),
      )
    : 'Payroll period unavailable';

export function PayrollArchiveTab({ batches, onDownload }: PayrollArchiveTabProps) {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const archives = batches
    .filter((batch) => batch.status === 'EXECUTED')
    .sort(
      (a, b) =>
        new Date(b.executed_at || b.created_at).getTime() -
        new Date(a.executed_at || a.created_at).getTime(),
    );

  const download = async (batch: Batch) => {
    setDownloadingId(batch.id);
    try {
      await onDownload(batch);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-50 text-[#ef8354]">
            <Archive className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-outfit text-xl font-extrabold tracking-tight text-[#2d3142]">
              Payroll archive
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
              Download the finalized spreadsheet for every completed payroll. Archives appear
              automatically after funds are disbursed.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="font-outfit text-base font-extrabold text-[#2d3142]">
              Executed payrolls
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Database-backed records of completed disbursements.
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-slate-400">
            {archives.length} archives
          </span>
        </div>
        {archives.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileSpreadsheet className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-600">No payroll archives yet</p>
            <p className="mt-1 text-xs text-slate-400">
              An archive will appear here after the first final disbursement.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {archives.map((batch) => {
              const downloading = downloadingId === batch.id;
              return (
                <article
                  key={batch.id}
                  className="flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <FileSpreadsheet className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-outfit text-sm font-extrabold text-[#2d3142]">
                          {formatPeriod(batch.payroll_period)}
                        </h4>
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Disbursed
                        </span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-slate-500">
                        {batch.file_name}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                        <span>{batch.total_records} employees</span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {batch.executed_at
                            ? new Date(batch.executed_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Execution date unavailable'}
                        </span>
                        <strong className="font-mono text-[#4f5d75]">
                          BDT{' '}
                          {batch.total_amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={() => void download(batch)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#ef8354]/50 bg-white px-4 py-2.5 text-xs font-extrabold text-[#ef8354] transition-all hover:bg-orange-50 active:scale-[.98] disabled:cursor-wait disabled:opacity-60"
                  >
                    {downloading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {downloading ? 'Preparing…' : 'Download Excel'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
