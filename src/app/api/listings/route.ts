import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { headers } from "next/headers";

// TODO: photo updload uses 
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  // TODO: status needs to be typesafe
  const { status, values, photoCount, docCount } = body;

  // TODO: validate with ListingSchema, upload files, insert into DB
  console.log("New listing:", { status, values, photoCount, docCount, userId: session.user.id });

  return NextResponse.json({ success: true });
}