"use client";

import { useState } from "react";
import { Link2, Trash2, Copy, Check, ShieldPlus } from "lucide-react";
import { useRouter } from "next/navigation";

type Invite = {
  token: string;
  createdAt: Date | string;
  expiresAt: Date | string;
  usedAt: Date | string | null;
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function inviteUrl(token: string) {
  return `${window.location.origin}/invite/${token}`;
}

function CopyButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(inviteUrl(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      title="Copy invite link"
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

export default function InvitePanel({ initial }: { initial: Invite[] }) {
  const [invites, setInvites] = useState<Invite[]>(initial);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invite", { method: "POST" });
      if (!res.ok) return;
      const { token } = await res.json();
      const now = new Date();
      const exp = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setInvites((prev) => [{ token, createdAt: now, expiresAt: exp, usedAt: null }, ...prev]);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const revoke = async (token: string) => {
    await fetch(`/api/admin/invite/${token}`, { method: "DELETE" });
    setInvites((prev) => prev.filter((i) => i.token !== token));
    router.refresh();
  };

  const active = invites.filter((i) => !i.usedAt && new Date(i.expiresAt) > new Date());
  const used   = invites.filter((i) => i.usedAt);

  return (
    <div className="rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Admin invites</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Share a link to grant someone admin access. Each link expires in 7 days and is single-use.
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          <ShieldPlus size={13} />
          {loading ? "Generating…" : "Generate link"}
        </button>
      </div>

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Active</p>
          {active.map((inv) => (
            <div key={inv.token} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5">
              <Link2 size={13} className="shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs text-foreground">
                  /invite/{inv.token.slice(0, 8)}…
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Expires {formatDate(inv.expiresAt)}
                </p>
              </div>
              <CopyButton token={inv.token} />
              <button
                onClick={() => revoke(inv.token)}
                title="Revoke"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {used.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Used</p>
          {used.map((inv) => (
            <div key={inv.token} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2.5 opacity-60">
              <Link2 size={13} className="shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs text-muted-foreground">
                  /invite/{inv.token.slice(0, 8)}…
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Used {formatDate(inv.usedAt!)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {active.length === 0 && used.length === 0 && (
        <p className="text-xs text-muted-foreground">No invites yet. Generate one above.</p>
      )}
    </div>
  );
}
