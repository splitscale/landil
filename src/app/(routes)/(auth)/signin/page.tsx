import { type Metadata } from "next";
import SignInForm from "./form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Landil account to access land listings, due diligence tools, and market data.",
};

type Props = { searchParams: Promise<{ callbackUrl?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center">
      <div className="flex w-full flex-col rounded-2xl border border-foreground/10 px-8 py-5 md:w-96">

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Good to see you again. Sign in to continue to Landil.
          </p>
        </div>

        <SignInForm callbackUrl={callbackUrl} />

        <div className="flex items-center justify-center gap-2">
          <small>Don&apos;t have an account?</small>
          <Link href="/signup" className="text-sm font-bold leading-none">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}