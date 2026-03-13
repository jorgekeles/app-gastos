import { NextResponse } from "next/server";
import { deleteIncomeForUser } from "@/lib/app-db";
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
  const returnTo = getSafeReturnTo(formData, "/ingresos");

  try {
    const incomeId = String(formData.get("incomeId") ?? "");

    if (!incomeId) {
      throw new Error("No encontramos el ingreso a eliminar.");
    }

    await deleteIncomeForUser(user, incomeId);
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos eliminar el ingreso.",
    });
  }

  return redirectWithQuery(request, returnTo, { deleted: "1" });
}
