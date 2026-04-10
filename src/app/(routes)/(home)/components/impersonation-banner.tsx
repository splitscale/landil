"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { ShieldAlert } from "lucide-react";

export default function ImpersonationBanner({ impersonatedName }: { impersonatedName: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const stop = async () => {
    setLoading(true);
    try {
      await authClient.admin.stopImpersonating();
      router.push("/admin/users");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-sm">
      <div className="flex items-center gap-2 text-destructive">
        <ShieldAlert size={14} />
        <span>Impersonating <strong>{impersonatedName}</strong></span>
      </div>
      <button
        onClick={stop}
        disabled={loading}
        className="rounded-md border border-destructive/30 px-3 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
      >
        {loading ? "Stopping…" : "Stop impersonating"}
      </button>
    </div>
  );
}
