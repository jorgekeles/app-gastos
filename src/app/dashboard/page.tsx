import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { formatMoney, formatShortDate, getDashboardData } from "@/lib/app-db";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const defaultIncomeDate = new Date().toISOString().slice(0, 10);

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dashboardData = await getDashboardData(user);
  const params = (await searchParams) ?? {};
  const incomeCreated = params["incomeCreated"] === "1";
  const incomeError =
    typeof params["incomeError"] === "string" ? params["incomeError"] : null;
  const monthIncomeTotalLabel = formatMoney(
    dashboardData.monthIncomeTotal,
    dashboardData.family.baseCurrency,
  );
  const donutBackground =
    dashboardData.monthIncomeTotal > 0
      ? "conic-gradient(var(--primary) 0 100%)"
      : "conic-gradient(var(--border) 0 100%)";

  return (
    <main className="app-shell dashboard-layout">
      <header className="site-header">
        <BrandLogo caption="Tu espacio financiero familiar ya puede cargar ingresos." href="/" />

        <form action="/auth/signout" className="signout-form" method="post">
          <button className="ghost-button" type="submit">
            Cerrar sesion
          </button>
        </form>
      </header>

      <section className="dashboard-head">
        <div>
          <div className="eyebrow">Resumen financiero familiar</div>
          <h1>Hola, {dashboardData.fullName}.</h1>
          <p>
            Ya dejamos operativo el primer modulo real: tu familia se crea
            automaticamente y desde aca podes registrar ingresos en ARS o USD.
          </p>
        </div>

        <div className="dashboard-topline">
          <span className="status-badge status-primary">
            {dashboardData.family.name}
          </span>
          <span className="status-badge status-accent">
            Moneda base {dashboardData.family.baseCurrency}
          </span>
          <span className="status-badge status-warning">
            {dashboardData.monthIncomeCount} ingresos este mes
          </span>
        </div>
      </section>

      {incomeCreated ? (
        <div className="feedback success">
          El ingreso se guardo correctamente y ya impacta en tu resumen.
        </div>
      ) : null}

      {incomeError ? <div className="feedback error">{incomeError}</div> : null}

      <section className="dashboard-grid">
        <SummaryCard
          description="Convertidos y consolidados en la moneda de la familia."
          label="Ingresos del mes"
          tone="primary"
          value={monthIncomeTotalLabel}
        />
        <SummaryCard
          description="Cantidad de movimientos de ingreso cargados en el mes actual."
          label="Ingresos cargados"
          tone="warning"
          value={String(dashboardData.monthIncomeCount)}
        />
        <SummaryCard
          description="Todavia no activamos el modulo de ahorro. Por ahora queda en cero."
          label="Ahorro reservado"
          tone="good"
          value={formatMoney(0, dashboardData.family.baseCurrency)}
        />
        <SummaryCard
          description="El modulo de egresos y cuotas es el siguiente paso para completar el flujo."
          label="Comprometido futuro"
          tone="danger"
          value={formatMoney(0, dashboardData.family.baseCurrency)}
        />
        <SummaryCard
          description="Por ahora coincide con tus ingresos, porque todavia no cargaste egresos."
          label="Disponible real"
          tone="good"
          value={monthIncomeTotalLabel}
        />
      </section>

      <section className="dashboard-columns">
        <article className="dashboard-panel">
          <h2>Cargar ingreso</h2>
          <p>
            Este bloque ya guarda datos reales en tu base. Si el ingreso esta en
            USD, completa la cotizacion que queres usar para convertirlo a ARS.
          </p>

          <form action="/dashboard/incomes" className="income-form" method="post">
            <label>
              Nombre del ingreso
              <input
                name="title"
                placeholder="Sueldo, freelance, venta, reintegro..."
                required
                type="text"
              />
            </label>

            <div className="income-form-row">
              <label>
                Monto
                <input
                  min="0.01"
                  name="amountOriginal"
                  placeholder="150000"
                  required
                  step="0.01"
                  type="number"
                />
              </label>

              <label>
                Moneda
                <select defaultValue="ARS" name="currency">
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>

            <div className="income-form-row">
              <label>
                Fecha
                <input
                  defaultValue={defaultIncomeDate}
                  name="transactionDate"
                  required
                  type="date"
                />
              </label>

              <label>
                Categoria
                <input name="category" placeholder="Trabajo, ventas, extra..." type="text" />
              </label>
            </div>

            <label>
              Cotizacion a ARS
              <input
                min="0"
                name="fxRateUsed"
                placeholder="Solo si el ingreso esta en USD"
                step="0.000001"
                type="number"
              />
            </label>

            <label>
              Notas
              <textarea
                name="notes"
                placeholder="Detalle opcional para recordar de donde vino este ingreso."
                rows={4}
              />
            </label>

            <div className="income-form-actions">
              <button className="primary-button" type="submit">
                Guardar ingreso
              </button>
              <span className="form-helper">
                Los ingresos en ARS no necesitan cotizacion.
              </span>
            </div>
          </form>
        </article>

        <div className="timeline-list">
          <article className="timeline-card">
            <h2>Ultimos ingresos</h2>
            {dashboardData.recentIncomes.length > 0 ? (
              dashboardData.recentIncomes.map((income) => (
                <div className="timeline-row" key={income.id}>
                  <div>
                    <strong>{income.title}</strong>
                    <span>
                      {income.category ?? "Sin categoria"} ·{" "}
                      {formatShortDate(income.transactionDate)}
                    </span>
                  </div>
                  <div className="timeline-amount">
                    <strong>
                      {formatMoney(income.amountOriginal, income.currency)}
                    </strong>
                    <span className="timeline-tag timeline-tag-income">
                      Base {formatMoney(
                        income.amountBaseSnapshot,
                        dashboardData.family.baseCurrency,
                      )}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                Todavia no hay ingresos guardados. Carga el primero desde el
                formulario de la izquierda.
              </div>
            )}
          </article>

          <article className="note-card">
            <h2>Distribucion del mes</h2>
            <p className="note-quote">
              Este grafico ya refleja tu ingreso real mensual. A medida que
              agreguemos egresos y ahorro, se va a repartir entre los tres
              segmentos.
            </p>

            <div className="donut-shell">
              <div className="donut" style={{ background: donutBackground }}>
                <div className="donut-center">
                  <strong>{monthIncomeTotalLabel}</strong>
                  <span>Ingreso total del mes</span>
                </div>
              </div>
            </div>

            <span className="note-author">
              Disponible actual: {monthIncomeTotalLabel}
            </span>
          </article>
        </div>
      </section>
    </main>
  );
}
