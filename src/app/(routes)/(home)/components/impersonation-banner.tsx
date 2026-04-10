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
    <div className="flex items-center justify-between bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
      <div className="flex items-center gap-2">
        <ShieldAlert size={13} className="shrink-0 text-amber-500" />
        <span>
          <strong>Admin mode:</strong> You are viewing this account as{" "}
          <strong>{impersonatedName}</strong> — actions taken here affect their real account.
        </span>
      </div>
      <button
        onClick={stop}
        disabled={loading}
        className="ml-4 shrink-0 rounded border border-amber-500/40 px-2.5 py-1 font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50"
      >
        {loading ? "Exiting…" : "Exit impersonation"}
      </button>
    </div>
  );
}
