"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

function formatPrice(pesos: number) {
  return `₱${pesos.toLocaleString("en-PH")}`;
}

const STATUS_COLORS: Record<Status, string> = {
  published: "bg-primary/10 text-primary",
  draft: "bg-muted text-muted-foreground",
};

export default function ListingStatusRow({ listing }: { listing: Listing }) {
  const [status, setStatus] = useState<Status>(listing.status as Status);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (next: Status) => {
    if (next === status || loading) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      setStatus(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium truncate max-w-[200px]">{listing.title}</p>
        <p className="text-xs text-muted-foreground">{listing.city}, {listing.province} · {listing.propertyType}</p>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {listing.sellerName ?? "—"}
        {listing.sellerUsername && (
          <span className="ml-1 text-xs">@{listing.sellerUsername}</span>
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
    </tr>
  );
}
