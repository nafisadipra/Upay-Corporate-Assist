'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckSquare, Info, RefreshCw, Square, Wallet } from 'lucide-react';
import { MessageBar, MessageBarBody, Spinner } from '@fluentui/react-components';
import { useAuth } from '@/components/AdminLayout';
import * as api from '@/lib/api';
import { Company, ForecastResponse, LiquidityForecast } from '@/types';

const formatBDT = (amount: number) => new Intl.NumberFormat('en-BD', {
  style: 'currency', currency: 'BDT', maximumFractionDigits: 0,
}).format(amount);

const formatCompactBDT = (amount: number) => `BDT ${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
const formatPeriod = (period: string) => new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(`${period}-01T00:00:00`));

function ForecastComboChart({ history, forecasts }: { history: Array<{ period: string; amount: number }>; forecasts: LiquidityForecast[] }) {
  const historical = history.slice(-12).map((point) => ({ period: point.period, amount: point.amount }));
  const series = [...historical, ...forecasts.map((point) => ({ period: point.period, amount: point.predicted_amount }))];
  if (!series.length) return <div className="forecast-no-data"><Info size={20} /><span>No completed payroll history is available yet.</span></div>;

  const width = 760, height = 230, insetX = 50, insetY = 26;
  const graphWidth = width - insetX - 18, graphHeight = height - insetY * 2;
  const maxValue = Math.max(...series.map((point) => point.amount), ...forecasts.flatMap((point) => [point.upper_bound ?? 0]), 1) * 1.12;
  const stepX = series.length > 1 ? graphWidth / (series.length - 1) : graphWidth;
  const position = (amount: number, index: number) => ({ x: insetX + index * stepX, y: height - insetY - (amount / maxValue) * graphHeight });
  const historyPoints = historical.map((point, index) => ({ ...position(point.amount, index), ...point }));
  const forecastPoints = forecasts.map((point, index) => ({ ...position(point.predicted_amount, historical.length + index), ...point }));
  const historicalPath = historyPoints.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const forecastPath = [historyPoints.at(-1), ...forecastPoints].filter(Boolean).map((point, index) => `${index ? 'L' : 'M'} ${point!.x} ${point!.y}`).join(' ');
  const bandPoints = forecastPoints.filter((point) => point.lower_bound !== null && point.upper_bound !== null);
  const confidencePath = bandPoints.length ? [
    ...bandPoints.map((point) => `${point.x},${position(point.upper_bound!, historical.length + forecastPoints.indexOf(point)).y}`),
    ...[...bandPoints].reverse().map((point) => `${point.x},${position(point.lower_bound!, historical.length + forecastPoints.indexOf(point)).y}`),
  ].join(' ') : '';
  const predictionStart = forecastPoints[0]?.x ? forecastPoints[0].x - stepX / 2 : width - 18;

  return <div className="forecast-chart-container">
    <div className="chart-legend-top-row">
      <div className="legend-item"><span className="legend-solid-blue-bar" /><span className="legend-label">Completed payroll</span></div>
      <div className="legend-item"><span className="legend-dashed-amber-bar" /><span className="legend-label">Forecast</span></div>
      {confidencePath && <div className="legend-item"><span className="forecast-range-key" /><span className="legend-label">95% range</span></div>}
    </div>
    <div className="forecast-chart-svg-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="forecast-svg" preserveAspectRatio="none" role="img" aria-label="Completed payroll and upcoming funding forecast">
        {forecastPoints.length > 0 && <><rect x={predictionStart} y={insetY - 5} width={width - predictionStart - 18} height={graphHeight + 10} fill="#FFFBEB" rx="8" /><text x={predictionStart + (width - predictionStart - 18) / 2} y={insetY + 12} textAnchor="middle" className="chart-prediction-area-label">Forecast</text></>}
        {[1, .75, .5, .25, 0].map((fraction) => { const y = height - insetY - fraction * graphHeight; return <g key={fraction}><text x={insetX - 10} y={y + 4} textAnchor="end" className="chart-y-axis-label">{fraction ? `${(maxValue * fraction / 1_000_000).toFixed(0)}M` : '0'}</text><line x1={insetX} y1={y} x2={width - 18} y2={y} className="chart-horizontal-grid" /></g>; })}
        <text x={insetX - 10} y={insetY - 8} textAnchor="end" className="chart-y-unit-label">BDT</text>
        {confidencePath && <polygon points={confidencePath} className="forecast-confidence-band" />}
        {historyPoints.map((point) => <rect key={`bar-${point.period}`} x={point.x - 8} y={point.y} width={16} height={height - insetY - point.y} fill="#0047BA" rx="3" opacity=".18" />)}
        {historicalPath && <path d={historicalPath} fill="none" stroke="#0047BA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        {forecastPath && <path d={forecastPath} fill="none" stroke="#F59E0B" strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" strokeLinejoin="round" />}
        {historyPoints.map((point) => <circle key={`history-${point.period}`} cx={point.x} cy={point.y} r="4.5" fill="#0047BA" stroke="#fff" strokeWidth="2" />)}
        {forecastPoints.map((point) => <circle key={`forecast-${point.period}`} cx={point.x} cy={point.y} r="5" fill="#F59E0B" stroke="#fff" strokeWidth="2.5" />)}
      </svg>
      <div className="forecast-chart-x-labels">{series.map((point) => <span key={point.period} className="forecast-x-month">{formatPeriod(point.period)}</span>)}</div>
    </div>
  </div>;
}

export default function Forecast() {
  const { token, admin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [includeBonuses, setIncludeBonuses] = useState(false);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const overview = await api.getOverview(token);
        setCompanies(overview.companies);
        if (overview.companies.length) setCompanyId(String(overview.companies[0].id));
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load companies.'); }
      finally { setLoading(false); }
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !companyId) return;
    let active = true;
    void api.getLiquidityForecast(token, Number(companyId), includeBonuses)
      .then((response) => { if (active) setData(response); })
      .catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : 'Unable to load forecast.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [companyId, includeBonuses, token]);

  const refresh = async () => {
    if (!token || !companyId) return;
    setRefreshing(true); setMessage('');
    try { setData(await api.refreshLiquidityForecast(token, Number(companyId))); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Forecast refresh failed.'); }
    finally { setRefreshing(false); }
  };

  const nextForecast = data?.forecasts[0];
  const bonusAvailable = Boolean(data?.settings && data.settings.festival_bonus_amount > 0 && data.settings.festival_bonus_months.length > 0);
  const selectedCompany = useMemo(() => companies.find((company) => company.id === Number(companyId)), [companies, companyId]);
  const statusLabel = data?.model.status?.replaceAll('_', ' ').toLowerCase() ?? '';

  return <div className="forecast-root-view">
    {message && <MessageBar intent="error"><MessageBarBody>{message}</MessageBarBody></MessageBar>}
    <div className="forecast-header-row">
      <div><h2 className="forecast-page-heading">Liquidity forecast</h2><p className="forecast-page-context">Plan wallet funding from completed payroll history—not fixed monthly multipliers.</p></div>
      <div className="forecast-filters-bar">
        <label className="filter-dropdown-pill"><Calendar size={16} color="#0F172A" /><span className="sr-only">Company</span><select value={companyId} onChange={(event) => { setLoading(true); setCompanyId(event.target.value); setMessage(''); }}><option value="">Select company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.company_name}</option>)}</select></label>
        <button className="filter-checkbox-label" onClick={() => { setLoading(true); setIncludeBonuses((value) => !value); }} disabled={!bonusAvailable} aria-pressed={includeBonuses} title={bonusAvailable ? 'Apply configured festival bonus adjustments' : 'No festival bonus adjustment is configured'}>{includeBonuses ? <CheckSquare size={18} color="#0047BA" className="checkbox-icon" /> : <Square size={18} color="#94A3B8" className="checkbox-icon" />}<span className="checkbox-text">Include festival bonuses</span></button>
        {admin?.role === 'ADMIN' && <button className="forecast-refresh-button" onClick={refresh} disabled={!companyId || refreshing}>{<RefreshCw size={16} className={refreshing ? 'forecast-spin' : ''} />}{refreshing ? 'Refreshing…' : 'Refresh forecast'}</button>}
      </div>
    </div>
    {loading ? <div className="loading-state-box"><Spinner size="medium" label="Loading forecast…" /></div> : !companyId ? <div className="forecast-no-data"><Info size={22} /><span>Select a company to view its forecast.</span></div> : <>
      <div className="forecast-model-strip"><div><span>Company</span><strong>{selectedCompany?.company_name}</strong></div><div><span>Model</span><strong>{data?.model.type.replaceAll('_', ' ') || 'Unavailable'}</strong></div><div><span>Data through</span><strong>{data?.source_data_through ? formatPeriod(data.source_data_through) : 'No completed payroll yet'}</strong></div><div><span>Validation</span><strong>{statusLabel || 'unavailable'}</strong></div>{data?.model.mape !== null && data?.model.mape !== undefined && <div><span>Back-test MAPE</span><strong>{data.model.mape.toFixed(1)}%</strong></div>}</div>
      <div className="forecast-middle-grid">
        <div className="forecast-main-chart-card"><h3 className="chart-card-heading">Completed payroll history and upcoming forecast</h3><ForecastComboChart history={data?.historical_series || []} forecasts={data?.forecasts || []} /></div>
        <div className="forecast-summary-cards-stack">
          <div className="forecast-stat-card border-yellow-edge"><div className="stat-card-circle-icon icon-yellow-light"><Wallet size={24} color="#0047BA" /></div><div className="stat-card-details"><span className="stat-card-sublabel">Next payroll funding need</span><strong className="stat-card-big-value">{nextForecast ? formatCompactBDT(nextForecast.predicted_amount) : '—'}</strong><span className="stat-card-hint-text">{nextForecast ? formatPeriod(nextForecast.period) : 'Refresh when payroll history is available'}</span></div></div>
          <div className="forecast-stat-card border-yellow-edge"><div className="stat-card-circle-icon icon-yellow-light"><Calendar size={24} color="#D97706" /></div><div className="stat-card-details"><span className="stat-card-sublabel">Recommended wallet top-up</span><strong className="stat-card-big-value">{nextForecast ? formatCompactBDT(nextForecast.topup_required) : '—'}</strong><span className="stat-card-hint-text">Based on the current main-wallet balance</span></div></div>
        </div>
      </div>
      <div className="forecast-breakdown-card"><div className="breakdown-header-wrap"><h3 className="breakdown-title">Forecast breakdown</h3><p className="forecast-breakdown-note">Prediction range represents the estimated 95% uncertainty interval. {data?.model.status === 'LIMITED_VALIDATION' ? 'This model has limited validation history.' : ''}</p><div className="breakdown-yellow-line" /></div><div className="breakdown-table-wrapper"><table className="breakdown-custom-table"><thead><tr><th>PERIOD</th><th>FORECAST</th><th>95% RANGE</th><th>CURRENT BALANCE</th><th>TOP-UP REQUIRED</th><th>MODEL NOTES</th></tr></thead><tbody>{data?.forecasts.length ? data.forecasts.map((forecast) => <tr key={forecast.period}><td className="month-cell">{formatPeriod(forecast.period)}</td><td className="total-cell">{formatBDT(forecast.predicted_amount)}</td><td>{forecast.lower_bound === null || forecast.upper_bound === null ? 'Not available' : `${formatBDT(forecast.lower_bound)} – ${formatBDT(forecast.upper_bound)}`}</td><td>{formatBDT(forecast.current_balance)}</td><td>{formatBDT(forecast.topup_required)}</td><td className="forecast-assumptions">{forecast.assumptions.join(' ')}</td></tr>) : <tr><td colSpan={6} className="forecast-table-empty">No cached forecast yet. An admin can refresh it after payroll history is available.</td></tr>}</tbody></table></div></div>
    </>}
  </div>;
}
