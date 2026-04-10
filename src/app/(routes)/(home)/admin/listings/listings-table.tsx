"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Status = "draft" | "published";

type Listing = {
  id: string;
  title: string;
  status: string;
  propertyType: string;
  city: string;
  province: string;
  askingPrice: number;
  createdAt: Date | string;
  sellerName: string | null;
  sellerUsername: string | null;
};

const STATUS_COLORS: Record<Status, string> = {
  published: "bg-primary/10 text-primary",
  draft: "bg-muted text-muted-foreground",
};

function formatPrice(pesos: number) {
  return `₱${pesos.toLocaleString("en-PH")}`;
}

function CopyLinkButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/listings/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} title="Copy listing link" className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
    </button>
  );
}

async function bulkListings(body: Record<string, unknown>) {
  return fetch("/api/admin/listings/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ListingRow({
  listing,
  selected,
  onSelect,
  onDelete,
}: {
  listing: Listing;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [status, setStatus] = useState<Status>(listing.status as Status);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (next: Status) => {
    if (next === status || loading) return;
    setLoading(true);
    setStatus(next);
    try {
      await fetch(`/api/admin/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr className={`border-b border-border last:border-0 transition-colors ${selected ? "bg-primary/5" : "hover:bg-muted/30"}`}>
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(listing.id)}
          className="rounded border-border"
        />
      </td>
      <td className="px-4 py-3">
        <p className="font-medium truncate max-w-[200px]">{listing.title}</p>
        <p className="text-xs text-muted-foreground">{listing.city}, {listing.province} · {listing.propertyType}</p>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {listing.sellerName ?? "—"}
        {listing.sellerUsername && (
          <Link href={`/u/${listing.sellerUsername}`} className="ml-1 text-xs hover:underline">
            @{listing.sellerUsername}
          </Link>
        )}
      </td>
      <td className="px-4 py-3 font-medium">{formatPrice(listing.askingPrice)}</td>
      <td className="px-4 py-3">
        <select
          value={status}
          disabled={loading}
          onChange={(e) => handleStatusChange(e.target.value as Status)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs capitalize disabled:opacity-50 cursor-pointer"
        >
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <CopyLinkButton id={listing.id} />
          <Link href={`/listings/${listing.id}`} title="View listing" className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink size={13} />
          </Link>
          <button
            onClick={() => onDelete(listing.id)}
            title="Delete listing"
            className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ListingsTable({ listings }: { listings: Listing[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<Listing[]>(listings);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const allIds = rows.map((l) => l.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulk = async (body: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await bulkListings({ ...body, ids: [...selected] });
      if (!res.ok) { toast.error("Action failed"); return; }
      if (body.action === "delete") {
        setRows((prev) => prev.filter((l) => !selected.has(l.id)));
        setSelected(new Set());
        toast.success("Listings deleted");
      } else {
        toast.success("Updated");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteSingle = async (id: string) => {
    setLoading(true);
    try {
      await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((l) => l.id !== id));
      toast.success("Listing deleted");
    } finally {
      setLoading(false);
    }
  };

  const copySelectedLinks = () => {
    const links = [...selected].map((id) => `${window.location.origin}/listings/${id}`).join("\n");
    navigator.clipboard.writeText(links);
    toast.success(`${selected.size} link${selected.size !== 1 ? "s" : ""} copied`);
  };

  const count = selected.size;

  return (
    <div className="space-y-2">
      {/* Bulk toolbar */}
      {count > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium">{count} selected</span>
          <span className="text-muted-foreground">·</span>
          <select
            disabled={loading}
            defaultValue=""
            onChange={(e) => { if (e.target.value) { bulk({ action: "setStatus", value: e.target.value }); e.target.value = ""; } }}
            className="rounded border border-border bg-background px-2 py-0.5 text-xs disabled:opacity-50 cursor-pointer"
          >
            <option value="" disabled>Set status…</option>
            <option value="published">published</option>
            <option value="draft">draft</option>
          </select>
          <button
            onClick={copySelectedLinks}
            disabled={loading}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted disabled:opacity-50 transition-colors"
          >
            <Copy size={11} />
            Copy links
          </button>
          <button
            onClick={() => bulk({ action: "delete" })}
            disabled={loading}
            className="ml-auto rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
          >
            Delete {count}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground">
            Clear
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-border"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Listing</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Seller</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <ListingRow
                key={l.id}
                listing={l}
                selected={selected.has(l.id)}
                onSelect={toggleOne}
                onDelete={deleteSingle}
              />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No listings yet.</p>
        )}
      </div>
    </div>
  );
}
