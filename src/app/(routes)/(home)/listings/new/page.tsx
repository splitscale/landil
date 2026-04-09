import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-session";
import NewListingForm from "@/app/(routes)/(home)/listings/new/form";

export const metadata: Metadata = {
  title: "New Listing",
  description: "List your land or property on Landil. Add photos, documents, title details, and set your asking price.",
};

export default async function NewListingPage() {
  const session = await getServerSession();
  if (!session) redirect("/signin");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">New listing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            List your property on Landil.
          </p>
        </div>
        <NewListingForm />
      </div>
    </div>
  );
}