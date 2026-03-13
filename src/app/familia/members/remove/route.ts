import { NextResponse } from "next/server";
import { removeFamilyMemberForUser } from "@/lib/app-db";
import { getSafeReturnTo, redirectWithQuery } from "@/lib/route-response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const formData = await request.formData();
  const returnTo = getSafeReturnTo(formData, "/familia");
  const memberUserId = String(formData.get("memberUserId") ?? "");

  try {
    await removeFamilyMemberForUser(user, memberUserId);
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos eliminar al miembro de la familia.",
    });
  }

  return redirectWithQuery(request, returnTo, { memberRemoved: "1" });
}
