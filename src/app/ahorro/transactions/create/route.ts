import { NextResponse } from "next/server";
import { createSavingsTransactionForUser } from "@/lib/app-db";
import { getSafeReturnTo, redirectWithQuery } from "@/lib/route-response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function toDirection(value: string) {
  const normalized = value.toUpperCase();

  switch (normalized) {
    case "WITHDRAWAL":
    case "ADJUSTMENT":
      return normalized;
    case "DEPOSIT":
    default:
      return "DEPOSIT";
  }
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
  const returnTo = getSafeReturnTo(formData, "/ahorro");

  try {
    const transactionDate = String(formData.get("transactionDate") ?? "");
    const fxRateRaw = String(formData.get("fxRateUsed") ?? "").trim();

    if (!transactionDate) {
      throw new Error("Elegi una fecha para el movimiento.");
    }

    await createSavingsTransactionForUser(user, {
      goalId: String(formData.get("goalId") ?? ""),
      direction: toDirection(String(formData.get("direction") ?? "DEPOSIT")),
      amountOriginal: Number(formData.get("amountOriginal")),
      currency:
        String(formData.get("currency") ?? "ARS").toUpperCase() === "USD"
          ? "USD"
          : "ARS",
      transactionDate,
      notes: String(formData.get("notes") ?? ""),
      fxRateUsed: fxRateRaw ? Number(fxRateRaw) : undefined,
    });
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos guardar el movimiento de ahorro.",
    });
  }

  return redirectWithQuery(request, returnTo, { movementCreated: "1" });
}
