import { NextResponse } from "next/server";
import {
  createExpenseForUser,
  type ExpenseKind,
  type PaymentStatus,
  type RecurrenceFrequency,
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

function toRecurrenceFrequency(value: string): RecurrenceFrequency {
  const normalized = value.toUpperCase();

  switch (normalized) {
    case "WEEKLY":
    case "BIWEEKLY":
    case "BIMONTHLY":
    case "QUARTERLY":
      return normalized;
    case "MONTHLY":
    default:
      return "MONTHLY";
  }
}

function toOptionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
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
    const dueDate = String(formData.get("dueDate") ?? "");

    if (!dueDate) {
      throw new Error("Elegi una fecha para el egreso.");
    }

    await createExpenseForUser(user, {
      title: String(formData.get("title") ?? ""),
      amountOriginal: Number(formData.get("amountOriginal")),
      currency:
        String(formData.get("currency") ?? "ARS").toUpperCase() === "USD"
          ? "USD"
          : "ARS",
      dueDate,
      category: String(formData.get("category") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      fxRateUsed: toOptionalNumber(formData.get("fxRateUsed")),
      expenseKind: toExpenseKind(String(formData.get("expenseKind") ?? "ONE_TIME")),
      paymentStatus: toPaymentStatus(
        String(formData.get("paymentStatus") ?? "PENDING"),
      ),
      recurrenceFrequency: toRecurrenceFrequency(
        String(formData.get("recurrenceFrequency") ?? "MONTHLY"),
      ),
      recurrenceCount: toOptionalNumber(formData.get("recurrenceCount")),
      totalInstallments: toOptionalNumber(formData.get("totalInstallments")),
      currentInstallmentNumber: toOptionalNumber(
        formData.get("currentInstallmentNumber"),
      ),
    });
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos guardar el egreso.",
    });
  }

  return redirectWithQuery(request, returnTo, { success: "1" });
}
