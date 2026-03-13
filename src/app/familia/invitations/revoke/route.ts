import { NextResponse } from "next/server";
import { revokeInvitationForUser } from "@/lib/app-db";
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
  const invitationId = String(formData.get("invitationId") ?? "");

  try {
    await revokeInvitationForUser(user, invitationId);
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos eliminar la invitacion.",
    });
  }

  return redirectWithQuery(request, returnTo, { deleted: "1" });
}
