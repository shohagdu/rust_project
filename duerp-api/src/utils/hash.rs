use bcrypt::{hash, verify, DEFAULT_COST};

/// Hash a plain-text password using bcrypt
pub fn hash_password(password: &str) -> Result<String, bcrypt::BcryptError> {
    hash(password, DEFAULT_COST)
}

/// Verify a plain password against its bcrypt hash
pub fn verify_password(password: &str, hash: &str) -> bool {
    verify(password, hash).unwrap_or(false)
}
