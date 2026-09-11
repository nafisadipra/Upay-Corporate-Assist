from decimal import Decimal, InvalidOperation
from flask import Blueprint, jsonify, g, request
from sqlalchemy.exc import SQLAlchemyError
from app.extensions import db
from app.models import AuditLog, Company, CentralWallet, Employee, CompanyBankAccount
from app.utils.auth import require_auth, require_tenant

companies_bp = Blueprint("companies", __name__, url_prefix="/api/companies")


@companies_bp.route("", methods=["GET"])
@require_auth()
def get_companies():
    user = g.current_user
    if user.role != "ADMIN":
        companies = Company.query.filter_by(id=user.company_id).all()
    else:
        companies = Company.query.all()
    return jsonify({"companies": [c.to_dict() for c in companies]}), 200


@companies_bp.route("/<int:company_id>", methods=["GET"])
@require_auth()
@require_tenant()
def get_company(company_id):
    company = Company.query.get(company_id)
    if not company:
        return jsonify({"error": "Company not found"}), 404

    wallets = CentralWallet.query.filter_by(company_id=company_id).all()
    bank_accounts = CompanyBankAccount.query.filter_by(company_id=company_id).all()
    res = company.to_dict()
    res["wallets"] = [w.to_dict() for w in wallets]
    res["bank_accounts"] = [ba.to_dict() for ba in bank_accounts]
    return jsonify({"company": res}), 200


@companies_bp.route("/<int:company_id>/wallets", methods=["GET"])
@require_auth()
@require_tenant()
def get_company_wallets(company_id):
    wallets = CentralWallet.query.filter_by(company_id=company_id).all()
    return jsonify({"wallets": [w.to_dict() for w in wallets]}), 200


@companies_bp.route("/<int:company_id>/wallets", methods=["POST"])
@require_auth(roles=["MAKER", "ADMIN"])
@require_tenant()
def create_company_wallet(company_id):
    """Create a zero-balance wallet without creating unbacked company funds."""
    company = db.session.get(Company, company_id)
    if not company:
        return jsonify({"error": "Company not found"}), 404
    if company.status != "ACTIVE":
        return jsonify({"error": "Inactive or suspended companies cannot create wallets"}), 403

    data = request.get_json(silent=True) or {}
    wallet_name = str(data.get("wallet_name", "")).strip()
    wallet_type = str(data.get("wallet_type", "OPERATIONAL")).upper().strip()
    try:
        opening_balance = Decimal(str(data.get("opening_balance", 0)))
    except (InvalidOperation, TypeError, ValueError):
        return jsonify({"error": "Opening balance must be a valid number"}), 400

    if not wallet_name:
        return jsonify({"error": "Wallet name is required"}), 400
    if wallet_type not in {"MAIN", "PAYROLL", "OPERATIONAL", "FESTIVAL_BONUS", "VENDOR"}:
        return jsonify({"error": "Invalid wallet type"}), 400
    if not opening_balance.is_finite() or opening_balance < 0:
        return jsonify({"error": "Opening balance cannot be negative"}), 400
    if opening_balance != 0:
        return (
            jsonify(
                {
                    "error": "New wallets must start at zero. Allocate existing funds after creating the wallet."
                }
            ),
            400,
        )
    if wallet_type == "MAIN" and g.current_user.role != "ADMIN":
        return jsonify({"error": "Only upay Admin can provision a main central wallet"}), 403
    if (
        wallet_type == "MAIN"
        and CentralWallet.query.filter_by(company_id=company_id, wallet_type="MAIN").first()
    ):
        return (
            jsonify({"error": "This corporate client already has a main disbursement wallet"}),
            409,
        )

    account_number = str(data.get("account_number", "")).strip()
    if not account_number:
        wallet_count = CentralWallet.query.filter_by(company_id=company_id).count() + 1
        account_number = f"{company.corporate_account_number}-{wallet_type}-{wallet_count:03d}"
    if CentralWallet.query.filter_by(account_number=account_number).first():
        return jsonify({"error": "Wallet account number is already in use"}), 409

    wallet = CentralWallet(
        company_id=company_id,
        wallet_name=wallet_name,
        account_number=account_number,
        balance=opening_balance,
        wallet_type=wallet_type,
        status="ACTIVE",
    )
    db.session.add(wallet)
    db.session.flush()
    company.sync_balance()
    db.session.add(
        AuditLog(
            company_id=company_id,
            user_id=g.current_user.id,
            audit_scope="CORPORATE_CLIENT",
            action="CORPORATE_WALLET_CREATED",
            details={
                "wallet_id": wallet.id,
                "wallet_name": wallet_name,
                "account_number": account_number,
                "opening_balance": float(opening_balance),
            },
        )
    )
    db.session.commit()
    return (
        jsonify(
            {
                "message": "Corporate wallet created successfully",
                "wallet": wallet.to_dict(),
                "company": company.to_dict(),
            }
        ),
        201,
    )


