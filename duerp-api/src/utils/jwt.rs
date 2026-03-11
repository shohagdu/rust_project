use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::env;

pub const ACCESS_TOKEN_EXPIRY: u64 = 1800; // 30 minutes
pub const REFRESH_TOKEN_EXPIRY: u64 = 604800; // 7 days

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: u64,
    pub exp: usize,
}

pub fn create_jwt(user_id: u64) -> String {
    let secret = env::var("JWT_SECRET").unwrap();
    let exp = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::hours(12))
        .unwrap()
        .timestamp() as usize;

    let claims = Claims { sub: user_id, exp };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_ref())).unwrap()
}

pub fn verify_jwt(token: &str) -> Option<Claims> {
    let secret = env::var("JWT_SECRET").unwrap();
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default()
    ).ok().map(|d| d.claims)
}

// Extract session_id (or user_id) from JWT token
pub fn get_session_id(token: &str) -> Result<u64, jsonwebtoken::errors::Error> {
    let secret = env::var("JWT_SECRET").unwrap();
    let decoding_key = DecodingKey::from_secret(secret.as_ref());
    let validation = Validation::new(Algorithm::HS256);

    let token_data = decode::<Claims>(token, &decoding_key, &validation)?;
    Ok(token_data.claims.sub) // sub is string
}