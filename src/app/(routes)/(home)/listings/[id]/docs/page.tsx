import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { listing, listingDoc } from "@/db/schema/listings";
import { requireRole } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/get-session";
import { FileText, Lock, Globe, ArrowLeft } from "lucide-react";
import Link from "next/link";
import DocRow from "./doc-row";

export const metadata: Metadata = { title: "Documents" };

type Props = { params: Promise<{ id: string }> };


export default async function DocsPage({ params }: Props) {
  await requireRole("seller", "admin");
  const { id } = await params;
  const session = await getServerSession();

  const [l] = await db
    .select({ id: listing.id, title: listing.title })
    .from(listing)
    .where(and(eq(listing.id, id), eq(listing.userId, session!.user.id)));

  if (!l) notFound();

  const docs = await db
    .select()
    .from(listingDoc)
    .where(eq(listingDoc.listingId, id))
    .orderBy(listingDoc.createdAt);

  const publicDocs = docs.filter((d) => d.visibility === "public");
  const privateDocs = docs.filter((d) => d.visibility === "private");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div>
        <Link
          href={`/listings/${id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={12} />
          Back to listing
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          Documents
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {docs.length} file{docs.length !== 1 ? "s" : ""}
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{l.title}</p>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <FileText size={24} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No documents uploaded for this listing.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {publicDocs.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Globe size={11} />
                Public — visible to buyers
              </div>
              <div className="space-y-2">
                {publicDocs.map((doc) => (
                  <DocRow key={doc.id} doc={doc} />
                ))}
              </div>
            </section>
          )}

          {privateDocs.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Lock size={11} />
                Private — seller access only
              </div>
              <div className="space-y-2">
                {privateDocs.map((doc) => (
                  <DocRow key={doc.id} doc={doc} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

