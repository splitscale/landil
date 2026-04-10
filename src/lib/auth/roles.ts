import { redirect } from "next/navigation";
import { getServerSession } from "./get-session";

export type Role = "admin" | "seller" | "buyer";

/**
 * Throws a Next.js redirect if the current user doesn't have one of the required roles.
 * Call at the top of a server component or server action.
 */
export async function requireRole(...roles: Role[]) {
  const session = await getServerSession();
  if (!session) redirect("/signin");
  const role = session.user.role as Role;
  if (!roles.includes(role)) redirect("/");
}
