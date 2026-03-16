import { ProtectedShell } from "@/components/app/protected-shell";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { getAccountPageData } from "@/lib/app-db";
import { requireAuthUser } from "@/lib/server-auth";

type AccountPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const user = await requireAuthUser();
  const data = await getAccountPageData(user);
  const params = (await searchParams) ?? {};
  const passwordUpdated = params["passwordUpdated"] === "1";
  const error = typeof params["error"] === "string" ? params["error"] : null;

  return (
    <ProtectedShell
      baseCurrency={data.family.baseCurrency}
      currentPath="/cuenta"
      description="Gestiona tus datos de acceso y cambia la contrasena de esta cuenta cuando lo necesites."
      familyName={data.family.name}
      title="Tu cuenta"
      childrenAfterHeader={
        <section className="dashboard-grid">
          <SummaryCard
            description="Correo principal usado para entrar a la app."
            label="Email"
            tone="primary"
            value={data.email}
          />
          <SummaryCard
            description="Nombre visible dentro de la cuenta familiar."
            label="Nombre"
            tone="good"
            value={data.fullName}
          />
          <SummaryCard
            description="Permiso actual dentro de la familia activa."
            label="Rol"
            tone="warning"
            value={data.role}
          />
        </section>
      }
    >
      {passwordUpdated ? (
        <div className="feedback success">
          La contrasena se actualizo correctamente.
        </div>
      ) : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <section className="dashboard-columns">
        <article className="dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>Cambiar contrasena</h2>
              <p>
                El cambio se aplica de inmediato sobre tu sesion actual.
              </p>
            </div>
          </div>

          <form action="/cuenta/password" className="income-form" method="post">
            <input name="returnTo" type="hidden" value="/cuenta" />

            <label>
              Nueva contrasena
              <input
                autoComplete="new-password"
                minLength={8}
                name="newPassword"
                placeholder="Minimo 8 caracteres"
                required
                type="password"
              />
            </label>

            <label>
              Repetir nueva contrasena
              <input
                autoComplete="new-password"
                minLength={8}
                name="confirmNewPassword"
                placeholder="Repite la nueva contrasena"
                required
                type="password"
              />
            </label>

            <div className="income-form-actions">
              <button className="primary-button" type="submit">
                Guardar nueva contrasena
              </button>
            </div>
          </form>
        </article>

        <article className="timeline-card">
          <div className="panel-head">
            <div>
              <h2>Acceso actual</h2>
              <p>Resumen rapido de la cuenta que estas usando ahora.</p>
            </div>
          </div>

          <div className="account-meta-grid">
            <div>
              <span className="admin-label">Familia activa</span>
              <strong>{data.family.name}</strong>
            </div>
            <div>
              <span className="admin-label">Moneda base</span>
              <strong>{data.family.baseCurrency}</strong>
            </div>
            <div>
              <span className="admin-label">Visualizacion</span>
              <strong>{data.family.defaultDisplayCurrency}</strong>
            </div>
          </div>

          <div className="empty-state">
            Si desactivas la verificacion por correo en Supabase, las cuentas nuevas
            van a entrar directamente sin esperar un email de confirmacion.
          </div>
        </article>
      </section>
    </ProtectedShell>
  );
}
