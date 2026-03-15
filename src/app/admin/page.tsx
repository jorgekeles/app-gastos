import Link from "next/link";
import { ProtectedShell } from "@/components/app/protected-shell";
import { SummaryCard } from "@/components/dashboard/summary-card";
import {
  formatLongDate,
  getAdminConsoleData,
} from "@/lib/app-db";
import { requireAdminConsoleUser } from "@/lib/server-auth";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatUsageDate(value: string | null) {
  if (!value) {
    return "Sin actividad registrada";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function signupStatusLabel(value: string) {
  switch (value) {
    case "CONFIRMED":
      return "Confirmado";
    case "PENDING_CONFIRMATION":
      return "Pendiente de confirmacion";
    case "INSTANT_SESSION":
      return "Creado e ingreso";
    case "REJECTED":
      return "Rechazado";
    case "INVALID_PAYLOAD":
      return "Payload invalido";
    default:
      return value;
  }
}

function signupStatusTone(value: string) {
  switch (value) {
    case "CONFIRMED":
    case "INSTANT_SESSION":
      return "status-accent";
    case "PENDING_CONFIRMATION":
      return "status-primary";
    case "REJECTED":
    case "INVALID_PAYLOAD":
      return "status-warning";
    default:
      return "status-neutral";
  }
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const user = await requireAdminConsoleUser();
  const data = await getAdminConsoleData(user);
  const params = (await searchParams) ?? {};
  const deleted = params["deleted"] === "1";
  const deletedFamily =
    typeof params["deletedFamily"] === "string" ? params["deletedFamily"] : null;
  const error = typeof params["error"] === "string" ? params["error"] : null;

  return (
    <ProtectedShell
      baseCurrency="ARS / USD"
      currentPath="/admin"
      description="Panel interno para revisar adopcion de la app, cuentas creadas y uso reciente por familia."
      familyName="Backoffice AppGastos"
      title={`Admin · ${data.adminName}`}
      childrenAfterHeader={
        <section className="dashboard-grid">
          <SummaryCard
            description="Espacios familiares creados dentro de AppGastos."
            label="Cuentas creadas"
            tone="primary"
            value={String(data.totalFamilies)}
          />
          <SummaryCard
            description="Miembros activos sumando todas las familias."
            label="Miembros activos"
            tone="good"
            value={String(data.totalMembers)}
          />
          <SummaryCard
            description="Familias con uso registrado en los ultimos 7 dias."
            label="Uso reciente"
            tone="warning"
            value={String(data.activeFamiliesLast7Days)}
          />
          <SummaryCard
            description="Usuarios cargados en la base interna de la app."
            label="Usuarios"
            tone="neutral"
            value={String(data.totalUsers)}
          />
          <SummaryCard
            description="Intentos de creacion de cuenta registrados por la app."
            label="Intentos signup"
            tone="warning"
            value={String(data.signupAttemptsCount)}
          />
        </section>
      }
    >
      {deleted && deletedFamily ? (
        <div className="feedback success">
          La cuenta familiar <strong>{deletedFamily}</strong> se elimino correctamente.
        </div>
      ) : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <section className="dashboard-columns">
        <article className="timeline-card">
          <div className="panel-head">
            <div>
              <h2>Familias registradas</h2>
              <p>
                Cada cuenta arranca en version <strong>TRIAL</strong> y, por
                ahora, sin fecha de vencimiento.
              </p>
            </div>
          </div>

          {data.families.length > 0 ? (
            data.families.map((family) => (
              <article className="admin-family-card" key={family.id}>
                <div className="admin-family-head">
                  <div>
                    <strong>{family.name}</strong>
                    <span>
                      Creada el {formatLongDate(family.createdAt.slice(0, 10))}
                    </span>
                  </div>
                  <div className="invite-actions">
                    <span className="status-chip status-primary">
                      {family.version}
                    </span>
                    <span className="status-chip status-accent">
                      Sin vencimiento
                    </span>
                    <form action="/admin/families/delete" method="post">
                      <input name="returnTo" type="hidden" value="/admin" />
                      <input name="familyId" type="hidden" value={family.id} />
                      <button className="secondary-button destructive-button" type="submit">
                        Eliminar cuenta
                      </button>
                    </form>
                  </div>
                </div>

                <div className="admin-family-grid">
                  <div>
                    <span className="admin-label">Administrador creador</span>
                    <strong>{family.createdByName}</strong>
                    <span>{family.createdByEmail}</span>
                  </div>

                  <div>
                    <span className="admin-label">Miembros activos</span>
                    <strong>{family.membersCount}</strong>
                    <span>
                      Invitaciones activas: {family.activeInvitationsCount}
                    </span>
                  </div>

                  <div>
                    <span className="admin-label">Ultimo uso</span>
                    <strong>{formatUsageDate(family.lastActivityAt)}</strong>
                    <span>{family.slug}</span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              Todavia no hay familias registradas en la aplicacion.
            </div>
          )}
        </article>

        <div className="module-stack">
          <article className="timeline-card">
            <div className="panel-head">
              <div>
                <h2>Intentos de registro</h2>
                <p>Quien intento crear cuenta y en que estado quedo.</p>
              </div>
            </div>

            {data.signupAttempts.length > 0 ? (
              data.signupAttempts.map((attempt) => (
                <div className="timeline-row" key={attempt.id}>
                  <div>
                    <strong>
                      {attempt.fullName || "Sin nombre"} · {attempt.email || "Sin email"}
                    </strong>
                    <span>{formatUsageDate(attempt.attemptedAt)}</span>
                    {attempt.errorMessage ? (
                      <span className="row-note">{attempt.errorMessage}</span>
                    ) : null}
                    {attempt.ipAddress ? (
                      <span className="row-note">IP: {attempt.ipAddress}</span>
                    ) : null}
                  </div>
                  <div className="timeline-amount">
                    <span className={`status-chip ${signupStatusTone(attempt.status)}`}>
                      {signupStatusLabel(attempt.status)}
                    </span>
                    {attempt.confirmedAt ? (
                      <span className="row-note">
                        Confirmado {formatUsageDate(attempt.confirmedAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                Todavia no hay intentos de registro guardados en la app.
              </div>
            )}
          </article>

          <article className="dashboard-panel">
            <div className="panel-head">
              <div>
                <h2>Notas del panel</h2>
                <p>
                  Este espacio te deja ver rapidamente si la app se esta usando y
                  cuantas cuentas familiares tenes vivas.
                </p>
              </div>
            </div>

            <div className="empty-state admin-notes">
              <p>
                La version mostrada ahora es fija: <strong>TRIAL</strong>.
              </p>
              <p>No hay vencimiento configurado para ninguna familia.</p>
              <p>
                Si mas adelante queres planes pagos o trial con fecha, el
                siguiente paso es agregar una tabla de suscripciones.
              </p>
              <Link className="secondary-button" href="/dashboard">
                Volver al dashboard
              </Link>
            </div>
          </article>
        </div>
      </section>
    </ProtectedShell>
  );
}
