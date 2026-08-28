'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AdminLayout';
import * as api from '@/lib/api';

type Registration = { id: number; full_name: string; email: string; employee_code?: string; department?: string; designation?: string; wallet_details: string; created_at?: string };
export default function Registrations() {
  const { token } = useAuth(); const [rows, setRows] = useState<Registration[]>([]); const [message, setMessage] = useState('');
  const load = async () => { if (!token) return; try { const data = await api.getPendingEmployeeRegistrations(token); setRows(data.registrations as Registration[]); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load registrations.'); } };
  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const data = await api.getPendingEmployeeRegistrations(token);
        setRows(data.registrations as Registration[]);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to load registrations.');
      }
    })();
  }, [token]);
  const approve = async (id: number) => { if (!token) return; try { const result = await api.approveEmployeeRegistration(token, id); setMessage(result.message); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Approval failed.'); } };
  return <div className="companies-root-view"><div className="companies-header-row"><div><h2 className="companies-title">Pending employee registrations</h2><p className="companies-subtitle">Maker-submitted Upay account registrations awaiting approval.</p></div></div>{message && <div className="signin-error-alert">{message}</div>}<div className="companies-table-card"><table className="companies-data-table"><thead><tr><th>Employee</th><th>Employee code</th><th>Department</th><th>Upay number</th><th>Submitted</th><th /></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id}><td><strong>{row.full_name}</strong><br /><span>{row.email}</span></td><td>{row.employee_code || '—'}</td><td>{row.department || '—'}<br /><span>{row.designation || ''}</span></td><td>{row.wallet_details}</td><td>{row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}</td><td><button className="company-action-btn" onClick={() => approve(row.id)}>Approve</button></td></tr>) : <tr><td colSpan={6}>No employee registrations are waiting for approval.</td></tr>}</tbody></table></div></div>;
}
