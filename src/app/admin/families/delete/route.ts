import { NextResponse } from "next/server";
import { deleteFamilyFromAdminConsole } from "@/lib/app-db";
import { getSafeReturnTo, redirectWithQuery } from "@/lib/route-response";
import { isAdminConsoleEmail } from "@/lib/server-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  if (!isAdminConsoleEmail(user.email)) {
    return NextResponse.redirect(new URL("/dashboard", request.url), { status: 303 });
  }

  const formData = await request.formData();
  const returnTo = getSafeReturnTo(formData, "/admin");
  const familyId = String(formData.get("familyId") ?? "");

  try {
    const deletedFamily = await deleteFamilyFromAdminConsole(user, familyId);

    return redirectWithQuery(request, returnTo, {
      deleted: "1",
      deletedFamily: deletedFamily.name,
    });
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos eliminar la cuenta familiar.",
    });
  }
}
