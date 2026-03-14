import Link from "next/link";
import { ProtectedShell } from "@/components/app/protected-shell";
import { SummaryCard } from "@/components/dashboard/summary-card";
import {
  formatMoney,
  formatShortDate,
  getCurrentBlueRate,
  getSavingsPageData,
  getTodayDate,
} from "@/lib/app-db";
import { requireAuthUser } from "@/lib/server-auth";

type SavingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parsePositiveNumber(value: string | string[] | undefined) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default async function SavingsPage({ searchParams }: SavingsPageProps) {
  const user = await requireAuthUser();
  const data = await getSavingsPageData(user);
  const blueRate = await getCurrentBlueRate().catch(() => null);
  const params = (await searchParams) ?? {};
  const goalCreated = params["goalCreated"] === "1";
  const goalUpdated = params["goalUpdated"] === "1";
  const goalDeleted = params["goalDeleted"] === "1";
  const movementCreated = params["movementCreated"] === "1";
  const error = typeof params["error"] === "string" ? params["error"] : null;
  const simAmount = parsePositiveNumber(params["simAmount"]);
  const simPeriod = parsePositiveNumber(params["simPeriod"]);
  const simUnit = params["simUnit"] === "years" ? "years" : "months";
  const simCurrency = params["simCurrency"] === "USD" ? "USD" : "ARS";
  const simMonths =
    simAmount && simPeriod ? (simUnit === "years" ? simPeriod * 12 : simPeriod) : 0;
  const simResult = simAmount && simMonths ? simAmount * simMonths : 0;

  return (
    <ProtectedShell
      baseCurrency={data.family.baseCurrency}
      currentPath="/ahorro"
      description="Reserva fondos por objetivo, suma o retira movimientos y usa un simulador rapido para proyectar acumulacion."
      familyName={data.family.name}
      title="Ahorro familiar"
      childrenAfterHeader={
        <section className="dashboard-grid">
          <SummaryCard
            description="Saldo total reservado por la familia."
            label="Ahorro reservado"
            tone="good"
            value={formatMoney(data.savingsReservedTotal, data.family.baseCurrency)}
          />
          <SummaryCard
            description="Objetivos activos de ahorro disponibles."
            label="Objetivos"
            tone="primary"
            value={String(data.goals.length)}
          />
          <SummaryCard
            description="Movimientos de ahorro registrados hasta hoy."
            label="Movimientos"
            tone="warning"
            value={String(data.transactions.length)}
          />
        </section>
      }
    >
      {goalCreated ? (
        <div className="feedback success">El objetivo se creo correctamente.</div>
      ) : null}
      {goalUpdated ? (
        <div className="feedback success">El objetivo se actualizo correctamente.</div>
      ) : null}
      {goalDeleted ? (
        <div className="feedback success">El objetivo se elimino correctamente.</div>
      ) : null}
      {movementCreated ? (
        <div className="feedback success">
          El movimiento de ahorro se guardo correctamente.
        </div>
      ) : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <section className="dashboard-columns">
        <div className="module-stack">
          <article className="dashboard-panel">
            <div className="panel-head">
              <div>
                <h2>Nuevo objetivo</h2>
                <p>
                  Crea objetivos separados para emergencia, vacaciones, auto o
                  cualquier meta familiar.
                </p>
              </div>
            </div>

            <form action="/ahorro/goals/create" className="income-form" method="post">
              <input name="returnTo" type="hidden" value="/ahorro" />

              <label>
                Nombre del objetivo
                <input
                  name="name"
                  placeholder="Fondo de emergencia, vacaciones..."
                  required
                  type="text"
                />
              </label>

              <div className="income-form-row">
                <label>
                  Monto objetivo
                  <input min="0" name="targetAmount" step="0.01" type="number" />
                </label>

                <label>
                  Moneda objetivo
                  <select defaultValue="ARS" name="targetCurrency">
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>

              <button className="primary-button" type="submit">
                Crear objetivo
              </button>
            </form>
          </article>

          <article className="dashboard-panel">
            <div className="panel-head">
              <div>
                <h2>Movimiento de ahorro</h2>
                <p>
                  Deposita, retira o ajusta saldo dentro de un objetivo ya
                  creado.
                </p>
              </div>
            </div>

            <form
              action="/ahorro/transactions/create"
              className="income-form"
              method="post"
            >
              <input name="returnTo" type="hidden" value="/ahorro" />

              <label>
                Objetivo
                <select defaultValue="" name="goalId" required>
                  <option disabled value="">
                    Selecciona un objetivo
                  </option>
                  {data.goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="income-form-row">
                <label>
                  Tipo
                  <select defaultValue="DEPOSIT" name="direction">
                    <option value="DEPOSIT">Deposito</option>
                    <option value="WITHDRAWAL">Retiro</option>
                    <option value="ADJUSTMENT">Ajuste</option>
                  </select>
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
                  Monto
                  <input min="0.01" name="amountOriginal" required step="0.01" type="number" />
                </label>

                <label>
                  Fecha
                  <input defaultValue={getTodayDate()} name="transactionDate" required type="date" />
                </label>
              </div>

              <label>
                Notas
                <textarea name="notes" placeholder="Detalle opcional del movimiento." rows={4} />
              </label>

              <button className="primary-button" disabled={data.goals.length === 0} type="submit">
                Guardar movimiento
              </button>
              {data.goals.length === 0 ? (
                <span className="form-helper">
                  Primero crea un objetivo para poder registrar movimientos.
                </span>
              ) : blueRate ? (
                <span className="form-helper">
                  Si cargas USD, se usa blue automatica: {formatMoney(blueRate.rate, "ARS")}
                </span>
              ) : null}
            </form>
          </article>
        </div>

        <div className="module-stack">
          <article className="timeline-card">
            <div className="panel-head">
              <div>
                <h2>Objetivos activos</h2>
                <p>Saldo reservado por cada meta familiar.</p>
              </div>
            </div>

            {data.goals.length > 0 ? (
              <div className="goal-grid">
                {data.goals.map((goal) => (
                  <article className="goal-card" key={goal.id}>
                    <div className="goal-card-head">
                      <strong>{goal.name}</strong>
                      {goal.isCompleted ? (
                        <span className="status-chip status-accent">Completado</span>
                      ) : (
                        <span className="status-chip status-primary">
                          {goal.targetAmountBaseSnapshot
                            ? `${goal.progressPercent.toFixed(0)}%`
                            : "Sin meta"}
                        </span>
                      )}
                    </div>
                    <span>
                      Guardado:{" "}
                      {formatMoney(goal.totalSavedBase, data.family.baseCurrency)}
                    </span>
                    <span>
                      Objetivo:{" "}
                      {goal.targetAmount
                        ? formatMoney(goal.targetAmount, goal.targetCurrency)
                        : "Sin monto definido"}
                    </span>
                    {goal.targetAmountBaseSnapshot ? (
                      <span>
                        Meta base:{" "}
                        {formatMoney(
                          goal.targetAmountBaseSnapshot,
                          data.family.baseCurrency,
                        )}
                      </span>
                    ) : null}
                    {goal.completedAt ? (
                      <span>
                        Completado el {formatShortDate(goal.completedAt.slice(0, 10))}
                      </span>
                    ) : null}
                    <div className="goal-card-actions">
                      <Link
                        className="secondary-button"
                        href={`/ahorro/goals/${goal.id}/editar`}
                      >
                        Editar
                      </Link>
                      <form action="/ahorro/goals/delete" method="post">
                        <input name="goalId" type="hidden" value={goal.id} />
                        <input name="returnTo" type="hidden" value="/ahorro" />
                        <button className="secondary-button destructive-button" type="submit">
                          Borrar
                        </button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                Todavia no hay objetivos de ahorro creados.
              </div>
            )}
          </article>

          <article className="timeline-card">
            <div className="panel-head">
              <div>
                <h2>Simulador rapido</h2>
                <p>Proyecta cuanto podrias acumular ahorrando un monto fijo.</p>
              </div>
            </div>

            <form className="income-form" method="get">
              <div className="income-form-row">
                <label>
                  Ahorro por periodo
                  <input
                    defaultValue={simAmount ?? ""}
                    min="0.01"
                    name="simAmount"
                    step="0.01"
                    type="number"
                  />
                </label>

                <label>
                  Moneda
                  <select defaultValue={simCurrency} name="simCurrency">
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>

              <div className="income-form-row">
                <label>
                  Cantidad
                  <input
                    defaultValue={simPeriod ?? ""}
                    min="1"
                    name="simPeriod"
                    step="1"
                    type="number"
                  />
                </label>

                <label>
                  Unidad
                  <select defaultValue={simUnit} name="simUnit">
                    <option value="months">Meses</option>
                    <option value="years">Anios</option>
                  </select>
                </label>
              </div>

              <button className="secondary-button" type="submit">
                Calcular simulacion
              </button>
            </form>

            {simResult > 0 ? (
              <div className="sim-result">
                Si ahorras {formatMoney(simAmount ?? 0, simCurrency)} por{" "}
                {simPeriod} {simUnit === "years" ? "anios" : "meses"}, tendrias{" "}
                <strong>{formatMoney(simResult, simCurrency)}</strong>.
              </div>
            ) : null}
          </article>

          <article className="timeline-card">
            <div className="panel-head">
              <div>
                <h2>Movimientos recientes</h2>
                <p>Historial consolidado de ahorro reservado.</p>
              </div>
            </div>

            {data.transactions.length > 0 ? (
              data.transactions.map((transaction) => (
                <div className="timeline-row" key={transaction.id}>
                  <div>
                    <strong>{transaction.goalName}</strong>
                    <span>
                      {transaction.direction} ·{" "}
                      {formatShortDate(transaction.transactionDate)}
                    </span>
                    {transaction.notes ? (
                      <span className="row-note">{transaction.notes}</span>
                    ) : null}
                  </div>
                  <div className="timeline-amount">
                    <strong>
                      {formatMoney(
                        transaction.amountOriginal,
                        transaction.currency,
                      )}
                    </strong>
                    <span className="timeline-tag timeline-tag-income">
                      Base{" "}
                      {formatMoney(
                        transaction.amountBaseSnapshot,
                        data.family.baseCurrency,
                      )}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                Todavia no hay movimientos de ahorro registrados.
              </div>
            )}
          </article>
        </div>
      </section>
    </ProtectedShell>
  );
}
