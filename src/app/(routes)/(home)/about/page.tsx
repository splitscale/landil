import { type Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Landil is a land marketplace built for buyers and sellers in the Philippines. Browse listings, submit offers, and manage due diligence documents in one place.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 space-y-16">

      {/* Hero */}
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Buying land in the Philippines is harder than it should be.
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Listings are scattered. Prices have no reference point. Sellers field
          lowball offers from buyers who haven&apos;t done any research, and buyers
          waste weeks on properties that were never a good deal to begin with.
          Landil was built to fix that.
        </p>
      </section>

      {/* What it is */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">What Landil is</h2>
        <p className="text-muted-foreground leading-relaxed">
          Landil is a marketplace where sellers list land and buyers browse,
          compare, and submit offers — all in one place. Every listing shows the
          asking price, lot area, title type, and any supporting documents the
          seller chooses to share. Buyers can send an offer directly through the
          platform and negotiate through a shared thread.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          There&apos;s no middleman taking a cut of the deal. No referral fees. The
          platform exists to make the process clear, not to insert itself into
          every transaction.
        </p>
      </section>

      {/* For buyers */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">For buyers</h2>
        <ul className="space-y-3 text-muted-foreground">
          <li className="flex gap-3">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary mt-2" />
            <span>
              Browse published listings by location, property type, and price
              range. No account required to look around.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary mt-2" />
            <span>
              See comparable listings in the same province before making an
              offer. Know whether the asking price is in range before you commit.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary mt-2" />
            <span>
              Submit an offer and negotiate directly with the seller through a
              private thread. Counter-offers, acceptances, and withdrawals are
              tracked and time-stamped.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary mt-2" />
            <span>
              Access public documents the seller has shared — title information,
              tax declarations, survey plans. Know what you&apos;re looking at before
              you show up in person.
            </span>
          </li>
        </ul>
      </section>

      {/* For sellers */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">For sellers</h2>
        <ul className="space-y-3 text-muted-foreground">
          <li className="flex gap-3">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary mt-2" />
            <span>
              Create a listing with photos, lot details, and documents in one
              form. Publish when you&apos;re ready; keep it in draft until then.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary mt-2" />
            <span>
              See all offers in one place. Accept, reject, or counter from the
              same screen — no chasing messages across different apps.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary mt-2" />
            <span>
              Track how many people have viewed your listing and how offer
              activity has moved over time. Price based on data, not guesswork.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary mt-2" />
            <span>
              Mark documents as public or private. Share what helps buyers feel
              confident; keep sensitive paperwork off the listing.
            </span>
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section className="rounded-xl border border-border p-8 space-y-4 text-center">
        <h2 className="text-xl font-semibold tracking-tight">
          Ready to get started?
        </h2>
        <p className="text-sm text-muted-foreground">
          Browsing is free and open. Create an account when you&apos;re ready to
          make an offer or list a property.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Browse listings
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            Create an account
          </Link>
        </div>
      </section>

      {/* Built by */}
      <section className="text-center">
        <p className="text-xs text-muted-foreground">
          Landil is built by{" "}
          <a
            href="https://splitscale.ph"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline transition-colors"
          >
            Splitscale
          </a>
          , a software company based in the Philippines.
        </p>
      </section>

    </div>
  );
}
