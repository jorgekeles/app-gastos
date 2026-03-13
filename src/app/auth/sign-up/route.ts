import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const signUpSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.email(),
  password: z.string().min(8),
  emailRedirectTo: z.url(),
  nextPath: z.string().trim().optional(),
});

function getSafeNextPath(value?: string) {
  if (!value) {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = signUpSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Revisa los datos del registro e intenta otra vez." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { email, password, fullName, emailRedirectTo, nextPath } = parsed.data;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.session) {
    return NextResponse.json({
      redirectTo: getSafeNextPath(nextPath),
    });
  }

  return NextResponse.json({
    message:
      "Te enviamos un correo de confirmacion. Cuando actives tu cuenta vas a poder entrar al dashboard.",
  });
}
