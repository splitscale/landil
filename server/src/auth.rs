//! Username + password auth on the v1 Better Auth tables (ENT-317), so v1 accounts keep working.
//!
//! - Passwords: Better Auth 1.3 scrypt format `<salt hex>:<key hex>`, N=16384 r=16 p=1, 64-byte key,
//!   password NFKC-normalized, and the *hex string* of the salt is the scrypt salt.
//!   (v1: node_modules/better-auth/dist/crypto/index.mjs)
//! - Sessions: a row in `session` with a 32-character token, 7 days, renewed when a day old
//!   (Better Auth defaults). The apps send it as `Authorization: Bearer <token>`.
//!
//! ponytail: not yet here, all in ENT-317: website cookie, Google and Apple sign-in, rate limits,
//! password change and reset.
use axum::{
    Json,
    extract::{FromRequestParts, State},
    http::{HeaderMap, StatusCode, header, request::Parts},
};
use rand::RngExt;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use subtle::ConstantTimeEq;
use unicode_normalization::UnicodeNormalization;

use crate::AppError;

// ---------- passwords ----------

const SCRYPT_LOG_N: u8 = 14; // N = 16384
const SCRYPT_R: u32 = 16;
const SCRYPT_P: u32 = 1;
const KEY_LEN: usize = 64;

fn derive(password: &str, salt_hex: &str) -> [u8; KEY_LEN] {
    let params =
        scrypt::Params::new(SCRYPT_LOG_N, SCRYPT_R, SCRYPT_P).expect("valid scrypt params");
    let normalized: String = password.nfkc().collect();
    let mut key = [0u8; KEY_LEN];
    scrypt::scrypt(
        normalized.as_bytes(),
        salt_hex.as_bytes(),
        &params,
        &mut key,
    )
    .expect("64-byte output is valid");
    key
}

/// A new hash in the Better Auth format, so v1 can still check it.
pub fn hash_password(password: &str) -> String {
    let mut salt = [0u8; 16];
    rand::fill(&mut salt);
    let salt_hex = hex::encode(salt);
    format!("{salt_hex}:{}", hex::encode(derive(password, &salt_hex)))
}

pub fn verify_password(hash: &str, password: &str) -> bool {
    let Some((salt_hex, key_hex)) = hash.split_once(':') else {
        return false;
    };
    let Ok(expected) = hex::decode(key_hex) else {
        return false;
    };
    derive(password, salt_hex).ct_eq(&expected).into()
}

/// scrypt takes about 50 ms of CPU: keep it off the async workers.
async fn blocking<T: Send + 'static>(f: impl FnOnce() -> T + Send + 'static) -> T {
    tokio::task::spawn_blocking(f).await.expect("password task")
}

// ---------- ids and input rules ----------

/// Better Auth `generateId(32)`: letters and digits.
fn generate_id() -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::rng();
    (0..32)
        .map(|_| CHARS[rng.random_range(0..CHARS.len())] as char)
        .collect()
}

/// v1 src/lib/auth/usernames.ts
const RESTRICTED: &[&str] = &[
    "admin",
    "administrator",
    "root",
    "superadmin",
    "system",
    "null",
    "undefined",
    "support",
    "help",
    "contact",
    "info",
    "official",
    "owner",
    "moderator",
    "mod",
    "staff",
    "team",
    "server",
    "api",
    "email",
    "security",
    "test",
    "user",
    "users",
    "username",
    "guest",
    "webmaster",
    "manager",
    "operator",
    "dev",
    "developer",
    "emasaji",
    "me",
    "you",
    "bot",
    "god",
    "jesus",
    "allah",
    "cakfan",
];

/// v1 rules (lowercase, 4 to 10, not restricted). New sign-ups also allow only a-z, 0-9, `_` and `.`,
/// as Better Auth's default validator does.
fn normalize_username(raw: &str) -> Result<String, &'static str> {
    let u = raw.trim().to_lowercase();
    if !(4..=10).contains(&u.chars().count()) {
        return Err("Username must be 4 to 10 characters");
    }
    if !u
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_' || c == '.')
    {
        return Err("Username can use only letters, digits, _ and .");
    }
    if RESTRICTED.contains(&u.as_str()) {
        return Err("This username is not available");
    }
    Ok(u)
}

/// Better Auth defaults.
fn check_password(p: &str) -> Result<(), &'static str> {
    match p.chars().count() {
        0..8 => Err("Password must be at least 8 characters"),
        8..=128 => Ok(()),
        _ => Err("Password must be at most 128 characters"),
    }
}

// ---------- the signed-in user ----------

const SESSION_ENDED: &str = "Your session has ended. Sign in again.";

#[derive(Serialize, FromRow, Clone)]
pub struct User {
    pub id: String,
    pub name: String,
    pub username: Option<String>,
    pub email: String,
    pub image: Option<String>,
    pub role: String,
    pub plan: String,
    pub verified: bool,
}

