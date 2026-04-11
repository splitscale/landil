"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function MakeOfferDialog({
  listingId,
  askingPrice,
}: {
  listingId: string;
  askingPrice: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const formatted = askingPrice.toLocaleString("en-PH");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(amount.replace(/,/g, ""), 10);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Enter a valid offer amount.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed, note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed" }));
        toast.error(error ?? "Failed to submit offer.");
        return;
      }
      toast.success("Offer submitted!");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Make an offer
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold">Make an offer</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Asking price: ₱{formatted}</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="offer-amount" className="mb-1 block text-xs font-medium">Your offer (₱)</label>
          <input
            id="offer-amount"
            type="text"
            inputMode="numeric"
            placeholder={formatted}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>

        <div>
          <label htmlFor="offer-note" className="mb-1 block text-xs font-medium">Note <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            id="offer-note"
            rows={3}
            placeholder="Introduce yourself or explain your offer…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit offer"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
