import { NextResponse } from "next/server";
import { createIncomeForUser } from "@/lib/app-db";
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
    const title = String(formData.get("title") ?? "");
    const amountOriginal = Number(formData.get("amountOriginal"));
    const currency =
      String(formData.get("currency") ?? "ARS").toUpperCase() === "USD"
        ? "USD"
        : "ARS";
    const transactionDate = String(formData.get("transactionDate") ?? "");
    const category = String(formData.get("category") ?? "");
    const notes = String(formData.get("notes") ?? "");
    const fxRateRaw = String(formData.get("fxRateUsed") ?? "").trim();

    if (!transactionDate) {
      throw new Error("Elegi una fecha para el ingreso.");
    }

    await createIncomeForUser(user, {
      title,
      amountOriginal,
      currency,
      transactionDate,
      category,
      notes,
      fxRateUsed: fxRateRaw ? Number(fxRateRaw) : undefined,
    });
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos guardar el ingreso.",
    });
  }

  return redirectWithQuery(request, returnTo, { success: "1" });
}
