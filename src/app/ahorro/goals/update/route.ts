import { NextResponse } from "next/server";
import { updateSavingsGoalForUser } from "@/lib/app-db";
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
    const targetAmountRaw = String(formData.get("targetAmount") ?? "").trim();

    if (!goalId) {
      throw new Error("No encontramos el objetivo a editar.");
    }

    await updateSavingsGoalForUser(user, goalId, {
      name: String(formData.get("name") ?? ""),
      targetAmount: targetAmountRaw ? Number(targetAmountRaw) : undefined,
      targetCurrency:
        String(formData.get("targetCurrency") ?? "ARS").toUpperCase() === "USD"
          ? "USD"
          : "ARS",
    });
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos actualizar el objetivo.",
    });
  }

  return redirectWithQuery(request, returnTo, { goalUpdated: "1" });
}
