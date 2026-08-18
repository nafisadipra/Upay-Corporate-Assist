export interface Company {
  id: number;
  company_name: string;
  corporate_account_number: string;
  central_wallet_balance: number;
  status: string;
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
  status: 'DRAFT' | 'VALIDATED' | 'FLAGGED_RISK' | 'PENDING_CHECKER_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'CANCELLED';
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
  amount: number;
  wallet_type: string;
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
  flag_type: 'UNUSUAL_VARIANCE' | 'ROSTER_MISMATCH' | 'ACCOUNT_INACTIVE' | 'UNREGISTERED_PHONE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  review_status: 'PENDING_REVIEW' | 'APPROVED_BY_CHECKER' | 'OVERRIDDEN_BY_CHECKER' | 'REJECTED_BY_CHECKER';
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
  confidence_score: number;
}

export interface AuditLog {
  id: number;
  batch_id?: number;
  user_id?: number;
  performed_by: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}
