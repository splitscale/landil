import { type Metadata } from "next";
import Link from "next/link";
import SignUpForm from "./form";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Join Landil to buy or sell land in the Philippines with title checks, zonal value data, and aggregated market bids.",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center p-10 pb-16">
      <div className="flex w-full flex-col rounded-2xl border border-foreground/10 px-8 py-5 md:w-96">

        <div className="mb-6">
          <Link href="/" className="mb-4 inline-block text-xl font-bold tracking-tight">
            Landil
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Create an account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join Landil today and be a smarter dealmaker.
          </p>
        </div>

        <SignUpForm />

        <div className="flex items-center justify-center gap-2">
          <small>Already have an account?</small>
          <Link href="/signin" className="text-sm font-bold leading-none">
            Sign In
          </Link>
        </div>
      </div>

      <div className="absolute bottom-0 w-full">
        <Footer />
      </div>
    </div>
  );
}