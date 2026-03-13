import Link from "next/link";
import { notFound } from "next/navigation";
import { ProtectedShell } from "@/components/app/protected-shell";
import { formatMoney, getCurrentBlueRate, getIncomeByIdForUser } from "@/lib/app-db";
import { requireAuthUser } from "@/lib/server-auth";

type EditIncomePageProps = {
  params: Promise<{ incomeId: string }>;
};

export default async function EditIncomePage({ params }: EditIncomePageProps) {
  const { incomeId } = await params;
  const user = await requireAuthUser();
  const data = await getIncomeByIdForUser(user, incomeId);
  const blueRate = await getCurrentBlueRate().catch(() => null);

  if (!data.income) {
    notFound();
  }

  return (
    <ProtectedShell
      baseCurrency={data.family.baseCurrency}
      currentPath="/ingresos"
      description="Actualiza el ingreso seleccionado sin perder su historial dentro de la familia."
      familyName={data.family.name}
      title="Editar ingreso"
    >
      <section className="dashboard-columns">
        <article className="dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>Editar movimiento</h2>
              <p>
                Puedes ajustar monto, fecha, categoria, moneda y notas del
                ingreso seleccionado.
              </p>
            </div>
          </div>

          <form action="/ingresos/update" className="income-form" method="post">
            <input name="incomeId" type="hidden" value={data.income.id} />
            <input name="returnTo" type="hidden" value="/ingresos" />

            <label>
              Nombre del ingreso
              <input defaultValue={data.income.title} name="title" required type="text" />
            </label>

            <div className="income-form-row">
              <label>
                Monto
                <input
                  defaultValue={data.income.amountOriginal}
                  min="0.01"
                  name="amountOriginal"
                  required
                  step="0.01"
                  type="number"
                />
              </label>

              <label>
                Moneda
                <select defaultValue={data.income.currency} name="currency">
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>

            <div className="income-form-row">
              <label>
                Fecha
                <input
                  defaultValue={data.income.transactionDate}
                  name="transactionDate"
                  required
                  type="date"
                />
              </label>

              <label>
                Categoria
                <input
                  defaultValue={data.income.category ?? ""}
                  name="category"
                  type="text"
                />
              </label>
            </div>

            <label>
              Notas
              <textarea defaultValue={data.income.notes ?? ""} name="notes" rows={4} />
            </label>

            <div className="income-form-actions">
              <button className="primary-button" type="submit">
                Guardar cambios
              </button>
              <Link className="secondary-button" href="/ingresos">
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
