"""Create or rotate local Flask signing secrets without printing them."""

from pathlib import Path
import os
import re
import secrets


BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BACKEND_DIR / '.env'
EXAMPLE_PATH = BACKEND_DIR / '.env.example'


def set_value(contents: str, key: str, value: str) -> str:
    pattern = re.compile(rf'^{re.escape(key)}=.*$', re.MULTILINE)
    replacement = f'{key}={value}'
    if pattern.search(contents):
        return pattern.sub(replacement, contents, count=1)
    separator = '' if not contents or contents.endswith('\n') else '\n'
    return f'{contents}{separator}{replacement}\n'


def main() -> None:
    contents = ENV_PATH.read_text() if ENV_PATH.exists() else EXAMPLE_PATH.read_text()
    contents = set_value(contents, 'SECRET_KEY', secrets.token_hex(32))
    contents = set_value(contents, 'JWT_SECRET_KEY', secrets.token_hex(32))

    temporary_path = ENV_PATH.with_suffix('.env.tmp')
    temporary_path.write_text(contents)
    os.chmod(temporary_path, 0o600)
    temporary_path.replace(ENV_PATH)
    print('Rotated SECRET_KEY and JWT_SECRET_KEY in backend/.env (values were not displayed).')


if __name__ == '__main__':
    main()
