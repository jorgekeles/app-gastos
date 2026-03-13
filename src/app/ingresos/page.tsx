import { ProtectedShell } from "@/components/app/protected-shell";
import { SummaryCard } from "@/components/dashboard/summary-card";
import {
  formatMoney,
  formatShortDate,
  getIncomesPageData,
  getTodayDate,
} from "@/lib/app-db";
import { requireAuthUser } from "@/lib/server-auth";

type IncomesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function IncomesPage({ searchParams }: IncomesPageProps) {
  const user = await requireAuthUser();
  const data = await getIncomesPageData(user);
  const params = (await searchParams) ?? {};
  const success = params["success"] === "1";
  const deleted = params["deleted"] === "1";
  const error = typeof params["error"] === "string" ? params["error"] : null;

  return (
    <ProtectedShell
      baseCurrency={data.family.baseCurrency}
      currentPath="/ingresos"
      description="Carga entradas de dinero en ARS o USD, conserva la cotizacion usada y revisa todo el historial de la familia."
      familyName={data.family.name}
      title="Ingresos"
      childrenAfterHeader={
        <section className="dashboard-grid">
          <SummaryCard
            description="Suma total de ingresos del mes actual."
            label="Ingresos del mes"
            tone="primary"
            value={formatMoney(data.monthIncomeTotal, data.family.baseCurrency)}
          />
          <SummaryCard
            description="Cantidad de ingresos cargados durante este mes."
            label="Movimientos del mes"
            tone="warning"
            value={String(data.monthIncomeCount)}
          />
          <SummaryCard
            description="Acumulado historico de ingresos en la familia."
            label="Ingresos acumulados"
            tone="good"
            value={formatMoney(data.allIncomeTotal, data.family.baseCurrency)}
          />
        </section>
      }
    >
      {success ? (
        <div className="feedback success">
          El ingreso se guardo correctamente.
        </div>
      ) : null}
      {deleted ? (
        <div className="feedback success">El ingreso se elimino del historial.</div>
      ) : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <section className="dashboard-columns">
        <article className="dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>Nuevo ingreso</h2>
              <p>
                Si el ingreso esta en USD, completá la cotizacion para que
                quede consolidado en la moneda base.
              </p>
            </div>
          </div>

          <form action="/ingresos/create" className="income-form" method="post">
            <input name="returnTo" type="hidden" value="/ingresos" />

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
                <input defaultValue={getTodayDate()} name="transactionDate" required type="date" />
              </label>

              <label>
                Categoria
                <input name="category" placeholder="Trabajo, ventas, extra..." type="text" />
              </label>
            </div>

            <label>
              Cotizacion a moneda base
              <input
                min="0"
                name="fxRateUsed"
                placeholder="Solo si el ingreso se carga en USD"
                step="0.000001"
                type="number"
              />
            </label>

            <label>
              Notas
              <textarea
                name="notes"
                placeholder="Detalle opcional del ingreso."
                rows={4}
              />
            </label>

            <div className="income-form-actions">
              <button className="primary-button" type="submit">
                Guardar ingreso
              </button>
            </div>
          </form>
        </article>

        <article className="timeline-card">
          <div className="panel-head">
            <div>
              <h2>Historial de ingresos</h2>
              <p>Todos los movimientos guardados para esta familia.</p>
            </div>
          </div>

          {data.incomes.length > 0 ? (
            data.incomes.map((income) => (
              <div className="timeline-row timeline-row-actions" key={income.id}>
                <div>
                  <strong>{income.title}</strong>
                  <span>
                    {income.category ?? "Sin categoria"} ·{" "}
                    {formatShortDate(income.transactionDate)}
                  </span>
                  {income.notes ? (
                    <span className="row-note">{income.notes}</span>
                  ) : null}
                </div>

                <div className="timeline-amount">
                  <strong>{formatMoney(income.amountOriginal, income.currency)}</strong>
                  <span className="timeline-tag timeline-tag-income">
                    Base {formatMoney(income.amountBaseSnapshot, data.family.baseCurrency)}
                  </span>
                  <form action="/ingresos/delete" method="post">
                    <input name="incomeId" type="hidden" value={income.id} />
                    <input name="returnTo" type="hidden" value="/ingresos" />
                    <button className="inline-danger-button" type="submit">
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              Todavia no hay ingresos guardados. Carga el primero desde el
              formulario.
            </div>
          )}
        </article>
      </section>
    </ProtectedShell>
  );
}
