export interface Company {
  id: number;
  company_name: string;
  corporate_account_number: string;
  central_wallet_balance: number;
  status: string;
  wallets?: CentralWallet[];
}

export interface CentralWallet {
  id: number;
  company_id: number;
  wallet_name: string;
  account_number: string;
  balance: number;
  wallet_type: string;
  status: string;
}

export interface User {
  id: number;
  company_id: number | null;
  full_name: string;
  email: string;
  phone_number: string;
  role: 'MAKER' | 'CHECKER' | 'ADMIN';
  status: string;
}

export interface Employee {
  id: number;
  company_id: number;
  employee_code?: string | null;
  phone_number: string;
  employee_name: string;
  department?: string | null;
  designation?: string | null;
  status: string;
  completed_cycles: number;
}

export interface Batch {
  id: number;
  company_id: number;
  maker_id: number;
  maker_name?: string;
  checker_id?: number;
  checker_name?: string;
  file_name: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  flagged_anomalies: number;
  total_amount: number;
  status: 'DRAFT' | 'VALIDATED' | 'FLAGGED_RISK' | 'PENDING_CHECKER_REVIEW' | 'PENDING_CHECKER_APPROVAL' | 'RETURNED_TO_HR' | 'CHECKER_REVIEWED' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'CANCELLED';
  checker_notes?: string | null;
  checker_reviewed_at?: string | null;
  payroll_period?: string | null;
  executed_at?: string | null;
  created_at: string;
}

export interface BatchItem {
  id: number;
  batch_id: number;
  employee_id?: number | null;
  raw_phone_number: string;
  effective_phone_number: string;
  corrected_phone_number?: string | null;
  employee_name: string;
  department: string;
  basic_salary: number;
  gross_salary: number;
  account_validation_status: 'VALID' | 'INVALID_LENGTH' | 'UNREGISTERED_ACCOUNT' | 'INACTIVE_ACCOUNT' | 'UNRECOGNIZED_PAYEE';
  baseline_status: 'VERIFIED' | 'BASELINE_PENDING';
  anomaly_score?: number | null;
  is_anomaly: boolean;
  anomaly_reason?: string | null;
  item_status: 'PENDING' | 'CORRECTED' | 'APPROVED' | 'OVERRIDDEN' | 'REJECTED';
}

export interface RiskAlert {
  id: number;
  batch_item_id: number;
  batch_id?: number | null;
  employee_name?: string | null;
  anomaly_reason?: string | null;
  flag_type: 'UNUSUAL_VARIANCE' | 'ROSTER_MISMATCH' | 'ACCOUNT_INACTIVE' | 'UNREGISTERED_PHONE' | 'MANUAL_INCORRECT_SALARY' | 'MANUAL_WRONG_EMPLOYEE' | 'MANUAL_INCORRECT_PHONE' | 'MANUAL_DUPLICATE_PAYMENT' | 'MANUAL_OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  review_status: 'PENDING_REVIEW' | 'RESOLVED_BY_HR' | 'APPROVED_BY_CHECKER' | 'OVERRIDDEN_BY_CHECKER' | 'REJECTED_BY_CHECKER';
  reviewed_by?: number | null;
  reviewer_name?: string | null;
  review_notes?: string | null;
  created_at?: string;
}

export interface LiquidityForecast {
  period: string;
  predicted_amount: number;
  current_balance: number;
  topup_required: number;
  confidence_score: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  model_type: string;
  status: string;
  history_months: number | null;
  mae: number | null;
  mape: number | null;
  assumptions: string[];
}

export interface ForecastSettings {
  planning_baseline_amount: number;
  include_festival_bonus: boolean;
  festival_bonus_amount: number;
  festival_bonus_months: number[];
}

export interface ForecastResponse {
  company_id: number;
  generated_at: string | null;
  source_data_through: string | null;
  model: { type: string; status: string; history_months: number; mae: number | null; mape: number | null; confidence_level: number | null };
  forecasts: LiquidityForecast[];
  liquidity_forecasts: LiquidityForecast[];
  historical_series: Array<{ period: string; amount: number }>;
  settings: ForecastSettings | null;
}

export interface AuditLog {
  id: number;
  batch_id?: number;
  user_id?: number;
  performed_by: string;
  payroll_period?: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}
