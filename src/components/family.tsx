"use client";
import { Tasks } from "./tasks";
import { api, type Row } from "@/lib/client";
import { FormEvent, useEffect, useState } from "react";
import { Field } from "./ui";
export function Family({
  data,
  save,
}: {
  data: Row;
  save: (d: Row) => Promise<void>;
}) {
  const [members, setMembers] = useState<Row[]>([]),
    [message, setMessage] = useState(""),
    [token, setToken] = useState("");
  const load = () =>
    api("/api/data?kind=family&pregnancyId=" + data.pregnancy.id).then(
      setMembers,
    );
  useEffect(() => {
    void load();
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, [data.pregnancy.id]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await save({
        action: "invite",
        email: f.get("email"),
        appointments: f.get("appointments") === "on",
        tasks: f.get("tasks") === "on",
      });
      setMessage("Invitación enviada por correo. Vence en 48 horas.");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <>
      <Tasks pregnancyId={data.pregnancy.id} save={save} />
      <section className="card">
        <h2>Un camino para compartir</h2>
        <p>
          Tu familia puede ver el progreso. Las citas solo se comparten si las
          autorizás. Tus síntomas, diario, ecografías y fotografías permanecen
          privados.
        </p>
        {token && (
          <button
            className="primary"
            onClick={async () => {
              try {
                await save({ action: "accept", token });
                setMessage("Invitación aceptada");
                setToken("");
                await load();
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            Aceptar invitación explícitamente
          </button>
        )}
        {data.isOwner && (
          <form onSubmit={submit}>
            <Field
              label="Correo de la persona que querés invitar"
              name="email"
              type="email"
              required
            />
            <label className="check">
              <input type="checkbox" name="appointments" /> Autorizar acceso a
              citas
            </label>
            <label className="check">
              <input type="checkbox" name="tasks" /> Autorizar acceso a tareas
            </label>
            <button className="primary">Enviar invitación</button>
          </form>
        )}
        {message && <p role="status">{message}</p>}
      </section>
      {members.map((m) => (
        <div className="card toolbar" key={m.id}>
          <span>
            {m.user.name} · {m.user.email}
          </span>
          <label className="check">
            <input
              type="checkbox"
              checked={m.appointments}
              onChange={async (e) => {
                await save({
                  action: "memberPermission",
                  id: m.id,
                  appointments: e.target.checked,
                  tasks: m.tasks,
                });
                await load();
              }}
            />{" "}
            Compartir citas
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={m.tasks}
              onChange={async (e) => {
                await save({
                  action: "memberPermission",
                  id: m.id,
                  appointments: m.appointments,
                  tasks: e.target.checked,
                });
                await load();
              }}
            />{" "}
            Compartir tareas
          </label>
          <button
            onClick={async () => {
              await save({ action: "revokeMember", id: m.id });
              await load();
            }}
          >
            Revocar acceso
          </button>
        </div>
      ))}
    </>
  );
}
