//! Landil v2 API MVP: health, browse, listing detail, similar listings and view tracking.
//! Writes: listing views (same rules as v1 src/lib/track-view.ts), and accounts and sessions (auth.rs).
mod auth;

use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{
        HeaderValue, Method, StatusCode,
        header::{AUTHORIZATION, CONTENT_TYPE},
    },
    response::{IntoResponse, Response},
    routing::{get, post},
};
use chrono::{DateTime, NaiveDateTime};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use sqlx::{FromRow, PgPool, postgres::PgPoolOptions};
use tower_http::{compression::CompressionLayer, cors::CorsLayer};

// ---------- errors (LND-API-05) ----------

pub(crate) enum AppError {
    NotFound,
    BadRequest(&'static str),
    Unauthorized,
    Forbidden(&'static str),
    Conflict(&'static str),
    Db(sqlx::Error),
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        AppError::Db(e)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "not_found", "Not found"),
            AppError::BadRequest(m) => (StatusCode::BAD_REQUEST, "bad_request", m),
            // One message for unknown user, wrong password and expired session: no hints.
            AppError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "unauthorized",
                "Wrong username or password, or your session has ended",
            ),
            AppError::Forbidden(m) => (StatusCode::FORBIDDEN, "forbidden", m),
            AppError::Conflict(m) => (StatusCode::CONFLICT, "conflict", m),
            AppError::Db(e) => {
                eprintln!("db error: {e}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal",
                    "Internal error",
                )
            }
        };
        (
            status,
            Json(json!({ "error": { "code": code, "message": message } })),
        )
            .into_response()
    }
}

type AppResult<T> = Result<Json<T>, AppError>;

// ---------- browse (LND-LST-11, NFR-17) ----------

/// v1 price ranges (src/lib/listings-browse.ts), inclusive bounds as in v1.
fn price_range(v: &str) -> Option<(Option<i32>, Option<i32>)> {
    Some(match v {
        "under-1m" => (Some(0), Some(999_999)),
        "1m-3m" => (Some(1_000_000), Some(3_000_000)),
        "3m-5m" => (Some(3_000_000), Some(5_000_000)),
        "5m-10m" => (Some(5_000_000), Some(10_000_000)),
        "over-10m" => (Some(10_000_001), None),
        _ => return None,
    })
}

// ponytail: cursor is "<created_at micros>~<id>", not encrypted. Opaque enough for keyset paging.
fn encode_cursor(at: NaiveDateTime, id: &str) -> String {
    format!("{}~{}", at.and_utc().timestamp_micros(), id)
}

fn decode_cursor(c: &str) -> Option<(NaiveDateTime, String)> {
    let (micros, id) = c.split_once('~')?;
    let at = DateTime::from_timestamp_micros(micros.parse().ok()?)?.naive_utc();
    Some((at, id.to_string()))
}

#[derive(Deserialize)]
struct BrowseQuery {
    q: Option<String>,
    #[serde(rename = "type")]
    property_type: Option<String>,
    price: Option<String>,
    cursor: Option<String>,
    limit: Option<i64>,
}

#[derive(Serialize, FromRow)]
struct ListingCard {
    id: String,
    title: String,
    asking_price: i32,
    city: String,
    province: String,
    property_type: String,
    cover_url: Option<String>,
    #[serde(skip)]
    created_at: NaiveDateTime,
}

#[derive(Serialize)]
struct Page<T> {
    items: Vec<T>,
    next_cursor: Option<String>,
}

async fn browse(
    State(db): State<PgPool>,
    Query(p): Query<BrowseQuery>,
) -> AppResult<Page<ListingCard>> {
    let limit = p.limit.unwrap_or(20).clamp(1, 50);
    let (min, max) = match p.price.as_deref().filter(|v| *v != "all") {
        None => (None, None),
        Some(v) => price_range(v).ok_or(AppError::BadRequest("Unknown price range"))?,
    };
    let (after_at, after_id) = match p.cursor.as_deref() {
        None => (None, None),
        Some(c) => {
            let (at, id) = decode_cursor(c).ok_or(AppError::BadRequest("Bad cursor"))?;
            (Some(at), Some(id))
        }
    };
    let q = p.q.map(|s| s.trim().to_string()).filter(|s| !s.is_empty());

    let mut items: Vec<ListingCard> = sqlx::query_as(
        r#"SELECT l.id, l.title, l.asking_price, l.city, l.province, l.property_type, l.created_at,
                  (SELECT url FROM listings.listing_photo ph WHERE ph.listing_id = l.id
                   ORDER BY ph.cover DESC, ph.created_at LIMIT 1) AS cover_url
           FROM listings.listing l
           WHERE l.status = 'published'
             AND ($1::text IS NULL OR l.title ILIKE '%' || $1 || '%' OR l.city ILIKE '%' || $1 || '%'
                  OR l.province ILIKE '%' || $1 || '%' OR l.property_type ILIKE '%' || $1 || '%')
             AND ($2::text IS NULL OR l.property_type = $2)
             AND ($3::int IS NULL OR l.asking_price >= $3)
             AND ($4::int IS NULL OR l.asking_price <= $4)
             AND ($5::timestamp IS NULL OR (l.created_at, l.id) < ($5, $6))
           ORDER BY l.created_at DESC, l.id DESC
           LIMIT $7"#,
    )
    .bind(q)
    .bind(p.property_type)
    .bind(min)
    .bind(max)
    .bind(after_at)
    .bind(after_id)
    .bind(limit + 1)
    .fetch_all(&db)
    .await?;

    let next_cursor = if items.len() as i64 > limit {
        items.truncate(limit as usize);
        items.last().map(|l| encode_cursor(l.created_at, &l.id))
    } else {
        None
    };
    Ok(Json(Page { items, next_cursor }))
}

