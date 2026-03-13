import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const defaultAdminEmails = ["jorge.keles@gmail.com"];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getAdminConsoleEmails() {
  const raw =
    process.env["APP_ADMIN_EMAILS"] ?? process.env["ADMIN_EMAILS"] ?? "";
  const configured = raw
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean);

  return configured.length > 0 ? configured : defaultAdminEmails;
}

export async function requireAuthUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdminConsoleUser() {
  const user = await requireAuthUser();
  const email = user.email ? normalizeEmail(user.email) : "";

  if (!email || !getAdminConsoleEmails().includes(email)) {
    notFound();
  }

  return user;
}
