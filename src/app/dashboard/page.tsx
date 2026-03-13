import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const upcomingItems = [
  {
    title: "Luz",
    meta: "Vence el 14 de marzo",
    value: "ARS 78.000",
  },
  {
    title: "Cuota colegio",
    meta: "Vence el 18 de marzo",
    value: "ARS 210.000",
  },
  {
    title: "Notebook familiar",
    meta: "Cuota 3 de 12",
    value: "ARS 110.000",
  },
];

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName =
    user.user_metadata.full_name ??
    user.email?.split("@")[0] ??
    "Miembro familiar";

  return (
    <main className="app-shell dashboard-layout">
      <header className="site-header">
        <BrandLogo caption="Base deployable en Vercel" href="/" />

        <form action="/auth/signout" className="signout-form" method="post">
          <button className="ghost-button" type="submit">
            Cerrar sesion
          </button>
        </form>
      </header>

      <section className="dashboard-head">
        <div>
          <div className="eyebrow">Resumen financiero familiar</div>
          <h1>Hola, {fullName}.</h1>
          <p>
            Esta es la base del dashboard protegido. El siguiente paso es
            conectar familias, movimientos, ahorro y calendario con tus tablas
            reales en Supabase.
          </p>
        </div>

        <div className="dashboard-topline">
          <span className="status-badge status-primary">Familia activa</span>
          <span className="status-badge status-accent">Moneda ARS</span>
          <span className="status-badge status-warning">3 pagos cercanos</span>
        </div>
      </section>

      <section className="dashboard-grid">
        <SummaryCard
          description="Convertidos y consolidados en la moneda de la familia."
          label="Ingresos del mes"
          tone="primary"
          value="ARS 2.680.000"
        />
        <SummaryCard
          description="Incluye pagos ya hechos y pendientes del mes actual."
          label="Egresos del mes"
          tone="warning"
          value="ARS 813.000"
        />
        <SummaryCard
          description="Fondos reservados para objetivos familiares."
          label="Ahorro reservado"
          tone="good"
          value="ARS 342.000"
        />
        <SummaryCard
          description="Cuotas e internet proyectados para meses siguientes."
          label="Comprometido futuro"
          tone="danger"
          value="ARS 1.395.000"
        />
        <SummaryCard
          description="Dinero realmente libre despues de ahorro y egresos."
          label="Disponible real"
          tone="good"
          value="ARS 1.525.000"
        />
      </section>

      <section className="dashboard-columns">
        <article className="dashboard-panel">
          <h2>Distribucion del mes</h2>
          <p>
            Para la pantalla inicial conviene combinar tarjetas arriba con un
            donut que represente como se reparte el ingreso entre egresos,
            ahorro y disponible.
          </p>

          <div className="donut-shell">
            <div className="donut">
              <div className="donut-center">
                <strong>ARS 2.680.000</strong>
                <span>Ingreso total del mes</span>
              </div>
            </div>
          </div>

          <div className="donut-legend">
            <div className="legend-item">
              <div className="legend-label">
                <span className="legend-dot expenses" />
                <span>Egresos</span>
              </div>
              <div className="legend-value">
                <strong>30,3%</strong>
                <span>ARS 813.000</span>
              </div>
            </div>

            <div className="legend-item">
              <div className="legend-label">
                <span className="legend-dot savings" />
                <span>Ahorro reservado</span>
              </div>
              <div className="legend-value">
                <strong>12,8%</strong>
                <span>ARS 342.000</span>
              </div>
            </div>

            <div className="legend-item">
              <div className="legend-label">
                <span className="legend-dot available" />
                <span>Disponible</span>
              </div>
              <div className="legend-value">
                <strong>56,9%</strong>
                <span>ARS 1.525.000</span>
              </div>
            </div>
          </div>
        </article>

        <div className="timeline-list">
          <article className="timeline-card">
            <h2>Proximos vencimientos</h2>
            {upcomingItems.map((item) => (
              <div className="timeline-row" key={item.title}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                </div>
                <div className="timeline-amount">
                  <strong>{item.value}</strong>
                  <span className="timeline-tag">Pendiente</span>
                </div>
              </div>
            ))}
          </article>

          <article className="note-card">
            <h2>Ultima nota familiar</h2>
            <p className="note-quote">
              “La cuota del colegio vence el 18 y la notebook el 20. Prioridad
              esta semana.”
            </p>
            <span className="note-author">Luis Ruiz · 10/03 19:45</span>
          </article>
        </div>
      </section>
    </main>
  );
}
