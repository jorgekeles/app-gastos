import Link from "next/link";
import { notFound } from "next/navigation";
import { ProtectedShell } from "@/components/app/protected-shell";
import {
  formatMoney,
  getCurrentBlueRate,
  getExpenseByIdForUser,
  getTodayDate,
} from "@/lib/app-db";
import { requireAuthUser } from "@/lib/server-auth";

type EditExpensePageProps = {
  params: Promise<{ expenseId: string }>;
};

export default async function EditExpensePage({
  params,
}: EditExpensePageProps) {
  const { expenseId } = await params;
  const user = await requireAuthUser();
  const data = await getExpenseByIdForUser(user, expenseId);
  const blueRate = await getCurrentBlueRate().catch(() => null);

  if (!data.expense) {
    notFound();
  }

  return (
    <ProtectedShell
      baseCurrency={data.family.baseCurrency}
      currentPath="/egresos"
      description="Esta edicion actualiza el egreso seleccionado. En gastos en serie, el cambio se aplica solo sobre esta fila."
      familyName={data.family.name}
      title="Editar egreso"
    >
      <section className="dashboard-columns">
        <article className="dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>Editar movimiento</h2>
              <p>
                Puedes ajustar monto, estado, fecha, categoria y notas del
                egreso elegido.
              </p>
            </div>
          </div>

          <form action="/egresos/update" className="income-form" method="post">
            <input name="expenseId" type="hidden" value={data.expense.id} />
            <input name="returnTo" type="hidden" value="/egresos" />

            <label>
              Nombre del egreso
              <input defaultValue={data.expense.title} name="title" required type="text" />
            </label>

            <div className="income-form-row">
              <label>
                Monto
                <input
                  defaultValue={data.expense.amountOriginal}
                  min="0.01"
                  name="amountOriginal"
                  required
                  step="0.01"
                  type="number"
                />
              </label>

              <label>
                Moneda
                <select defaultValue={data.expense.currency} name="currency">
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>

            <div className="income-form-row">
              <label>
                Fecha de vencimiento
                <input
                  defaultValue={data.expense.dueDate || getTodayDate()}
                  name="dueDate"
                  required
                  type="date"
                />
              </label>

              <label>
                Categoria
                <input
                  defaultValue={data.expense.category ?? ""}
                  name="category"
                  type="text"
                />
              </label>
            </div>

            <div className="income-form-row">
              <label>
                Tipo de gasto
                <select defaultValue={data.expense.expenseKind} name="expenseKind">
                  <option value="ONE_TIME">Gasto unico</option>
                  <option value="RECURRING">Gasto recurrente</option>
                  <option value="CREDIT_CARD">Tarjeta de credito</option>
                  <option value="INSTALLMENT">Cuotas</option>
                  <option value="LOAN">Prestamo</option>
                  <option value="MORTGAGE">Hipoteca</option>
                </select>
              </label>

              <label>
                Estado
                <select defaultValue={data.expense.paymentStatus} name="paymentStatus">
                  <option value="PENDING">Pendiente</option>
                  <option value="PAID">Pagado</option>
                  <option value="OVERDUE">Vencido</option>
                  <option value="CANCELED">Cancelado</option>
                </select>
              </label>
            </div>

            <label>
              Notas
              <textarea defaultValue={data.expense.notes ?? ""} name="notes" rows={4} />
            </label>

            <div className="income-form-actions">
              <button className="primary-button" type="submit">
                Guardar cambios
              </button>
              <Link className="secondary-button" href="/egresos">
                Volver al listado
              </Link>
              {blueRate ? (
                <span className="form-helper">
                  Si queda en USD, se usara blue automatica: {formatMoney(blueRate.rate, "ARS")}
                </span>
              ) : null}
            </div>
          </form>
        </article>
      </section>
    </ProtectedShell>
  );
}
