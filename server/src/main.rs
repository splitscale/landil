//! Landil v2 API: read-only MVP (health, browse, listing detail).
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
};
use chrono::{DateTime, NaiveDateTime};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{FromRow, PgPool};
use tower_http::{compression::CompressionLayer, cors::CorsLayer};

// ---------- errors (LND-API-05) ----------

enum AppError {
    NotFound,
    BadRequest(&'static str),
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
        .layer(CorsLayer::new().allow_origin(origins))
        .layer(CompressionLayer::new())
        .with_state(db)
}

#[tokio::main]
async fn main() {
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL is required");
    let db = PgPool::connect(&url).await.expect("database connection");
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
    fn price_ranges_match_v1() {
        assert_eq!(
            price_range("1m-3m"),
            Some((Some(1_000_000), Some(3_000_000)))
        );
        assert_eq!(price_range("over-10m"), Some((Some(10_000_001), None)));
        assert_eq!(price_range("cheap"), None);
    }
}
