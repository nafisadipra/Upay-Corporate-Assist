from app.models import Account, Employee


def validate_payee_row(company_id, raw_phone_number):
    """
    Performs multi-stage account validation:
    1. Phone format check (11 digits, starts with '01') -> INVALID_LENGTH
    2. Core upay MFS account database lookup -> UNREGISTERED_ACCOUNT or INACTIVE_ACCOUNT
    3. Corporate HR Roster reconciliation -> UNRECOGNIZED_PAYEE (Ghost employee check per pp2 Section 3.A)

    Returns: (validation_status, employee_obj, account_obj)
    """
    clean_phone = str(raw_phone_number).strip()

    # Step 1: Format Check
    if len(clean_phone) != 11 or not clean_phone.startswith("01") or not clean_phone.isdigit():
        return "INVALID_LENGTH", None, None

    # Step 2: Core MFS Account Registry Lookup
    account = Account.query.filter_by(phone_number=clean_phone).first()
    if not account:
        return "UNREGISTERED_ACCOUNT", None, None

    if account.account_status != "ACTIVE":
        return "INACTIVE_ACCOUNT", None, account

    # Step 3: Corporate HR Approved Roster Reconciliation
    employee = Employee.query.filter_by(
        company_id=company_id,
        phone_number=clean_phone,
        status="ACTIVE",
    ).first()
    if not employee:
        # Valid active mobile number on upay MFS, but NOT on corporate client's HR roster!
        return "UNRECOGNIZED_PAYEE", None, account

    # Fully Verified & Roster Matched
    return "VALID", employee, account
