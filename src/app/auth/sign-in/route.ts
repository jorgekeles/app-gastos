import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = signInSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Revisa email y contrasena antes de continuar." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { email, password } = parsed.data;
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    redirectTo: "/dashboard",
  });
}
