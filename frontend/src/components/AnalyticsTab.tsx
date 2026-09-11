'use client';

import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Info,
  LineChart,
  Gift,
  RefreshCw,
  Save,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { ForecastResponse, ForecastSettings } from '@/types';

interface AnalyticsTabProps {
  forecast: ForecastResponse | null;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  onSaveSettings: (settings: ForecastSettings) => Promise<void>;
}

type TrendPoint = {
  month: string;
  actual: number | null;
  projected: number | null;
  lower: number | null;
  upper: number | null;
};

const ORANGE = '#ff5b24';
const NAVY = '#2d3142';
const formatBDT = (amount: number) =>
  `BDT ${amount.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
const formatCompact = (amount: number) => {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
};
const formatPeriod = (period: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(
    new Date(`${period}-01T00:00:00`),
  );
const displayModel = (model: string) =>
  model.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const ForecastTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload?: TrendPoint }>;
  label?: string;
}) => {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const point = payload[0].payload;
  return (
    <div className="min-w-48 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-lg shadow-slate-900/10">
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      {point.actual !== null && (
        <p className="flex justify-between gap-5 text-xs text-slate-600">
          <span>Completed payroll</span>
          <b className="font-mono text-slate-800">{formatBDT(point.actual)}</b>
        </p>
      )}
      {point.projected !== null && (
        <p className="flex justify-between gap-5 text-xs text-slate-600">
          <span>Projected payout</span>
          <b className="font-mono text-[#e74716]">{formatBDT(point.projected)}</b>
        </p>
      )}
      {point.lower !== null && point.upper !== null && (
        <p className="mt-1 flex justify-between gap-5 text-xs text-slate-500">
          <span>Expected range</span>
          <b className="font-mono text-slate-700">
            {formatCompact(point.lower)}–{formatCompact(point.upper)}
          </b>
        </p>
      )}
    </div>
  );
};

const Metric = ({
  title,
  value,
  subline,
  icon,
  orange = false,
}: {
  title: string;
  value: string;
  subline: string;
  icon: React.ReactNode;
  orange?: boolean;
}) => (
  <section className="rounded-xl border border-[#e5e9f1] bg-white px-5 py-5 shadow-[0_8px_20px_-20px_rgba(45,49,66,.7)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p
          className={`text-[11px] font-extrabold uppercase tracking-wide ${orange ? 'text-[#ff5b24]' : 'text-[#53627e]'}`}
        >
          {title}
        </p>
        <p
          className={`mt-2 font-mono text-2xl font-extrabold tracking-tight ${orange ? 'text-[#ff5b24]' : 'text-[#171c2e]'}`}
        >
          {value}
        </p>
        <p className={`mt-2 text-xs font-medium ${orange ? 'text-[#56617a]' : 'text-[#66728a]'}`}>
          {subline}
        </p>
      </div>
      <span
        className={`grid h-12 w-12 place-items-center rounded-xl border ${orange ? 'border-orange-100 bg-orange-50 text-[#ff5b24]' : 'border-[#e5e9f1] bg-[#f8f9fc] text-[#596b88]'}`}
      >
        {icon}
      </span>
    </div>
  </section>
);

const LiquidityGauge = ({ value, label }: { value: number | null; label: string }) => {
  const percent = value === null ? 0 : Math.min(100, Math.max(0, value));
  const arcLength = 251.33;
  const filledArc = (percent / 100) * arcLength;

  return (
    <div className="mx-auto mt-5 w-48">
      <div className="h-24 overflow-hidden">
        <svg
          viewBox="0 0 200 112"
          className="h-full w-full"
          aria-label={`Liquidity health: ${label}`}
          role="img"
        >
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e4e9f0"
            strokeLinecap="round"
            strokeWidth="15"
          />
          {value !== null && (
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={ORANGE}
              strokeDasharray={`${filledArc} ${arcLength}`}
              strokeLinecap="round"
              strokeWidth="15"
            />
          )}
          {value !== null && (
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="54"
              stroke="#2d3142"
              strokeLinecap="round"
              strokeWidth="3"
              transform={`rotate(${-90 + percent * 1.8} 100 100)`}
            />
          )}
          {value !== null && <circle cx="100" cy="100" r="5" fill="#2d3142" />}
        </svg>
      </div>
      {value !== null && (
        <div className="mt-2 text-center">
          <p className="font-mono text-2xl font-extrabold leading-none text-[#1d2437]">
            {percent.toFixed(0)}%
          </p>
          <p className="mt-1 text-[10px] font-bold text-[#68758e]">{label}</p>
        </div>
      )}
    </div>
  );
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  forecast,
  onRefresh,
  refreshing,
  onSaveSettings,
}) => {
  const [baselineAmount, setBaselineAmount] = useState(() =>
    String(forecast?.settings?.planning_baseline_amount ?? 5000000),
  );
  const [bonusAmount, setBonusAmount] = useState(() =>
    String(forecast?.settings?.festival_bonus_amount ?? 0),
  );
  const [bonusMonths, setBonusMonths] = useState<number[]>(
    () => forecast?.settings?.festival_bonus_months ?? [],
  );
  const [includeBonus, setIncludeBonus] = useState(
    () => forecast?.settings?.include_festival_bonus ?? false,
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');

  const toggleBonusMonth = (month: number) => {
    setSettingsMessage('');
    setBonusMonths((current) =>
      current.includes(month)
        ? current.filter((item) => item !== month)
        : [...current, month].sort((a, b) => a - b),
    );
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSettingsError('');
    setSettingsMessage('');
    const baseline = Number(baselineAmount);
    const bonus = Number(bonusAmount);
    if (!Number.isFinite(baseline) || baseline < 0 || !Number.isFinite(bonus) || bonus < 0) {
      setSettingsError('Enter valid amounts that are zero or greater.');
      return;
    }
    if (includeBonus && bonus > 0 && bonusMonths.length === 0) {
      setSettingsError('Choose at least one festival month.');
      return;
    }
    setSavingSettings(true);
    try {
      await onSaveSettings({
        planning_baseline_amount: baseline,
        include_festival_bonus: includeBonus,
        festival_bonus_amount: bonus,
        festival_bonus_months: bonusMonths,
      });
      setSettingsMessage(
        'Planning settings saved. Forecast amounts now include your current choices.',
      );
    } catch (error) {
      setSettingsError(
        error instanceof Error ? error.message : 'Unable to save forecast settings.',
      );
    } finally {
      setSavingSettings(false);
    }
  };
  const forecasts = forecast?.forecasts || [];
  const nextCycle = forecasts[0] || null;
  const history = forecast?.historical_series || [];
  const historyMonths = forecast?.model.history_months || history.length;
  const modelName = forecast ? displayModel(forecast.model.type) : 'Forecast unavailable';
  const topupNeeded = Boolean(nextCycle && nextCycle.topup_required > 0);
  const coveragePercent =
    nextCycle && nextCycle.predicted_amount > 0
      ? Math.min(100, Math.max(0, (nextCycle.current_balance / nextCycle.predicted_amount) * 100))
      : 0;
  const confidence = forecast?.model.confidence_level;
  const confidencePercent =
    confidence === null || confidence === undefined
      ? null
      : confidence <= 1
        ? confidence * 100
        : confidence;

  const trendData: TrendPoint[] = [
    ...history.slice(-8).map((point) => ({
      month: formatPeriod(point.period),
      actual: point.amount,
      projected: null,
      lower: null,
      upper: null,
    })),
    ...forecasts.map((point) => ({
      month: formatPeriod(point.period),
      actual: null,
      projected: point.predicted_amount,
      lower: point.lower_bound,
      upper: point.upper_bound,
    })),
  ];
  const maximumForecast = Math.max(...forecasts.map((item) => item.predicted_amount), 1);
  const coverageData = nextCycle
    ? [
        {
          name: 'Available float',
          value: Math.min(nextCycle.current_balance, nextCycle.predicted_amount),
          color: ORANGE,
        },
        { name: 'Funding gap', value: Math.max(nextCycle.topup_required, 0), color: NAVY },
        {
          name: 'Unallocated',
          value: Math.max(
            nextCycle.predicted_amount - nextCycle.current_balance - nextCycle.topup_required,
            0,
          ),
          color: '#cbd3df',
        },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <div className="space-y-4 text-[#2d3142]">
      <section className="rounded-xl border border-[#e6eaf1] bg-white px-6 py-5 shadow-[0_8px_24px_-22px_rgba(45,49,66,.75)]">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[#ff5b24]">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-extrabold uppercase tracking-wide text-[#1e2539]">
                Predictive treasury intelligence
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#596985]">
              {modelName} uses this company&apos;s completed payroll cycles to estimate upcoming
              central-wallet funding requirements and highlight potential shortfalls.
            </p>
          </div>
          <div className="min-w-[238px] rounded-lg border border-[#e0e5ed] bg-[#fbfcfe] px-5 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#596985]">
                  Projected {nextCycle ? formatPeriod(nextCycle.period) : 'payout'}
                </p>
                <p className="mt-1 font-mono text-xl font-extrabold text-[#ff5b24]">
                  {nextCycle ? formatBDT(nextCycle.predicted_amount) : 'Not available'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void onRefresh();
                }}
                disabled={refreshing}
                className="inline-flex items-center gap-1 rounded-md border border-[#f3c8ba] bg-white px-2 py-1.5 text-[10px] font-extrabold text-[#d84b20] transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                title="Refresh your company forecast"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing' : 'Refresh'}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-[#596985]">Forecast confidence</span>
              <b className="text-[#2d3142]">
                {confidencePercent === null
                  ? 'Building history'
                  : `${confidencePercent.toFixed(0)}%`}
              </b>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e4e8ef]">
              <div
                className="h-full rounded-full bg-[#ff5b24]"
                style={{ width: `${confidencePercent ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#e5e9f1] bg-white shadow-[0_8px_20px_-20px_rgba(45,49,66,.7)]">
        <div className="flex flex-col gap-3 border-b border-[#edf0f4] px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-50 text-[#ff5b24]">
              <Gift className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-outfit text-base font-extrabold text-[#1d2437]">
                Payroll planning settings
              </h3>
              <p className="mt-0.5 text-xs text-[#68758e]">
                Set the fallback amount and months that need extra festival funding.
              </p>
            </div>
          </div>
          <span
            className={`w-fit rounded-md border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${includeBonus ? 'border-orange-200 bg-orange-50 text-[#d84b20]' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
          >
            {includeBonus ? 'Festival adjustment on' : 'Festival adjustment off'}
          </span>
        </div>

        <form
          onSubmit={saveSettings}
          className="grid gap-6 px-6 py-5 xl:grid-cols-[minmax(0,.72fr)_minmax(0,.72fr)_minmax(25rem,1.5fr)]"
        >
          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#53627e]">
              Planning baseline
            </span>
            <span className="relative mt-2 block">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-xs font-bold text-[#7b879c]">
                BDT
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={baselineAmount}
                onChange={(event) => {
                  setBaselineAmount(event.target.value);
                  setSettingsMessage('');
                }}
                className="h-11 w-full rounded-lg border border-[#dfe5ed] bg-[#fbfcfe] pl-12 pr-3 font-mono text-sm font-bold text-[#263049] outline-none transition focus:border-[#ff8a63] focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </span>
            <span className="mt-1.5 block text-[10px] leading-4 text-[#7b879c]">
              Used when fewer than three completed payroll months are available.
            </span>
          </label>

          <div>
            <label className="block">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#53627e]">
                Festival bonus amount
              </span>
              <span className="relative mt-2 block">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-xs font-bold text-[#7b879c]">
                  BDT
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={bonusAmount}
                  onChange={(event) => {
                    setBonusAmount(event.target.value);
                    setSettingsMessage('');
                  }}
                  disabled={!includeBonus}
                  className="h-11 w-full rounded-lg border border-[#dfe5ed] bg-[#fbfcfe] pl-12 pr-3 font-mono text-sm font-bold text-[#263049] outline-none transition focus:border-[#ff8a63] focus:bg-white focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-45"
                />
              </span>
            </label>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-bold text-[#53627e]">
              <input
                type="checkbox"
                checked={includeBonus}
                onChange={(event) => {
                  setIncludeBonus(event.target.checked);
                  setSettingsMessage('');
                }}
                className="h-4 w-4 accent-[#ff5b24]"
              />
              Include festival bonus in forecasts
            </label>
          </div>

          <fieldset disabled={!includeBonus}>
            <legend className="text-[11px] font-extrabold uppercase tracking-wide text-[#53627e]">
              Festival months
            </legend>
            <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-12 xl:grid-cols-6">
              {MONTHS.map((label, index) => {
                const month = index + 1;
                const selected = bonusMonths.includes(month);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleBonusMonth(month)}
                    className={`h-9 rounded-md border text-[10px] font-extrabold transition ${selected ? 'border-[#ff5b24] bg-[#ff5b24] text-white shadow-sm' : 'border-[#dfe5ed] bg-[#fbfcfe] text-[#60708b] hover:border-orange-200 hover:bg-orange-50'} disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div aria-live="polite">
                {settingsError ? (
                  <p className="text-xs font-bold text-red-600">{settingsError}</p>
                ) : settingsMessage ? (
                  <p className="text-xs font-bold text-emerald-700">{settingsMessage}</p>
                ) : (
                  <p className="text-[10px] text-[#7b879c]">
                    The amount is added once to each selected month.
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#2d3142] px-4 text-xs font-extrabold text-white transition hover:bg-[#202537] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" />
                {savingSettings ? 'Saving...' : 'Save planning settings'}
              </button>
            </div>
          </fieldset>
        </form>
      </section>

      {!nextCycle ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Metric
              title="Current float balance"
              value="—"
              subline="Waiting for wallet and payroll data"
              icon={<Wallet className="h-5 w-5" />}
            />
            <Metric
              title="Next cycle projected"
              value="—"
              subline="Forecast will appear after a refresh"
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <Metric
              title="Recommended float top-up"
              value="—"
              subline="No funding decision available yet"
              icon={<AlertCircle className="h-5 w-5" />}
              orange
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.72fr)_minmax(22rem,.92fr)]">
            <div className="overflow-hidden rounded-xl border border-[#e5e9f1] bg-white shadow-[0_8px_20px_-20px_rgba(45,49,66,.7)]">
              <div className="flex flex-col gap-2 border-b border-[#edf0f4] px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-outfit text-base font-extrabold text-[#1d2437]">
                    Payroll float trend &amp; projection
                  </h3>
                  <p className="mt-1 text-xs text-[#68758e]">
                    Historical disbursement float compared with upcoming projected demand.
                  </p>
                </div>
                <span className="rounded-md border border-[#e5e9f1] px-2.5 py-1 text-[11px] font-bold text-[#596985]">
                  BDT currency
                </span>
              </div>
              <div className="relative h-72 px-6 py-5">
                <div className="absolute inset-x-6 bottom-9 top-7 border-b border-l border-dashed border-[#dce3ec]" />
                <div className="absolute inset-x-6 top-[39%] border-t border-dashed border-[#e8edf3]" />
                <div className="absolute inset-x-6 top-[63%] border-t border-dashed border-[#e8edf3]" />
                <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-[#ff5b24]">
                    <LineChart className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-extrabold text-[#35415a]">
                    Trend chart is ready for payroll history
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-[#748098]">
                    Completed payrolls will populate this chart; forecasts will then appear as the
                    dashed orange line.
                  </p>
                </div>
              </div>
            </div>

            <aside className="rounded-xl border border-[#e5e9f1] bg-white p-6 shadow-[0_8px_20px_-20px_rgba(45,49,66,.7)]">
              <h3 className="font-outfit text-base font-extrabold text-[#1d2437]">
                Funding coverage
              </h3>
              <p className="mt-1 text-xs text-[#68758e]">How the next payout is covered today.</p>
              <div className="mx-auto mt-5 h-36 w-36 rounded-full border-[22px] border-[#e7ebf1]" />
            </aside>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(15rem,.55fr)_minmax(18rem,.78fr)]">
            <div className="rounded-xl border border-[#e5e9f1] bg-white p-6 shadow-[0_8px_20px_-20px_rgba(45,49,66,.7)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-outfit text-sm font-extrabold text-[#1d2437]">
                    Payout &amp; funding outlook
                  </h3>
                  <p className="mt-1 text-xs text-[#68758e]">
                    Upcoming projected payout compared with required top-up.
                  </p>
                </div>
                <span className="rounded-md border border-[#e5e9f1] px-2 py-1 text-[10px] font-bold text-[#596985]">
                  BDT currency
                </span>
              </div>
              <div className="mt-5 flex h-36 items-center justify-center rounded-lg border border-dashed border-[#dce3ec] bg-[#fbfcfe] text-center">
                <div>
                  <BarChart3 className="mx-auto h-5 w-5 text-[#ff5b24]" />
                  <p className="mt-2 text-xs font-bold text-[#60708b]">
                    Funding outlook will populate after the forecast refresh.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[#e5e9f1] bg-white p-6 text-center shadow-[0_8px_20px_-20px_rgba(45,49,66,.7)]">
              <h3 className="font-outfit text-sm font-extrabold text-[#1d2437]">
                Liquidity health
              </h3>
              <LiquidityGauge value={null} label="Awaiting data" />
              <div className="mt-1 flex justify-between px-5 text-[10px] font-bold text-[#8590a4]">
                <span>0%</span>
                <span>100%</span>
              </div>
              <p className="mt-4 text-xs leading-5 text-[#68758e]">
                Health is calculated once the next projected payout is available.
              </p>
            </div>
            <div className="rounded-xl border border-[#e5e9f1] bg-white p-6 shadow-[0_8px_20px_-20px_rgba(45,49,66,.7)]">
              <h3 className="font-outfit text-sm font-extrabold text-[#1d2437]">
                Upcoming payout schedule
              </h3>
              <div className="mt-3 divide-y divide-[#edf0f4]">
                <div className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="text-xs font-bold text-[#53627e]">Next salary disbursement</p>
                    <p className="mt-0.5 text-[10px] text-[#8590a4]">Awaiting forecast data</p>
                  </div>
                  <b className="font-mono text-xs text-[#8590a4]">—</b>
                </div>
                <div className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="text-xs font-bold text-[#53627e]">Future payroll cycle</p>
                    <p className="mt-0.5 text-[10px] text-[#8590a4]">Awaiting forecast data</p>
                  </div>
                  <b className="font-mono text-xs text-[#8590a4]">—</b>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#596985]">
                <CalendarDays className="h-3.5 w-3.5" />
                Forecast refresh required
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Metric
              title="Current float balance"
              value={formatBDT(nextCycle.current_balance)}
              subline="Pre-funded in the central wallet"
              icon={<Wallet className="h-5 w-5" />}
            />
            <Metric
              title="Next cycle projected"
              value={formatBDT(nextCycle.predicted_amount)}
              subline={`${historyMonths} months of company payroll history`}
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <Metric
              title="Recommended float top-up"
              value={topupNeeded ? formatBDT(nextCycle.topup_required) : 'Covered'}
              subline={
                topupNeeded
                  ? `Required before ${formatPeriod(nextCycle.period)} payout`
                  : 'Current float covers the next cycle'
              }
              icon={<AlertCircle className="h-5 w-5" />}
              orange
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.72fr)_minmax(22rem,.92fr)]">
            <div className="overflow-hidden rounded-xl border border-[#e5e9f1] bg-white shadow-[0_8px_20px_-20px_rgba(45,49,66,.7)]">
              <div className="flex flex-col gap-2 border-b border-[#edf0f4] px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-outfit text-base font-extrabold text-[#1d2437]">
                    Completed payroll and what comes next
                  </h3>
                  <p className="mt-1 text-xs text-[#68758e]"></p>
                </div>
                <span className="rounded-md border border-[#e5e9f1] px-2.5 py-1 text-[11px] font-bold text-[#596985]">
                  Amounts in BDT
                </span>
              </div>
              <div className="px-2 pb-4 pt-3">
                <div className="flex gap-5 px-5 text-[10px] font-bold text-[#68758e]">
                  <span className="flex items-center gap-1.5">
                    <i className="h-2.5 w-4 rounded-sm bg-[#2d3142]" />
                    Paid payroll
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="h-2.5 w-4 rounded-sm bg-[#ff5b24]" />
                    Estimated payroll
                  </span>
                </div>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 18, right: 15, left: 4, bottom: 0 }}>
                      <CartesianGrid stroke="#e8edf3" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="month"
                        axisLine={{ stroke: '#b5c0d0' }}
                        tickLine={false}
                        tick={{ fill: '#65728a', fontSize: 10 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        width={44}
                        tickFormatter={(value: number) => `${formatCompact(value)}`}
                        tick={{ fill: '#65728a', fontSize: 10 }}
                      />
                      <Tooltip content={<ForecastTooltip />} cursor={{ fill: '#f4f6f9' }} />
                      <Bar dataKey="actual" name="Paid payroll" fill={NAVY} radius={[4, 4, 0, 0]} />
                      <Bar
                        dataKey="projected"
                        name="Estimated payroll"
                        fill={ORANGE}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <aside className="rounded-xl border border-[#e5e9f1] bg-white p-6 shadow-[0_8px_20px_-20px_rgba(45,49,66,.7)]">
              <h3 className="font-outfit text-base font-extrabold text-[#1d2437]">
                Can the wallet cover the next payroll?
              </h3>
              <p className="mt-1 text-xs text-[#68758e]"></p>
              <div className="relative mt-2 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={coverageData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={76}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {coverageData.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatBDT(Number(value || 0))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <b className="font-mono text-xl text-[#1d2437]">
                      {coveragePercent.toFixed(0)}%
                    </b>
                    <span className="block text-[9px] font-bold uppercase text-slate-400">
                      covered
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                {coverageData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2 text-[#596985]">
                      <i className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <b className="font-mono text-[#2d3142]">{formatBDT(item.value)}</b>
                  </div>
                ))}
              </div>
            </aside>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(15rem,.55fr)_minmax(18rem,.78fr)]">
            <div className="rounded-xl border border-[#e5e9f1] bg-white p-6 shadow-[0_8px_20px_-20px_rgba(45,49,66,.7)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-outfit text-sm font-extrabold text-[#1d2437]">
                    Three-month funding plan
                  </h3>
                  <p className="mt-1 text-xs text-[#68758e]"></p>
                </div>
                <span className="rounded-md border border-[#e5e9f1] px-2 py-1 text-[10px] font-bold text-[#596985]">
                  Amounts in BDT
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {forecasts.map((item) => (
                  <div key={item.period}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <b className="text-[#35415a]">{formatPeriod(item.period)}</b>
                      <span className="font-mono text-[#ff5b24]">
                        Add {formatBDT(item.topup_required)}
                      </span>
                    </div>
                    <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="bg-[#2d3142]"
                        style={{
                          width: `${Math.min(100, (Math.min(item.current_balance, item.predicted_amount) / maximumForecast) * 100)}%`,
                        }}
                      />
                      <span
                        className="bg-[#ff5b24]"
                        style={{
                          width: `${Math.min(100, (item.topup_required / maximumForecast) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-500">
                      Estimated payroll {formatBDT(item.predicted_amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#e5e9f1] bg-white p-6 text-center shadow-[0_8px_20px_-20px_rgba(45,49,66,.7)]">
              <h3 className="font-outfit text-sm font-extrabold text-[#1d2437]">
                Liquidity health
              </h3>
              <LiquidityGauge
                value={coveragePercent}
                label={topupNeeded ? 'Needs funding' : 'Healthy'}
              />
              <div className="mt-1 flex justify-between px-5 text-[10px] font-bold text-[#8590a4]">
                <span>0%</span>
                <span>100%</span>
              </div>
              <p className="mt-4 text-xs leading-5 text-[#68758e]">
                {topupNeeded
                  ? 'Current float does not fully cover the next projected payout.'
                  : 'Current float fully covers the next projected payout.'}
              </p>
            </div>

            <div className="rounded-xl border border-[#e5e9f1] bg-white p-6 shadow-[0_8px_20px_-20px_rgba(45,49,66,.7)]">
              <h3 className="font-outfit text-sm font-extrabold text-[#1d2437]">
                Upcoming payout schedule
              </h3>
              <div className="mt-3 divide-y divide-[#edf0f4]">
                {forecasts.slice(0, 3).map((item, index) => (
                  <div key={item.period} className="flex items-start justify-between gap-3 py-3">
                    <div>
                      <p className="text-xs font-bold text-[#35415a]">
                        {index === 0
                          ? 'Next salary disbursement'
                          : `Projected payroll ${formatPeriod(item.period)}`}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#78849a]">
                        {formatPeriod(item.period)}
                      </p>
                    </div>
                    <b
                      className={`font-mono text-xs ${item.topup_required > 0 ? 'text-[#ff5b24]' : 'text-[#35415a]'}`}
                    >
                      {formatBDT(item.predicted_amount)}
                    </b>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#596985]">
                <CalendarDays className="h-3.5 w-3.5" />
                {modelName}
              </div>
            </div>
          </section>

          <section
            className={`flex items-start gap-3 rounded-xl border px-5 py-4 ${topupNeeded ? 'border-orange-200 bg-orange-50 text-[#a63a1d]' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
          >
            <span className="mt-0.5">
              {topupNeeded ? (
                <CircleAlert className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </span>
            <p className="text-xs leading-5">
              {topupNeeded
                ? `Fund ${formatBDT(nextCycle.topup_required)} before ${formatPeriod(nextCycle.period)} to cover the central forecast. The chart’s shaded area shows the possible forecast range.`
                : 'The current central-wallet float covers the forecasted next payroll. Review the prediction range before a final funding decision.'}
              <Info className="ml-1 inline h-3.5 w-3.5" />
            </p>
          </section>
        </>
      )}
    </div>
  );
};