// Macros, not consts: sqlx takes only &'static str SQL, and concat! needs literals.
macro_rules! user_columns {
    () => {
        "u.id, u.name, u.username, u.email, u.image, u.role, u.plan, u.verified"
    };
}
/// Banned, and the ban has not run out (v1 admin plugin).
macro_rules! is_banned {
    () => {
        r#"(u.banned IS TRUE AND (u."banExpires" IS NULL OR u."banExpires" > (now() AT TIME ZONE 'utc')))"#
    };
}

fn bearer(headers: &HeaderMap) -> Option<&str> {
    headers
        .get(header::AUTHORIZATION)?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")
}

/// Handlers that take this need a valid session: 401 without one, 403 when the user is banned.
pub(crate) struct CurrentUser {
    pub user: User,
    pub token: String,
}

impl FromRequestParts<PgPool> for CurrentUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, db: &PgPool) -> Result<Self, AppError> {
        let token = bearer(&parts.headers)
            .ok_or(AppError::Unauthorized(SESSION_ENDED))?
            .to_string();
        #[derive(FromRow)]
        struct Row {
            #[sqlx(flatten)]
            user: User,
            banned: bool,
            renew: bool,
        }
        let row: Row = sqlx::query_as(concat!(
            "SELECT ",
            user_columns!(),
            ", ",
            is_banned!(),
            r#" AS banned, s."expiresAt" < (now() AT TIME ZONE 'utc') + interval '6 days' AS renew
               FROM session s JOIN "user" u ON u.id = s."userId"
               WHERE s.token = $1 AND s."expiresAt" > (now() AT TIME ZONE 'utc')"#
        ))
        .bind(&token)
        .fetch_optional(db)
        .await?
        .ok_or(AppError::Unauthorized(SESSION_ENDED))?;
        if row.banned {
            return Err(AppError::Forbidden("This account is banned"));
        }
        if row.renew {
            // Better Auth updateAge: a session in use for a day gets 7 days again.
            sqlx::query(
                r#"UPDATE session SET "expiresAt" = (now() AT TIME ZONE 'utc') + interval '7 days',
                                      "updatedAt" = now() WHERE token = $1"#,
            )
            .bind(&token)
            .execute(db)
            .await?;
        }
        Ok(CurrentUser {
            user: row.user,
            token,
        })
    }
}

// ---------- routes ----------

#[derive(Serialize)]
pub struct SessionResponse {
    token: String,
    user: User,
}

/// The fields a person may set. role, plan and verified are not here, so a body that sends them
/// cannot set them (serde ignores unknown fields).
#[derive(Deserialize)]
pub struct SignUp {
    username: String,
    password: String,
    name: String,
    email: String,
    gender: bool,
}

#[derive(Deserialize)]
pub struct SignIn {
    username: String,
    password: String,
}

async fn create_session<'e>(
    tx: impl sqlx::PgExecutor<'e>,
    user_id: &str,
    headers: &HeaderMap,
) -> Result<String, AppError> {
    let token = generate_id();
    let ip = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.split(',').next())
        .map(|v| v.trim().to_string())
        .unwrap_or_default();
    let agent = headers
        .get(header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    sqlx::query(
        r#"INSERT INTO session (id, token, "userId", "expiresAt", "ipAddress", "userAgent")
           VALUES ($1, $2, $3, (now() AT TIME ZONE 'utc') + interval '7 days', $4, $5)"#,
    )
    .bind(generate_id())
    .bind(&token)
    .bind(user_id)
    .bind(ip)
    .bind(agent)
    .execute(tx)
    .await?;
    Ok(token)
}

pub async fn sign_up(
    State(db): State<PgPool>,
    headers: HeaderMap,
    Json(b): Json<SignUp>,
) -> Result<(StatusCode, Json<SessionResponse>), AppError> {
    let username = normalize_username(&b.username).map_err(AppError::BadRequest)?;
    check_password(&b.password).map_err(AppError::BadRequest)?;
    let name = b.name.trim().to_string();
    if name.is_empty() || name.chars().count() > 100 {
        return Err(AppError::BadRequest("Name must be 1 to 100 characters"));
    }
    let email = b.email.trim().to_lowercase();
    if email.len() > 254 || !email.contains('@') {
        return Err(AppError::BadRequest("Enter a valid email address"));
    }
    let password = b.password;
    let hash = blocking(move || hash_password(&password)).await;

    let user_id = generate_id();
    let mut tx = db.begin().await?;
    sqlx::query(
        r#"INSERT INTO "user" (id, name, username, display_username, email, "emailVerified", gender)
           VALUES ($1, $2, $3, $4, $5, false, $6)"#,
    )
    .bind(&user_id)
    .bind(&name)
    .bind(&username)
    .bind(b.username.trim())
    .bind(&email)
    .bind(b.gender)
    .execute(&mut *tx)
    .await
    .map_err(
        |e| match e.as_database_error().and_then(|d| d.constraint()) {
            Some("user_username_unique") => AppError::Conflict("This username is taken"),
            Some("user_email_unique") => AppError::Conflict("This email already has an account"),
            _ => e.into(),
        },
    )?;
    sqlx::query(
        r#"INSERT INTO account (id, "accountId", "providerId", "userId", password)
           VALUES ($1, $2, 'credential', $2, $3)"#,
    )
    .bind(generate_id())
    .bind(&user_id)
    .bind(&hash)
    .execute(&mut *tx)
    .await?;
    let token = create_session(&mut *tx, &user_id, &headers).await?;
    let user: User = sqlx::query_as(concat!(
        "SELECT ",
        user_columns!(),
        r#" FROM "user" u WHERE u.id = $1"#
    ))
    .bind(&user_id)
    .fetch_one(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(SessionResponse { token, user })))
}

