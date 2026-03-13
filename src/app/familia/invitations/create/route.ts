import { NextResponse } from "next/server";
import {
  createInvitationForUser,
  buildInvitationShareLinks,
  type FamilyRole,
  type InvitationMethod,
} from "@/lib/app-db";
import {
  isInvitationEmailDeliveryConfigured,
  sendFamilyInvitationEmail,
} from "@/lib/invitation-email";
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
  const method = toMethod(String(formData.get("method") ?? "EMAIL"));
  const role = toRole(String(formData.get("role") ?? "MEMBER"));
  const email = String(formData.get("email") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const message = String(formData.get("message") ?? "");

  let createdInvitation:
    | Awaited<ReturnType<typeof createInvitationForUser>>
    | undefined;

  try {
    createdInvitation = await createInvitationForUser(user, {
      method,
      role,
      email,
      phone,
      message,
    });
  } catch (error) {
    return redirectWithQuery(request, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos crear la invitacion.",
    });
  }

  if (method === "EMAIL") {
    if (isInvitationEmailDeliveryConfigured()) {
      const links = buildInvitationShareLinks(
        createdInvitation.invitation,
        createdInvitation.family.name,
      );

      try {
        await sendFamilyInvitationEmail({
          acceptUrl: links.acceptUrl,
          familyName: createdInvitation.family.name,
          invitedByName: createdInvitation.invitedByName,
          message: createdInvitation.invitation.message,
          role: createdInvitation.invitation.role,
          to: createdInvitation.invitation.email ?? email,
        });

        return redirectWithQuery(request, returnTo, {
          created: "1",
          delivery: "sent",
        });
      } catch (error) {
        return redirectWithQuery(request, returnTo, {
          created: "1",
          delivery: "failed",
          notice:
            error instanceof Error
              ? `La invitacion se creo, pero el correo no pudo enviarse automaticamente: ${error.message}`
              : "La invitacion se creo, pero el correo no pudo enviarse automaticamente.",
        });
      }
    }

    return redirectWithQuery(request, returnTo, {
      created: "1",
      delivery: "manual",
      notice:
        "La invitacion se creo, pero este proyecto todavia no tiene un proveedor de correo configurado. Puedes usar 'Abrir email' en la tarjeta generada.",
    });
  }

  return redirectWithQuery(request, returnTo, {
    created: "1",
    delivery: "phone",
    notice:
      "La invitacion por telefono ya se creo. Ahora puedes compartirla por WhatsApp o SMS desde la lista.",
  });
}
