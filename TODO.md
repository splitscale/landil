# Landil – Build Checklist

## Buyer side
- [ ] Listing detail page (photos, specs, title info, docs)
- [ ] Title / LRA check display
- [ ] BIR zonal value lookup + tax simulator
- [ ] Comparable listings (comps) view
- [ ] Make offer flow

## Seller side
- [x] Listings dashboard (all listings, status)
- [x] Listing detail page (key details, status badge, actions)
- [x] Bids/offers inbox per listing (pro + admin only, upgrade prompt for free)
- [x] Document viewer per listing (public/private sections, download links)
- [x] Listing edit page (4-step wizard, pre-populated, PATCH API, photo/doc diffing)
- [ ] Valuation panel — zonal price + market trends (pro only)

## User profiles
- [x] Public profile page (/u/[username]) — name, avatar, posted listings
- [x] Admin badge (ShieldCheck, destructive color)
- [x] Verified badge (BadgeCheck, primary color — non-admins with verified=true)
- [x] Contact info (shown to authenticated users only)

## Freemium – Seller tiers

### DB / Auth
- [x] Add `plan` field to user (free | pro) with default "free"
- [x] Add listing count check (query-based, cap at 3 for free)

### Limits (free tier)
- [x] Block listing creation if over free cap (admin-exempt)
- [ ] Lock private doc visibility to pro sellers only
- [x] Gate offers/bids inbox behind upgrade prompt
- [ ] Gate valuation tools behind upgrade prompt
- [ ] Gate verified seller badge eligibility to pro

### Upgrade flow
- [x] Upgrade prompt UI (shown at gated features)
- [ ] Payment integration (PayMongo for PH)
- [ ] Webhook to flip user.plan to pro on payment success
- [ ] Plan badge on seller profile

## Admin panel
- [x] Sub-nav layout: Overview / Users / Listings tabs
- [x] Overview: stat cards (users, listings, published, offers), DonutChart, TimeSeriesBar
- [x] Users table: role dropdown, verified toggle, plan dropdown ("unrestricted" for admins)
  - [x] Per-row `⋯` menu: Copy link, Impersonate, Delete
  - [x] Bulk toolbar: set role, set plan, verify all, delete N
  - [x] Select-all (excludes self); user name links to public profile
- [x] Listings table: status select, seller link, price
  - [x] Per-row `⋯` menu: Copy link, Delete
  - [x] Bulk toolbar: set status, copy selected links, delete N
- [x] Manual plan override per user
- [x] Admin impersonation with banner UI

## Admin invite system
- [x] Generate 7-day single-use invite tokens
- [x] `/invite/[token]` public page — claims promote user to admin
- [x] Not signed in → "Sign in to claim" with callbackUrl passthrough
- [x] Invalid / expired / used → error state
- [x] Revoke invites from dialog UI

## Shared
- [ ] Listing search / browse page (public-facing)
- [ ] Verified registry badge (manual or automated verification)
- [ ] Offer negotiation thread (buyer ↔ seller messaging)
- [ ] Notifications (new offer, offer status change)
- [ ] Email on invite generation / claim

## Done (infrastructure)
- [x] Listing creation form (photos, docs, property specs, title details)
- [x] File uploads (UploadThing, compressed, CDN-verified, middleware bypass)
- [x] Auth (sign in with username, sign up, sessions, roles)
- [x] DB schema (listing, listing_photo, listing_doc, admin_invite, offer)
- [x] SEO metadata and tab titles
- [x] Admin APIs: PATCH/DELETE/bulk for users and listings
