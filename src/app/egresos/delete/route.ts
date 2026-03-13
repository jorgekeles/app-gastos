import { NextResponse } from "next/server";
import { deleteExpenseForUser } from "@/lib/app-db";
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
  const returnTo = getSafeReturnTo(formData, "/egresos");

  try {
    const expenseId = String(formData.get("expenseId") ?? "");

    if (!expenseId) {
      throw new Error("No encontramos el egreso a eliminar.");
    }

    await deleteExpenseForUser(user, expenseId);
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos eliminar el egreso.",
    });
  }

  return redirectWithQuery(request, returnTo, { deleted: "1" });
}