// ---------- detail (LND-LST-07, LND-LST-09, section 4.3 guest view) ----------

#[derive(Serialize, FromRow)]
struct ListingDetail {
    id: String,
    title: String,
    asking_price: i32,
    property_type: String,
    lot_area: String,
    floor_area: Option<String>,
    city: String,
    province: String,
    description: String,
    title_type: String,
    encumbrances: Vec<String>,
    utilities: Vec<String>,
    seller_name: String,
    seller_username: Option<String>,
}

#[derive(Serialize, FromRow)]
struct Doc {
    name: String,
    url: String,
}

async fn detail(
    State(db): State<PgPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    // ponytail: guest view only (no auth yet), so drafts are 404 for everyone.
    let listing: ListingDetail = sqlx::query_as(
        r#"SELECT l.id, l.title, l.asking_price, l.property_type, l.lot_area, l.floor_area, l.city,
                  l.province, l.description, l.title_type, l.encumbrances, l.utilities,
                  u.name AS seller_name, u.username AS seller_username
           FROM listings.listing l JOIN "user" u ON u.id = l.user_id
           WHERE l.id = $1 AND l.status = 'published'"#,
    )
    .bind(&id)
    .fetch_optional(&db)
    .await?
    .ok_or(AppError::NotFound)?;

    let photos: Vec<String> = sqlx::query_scalar(
        "SELECT url FROM listings.listing_photo WHERE listing_id = $1 ORDER BY cover DESC, created_at",
    )
    .bind(&id)
    .fetch_all(&db)
    .await?;
    let documents: Vec<Doc> = sqlx::query_as(
        "SELECT name, url FROM listings.listing_doc WHERE listing_id = $1 AND visibility = 'public' ORDER BY created_at",
    )
    .bind(&id)
    .fetch_all(&db)
    .await?;
    let private_documents: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM listings.listing_doc WHERE listing_id = $1 AND visibility = 'private'",
    )
    .bind(&id)
    .fetch_one(&db)
    .await?;

    let mut body = serde_json::to_value(listing).expect("serializable");
    body["photos"] = json!(photos);
    body["documents"] = json!(documents);
    body["private_document_count"] = json!(private_documents);
    Ok(Json(body))
}

// ---------- similar listings (LND-LST-13; v1 "comps": same province, published, not itself) ----------

async fn similar(State(db): State<PgPool>, Path(id): Path<String>) -> AppResult<Page<ListingCard>> {
    // Same type first, then the closest price. v1 took any 4 from the province.
    let items: Vec<ListingCard> = sqlx::query_as(
        r#"WITH me AS (SELECT province, property_type, asking_price FROM listings.listing
                       WHERE id = $1 AND status = 'published')
           SELECT l.id, l.title, l.asking_price, l.city, l.province, l.property_type, l.created_at,
                  (SELECT url FROM listings.listing_photo ph WHERE ph.listing_id = l.id
                   ORDER BY ph.cover DESC, ph.created_at LIMIT 1) AS cover_url
           FROM listings.listing l, me
           WHERE l.status = 'published' AND l.province = me.province AND l.id <> $1
           ORDER BY (l.property_type = me.property_type) DESC,
                    abs(l.asking_price::bigint - me.asking_price), l.id
           LIMIT 4"#,
    )
    .bind(&id)
    .fetch_all(&db)
    .await?;
    if items.is_empty() {
        // Tell "no such listing" apart from "nothing similar".
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM listings.listing WHERE id = $1 AND status = 'published')",
        )
        .bind(&id)
        .fetch_one(&db)
        .await?;
        if !exists {
            return Err(AppError::NotFound);
        }
    }
    Ok(Json(Page {
        items,
        next_cursor: None,
    }))
}

// ---------- view tracking (ENT-307, LND-MOB-07: guests send a device ID) ----------

#[derive(Deserialize)]
struct ViewBody {
    device_id: String,
}

