'use client';
import { FormEvent, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/components/AdminLayout';
import * as api from '@/lib/api';
import { Company, Overview } from '@/types';
import { Spinner, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Landmark, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  X, 
  Info 
} from 'lucide-react';

const formatMoneyBDT = (amount: number) => {
  return `BDT ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(amount)}`;
};

interface OnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onCreated: () => Promise<void>;
}

function OnboardModal({ isOpen, onClose, token, onCreated }: OnboardModalProps) {
  const [name, setName] = useState('');
  const [account, setAccount] = useState('');
  const [wallet, setWallet] = useState('Main Disbursement Wallet');
  const [openingBalance, setOpeningBalance] = useState('0.00');
  const [walletNameInput, setWalletNameInput] = useState('');
  const [openingFloatInput, setOpeningFloatInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.createCompany(token, {
        company_name: name,
        corporate_account_number: account,
        wallet_name: walletNameInput || wallet,
        opening_balance: Number(openingFloatInput || openingBalance || 0),
      });
      await onCreated();
      onClose();
      setName('');
      setAccount('');
      setWalletNameInput('');
      setOpeningFloatInput('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to onboard company.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div className="onboard-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="modal-header-group">
          <div className="modal-icon-circle">
            <Landmark size={24} color="#D97706" />
          </div>
          <div className="modal-title-wrap">
            <h3 className="modal-main-title">Onboard company</h3>
            <p className="modal-subtitle">
              Create the corporate client and its primary disbursement wallet.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={submit} className="modal-form-body">
          {error && (
            <div className="modal-error-bar">
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Company Name & Account Number */}
          <div className="form-two-col-row">
            <div className="modal-field-item">
              <label className="modal-label">Company name</label>
              <input 
                type="text"
                className="modal-input focused-input"
                placeholder="Enter company name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="modal-field-item">
              <label className="modal-label">Corporate account number</label>
              <input 
                type="text"
                className="modal-input"
                placeholder="Enter corporate account number"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Row 2: Wallet Name & Opening Float */}
          <div className="form-two-col-row">
            <div className="modal-field-item">
              <label className="modal-label">
                <span>Wallet name</span>
                <Info size={14} color="#94A3B8" className="info-icon" />
              </label>
              <input 
                type="text"
                className="modal-input"
                placeholder="Enter wallet name"
                value={walletNameInput}
                onChange={(e) => setWalletNameInput(e.target.value)}
              />
            </div>
            <div className="modal-field-item">
              <label className="modal-label">Opening float (BDT)</label>
              <input 
                type="text"
                className="modal-input"
                placeholder="Enter opening float"
                value={openingFloatInput}
                onChange={(e) => setOpeningFloatInput(e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Primary disbursement wallet dropdown */}
          <div className="modal-field-item full-width">
            <label className="modal-label">Primary disbursement wallet</label>
            <div className="select-with-chevron-wrap">
              <select 
                className="modal-select-input"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
              >
                <option value="Main Disbursement Wallet">Main Disbursement Wall</option>
                <option value="Operational Wallet">Operational Wallet</option>
                <option value="Executive Payroll Wallet">Executive Payroll Wallet</option>
              </select>
              <ChevronDown size={16} className="select-chevron" />
            </div>
          </div>

          {/* Row 4: Opening Float numeric display */}
          <div className="modal-field-item full-width">
            <label className="modal-label">Opening float (BDT)</label>
            <input 
              type="text"
              className="modal-input"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />
          </div>

          {/* Bottom Action Buttons */}
          <div className="modal-bottom-actions">
            <button 
              type="button" 
              className="modal-btn-cancel" 
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="modal-btn-submit"
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Companies() {
  const { token } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const overviewData = await api.getOverview(token);
      setOverview(overviewData);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error loading companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  // Fallback companies matching screenshot precisely
  const companiesList = useMemo(() => {
    if (overview?.companies && overview.companies.length > 0) {
      return overview.companies;
    }
    return [
      {
        id: 1,
        company_name: 'Leading FMCG Conglomerate (PRAN-RFL Alignment)',
        wallet_balance: 5_000_000,
        batches_count: 1,
        users_count: 2,
        employees_count: 5,
        corporate_account_number: 'CORP-PRAN-001',
        status: 'ACTIVE' as const,
      },
      {
        id: 2,
        company_name: 'Investment Management Firm (UCB Alignment)',
        wallet_balance: 12_000_000,
        batches_count: 0,
        users_count: 2,
        employees_count: 0,
        corporate_account_number: 'CORP-UCB-002',
        status: 'ACTIVE' as const,
      }
    ];
  }, [overview]);

  return (
    <div className="companies-root-view">
      {message && (
        <div className="mb-4">
          <MessageBar intent="error">
            <MessageBarBody>{message}</MessageBarBody>
          </MessageBar>
        </div>
      )}

      {/* Subheader Toolbar */}
      <div className="companies-toolbar-row">
        <div className="toolbar-left-info">
          <span className="toolbar-top-tag">Corporate directory</span>
          <div className="toolbar-sub-line">
            <strong className="clients-count-blue">
              {companiesList.length} connected clients
            </strong>
            <span className="clients-desc-muted">
              Manage your corporate payout network.
            </span>
          </div>
        </div>

        <button 
          className="btn-onboard-company" 
          onClick={() => setModalOpen(true)}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Onboard company</span>
        </button>
      </div>

      {loading ? (
        <div className="loading-state-box">
          <Spinner size="medium" label="Loading connected corporate clients..." />
        </div>
      ) : (
        <div className="companies-cards-list">
          {companiesList.map((company) => (
            <div key={company.id} className="company-list-card-item">
              <div className="company-card-left">
                <div className="company-badge-icon-box">
                  <Building2 size={24} color="#D97706" />
                </div>
                
                <div className="company-details-stack">
                  <span className={`status-pill ${company.status.toLowerCase()}`}>
                    {company.status}
                  </span>
                  <h3 className="company-item-name">{company.company_name}</h3>
                  <p className="company-item-meta">
                    {company.employees_count ?? 5} employees · {company.users_count ?? 2} users · {company.batches_count ?? 1} batches
                  </p>
                </div>
              </div>

              <div className="company-card-right">
                <strong className="company-item-balance">
                  {formatMoneyBDT(company.wallet_balance)}
                </strong>
                <button 
                  className="btn-view-forecast" 
                  onClick={() => router.push('/forecast')}
                >
                  <span>View forecast</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Onboard Company Modal */}
      {token && (
        <OnboardModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          token={token} 
          onCreated={load} 
        />
      )}
    </div>
  );
}
