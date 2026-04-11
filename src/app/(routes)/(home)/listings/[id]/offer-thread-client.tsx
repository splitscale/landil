"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatTime } from "@/lib/format";
import { ChevronDown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

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
  currentUserName?: string;
  messages: Message[];
  isBuyer: boolean;
  canWithdraw?: boolean;
  canAct?: boolean;
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
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState("");
  const [dangerOpen, setDangerOpen] = useState(false);
  const [typingName, setTypingName] = useState<string | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // SSE: real-time messages + typing indicators
  useEffect(() => {
    const es = new EventSource(`/api/listings/${listingId}/offers/${offerId}/stream`);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as {
          type?: string;
          id?: string;
          content?: string;
          senderId: string;
          senderName?: string;
          createdAt?: string;
        };

        if (event.senderId === currentUserId) return; // ignore own events

        if (event.type === "typing") {
          setTypingName(event.senderName ?? "Them");
          // Auto-clear after 3 s of silence
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setTypingName(null), 3000);
          return;
        }

        // type === "message" (or legacy without type field)
        if (event.id && event.content && event.createdAt) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === event.id)) return prev;
            return [
              ...prev,
              {
                id: event.id!,
                content: event.content!,
                senderId: event.senderId,
                senderName: event.senderName ?? "Them",
                createdAt: event.createdAt!,
              },
            ];
          });
          // Clear typing indicator when message arrives
          setTypingName(null);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        }
      } catch { /* malformed */ }
    };

    es.onerror = () => { es.close(); };

    return () => {
      es.close();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [offerId, listingId, currentUserId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Throttled typing indicator — fire at most once per 1.5 s
  const sendTyping = useCallback(() => {
    if (typingThrottleRef.current) return;
    typingThrottleRef.current = setTimeout(() => {
      typingThrottleRef.current = null;
    }, 1500);
    fetch(`/api/listings/${listingId}/offers/${offerId}/typing`, { method: "POST" }).catch(() => {});
  }, [listingId, offerId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const content = text.trim();
    setText("");
    try {
      const res = await fetch(`/api/listings/${listingId}/offers/${offerId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) { toast.error("Failed to send."); setText(content); return; }
      const { id } = await res.json();
      setMessages((prev) => [
        ...prev,
        { id, content, senderId: currentUserId, senderName: "You", createdAt: new Date().toISOString() },
      ]);
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

  const confirmWithdraw = async () => {
    if (withdrawConfirm.toLowerCase() !== "withdraw") {
      toast.error('Type "withdraw" to confirm.');
      return;
    }
    setActing(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "withdrawn" }),
      });
      if (!res.ok) { toast.error("Failed to withdraw offer."); return; }
      setWithdrawOpen(false);
      toast.success("Offer withdrawn.");
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
            <div ref={bottomRef} />
          </div>
        )}

        {/* Typing indicator */}
        {typingName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="flex gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
            </span>
            {typingName} is typing…
          </div>
        )}
      </div>

      {/* Send message */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <label htmlFor="thread-message" className="sr-only">Message</label>
        <input
          id="thread-message"
          value={text}
          onChange={(e) => { setText(e.target.value); sendTyping(); }}
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

      {/* Buyer: danger zone (collapsed by default) */}
      {isBuyer && canWithdraw && (
        <div className="border-t border-border pt-4">
          <button
            onClick={() => setDangerOpen((v) => !v)}
            className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Danger zone</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${dangerOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dangerOpen && (
            <div className="mt-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Withdrawing your offer is permanent. The seller will be notified.
              </p>
              <button
                onClick={() => { setWithdrawConfirm(""); setWithdrawOpen(true); }}
                disabled={acting}
                className="w-full rounded-lg border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50 transition-colors"
              >
                Withdraw offer…
              </button>
            </div>
          )}

          <AlertDialog
            open={withdrawOpen}
            onOpenChange={(v) => { setWithdrawOpen(v); if (!v) setWithdrawConfirm(""); }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Withdraw your offer?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. The seller will be notified. Type{" "}
                  <span className="font-semibold text-foreground">withdraw</span> to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="mt-2">
                <label htmlFor="withdraw-confirm" className="sr-only">Type withdraw to confirm</label>
                <input
                  id="withdraw-confirm"
                  type="text"
                  value={withdrawConfirm}
                  onChange={(e) => setWithdrawConfirm(e.target.value)}
                  placeholder='Type "withdraw"'
                  autoComplete="off"
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => { setWithdrawOpen(false); setWithdrawConfirm(""); }}
                  disabled={acting}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  Keep offer
                </AlertDialogCancel>
                <button
                  onClick={confirmWithdraw}
                  disabled={acting || withdrawConfirm.toLowerCase() !== "withdraw"}
                  className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                >
                  {acting ? "Withdrawing…" : "Confirm withdrawal"}
                </button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
