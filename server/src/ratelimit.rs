//! Fixed-window counters in memory, for sign-in and sign-up (ENT-317).
//!
//! ponytail: one process only. With more than one API instance, move the counts to Redis (ENT-297).
use std::{
    collections::HashMap,
    net::{IpAddr, SocketAddr},
    sync::{LazyLock, Mutex},
    time::{Duration, Instant},
};

use axum::http::HeaderMap;

pub struct Limiter {
    max: u32,
    window: Duration,
    hits: Mutex<HashMap<String, (Instant, u32)>>,
}

impl Limiter {
    pub fn new(max: u32, window: Duration) -> Self {
        Self {
            max,
            window,
            hits: Mutex::new(HashMap::new()),
        }
    }

    /// Err(seconds to wait) when `key` is already at the limit. Does not count.
    pub fn check(&self, key: &str) -> Result<(), u64> {
        self.check_at(key, Instant::now())
    }

    /// Counts one hit for `key`.
    pub fn hit(&self, key: &str) {
        self.hit_at(key, Instant::now());
    }

    /// Forget `key`, e.g. after a successful sign-in.
    pub fn clear(&self, key: &str) {
        self.hits.lock().expect("limiter lock").remove(key);
    }

    fn check_at(&self, key: &str, now: Instant) -> Result<(), u64> {
        match self.hits.lock().expect("limiter lock").get(key) {
            Some(&(start, n)) if n >= self.max && now < start + self.window => {
                Err((start + self.window - now).as_secs().max(1))
            }
            _ => Ok(()),
        }
    }

    fn hit_at(&self, key: &str, now: Instant) {
        let mut hits = self.hits.lock().expect("limiter lock");
        if hits.len() > 50_000 {
            // Keep memory bounded: drop finished windows.
            hits.retain(|_, (start, _)| now < *start + self.window);
        }
        let entry = hits.entry(key.to_string()).or_insert((now, 0));
        if now >= entry.0 + self.window {
            *entry = (now, 0);
        }
        entry.1 += 1;
    }
}

const MIN: Duration = Duration::from_secs(60);

/// Wrong passwords for one username: slows guessing one account from many addresses.
pub static SIGN_IN_FAILURES: LazyLock<Limiter> = LazyLock::new(|| Limiter::new(5, 15 * MIN));
/// All sign-in tries from one address: slows one address trying many usernames.
pub static SIGN_IN_IP: LazyLock<Limiter> = LazyLock::new(|| Limiter::new(30, 15 * MIN));
/// New accounts from one address.
pub static SIGN_UP_IP: LazyLock<Limiter> = LazyLock::new(|| Limiter::new(5, 60 * MIN));

/// The caller's address. X-Forwarded-For only when TRUST_PROXY=1 (the API is behind a proxy that
/// sets it); otherwise anyone could send a new value each time and get past the limits.
pub fn client_ip(peer: SocketAddr, headers: &HeaderMap) -> IpAddr {
    static TRUST_PROXY: LazyLock<bool> =
        LazyLock::new(|| std::env::var("TRUST_PROXY").is_ok_and(|v| v == "1"));
    if *TRUST_PROXY {
        // The proxy appends the real client last; earlier entries can be forged.
        let forwarded = headers
            .get("x-forwarded-for")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.rsplit(',').next())
            .and_then(|v| v.trim().parse().ok());
        if let Some(ip) = forwarded {
            return ip;
        }
    }
    peer.ip()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocks_after_max_until_the_window_ends() {
        let l = Limiter::new(3, Duration::from_secs(60));
        let t = Instant::now();
        for _ in 0..3 {
            assert!(l.check_at("k", t).is_ok());
            l.hit_at("k", t);
        }
        assert_eq!(l.check_at("k", t + Duration::from_secs(10)), Err(50));
        assert!(l.check_at("other", t).is_ok());
        assert!(l.check_at("k", t + Duration::from_secs(61)).is_ok());
        l.hit_at("k", t + Duration::from_secs(61)); // a new window starts at 1
        assert!(l.check_at("k", t + Duration::from_secs(62)).is_ok());
    }

    #[test]
    fn clear_resets() {
        let l = Limiter::new(1, Duration::from_secs(60));
        l.hit("k");
        assert!(l.check("k").is_err());
        l.clear("k");
        assert!(l.check("k").is_ok());
    }
}
