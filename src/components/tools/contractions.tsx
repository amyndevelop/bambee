"use client";
import { useEffect, useRef, useState } from "react";
import { api, type Row } from "@/lib/client";
import { contractionEventSchema } from "@/modules/tools/validation";
import { Field } from "../ui";
import {
  readLocalContractions,
  writeLocalContractions,
} from "@/modules/tools/offline-contractions";
import {
  clock,
  contractionStats,
  durationSeconds,
  contractionCsv,
} from "@/modules/tools/contraction-math";
import { downloadBlob, dateTimeInput } from "./common";
type Event = { key: string; op: string; data: Row };
type State = { sessions: Row[]; queue: Event[] };
export function Contractions({
  pregnancyId,
  userId,
}: {
  pregnancyId: string;
  userId: string;
}) {
  const scope = userId + ":" + pregnancyId,
    [state, setState] = useState<State>({ sessions: [], queue: [] }),
    ref = useRef(state),
    writes = useRef<Promise<void>>(Promise.resolve()),
    syncing = useRef(false),
    [ready, setReady] = useState(false),
    [offlineReady, setOfflineReady] = useState(false),
    [error, setError] = useState(""),
    [now, setNow] = useState(Date.now()),
    [minutes, setMinutes] = useState(60),
    [selected, setSelected] = useState(""),
    [edit, setEdit] = useState<Row | null>(null),
    [safety, setSafety] = useState<Row | null>(null),
    [busy, setBusy] = useState(false);
  const persist = (update: State | ((current: State) => State)) => {
    const operation = writes.current
      .catch(() => {})
      .then(async () => {
        const next =
          typeof update === "function" ? update(ref.current) : update;
        await writeLocalContractions(scope, next);
        ref.current = next;
        setState(next);
      });
    writes.current = operation;
    return operation;
  };
  const flush = async () => {
    if (syncing.current || !navigator.onLine) return;
    syncing.current = true;
    try {
      while (ref.current.queue.length) {
        const event = ref.current.queue[0];
        const controller = new AbortController(),
          timer = setTimeout(() => controller.abort(), 8000);
        try {
          const r = await fetch("/api/tools", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              module: "contractions",
              pregnancyId,
              op: event.op,
              data: event.data,
            }),
            signal: controller.signal,
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          await persist((current) => ({
            ...current,
            queue: current.queue.filter((q) => q.key !== event.key),
          }));
        } finally {
          clearTimeout(timer);
        }
      }
      setError("");
    } catch (e) {
      setError(
        `Sin sincronizar: ${(e as Error).name === "AbortError" ? "conexión interrumpida" : (e as Error).message}. Los registros quedan cifrados en este dispositivo.`,
      );
    } finally {
      syncing.current = false;
    }
  };
  const enqueue = async (op: string, data: Row, sessions: Row[]) => {
    setBusy(true);
    try {
      await persist((current) => ({
        sessions,
        queue: [...current.queue, { key: crypto.randomUUID(), op, data }],
      }));
      void flush();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    let alive = true;
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.ready.then((registration) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          if (alive && event.data?.ready) setOfflineReady(true);
          channel.port1.close();
        };
        registration.active?.postMessage({ type: "BAMBEE_WARM_TIMER" }, [
          channel.port2,
        ]);
      });
    (async () => {
      try {
        const local = await readLocalContractions<State>(scope);
        if (!alive) return;
        if (local) {
          ref.current = local;
          setState(local);
        }
        const remote = await api(
          `/api/tools?module=contractions&pregnancyId=${pregnancyId}`,
        );
        if (!alive) return;
        setSafety(remote.safety);
        if (!ref.current.queue.length)
          await persist({ sessions: remote.sessions, queue: [] });
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) {
          setReady(true);
          void flush();
        }
      }
    })();
    const timer = setInterval(() => setNow(Date.now()), 250),
      sync = setInterval(() => void flush(), 15000),
      online = () => void flush();
    window.addEventListener("online", online);
    return () => {
      alive = false;
      clearInterval(timer);
      clearInterval(sync);
      window.removeEventListener("online", online);
    };
  }, [scope]);
  const session =
      state.sessions.find(
        (s) =>
          s.id ===
          (selected || state.sessions.find((s) => s.status === "ACTIVE")?.id),
      ) || state.sessions[0],
    records: (Row & { startedAt: string; endedAt: string | null })[] =
      session?.records || [],
    active = records.find((r) => !r.endedAt),
    stats = contractionStats(records, minutes, now);
  const updateSession = (s: Row) =>
    void enqueue(
      "session",
      {
        id: s.id,
        startedAt: s.startedAt,
        status: s.status,
        instructions: s.instructions || "",
      },
      state.sessions.map((v) => (v.id === s.id ? s : v)),
    );
  return (
    <>
      <h2>Mis contracciones</h2>
      <section className="editorial-notice" role="note">
        <strong>
          Esta herramienta sirve para registrar contracciones, pero no determina
          por sí sola si estás en trabajo de parto.
        </strong>
        <p>
          No esperes a completar registros para consultar. Si algo te preocupa,
          contactá a tu equipo obstétrico o al servicio de urgencias.
        </p>
        {safety ? (
          <p>
            {safety.config.text} · Revisión: {safety.config.reviewedBy}.{" "}
            {safety.config.sourceUrls.map((url: string) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                Fuente revisada
              </a>
            ))}
          </p>
        ) : (
          <p>
            No hay una guía de signos de urgencia con revisión profesional
            registrada en BAMBEE. Seguí las indicaciones de tu equipo de salud.
          </p>
        )}
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p>
        <small>
          {offlineReady
            ? "Cronómetro preparado para recargar sin conexión."
            : "Preparando el acceso sin conexión; mantené esta pantalla abierta hasta completarlo."}
        </small>
      </p>
      <p role="status">
        {!ready
          ? "Recuperando tus registros…"
          : state.queue.length
            ? `${state.queue.length} cambios pendientes de sincronización`
            : "Registros sincronizados"}
      </p>
      <p>
        <small>
          Para reconexiones se guarda una copia cifrada solo en este
          dispositivo, durante un máximo de 48 horas desde el último cambio. No
          cierres sesión ni borres los datos del navegador hasta sincronizar.
        </small>
      </p>
      <section className="card contraction-clock">
        <span className="timer-digits" aria-live="off">
          {active ? clock(durationSeconds(active, now)) : "00:00"}
        </span>
        {!session || session.status !== "ACTIVE" ? (
          <button
            className="primary"
            disabled={!ready || busy}
            onClick={() => {
              const s = {
                id: crypto.randomUUID(),
                startedAt: new Date().toISOString(),
                status: "ACTIVE",
                instructions: "",
                records: [],
              };
              setSelected(s.id);
              void enqueue("session", s, [s, ...state.sessions]);
            }}
          >
            Iniciar nueva sesión
          </button>
        ) : (
          <>
            <button
              className="primary"
              disabled={busy}
              onClick={() => {
                const stamp = new Date().toISOString();
                if (active) {
                  const record = { ...active, endedAt: stamp };
                  void enqueue(
                    "record",
                    { ...record, sessionId: session.id },
                    state.sessions.map((s) =>
                      s.id === session.id
                        ? {
                            ...s,
                            records: records.map((r) =>
                              r.id === active.id ? record : r,
                            ),
                          }
                        : s,
                    ),
                  );
                } else {
                  const record = {
                    id: crypto.randomUUID(),
                    sessionId: session.id,
                    startedAt: stamp,
                    endedAt: null,
                    note: "",
                  };
                  void enqueue(
                    "record",
                    record,
                    state.sessions.map((s) =>
                      s.id === session.id
                        ? { ...s, records: [...records, record] }
                        : s,
                    ),
                  );
                }
              }}
            >
              {active ? "Terminar contracción" : "Comenzar contracción"}
            </button>
            <div className="tool-actions">
              <button
                disabled={!!active || busy}
                onClick={() => updateSession({ ...session, status: "PAUSED" })}
              >
                Pausar sesión
              </button>
              <button
                disabled={!!active || busy}
                onClick={() =>
                  updateSession({ ...session, status: "FINISHED" })
                }
              >
                Finalizar sesión
              </button>
            </div>
          </>
        )}
        {session?.status === "PAUSED" && (
          <button
            disabled={busy || state.sessions.some((s) => s.status === "ACTIVE")}
            onClick={() => updateSession({ ...session, status: "ACTIVE" })}
          >
            Reanudar sesión
          </button>
        )}
        <button onClick={() => void flush()}>Sincronizar ahora</button>
      </section>
      <label>
        Sesiones
        <select
          value={session?.id || ""}
          onChange={(e) => setSelected(e.target.value)}
        >
          {state.sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {new Date(s.startedAt).toLocaleString("es-AR")} ·{" "}
              {s.status === "ACTIVE"
                ? "Activa"
                : s.status === "PAUSED"
                  ? "Pausada"
                  : "Finalizada"}
            </option>
          ))}
        </select>
      </label>
      {session && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            updateSession({
              ...session,
              instructions: new FormData(e.currentTarget).get("instructions"),
            });
          }}
          key={session.id + session.instructions}
        >
          <label>
            Indicaciones de mi equipo obstétrico
            <textarea
              name="instructions"
              defaultValue={session.instructions}
              maxLength={5000}
            />
          </label>
          <button>Guardar indicaciones</button>
        </form>
      )}
      <section className="card">
        <label>
          Ventana de estadísticas
          <select
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          >
            <option value={30}>Últimos 30 minutos</option>
            <option value={60}>Última hora</option>
            <option value={240}>Últimas 4 horas</option>
            <option value={1440}>Últimas 24 horas</option>
          </select>
        </label>
        <div className="tool-stats">
          <div>
            <strong>{stats.count}</strong>
            <span>contracciones en la ventana</span>
          </div>
          <div>
            <strong>
              {stats.meanDuration === null ? "—" : clock(stats.meanDuration)}
            </strong>
            <span>duración media</span>
          </div>
          <div>
            <strong>
              {stats.meanInterval === null ? "—" : clock(stats.meanInterval)}
            </strong>
            <span>intervalo medio entre inicios</span>
          </div>
        </div>
        <p>
          {records.length} registros en esta sesión. Sin reglas automáticas de
          diagnóstico.
        </p>
        <button
          disabled={!records.length}
          onClick={() =>
            downloadBlob(
              new Blob([contractionCsv(records)], {
                type: "text/csv;charset=utf-8",
              }),
              "bambee-contracciones.csv",
            )
          }
        >
          Descargar resumen CSV
        </button>
      </section>
      {edit && (
        <form
          className="card form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget),
              startedAt = new Date(String(f.get("start"))).toISOString(),
              endedAt = f.get("end")
                ? new Date(String(f.get("end"))).toISOString()
                : null;
            if (endedAt && endedAt < startedAt) {
              setError("La duración no puede ser negativa");
              return;
            }
            const record = {
              ...edit,
              startedAt,
              endedAt,
              note: String(f.get("note") || ""),
            };
            if (!contractionEventSchema.safeParse(record).success) {
              setError(
                "Revisá las fechas: la duración debe ser de entre 0 y 24 horas.",
              );
              return;
            }
            if (
              Date.parse(startedAt) > Date.now() + 60000 ||
              (endedAt && Date.parse(endedAt) > Date.now() + 60000)
            ) {
              setError("No se permiten horarios futuros.");
              return;
            }
            if (!endedAt && session.status !== "ACTIVE") {
              setError(
                "Una sesión pausada o finalizada requiere una hora de fin.",
              );
              return;
            }
            void enqueue(
              "correct",
              record,
              state.sessions.map((s) =>
                s.id === session.id
                  ? {
                      ...s,
                      records: records.map((r) =>
                        r.id === edit.id ? record : r,
                      ),
                    }
                  : s,
              ),
            );
            setEdit(null);
          }}
        >
          <Field
            label="Inicio (hora del dispositivo)"
            type="datetime-local"
            name="start"
            required
            defaultValue={dateTimeInput(edit.startedAt)}
          />
          <Field
            label="Fin (hora del dispositivo)"
            type="datetime-local"
            name="end"
            defaultValue={dateTimeInput(edit.endedAt)}
          />
          <label>
            Observaciones
            <textarea name="note" defaultValue={edit.note} maxLength={2000} />
          </label>
          <button className="primary">Guardar corrección</button>
          <button type="button" onClick={() => setEdit(null)}>
            Cancelar
          </button>
        </form>
      )}
      <div className="contraction-history">
        {[...records]
          .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
          .map((r) => {
            const sorted = [...records].sort((a, b) =>
                a.startedAt.localeCompare(b.startedAt),
              ),
              index = sorted.findIndex((v) => v.id === r.id);
            return (
              <article className="card tool-row" key={r.id}>
                <div>
                  <strong>
                    {new Date(r.startedAt).toLocaleString("es-AR")}
                  </strong>
                  <p>
                    Duración: {clock(durationSeconds(r, now))}
                    {!r.endedAt ? " · En curso" : ""}
                  </p>
                  <p>
                    Intervalo:{" "}
                    {index
                      ? clock(
                          (Date.parse(r.startedAt) -
                            Date.parse(sorted[index - 1].startedAt)) /
                            1000,
                        )
                      : "Primer registro"}
                  </p>
                  <p>{r.note}</p>
                </div>
                <button
                  onClick={() => setEdit({ ...r, sessionId: session.id })}
                >
                  Corregir
                </button>
                <button
                  onClick={() => {
                    if (confirm("¿Eliminar este registro incorrecto?"))
                      void enqueue(
                        "deleteRecord",
                        { id: r.id },
                        state.sessions.map((s) =>
                          s.id === session.id
                            ? {
                                ...s,
                                records: records.filter((v) => v.id !== r.id),
                              }
                            : s,
                        ),
                      );
                  }}
                >
                  Eliminar
                </button>
              </article>
            );
          })}
      </div>
    </>
  );
}
