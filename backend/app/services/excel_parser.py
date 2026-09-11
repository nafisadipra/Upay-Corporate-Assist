import os
import zipfile
from decimal import Decimal, InvalidOperation
import pandas as pd
from flask import current_app, has_app_context


def validate_xlsx_size(file_path):
    """Reject small compressed uploads that expand to an excessive in-memory workbook."""
    if os.path.splitext(file_path)[1].lower() != ".xlsx":
        return
    limit = (
        current_app.config["MAX_SPREADSHEET_EXPANDED_SIZE"]
        if has_app_context()
        else 64 * 1024 * 1024
    )
    try:
        with zipfile.ZipFile(file_path) as workbook:
            expanded_size = sum(entry.file_size for entry in workbook.infolist())
    except zipfile.BadZipFile as error:
        raise ValueError("The uploaded .xlsx file is not a valid Excel workbook.") from error
    if expanded_size > limit:
        raise ValueError("The spreadsheet expands beyond the safe processing limit.")


def parse_employee_registration_file(file_path):
    validate_xlsx_size(file_path)
    df = (
        pd.read_csv(file_path, dtype=str)
        if os.path.splitext(file_path)[1].lower() == ".csv"
        else pd.read_excel(file_path, sheet_name="Employees", dtype=str)
    )
    df.columns = [str(col).strip().lower().replace(" ", "_") for col in df.columns]
    required = {"email", "full_name", "wallet_details"}
    if not required.issubset(df.columns):
        raise ValueError("Template must include email, full_name, and wallet_details columns.")
    rows = []
    for _, row in df.iterrows():
        email, name, wallet = (
            str(row.get(key, "")).strip() for key in ("email", "full_name", "wallet_details")
        )
        if not email or not name or not wallet or wallet.lower() == "nan":
            continue
        wallet = wallet.removesuffix(".0")
        if not wallet.isdigit() or len(wallet) != 11 or not wallet.startswith("01"):
            raise ValueError(
                f"Invalid Upay registration number for {email}. Use an 11-digit number beginning with 01."
            )
        rows.append(
            {
                key: (None if pd.isna(row.get(key)) else str(row.get(key)).strip())
                for key in (
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
                )
            }
        )
        rows[-1]["wallet_details"] = wallet
    return rows


def parse_payroll_file(file_path):
    """
    Parses Excel (.xlsx, .xls) or CSV payroll spreadsheet files uploaded by HR.
    Requires basic_salary and gross_salary. Gross salary is the disbursed amount.
    """
    ext = os.path.splitext(file_path)[1].lower()
    validate_xlsx_size(file_path)

    if ext == ".csv":
        df = pd.read_csv(file_path, dtype=str)
    elif ext in [".xlsx", ".xls"]:
        df = pd.read_excel(file_path, dtype=str)
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    # Standardize column header names (case-insensitive & whitespace trimmed)
    df.columns = [str(col).strip().lower().replace(" ", "_") for col in df.columns]

    # Map column aliases
    phone_col = next(
        (c for c in df.columns if "phone" in c or "mobile" in c or "number" in c or "account" in c),
        "phone_number",
    )
    name_col = next((c for c in df.columns if "name" in c or "employee" in c), "employee_name")
    dept_col = next((c for c in df.columns if "dept" in c or "department" in c), "department")
    basic_salary_col = next((c for c in df.columns if "basic" in c and "salary" in c), None)
    gross_salary_col = next((c for c in df.columns if "gross" in c and "salary" in c), None)

    if not basic_salary_col or not gross_salary_col:
        raise ValueError("Template must include basic_salary and gross_salary columns.")

    def salary(value):
        try:
            parsed = Decimal(str(value).replace(",", "").strip()).quantize(Decimal("0.01"))
            return max(parsed, Decimal("0.00"))
        except (ValueError, TypeError, InvalidOperation):
            return Decimal("0.00")

    parsed_rows = []
    for idx, row in df.iterrows():
        raw_phone = str(row.get(phone_col, "")).strip()
        # Remove trailing .0 from float conversion of phone numbers if present
        if raw_phone.endswith(".0"):
            raw_phone = raw_phone[:-2]

        employee_name = str(row.get(name_col, f"Employee_{idx+1}")).strip()
        department = (
            str(row.get(dept_col, "General")).strip() if pd.notna(row.get(dept_col)) else "General"
        )

        basic_salary = salary(row.get(basic_salary_col, 0))
        gross_salary = salary(row.get(gross_salary_col, 0))
        if gross_salary < basic_salary:
            raise ValueError(f"Gross salary cannot be lower than basic salary for row {idx + 2}.")

        parsed_rows.append(
            {
                "raw_phone_number": raw_phone,
                "employee_name": employee_name,
                "department": department,
                "basic_salary": float(basic_salary),
                "gross_salary": float(gross_salary),
            }
        )

    return parsed_rows


def parse_employee_roster_file(file_path):
    """
    Parses Excel (.xlsx, .xls) or CSV company employee roster file uploaded by Upay Admin.
    Expected columns: employee_code, employee_name, phone_number / upay_account, department, designation.
    Returns a list of dicts:
    [{'employee_code': '...', 'employee_name': '...', 'phone_number': '017XXXXXXXX', 'department': '...', 'designation': '...'}]
    """
    ext = os.path.splitext(file_path)[1].lower()
    validate_xlsx_size(file_path)

    if ext == ".csv":
        df = pd.read_csv(file_path, dtype=str)
    elif ext in [".xlsx", ".xls"]:
        df = pd.read_excel(file_path, dtype=str)
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    df.columns = [str(col).strip().lower().replace(" ", "_") for col in df.columns]

    code_col = next(
        (c for c in df.columns if "code" in c or "id" in c or "emp_id" in c or "employee_id" in c),
        "employee_code",
    )
    name_col = next((c for c in df.columns if "name" in c or "employee" in c), "employee_name")
    phone_col = next(
        (
            c
            for c in df.columns
            if "phone" in c or "mobile" in c or "upay" in c or "account" in c or "number" in c
        ),
        "phone_number",
    )
    dept_col = next((c for c in df.columns if "dept" in c or "department" in c), "department")
    desig_col = next(
        (c for c in df.columns if "desig" in c or "title" in c or "role" in c or "position" in c),
        "designation",
    )

    parsed_employees = []
    for idx, row in df.iterrows():
        raw_phone = str(row.get(phone_col, "")).strip()
        if raw_phone.endswith(".0"):
            raw_phone = raw_phone[:-2]

        # Strip spaces or country code prefix (+88) if present
        raw_phone = raw_phone.replace(" ", "").replace("-", "")
        if raw_phone.startswith("+880"):
            raw_phone = raw_phone[3:]
        elif raw_phone.startswith("880"):
            raw_phone = raw_phone[2:]

        code = (
            str(row.get(code_col, f"EMP-{idx+1001}")).strip()
            if pd.notna(row.get(code_col))
            else f"EMP-{idx+1001}"
        )
        name = str(row.get(name_col, f"Employee_{idx+1}")).strip()
        dept = (
            str(row.get(dept_col, "General")).strip() if pd.notna(row.get(dept_col)) else "General"
        )
        designation = (
            str(row.get(desig_col, "Staff")).strip() if pd.notna(row.get(desig_col)) else "Staff"
        )

        if raw_phone:
            parsed_employees.append(
                {
                    "employee_code": code,
                    "employee_name": name,
                    "phone_number": raw_phone,
                    "department": dept,
                    "designation": designation,
                }
            )

    return parsed_employees
