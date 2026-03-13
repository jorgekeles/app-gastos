import { NextResponse } from "next/server";
import {
  createInvitationForUser,
  type FamilyRole,
  type InvitationMethod,
} from "@/lib/app-db";
import { getSafeReturnTo, redirectWithQuery } from "@/lib/route-response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function toMethod(value: string): InvitationMethod {
  return value.toUpperCase() === "PHONE" ? "PHONE" : "EMAIL";
}

function toRole(value: string): FamilyRole {
  return value.toUpperCase() === "ADMIN" ? "ADMIN" : "MEMBER";
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
  const returnTo = getSafeReturnTo(formData, "/familia");

  try {
    await createInvitationForUser(user, {
      method: toMethod(String(formData.get("method") ?? "EMAIL")),
      role: toRole(String(formData.get("role") ?? "MEMBER")),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      message: String(formData.get("message") ?? ""),
    });
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos crear la invitacion.",
    });
  }

  return redirectWithQuery(request, returnTo, { created: "1" });
}
