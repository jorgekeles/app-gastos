import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteUnusedUnconfirmedAuthAccount,
  getAuthAccountRegistrationStatus,
  recordSignupAttempt,
} from "@/lib/app-db";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const signUpSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.email(),
  confirmEmail: z.email(),
  password: z.string().min(8),
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

function mapSupabaseAuthErrorMessage(message: string) {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("email rate exceeded") ||
    normalized.includes("over email rate limit")
  ) {
    return "Superaste el limite de correos de confirmacion de Supabase. Espera un rato antes de reenviar otro email o configura SMTP propio en Supabase para evitar este tope.";
  }

  if (normalized.includes("email address not authorized")) {
    return "Supabase no permite enviar correos a esa direccion con el servicio por defecto. Para enviar a destinatarios reales necesitas configurar SMTP propio en Supabase.";
  }

  return message;
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
  const { email, confirmEmail, password, fullName, nextPath } = parsed.data;

  if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
    await recordSignupAttempt({
      email,
      errorMessage: "Los dos emails no coinciden.",
      fullName,
      ipAddress,
      nextPath,
      status: "REJECTED",
      userAgent,
    });

    return NextResponse.json(
      { error: "Los dos emails deben coincidir para crear la cuenta." },
      { status: 400 },
    );
  }

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
    const deleted = await deleteUnusedUnconfirmedAuthAccount(email);

    if (!deleted) {
      const message =
        "Ya existe una cuenta pendiente con este correo y este proyecto todavia conserva ese registro. Si necesitas reutilizarlo, primero elimina ese usuario o termina el alta anterior.";

      await recordSignupAttempt({
        email,
        errorMessage: message,
        fullName,
        ipAddress,
        nextPath,
        status: "REJECTED",
        userAgent,
      });

      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    const friendlyMessage = mapSupabaseAuthErrorMessage(error.message);

    await recordSignupAttempt({
      email,
      errorMessage: friendlyMessage,
      fullName,
      ipAddress,
      nextPath,
      status: "REJECTED",
      userAgent,
    });

    return NextResponse.json({ error: friendlyMessage }, { status: 400 });
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

  const verificationEnabledMessage =
    "El proyecto todavia tiene activa la verificacion por correo en Supabase. Desactiva 'Confirm email' en Authentication > Providers > Email para usar el alta inmediata sin mail.";

  await recordSignupAttempt({
    email,
    errorMessage: verificationEnabledMessage,
    fullName,
    ipAddress,
    nextPath,
    status: "REJECTED",
    userAgent,
  });

  return NextResponse.json(
    { error: verificationEnabledMessage },
    { status: 400 },
  );
}
