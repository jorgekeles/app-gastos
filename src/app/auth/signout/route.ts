import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = await createServerSupabaseClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", requestUrl.origin), {
    status: 303,
  });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  return NextResponse.redirect(new URL("/login", requestUrl.origin), {
    status: 303,
  });
}
