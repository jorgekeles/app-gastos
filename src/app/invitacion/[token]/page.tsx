import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { getInvitationPreview } from "@/lib/app-db";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type InvitationPageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InvitationPage({
  params,
  searchParams,
}: InvitationPageProps) {
  const { token } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const preview = await getInvitationPreview(token, user);
  const query = (await searchParams) ?? {};
  const error = typeof query["error"] === "string" ? query["error"] : null;
  const registerQuery = new URLSearchParams({
    next: `/invitacion/${token}`,
  });

  if (preview?.invitation.email) {
    registerQuery.set("inviteEmail", preview.invitation.email);
  }

  if (preview?.family.name) {
    registerQuery.set("familyName", preview.family.name);
  }

  const loginHref = `/login?${registerQuery.toString()}`;
  const registerHref = `/registro?${registerQuery.toString()}`;

  return (
    <main className="app-shell">
      <header className="site-header">
        <BrandLogo caption="Invitaciones familiares seguras" href="/" size="sm" />

        <nav className="header-links">
          {user ? (
            <Link href="/dashboard">Ir al dashboard</Link>
          ) : (
            <>
              <Link href={loginHref}>Entrar</Link>
              <Link className="primary-button" href={registerHref}>
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="auth-shell">
        <article className="auth-card invite-landing">
          <div className="eyebrow">Invitacion a cuenta familiar</div>
          {preview ? (
            <>
              <h1>{preview.family.name}</h1>
              <p>
                {preview.invitedByName} te invito a sumarte a esta cuenta
                familiar en AppGastos con rol <strong>{preview.invitation.role}</strong>.
              </p>

              <div className="auth-benefits">
                <div className="auth-benefit">
                  Metodo: {preview.invitation.method}
                </div>
                <div className="auth-benefit">
                  Moneda base: {preview.family.baseCurrency}
                </div>
                <div className="auth-benefit">
                  Vence: {preview.invitation.expiresAt.slice(0, 10)}
                </div>
              </div>

              {preview.invitation.message ? (
                <div className="feedback success">{preview.invitation.message}</div>
              ) : null}

              {error ? <div className="feedback error">{error}</div> : null}

              {user ? (
                preview.canAccept ? (
                  <form
                    action={`/invitacion/${token}/accept`}
                    className="auth-form"
                    method="post"
                  >
                    <button className="primary-button" type="submit">
                      Aceptar invitacion
                    </button>
                    <Link className="secondary-button" href="/dashboard">
                      Volver al dashboard
                    </Link>
                  </form>
                ) : (
                  <div className="feedback error">
                    {preview.reason ?? "No fue posible aceptar la invitacion."}
                  </div>
                )
              ) : !preview.canAccept && preview.reason ? (
                <div className="feedback error">{preview.reason}</div>
              ) : (
                <div className="invite-login-cta">
                  <p>
                    Para aceptar la invitacion, primero entra o crea tu cuenta.
                  </p>
                  <div className="hero-actions">
                    <Link className="primary-button" href={loginHref}>
                      Iniciar sesion
                    </Link>
                    <Link className="secondary-button" href={registerHref}>
                      Crear cuenta
                    </Link>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h1>Invitacion no disponible</h1>
              <p>
                El enlace no existe o ya no esta disponible. Pide una nueva
                invitacion al administrador de la familia.
              </p>
            </>
          )}
        </article>
      </section>
    </main>
  );
}