pub async fn sign_in(
    State(db): State<PgPool>,
    headers: HeaderMap,
    Json(b): Json<SignIn>,
) -> Result<Json<SessionResponse>, AppError> {
    #[derive(FromRow)]
    struct Row {
        #[sqlx(flatten)]
        user: User,
        banned: bool,
        password: Option<String>,
    }
    let row: Option<Row> = sqlx::query_as(concat!(
        "SELECT ",
        user_columns!(),
        ", ",
        is_banned!(),
        r#" AS banned, a.password
           FROM "user" u LEFT JOIN account a ON a."userId" = u.id AND a."providerId" = 'credential'
           WHERE u.username = $1"#
    ))
    .bind(b.username.trim().to_lowercase())
    .fetch_optional(&db)
    .await?;

    // Unknown user or no password (Google-only account): still pay for one hash, so the response
    // time does not tell which usernames exist.
    const DUMMY: &str = "00000000000000000000000000000000:00";
    let hash = row
        .as_ref()
        .and_then(|r| r.password.clone())
        .unwrap_or_else(|| DUMMY.into());
    let password = b.password;
    let ok = blocking(move || verify_password(&hash, &password)).await;
    let row = match row {
        Some(r) if ok && r.password.is_some() => r,
        _ => return Err(AppError::Unauthorized("Wrong username or password.")),
    };
    if row.banned {
        return Err(AppError::Forbidden("This account is banned"));
    }
    let token = create_session(&db, &row.user.id, &headers).await?;
    Ok(Json(SessionResponse {
        token,
        user: row.user,
    }))
}

pub async fn sign_out(State(db): State<PgPool>, me: CurrentUser) -> Result<StatusCode, AppError> {
    sqlx::query("DELETE FROM session WHERE token = $1")
        .bind(&me.token)
        .execute(&db)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn me(me: CurrentUser) -> Json<User> {
    Json(me.user)
}

#[cfg(test)]
mod tests {
    use super::*;

    // Made by v1's own better-auth 1.3.32 `hashPassword` (node_modules/better-auth/dist/crypto).
    const V1_HASH: &str = "8326763815ce8bb4f0fba398ea0da295:f7438f2a37cf9fd4f96a2acc8dfc21785c93613b49d0eda3acbe51a6192d6f260d3fc49b1d2b225fbf9e71332d03e288abe51a1fd52f61b2fd902000a2f2f961";
    // hashPassword("ｐａｓｓｗｏｒｄ１２３"): full-width, NFKC makes it "password123".
    const V1_NFKC_HASH: &str = "c87bd3bad437dec306f7c5be77274ef0:5bcb640400f93a49c7f49bb2a47419a9fb2c652d2b03ea2b9300802011aac22a7d5356a5e8bba8eb264dd34c2b4d21f9582c64da3d0ede1ce951a15b1969e678";

    #[test]
    fn v1_hashes_verify() {
        assert!(verify_password(V1_HASH, "seller1-password"));
        assert!(!verify_password(V1_HASH, "seller1-Password"));
        assert!(verify_password(V1_NFKC_HASH, "password123"));
        assert!(!verify_password("junk", "x"));
    }

    #[test]
    fn new_hashes_round_trip() {
        let h = hash_password("a new password");
        assert!(
            h.split_once(':')
                .is_some_and(|(s, k)| s.len() == 32 && k.len() == 128)
        );
        assert!(verify_password(&h, "a new password"));
        assert!(!verify_password(&h, "another"));
    }

    #[test]
    fn username_rules() {
        assert_eq!(normalize_username(" Juan.Dela "), Ok("juan.dela".into()));
        assert!(normalize_username("abc").is_err());
        assert!(normalize_username("elevenchars").is_err());
        assert!(normalize_username("admin").is_err());
        assert!(normalize_username("ADMIN").is_err());
        assert!(normalize_username("has space").is_err());
    }

    #[test]
    fn ids_are_32_letters_and_digits() {
        let id = generate_id();
        assert_eq!(id.len(), 32);
        assert!(id.chars().all(|c| c.is_ascii_alphanumeric()));
        assert_ne!(id, generate_id());
    }
}
