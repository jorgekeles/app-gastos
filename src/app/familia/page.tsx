import { ProtectedShell } from "@/components/app/protected-shell";
import { SummaryCard } from "@/components/dashboard/summary-card";
import {
  buildInvitationShareLinks,
  formatLongDate,
  getFamilyPageData,
} from "@/lib/app-db";
import { requireAuthUser } from "@/lib/server-auth";

type FamilyPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function invitationState(
  expiresAt: string,
  acceptedAt: string | null,
  revokedAt: string | null,
  currentTimestampIso: string,
) {
  if (acceptedAt) {
    return "Aceptada";
  }

  if (revokedAt) {
    return "Revocada";
  }

  if (expiresAt < currentTimestampIso) {
    return "Vencida";
  }

  return "Activa";
}

export default async function FamilyPage({ searchParams }: FamilyPageProps) {
  const user = await requireAuthUser();
  const data = await getFamilyPageData(user);
  const params = (await searchParams) ?? {};
  const familyUpdated = params["familyUpdated"] === "1";
  const created = params["created"] === "1";
  const accepted = params["accepted"] === "1";
  const deleted = params["deleted"] === "1";
  const memberRemoved = params["memberRemoved"] === "1";
  const delivery = typeof params["delivery"] === "string" ? params["delivery"] : null;
  const notice = typeof params["notice"] === "string" ? params["notice"] : null;
  const error = typeof params["error"] === "string" ? params["error"] : null;

  return (
    <ProtectedShell
      baseCurrency={data.family.baseCurrency}
      currentPath="/familia"
      description="Gestiona integrantes de la cuenta compartida e invita nuevos miembros por email o telefono."
      familyName={data.family.name}
      title="Cuenta familiar"
      childrenAfterHeader={
        <section className="dashboard-grid">
          <SummaryCard
            description="Integrantes activos dentro de esta familia."
            label="Miembros"
            tone="primary"
            value={String(data.members.length)}
          />
          <SummaryCard
            description="Invitaciones pendientes o listas para aceptar."
            label="Invitaciones activas"
            tone="warning"
            value={String(data.activeInvitationsCount)}
          />
          <SummaryCard
            description="Tu rol actual dentro de la cuenta familiar."
            label="Tu rol"
            tone={data.role === "ADMIN" ? "good" : "neutral"}
            value={data.role}
          />
        </section>
      }
    >
      {created ? (
        <div className={`feedback ${delivery === "failed" ? "warning" : "success"}`}>
          {delivery === "sent"
            ? "La invitacion se creo y el correo ya fue enviado automaticamente."
            : delivery === "phone"
              ? "La invitacion por telefono se creo correctamente."
              : "La invitacion se creo correctamente."}
        </div>
      ) : null}
      {notice ? (
        <div className={`feedback ${delivery === "failed" || delivery === "manual" ? "warning" : "success"}`}>
          {notice}
        </div>
      ) : null}
      {familyUpdated ? (
        <div className="feedback success">
          El nombre de la familia se actualizo correctamente.
        </div>
      ) : null}
      {deleted ? (
        <div className="feedback success">
          La invitacion se elimino correctamente y ese enlace ya no se puede usar.
        </div>
      ) : null}
      {memberRemoved ? (
        <div className="feedback success">
          El miembro fue eliminado de la familia correctamente.
        </div>
      ) : null}
      {accepted ? (
        <div className="feedback success">
          La invitacion se acepto correctamente y el miembro ya comparte esta cuenta.
        </div>
      ) : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <section className="dashboard-columns">
        <div className="module-stack">
          <article className="dashboard-panel">
            <div className="panel-head">
              <div>
                <h2>Crear o editar familia</h2>
                <p>
                  Este nombre es el que se muestra en el dashboard y en las
                  invitaciones compartidas.
                </p>
              </div>
            </div>

            {data.role === "ADMIN" ? (
              <form action="/familia/update" className="income-form" method="post">
                <input name="returnTo" type="hidden" value="/familia" />
                <label>
                  Nombre familiar
                  <input defaultValue={data.family.name} name="name" required type="text" />
                </label>
                <button className="primary-button" type="submit">
                  Guardar nombre
                </button>
              </form>
            ) : (
              <div className="empty-state">
                Solo un administrador puede cambiar el nombre de la familia.
              </div>
            )}
          </article>

          <article className="dashboard-panel">
            <div className="panel-head">
              <div>
                <h2>Invitar por email</h2>
                <p>
                  Si el proveedor de correo esta configurado, el email sale
                  automaticamente. Si no, la invitacion queda lista para
                  compartir manualmente.
                </p>
              </div>
            </div>

            {data.role === "ADMIN" ? (
              <form action="/familia/invitations/create" className="income-form" method="post">
                <input name="method" type="hidden" value="EMAIL" />
                <input name="returnTo" type="hidden" value="/familia" />

                <label>
                  Email del integrante
                  <input
                    autoComplete="email"
                    name="email"
                    placeholder="familiar@ejemplo.com"
                    required
                    type="email"
                  />
                </label>

                <div className="income-form-row">
                  <label>
                    Rol
                    <select defaultValue="MEMBER" name="role">
                      <option value="MEMBER">Miembro</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </label>

                  <label>
                    Mensaje
                    <input name="message" placeholder="Mensaje opcional" type="text" />
                  </label>
                </div>

                <button className="primary-button" type="submit">
                  Crear invitacion por email
                </button>
              </form>
            ) : (
              <div className="empty-state">
                Solo un administrador puede crear invitaciones nuevas.
              </div>
            )}
          </article>

          <article className="dashboard-panel">
            <div className="panel-head">
              <div>
                <h2>Invitar por telefono</h2>
                <p>
                  Genera un link para compartir por WhatsApp o SMS con el numero
                  del familiar.
                </p>
              </div>
            </div>

            {data.role === "ADMIN" ? (
              <form action="/familia/invitations/create" className="income-form" method="post">
                <input name="method" type="hidden" value="PHONE" />
                <input name="returnTo" type="hidden" value="/familia" />

                <label>
                  Telefono
                  <input
                    name="phone"
                    placeholder="+54 9 351 1234567"
                    required
                    type="tel"
                  />
                </label>

                <div className="income-form-row">
                  <label>
                    Rol
                    <select defaultValue="MEMBER" name="role">
                      <option value="MEMBER">Miembro</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </label>

                  <label>
                    Mensaje
                    <input name="message" placeholder="Mensaje opcional" type="text" />
                  </label>
                </div>

                <button className="primary-button" type="submit">
                  Crear invitacion por telefono
                </button>
              </form>
            ) : (
              <div className="empty-state">
                Solo un administrador puede crear invitaciones nuevas.
              </div>
            )}
          </article>

          <article className="timeline-card">
            <div className="panel-head">
              <div>
                <h2>Miembros actuales</h2>
                <p>Quienes ya comparten la cuenta familiar.</p>
              </div>
            </div>

            {data.members.map((member) => (
              <div className="timeline-row" key={member.id}>
                <div>
                  <strong>{member.fullName}</strong>
                  <span>{member.email}</span>
                </div>
                <div
                  className={`timeline-amount ${
                    data.role === "ADMIN" && member.id !== data.currentUserId
                      ? "timeline-row-actions"
                      : ""
                  }`}
                >
                  <span className="status-chip status-neutral">{member.role}</span>
                  {member.joinedAt ? (
                    <span className="row-note">
                      Desde {formatLongDate(member.joinedAt.slice(0, 10))}
                    </span>
                  ) : null}
                  {data.role === "ADMIN" && member.id !== data.currentUserId ? (
                    <form action="/familia/members/remove" method="post">
                      <input name="returnTo" type="hidden" value="/familia" />
                      <input
                        name="memberUserId"
                        type="hidden"
                        value={member.id}
                      />
                      <button className="secondary-button destructive-button" type="submit">
                        Eliminar miembro
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </article>
        </div>

        <article className="timeline-card">
          <div className="panel-head">
            <div>
              <h2>Invitaciones generadas</h2>
              <p>
                Cada invitacion incluye un enlace de aceptacion. Puedes
                reenviarlo por email, WhatsApp o SMS.
              </p>
            </div>
          </div>

          {data.invitations.length > 0 ? (
            data.invitations.map((invitation) => {
              const links = buildInvitationShareLinks(invitation, data.family.name);

              return (
                <article className="invite-card" key={invitation.id}>
                  <div className="invite-card-head">
                    <div>
                      <strong>
                        {invitation.method === "EMAIL"
                          ? invitation.email
                          : invitation.phone}
                      </strong>
                      <span>
                        {invitation.method} · {invitation.role} ·{" "}
                        {invitationState(
                          invitation.expiresAt,
                          invitation.acceptedAt,
                          invitation.revokedAt,
                          data.currentTimestampIso,
                        )}
                      </span>
                    </div>
                    <span className="status-chip status-neutral">
                      Vence {formatLongDate(invitation.expiresAt.slice(0, 10))}
                    </span>
                  </div>

                  {invitation.message ? (
                    <p className="row-note">{invitation.message}</p>
                  ) : null}

                  <div className="invite-link-box">
                    <span>Enlace de aceptacion</span>
                    <a href={links.acceptUrl}>{links.acceptUrl}</a>
                  </div>

                  <div className="invite-actions">
                    {links.mailtoHref ? (
                      <a
                        className="secondary-button"
                        href={links.mailtoHref}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Abrir email
                      </a>
                    ) : null}
                    {links.whatsappHref ? (
                      <a
                        className="secondary-button"
                        href={links.whatsappHref}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Enviar por WhatsApp
                      </a>
                    ) : null}
                    {links.smsHref ? (
                      <a className="secondary-button" href={links.smsHref}>
                        Enviar por SMS
                      </a>
                    ) : null}
                    <a
                      className="secondary-button"
                      href={links.acceptUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Ver invitacion
                    </a>
                    {!invitation.acceptedAt ? (
                      <form
                        action="/familia/invitations/revoke"
                        method="post"
                      >
                        <input name="returnTo" type="hidden" value="/familia" />
                        <input
                          name="invitationId"
                          type="hidden"
                          value={invitation.id}
                        />
                        <button className="secondary-button destructive-button" type="submit">
                          Eliminar invitacion
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty-state">
              Todavia no hay invitaciones generadas para esta familia.
            </div>
          )}
        </article>
      </section>
    </ProtectedShell>
  );
}
