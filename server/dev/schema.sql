-- v1 schema (from src/db/schema via drizzle-kit push). Local test databases only.
--
-- PostgreSQL database dump
--

\restrict T4Rgjh5ngUYftts2Kvwr1YBacgHlentWNk4aReorJMOcfcafzSRCdCPUQ5Da1Nu

-- Dumped from database version 15.20
-- Dumped by pg_dump version 15.20

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: listings; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA listings;


--
-- Name: marketplace; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA marketplace;


--
-- Name: notifications; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA notifications;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: listing; Type: TABLE; Schema: listings; Owner: -
--

CREATE TABLE listings.listing (
    id text NOT NULL,
    user_id text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    property_type text NOT NULL,
    title text NOT NULL,
    asking_price integer NOT NULL,
    lot_area text NOT NULL,
    floor_area text,
    city text NOT NULL,
    province text NOT NULL,
    description text NOT NULL,
    title_type text NOT NULL,
    title_number text,
    registry_of_deeds text,
    lot_number text,
    encumbrances text[] DEFAULT '{}'::text[] NOT NULL,
    utilities text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: listing_doc; Type: TABLE; Schema: listings; Owner: -
--

CREATE TABLE listings.listing_doc (
    id text NOT NULL,
    listing_id text NOT NULL,
    url text NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    visibility text DEFAULT 'private'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: listing_photo; Type: TABLE; Schema: listings; Owner: -
--

CREATE TABLE listings.listing_photo (
    id text NOT NULL,
    listing_id text NOT NULL,
    url text NOT NULL,
    key text NOT NULL,
    cover boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: listing_view; Type: TABLE; Schema: listings; Owner: -
--

CREATE TABLE listings.listing_view (
    id text NOT NULL,
    listing_id text NOT NULL,
    viewer_key text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: offer; Type: TABLE; Schema: marketplace; Owner: -
--

CREATE TABLE marketplace.offer (
    id text NOT NULL,
    listing_id text NOT NULL,
    buyer_id text NOT NULL,
    amount integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    note text,
    sqm real,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: offer_message; Type: TABLE; Schema: marketplace; Owner: -
--

CREATE TABLE marketplace.offer_message (
    id text NOT NULL,
    offer_id text NOT NULL,
    sender_id text NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: notification; Type: TABLE; Schema: notifications; Owner: -
--

CREATE TABLE notifications.notification (
    id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    related_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp without time zone,
    "refreshTokenExpiresAt" timestamp without time zone,
    scope text,
    password text,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


--
-- Name: admin_invite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_invite (
    token text NOT NULL,
    created_by text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    used_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    id text NOT NULL,
    "expiresAt" timestamp without time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL,
    "impersonatedBy" text
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    username text,
    display_username text,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    role text DEFAULT 'buyer'::text NOT NULL,
    gender boolean NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    plan text DEFAULT 'free'::text NOT NULL,
    notification_prefs json,
    banned boolean DEFAULT false,
    "banReason" text,
    "banExpires" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


--
-- Name: verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp without time zone NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


--
-- Name: listing_doc listing_doc_pkey; Type: CONSTRAINT; Schema: listings; Owner: -
--

ALTER TABLE ONLY listings.listing_doc
    ADD CONSTRAINT listing_doc_pkey PRIMARY KEY (id);


--
-- Name: listing_photo listing_photo_pkey; Type: CONSTRAINT; Schema: listings; Owner: -
--

ALTER TABLE ONLY listings.listing_photo
    ADD CONSTRAINT listing_photo_pkey PRIMARY KEY (id);


--
-- Name: listing listing_pkey; Type: CONSTRAINT; Schema: listings; Owner: -
--

ALTER TABLE ONLY listings.listing
    ADD CONSTRAINT listing_pkey PRIMARY KEY (id);


--
-- Name: listing_view listing_view_pkey; Type: CONSTRAINT; Schema: listings; Owner: -
--

ALTER TABLE ONLY listings.listing_view
    ADD CONSTRAINT listing_view_pkey PRIMARY KEY (id);


--
-- Name: offer_message offer_message_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: -
--

ALTER TABLE ONLY marketplace.offer_message
    ADD CONSTRAINT offer_message_pkey PRIMARY KEY (id);


--
-- Name: offer offer_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: -
--

ALTER TABLE ONLY marketplace.offer
    ADD CONSTRAINT offer_pkey PRIMARY KEY (id);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: notifications; Owner: -
--

ALTER TABLE ONLY notifications.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: admin_invite admin_invite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_invite
    ADD CONSTRAINT admin_invite_pkey PRIMARY KEY (token);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_unique UNIQUE (token);


--
-- Name: user user_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_unique UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: user user_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_username_unique UNIQUE (username);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: listing_view_listing_id_idx; Type: INDEX; Schema: listings; Owner: -
--

CREATE INDEX listing_view_listing_id_idx ON listings.listing_view USING btree (listing_id);


--
-- Name: listing_view_viewer_key_idx; Type: INDEX; Schema: listings; Owner: -
--

CREATE INDEX listing_view_viewer_key_idx ON listings.listing_view USING btree (listing_id, viewer_key, created_at);


--
-- Name: listing_doc listing_doc_listing_id_listing_id_fk; Type: FK CONSTRAINT; Schema: listings; Owner: -
--

ALTER TABLE ONLY listings.listing_doc
    ADD CONSTRAINT listing_doc_listing_id_listing_id_fk FOREIGN KEY (listing_id) REFERENCES listings.listing(id) ON DELETE CASCADE;


--
-- Name: listing_photo listing_photo_listing_id_listing_id_fk; Type: FK CONSTRAINT; Schema: listings; Owner: -
--

ALTER TABLE ONLY listings.listing_photo
    ADD CONSTRAINT listing_photo_listing_id_listing_id_fk FOREIGN KEY (listing_id) REFERENCES listings.listing(id) ON DELETE CASCADE;


--
-- Name: listing listing_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: listings; Owner: -
--

ALTER TABLE ONLY listings.listing
    ADD CONSTRAINT listing_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: listing_view listing_view_listing_id_listing_id_fk; Type: FK CONSTRAINT; Schema: listings; Owner: -
--

ALTER TABLE ONLY listings.listing_view
    ADD CONSTRAINT listing_view_listing_id_listing_id_fk FOREIGN KEY (listing_id) REFERENCES listings.listing(id) ON DELETE CASCADE;


--
-- Name: offer offer_buyer_id_user_id_fk; Type: FK CONSTRAINT; Schema: marketplace; Owner: -
--

ALTER TABLE ONLY marketplace.offer
    ADD CONSTRAINT offer_buyer_id_user_id_fk FOREIGN KEY (buyer_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: offer offer_listing_id_listing_id_fk; Type: FK CONSTRAINT; Schema: marketplace; Owner: -
--

ALTER TABLE ONLY marketplace.offer
    ADD CONSTRAINT offer_listing_id_listing_id_fk FOREIGN KEY (listing_id) REFERENCES listings.listing(id) ON DELETE CASCADE;


--
-- Name: offer_message offer_message_offer_id_offer_id_fk; Type: FK CONSTRAINT; Schema: marketplace; Owner: -
--

ALTER TABLE ONLY marketplace.offer_message
    ADD CONSTRAINT offer_message_offer_id_offer_id_fk FOREIGN KEY (offer_id) REFERENCES marketplace.offer(id) ON DELETE CASCADE;


--
-- Name: offer_message offer_message_sender_id_user_id_fk; Type: FK CONSTRAINT; Schema: marketplace; Owner: -
--

ALTER TABLE ONLY marketplace.offer_message
    ADD CONSTRAINT offer_message_sender_id_user_id_fk FOREIGN KEY (sender_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: notification notification_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: notifications; Owner: -
--

ALTER TABLE ONLY notifications.notification
    ADD CONSTRAINT notification_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: account account_userId_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES public."user"(id);


--
-- Name: admin_invite admin_invite_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_invite
    ADD CONSTRAINT admin_invite_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: admin_invite admin_invite_used_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_invite
    ADD CONSTRAINT admin_invite_used_by_user_id_fk FOREIGN KEY (used_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: session session_userId_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES public."user"(id);


--
-- Name: account; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account ENABLE ROW LEVEL SECURITY;

--
-- Name: session; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;

--
-- Name: user; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;

--
-- Name: verification; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verification ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict T4Rgjh5ngUYftts2Kvwr1YBacgHlentWNk4aReorJMOcfcafzSRCdCPUQ5Da1Nu

