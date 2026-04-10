import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function ProfileNotFound() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-4xl font-semibold">404</p>
      <p className="text-muted-foreground">This user doesn&apos;t exist or hasn&apos;t set a username yet.</p>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
        Go home
      </Link>
    </div>
  );
}
