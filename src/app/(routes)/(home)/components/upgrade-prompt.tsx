import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function UpgradePrompt({ feature }: { feature: string }) {
  return (
    <div className="rounded-xl border border-border p-8 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Sparkles size={18} className="text-primary" />
      </div>
      <p className="text-sm font-medium">Pro feature</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {feature} is available on the Pro plan.
      </p>
      <Link
        href="/upgrade"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Sparkles size={13} />
        Upgrade to Pro
      </Link>
    </div>
  );
}
