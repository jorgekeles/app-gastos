import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthAccountRegistrationStatus,
  recordSignupAttempt,
} from "@/lib/app-db";
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

function isInvitationPath(value?: string) {
  return Boolean(value && /^\/invitacion\/[^/?#]+$/.test(value));
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = signUpSchema.safeParse(payload);
  const rawPayload =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    null;
  const userAgent = request.headers.get("user-agent");

  if (!parsed.success) {
    await recordSignupAttempt({
      email:
        typeof rawPayload["email"] === "string" ? rawPayload["email"] : null,
      errorMessage: "Payload invalido en el intento de registro.",
      fullName:
        typeof rawPayload["fullName"] === "string" ? rawPayload["fullName"] : null,
      ipAddress,
      nextPath:
        typeof rawPayload["nextPath"] === "string" ? rawPayload["nextPath"] : null,
      status: "INVALID_PAYLOAD",
      userAgent,
    });

    return NextResponse.json(
      { error: "Revisa los datos del registro e intenta otra vez." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { email, password, fullName, emailRedirectTo, nextPath } = parsed.data;
  const registrationStatus = await getAuthAccountRegistrationStatus(email);

  if (registrationStatus.exists && registrationStatus.isConfirmed) {
    const message = isInvitationPath(nextPath)
      ? registrationStatus.hasActiveFamily
        ? "Ya existe una cuenta activa con este correo. Inicia sesion con esa cuenta para revisar la invitacion."
        : "Ya existe una cuenta activa con este correo. Inicia sesion para unirte a la familia invitada."
      : "Ya existe una cuenta activa con este correo. Inicia sesion para continuar.";

    await recordSignupAttempt({
      email,
      errorMessage: message,
      fullName,
      ipAddress,
      nextPath,
      status: "REJECTED",
      userAgent,
    });

    return NextResponse.json({
      actionLabel: isInvitationPath(nextPath)
        ? "Entrar para unirte a la familia"
        : "Ir a iniciar sesion",
      message,
      suggestedAction: "LOGIN",
    });
  }

  if (registrationStatus.exists && !registrationStatus.isConfirmed) {
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo,
      },
    });

    if (resendError) {
      await recordSignupAttempt({
        email,
        errorMessage: resendError.message,
        fullName,
        ipAddress,
        nextPath,
        status: "REJECTED",
        userAgent,
      });

      return NextResponse.json({ error: resendError.message }, { status: 400 });
    }

    await recordSignupAttempt({
      email,
      fullName,
      ipAddress,
      nextPath,
      status: "PENDING_CONFIRMATION",
      userAgent,
    });

    return NextResponse.json({
      message: isInvitationPath(nextPath)
        ? "Esta cuenta ya existe pero todavia no confirmo el correo. Reenviamos el email para que, al confirmarlo, se una a la familia invitada."
        : "Esta cuenta ya existe pero todavia no confirmo el correo. Reenviamos el email de confirmacion.",
      suggestedAction: "VERIFY_EMAIL",
    });
  }

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
    await recordSignupAttempt({
      email,
      errorMessage: error.message,
      fullName,
      ipAddress,
      nextPath,
      status: "REJECTED",
      userAgent,
    });

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.session) {
    await recordSignupAttempt({
      email,
      fullName,
      ipAddress,
      nextPath,
      status: "INSTANT_SESSION",
      userAgent,
    });

    return NextResponse.json({
      redirectTo: getSafeNextPath(nextPath),
    });
  }

  await recordSignupAttempt({
    email,
    fullName,
    ipAddress,
    nextPath,
    status: "PENDING_CONFIRMATION",
    userAgent,
  });

  return NextResponse.json({
    message:
      "Te enviamos un correo de confirmacion. Cuando actives tu cuenta vas a poder entrar al dashboard.",
  });
}
