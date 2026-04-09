# Landil – Build Checklist

## Buyer side
- [ ] Listing detail page (photos, specs, title info, docs)
- [ ] Title / LRA check display
- [ ] BIR zonal value lookup and tax simulator
- [ ] Comparable listings (comps) view
- [ ] Make an offer flow

## Seller side
- [ ] Listings dashboard (view all your listings, status)
- [ ] Bids/offers inbox per listing (pro only)
- [ ] Valuation panel — zonal price + market trends (pro only)

## User profiles
- [ ] Public profile page (/u/[username]) — name, avatar, posted listings
- [ ] Verified seller badge (manual flag in DB, shown on profile + listings)
- [ ] Contact info (shown only to authenticated users)

## Freemium – Seller tiers

### DB / Auth
- [ ] Add `plan` field to user (free | pro) with default "free"
- [ ] Add listing count check (query-based, cap at 3 for free)

### Limits (free tier)
- [ ] Block listing creation if over free cap
- [ ] Lock private document visibility to pro sellers only
- [ ] Gate offers/bids inbox behind upgrade prompt
- [ ] Gate valuation tools behind upgrade prompt
- [ ] Gate verified seller badge eligibility to pro

### Upgrade flow
- [ ] Upgrade prompt UI (modal shown at gated features)
- [ ] Payment integration (PayMongo for PH)
- [ ] Webhook to flip user.plan to pro on payment success
- [ ] Plan badge on seller profile

### Admin
- [ ] Manual plan override (admin panel or direct DB for early deals)

## Shared
- [ ] Listing search / browse page (public-facing)
- [ ] Verified registry badge (manual or automated verification)
- [ ] Offer negotiation thread (messaging between buyer and seller)

## Done
- [x] Listing creation form (photos, docs, property specs, title details)
- [x] File uploads (UploadThing, compressed, CDN-verified)
- [x] Auth (sign in, sign up, sessions)
- [x] DB schema (listing, listing_photo, listing_doc)
- [x] SEO metadata and tab titles
