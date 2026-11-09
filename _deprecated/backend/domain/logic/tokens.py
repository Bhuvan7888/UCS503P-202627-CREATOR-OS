import hashlib
import hmac
import secrets


def generate_token() -> tuple[str, str]:
    """
    Generates a secure random token and its SHA-256 hash.
    Returns:
        tuple[str, str]: (raw_token, token_hash)
    """
    raw_token = secrets.token_urlsafe(32)
    
    # We can just use standard SHA-256 for hashing to store it
    # We use a constant time comparison to verify
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    
    return raw_token, token_hash

def verify_token(raw_token: str, token_hash: str) -> bool:
    """
    Verifies if a raw_token matches a given token_hash using constant-time comparison.
    """
    expected_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    return hmac.compare_digest(expected_hash, token_hash)
