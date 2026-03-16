import Image from "next/image";
import Link from "next/link";
import claraMoodboard from "../../../clara.png";

const highlights = [
  {
    label: "Ingresos del mes",
    value: "ARS 3.240.000",
    note: "Sueldo, freelance y reintegros consolidados",
  },
  {
    label: "Egresos del mes",
    value: "ARS 2.180.000",
    note: "Hogar, movilidad, colegio y salud",
  },
  {
    label: "Disponible real",
    value: "ARS 1.060.000",
    note: "Despues de ahorro reservado y pagos realizados",
  },
];

const modules = [
  "Presupuesto familiar sereno y visual",
  "Notas y acuerdos en un espacio compartido",
  "Cuotas, calendario y vencimientos visibles",
];

export default function ClaraPreviewPage() {
  return (
    <main className="clara-preview">
      <section className="clara-shell">
        <header className="clara-header">
          <div className="clara-brand">
            <div className="clara-wordmark">
              <Image
                alt="Logo Clara"
                className="clara-wordmark-image"
                priority
                src={claraMoodboard}
              />
            </div>
            <span>Prueba visual para AppGastos</span>
          </div>

          <div className="clara-actions">
            <Link className="clara-link" href="/">
              Volver
            </Link>
            <Link className="clara-button" href="/registro">
              Probar alta
            </Link>
          </div>
        </header>

        <section className="clara-hero">
          <article className="clara-copy-card">
            <span className="clara-kicker">Propuesta visual Clara</span>
            <h1>Un look mas editorial, calmo y humano para la app familiar.</h1>
            <p>
              Esta prueba usa una direccion mas calida, con tipografia de
              contraste, superficies suaves y acentos tierra/salvia para ver si
              la experiencia se siente mas cercana y menos tecnica.
            </p>

            <div className="clara-tag-list">
              {modules.map((module) => (
                <span className="clara-tag" key={module}>
                  {module}
                </span>
              ))}
            </div>

            <div className="clara-hero-actions">
              <Link className="clara-button" href="/dashboard">
                Ver dashboard real
              </Link>
              <Link className="clara-link" href="/familia">
                Gestionar familia
              </Link>
            </div>
          </article>

          <article className="clara-image-card">
            <div className="clara-image-frame">
              <Image
                alt="Referencia visual Clara"
                className="clara-image"
                priority
                src={claraMoodboard}
              />
            </div>
            <p>
              La imagen se usa como referencia visual para la prueba, con una
              paleta mas suave y tipografia mas editorial.
            </p>
          </article>
        </section>

        <section className="clara-dashboard-preview">
          <article className="clara-summary">
            <div className="clara-summary-head">
              <div>
                <span className="clara-kicker">Resumen del mes</span>
                <h2>Como se veria el dashboard principal</h2>
              </div>
              <span className="clara-status">Familia activa</span>
            </div>

            <div className="clara-metrics">
              {highlights.map((item) => (
                <div className="clara-metric-card" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.note}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="clara-panel-grid">
            <div className="clara-panel clara-panel-donut">
              <span className="clara-kicker">Distribucion</span>
              <div className="clara-donut-wrap">
                <div className="clara-donut">
                  <div className="clara-donut-center">
                    <strong>67%</strong>
                    <span>En presupuesto</span>
                  </div>
                </div>
                <div className="clara-legend">
                  <div>
                    <span className="clara-legend-dot one" />
                    <strong>Egresos</strong>
                    <small>ARS 2.180.000</small>
                  </div>
                  <div>
                    <span className="clara-legend-dot two" />
                    <strong>Ahorro</strong>
                    <small>ARS 380.000</small>
                  </div>
                  <div>
                    <span className="clara-legend-dot three" />
                    <strong>Disponible</strong>
                    <small>ARS 1.060.000</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="clara-panel">
              <span className="clara-kicker">Notas familiares</span>
              <h3>Ultimo acuerdo</h3>
              <p>
                Este mes priorizamos ahorro para vacaciones y mantenemos el
                combustible dentro de un tope semanal.
              </p>
              <small>Escrito por Jorge el 16 de marzo</small>
            </div>

            <div className="clara-panel">
              <span className="clara-kicker">Vencimientos</span>
              <h3>Proximos pagos</h3>
              <ul className="clara-list">
                <li>
                  <strong>Tarjeta</strong>
                  <span>18 mar · Pendiente</span>
                </li>
                <li>
                  <strong>Internet</strong>
                  <span>20 mar · Programado</span>
                </li>
                <li>
                  <strong>Colegio</strong>
                  <span>22 mar · Pendiente</span>
                </li>
              </ul>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
