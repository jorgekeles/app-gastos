import Link from "next/link";
import { ProtectedShell } from "@/components/app/protected-shell";
import { SummaryCard } from "@/components/dashboard/summary-card";
import {
  formatMoney,
  getCalendarPageData,
  type PaymentStatus,
} from "@/lib/app-db";
import { requireAuthUser } from "@/lib/server-auth";

type CalendarPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const weekDays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

function deriveStatus(status: PaymentStatus, date: string) {
  if (status === "PENDING" && date < new Date().toISOString().slice(0, 10)) {
    return "OVERDUE";
  }

  return status;
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

function expenseKindLabel(kind: string) {
  switch (kind) {
    case "RECURRING":
      return "Gasto recurrente";
    case "CREDIT_CARD":
      return "Tarjeta de credito";
    case "MORTGAGE":
      return "Hipoteca";
    case "LOAN":
      return "Prestamo";
    case "INSTALLMENT":
      return "En cuotas";
    case "ONE_TIME":
    default:
      return "Gasto unico";
  }
}

export default async function CalendarPage({
  searchParams,
}: CalendarPageProps) {
  const user = await requireAuthUser();
  const params = (await searchParams) ?? {};
  const monthParam =
    typeof params["month"] === "string" ? params["month"] : undefined;
  const selectedExpenseId =
    typeof params["expense"] === "string" ? params["expense"] : undefined;
  const data = await getCalendarPageData(user, monthParam);
  const balance = data.monthIncomeTotal - data.monthExpenseTotal;
  const selectedExpense = selectedExpenseId
    ? data.days.flatMap((day) => day.expenses).find((expense) => expense.id === selectedExpenseId)
    : null;

  return (
    <ProtectedShell
      baseCurrency={data.family.baseCurrency}
      currentPath="/calendario"
      description="Vista consolidada del mes con ingresos, egresos, vencimientos y proyecciones futuras."
      familyName={data.family.name}
      title="Calendario financiero"
      childrenAfterHeader={
        <section className="dashboard-grid">
          <SummaryCard
            description="Ingresos registrados para el mes visible."
            label="Ingresos del mes"
            tone="primary"
            value={formatMoney(data.monthIncomeTotal, data.family.baseCurrency)}
          />
          <SummaryCard
            description="Egresos del mes, incluyendo proyectados."
            label="Egresos del mes"
            tone="warning"
            value={formatMoney(data.monthExpenseTotal, data.family.baseCurrency)}
          />
          <SummaryCard
            description="Resultado del mes visible."
            label="Balance del mes"
            tone={balance >= 0 ? "good" : "danger"}
            value={formatMoney(balance, data.family.baseCurrency)}
          />
        </section>
      }
    >
      <section className="dashboard-panel">
        <div className="panel-head">
          <div>
            <h2>{data.monthLabel}</h2>
            <p>
              Navega entre meses o salta directo al mes y anio que quieras
              revisar.
            </p>
          </div>

          <div className="calendar-controls">
            <div className="calendar-nav">
              <Link
                className="secondary-button"
                href={`/calendario?month=${data.previousMonthParam}`}
              >
                Mes anterior
              </Link>
              <Link
                className="secondary-button"
                href={`/calendario?month=${data.nextMonthParam}`}
              >
                Mes siguiente
              </Link>
            </div>

            <form className="calendar-jump-form" method="get">
              <label className="calendar-jump-label">
                Elegir mes y anio
                <input
                  className="calendar-month-input"
                  defaultValue={data.currentMonthParam}
                  name="month"
                  type="month"
                />
              </label>

              <button className="primary-button" type="submit">
                Ir
              </button>

              <Link className="ghost-button" href="/calendario">
                Mes actual
              </Link>
            </form>
          </div>
        </div>

        <div className="calendar-grid">
          {weekDays.map((label) => (
            <div className="calendar-weekday" key={label}>
              {label}
            </div>
          ))}

          {data.days.map((day) => (
            <article
              className={`calendar-day ${day.inCurrentMonth ? "" : "is-outside"}`}
              key={day.date}
            >
              <div className="calendar-day-head">
                <strong>{day.dayNumber}</strong>
                <span>
                  {formatMoney(
                    day.incomeTotal - day.expenseTotal,
                    data.family.baseCurrency,
                  )}
                </span>
              </div>

              {day.incomeTotal > 0 ? (
                <button
                  aria-label={`Ver composicion de ingresos del ${day.date}`}
                  className="calendar-totals income calendar-total-popover"
                  type="button"
                >
                  <span>
                    Ingresos {formatMoney(day.incomeTotal, data.family.baseCurrency)}
                  </span>
                  <div className="calendar-popover" role="tooltip">
                    <strong>Ingresos que componen el total</strong>
                    <div className="calendar-popover-list">
                      {day.incomes.map((income) => (
                        <div className="calendar-popover-item" key={income.id}>
                          <span>{income.title}</span>
                          <small>
                            {formatMoney(income.amountOriginal, income.currency)}
                            {income.category ? ` · ${income.category}` : ""}
                          </small>
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              ) : null}

              {day.expenseTotal > 0 ? (
                <button
                  aria-label={`Ver composicion de egresos del ${day.date}`}
                  className="calendar-totals expense calendar-total-popover"
                  type="button"
                >
                  <span>
                    Egresos {formatMoney(day.expenseTotal, data.family.baseCurrency)}
                  </span>
                  <div className="calendar-popover" role="tooltip">
                    <strong>Gastos que componen el total</strong>
                    <div className="calendar-popover-list">
                      {day.expenses.map((expense) => (
                        <div className="calendar-popover-item" key={expense.id}>
                          <span>{expense.title}</span>
                          <small>
                            {formatMoney(expense.amountOriginal, expense.currency)} ·{" "}
                            {statusLabel(
                              deriveStatus(expense.paymentStatus, expense.dueDate),
                            )}
                          </small>
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              ) : null}

              <div className="calendar-items">
                {day.incomes.slice(0, 2).map((income) => (
                  <div className="calendar-item income" key={income.id}>
                    <strong>{income.title}</strong>
                    <span>{formatMoney(income.amountOriginal, income.currency)}</span>
                  </div>
                ))}

                {day.expenses.slice(0, 2).map((expense) => (
                  <Link
                    className={`calendar-item expense ${
                      selectedExpense?.id === expense.id ? "is-selected" : ""
                    }`}
                    href={`/calendario?month=${data.currentMonthParam}&expense=${expense.id}`}
                    key={expense.id}
                  >
                    <strong>{expense.title}</strong>
                    <span>
                      {formatMoney(expense.amountOriginal, expense.currency)} ·{" "}
                      {statusLabel(deriveStatus(expense.paymentStatus, expense.dueDate))}
                    </span>
                  </Link>
                ))}

                {day.incomes.length + day.expenses.length > 4 ? (
                  <div className="calendar-more">
                    +{day.incomes.length + day.expenses.length - 4} mas
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        {selectedExpense ? (
          <article className="dashboard-panel calendar-detail-panel">
            <div className="panel-head">
              <div>
                <h2>Detalle del gasto</h2>
                <p>Informacion completa del movimiento seleccionado.</p>
              </div>

              <Link className="ghost-button" href={`/calendario?month=${data.currentMonthParam}`}>
                Cerrar detalle
              </Link>
            </div>

            <div className="calendar-detail-grid">
              <div>
                <span className="admin-label">Gasto</span>
                <strong>{selectedExpense.title}</strong>
                <p className="calendar-detail-copy">
                  {selectedExpense.notes?.trim()
                    ? selectedExpense.notes
                    : "Sin descripcion adicional cargada para este gasto."}
                </p>
              </div>

              <div>
                <span className="admin-label">Monto</span>
                <strong>
                  {formatMoney(selectedExpense.amountOriginal, selectedExpense.currency)}
                </strong>
                <p className="calendar-detail-copy">
                  Base{" "}
                  {formatMoney(
                    selectedExpense.amountBaseSnapshot,
                    data.family.baseCurrency,
                  )}
                </p>
              </div>

              <div>
                <span className="admin-label">Fecha y estado</span>
                <strong>{selectedExpense.dueDate}</strong>
                <div className="row-chip-group">
                  <span
                    className={`status-chip status-${deriveStatus(
                      selectedExpense.paymentStatus,
                      selectedExpense.dueDate,
                    ).toLowerCase()}`}
                  >
                    {statusLabel(
                      deriveStatus(
                        selectedExpense.paymentStatus,
                        selectedExpense.dueDate,
                      ),
                    )}
                  </span>
                  <span className="status-chip status-neutral">
                    {selectedExpense.entryMode === "PROJECTED" ? "Proyectado" : "Real"}
                  </span>
                </div>
              </div>

              <div>
                <span className="admin-label">Tipo</span>
                <strong>{expenseKindLabel(selectedExpense.expenseKind)}</strong>
                <div className="row-chip-group">
                  {selectedExpense.expenseKind === "RECURRING" ? (
                    <span className="status-chip status-accent">Recurrente</span>
                  ) : null}
                  {selectedExpense.installmentNumber &&
                  selectedExpense.totalInstallments ? (
                    <span className="status-chip status-primary">
                      Cuota {selectedExpense.installmentNumber}/
                      {selectedExpense.totalInstallments}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ) : null}
      </section>
    </ProtectedShell>
  );
}
