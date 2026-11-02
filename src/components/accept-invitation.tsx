"use client";
import { type Row } from "@/lib/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./ui";
export function AcceptInvitation({
  save,
  error,
}: {
  save: (d: Row) => Promise<void>;
  error: string;
}) {
  const [token, setToken] = useState("");
  useEffect(
    () =>
      setToken(new URLSearchParams(window.location.search).get("token") || ""),
    [],
  );
  return (
    <main className="onboarding">
      <Logo />
      <h1>Compartamos este comienzo</h1>
      <p>
        Al aceptar, vas a poder ver el progreso del embarazo y los permisos
        autorizados por su titular. Los registros privados no se comparten.
      </p>
      {error && <p className="error">{error}</p>}
      {token ? (
        <button
          className="primary"
          onClick={() => save({ action: "accept", token })}
        >
          Aceptar invitación
        </button>
      ) : (
        <Link href="/">Configurar mi embarazo</Link>
      )}
    </main>
  );
}
