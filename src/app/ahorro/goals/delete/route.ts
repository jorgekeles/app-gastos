import { NextResponse } from "next/server";
import { deleteSavingsGoalForUser } from "@/lib/app-db";
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
  const returnTo = getSafeReturnTo(formData, "/ahorro");

  try {
    const goalId = String(formData.get("goalId") ?? "");

    if (!goalId) {
      throw new Error("No encontramos el objetivo a borrar.");
    }

    await deleteSavingsGoalForUser(user, goalId);
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos eliminar el objetivo.",
    });
  }

  return redirectWithQuery(request, returnTo, { goalDeleted: "1" });
}
