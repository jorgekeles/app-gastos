import Link from "next/link";
import { redirect } from "next/navigation";
import { ProtectedShell } from "@/components/app/protected-shell";
import { SummaryCard } from "@/components/dashboard/summary-card";
import {
  formatAmountNumber,
  formatLongDate,
  formatMoney,
  formatShortDate,
  getCurrentBlueRate,
  getDashboardData,
} from "@/lib/app-db";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function buildDonutBackground(expenses: number, savings: number, available: number) {
  const total = expenses + savings + available;

  if (total <= 0) {
    return "conic-gradient(var(--border) 0 100%)";
  }

  const expensesEnd = (expenses / total) * 100;
  const savingsEnd = expensesEnd + (savings / total) * 100;

  return `conic-gradient(
    var(--warning) 0 ${expensesEnd}%,
    var(--accent) ${expensesEnd}% ${savingsEnd}%,
    var(--primary) ${savingsEnd}% 100%
  )`;
}

function percentLabel(value: number, total: number) {
  if (total <= 0) {
    return "0%";
  }

  return `${((value / total) * 100).toFixed(1)}%`;
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dashboardData = await getDashboardData(user);
  const blueRate = await getCurrentBlueRate().catch(() => null);
  const monthSavingsSlice = Math.max(dashboardData.monthSavingsNet, 0);
  const monthAvailableSlice = Math.max(
    dashboardData.monthIncomeTotal -
      dashboardData.monthExpenseTotal -
      monthSavingsSlice,
    0,
  );
  const donutTotal =
    dashboardData.monthExpenseTotal + monthSavingsSlice + monthAvailableSlice;
  const donutBackground = buildDonutBackground(
    dashboardData.monthExpenseTotal,
    monthSavingsSlice,
    monthAvailableSlice,
  );

  return (
    <ProtectedShell
      baseCurrency={dashboardData.family.baseCurrency}
      currentPath="/dashboard"
      description={`Estas viendo ${dashboardData.family.name}. El resumen actual corresponde a ${dashboardData.monthLabel}.`}
      familyName={dashboardData.family.name}
      title={`Hola, ${dashboardData.fullName}.`}
      childrenAfterHeader={
        <section className="dashboard-grid">
          <SummaryCard
            description={`Solo incluye movimientos fechados dentro de ${dashboardData.monthLabel}.`}
            label={`Ingresos de ${dashboardData.monthLabel}`}
            tone="primary"
            value={
              <span className="summary-split-value">
                <span>ARS {formatAmountNumber(dashboardData.monthIncomeArsOriginal)}</span>
                <span>USD {formatAmountNumber(dashboardData.monthIncomeUsdOriginal)}</span>
                <small>
                  Base {formatMoney(
                    dashboardData.monthIncomeTotal,
                    dashboardData.family.baseCurrency,
                  )}
                </small>
              </span>
            }
          />
          <SummaryCard
            description="Incluye reales, pendientes y proyectados del mes actual."
            label="Egresos del mes"
            tone="warning"
            value={formatMoney(
              dashboardData.monthExpenseTotal,
              dashboardData.family.baseCurrency,
            )}
          />
          <SummaryCard
            description="Saldo total reservado en objetivos de ahorro."
            label="Ahorro reservado"
            tone="good"
            value={formatMoney(
              dashboardData.savingsReservedTotal,
              dashboardData.family.baseCurrency,
            )}
          />
          <SummaryCard
            description="Cuotas y gastos pendientes posteriores a hoy."
            label="Comprometido futuro"
            tone="danger"
            value={formatMoney(
              dashboardData.committedFuture,
              dashboardData.family.baseCurrency,
            )}
          />
          <SummaryCard
            description="Ingresos totales menos egresos pagados y ahorro reservado."
            label="Disponible real"
            tone={dashboardData.availableReal >= 0 ? "good" : "danger"}
            value={formatMoney(
              dashboardData.availableReal,
              dashboardData.family.baseCurrency,
            )}
          />
        </section>
      }
    >
      <section className="dashboard-columns">
        <div className="module-stack">
          <article className="dashboard-panel">
            <div className="panel-head">
              <div>
                <h2>Distribucion del mes</h2>
                <p>
                  El grafico reparte el ingreso mensual entre egresos,
                  ahorro del mes y disponible remanente.
                </p>
              </div>
            </div>

            <div className="donut-layout">
              <div className="donut-shell">
                <div className="donut" style={{ background: donutBackground }}>
                  <div className="donut-center">
                    <strong>
                      {formatMoney(
                        dashboardData.availableReal,
                        dashboardData.family.baseCurrency,
                      )}
                    </strong>
                    <span>Disponible real</span>
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
                    <strong>
                      {formatMoney(
                        dashboardData.monthExpenseTotal,
                        dashboardData.family.baseCurrency,
                      )}
                    </strong>
                    <span>
                      {percentLabel(dashboardData.monthExpenseTotal, donutTotal)}
                    </span>
                  </div>
                </div>

                <div className="legend-item">
                  <div className="legend-label">
                    <span className="legend-dot savings" />
                    <span>Ahorro del mes</span>
                  </div>
                  <div className="legend-value">
                    <strong>
                      {formatMoney(
                        monthSavingsSlice,
                        dashboardData.family.baseCurrency,
                      )}
                    </strong>
                    <span>{percentLabel(monthSavingsSlice, donutTotal)}</span>
                  </div>
                </div>

                <div className="legend-item">
                  <div className="legend-label">
                    <span className="legend-dot available" />
                    <span>Disponible mensual</span>
                  </div>
                  <div className="legend-value">
                    <strong>
                      {formatMoney(
                        monthAvailableSlice,
                        dashboardData.family.baseCurrency,
                      )}
                    </strong>
                    <span>{percentLabel(monthAvailableSlice, donutTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="panel-head">
              <div>
                <h2>Accesos rapidos</h2>
                <p>
                  Cada modulo ya tiene formulario real y queda guardado en tu
                  base de datos.
                </p>
              </div>
            </div>

            <div className="quick-links-grid">
              <Link className="quick-link-card" href="/ingresos">
                <strong>Ingresos</strong>
                <span>Cargar entradas de dinero y revisar historial.</span>
              </Link>
              <Link className="quick-link-card" href="/egresos">
                <strong>Egresos</strong>
                <span>Registrar gastos, cuotas y recurrencias.</span>
              </Link>
              <Link className="quick-link-card" href="/ahorro">
                <strong>Ahorro</strong>
                <span>Crear objetivos y movimientos reservados.</span>
              </Link>
              <Link className="quick-link-card" href="/notas">
                <strong>Notas</strong>
                <span>Dejar mensajes internos para la familia.</span>
              </Link>
              <Link className="quick-link-card" href="/calendario">
                <strong>Calendario</strong>
                <span>Ver el mes consolidado con ingresos y egresos.</span>
              </Link>
              <Link className="quick-link-card" href="/familia">
                <strong>Familia</strong>
                <span>Invitar miembros y administrar accesos compartidos.</span>
              </Link>
            </div>
            {blueRate ? (
              <span className="note-author">
                Dolar blue automatico: {formatMoney(blueRate.rate, "ARS")}
              </span>
            ) : null}
          </article>
        </div>

        <div className="module-stack">
          <article className="timeline-card">
            <div className="panel-head">
              <div>
                <h2>Proximos vencimientos</h2>
                <p>Pagos pendientes u obligatorios de los proximos dias.</p>
              </div>
            </div>

            {dashboardData.upcomingExpenses.length > 0 ? (
              dashboardData.upcomingExpenses.map((expense) => (
                <div className="timeline-row" key={expense.id}>
                  <div>
                    <strong>{expense.title}</strong>
                    <span>
                      {expense.category ?? expense.expenseKind} ·{" "}
                      {formatShortDate(expense.dueDate)}
                    </span>
                  </div>
                  <div className="timeline-amount">
                    <strong>
                      {formatMoney(
                        expense.amountOriginal,
                        expense.currency,
                      )}
                    </strong>
                    <span className="timeline-tag">
                      {expense.paymentStatus}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                Todavia no hay vencimientos pendientes cargados para la
                familia.
              </div>
            )}
          </article>

          <article className="timeline-card">
            <div className="panel-head">
              <div>
                <h2>Ultimos ingresos</h2>
                <p>
                  Movimientos recientes de distintos meses. El resumen superior
                  solo toma {dashboardData.monthLabel}.
                </p>
              </div>
            </div>

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
                      Base{" "}
                      {formatMoney(
                        income.amountBaseSnapshot,
                        dashboardData.family.baseCurrency,
                      )}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                Aun no hay ingresos. Podes cargar el primero desde el modulo de
                ingresos.
              </div>
            )}
          </article>

          <article className="note-card">
            <div className="panel-head">
              <div>
                <h2>Ultimo mensaje familiar</h2>
                <p>La nota interna mas reciente siempre queda visible aca.</p>
              </div>
            </div>

            {dashboardData.lastNote ? (
              <>
                <p className="note-quote">“{dashboardData.lastNote.content}”</p>
                <span className="note-author">
                  {dashboardData.lastNote.authorName} ·{" "}
                  {formatLongDate(dashboardData.lastNote.createdAt.slice(0, 10))}
                </span>
              </>
            ) : (
              <div className="empty-state">
                Todavia no dejaron notas. Desde el modulo de notas podes guardar
                recordatorios, acuerdos o mensajes internos.
              </div>
            )}
          </article>
        </div>
      </section>
    </ProtectedShell>
  );
}
