import { getServerSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { LayoutList } from "lucide-react";

export default async function Home() {
  const me = await getServerSession();
  if (!me) redirect("/signin");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {me.user.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{me.user.email}</p>
      </div>

      <div className="mt-2 flex gap-2">
        <Link
          href="/listings/new"
          className={cn(buttonVariants({ variant: "default" }), "gap-2")}
        >
          <LayoutList size={14} />
          Create new listing
        </Link>
      </div>
    </div>
  );
}