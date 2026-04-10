import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { listing, listingDoc } from "@/db/schema/listings";
import { requireRole } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/get-session";
import { FileText, Lock, Globe, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Documents" };

type Props = { params: Promise<{ id: string }> };

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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

type DocRowProps = {
  doc: { id: string; name: string; url: string; visibility: string; createdAt: Date };
};

function DocRow({ doc }: DocRowProps) {
  const isPrivate = doc.visibility === "private";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
      <FileText size={16} className="shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{doc.name}</p>
        <p className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            isPrivate ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
          }`}
        >
          {isPrivate ? <Lock size={8} /> : <Globe size={8} />}
          {doc.visibility}
        </span>
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          download={doc.name}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Download"
        >
          <Download size={14} />
        </a>
      </div>
    </div>
  );
}
