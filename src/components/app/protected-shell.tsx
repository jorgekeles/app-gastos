import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";

type ProtectedShellProps = {
  familyName: string;
  baseCurrency: string;
  currentPath: string;
  title: string;
  description: string;
  children: ReactNode;
  childrenAfterHeader?: ReactNode;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ingresos", label: "Ingresos" },
  { href: "/egresos", label: "Egresos" },
  { href: "/ahorro", label: "Ahorro" },
  { href: "/notas", label: "Notas" },
  { href: "/calendario", label: "Calendario" },
];

function isActivePath(currentPath: string, href: string) {
  if (href === "/dashboard") {
    return currentPath === href;
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function ProtectedShell({
  familyName,
  baseCurrency,
  currentPath,
  title,
  description,
  children,
  childrenAfterHeader,
}: ProtectedShellProps) {
  return (
    <main className="app-shell dashboard-layout">
      <header className="site-header">
        <BrandLogo
          caption="Finanzas familiares compartidas y listas para usar."
          href="/dashboard"
          size="sm"
        />

        <form action="/auth/signout" className="signout-form" method="post">
          <button className="ghost-button" type="submit">
            Cerrar sesion
          </button>
        </form>
      </header>

      <nav className="app-nav">
        {navItems.map((item) => (
          <Link
            className={`app-nav-link ${
              isActivePath(currentPath, item.href) ? "is-active" : ""
            }`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <section className="dashboard-head app-page-head">
        <div>
          <div className="eyebrow">Cuenta familiar activa</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        <div className="dashboard-topline">
          <span className="status-badge status-primary">{familyName}</span>
          <span className="status-badge status-accent">
            Moneda base {baseCurrency}
          </span>
        </div>
      </section>

      {childrenAfterHeader}
      {children}
    </main>
  );
}
