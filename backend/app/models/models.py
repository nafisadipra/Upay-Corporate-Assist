from datetime import datetime
from decimal import Decimal
from app.extensions import db


class Company(db.Model):
    __tablename__ = "companies"

    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(255), nullable=False)
    corporate_account_number = db.Column(db.String(50), unique=True, nullable=False)
    central_wallet_balance = db.Column(db.Numeric(15, 2), nullable=False, default=0.00)
    status = db.Column(db.String(20), nullable=False, default="ACTIVE")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = db.relationship("User", backref="company", lazy=True)
    central_wallets = db.relationship(
        "CentralWallet", backref="company", lazy=True, cascade="all, delete-orphan"
    )
    bank_accounts = db.relationship(
        "CompanyBankAccount", backref="company", lazy=True, cascade="all, delete-orphan"
    )
    employees = db.relationship(
        "Employee", backref="company", lazy=True, cascade="all, delete-orphan"
    )
    batches = db.relationship("Batch", backref="company", lazy=True, cascade="all, delete-orphan")
    liquidity_forecasts = db.relationship(
        "LiquidityForecast", backref="company", lazy=True, cascade="all, delete-orphan"
    )

    def sync_balance(self):
        total = sum(
            (w.balance for w in self.central_wallets if w.status == "ACTIVE"), Decimal("0.00")
        )
        self.central_wallet_balance = total
        return total

    def to_dict(self):
        return {
            "id": self.id,
            "company_name": self.company_name,
            "corporate_account_number": self.corporate_account_number,
            "central_wallet_balance": (
                float(self.central_wallet_balance)
                if self.central_wallet_balance is not None
                else 0.0
            ),
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CompanyBankAccount(db.Model):
    """Source Corporate Bank Account (e.g. UCB, City Bank, BRAC Bank) from which companies disburse funds"""

    __tablename__ = "company_bank_accounts"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer, db.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    bank_name = db.Column(db.String(150), nullable=False)
    branch_name = db.Column(db.String(100), nullable=False)
    account_name = db.Column(db.String(150), nullable=False)
    account_number = db.Column(db.String(50), nullable=False)
    routing_number = db.Column(db.String(30), nullable=False)
    account_type = db.Column(
        db.String(30), nullable=False, default="CURRENT"
    )  # CURRENT, SETTLEMENT, ESCROW
    status = db.Column(db.String(20), nullable=False, default="ACTIVE")  # ACTIVE, INACTIVE
    is_primary = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "bank_name": self.bank_name,
            "branch_name": self.branch_name,
            "account_name": self.account_name,
            "account_number": self.account_number,
            "routing_number": self.routing_number,
            "account_type": self.account_type,
            "status": self.status,
            "is_primary": self.is_primary,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CentralWallet(db.Model):
    __tablename__ = "central_wallets"
    __table_args__ = (
        db.Index(
            "uq_central_wallets_one_main_per_company",
            "company_id",
            unique=True,
            postgresql_where=db.text("wallet_type = 'MAIN'"),
            sqlite_where=db.text("wallet_type = 'MAIN'"),
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer, db.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    wallet_name = db.Column(db.String(100), nullable=False, default="Main Disbursement Wallet")
    account_number = db.Column(db.String(50), unique=True, nullable=False)
    balance = db.Column(db.Numeric(15, 2), nullable=False, default=0.00)
    wallet_type = db.Column(db.String(30), nullable=False, default="MAIN")
    status = db.Column(db.String(20), nullable=False, default="ACTIVE")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "wallet_name": self.wallet_name,
            "account_number": self.account_number,
            "balance": float(self.balance) if self.balance is not None else 0.0,
            "wallet_type": self.wallet_type,
            "status": self.status,
        }


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer, db.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone_number = db.Column(db.String(20), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # MAKER, CHECKER, ADMIN
    status = db.Column(db.String(20), nullable=False, default="ACTIVE")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "full_name": self.full_name,
            "email": self.email,
            "phone_number": self.phone_number,
            "role": self.role,
            "status": self.status,
        }


class Account(db.Model):
    """Mock upay Core MFS Account Registry"""

    __tablename__ = "accounts"

    id = db.Column(db.Integer, primary_key=True)
    phone_number = db.Column(db.String(20), unique=True, nullable=False)
    account_holder_name = db.Column(db.String(100), nullable=False)
    account_status = db.Column(
        db.String(20), nullable=False, default="ACTIVE"
    )  # ACTIVE, INACTIVE, SUSPENDED
    wallet_type = db.Column(db.String(30), nullable=False, default="PERSONAL")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "phone_number": self.phone_number,
            "account_holder_name": self.account_holder_name,
            "account_status": self.account_status,
            "wallet_type": self.wallet_type,
        }


class Employee(db.Model):
    """Corporate Client Approved HR Roster"""

    __tablename__ = "employees"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer, db.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    employee_code = db.Column(db.String(50), nullable=True)
    phone_number = db.Column(db.String(20), nullable=False)
    employee_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(50), nullable=True)
    designation = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="ACTIVE")
    completed_cycles = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("company_id", "phone_number", name="uk_company_phone"),)

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "employee_code": self.employee_code,
            "phone_number": self.phone_number,
            "employee_name": self.employee_name,
            "department": self.department,
            "designation": self.designation,
            "status": self.status,
            "completed_cycles": self.completed_cycles,
        }


