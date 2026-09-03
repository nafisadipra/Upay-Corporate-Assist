'use client';
import { FormEvent, useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/components/AdminLayout';
import * as api from '@/lib/api';
import { Company, Overview } from '@/types';
import { Spinner, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { 
  Building2, 
  Landmark, 
  Plus, 
  X, 
  Wallet,
  ArrowRight
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
      });
      await onCreated();
      onClose();
      setName('');
      setAccount('');
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

          <div className="wallet-auto-note"><Wallet size={18} /><div><strong>Main wallet created automatically</strong><span>The company can allocate this balance across its own accounts after funding.</span></div></div>

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

interface FundWalletModalProps {
  company: Company | null;
  token: string;
  onClose: () => void;
  onFunded: () => Promise<void>;
}

function FundWalletModal({ company, token, onClose, onFunded }: FundWalletModalProps) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  if (!company) return null;
  const companyId = company.id;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.topupCompanyWallet(token, companyId, { amount: numericAmount, reference_note: reference || undefined });
      await onFunded();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to add funds to the main wallet.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-backdrop-overlay" onClick={() => !saving && onClose()}>
    <div className="onboard-modal-card" onClick={(event) => event.stopPropagation()}>
      <button className="modal-close-btn" onClick={onClose} disabled={saving} aria-label="Close"><X size={18} /></button>
      <div className="modal-header-group"><div className="modal-icon-circle"><Wallet size={24} color="#D97706" /></div><div className="modal-title-wrap"><h3 className="modal-main-title">Fund main wallet</h3><p className="modal-subtitle">Add disbursement funds for {company.company_name}.</p></div></div>
      <form onSubmit={submit} className="modal-form-body">
        {error && <div className="modal-error-bar">{error}</div>}
        <div className="wallet-balance-summary"><span>Current main-wallet balance</span><strong>{formatMoneyBDT(company.wallet_balance)}</strong></div>
        <div className="modal-field-item full-width"><label className="modal-label" htmlFor="topup-amount">Amount to add (BDT)</label><input id="topup-amount" type="number" min="0.01" step="0.01" required autoFocus className="modal-input" placeholder="Enter funding amount" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
        <div className="modal-field-item full-width"><label className="modal-label" htmlFor="topup-reference">Reference note <span className="optional-label">Optional</span></label><input id="topup-reference" className="modal-input" placeholder="Bank transfer or funding reference" value={reference} onChange={(event) => setReference(event.target.value)} /></div>
        <div className="modal-bottom-actions"><button type="button" className="modal-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="modal-btn-submit" disabled={saving}>{saving ? 'Adding funds…' : 'Add to main wallet'}</button></div>
      </form>
    </div>
  </div>;
}

export default function Companies() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [fundingCompany, setFundingCompany] = useState<Company | null>(null);

  const load = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const companiesList = useMemo(() => overview?.companies || [], [overview]);

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
          {companiesList.length === 0 ? <div className="loading-state-box">No companies are registered in the database.</div> : companiesList.map((company) => (
            <button key={company.id} type="button" className="company-list-card-item company-card-button" onClick={() => setFundingCompany(company)} aria-label={`Add funds to ${company.company_name} main wallet`}>
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
                    {company.employees_count ?? 0} employees · {company.users_count ?? 0} users · {company.batches_count ?? 0} batches
                  </p>
                </div>
              </div>

              <div className="company-card-right">
                <strong className="company-item-balance">
                  {formatMoneyBDT(company.wallet_balance)}
                </strong>
                <span className="company-fund-action">Add funds <ArrowRight size={15} /></span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Onboard Company Modal */}
      {token && (
        <><OnboardModal isOpen={modalOpen} onClose={() => setModalOpen(false)} token={token} onCreated={load} /><FundWalletModal company={fundingCompany} token={token} onClose={() => setFundingCompany(null)} onFunded={load} /></>
      )}
    </div>
  );
}
