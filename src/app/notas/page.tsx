import { ProtectedShell } from "@/components/app/protected-shell";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { getNotesPageData } from "@/lib/app-db";
import { requireAuthUser } from "@/lib/server-auth";

type NotesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatNoteDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function NotesPage({ searchParams }: NotesPageProps) {
  const user = await requireAuthUser();
  const data = await getNotesPageData(user);
  const params = (await searchParams) ?? {};
  const success = params["success"] === "1";
  const error = typeof params["error"] === "string" ? params["error"] : null;

  return (
    <ProtectedShell
      baseCurrency={data.family.baseCurrency}
      currentPath="/notas"
      description="Deja mensajes internos para la familia y conserva el historial de acuerdos, recordatorios y avisos."
      familyName={data.family.name}
      title="Notas internas"
      childrenAfterHeader={
        <section className="dashboard-grid">
          <SummaryCard
            description="Mensajes internos guardados para la familia."
            label="Notas registradas"
            tone="primary"
            value={String(data.notes.length)}
          />
        </section>
      }
    >
      {success ? (
        <div className="feedback success">La nota se guardo correctamente.</div>
      ) : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <section className="dashboard-columns">
        <article className="dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>Nueva nota</h2>
              <p>
                Usa este espacio para dejar pendientes, avisos, acuerdos o
                decisiones familiares.
              </p>
            </div>
          </div>

          <form action="/notas/create" className="income-form" method="post">
            <input name="returnTo" type="hidden" value="/notas" />

            <label>
              Mensaje
              <textarea
                name="content"
                placeholder="Ejemplo: la cuota del colegio vence el 18 y el seguro del auto el 22."
                required
                rows={8}
              />
            </label>

            <button className="primary-button" type="submit">
              Guardar nota
            </button>
          </form>
        </article>

        <article className="timeline-card">
          <div className="panel-head">
            <div>
              <h2>Historial de notas</h2>
              <p>El dashboard siempre muestra la mas reciente.</p>
            </div>
          </div>

          {data.notes.length > 0 ? (
            data.notes.map((note) => (
              <article className="note-feed-item" key={note.id}>
                <p>{note.content}</p>
                <span>
                  {note.authorName} · {formatNoteDate(note.createdAt)}
                </span>
              </article>
            ))
          ) : (
            <div className="empty-state">
              Todavia no hay notas guardadas para esta familia.
            </div>
          )}
        </article>
      </section>
    </ProtectedShell>
  );
}
