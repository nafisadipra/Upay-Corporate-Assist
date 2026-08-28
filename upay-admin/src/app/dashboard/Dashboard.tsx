'use client';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/components/AdminLayout';
import * as api from '@/lib/api';
import { Company, Overview, LiquidityForecast } from '@/types';
import { Spinner, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { 
  Users, 
  Wallet, 
  BarChart3, 
  TrendingUp, 
  Landmark 
} from 'lucide-react';

type CompanyForecast = { company: Company; forecasts: LiquidityForecast[] };

const formatMoneyBDT = (amount: number) => {
  return `BDT ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(amount)}`;
};

const formatCompactBDT = (amount: number) => {
  if (amount >= 1_000_000) {
    return `BDT ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return formatMoneyBDT(amount);
};

const formatPeriodLabel = (value: string) => {
  const [month, year] = value.split('_');
  return `${month ? month.slice(0, 3).toUpperCase() : ''} ${year || '2026'}`;
};

function DemandChart({ items }: { items: CompanyForecast[] }) {
  // Aggregate forecasts by period from database
  const series = useMemo(() => {
    const totals = new Map<string, number>();
    items.forEach(({ forecasts }) => {
      forecasts.forEach((item) => {
        totals.set(item.period, (totals.get(item.period) ?? 0) + item.predicted_amount);
      });
    });

    if (totals.size >= 1) {
      return [...totals.entries()]
        .map(([name, predicted]) => ({ name, predicted }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    return [
      { name: 'SEP_2026', predicted: 10_600_000 },
      { name: 'OCT_2026', predicted: 10_900_000 },
      { name: 'NOV_2026', predicted: 11_300_000 },
    ];
  }, [items]);

  // Dynamically calculate grid scale so data points sit comfortably inside chart area
  const maxPredicted = Math.max(...series.map((s) => s.predicted), 1);
  const targetMax = maxPredicted * 1.35; // 35% visual headroom so line never collides with top
  const stepVal = Math.max(Math.ceil(targetMax / 4 / 1_000_000) * 1_000_000, 2_000_000);
  const maxVal = stepVal * 4;
  const yTicks = [maxVal, stepVal * 3, stepVal * 2, stepVal * 1, 0];

  const width = 640;
  const height = 190;
  const insetX = 65;
  const insetY = 20;
  const graphWidth = width - insetX - 25;
  const graphHeight = height - insetY * 2;

  const points = series.map((item, index) => {
    const x = insetX + index * (graphWidth / (series.length - 1 || 1));
    const y = height - insetY - (item.predicted / maxVal) * graphHeight;
    return { x, y, ...item };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0
    ? `M ${points[0].x} ${height - insetY} L ${points.map(p => `${p.x} ${p.y}`).join(' L ')} L ${points[points.length - 1].x} ${height - insetY} Z`
    : '';

  return (
    <div className="demand-chart-wrapper">
      <svg viewBox={`0 0 ${width} ${height}`} className="demand-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartBlueArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0047BA" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0047BA" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines & Dynamic Y labels */}
        {yTicks.map((val, idx) => {
          const y = height - insetY - (val / maxVal) * graphHeight;
          const labelText = val === 0 ? 'BDT 0' : `BDT ${(val / 1_000_000).toFixed(0)}M`;
          return (
            <g key={idx}>
              <text x={insetX - 12} y={y + 4} textAnchor="end" className="chart-y-axis-label">
                {labelText}
              </text>
              <line 
                x1={insetX} 
                y1={y} 
                x2={width - 15} 
                y2={y} 
                className="chart-horizontal-grid" 
              />
            </g>
          );
        })}

        {/* Gradient Area Fill */}
        {areaPath && <path d={areaPath} fill="url(#chartBlueArea)" />}

        {/* Main Line */}
        <path 
          d={linePath} 
          fill="none" 
          stroke="#0047BA" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Data Nodes */}
        {points.map((p, i) => (
          <circle 
            key={i} 
            cx={p.x} 
            cy={p.y} 
            r="6" 
            fill="#ffffff" 
            stroke="#0047BA" 
            strokeWidth="3.5" 
          />
        ))}
      </svg>

      {/* X Axis Values Below Graph */}
      <div className="demand-chart-x-labels">
        {points.map((p) => (
          <div key={p.name} className="x-label-col">
            <strong className="x-amount">{formatCompactBDT(p.predicted)}</strong>
            <span className="x-period">{formatPeriodLabel(p.name)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [forecasts, setForecasts] = useState<CompanyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    const load = async () => {
      try {
        const overviewData = await api.getOverview(token);
        const forecastData = await Promise.all(
          overviewData.companies.map(async (company) => ({ 
            company, 
            forecasts: (await api.getLiquidityForecast(token, company.id)).liquidity_forecasts 
          }))
        );
        if (mounted) {
          setOverview(overviewData);
          setForecasts(forecastData);
        }
      } catch (err) {
        if (mounted) setMessage(err instanceof Error ? err.message : 'Error loading dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [token]);

  const activeCount = overview?.metrics.active_corporates_count ?? 0;
  const availableFloat = overview?.metrics.wallet_balance_bdt ?? 0;
  
  const totalForecastCalculated = forecasts.reduce(
    (sum, item) => sum + item.forecasts.reduce((val, f) => val + f.predicted_amount, 0), 
    0
  );
  const projectedPayout = totalForecastCalculated;

  const totalGapCalculated = forecasts.reduce(
    (sum, item) => sum + item.forecasts.reduce((val, f) => val + f.topup_required, 0), 
    0
  );
  const fundingGap = totalGapCalculated;

  // Companies display from database
  const companiesList = useMemo(() => {
    if (overview?.companies && overview.companies.length > 0) {
      return overview.companies;
    }
    return [];
  }, [overview]);

  const renderCompanyName = (name: string) => {
    if (name.includes('(') && name.includes(')')) {
      const idx = name.indexOf('(');
      const main = name.substring(0, idx).trim();
      const sub = name.substring(idx).trim();
      return (
        <div className="company-name-text-block">
          <span className="company-main-title">{main}</span>
          <span className="company-alignment-sub">{sub}</span>
        </div>
      );
    }
    return (
      <div className="company-name-text-block">
        <span className="company-main-title">{name}</span>
      </div>
    );
  };

  return (
    <div className="dashboard-root-view">
      {message && (
        <div className="mb-4">
          <MessageBar intent="error">
            <MessageBarBody>{message}</MessageBarBody>
          </MessageBar>
        </div>
      )}

      {loading ? (
        <div className="loading-state-box">
          <Spinner size="medium" label="Loading dashboard data..." />
        </div>
      ) : (
        <div className="dashboard-content-layout">
          {/* 1. Hero Card */}
          <div className="hero-banner-card">
            <div className="hero-left-content">
              <span className="hero-tag-badge">DASHBOARD</span>
              <h2 className="hero-main-title">Networking funding outlook</h2>
              <p className="hero-description-text">
                See funding demand across every active corporate client.
              </p>
            </div>
            
            <div className="hero-float-widget">
              <div className="hero-float-icon-wrap">
                <Landmark size={26} color="#ffffff" />
              </div>
              <span className="hero-float-label">Available float</span>
              <strong className="hero-float-value">{formatMoneyBDT(availableFloat)}</strong>
            </div>
          </div>

          {/* 2. Four Metric Cards Row */}
          <div className="metrics-four-grid">
            {/* Card 1: Active Corporates */}
            <div className="stat-card stat-card-blue">
              <div className="stat-icon-wrap icon-blue">
                <Users size={22} color="#0047BA" />
              </div>
              <span className="stat-label">ACTIVE CORPORATES</span>
              <strong className="stat-value">{activeCount}</strong>
              <span className="stat-subtext">Connected clients</span>
            </div>

            {/* Card 2: Available Float */}
            <div className="stat-card stat-card-yellow">
              <div className="stat-icon-wrap icon-yellow">
                <Wallet size={22} color="#D97706" />
              </div>
              <span className="stat-label">AVAILABLE FLOAT</span>
              <strong className="stat-value">{formatMoneyBDT(availableFloat)}</strong>
              <span className="stat-subtext">Central wallets</span>
            </div>

            {/* Card 3: Projected Payout */}
            <div className="stat-card stat-card-blue">
              <div className="stat-icon-wrap icon-blue">
                <BarChart3 size={22} color="#0047BA" />
              </div>
              <span className="stat-label">PROJECTED PAYOUT</span>
              <strong className="stat-value">{formatMoneyBDT(projectedPayout)}</strong>
              <span className="stat-subtext">Next three periods</span>
            </div>

            {/* Card 4: Funding Gap */}
            <div className="stat-card stat-card-yellow">
              <div className="stat-icon-wrap icon-yellow">
                <TrendingUp size={22} color="#D97706" />
              </div>
              <span className="stat-label">FUNDING GAP</span>
              <strong className="stat-value">{formatMoneyBDT(fundingGap)}</strong>
              <span className="stat-subtext">Top-up requirement</span>
            </div>
          </div>

          {/* 3. Bottom Grid: Demand Chart & Corporate Funding Position */}
          <div className="bottom-two-col-grid">
            {/* Left Card: Projected Portfolio Demand */}
            <div className="section-card portfolio-demand-card">
              <div className="card-top-header">
                <div>
                  <h3 className="section-card-title">Projected portfolio demand</h3>
                  <div className="card-title-yellow-line" />
                  <p className="section-card-subtitle">
                    Expected disbursement across the next payout periods.
                  </p>
                </div>
                <div className="chart-legend-indicator">
                  <span className="legend-blue-bar" />
                  <span className="legend-text">Projected payout</span>
                </div>
              </div>

              <DemandChart items={forecasts} />
            </div>

            {/* Right Card: Corporate Funding Position */}
            <div className="section-card corporate-funding-card">
              <div className="card-top-header">
                <div>
                  <h3 className="section-card-title">Corporate funding position</h3>
                  <div className="card-title-yellow-line" />
                </div>
              </div>

              <div className="company-funding-list">
                {companiesList.length > 0 ? (
                  companiesList.map((company, index) => {
                    const isEven = index % 2 === 0;
                    return (
                      <div 
                        key={company.id} 
                        className={`company-funding-item ${isEven ? 'border-edge-blue' : 'border-edge-yellow'}`}
                      >
                        <div className={`company-item-icon-wrap ${isEven ? 'icon-blue' : 'icon-yellow'}`}>
                          {isEven ? (
                            <Users size={24} color="#0047BA" />
                          ) : (
                            <Landmark size={24} color="#D97706" />
                          )}
                        </div>
                        
                        <div className="company-item-info">
                          {renderCompanyName(company.company_name)}
                          <strong className="company-balance-text">
                            {formatMoneyBDT(company.wallet_balance)}
                          </strong>
                          <span className="company-batches-text">
                            {company.batches_count} payout batches
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-corporate-funding">
                    <p>No connected corporate clients found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
