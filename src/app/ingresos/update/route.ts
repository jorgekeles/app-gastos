import { NextResponse } from "next/server";
import { updateIncomeForUser } from "@/lib/app-db";
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
    const transactionDate = String(formData.get("transactionDate") ?? "");
    const fxRateRaw = String(formData.get("fxRateUsed") ?? "").trim();

    if (!incomeId) {
      throw new Error("No encontramos el ingreso a actualizar.");
    }

    if (!transactionDate) {
      throw new Error("Elegi una fecha para el ingreso.");
    }

    await updateIncomeForUser(user, incomeId, {
      title: String(formData.get("title") ?? ""),
      amountOriginal: Number(formData.get("amountOriginal")),
      currency:
        String(formData.get("currency") ?? "ARS").toUpperCase() === "USD"
          ? "USD"
          : "ARS",
      transactionDate,
      category: String(formData.get("category") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      fxRateUsed: fxRateRaw ? Number(fxRateRaw) : undefined,
    });
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos actualizar el ingreso.",
    });
  }

  return redirectWithQuery(request, returnTo, { updated: "1" });
}
