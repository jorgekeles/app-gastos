import { NextResponse } from "next/server";
import {
  updateExpenseStatusForUser,
  type PaymentStatus,
} from "@/lib/app-db";
import { getSafeReturnTo, redirectWithQuery } from "@/lib/route-response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

    if (!expenseId) {
      throw new Error("No encontramos el egreso.");
    }

    await updateExpenseStatusForUser(
      user,
      expenseId,
      toPaymentStatus(String(formData.get("status") ?? "PENDING")),
    );
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos actualizar el estado del egreso.",
    });
  }

  return redirectWithQuery(request, returnTo, { updated: "1" });
}
