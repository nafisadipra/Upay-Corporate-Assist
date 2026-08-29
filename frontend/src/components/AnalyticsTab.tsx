'use client';

import React from 'react';
import { LiquidityForecast } from '@/types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { LineChart as ChartIcon, Sparkles, AlertCircle, TrendingUp } from 'lucide-react';

interface AnalyticsTabProps {
  forecasts?: LiquidityForecast[];
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ forecasts = [] }) => {
  const nextMonthForecast = forecasts.length > 0 ? forecasts[0] : null;
  const projectedAmount = nextMonthForecast ? nextMonthForecast.predicted_amount : 5200000;
  const confidenceScore = nextMonthForecast ? Math.round(nextMonthForecast.confidence_score * 100) : 96;

  const chartData = [
    { month: 'Apr', actual: 4200000, projected: 4200000 },
    { month: 'May', actual: 4500000, projected: 4500000 },
    { month: 'Jun', actual: 4800000, projected: 4800000 },
    { month: 'Jul', actual: 4980000, projected: 4980000 },
    { month: 'Aug (Current)', actual: 4980000, projected: 4980000 },
    { month: 'Sep (AI Forecast)', actual: null, projected: projectedAmount },
    { month: 'Oct (AI Forecast)', actual: null, projected: 4850000 },
  ];

  return (
    <div className="space-y-6">
      
      {/* Forecasting Banner */}
      <div className="card-flat p-6 bg-gradient-to-br from-emerald-900 to-slate-900 text-white border-none shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-yellow-300 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider font-outfit">Predictive Treasury Intelligence</span>
            </div>
            <h2 className="text-2xl font-extrabold font-outfit tracking-tight">
              Pre-Disbursal Liquidity Forecasting
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              ARIMA & Historical Regression models analyzing multi-month payroll cycles to forecast required central wallet float and prevent liquidity shortfalls.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-right min-w-[200px]">
            <span className="text-[11px] text-slate-300 block">Projected Sept 2026 Payout</span>
            <strong className="text-xl font-extrabold font-mono text-yellow-300">BDT {projectedAmount.toLocaleString()}</strong>
            <span className="text-[10px] text-emerald-300 block mt-0.5">Confidence Score: {confidenceScore}%</span>
          </div>
        </div>
      </div>

      {/* Forecast Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-flat p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold font-outfit uppercase tracking-wider">Current Float Balance</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">BDT 5,000,000</div>
          <p className="text-xs text-emerald-600 font-medium mt-1">Pre-funded in Central Wallet</p>
        </div>

        <div className="card-flat p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold font-outfit uppercase tracking-wider">Next Cycle Projected</span>
            <ChartIcon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">BDT {projectedAmount.toLocaleString()}</div>
          <p className="text-xs text-amber-600 font-medium mt-1">+4.4% vs current cycle</p>
        </div>

        <div className="card-flat p-5 bg-amber-50/50 border-amber-200">
          <div className="flex items-center justify-between text-xs text-amber-900 mb-2">
            <span className="font-bold font-outfit uppercase tracking-wider">Recommended Float Top-up</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-950 font-mono">BDT 200,000</div>
          <p className="text-xs text-amber-800 font-medium mt-1">Required before Sep 01 payout</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card-flat p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base font-outfit">Payroll Float Trend & Projection Curve</h3>
            <p className="text-xs text-slate-500 mt-0.5">Historical disbursement float vs upcoming AI projected demand</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">BDT Currency</span>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" stroke="#64748B" fontSize={11} fontFamily="var(--font-outfit)" />
              <YAxis stroke="#64748B" fontSize={11} fontFamily="var(--font-mono)" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '12px', fontFamily: 'var(--font-jakarta)' }}
                formatter={(value: unknown) => [`BDT ${Number(value || 0).toLocaleString()}`, 'Projected Amount']}
              />
              <Area type="monotone" dataKey="projected" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#emeraldGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
