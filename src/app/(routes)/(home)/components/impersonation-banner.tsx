import { ShieldAlert } from "lucide-react";

export default function ImpersonationBanner({ impersonatedName }: { impersonatedName: string }) {
  return (
    <div className="flex items-center gap-2 bg-destructive/10 border-b border-destructive/20 px-4 py-1.5 text-xs text-destructive">
      <ShieldAlert size={12} />
      <span>Impersonating <strong>{impersonatedName}</strong> — use sidebar to exit</span>
    </div>
  );
}