/// The app makes a random ID once per install. Accept only that shape, so the column gets no junk.
fn valid_device_id(id: &str) -> bool {
    (16..=64).contains(&id.len()) && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
}

/// Stored instead of the raw ID. 16 hex characters, like v1's hashed IP keys; the prefix keeps
/// device keys apart from v1 user IDs and IP keys.
fn device_viewer_key(device_id: &str) -> String {
    let hash = Sha256::digest(device_id.as_bytes());
    let hex: String = hash.iter().take(8).map(|b| format!("{b:02x}")).collect();
    format!("device:{hex}")
}

/// 204 whether or not a row was added: a repeat view inside 30 minutes is not an error.
async fn record_view(
    State(db): State<PgPool>,
    Path(id): Path<String>,
    Json(body): Json<ViewBody>,
) -> Result<StatusCode, AppError> {
    if !valid_device_id(&body.device_id) {
        return Err(AppError::BadRequest("Bad device_id"));
    }
    // One statement, so two requests at the same time cannot both pass the 30-minute check.
    // ponytail: no seller self-view guard yet; it needs auth (ENT-317).
    sqlx::query(
        r#"INSERT INTO listings.listing_view (id, listing_id, viewer_key)
           SELECT gen_random_uuid()::text, l.id, $2 FROM listings.listing l
           WHERE l.id = $1 AND l.status = 'published'
             AND NOT EXISTS (SELECT 1 FROM listings.listing_view v
                             WHERE v.listing_id = l.id AND v.viewer_key = $2
                               AND v.created_at > now() - interval '30 minutes')"#,
    )
    .bind(&id)
    .bind(device_viewer_key(&body.device_id))
    .execute(&db)
    .await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn health(State(db): State<PgPool>) -> StatusCode {
    match sqlx::query("SELECT 1").execute(&db).await {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::SERVICE_UNAVAILABLE,
    }
}

fn app(db: PgPool) -> Router {
    let origins: Vec<HeaderValue> = std::env::var("CORS_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:8081".into())
        .split(',')
        .filter_map(|o| o.trim().parse().ok())
        .collect();
    Router::new()
        .route("/health", get(health))
        .route("/v1/listings", get(browse))
        .route("/v1/listings/{id}", get(detail))
        .route("/v1/listings/{id}/similar", get(similar))
        .route("/v1/listings/{id}/views", post(record_view))
        .route("/v1/auth/sign-up", post(auth::sign_up))
        .route("/v1/auth/sign-in", post(auth::sign_in))
        .route("/v1/auth/sign-out", post(auth::sign_out))
        .route("/v1/me", get(auth::me))
        .layer(
            CorsLayer::new()
                .allow_origin(origins)
                .allow_methods([Method::GET, Method::POST])
                .allow_headers([CONTENT_TYPE, AUTHORIZATION]),
        )
        .layer(CompressionLayer::new())
        .with_state(db)
}

#[tokio::main]
async fn main() {
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL is required");
    // Fail fast when the database is down, instead of the default 30 s wait for a connection.
    let db = PgPoolOptions::new()
        .acquire_timeout(std::time::Duration::from_secs(5))
        .connect(&url)
        .await
        .expect("database connection");
    let addr = std::env::var("BIND").unwrap_or_else(|_| "0.0.0.0:8080".into());
    let listener = tokio::net::TcpListener::bind(&addr).await.expect("bind");
    println!("landil-api on {addr}");
    axum::serve(listener, app(db)).await.expect("server");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cursor_round_trip() {
        let at = DateTime::from_timestamp_micros(1_764_000_000_123_456)
            .unwrap()
            .naive_utc();
        assert_eq!(
            decode_cursor(&encode_cursor(at, "l7")),
            Some((at, "l7".into()))
        );
        assert_eq!(decode_cursor("junk"), None);
    }

    #[test]
    fn device_ids() {
        assert!(valid_device_id("3f2a9c1e-7b4d-4e8a-9f10-2c3d4e5f6a7b"));
        assert!(!valid_device_id("short"));
        assert!(!valid_device_id("has spaces and is long enough"));
        assert!(!valid_device_id(&"a".repeat(65)));
        let key = device_viewer_key("3f2a9c1e-7b4d-4e8a-9f10-2c3d4e5f6a7b");
        assert!(key.starts_with("device:") && key.len() == "device:".len() + 16);
        assert_eq!(
            key,
            device_viewer_key("3f2a9c1e-7b4d-4e8a-9f10-2c3d4e5f6a7b")
        );
    }

    #[test]
    fn price_ranges_match_v1() {
        assert_eq!(
            price_range("1m-3m"),
            Some((Some(1_000_000), Some(3_000_000)))
        );
        assert_eq!(price_range("over-10m"), Some((Some(10_000_001), None)));
        assert_eq!(price_range("cheap"), None);
    }
}
