"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="flex items-center justify-between bg-destructive/10 border-b border-destructive/20 px-4 py-1.5 text-xs text-destructive">
      <div className="flex items-center gap-2">
        <ShieldAlert size={12} />
        <span>Impersonating <strong>{impersonatedName}</strong></span>
      </div>
      <button
        onClick={stop}
        disabled={loading}
        className="rounded border border-destructive/30 px-2 py-0.5 hover:bg-destructive/10 transition-colors disabled:opacity-50"
      >
        {loading ? "Exiting…" : "Exit"}
      </button>
    </div>
  );
}
