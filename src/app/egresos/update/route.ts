import { NextResponse } from "next/server";
import {
  updateExpenseForUser,
  type ExpenseKind,
  type PaymentStatus,
} from "@/lib/app-db";
import { getSafeReturnTo, redirectWithQuery } from "@/lib/route-response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function toExpenseKind(value: string): ExpenseKind {
  const normalized = value.toUpperCase();

  switch (normalized) {
    case "RECURRING":
    case "CREDIT_CARD":
    case "MORTGAGE":
    case "LOAN":
    case "INSTALLMENT":
      return normalized;
    case "ONE_TIME":
    default:
      return "ONE_TIME";
  }
}

function toPaymentStatus(value: string): PaymentStatus {
  const normalized = value.toUpperCase();

  switch (normalized) {
    case "PAID":
    case "OVERDUE":
    case "CANCELED":
      return normalized;
    case "PENDING":
    default:
      return "PENDING";
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
  const returnTo = getSafeReturnTo(formData, "/egresos");

  try {
    const expenseId = String(formData.get("expenseId") ?? "");
    const dueDate = String(formData.get("dueDate") ?? "");
    const fxRateRaw = String(formData.get("fxRateUsed") ?? "").trim();

    if (!expenseId) {
      throw new Error("No encontramos el egreso a actualizar.");
    }

    if (!dueDate) {
      throw new Error("Elegi una fecha para el egreso.");
    }

    await updateExpenseForUser(user, expenseId, {
      title: String(formData.get("title") ?? ""),
      amountOriginal: Number(formData.get("amountOriginal")),
      currency:
        String(formData.get("currency") ?? "ARS").toUpperCase() === "USD"
          ? "USD"
          : "ARS",
      dueDate,
      category: String(formData.get("category") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      fxRateUsed: fxRateRaw ? Number(fxRateRaw) : undefined,
      expenseKind: toExpenseKind(String(formData.get("expenseKind") ?? "ONE_TIME")),
      paymentStatus: toPaymentStatus(
        String(formData.get("paymentStatus") ?? "PENDING"),
      ),
    });
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos actualizar el egreso.",
    });
  }

  return redirectWithQuery(request, returnTo, { updated: "1" });
}