class EmployeeRegistration(db.Model):
    """Maker-submitted employee registration awaiting Upay Admin approval."""

    __tablename__ = "employee_registrations"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer, db.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    submitted_by = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    email = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    employee_code = db.Column(db.String(50), nullable=True)
    division = db.Column(db.String(100), nullable=True)
    region = db.Column(db.String(100), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    designation = db.Column(db.String(100), nullable=True)
    employment_status = db.Column(db.String(30), nullable=True)
    exit_date = db.Column(db.String(30), nullable=True)
    wallet_details = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="PENDING_ADMIN_APPROVAL")
    reviewed_by = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            key: getattr(self, key)
            for key in (
                "id",
                "company_id",
                "submitted_by",
                "email",
                "full_name",
                "employee_code",
                "division",
                "region",
                "department",
                "designation",
                "employment_status",
                "exit_date",
                "wallet_details",
                "status",
                "reviewed_by",
            )
        } | {"created_at": self.created_at.isoformat() if self.created_at else None}


class Batch(db.Model):
    __tablename__ = "batches"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer, db.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    maker_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    checker_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    file_name = db.Column(db.String(255), nullable=False)
    total_records = db.Column(db.Integer, nullable=False, default=0)
    valid_records = db.Column(db.Integer, nullable=False, default=0)
    invalid_records = db.Column(db.Integer, nullable=False, default=0)
    flagged_anomalies = db.Column(db.Integer, nullable=False, default=0)
    total_amount = db.Column(db.Numeric(15, 2), nullable=False, default=0.00)
    status = db.Column(db.String(30), nullable=False, default="DRAFT")
    # Workflow states: DRAFT, VALIDATED, FLAGGED_RISK, PENDING_CHECKER_REVIEW, CHECKER_REVIEWED, EXECUTED, REJECTED, CANCELLED
    checker_notes = db.Column(db.Text, nullable=True)
    checker_reviewed_at = db.Column(db.DateTime, nullable=True)
    payroll_period = db.Column(db.Date, nullable=True)
    executed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    maker = db.relationship("User", foreign_keys=[maker_id])
    checker = db.relationship("User", foreign_keys=[checker_id])
    items = db.relationship("BatchItem", backref="batch", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "maker_id": self.maker_id,
            "maker_name": self.maker.full_name if self.maker else None,
            "checker_id": self.checker_id,
            "checker_name": self.checker.full_name if self.checker else None,
            "file_name": self.file_name,
            "total_records": self.total_records,
            "valid_records": self.valid_records,
            "invalid_records": self.invalid_records,
            "flagged_anomalies": self.flagged_anomalies,
            "total_amount": float(self.total_amount) if self.total_amount is not None else 0.0,
            "status": self.status,
            "checker_notes": self.checker_notes,
            "checker_reviewed_at": (
                self.checker_reviewed_at.isoformat() if self.checker_reviewed_at else None
            ),
            "payroll_period": self.payroll_period.isoformat() if self.payroll_period else None,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class BatchItem(db.Model):
    __tablename__ = "batch_items"

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(
        db.Integer, db.ForeignKey("batches.id", ondelete="CASCADE"), nullable=False
    )
    employee_id = db.Column(
        db.Integer, db.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    raw_phone_number = db.Column(db.String(20), nullable=False)
    corrected_phone_number = db.Column(db.String(20), nullable=True)
    employee_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(50), nullable=True)
    basic_salary = db.Column(db.Numeric(15, 2), nullable=False)
    gross_salary = db.Column(db.Numeric(15, 2), nullable=False)
    account_validation_status = db.Column(db.String(30), nullable=False, default="VALID")
    # VALID, INVALID_LENGTH, UNREGISTERED_ACCOUNT, INACTIVE_ACCOUNT, UNRECOGNIZED_PAYEE
    baseline_status = db.Column(db.String(30), nullable=False, default="VERIFIED")
    # VERIFIED, BASELINE_PENDING
    anomaly_score = db.Column(db.Numeric(8, 4), nullable=True)
    is_anomaly = db.Column(db.Boolean, nullable=False, default=False)
    anomaly_reason = db.Column(db.Text, nullable=True)
    item_status = db.Column(db.String(30), nullable=False, default="PENDING")
    # PENDING, CORRECTED, APPROVED, OVERRIDDEN, REJECTED
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    risk_alerts = db.relationship(
        "RiskAlert", backref="batch_item", lazy=True, cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "batch_id": self.batch_id,
            "employee_id": self.employee_id,
            "raw_phone_number": self.raw_phone_number,
            "effective_phone_number": self.corrected_phone_number or self.raw_phone_number,
            "corrected_phone_number": self.corrected_phone_number,
            "employee_name": self.employee_name,
            "department": self.department,
            "basic_salary": float(self.basic_salary) if self.basic_salary is not None else 0.0,
            "gross_salary": float(self.gross_salary) if self.gross_salary is not None else 0.0,
            "account_validation_status": self.account_validation_status,
            "baseline_status": self.baseline_status,
            "anomaly_score": float(self.anomaly_score) if self.anomaly_score is not None else None,
            "is_anomaly": self.is_anomaly,
            "anomaly_reason": self.anomaly_reason,
            "item_status": self.item_status,
        }


class RiskAlert(db.Model):
    __tablename__ = "risk_alerts"

    id = db.Column(db.Integer, primary_key=True)
    batch_item_id = db.Column(
        db.Integer, db.ForeignKey("batch_items.id", ondelete="CASCADE"), nullable=False
    )
    flag_type = db.Column(db.String(50), nullable=False)
    # UNUSUAL_VARIANCE, ROSTER_MISMATCH, ACCOUNT_INACTIVE, UNREGISTERED_PHONE
    severity = db.Column(
        db.String(20), nullable=False, default="MEDIUM"
    )  # LOW, MEDIUM, HIGH, CRITICAL
    review_status = db.Column(db.String(30), nullable=False, default="PENDING_REVIEW")
    # PENDING_REVIEW, APPROVED_BY_CHECKER, OVERRIDDEN_BY_CHECKER, REJECTED_BY_CHECKER
    reviewed_by = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    review_notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reviewer = db.relationship("User", foreign_keys=[reviewed_by])

    def to_dict(self):
        item = self.batch_item
        return {
            "id": self.id,
            "batch_item_id": self.batch_item_id,
            "batch_id": item.batch_id if item else None,
            "employee_name": item.employee_name if item else None,
            "anomaly_reason": (
                self.review_notes
                if self.flag_type.startswith("MANUAL_")
                else (item.anomaly_reason if item else None)
            ),
            "flag_type": self.flag_type,
            "severity": self.severity,
            "review_status": self.review_status,
            "reviewed_by": self.reviewed_by,
            "reviewer_name": self.reviewer.full_name if self.reviewer else None,
            "review_notes": self.review_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PayrollHistory(db.Model):
    __tablename__ = "payroll_history"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer, db.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    phone_number = db.Column(db.String(20), nullable=False)
    employee_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(50), nullable=True)
    disbursement_date = db.Column(db.DateTime, nullable=False)
    basic_salary = db.Column(db.Numeric(15, 2), nullable=False)
    gross_salary = db.Column(db.Numeric(15, 2), nullable=False)
    six_month_avg_amount = db.Column(db.Numeric(15, 2), nullable=True)
    dept_avg_amount = db.Column(db.Numeric(15, 2), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "phone_number": self.phone_number,
            "employee_name": self.employee_name,
            "department": self.department,
            "disbursement_date": self.disbursement_date.isoformat(),
            "basic_salary": float(self.basic_salary) if self.basic_salary is not None else 0.0,
            "gross_salary": float(self.gross_salary) if self.gross_salary is not None else 0.0,
            "six_month_avg_amount": (
                float(self.six_month_avg_amount) if self.six_month_avg_amount else None
            ),
            "dept_avg_amount": float(self.dept_avg_amount) if self.dept_avg_amount else None,
        }


class CheckerOTP(db.Model):
    __tablename__ = "checker_otps"

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(
        db.Integer, db.ForeignKey("batches.id", ondelete="CASCADE"), nullable=False
    )
    checker_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    otp_code_hash = db.Column(db.String(255), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class LiquidityForecast(db.Model):
    __tablename__ = "liquidity_forecasts"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer, db.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    forecast_period = db.Column(db.String(30), nullable=False)  # e.g., 'SEPTEMBER_2026'
    predicted_amount = db.Column(db.Numeric(15, 2), nullable=False)
    lower_bound = db.Column(db.Numeric(15, 2), nullable=True)
    upper_bound = db.Column(db.Numeric(15, 2), nullable=True)
    model_type = db.Column(db.String(50), nullable=False, default="LEGACY_RULE_BASED")
    status = db.Column(db.String(30), nullable=False, default="READY")
    history_months = db.Column(db.Integer, nullable=True)
    mae = db.Column(db.Numeric(15, 2), nullable=True)
    mape = db.Column(db.Numeric(8, 4), nullable=True)
    confidence_score = db.Column(db.Numeric(5, 2), default=0.95)
    assumptions = db.Column(db.JSON, nullable=True)
    source_data_through = db.Column(db.Date, nullable=True)
    forecast_run_id = db.Column(
        db.Integer, db.ForeignKey("forecast_runs.id", ondelete="SET NULL"), nullable=True
    )
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint(
            "company_id", "forecast_period", name="uk_liquidity_forecast_company_period"
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "forecast_period": self.forecast_period,
            "period": self.forecast_period,
            "predicted_amount": (
                float(self.predicted_amount) if self.predicted_amount is not None else 0.0
            ),
            "lower_bound": float(self.lower_bound) if self.lower_bound is not None else None,
            "upper_bound": float(self.upper_bound) if self.upper_bound is not None else None,
            "model_type": self.model_type,
            "status": self.status,
            "history_months": self.history_months,
            "mae": float(self.mae) if self.mae is not None else None,
            "mape": float(self.mape) if self.mape is not None else None,
            "confidence_score": (
                float(self.confidence_score) if self.confidence_score is not None else 0.0
            ),
            "assumptions": self.assumptions or [],
            "source_data_through": (
                self.source_data_through.isoformat() if self.source_data_through else None
            ),
            "forecast_run_id": self.forecast_run_id,
            "generated_at": self.generated_at.isoformat() if self.generated_at else None,
        }


class CompanyForecastSettings(db.Model):
    __tablename__ = "company_forecast_settings"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer, db.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    planning_baseline_amount = db.Column(db.Numeric(15, 2), nullable=False, default=5000000.00)
    include_festival_bonus = db.Column(db.Boolean, nullable=False, default=False)
    festival_bonus_amount = db.Column(db.Numeric(15, 2), nullable=False, default=0.00)
    festival_bonus_months = db.Column(db.JSON, nullable=False, default=list)
    configured_by = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "company_id": self.company_id,
            "planning_baseline_amount": float(self.planning_baseline_amount),
            "include_festival_bonus": self.include_festival_bonus,
            "festival_bonus_amount": float(self.festival_bonus_amount),
            "festival_bonus_months": self.festival_bonus_months or [],
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ForecastRun(db.Model):
    __tablename__ = "forecast_runs"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer, db.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    model_type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="READY")
    history_months = db.Column(db.Integer, nullable=False, default=0)
    mae = db.Column(db.Numeric(15, 2), nullable=True)
    mape = db.Column(db.Numeric(8, 4), nullable=True)
    parameters = db.Column(db.JSON, nullable=True)
    source_data_through = db.Column(db.Date, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    results = db.relationship(
        "ForecastRunResult", backref="forecast_run", lazy=True, cascade="all, delete-orphan"
    )


class ForecastRunResult(db.Model):
    __tablename__ = "forecast_run_results"

    id = db.Column(db.Integer, primary_key=True)
    forecast_run_id = db.Column(
        db.Integer, db.ForeignKey("forecast_runs.id", ondelete="CASCADE"), nullable=False
    )
    forecast_period = db.Column(db.String(30), nullable=False)
    predicted_amount = db.Column(db.Numeric(15, 2), nullable=False)
    lower_bound = db.Column(db.Numeric(15, 2), nullable=True)
    upper_bound = db.Column(db.Numeric(15, 2), nullable=True)
    assumptions = db.Column(db.JSON, nullable=True)
    source_data_through = db.Column(db.Date, nullable=True)


class ForecastAlert(db.Model):
    __tablename__ = "forecast_alerts"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer, db.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    forecast_run_id = db.Column(
        db.Integer, db.ForeignKey("forecast_runs.id", ondelete="SET NULL"), nullable=True
    )
    alert_type = db.Column(db.String(50), nullable=False)
    severity = db.Column(db.String(20), nullable=False, default="MEDIUM")
    review_status = db.Column(db.String(30), nullable=False, default="PENDING_REVIEW")
    details = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer, db.ForeignKey("companies.id", ondelete="CASCADE"), nullable=True
    )
    batch_id = db.Column(
        db.Integer, db.ForeignKey("batches.id", ondelete="SET NULL"), nullable=True
    )
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    audit_scope = db.Column(
        db.String(30), nullable=False, default="CORPORATE_CLIENT"
    )  # UPAY_ADMIN vs CORPORATE_CLIENT
    action = db.Column(db.String(100), nullable=False)
    details = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", foreign_keys=[user_id])
    batch = db.relationship("Batch", foreign_keys=[batch_id])

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "batch_id": self.batch_id,
            "user_id": self.user_id,
            "audit_scope": self.audit_scope,
            "performed_by": self.user.full_name if self.user else "System",
            "payroll_period": (
                self.batch.payroll_period.isoformat()
                if self.batch and self.batch.payroll_period
                else None
            ),
            "action": self.action,
            "details": self.details,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
