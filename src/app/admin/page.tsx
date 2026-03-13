import Link from "next/link";
import { ProtectedShell } from "@/components/app/protected-shell";
import { SummaryCard } from "@/components/dashboard/summary-card";
import {
  formatLongDate,
  getAdminConsoleData,
} from "@/lib/app-db";
import { requireAdminConsoleUser } from "@/lib/server-auth";

function formatUsageDate(value: string | null) {
  if (!value) {
    return "Sin actividad registrada";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminPage() {
  const user = await requireAdminConsoleUser();
  const data = await getAdminConsoleData(user);

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
        </section>
      }
    >
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
      </section>
    </ProtectedShell>
  );
}
