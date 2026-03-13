import "server-only";

import { Resend } from "resend";

type InvitationEmailInput = {
  acceptUrl: string;
  familyName: string;
  invitedByName: string;
  message: string | null;
  role: "ADMIN" | "MEMBER";
  to: string;
};

function getResendApiKey() {
  return process.env["RESEND_API_KEY"]?.trim() ?? "";
}

function getFromEmail() {
  return (
    process.env["RESEND_FROM_EMAIL"]?.trim() ??
    process.env["EMAIL_FROM"]?.trim() ??
    ""
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function isInvitationEmailDeliveryConfigured() {
  return Boolean(getResendApiKey() && getFromEmail());
}

export async function sendFamilyInvitationEmail(input: InvitationEmailInput) {
  const apiKey = getResendApiKey();
  const from = getFromEmail();

  if (!apiKey || !from) {
    throw new Error(
      "Falta configurar el proveedor de correo automatico para las invitaciones.",
    );
  }

  const resend = new Resend(apiKey);
  const subject = `Invitacion a la familia ${input.familyName} en AppGastos`;
  const introMessage = input.message?.trim()
    ? `${input.message.trim()}\n\n`
    : "";
  const text =
    `${introMessage}${input.invitedByName} te invito a sumarte a la familia ` +
    `"${input.familyName}" en AppGastos con rol ${input.role}.\n\n` +
    `Acepta la invitacion desde este enlace:\n${input.acceptUrl}\n\n` +
    "Si no esperabas este correo, puedes ignorarlo.";
  const safeFamilyName = escapeHtml(input.familyName);
  const safeInvitedByName = escapeHtml(input.invitedByName);
  const safeMessage = input.message?.trim()
    ? `<p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">${escapeHtml(
        input.message.trim(),
      )}</p>`
    : "";
  const safeAcceptUrl = escapeHtml(input.acceptUrl);
  const html = `
    <div style="background:#f8fafc;padding:32px 16px;font-family:'Nunito Sans',Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:32px;">
        <p style="margin:0 0 12px;color:#2563eb;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">
          Invitacion familiar
        </p>
        <h1 style="margin:0 0 16px;color:#0f172a;font-size:28px;line-height:1.1;">
          Te invitaron a unirte a ${safeFamilyName}
        </h1>
        <p style="margin:0 0 20px;color:#334155;font-size:16px;line-height:1.6;">
          <strong>${safeInvitedByName}</strong> quiere sumarte a la cuenta familiar en AppGastos
          con rol <strong>${input.role}</strong>.
        </p>
        ${safeMessage}
        <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6;">
          Usa este enlace para aceptar la invitacion y entrar a la misma cuenta familiar:
        </p>
        <p style="margin:0 0 24px;">
          <a
            href="${safeAcceptUrl}"
            style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:999px;font-weight:800;"
          >
            Aceptar invitacion
          </a>
        </p>
        <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
          Si el boton no abre, copia y pega este enlace en tu navegador:<br />
          <a href="${safeAcceptUrl}" style="color:#1d4ed8;">${safeAcceptUrl}</a>
        </p>
      </div>
    </div>
  `;

  const { error } = await resend.emails.send({
    from,
    html,
    subject,
    text,
    to: [input.to],
  });

  if (error) {
    throw new Error(error.message ?? "No pudimos enviar el correo de invitacion.");
  }
}
