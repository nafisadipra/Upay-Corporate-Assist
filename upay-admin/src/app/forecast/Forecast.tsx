'use client';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/components/AdminLayout';
import * as api from '@/lib/api';
import { Company, LiquidityForecast } from '@/types';
import { Spinner, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { 
  Calendar, 
  ChevronDown, 
  Wallet, 
  CheckSquare, 
  Square 
} from 'lucide-react';

type CompanyForecast = { company: Company; forecasts: LiquidityForecast[] };

const formatMoneyBDT = (amount: number) => {
  return `BDT ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(amount)}`;
};

const formatCompactBDT = (amount: number) => {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M BDT`;
  }
  return `${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(amount)} BDT`;
};

function ForecastComboChart() {
  // 9 historical months + 3 prediction months
  const historyData = [
    { month: 'Jan', value: 25_000_000 },
    { month: 'Feb', value: 29_000_000 },
    { month: 'Mar', value: 31_000_000 },
    { month: 'Apr', value: 27_000_000 },
    { month: 'May', value: 24_000_000 },
    { month: 'Jun', value: 27_000_000 },
    { month: 'Jul', value: 34_000_000 },
    { month: 'Aug', value: 41_000_000 },
    { month: 'Sep', value: 38_000_000 },
  ];

  const predictionData = [
    { month: 'Oct', value: 22_000_000 },
    { month: 'Nov', value: 17_000_000 },
    { month: 'Dec', value: 12_000_000 },
  ];

  const allMonths = [...historyData, ...predictionData];
  const maxVal = 50_000_000;
  const width = 760;
  const height = 230;
  const insetX = 45;
  const insetY = 25;
  const graphWidth = width - insetX - 25;
  const graphHeight = height - insetY * 2;
  const stepX = graphWidth / (allMonths.length - 1);

  // Historical points for line
  const histPoints = historyData.map((d, i) => ({
    x: insetX + i * stepX,
    y: height - insetY - (d.value / maxVal) * graphHeight,
    ...d,
  }));

  // Prediction points for dashed line (connects from last history point)
  const predPoints = predictionData.map((d, i) => ({
    x: insetX + (historyData.length + i) * stepX,
    y: height - insetY - (d.value / maxVal) * graphHeight,
    ...d,
  }));

  const histLinePath = histPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Connect last history point to first prediction point
  const lastHistPoint = histPoints[histPoints.length - 1];
  const predLinePath = `M ${lastHistPoint.x} ${lastHistPoint.y} ` +
    predPoints.map(p => `L ${p.x} ${p.y}`).join(' ');

  // Prediction background box coordinates
  const predStartX = lastHistPoint.x + (stepX / 2);
  const predWidth = width - 15 - predStartX;

  return (
    <div className="forecast-chart-container">
      <div className="chart-legend-top-row">
        <div className="legend-item">
          <span className="legend-solid-blue-bar" />
          <span className="legend-label">Payout History</span>
        </div>
        <div className="legend-item">
          <span className="legend-dashed-amber-bar" />
          <span className="legend-label">Prediction</span>
        </div>
      </div>

      <div className="forecast-chart-svg-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="forecast-svg" preserveAspectRatio="none">
          {/* Shaded Yellow Prediction Area */}
          <rect 
            x={predStartX} 
            y={insetY - 5} 
            width={predWidth} 
            height={graphHeight + 10} 
            fill="#FFFBEB" 
            rx="8" 
          />
          <text 
            x={predStartX + predWidth / 2} 
            y={insetY + 12} 
            textAnchor="middle" 
            className="chart-prediction-area-label"
          >
            Prediction
          </text>

          {/* Horizontal grid lines & Y labels */}
          <text x={insetX - 8} y={insetY - 8} textAnchor="end" className="chart-y-unit-label">BDT</text>
          {[50, 40, 30, 20, 10, 0].map((val) => {
            const y = height - insetY - (val / 50) * graphHeight;
            return (
              <g key={val}>
                <text x={insetX - 10} y={y + 4} textAnchor="end" className="chart-y-axis-label">
                  {val === 0 ? '0' : `${val}M`}
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

          {/* Historical Blue Bars */}
          {histPoints.map((p, i) => {
            const barWidth = 20;
            const barHeight = height - insetY - p.y;
            return (
              <rect
                key={`hist-bar-${i}`}
                x={p.x - barWidth / 2}
                y={p.y}
                width={barWidth}
                height={barHeight}
                fill="#0047BA"
                rx="3"
              />
            );
          })}

          {/* Solid Blue Line for History */}
          <path 
            d={histLinePath} 
            fill="none" 
            stroke="#0047BA" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* Dashed Amber Line for Prediction */}
          <path 
            d={predLinePath} 
            fill="none" 
            stroke="#F59E0B" 
            strokeWidth="3" 
            strokeDasharray="6 6" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* Historical Blue Nodes */}
          {histPoints.map((p, i) => (
            <circle 
              key={`hist-node-${i}`} 
              cx={p.x} 
              cy={p.y} 
              r="5.5" 
              fill="#0047BA" 
              stroke="#ffffff" 
              strokeWidth="2.5" 
            />
          ))}

          {/* Prediction Amber Nodes */}
          {predPoints.map((p, i) => (
            <circle 
              key={`pred-node-${i}`} 
              cx={p.x} 
              cy={p.y} 
              r="5.5" 
              fill="#F59E0B" 
              stroke="#ffffff" 
              strokeWidth="2.5" 
            />
          ))}
        </svg>

        {/* X Axis Month Labels */}
        <div className="forecast-chart-x-labels">
          {allMonths.map((m, i) => (
            <span key={i} className="forecast-x-month">{m.month}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Forecast() {
  const { token } = useAuth();
  const [forecasts, setForecasts] = useState<CompanyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [includeBonuses, setIncludeBonuses] = useState(true);

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
          setForecasts(forecastData);
        }
      } catch (err) {
        if (mounted) setMessage(err instanceof Error ? err.message : 'Error loading forecast data');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [token]);

  // Breakdown rows matching the screenshot precisely
  const breakdownRows = [
    {
      month: 'NOV',
      salary: '4.5M BDT',
      bonuses: '568,624 BDT',
      fees: '+56,862.4 BDT',
      total: '5.7M BDT',
      buffer: '+511,761.6 BDT',
    },
    {
      month: 'OCT',
      salary: '4.4M BDT',
      bonuses: '548,316 BDT',
      fees: '+54,831.6 BDT',
      total: '5.5M BDT',
      buffer: '+493,484.4 BDT',
    },
    {
      month: 'SEP',
      salary: '4.3M BDT',
      bonuses: '533,085 BDT',
      fees: '+53,308.5 BDT',
      total: '5.3M BDT',
      buffer: '+479,776.5 BDT',
    },
  ];

  return (
    <div className="forecast-root-view">
      {message && (
        <div className="mb-4">
          <MessageBar intent="error">
            <MessageBarBody>{message}</MessageBarBody>
          </MessageBar>
        </div>
      )}

      {/* 1. Page Title & Controls */}
      <div className="forecast-header-row">
        <h2 className="forecast-page-heading">
          Predictive Capital Forecasting: Monthly Payout Trends.
        </h2>
        
        <div className="forecast-filters-bar">
          <div className="filter-dropdown-pill">
            <Calendar size={16} color="#0F172A" />
            <span className="dropdown-pill-text">Last 12 Months</span>
            <ChevronDown size={14} color="#64748B" />
          </div>

          <label 
            className="filter-checkbox-label"
            onClick={() => setIncludeBonuses(!includeBonuses)}
          >
            {includeBonuses ? (
              <CheckSquare size={18} color="#0047BA" className="checkbox-icon" />
            ) : (
              <Square size={18} color="#94A3B8" className="checkbox-icon" />
            )}
            <span className="checkbox-text">Include Festival Bonuses</span>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="loading-state-box">
          <Spinner size="medium" label="Loading predictive forecasting models..." />
        </div>
      ) : (
        <>
          {/* 2. Main Section: Chart on Left + 2 Cards on Right */}
          <div className="forecast-middle-grid">
            {/* Chart Card */}
            <div className="forecast-main-chart-card">
              <h3 className="chart-card-heading">
                12-Month Payout History & 3-Month Prediction
              </h3>
              <ForecastComboChart />
            </div>

            {/* Right Summary Cards */}
            <div className="forecast-summary-cards-stack">
              {/* Card 1: Predicted NOV Funding Need */}
              <div className="forecast-stat-card border-yellow-edge">
                <div className="stat-card-circle-icon icon-yellow-light">
                  <Wallet size={24} color="#0047BA" />
                </div>
                <div className="stat-card-details">
                  <span className="stat-card-sublabel">Predicted NOV Funding Need</span>
                  <strong className="stat-card-big-value">BDT 5.7M</strong>
                  <div className="stat-card-trend-row">
                    <span className="trend-green-pill">↑ +4.2%</span>
                    <span className="trend-comparison-text">vs OCT</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Optimal Wallet Pre-load date */}
              <div className="forecast-stat-card border-yellow-edge">
                <div className="stat-card-circle-icon icon-yellow-light">
                  <Calendar size={24} color="#D97706" />
                </div>
                <div className="stat-card-details">
                  <span className="stat-card-sublabel">Optimal Wallet Pre-load date</span>
                  <strong className="stat-card-big-value">NOV 28th</strong>
                  <span className="stat-card-hint-text">Plan ahead for smooth funding</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Bottom Section: Forecast Breakdown Table */}
          <div className="forecast-breakdown-card">
            <div className="breakdown-header-wrap">
              <h3 className="breakdown-title">Forecast breakdown</h3>
              <div className="breakdown-yellow-line" />
            </div>

            <div className="breakdown-table-wrapper">
              <table className="breakdown-custom-table">
                <thead>
                  <tr>
                    <th>MONTH</th>
                    <th>PROJECTED SALARY</th>
                    <th>PROJECTED BONUSES</th>
                    <th>ESTIMATED FEES</th>
                    <th>TOTAL FUNDING REQUIRED</th>
                    <th>RISK BUFFER</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownRows.map((row) => (
                    <tr key={row.month}>
                      <td className="month-cell">{row.month}</td>
                      <td>{row.salary}</td>
                      <td>{row.bonuses}</td>
                      <td>{row.fees}</td>
                      <td className="total-cell">{row.total}</td>
                      <td>{row.buffer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
