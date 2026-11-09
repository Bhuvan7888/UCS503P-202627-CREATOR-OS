from domain.logic.tokens import generate_token, verify_token


def test_token_round_trip():
    raw_token, token_hash = generate_token()
    
    assert len(raw_token) > 0
    assert len(token_hash) == 64  # SHA-256 hash length
    
    assert verify_token(raw_token, token_hash) is True


def test_token_tamper_detection():
    raw_token, token_hash = generate_token()
    
    # Tampered raw token
    tampered_raw = raw_token[:-1] + ('a' if raw_token[-1] != 'a' else 'b')
    assert verify_token(tampered_raw, token_hash) is False
    
    # Tampered hash
    tampered_hash = token_hash[:-1] + ('a' if token_hash[-1] != 'a' else 'b')
    assert verify_token(raw_token, tampered_hash) is False
