'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageBar, MessageBarBody, Spinner } from '@fluentui/react-components';
import { Building2, Landmark, Send, Users, Wallet } from 'lucide-react';
import { useAuth } from '@/components/AdminLayout';
import * as api from '@/lib/api';
import { Overview } from '@/types';

const formatMoneyBDT = (amount: number) =>
  `BDT ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(amount)}`;

const MetricCard = ({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) => (
  <div className="stat-card stat-card-blue">
    <div className="stat-icon-wrap icon-blue">{icon}</div>
    <span className="stat-label">{label}</span>
    <strong className="stat-value">{value}</strong>
    <span className="stat-subtext">{hint}</span>
  </div>
);

export default function Dashboard() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    let active = true;
    void api
      .getOverview(token)
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch((error: unknown) => {
        if (active)
          setMessage(
            error instanceof Error ? error.message : 'Unable to load platform operations.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const companies = useMemo(() => overview?.companies || [], [overview]);
  const metrics = overview?.metrics;

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
          <Spinner size="medium" label="Loading platform operations…" />
        </div>
      ) : (
        <div className="dashboard-content-layout">
          <div className="hero-banner-card">
            <div className="hero-left-content">
              <span className="hero-tag-badge">UPAY OPERATIONS</span>
              <h2 className="hero-main-title">Corporate operations overview</h2>
              <p className="hero-description-text">
                Manage registered companies, employee approvals, and completed salary disbursements.
              </p>
            </div>
            <div className="hero-float-widget">
              <div className="hero-float-icon-wrap">
                <Landmark size={26} color="#ffffff" />
              </div>
              <span className="hero-float-label">Managed wallet float</span>
              <strong className="hero-float-value">
                {formatMoneyBDT(metrics?.wallet_balance_bdt ?? 0)}
              </strong>
            </div>
          </div>

          <div className="metrics-four-grid">
            <MetricCard
              label="Active corporates"
              value={String(metrics?.active_corporates_count ?? 0)}
              hint="Connected companies"
              icon={<Building2 size={22} color="#0047BA" />}
            />
            <MetricCard
              label="Managed wallet float"
              value={formatMoneyBDT(metrics?.wallet_balance_bdt ?? 0)}
              hint="Company main wallets"
              icon={<Wallet size={22} color="#0047BA" />}
            />
            <MetricCard
              label="Salary disbursed"
              value={formatMoneyBDT(metrics?.executed_amount_bdt ?? 0)}
              hint="Completed disbursements"
              icon={<Send size={22} color="#0047BA" />}
            />
            <MetricCard
              label="Registered employees"
              value={String(metrics?.total_employees_count ?? 0)}
              hint="Across connected companies"
              icon={<Users size={22} color="#0047BA" />}
            />
          </div>

          <div className="bottom-two-col-grid">
            <div className="section-card portfolio-demand-card">
              <div className="card-top-header">
                <div>
                  <h3 className="section-card-title">Connected companies</h3>
                  <div className="card-title-yellow-line" />
                  <p className="section-card-subtitle">
                    Company registration and payroll activity managed by Upay.
                  </p>
                </div>
              </div>
              <div className="company-funding-list">
                {companies.length ? (
                  companies.map((company, index) => (
                    <div
                      key={company.id}
                      className={`company-funding-item ${index % 2 === 0 ? 'border-edge-blue' : 'border-edge-yellow'}`}
                    >
                      <div
                        className={`company-item-icon-wrap ${index % 2 === 0 ? 'icon-blue' : 'icon-yellow'}`}
                      >
                        <Building2 size={22} color={index % 2 === 0 ? '#0047BA' : '#D97706'} />
                      </div>
                      <div className="company-item-info">
                        <strong className="company-main-title">{company.company_name}</strong>
                        <span className="company-batches-text">
                          {company.employees_count ?? 0} employees · {company.batches_count ?? 0}{' '}
                          payroll batches
                        </span>
                      </div>
                      <strong className="company-balance-text">
                        {formatMoneyBDT(company.wallet_balance)}
                      </strong>
                    </div>
                  ))
                ) : (
                  <p className="empty-corporate-funding">No connected corporate clients found.</p>
                )}
              </div>
            </div>
            <div className="section-card corporate-funding-card">
              <div className="card-top-header">
                <div>
                  <h3 className="section-card-title">Upay responsibilities</h3>
                  <div className="card-title-yellow-line" />
                </div>
              </div>
              <div className="company-funding-list">
                <div className="company-funding-item border-edge-blue">
                  <div className="company-item-icon-wrap icon-blue">
                    <Users size={22} color="#0047BA" />
                  </div>
                  <div className="company-item-info">
                    <strong className="company-main-title">Employee registrations</strong>
                    <span className="company-batches-text">
                      Review and approve corporate employee access.
                    </span>
                  </div>
                </div>
                <div className="company-funding-item border-edge-yellow">
                  <div className="company-item-icon-wrap icon-yellow">
                    <Send size={22} color="#D97706" />
                  </div>
                  <div className="company-item-info">
                    <strong className="company-main-title">Salary disbursements</strong>
                    <span className="company-batches-text">Operate approved payroll payouts.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
