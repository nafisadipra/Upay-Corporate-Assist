'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AdminLayout';
import * as api from '@/lib/api';
import { AuditLog } from '@/types';
import { Spinner, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { 
  Monitor, 
  ShieldCheck, 
  ChevronRight, 
  Users, 
  AlertTriangle, 
  Building2, 
  Wallet, 
  Landmark, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

function formatActionTitle(action: string): string {
  if (!action) return 'Operations Event';
  return action
    .replace(/^UPAY_ADMIN_/, '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getActionIcon(action: string) {
  const act = (action || '').toUpperCase();
  if (act.includes('COMPANY')) return <Building2 size={22} color="#0047BA" />;
  if (act.includes('WALLET') || act.includes('TOPUP')) return <Wallet size={22} color="#0047BA" />;
  if (act.includes('USER') || act.includes('EMPLOYEE')) return <Users size={22} color="#0047BA" />;
  if (act.includes('ALERT') || act.includes('RISK')) return <AlertTriangle size={22} color="#D97706" />;
  if (act.includes('BANK')) return <Landmark size={22} color="#0047BA" />;
  return <Monitor size={22} color="#0047BA" />;
}

function getActionDescription(log: AuditLog): string {
  if (log.details && typeof log.details === 'object') {
    const details = log.details as Record<string, unknown>;
    if (details.company_name) return `Company: ${details.company_name}`;
    if (details.amount) return `Amount: BDT ${Number(details.amount).toLocaleString('en-BD')}`;
    if (details.email) return `User account: ${details.email}`;
    if (details.employee_name) return `Employee: ${details.employee_name}`;
    if (details.status) return `Updated status: ${details.status}`;
    if (details.bank_name) return `Bank: ${details.bank_name}`;
  }
  return log.performed_by ? `Action performed by ${log.performed_by}` : 'Operations action executed';
}

function formatLogDate(dateStr?: string): string {
  if (!dateStr) return 'Just now';
  try {
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' • ' +
      d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  } catch {
    return dateStr;
  }
}

export default function Activity() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    const load = async () => {
      try {
        const activityData = await api.getAdminAuditLogs(token);
        if (mounted) {
          setLogs(activityData.audit_logs || []);
        }
      } catch (err) {
        if (mounted) setMessage(err instanceof Error ? err.message : 'Error loading activity from database');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [token]);

  return (
    <div className="activity-root-view">
      {message && (
        <div className="mb-4">
          <MessageBar intent="error">
            <MessageBarBody>{message}</MessageBarBody>
          </MessageBar>
        </div>
      )}

      {/* 1. Top Operations Activity Banner */}
      <div className="activity-top-banner-card">
        <div className="banner-left-wrap">
          <div className="banner-icon-box">
            <Monitor size={26} color="#0047BA" />
          </div>
          <div className="banner-text-details">
            <span className="banner-sublabel">Operations activity</span>
            <h2 className="banner-title">Recent control-room actions</h2>
            <p className="banner-subtext">
              {logs.length > 0 
                ? `${logs.length} ${logs.length === 1 ? 'action' : 'actions'} recorded in database.` 
                : 'No activity recorded.'}
            </p>
          </div>
        </div>

        <div className="banner-right-wrap">
          <div className="banner-yellow-divider" />
          <div className="banner-shield-box">
            <ShieldCheck size={38} color="#D97706" strokeWidth={1.75} />
          </div>
        </div>
      </div>

      {/* 2. Filter Dropdown Pill */}
      <div className="activity-filter-row">
        <div className="filter-dropdown-pill">
          <span className="dropdown-pill-text">All recorded activity</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-state-box">
          <Spinner size="medium" label="Fetching activity records from database..." />
        </div>
      ) : (
        /* 3. Main Recent Activity Section */
        <div className="activity-main-list-card">
          <div className="activity-card-header">
            <h3 className="activity-section-title">Recent control-room activity</h3>
            <div className="activity-title-yellow-line" />
          </div>

          <div className="activity-rows-container">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="activity-row-item">
                  <div className="activity-item-left">
                    <div className="activity-item-icon-box">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="activity-item-content">
                      <h4 className="activity-item-title">{formatActionTitle(log.action)}</h4>
                      <div className="activity-item-meta-row">
                        <span className="activity-item-time">{formatLogDate(log.created_at)}</span>
                      </div>
                      <p className="activity-item-desc">{getActionDescription(log)}</p>
                    </div>
                  </div>

                  <div className="activity-item-right">
                    <div className="activity-status-pill pill-completed">
                      <CheckCircle2 size={15} />
                      <span>Completed</span>
                    </div>
                    <ChevronRight size={18} className="activity-item-chevron" />
                  </div>
                </div>
              ))
            ) : (
              /* Blank / Empty State when database has no activity */
              <div className="activity-empty-state-view">
                <div className="empty-state-icon-circle">
                  <Clock size={28} color="#94A3B8" />
                </div>
                <h4 className="empty-state-headline">No activity recorded</h4>
                <p className="empty-state-description">
                  Administrative actions such as onboarding companies, wallet top-ups, employee roster changes, and user management will automatically appear here once recorded in the database.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
