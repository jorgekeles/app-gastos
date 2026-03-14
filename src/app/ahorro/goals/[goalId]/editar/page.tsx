import Link from "next/link";
import { notFound } from "next/navigation";
import { ProtectedShell } from "@/components/app/protected-shell";
import { getSavingsGoalByIdForUser } from "@/lib/app-db";
import { requireAuthUser } from "@/lib/server-auth";

type EditSavingsGoalPageProps = {
  params: Promise<{ goalId: string }>;
};

export default async function EditSavingsGoalPage({
  params,
}: EditSavingsGoalPageProps) {
  const { goalId } = await params;
  const user = await requireAuthUser();
  const data = await getSavingsGoalByIdForUser(user, goalId);

  if (!data.goal) {
    notFound();
  }

  return (
    <ProtectedShell
      baseCurrency={data.family.baseCurrency}
      currentPath="/ahorro"
      description="Actualiza el objetivo de ahorro sin perder el historial de movimientos ya cargados."
      familyName={data.family.name}
      title="Editar objetivo"
    >
      <section className="dashboard-columns">
        <article className="dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>Editar objetivo</h2>
              <p>
                Puedes cambiar nombre, moneda y monto objetivo. El estado de
                completado se recalcula automaticamente.
              </p>
            </div>
          </div>

          <form action="/ahorro/goals/update" className="income-form" method="post">
            <input name="goalId" type="hidden" value={data.goal.id} />
            <input name="returnTo" type="hidden" value="/ahorro" />

            <label>
              Nombre del objetivo
              <input defaultValue={data.goal.name} name="name" required type="text" />
            </label>

            <div className="income-form-row">
              <label>
                Monto objetivo
                <input
                  defaultValue={data.goal.targetAmount ?? ""}
                  min="0"
                  name="targetAmount"
                  step="0.01"
                  type="number"
                />
              </label>

              <label>
                Moneda objetivo
                <select defaultValue={data.goal.targetCurrency} name="targetCurrency">
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>

            <div className="income-form-actions">
              <button className="primary-button" type="submit">
                Guardar cambios
              </button>
              <Link className="secondary-button" href="/ahorro">
                Volver a ahorro
              </Link>
            </div>
          </form>
        </article>
      </section>
    </ProtectedShell>
  );
}