@companies_bp.route("/<int:company_id>/wallets/transfer", methods=["POST"])
@require_auth(roles=["MAKER"])
@require_tenant()
def transfer_company_wallet_funds(company_id):
    """Atomically move existing funds between two wallets owned by the Maker's company."""
    company = db.session.get(Company, company_id)
    if not company:
        return jsonify({"error": "Company not found"}), 404
    if company.status != "ACTIVE":
        return (
            jsonify({"error": "Inactive or suspended companies cannot transfer wallet funds"}),
            403,
        )

    data = request.get_json(silent=True) or {}
    try:
        source_wallet_id = int(data.get("source_wallet_id"))
        destination_wallet_id = int(data.get("destination_wallet_id"))
        amount = Decimal(str(data.get("amount")))
    except (InvalidOperation, TypeError, ValueError):
        return (
            jsonify(
                {"error": "Source wallet, destination wallet, and a valid amount are required"}
            ),
            400,
        )

    if source_wallet_id == destination_wallet_id:
        return jsonify({"error": "Source and destination wallets must be different"}), 400
    if not amount.is_finite() or amount <= 0:
        return jsonify({"error": "Transfer amount must be greater than zero"}), 400
    if amount != amount.quantize(Decimal("0.01")):
        return jsonify({"error": "Transfer amount cannot have more than two decimal places"}), 400

    wallets = (
        CentralWallet.query.filter(
            CentralWallet.company_id == company_id,
            CentralWallet.id.in_([source_wallet_id, destination_wallet_id]),
        )
        .order_by(CentralWallet.id)
        .with_for_update()
        .all()
    )
    wallet_by_id = {wallet.id: wallet for wallet in wallets}
    source_wallet = wallet_by_id.get(source_wallet_id)
    destination_wallet = wallet_by_id.get(destination_wallet_id)
    if not source_wallet or not destination_wallet:
        return jsonify({"error": "Both wallets must belong to your company"}), 404
    if source_wallet.status != "ACTIVE" or destination_wallet.status != "ACTIVE":
        return jsonify({"error": "Funds can only be transferred between active wallets"}), 400

    source_balance = Decimal(str(source_wallet.balance))
    destination_balance = Decimal(str(destination_wallet.balance))
    if source_balance < amount:
        return jsonify({"error": "The source wallet does not have enough available balance"}), 409

    source_wallet.balance = source_balance - amount
    destination_wallet.balance = destination_balance + amount
    company.sync_balance()
    db.session.add(
        AuditLog(
            company_id=company_id,
            user_id=g.current_user.id,
            audit_scope="CORPORATE_CLIENT",
            action="CORPORATE_WALLET_FUNDS_TRANSFERRED",
            details={
                "source_wallet_id": source_wallet.id,
                "source_wallet_name": source_wallet.wallet_name,
                "destination_wallet_id": destination_wallet.id,
                "destination_wallet_name": destination_wallet.wallet_name,
                "amount_bdt": float(amount),
                "source_balance_after": float(source_wallet.balance),
                "destination_balance_after": float(destination_wallet.balance),
            },
        )
    )
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return (
            jsonify({"error": "Wallet transfer could not be completed. No funds were moved."}),
            500,
        )

    return (
        jsonify(
            {
                "message": f"BDT {float(amount):,.2f} transferred successfully.",
                "source_wallet": source_wallet.to_dict(),
                "destination_wallet": destination_wallet.to_dict(),
                "company": company.to_dict(),
            }
        ),
        200,
    )


@companies_bp.route("/<int:company_id>/wallets/<int:wallet_id>", methods=["PUT"])
@require_auth(roles=["ADMIN"])
@require_tenant()
def update_company_wallet(company_id, wallet_id):
    """Allow Upay administrators to update wallet metadata or balance."""
    company = db.session.get(Company, company_id)
    wallet = CentralWallet.query.filter_by(id=wallet_id, company_id=company_id).first()
    if not company or not wallet:
        return jsonify({"error": "Company wallet not found"}), 404
    if company.status != "ACTIVE":
        return jsonify({"error": "Inactive or suspended companies cannot update wallets"}), 403

    data = request.get_json(silent=True) or {}
    previous_balance = Decimal(str(wallet.balance))
    if "balance" in data:
        return (
            jsonify(
                {
                    "error": "Direct balance editing is disabled. Use an audited top-up or wallet transfer."
                }
            ),
            400,
        )
    if "wallet_name" in data:
        wallet_name = str(data["wallet_name"]).strip()
        if not wallet_name:
            return jsonify({"error": "Wallet name cannot be empty"}), 400
        wallet.wallet_name = wallet_name
    if "status" in data:
        status = str(data["status"]).upper().strip()
        if status not in {"ACTIVE", "INACTIVE", "SUSPENDED"}:
            return jsonify({"error": "Invalid wallet status"}), 400
        wallet.status = status
    company.sync_balance()
    db.session.add(
        AuditLog(
            company_id=company_id,
            user_id=g.current_user.id,
            audit_scope="CORPORATE_CLIENT",
            action="CORPORATE_WALLET_UPDATED",
            details={
                "wallet_id": wallet.id,
                "previous_balance": float(previous_balance),
                "new_balance": float(wallet.balance),
                "wallet_status": wallet.status,
            },
        )
    )
    db.session.commit()
    return (
        jsonify(
            {
                "message": "Corporate wallet updated successfully",
                "wallet": wallet.to_dict(),
                "company": company.to_dict(),
            }
        ),
        200,
    )


@companies_bp.route("/<int:company_id>/employees", methods=["GET"])
@require_auth()
@require_tenant()
def get_company_employees(company_id):
    employees = Employee.query.filter_by(company_id=company_id).all()
    return jsonify({"employees": [e.to_dict() for e in employees]}), 200
