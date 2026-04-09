import Navbar from "@/app/(routes)/(home)/components/navbar";
import { getServerSession } from "@/lib/auth/get-session";

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <>
      <Navbar user={session?.user ?? null} />
      <main>{children}</main>
    </>
  );
}