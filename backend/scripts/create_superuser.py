"""Create or update one Upay superuser for local development.

Edit the SUPERUSER values below, then run:
    python3 scripts/create_superuser.py
"""

import sys
from pathlib import Path

from werkzeug.security import generate_password_hash

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from app.models import User


# Change these values before running the script. Do not commit real credentials.
SUPERUSER = {
    'full_name': 'Replace with full name',
    'email': 'replace-with-email@example.com',
    'phone_number': '01XXXXXXXXX',
    'password': 'replace-with-a-strong-local-password',
}


def validate_superuser():
    required = ('full_name', 'email', 'phone_number', 'password')
    if any(not str(SUPERUSER.get(field, '')).strip() for field in required):
        sys.exit('Fill in every SUPERUSER field before running this script.')
    if SUPERUSER['email'].endswith('@example.com') or 'Replace with' in SUPERUSER['full_name']:
        sys.exit('Replace the example SUPERUSER values before running this script.')
    if not (SUPERUSER['phone_number'].isdigit() and len(SUPERUSER['phone_number']) == 11 and SUPERUSER['phone_number'].startswith('01')):
        sys.exit('phone_number must be an 11-digit Bangladesh mobile number beginning with 01.')


def main():
    validate_superuser()
    app = create_app()
    with app.app_context():
        user = User.query.filter_by(email=SUPERUSER['email'].lower()).first()
        if user is None:
            user = User.query.filter_by(phone_number=SUPERUSER['phone_number']).first()

        if user is None:
            user = User(
                full_name=SUPERUSER['full_name'].strip(),
                email=SUPERUSER['email'].strip().lower(),
                phone_number=SUPERUSER['phone_number'],
                password_hash=generate_password_hash(SUPERUSER['password'], method='pbkdf2:sha256'),
                role='ADMIN',
                status='ACTIVE',
                company_id=None,
            )
            db.session.add(user)
            action = 'Created'
        else:
            user.full_name = SUPERUSER['full_name'].strip()
            user.email = SUPERUSER['email'].strip().lower()
            user.phone_number = SUPERUSER['phone_number']
            user.password_hash = generate_password_hash(SUPERUSER['password'], method='pbkdf2:sha256')
            user.role = 'ADMIN'
            user.status = 'ACTIVE'
            user.company_id = None
            action = 'Updated'

        db.session.commit()

    print(f"{action} active ADMIN user: {SUPERUSER['email'].strip().lower()}")


if __name__ == '__main__':
    main()
