"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";

type AuthPanelProps = {
  mode: "login" | "register";
};

export function AuthPanel({ mode }: AuthPanelProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const title =
    mode === "login" ? "Entrar a tu cuenta familiar" : "Crear tu acceso familiar";
  const subtitle =
    mode === "login"
      ? "Ingresá para ver el dashboard, próximos vencimientos y movimientos compartidos."
      : "Registrate para empezar a construir el espacio financiero privado de tu familia.";

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");

    if (next) {
      setNextPath(next);
    }
  }, []);

  async function postAuthRequest(path: string, payload: Record<string, string>) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; message?: string; redirectTo?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "No pudimos completar la operacion.");
      }

      return data;
    } catch (requestError) {
      if (requestError instanceof Error && requestError.name === "AbortError") {
        throw new Error(
          "La conexion esta tardando demasiado. Revisa la configuracion de Supabase e intenta otra vez.",
        );
      }

      throw requestError;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    try {
      if (mode === "login") {
        const data = await postAuthRequest("/auth/sign-in", {
          email,
          password,
        });

        startTransition(() => {
          router.replace(data?.redirectTo ?? nextPath);
          router.refresh();
        });

        return;
      }

      const data = await postAuthRequest("/auth/sign-up", {
        fullName,
        email,
        password,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      });

      if (data?.redirectTo) {
        const redirectTo = data.redirectTo;

        startTransition(() => {
          router.replace(redirectTo);
          router.refresh();
        });
        return;
      }

      setMessage(
        data?.message ??
          "Te enviamos un correo de confirmacion. Cuando actives tu cuenta vas a poder entrar al dashboard.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos completar la operacion.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-card">
      <div className="auth-brand">
        <BrandLogo
          caption="Planifica ingresos, ahorro y vencimientos en familia."
          href="/"
          size="sm"
        />
      </div>
      <div className="eyebrow">AppGastos Familiar</div>
      <h1>{title}</h1>
      <p>{subtitle}</p>

      <div className="auth-benefits">
        <div className="auth-benefit">Cuenta privada por familia</div>
        <div className="auth-benefit">ARS y USD con historial</div>
        <div className="auth-benefit">Cuotas y vencimientos visibles</div>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <label>
            Nombre visible
            <input
              autoComplete="name"
              name="fullName"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ana Gonzalez"
              required
              type="text"
              value={fullName}
            />
          </label>
        ) : null}

        <label>
          Email
          <input
            autoComplete="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="familia@ejemplo.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label>
          Contrasena
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimo 8 caracteres"
            required
            type="password"
            value={password}
          />
        </label>

        <button className="primary-button" disabled={pending} type="submit">
          {pending
            ? "Procesando..."
            : mode === "login"
              ? "Entrar"
              : "Crear cuenta"}
        </button>
      </form>

      {error ? <div className="feedback error">{error}</div> : null}
      {message ? <div className="feedback success">{message}</div> : null}

      <div className="auth-footer">
        {mode === "login" ? (
          <>
            <span>No tenes cuenta todavia?</span>
            <Link href="/registro">Crear acceso</Link>
          </>
        ) : (
          <>
            <span>Ya tenes acceso?</span>
            <Link href="/login">Iniciar sesion</Link>
          </>
        )}
      </div>
    </section>
  );
}
