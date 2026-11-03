"use client";
import { clearLocalContractions } from "@/modules/tools/offline-contractions";
import { api, type Row } from "@/lib/client";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Onboarding } from "./onboarding";
import { Field } from "./ui";
export function Preferences({
  data,
  save,
}: {
  data: Row;
  save: (d: Row) => Promise<void>;
}) {
  const [message, setMessage] = useState(""),
    [newPregnancy, setNewPregnancy] = useState(false);
  return (
    <>
      {newPregnancy ? (
        <Onboarding save={save} error="" />
      ) : (
        <>
          <section className="card">
            <h2>Tu espacio, a tu manera</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                await save({
                  action: "preferences",
                  weekly: f.has("weekly"),
                  appointment: f.has("appointment"),
                  family: f.has("family"),
                  preparations: f.has("preparations"),
                  questions: f.has("questions"),
                  size: f.get("size"),
                  timezone: f.get("timezone"),
                });
                setMessage("Preferencias guardadas");
              }}
            >
              {[
                ["weekly", "Nueva semana"],
                ["appointment", "Recordatorios de citas"],
                ["family", "Invitaciones familiares"],
                ["preparations", "Recordatorios de preparativos"],
                ["questions", "Preguntas antes de la consulta"],
              ].map(([key, label]) => (
                <label className="check" key={key}>
                  <input
                    type="checkbox"
                    name={key}
                    defaultChecked={data.user.preferences[key] !== false}
                  />
                  {label}
                </label>
              ))}
              <label>
                Zona horaria
                <select name="timezone" defaultValue={data.user.timezone}>
                  {[
                    ...new Set([
                      data.user.timezone,
                      ...Intl.supportedValuesOf("timeZone"),
                    ]),
                  ].map((zone) => (
                    <option key={zone}>{zone}</option>
                  ))}
                </select>
              </label>
              <label>
                Comparación de tamaño
                <select
                  name="size"
                  defaultValue={data.user.preferences.size || "fruit"}
                >
                  <option value="fruit">Fruta</option>
                  <option value="measurement">Medida orientativa</option>
                </select>
              </label>
              <button className="primary">Guardar preferencias</button>
            </form>
            {message && <p role="status">{message}</p>}
          </section>
          {data.isOwner && (
            <section className="card">
              <h2>Datación del embarazo</h2>
              <p>
                Solo se modifica con tu confirmación. Una fecha profesional
                nunca se reemplaza automáticamente.
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await save({
                    action: "dating",
                    date: f.get("date"),
                    source: f.get("source"),
                    confirmed: f.has("confirmed"),
                  });
                  setMessage("Fecha actualizada");
                }}
              >
                <Field type="date" name="date" label="Fecha" required />
                <label>
                  Origen
                  <select name="source">
                    <option value="MEDICAL">
                      Fecha probable de parto profesional
                    </option>
                    <option value="LMP">Última menstruación</option>
                  </select>
                </label>
                <label className="check">
                  <input type="checkbox" name="confirmed" required /> Confirmo
                  esta corrección de datación
                </label>
                <button className="primary">Actualizar fecha</button>
              </form>
              <button
                onClick={async () => {
                  await save({ action: "archive" });
                  setMessage("Embarazo archivado");
                }}
              >
                Archivar embarazo
              </button>
              <button onClick={() => setNewPregnancy(true)}>
                Registrar otro embarazo
              </button>
            </section>
          )}
          <section className="card">
            <h2>Privacidad y cuenta</h2>
            <a className="inline-link" href="/api/privacy">
              Exportar mis registros (JSON)
            </a>
            <p>Los archivos se descargan desde sus galerías privadas.</p>
            <button
              onClick={async () => {
                await api("/api/account", { action: "revoke" });
                await clearLocalContractions();
                await signOut({ callbackUrl: "/acceso" });
              }}
            >
              Cerrar todas las sesiones
            </button>
            <button
              className="danger"
              onClick={async () => {
                const confirm = prompt(
                  "Escribí ELIMINAR para borrar tu cuenta y tus archivos.",
                );
                if (confirm === "ELIMINAR") {
                  try {
                    await api("/api/privacy", { confirm }, "DELETE");
                    await clearLocalContractions();
                    await signOut({ callbackUrl: "/acceso" });
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }
              }}
            >
              Eliminar mi cuenta y mis datos
            </button>
          </section>
        </>
      )}
    </>
  );
}
