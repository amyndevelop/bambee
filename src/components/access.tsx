"use client";
import { api } from "@/lib/client";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { BrandGraphic, BrandIsotype, Field, Logo } from "./ui";
export function Access({ error }: { error: string }) {
  const router = useRouter();
  const [mode, setMode] = useState("welcome"),
    [message, setMessage] = useState(error),
    [busy, setBusy] = useState(false);
  const [reset, setReset] = useState("");
  useEffect(
    () =>
      setReset(new URLSearchParams(window.location.search).get("reset") || ""),
    [],
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget),
      d = Object.fromEntries(f);
    try {
      if (reset) {
        await api("/api/account", {
          action: "reset",
          token: reset,
          password: d.password,
        });
        setReset("");
        setMode("login");
        setMessage("Contraseña actualizada. Ya podés ingresar.");
      } else if (mode === "forgot") {
        await api("/api/account", { action: "forgot", email: d.email });
        setMessage(
          "Si existe una cuenta, recibirás un enlace de recuperación.",
        );
      } else {
        if (mode === "register") {
          if (d.password !== d.confirm)
            throw new Error("Las contraseñas no coinciden");
          await api("/api/account", {
            ...d,
            action: "register",
            consent: f.get("consent") === "on",
          });
        }
        const r = await signIn("credentials", {
          email: d.email,
          password: d.password,
          redirect: false,
        });
        if (r?.error)
          throw new Error("No pudimos iniciar sesión. Revisá tus datos.");
        router.push("/");
        router.refresh();
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (mode === "welcome" && !reset)
    return (
      <div className="welcome">
        <section className="welcome-art">
          <Logo />
          <div className="welcome-circle">
            <BrandGraphic slug="bee" fallback={<BrandIsotype />} />
          </div>
          <p className="eyebrow">PASO 1 DE 5 · BIENVENIDA</p>
          <h1>
            Pequeños latidos.
            <br />
            Un amor enorme.
          </h1>
          <p>Creciendo juntos, desde el comienzo.</p>
        </section>
        <section className="auth-panel">
          <p className="eyebrow">TU NUEVA HISTORIA</p>
          <h2>Un lugar para crecer juntos</h2>
          <p>
            Acompañá cada semana y guardá los recuerdos que hacen única esta
            etapa.
          </p>
          <button
            className="primary"
            onClick={() => {
              setMode("register");
              setMessage("");
            }}
          >
            Crear mi cuenta <ArrowRight size={18} />
          </button>
          <button
            className="text-button"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
          >
            Iniciar sesión
          </button>
          <Link href="/legal">Privacidad y términos</Link>
        </section>
      </div>
    );
  return (
    <div className="welcome">
      <section className="welcome-art">
        <Logo />
        <div className="welcome-circle">
          <BrandGraphic slug="bee" fallback={<BrandIsotype />} />
        </div>
        <p className="eyebrow">UN NUEVO CAPÍTULO</p>
        <h1>
          Pequeños latidos.
          <br />
          Un amor enorme.
        </h1>
        <p>Creciendo juntos, desde el comienzo.</p>
        <div className="pill">
          <ShieldCheck size={17} /> Tu historia, siempre privada
        </div>
      </section>
      <section className="auth-panel">
        <p className="eyebrow">
          {mode === "register"
            ? "PASO 2 DE 5 · TUS DATOS"
            : "BIENVENIDA A BAMBEE"}
        </p>
        <h2>
          {reset
            ? "Recuperá tu acceso"
            : mode === "register"
              ? "Empecemos esta historia"
              : mode === "forgot"
                ? "Volvé a tu espacio"
                : "Qué lindo verte por acá"}
        </h2>
        <p>Un espacio para cuidarte y guardar lo que importa.</p>
        <form onSubmit={submit}>
          {mode === "register" && !reset && (
            <Field
              label="Tu nombre"
              name="name"
              autoComplete="given-name"
              required
              maxLength={100}
            />
          )}{" "}
          {!reset && (
            <Field
              label="Correo electrónico"
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          )}
          {(reset || mode !== "forgot") && (
            <Field
              label="Contraseña · mínimo 12 caracteres"
              type="password"
              name="password"
              minLength={12}
              maxLength={128}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
            />
          )}
          {mode === "register" && !reset && (
            <>
              <Field
                label="Confirmá tu contraseña"
                type="password"
                name="confirm"
                required
                minLength={12}
              />
              <label className="check">
                <input type="checkbox" name="consent" required /> Consiento el
                tratamiento de mis datos de salud para el seguimiento del
                embarazo. Leí los{" "}
                <Link href="/legal">borradores de privacidad y términos</Link>.
              </label>
            </>
          )}
          {message && (
            <p role="status" className="error">
              {message}
            </p>
          )}
          <button disabled={busy} className="primary">
            {busy
              ? "Un momento…"
              : reset
                ? "Guardar contraseña"
                : mode === "register"
                  ? "Crear mi cuenta"
                  : mode === "forgot"
                    ? "Enviar enlace"
                    : "Entrar a mi espacio"}
            <ArrowRight size={18} />
          </button>
        </form>
        <button
          className="text-button"
          onClick={() => {
            setMode(mode === "register" ? "login" : "register");
            setMessage("");
          }}
        >
          {mode === "register"
            ? "Ya tengo una cuenta"
            : "Quiero crear mi cuenta"}
        </button>
        {mode === "login" && (
          <button className="text-button" onClick={() => setMode("forgot")}>
            Olvidé mi contraseña
          </button>
        )}
      </section>
    </div>
  );
}
