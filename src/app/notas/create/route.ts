import { NextResponse } from "next/server";
import { createNoteForUser } from "@/lib/app-db";
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
  const returnTo = getSafeReturnTo(formData, "/notas");

  try {
    await createNoteForUser(user, String(formData.get("content") ?? ""));
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos guardar la nota.",
    });
  }

  return redirectWithQuery(request, returnTo, { success: "1" });
}
