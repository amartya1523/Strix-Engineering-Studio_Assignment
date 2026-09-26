"""Generate local Docker secrets once without overwriting existing configuration."""

import base64
import secrets
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / ".env"
if path.exists():
    print("Existing .env preserved.")
else:
    content = (
        "POSTGRES_PASSWORD="
        + secrets.token_hex(24)
        + "\nENCRYPTION_KEY="
        + base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
        + "\n"
    )
    with path.open("x") as stream:
        stream.write(content)
    path.chmod(0o600)
    print("Created .env with random local secrets. This file is ignored by Git.")
