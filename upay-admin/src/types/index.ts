export type CorporateStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface BankAccount {
  id: number;
  company_id: number;
  bank_name: string;
  branch_name: string;
  account_name: string;
  account_number: string;
  routing_number: string;
  account_type: string;
  status: string;
  is_primary: boolean;
  created_at?: string;
}

export interface Employee {
  id: number;
  company_id: number;
  employee_code: string;
  phone_number: string;
  employee_name: string;
  department: string;
  designation?: string;
  status: string;
  completed_cycles: number;
}

export interface Company {
  id: number;
  company_name: string;
  corporate_account_number: string;
  status: CorporateStatus;
  wallet_balance: number;
  users_count: number;
  batches_count: number;
  employees_count?: number;
  bank_accounts?: BankAccount[];
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
  file_name: string;
  total_records: number;
  total_amount: number;
  status: string;
  checker_notes?: string | null;
  checker_reviewed_at?: string | null;
  executed_at?: string | null;
  created_at: string;
}

export interface RiskAlert {
  id: number;
  flag_type: string;
  severity: string;
  review_notes: string | null;
  company_name: string;
  batch_id?: number | null;
}

export interface AuditLog {
  id: number;
  company_id?: number | null;
  batch_id?: number | null;
  audit_scope?: string;
  action: string;
  performed_by: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface Overview {
  metrics: {
    corporates_count: number;
    active_corporates_count: number;
    wallet_balance_bdt: number;
    total_employees_count?: number;
    executed_amount_bdt: number;
  };
  companies: Company[];
}
