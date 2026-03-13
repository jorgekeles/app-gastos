import { ProtectedShell } from "@/components/app/protected-shell";
import { SummaryCard } from "@/components/dashboard/summary-card";
import {
  formatMoney,
  formatShortDate,
  getExpensesPageData,
  getTodayDate,
  type ExpenseRow,
  type PaymentStatus,
} from "@/lib/app-db";
import { requireAuthUser } from "@/lib/server-auth";

type ExpensesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function deriveStatus(expense: ExpenseRow): PaymentStatus {
  if (
    expense.paymentStatus === "PENDING" &&
    expense.dueDate < getTodayDate()
  ) {
    return "OVERDUE";
  }

  return expense.paymentStatus;
}

function statusLabel(status: PaymentStatus) {
  switch (status) {
    case "PAID":
      return "Pagado";
    case "OVERDUE":
      return "Vencido";
    case "CANCELED":
      return "Cancelado";
    case "PENDING":
    default:
      return "Pendiente";
  }
}

export default async function ExpensesPage({
  searchParams,
}: ExpensesPageProps) {
  const user = await requireAuthUser();
  const data = await getExpensesPageData(user);
  const params = (await searchParams) ?? {};
  const success = params["success"] === "1";
  const updated = params["updated"] === "1";
  const deleted = params["deleted"] === "1";
  const error = typeof params["error"] === "string" ? params["error"] : null;

  return (
    <ProtectedShell
      baseCurrency={data.family.baseCurrency}
      currentPath="/egresos"
      description="Registra gastos unicos, recurrentes, financiados y en cuotas. El sistema genera las proyecciones futuras automaticamente."
      familyName={data.family.name}
      title="Egresos y compromisos"
      childrenAfterHeader={
        <section className="dashboard-grid">
          <SummaryCard
            description="Total consolidado de egresos del mes."
            label="Egresos del mes"
            tone="warning"
            value={formatMoney(data.monthExpenseTotal, data.family.baseCurrency)}
          />
          <SummaryCard
            description="Cantidad de egresos registrados o proyectados para este mes."
            label="Movimientos del mes"
            tone="danger"
            value={String(data.monthExpenseCount)}
          />
          <SummaryCard
            description="Cuotas y pagos futuros que siguen pendientes."
            label="Comprometido futuro"
            tone="danger"
            value={formatMoney(data.futureCommitted, data.family.baseCurrency)}
          />
          <SummaryCard
            description="Gastos pendientes cuya fecha ya paso."
            label="Vencidos"
            tone={data.overdueCount > 0 ? "danger" : "good"}
            value={String(data.overdueCount)}
          />
        </section>
      }
    >
      {success ? (
        <div className="feedback success">
          El egreso se guardo y ya impacta en el calendario y los resumenes.
        </div>
      ) : null}
      {updated ? (
        <div className="feedback success">
          El estado del egreso se actualizo correctamente.
        </div>
      ) : null}
      {deleted ? (
        <div className="feedback success">El egreso se elimino del listado.</div>
      ) : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <section className="dashboard-columns">
        <article className="dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>Nuevo egreso</h2>
              <p>
                Para cuotas o financiados completa total de cuotas y cuota
                actual. Para recurrentes elegi frecuencia y cantidad de
                ocurrencias futuras a generar.
              </p>
            </div>
          </div>

          <form action="/egresos/create" className="income-form" method="post">
            <input name="returnTo" type="hidden" value="/egresos" />

            <label>
              Nombre del egreso
              <input
                name="title"
                placeholder="Supermercado, alquiler, tarjeta, hipoteca..."
                required
                type="text"
              />
            </label>

            <div className="income-form-row">
              <label>
                Monto por movimiento
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
                Fecha de vencimiento o primer pago
                <input defaultValue={getTodayDate()} name="dueDate" required type="date" />
              </label>

              <label>
                Categoria
                <input name="category" placeholder="Hogar, salud, credito..." type="text" />
              </label>
            </div>

            <div className="income-form-row">
              <label>
                Tipo de gasto
                <select defaultValue="ONE_TIME" name="expenseKind">
                  <option value="ONE_TIME">Gasto unico</option>
                  <option value="RECURRING">Gasto recurrente</option>
                  <option value="CREDIT_CARD">Tarjeta de credito</option>
                  <option value="INSTALLMENT">Cuotas</option>
                  <option value="LOAN">Prestamo</option>
                  <option value="MORTGAGE">Hipoteca</option>
                </select>
              </label>

              <label>
                Estado inicial
                <select defaultValue="PENDING" name="paymentStatus">
                  <option value="PENDING">Pendiente</option>
                  <option value="PAID">Pagado</option>
                  <option value="OVERDUE">Vencido</option>
                </select>
              </label>
            </div>

            <div className="income-form-row">
              <label>
                Frecuencia recurrente
                <select defaultValue="MONTHLY" name="recurrenceFrequency">
                  <option value="MONTHLY">Mensual</option>
                  <option value="WEEKLY">Semanal</option>
                  <option value="BIWEEKLY">Quincenal</option>
                  <option value="BIMONTHLY">Bimestral</option>
                  <option value="QUARTERLY">Trimestral</option>
                </select>
              </label>

              <label>
                Cantidad de ocurrencias
                <input defaultValue="12" min="1" name="recurrenceCount" step="1" type="number" />
              </label>
            </div>

            <div className="income-form-row">
              <label>
                Cuotas totales
                <input min="1" name="totalInstallments" step="1" type="number" />
              </label>

              <label>
                Cuota actual
                <input min="1" name="currentInstallmentNumber" step="1" type="number" />
              </label>
            </div>

            <label>
              Cotizacion a moneda base
              <input
                min="0"
                name="fxRateUsed"
                placeholder="Solo si el egreso se carga en USD"
                step="0.000001"
                type="number"
              />
            </label>

            <label>
              Notas
              <textarea
                name="notes"
                placeholder="Aclaraciones del gasto, tarjeta o prestamo."
                rows={4}
              />
            </label>

            <div className="income-form-actions">
              <button className="primary-button" type="submit">
                Guardar egreso
              </button>
              <span className="form-helper">
                Los gastos recurrentes y en cuotas generan sus futuros
                automaticamente.
              </span>
            </div>
          </form>
        </article>

        <article className="timeline-card">
          <div className="panel-head">
            <div>
              <h2>Historial de egresos</h2>
              <p>
                Desde aca podes marcar pagos, ver proyecciones y eliminar
                registros.
              </p>
            </div>
          </div>

          {data.expenses.length > 0 ? (
            data.expenses.map((expense) => {
              const derivedStatus = deriveStatus(expense);

              return (
                <div className="timeline-row timeline-row-actions" key={expense.id}>
                  <div>
                    <strong>{expense.title}</strong>
                    <span>
                      {expense.category ?? expense.expenseKind} ·{" "}
                      {formatShortDate(expense.dueDate)}
                    </span>
                    <div className="row-chip-group">
                      <span className={`status-chip status-${derivedStatus.toLowerCase()}`}>
                        {statusLabel(derivedStatus)}
                      </span>
                      <span className="status-chip status-neutral">
                        {expense.entryMode === "PROJECTED" ? "Proyectado" : "Real"}
                      </span>
                      {expense.installmentNumber && expense.totalInstallments ? (
                        <span className="status-chip status-neutral">
                          Cuota {expense.installmentNumber}/{expense.totalInstallments}
                        </span>
                      ) : null}
                    </div>
                    {expense.notes ? (
                      <span className="row-note">{expense.notes}</span>
                    ) : null}
                  </div>

                  <div className="timeline-amount">
                    <strong>{formatMoney(expense.amountOriginal, expense.currency)}</strong>
                    <span className="timeline-tag">
                      Base {formatMoney(expense.amountBaseSnapshot, data.family.baseCurrency)}
                    </span>
                    <div className="inline-actions">
                      <a className="inline-button" href={`/egresos/${expense.id}/editar`}>
                        Editar
                      </a>
                      {expense.paymentStatus !== "PAID" ? (
                        <form action="/egresos/status" method="post">
                          <input name="expenseId" type="hidden" value={expense.id} />
                          <input name="returnTo" type="hidden" value="/egresos" />
                          <input name="status" type="hidden" value="PAID" />
                          <button className="inline-good-button" type="submit">
                            Marcar pagado
                          </button>
                        </form>
                      ) : (
                        <form action="/egresos/status" method="post">
                          <input name="expenseId" type="hidden" value={expense.id} />
                          <input name="returnTo" type="hidden" value="/egresos" />
                          <input name="status" type="hidden" value="PENDING" />
                          <button className="inline-button" type="submit">
                            Volver a pendiente
                          </button>
                        </form>
                      )}

                      {derivedStatus !== "OVERDUE" && expense.paymentStatus !== "PAID" ? (
                        <form action="/egresos/status" method="post">
                          <input name="expenseId" type="hidden" value={expense.id} />
                          <input name="returnTo" type="hidden" value="/egresos" />
                          <input name="status" type="hidden" value="OVERDUE" />
                          <button className="inline-button" type="submit">
                            Marcar vencido
                          </button>
                        </form>
                      ) : null}

                      <form action="/egresos/delete" method="post">
                        <input name="expenseId" type="hidden" value={expense.id} />
                        <input name="returnTo" type="hidden" value="/egresos" />
                        <button className="inline-danger-button" type="submit">
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              Todavia no hay egresos cargados. El primer gasto que registres ya
              va a aparecer en el dashboard y en el calendario.
            </div>
          )}
        </article>
      </section>
    </ProtectedShell>
  );
}
