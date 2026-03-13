import { NextResponse } from "next/server";
import { createIncomeForUser } from "@/lib/app-db";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function redirectWithMessage(request: Request, key: string, message: string) {
  const url = new URL("/dashboard", request.url);
  url.searchParams.set(key, message);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const formData = await request.formData();

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
      throw new Error("Elegí una fecha para el ingreso.");
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
    return redirectWithMessage(
      request,
      "incomeError",
      error instanceof Error ? error.message : "No pudimos guardar el ingreso.",
    );
  }

  const successUrl = new URL("/dashboard", request.url);
  successUrl.searchParams.set("incomeCreated", "1");
  return NextResponse.redirect(successUrl, { status: 303 });
}
