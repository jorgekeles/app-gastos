import { NextResponse } from "next/server";
import { redirectWithQuery } from "@/lib/route-response";
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
  const returnTo = "/cuenta";
  const newPassword = String(formData.get("newPassword") ?? "").trim();
  const confirmNewPassword = String(formData.get("confirmNewPassword") ?? "").trim();

  if (newPassword.length < 8) {
    return redirectWithQuery(request, returnTo, {
      error: "La nueva contrasena debe tener al menos 8 caracteres.",
    });
  }

  if (newPassword !== confirmNewPassword) {
    return redirectWithQuery(request, returnTo, {
      error: "Las dos contrasenas deben coincidir.",
    });
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return redirectWithQuery(request, returnTo, {
      error: error.message,
    });
  }

  return redirectWithQuery(request, returnTo, {
    passwordUpdated: "1",
  });
}
