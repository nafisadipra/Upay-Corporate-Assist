import { AuditLog, Company, Employee, BankAccount, ForecastResponse, Overview, RiskAlert, User } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'The admin service could not complete that request');
  }
  return response.json();
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Sign in failed');
  return payload as { token: string; user: User };
}

// 1. Overview & Activity
export const getOverview = (token: string) => request<Overview>('/admin/overview', token);
export const getActivity = (token: string) => request<{ audit_logs: AuditLog[]; risk_alerts: RiskAlert[] }>('/admin/activity', token);
export const getAdminAuditLogs = (token: string, companyId?: number) =>
  request<{ audit_logs: AuditLog[] }>(`/admin/audit-logs${companyId ? `?company_id=${companyId}` : ''}`, token);

export const getLiquidityForecast = (token: string, companyId: number, includeFestivalBonuses?: boolean) =>
  request<ForecastResponse>(`/analytics/liquidity-forecast/${companyId}${includeFestivalBonuses === undefined ? '' : `?include_festival_bonus=${includeFestivalBonuses}`}`, token);
export const refreshLiquidityForecast = (token: string, companyId: number) =>
  request<ForecastResponse>(`/analytics/liquidity-forecast/${companyId}/refresh`, token, { method: 'POST' });

// 2. Company Onboarding & Status
export const getCompanies = (token: string) => request<{ companies: Company[] }>('/admin/companies', token);
export const getCompany = (token: string, companyId: number) => request<{ company: Company }>(`/admin/companies/${companyId}`, token);
export const createCompany = (token: string, payload: Record<string, unknown>) => request<{ company: Company }>('/admin/companies', token, {
  method: 'POST',
  body: JSON.stringify(payload),
});
export const updateCompanyStatus = (token: string, companyId: number, status: string) => request<{ company: Company }>(`/admin/companies/${companyId}/status`, token, {
  method: 'PUT',
  body: JSON.stringify({ status }),
});

// 3. Disbursement Float Top-Up
export const topupCompanyWallet = (token: string, companyId: number, payload: { amount: number; source_bank?: string; reference_note?: string }) =>
  request<{ message: string; company: Company }>(`/admin/companies/${companyId}/topup`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// 4. Corporate Bank Accounts
export const getCompanyBankAccounts = (token: string, companyId: number) =>
  request<{ bank_accounts: BankAccount[] }>(`/admin/companies/${companyId}/bank-accounts`, token);

export const addCompanyBankAccount = (token: string, companyId: number, payload: Record<string, unknown>) =>
  request<{ message: string; bank_account: BankAccount }>(`/admin/companies/${companyId}/bank-accounts`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const removeCompanyBankAccount = (token: string, companyId: number, accountId: number) =>
  request<{ message: string }>(`/admin/companies/${companyId}/bank-accounts/${accountId}`, token, {
    method: 'DELETE',
  });

// 5. Employee Roster Management
export const getCompanyEmployees = (token: string, companyId: number) =>
  request<{ company_id: number; company_name: string; employees: Employee[] }>(`/admin/companies/${companyId}/employees`, token);

export const uploadCompanyEmployees = async (token: string, companyId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/admin/companies/${companyId}/employees/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Failed to upload employee roster');
  return payload as { message: string; total_employees: number; employees: Employee[] };
};

export const addCompanyEmployee = (token: string, companyId: number, payload: Record<string, unknown>) =>
  request<{ message: string; employee: Employee }>(`/admin/companies/${companyId}/employees`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const removeCompanyEmployee = (token: string, companyId: number, employeeId: number) =>
  request<{ message: string }>(`/admin/companies/${companyId}/employees/${employeeId}`, token, {
    method: 'DELETE',
  });

export const getEmployeeRegistrations = (token: string, companyId?: number, status = 'PENDING_ADMIN_APPROVAL') => {
  const params = new URLSearchParams({ status });
  if (companyId) params.set('company_id', String(companyId));
  return request<{ registrations: Array<Record<string, unknown>> }>(`/employee-registrations?${params.toString()}`, token);
};
export const getPendingEmployeeRegistrations = (token: string, companyId?: number) =>
  getEmployeeRegistrations(token, companyId);
export const approveEmployeeRegistration = (token: string, registrationId: number) =>
  request<{ message: string }>(`/employee-registrations/${registrationId}/approve`, token, { method: 'POST' });
export const bulkApproveEmployeeRegistrations = (token: string, registrationIds: number[]) =>
  request<{ message: string; approved_count: number }>('/employee-registrations/bulk-approve', token, {
    method: 'POST',
    body: JSON.stringify({ registration_ids: registrationIds }),
  });

// 6. Identity & Users
export const getUsers = (token: string, companyId?: number) =>
  request<{ users: User[] }>(`/admin/users${companyId ? `?company_id=${companyId}` : ''}`, token);
export const createUser = (token: string, payload: Record<string, unknown>) => request<{ user: User }>('/admin/users', token, {
  method: 'POST',
  body: JSON.stringify(payload),
});
