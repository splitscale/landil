import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { listing } from "@/db/schema/listings";
import { getServerSession } from "@/lib/auth/get-session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck, MapPin, Mail, CalendarDays, LayoutList } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const [profile] = await db.select({ name: user.name }).from(user).where(eq(user.username, username));
  if (!profile) return { title: "User not found" };
  return {
    title: `${profile.name} (@${username})`,
    description: `View ${profile.name}'s land listings on Landil.`,
  };
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function formatDate(date: Date | string | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-PH", { year: "numeric", month: "long" });
}

function formatPrice(pesos: number) {
  return `₱${pesos.toLocaleString("en-PH")}`;
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;

  const [profile] = await db
    .select()
    .from(user)
    .where(eq(user.username, username));

  if (!profile) notFound();

  const listings = await db
    .select()
    .from(listing)
    .where(and(eq(listing.userId, profile.id), eq(listing.status, "published")));

  const session = await getServerSession();
  const isAuthenticated = !!session;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">

      {/* Profile header */}
      <div className="flex items-start gap-5">
        <Avatar className="h-16 w-16 shrink-0">
          <AvatarImage src={profile.image ?? undefined} alt={profile.name} />
          <AvatarFallback className="text-lg">{initials(profile.name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{profile.name}</h1>
            {profile.verified && (
              <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                <BadgeCheck size={11} />
                Verified seller
              </span>
            )}
          </div>

          <p className="mt-0.5 text-sm text-muted-foreground">@{profile.username}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays size={12} />
              Joined {formatDate(profile.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <LayoutList size={12} />
              {listings.length} listing{listings.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Contact — authenticated only */}
          {isAuthenticated && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail size={12} />
              <a href={`mailto:${profile.email}`} className="hover:text-foreground transition-colors">
                {profile.email}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Listings */}
      <div className="mt-10">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          {listings.length > 0 ? "Listings" : "No published listings yet"}
        </h2>

        {listings.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <Link
                key={l.id}
                href={`/listings/${l.id}`}
                className="group rounded-xl border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin size={10} />
                      {l.city}, {l.province}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    {l.propertyType}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold">{formatPrice(l.askingPrice)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{l.lotArea} sqm</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
