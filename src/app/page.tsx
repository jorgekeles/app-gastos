import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

const features = [
  {
    title: "Vision clara del mes",
    description:
      "Ingresos, egresos, ahorro y disponible real en una sola vista ejecutiva para toda la familia.",
  },
  {
    title: "ARS y USD con historial",
    description:
      "Cada movimiento guarda moneda original y cotizacion utilizada para evitar inconsistencias cuando cambia el dolar blue.",
  },
  {
    title: "Compromisos futuros visibles",
    description:
      "Cuotas, hipoteca, tarjeta y pagos recurrentes proyectados para que el calendario no te sorprenda.",
  },
];

export default function HomePage() {
  return (
    <main className="app-shell">
      <header className="site-header">
        <BrandLogo
          caption="Finanzas familiares compartidas"
          href="/"
          priority
        />

        <nav className="header-links">
          <Link href="/login">Entrar</Link>
          <Link className="primary-button" href="/registro">
            Crear cuenta
          </Link>
        </nav>
      </header>

      <section className="hero">
        <article className="hero-card">
          <div className="eyebrow">Cuenta familiar compartida</div>
          <h1>Una cuenta familiar para entender la plata de verdad.</h1>
          <p>
            AppGastos junta ingresos, gastos, ahorro, notas y compromisos
            futuros en un espacio privado por familia. La idea es dejar de
            perseguir planillas y empezar a ver el mes con contexto.
          </p>

          <div className="hero-actions">
            <Link className="primary-button" href="/registro">
              Empezar ahora
            </Link>
            <Link className="secondary-button" href="/login">
              Ya tengo acceso
            </Link>
          </div>

          <div className="hero-metrics">
            <div className="metric-pill">
              <span>Disponible real</span>
              <strong>ARS 1.525.000</strong>
            </div>
            <div className="metric-pill">
              <span>Ahorro reservado</span>
              <strong>USD 100 + ARS 200.000</strong>
            </div>
            <div className="metric-pill">
              <span>Comprometido futuro</span>
              <strong>ARS 1.395.000</strong>
            </div>
          </div>
        </article>

        <div className="hero-grid">
          <article className="feature-card">
            <div className="card-badge badge-primary">Dashboard ejecutivo</div>
            <strong>Tarjetas arriba, grafico al centro y decisiones mas claras</strong>
            <p>
              Tarjetas arriba, donut central y debajo el resumen del mes,
              proximos vencimientos y la ultima nota familiar.
            </p>
          </article>

          <article className="feature-card">
            <div className="card-badge badge-accent">Colaboracion familiar</div>
            <strong>Disponible real vs comprometido, sin perder el contexto</strong>
            <p>
              Diferencia entre plata libre, ahorro reservado y pagos que ya
              estan esperando en los meses siguientes.
            </p>
          </article>
        </div>
      </section>

      <section className="section-grid">
        {features.map((feature) => (
          <article className="feature-card" key={feature.title}>
            <div className="card-badge badge-neutral">Modulo clave</div>
            <strong>{feature.title}</strong>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
