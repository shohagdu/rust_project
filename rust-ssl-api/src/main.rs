use axum::{
    extract::{Path, Request, State},
    http::StatusCode,
    middleware::{self, Next},
    response::Response,
    routing::{get, post},
    Json, Router,
};
use chrono::{Duration, Utc};
use dotenv::dotenv;
use hex;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sha1::{Digest, Sha1};
use sqlx::mysql::MySqlPool;
use std::env;

// ── SHA1 Helper ────────────────────────────────────────────────────────────────

fn sha1_hash(password: &str) -> String {
    let mut hasher = Sha1::new();
    hasher.update(password.as_bytes());
    hex::encode(hasher.finalize())
}

// ── Models ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
struct User {
    id: u32,
    username: Option<String>,
    email: Option<String>,
}

#[derive(Debug, sqlx::FromRow)]
struct UserWithPassword {
    id: u32,
    username: Option<String>,
    email: Option<String>,
    password: Option<String>,
}

// ── Request Payloads ───────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct RegisterPayload {
    username: String,
    email: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct LoginPayload {
    email: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct UserPayload {
    username: String,
    email: String,
}

// ── Response Types ─────────────────────────────────────────────────────────────

#[derive(Serialize)]
struct MessageResponse {
    message: String,
}

#[derive(Serialize)]
struct LoginResponse {
    token: String,
    message: String,
}

// ── JWT Claims ─────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Claims {
    sub: String,   // user id
    email: String,
    exp: usize,    // expiry timestamp
    iat: usize,    // issued at
}

// ── App State ──────────────────────────────────────────────────────────────────

#[derive(Clone)]
struct AppState {
    pool: MySqlPool,
    jwt_secret: String,
}

// ── JWT Helpers ────────────────────────────────────────────────────────────────

fn generate_token(user_id: u32, email: &str, secret: &str) -> Result<String, String> {
    let expiry_hours: i64 = env::var("JWT_EXPIRY_HOURS")
        .unwrap_or_else(|_| "24".to_string())
        .parse()
        .unwrap_or(24);

    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        iat: Utc::now().timestamp() as usize,
        exp: (Utc::now() + Duration::hours(expiry_hours)).timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| e.to_string())
}

fn verify_token(token: &str, secret: &str) -> Result<Claims, String> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|e| e.to_string())
}

// ── Auth Middleware ────────────────────────────────────────────────────────────

async fn auth_middleware(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<MessageResponse>)> {

    // Extract Bearer token from Authorization header
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    let token = match auth_header {
        Some(t) => t.to_string(),
        None => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(MessageResponse {
                    message: "Missing Authorization header".to_string(),
                }),
            ))
        }
    };

    // Verify token
    let claims = verify_token(&token, &state.jwt_secret).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            Json(MessageResponse {
                message: "Invalid or expired token".to_string(),
            }),
        )
    })?;

    // Attach claims to request extensions for use in handlers
    req.extensions_mut().insert(claims);
    Ok(next.run(req).await)
}

// ── AUTH ROUTES ────────────────────────────────────────────────────────────────

// POST /auth/register
async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterPayload>,
) -> Result<(StatusCode, Json<MessageResponse>), (StatusCode, Json<MessageResponse>)> {

    // Hash password with SHA1
    let hashed = sha1_hash(&payload.password);

    sqlx::query!(
        "INSERT INTO users_du (username, email, password) VALUES (?, ?, ?)",
        payload.username,
        payload.email,
        hashed
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(MessageResponse {
                message: format!("Registration failed: {}", e),
            }),
        )
    })?;

    Ok((
        StatusCode::CREATED,
        Json(MessageResponse {
            message: "User registered successfully".to_string(),
        }),
    ))
}

// POST /auth/login
async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginPayload>,
) -> Result<Json<LoginResponse>, (StatusCode, Json<MessageResponse>)> {

    // Find user by email
    let user = sqlx::query_as!(
        UserWithPassword,
        "SELECT id, username, email, password FROM users_du WHERE email = ?",
        payload.email
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(MessageResponse { message: e.to_string() }),
        )
    })?
    .ok_or((
        StatusCode::UNAUTHORIZED,
        Json(MessageResponse {
            message: "Invalid email or password".to_string(),
        }),
    ))?;

    // Unwrap password hash from Option
    let password_hash = user.password.ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(MessageResponse {
            message: "Password data missing".to_string(),
        }),
    ))?;

    // Compare SHA1 hashes
    let input_hash = sha1_hash(&payload.password);
    if input_hash != password_hash {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(MessageResponse {
                message: "Invalid email or password".to_string(),
            }),
        ));
    }

    // Unwrap email from Option
    let email = user.email.ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(MessageResponse {
            message: "Email data missing".to_string(),
        }),
    ))?;

    // Generate JWT token
    let token = generate_token(user.id, &email, &state.jwt_secret).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(MessageResponse { message: e }),
        )
    })?;

    Ok(Json(LoginResponse {
        token,
        message: format!("Welcome back, {}!", user.username.unwrap_or_default()),
    }))
}

// ── PROTECTED ROUTES ───────────────────────────────────────────────────────────

// GET /users
async fn get_all_users(
    State(state): State<AppState>,
) -> Result<Json<Vec<User>>, (StatusCode, Json<MessageResponse>)> {
    let users = sqlx::query_as!(User, "SELECT id, username, email FROM users_du")
        .fetch_all(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(MessageResponse { message: e.to_string() }),
            )
        })?;

    Ok(Json(users))
}

// GET /users/:id
async fn get_user_by_id(
    State(state): State<AppState>,
    Path(id): Path<u32>,
) -> Result<Json<User>, (StatusCode, Json<MessageResponse>)> {
    let user = sqlx::query_as!(
        User,
        "SELECT id, username, email FROM users_du WHERE id = ?",
        id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(MessageResponse { message: e.to_string() }),
        )
    })?
    .ok_or((
        StatusCode::NOT_FOUND,
        Json(MessageResponse {
            message: format!("User {} not found", id),
        }),
    ))?;

    Ok(Json(user))
}




// ── Main ───────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret   = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let port         = env::var("PORT").unwrap_or_else(|_| "8080".to_string());

    let pool = MySqlPool::connect(&database_url)
        .await
        .expect("❌ Failed to connect to MySQL");

    println!("✅ Connected to MySQL!");

    let state = AppState { pool, jwt_secret };

    // 🔓 Public routes (no token needed)
    let public_routes = Router::new()
        .route("/auth/register", post(register))
        .route("/auth/login",    post(login));

    // 🔒 Protected routes (JWT token required)
    let protected_routes = Router::new()
        .route("/users",     get(get_all_users))
        .route("/users/:id", get(get_user_by_id).put(update_user).delete(delete_user))
        .route_layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .with_state(state);

    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|_| {
            eprintln!("❌ Port {} already in use. Run: sudo fuser -k {}/tcp", port, port);
            std::process::exit(1);
        });

    println!("🚀 Server running at http://localhost:{}", port);
    axum::serve(listener, app).await.unwrap();
}