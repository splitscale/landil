"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatTime } from "@/lib/format";

type Message = {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
};

type Props = {
  offerId: string;
  listingId: string;
  currentUserId: string;
  messages: Message[];
  isBuyer: boolean;
  canWithdraw?: boolean;
  canAct?: boolean; // seller: can accept/reject/counter
};

export default function OfferThreadClient({
  offerId,
  listingId,
  currentUserId,
  messages: initialMessages,
  isBuyer,
  canWithdraw,
  canAct,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [counterAmt, setCounterAmt] = useState("");
  const [acting, setActing] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/offers/${offerId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim() }),
      });
      if (!res.ok) { toast.error("Failed to send."); return; }
      const { id } = await res.json();
      setMessages((prev) => [
        ...prev,
        { id, content: text.trim(), senderId: currentUserId, senderName: "You", createdAt: new Date().toISOString() },
      ]);
      setText("");
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status: string, amt?: number) => {
    setActing(true);
    try {
      const body: Record<string, unknown> = { status };
      if (amt) body.counterAmount = amt;
      const res = await fetch(`/api/listings/${listingId}/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error("Action failed."); return; }
      toast.success(`Offer ${status}.`);
      router.refresh();
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Message thread */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Thread</p>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => {
              const isMine = m.senderId === currentUserId;
              return (
                <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    isMine ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    {m.content}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {isMine ? "You" : m.senderName} · {formatTime(m.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Send message */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <label htmlFor="thread-message" className="sr-only">Message</label>
        <input
          id="thread-message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a message…"
          className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>

      {/* Buyer: withdraw */}
      {isBuyer && canWithdraw && (
        <button
          onClick={() => updateStatus("withdrawn")}
          disabled={acting}
          className="text-xs text-destructive hover:underline disabled:opacity-50"
        >
          Withdraw offer
        </button>
      )}

      {/* Seller: accept / reject / counter */}
      {!isBuyer && canAct && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">Actions</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateStatus("accepted")}
              disabled={acting}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Accept offer
            </button>
            <button
              onClick={() => updateStatus("rejected")}
              disabled={acting}
              className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50 transition-colors"
            >
              Reject
            </button>
          </div>
          <div className="flex gap-2">
            <label htmlFor="counter-amount" className="sr-only">Counter amount</label>
            <input
              id="counter-amount"
              type="text"
              inputMode="numeric"
              placeholder="Counter amount (₱)"
              value={counterAmt}
              onChange={(e) => setCounterAmt(e.target.value)}
              className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <button
              onClick={() => {
                const amt = parseInt(counterAmt.replace(/,/g, ""), 10);
                if (isNaN(amt) || amt <= 0) { toast.error("Enter valid counter amount."); return; }
                updateStatus("countered", amt);
              }}
              disabled={acting || !counterAmt}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 disabled:opacity-50 transition-colors"
            >
              Counter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
