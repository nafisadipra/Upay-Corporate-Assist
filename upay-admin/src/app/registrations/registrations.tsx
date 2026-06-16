'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, Check, CheckCheck, UsersRound, UserRoundCheck } from 'lucide-react';
import { useAuth } from '@/components/AdminLayout';
import * as api from '@/lib/api';
import { Company, User } from '@/types';

type Registration = { id: number; company_id: number; full_name: string; email: string; employee_code?: string; department?: string; designation?: string; wallet_details: string; created_at?: string };
type Tab = 'approvals' | 'users';

export default function Registrations() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('approvals');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkApproving, setBulkApproving] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectedCompany = companies.find((company) => company.id === Number(companyId));

  const allSelected = registrations.length > 0 && selectedIds.length === registrations.length;
  const partiallySelected = selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = partiallySelected;
  }, [partiallySelected]);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try { setCompanies((await api.getCompanies(token)).companies); }
      catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load companies.'); }
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !companyId) return;
    void (async () => {
      setLoading(true); setMessage('');
      try {
        if (activeTab === 'approvals') {
          setRegistrations((await api.getPendingEmployeeRegistrations(token, Number(companyId))).registrations as Registration[]);
          setSelectedIds([]);
        }
        else {
          const [userData, approvedData] = await Promise.all([
            api.getUsers(token, Number(companyId)),
            api.getEmployeeRegistrations(token, Number(companyId), 'APPROVED'),
          ]);
          setUsers([
            ...userData.users,
            ...(approvedData.registrations as Registration[]).map((registration) => ({
              id: -registration.id,
              company_id: registration.company_id,
              full_name: registration.full_name,
              email: registration.email,
              phone_number: registration.wallet_details,
              role: 'EMPLOYEE' as User['role'],
              status: 'ACTIVE',
            })),
          ]);
        }
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load company records.'); }
      finally { setLoading(false); }
    })();
  }, [activeTab, companyId, token]);

  const approve = async (id: number) => {
    if (!token) return;
    setApprovingId(id); setMessage('');
    try {
      const result = await api.approveEmployeeRegistration(token, id);
      setRegistrations((current) => current.filter((row) => row.id !== id));
      setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
      setMessage(result.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Approval failed.'); }
    finally { setApprovingId(null); }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
  };

  const toggleAll = () => setSelectedIds(allSelected ? [] : registrations.map((row) => row.id));

  const bulkApprove = async () => {
    if (!token || !selectedIds.length) return;
    setBulkApproving(true); setMessage('');
    try {
      const result = await api.bulkApproveEmployeeRegistrations(token, selectedIds);
      const approvedIds = new Set(selectedIds);
      setRegistrations((current) => current.filter((row) => !approvedIds.has(row.id)));
      setSelectedIds([]);
      setMessage(result.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Bulk approval failed.'); }
    finally { setBulkApproving(false); }
  };

  return <div className="registration-workspace">
    <section className="registration-control-card">
      <div className="registration-company-control"><div className="registration-control-icon"><Building2 size={20} /></div><label htmlFor="registration-company"><span>Company</span><select id="registration-company" value={companyId} onChange={(event) => { setCompanyId(event.target.value); setMessage(''); }}><option value="">Select a company to continue</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.company_name}</option>)}</select></label></div>
      {selectedCompany && <div className="registration-company-meta"><span>Selected company</span><strong>{selectedCompany.company_name}</strong></div>}
    </section>
    <div className="registration-tabs" role="tablist" aria-label="Registration records"><button className={activeTab === 'approvals' ? 'active' : ''} onClick={() => setActiveTab('approvals')} role="tab" aria-selected={activeTab === 'approvals'}><UserRoundCheck size={17} /> Pending approvals</button><button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')} role="tab" aria-selected={activeTab === 'users'}><UsersRound size={17} /> Users</button></div>
    {message && <div className="registration-message" role="status">{message}</div>}
    {!companyId ? <div className="registration-empty-state"><Building2 size={30} /><h3>Select a company</h3><p>Choose a corporate client above to view its {activeTab === 'approvals' ? 'employee registrations awaiting approval' : 'registered users'}.</p></div> : <section className="registration-table-card">
      <div className="registration-table-heading"><div><span>{activeTab === 'approvals' ? 'Approval queue' : 'User directory'}</span><h3>{activeTab === 'approvals' ? 'Employees awaiting registration' : 'Registered company users'}</h3></div><div className="registration-heading-actions">{activeTab === 'approvals' && <button className="registration-bulk-approve-button" onClick={bulkApprove} disabled={!selectedIds.length || bulkApproving}>{bulkApproving ? 'Approving…' : <><CheckCheck size={16} /> Bulk approve{selectedIds.length ? ` (${selectedIds.length})` : ''}</>}</button>}<div className="registration-count">{activeTab === 'approvals' ? registrations.length : users.length} records</div></div></div>
      <div className="registration-table-scroll">{activeTab === 'approvals' ? <table className="registration-table"><thead><tr><th className="registration-selection-cell"><input ref={selectAllRef} type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all pending employees" disabled={!registrations.length || bulkApproving} /></th><th>Employee</th><th>Employee code</th><th>Department</th><th>Upay number</th><th>Submitted</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="registration-table-empty">Loading registrations…</td></tr> : registrations.length ? registrations.map((row) => <tr key={row.id} className={selectedIds.includes(row.id) ? 'selected' : ''}><td className="registration-selection-cell"><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelection(row.id)} aria-label={`Select ${row.full_name}`} disabled={bulkApproving || approvingId === row.id} /></td><td><strong>{row.full_name}</strong><span>{row.email}</span></td><td>{row.employee_code || '—'}</td><td><strong>{row.department || '—'}</strong><span>{row.designation || 'No designation'}</span></td><td className="registration-number">{row.wallet_details}</td><td>{row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}</td><td><button className="registration-approve-button" onClick={() => approve(row.id)} disabled={approvingId === row.id || bulkApproving}>{approvingId === row.id ? 'Approving…' : <><Check size={15} /> Approve</>}</button></td></tr>) : <tr><td colSpan={7} className="registration-table-empty">No employee registrations are waiting for approval.</td></tr>}</tbody></table> : <table className="registration-table"><thead><tr><th>User</th><th>Phone number</th><th>Role</th><th>Status</th></tr></thead><tbody>{loading ? <tr><td colSpan={4} className="registration-table-empty">Loading users…</td></tr> : users.length ? users.map((user) => <tr key={user.id}><td><strong>{user.full_name}</strong><span>{user.email}</span></td><td className="registration-number">{user.phone_number}</td><td><span className="registration-role">{user.role}</span></td><td><span className={`registration-status ${user.status.toLowerCase()}`}>{user.status}</span></td></tr>) : <tr><td colSpan={4} className="registration-table-empty">No registered users or approved employees were found for this company.</td></tr>}</tbody></table>}</div>
    </section>}
  </div>;
}
