const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('upay_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res: Response, defaultErrMsg: string) {
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('upay_auth_token');
      localStorage.removeItem('upay_auth_user');
      window.dispatchEvent(new Event('upay_auth_expired'));
      throw new Error('Your session is no longer valid. Please sign in again.');
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || defaultErrMsg);
  }
  return res.json();
}

export async function fetchCompany(id: number = 1) {
  const res = await fetch(`${API_BASE_URL}/companies/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res, 'Failed to fetch company profile');
}

export async function fetchBatches(companyId: number = 1) {
  const res = await fetch(`${API_BASE_URL}/batches?company_id=${companyId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res, 'Failed to fetch batches');
}

export async function fetchBatchItems(batchId: number = 1) {
  const res = await fetch(`${API_BASE_URL}/batches/${batchId}/items`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res, 'Failed to fetch batch items');
}

export async function fetchEmployees(companyId: number = 1) {
  const res = await fetch(`${API_BASE_URL}/companies/${companyId}/employees`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res, 'Failed to fetch employees');
}

export async function createCompanyWallet(companyId: number, payload: { wallet_name: string; opening_balance: number; wallet_type?: string }) {
  const res = await fetch(`${API_BASE_URL}/companies/${companyId}/wallets`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'Failed to create company wallet');
}

export async function updateCompanyWallet(companyId: number, walletId: number, payload: { balance?: number; wallet_name?: string; status?: string }) {
  const res = await fetch(`${API_BASE_URL}/companies/${companyId}/wallets/${walletId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'Failed to update company wallet');
}

export async function uploadPayrollFile(file: File, companyId: number = 1, makerId: number = 1, payrollPeriod?: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('company_id', companyId.toString());
  formData.append('maker_id', makerId.toString());
  if (payrollPeriod) formData.append('payroll_period', payrollPeriod);

  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_auth_token') : null;

  const res = await fetch(`${API_BASE_URL}/batches/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return handleResponse(res, 'Failed to upload spreadsheet');
}

export async function uploadEmployeeRegistrationFile(file: File) {
  const formData = new FormData(); formData.append('file', file);
  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_auth_token') : null;
  const res = await fetch(`${API_BASE_URL}/employee-registrations/upload`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
  return handleResponse(res, 'Failed to submit employee registrations');
}

export async function correctPayrollItem(itemId: number, payload: { corrected_phone_number: string; employee_name: string; department: string; basic_salary: number; gross_salary: number }) {
  const res = await fetch(`${API_BASE_URL}/batches/items/${itemId}/correct`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'Failed to update phone number');
}

export async function createManualRiskAlert(batchItemId: number, issueType: string, notes: string) {
  const res = await fetch(`${API_BASE_URL}/risk-alerts/manual`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ batch_item_id: batchItemId, issue_type: issueType, notes }),
  });
  return handleResponse(res, 'Failed to return the payroll issue to HR');
}

export async function submitBatch(batchId: number) {
  const res = await fetch(`${API_BASE_URL}/batches/${batchId}/submit`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res, 'Failed to submit batch');
}

export async function checkerReviewBatch(batchId: number, action: string = 'APPROVED_BY_CHECKER', notes: string = 'Reviewed and signed off by Finance Director') {
  const res = await fetch(`${API_BASE_URL}/batches/${batchId}/checker-review`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ action, notes }),
  });
  return handleResponse(res, 'Failed to record checker review');
}

export async function executeBatch(batchId: number) {
  const res = await fetch(`${API_BASE_URL}/batches/${batchId}/execute`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res, 'Failed to execute disbursement');
}

export async function fetchRiskAlerts(batchId?: number) {
  const url = batchId ? `${API_BASE_URL}/risk-alerts?batch_id=${batchId}` : `${API_BASE_URL}/risk-alerts`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  return handleResponse(res, 'Failed to fetch risk alerts');
}

export async function reviewRiskAlert(alertId: number, action: string, notes: string) {
  const res = await fetch(`${API_BASE_URL}/risk-alerts/${alertId}/review`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ action, notes }),
  });
  return handleResponse(res, 'Failed to review risk alert');
}

export async function fetchLiquidityForecast(companyId: number = 1) {
  const res = await fetch(`${API_BASE_URL}/analytics/liquidity-forecast/${companyId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res, 'Failed to fetch liquidity forecast');
}

export async function refreshLiquidityForecast(companyId: number) {
  const res = await fetch(`${API_BASE_URL}/analytics/liquidity-forecast/${companyId}/refresh`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res, 'Failed to refresh liquidity forecast');
}

export async function updateForecastSettings(companyId: number, settings: {
  planning_baseline_amount: number;
  include_festival_bonus: boolean;
  festival_bonus_amount: number;
  festival_bonus_months: number[];
}) {
  const res = await fetch(`${API_BASE_URL}/analytics/liquidity-forecast/${companyId}/settings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(settings),
  });
  return handleResponse(res, 'Failed to save forecast settings');
}

export async function fetchDisbursementHistory(companyId: number) {
  const res = await fetch(`${API_BASE_URL}/analytics/disbursement-history/${companyId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res, 'Failed to fetch completed disbursement history');
}

export async function fetchAuditLogs(batchId: number = 1) {
  const res = await fetch(`${API_BASE_URL}/audit-logs?batch_id=${batchId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res, 'Failed to fetch audit logs');
}

export async function downloadPayrollArchive(batchId: number, fileName: string) {
  const res = await fetch(`${API_BASE_URL}/batches/${batchId}/archive`, { headers: getAuthHeaders() });
  if (!res.ok) return handleResponse(res, 'Failed to download payroll archive');
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadBatchWorkbook(batchId: number, fileName: string) {
  const res = await fetch(`${API_BASE_URL}/batches/${batchId}/workbook`, { headers: getAuthHeaders() });
  if (!res.ok) return handleResponse(res, 'Failed to download the selected payroll batch');
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
