"use client";
import { type Row } from "@/lib/client";
import { ArrowRight } from "lucide-react";
import { type FormEvent, useState } from "react";
import { BrandGraphic, BrandIsotype, Field, Logo } from "./ui";
export function Onboarding({
  save,
  error,
  name = "vos",
}: {
  save: (d: Row) => Promise<void>;
  error: string;
  name?: string;
}) {
  const [step, setStep] = useState(1),
    [source, setSource] = useState("LMP"),
    [draft, setDraft] = useState<Row>({}),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      d = Object.fromEntries(f);
    if (step < 3) {
      setDraft({
        ...draft,
        ...d,
        ...(step === 2
          ? {
              weekly: f.has("weekly") ? "on" : "",
              appointment: f.has("appointment") ? "on" : "",
              family: f.has("family") ? "on" : "",
            }
          : {}),
      });
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      await save({
        action: "preferences",
        weekly: draft.weekly === "on",
        appointment: draft.appointment === "on",
        family: draft.family === "on",
        size: draft.size || "fruit",
      });
      await save({
        action: "pregnancy",
        date: draft.date,
        babyName: draft.babyName,
        partnerName: draft.partnerName,
        source,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="onboarding">
      <Logo />
      <p className="eyebrow">PASO {step + 2} DE 5 · TU EMBARAZO</p>
      <h1>
        {step === 1
          ? "Cada historia tiene un comienzo"
          : step === 2
            ? "Hagamos este espacio tuyo"
            : `¡Qué lindo comenzar con ${name}!`}
      </h1>
      <p>
        {step < 3
          ? "La fecha calculada es orientativa y puede corregirse con la datación de tu profesional."
          : "Tu espacio está preparado. Vamos a guardar tus preferencias y comenzar este recorrido juntos."}
      </p>
      <form onSubmit={submit} key={step}>
        {step === 1 ? (
          <>
            <label>
              ¿Cómo querés configurar la fecha?
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="LMP">Última menstruación</option>
                <option value="MEDICAL">
                  Fecha probable de parto profesional
                </option>
              </select>
            </label>
            <Field
              name="date"
              type="date"
              label={
                source === "LMP"
                  ? "Primer día de la última menstruación"
                  : "Fecha probable de parto"
              }
              defaultValue={draft.date}
              required
            />
          </>
        ) : step === 2 ? (
          <>
            <Field
              label="Nombre o apodo del bebé (opcional)"
              name="babyName"
              defaultValue={draft.babyName}
              maxLength={100}
            />
            <Field
              label="Nombre de tu pareja (opcional)"
              name="partnerName"
              defaultValue={draft.partnerName}
              maxLength={100}
            />
            <label>
              Comparación de tamaño
              <select name="size" defaultValue={draft.size || "fruit"}>
                <option value="fruit">Fruta</option>
                <option value="measurement">Medida orientativa</option>
              </select>
            </label>
            <h3>Tus notificaciones internas</h3>
            {[
              ["weekly", "Comienzo de una nueva semana"],
              ["appointment", "Recordatorios de citas"],
              ["family", "Invitaciones familiares"],
            ].map(([key, label]) => (
              <label className="check" key={key}>
                <input
                  type="checkbox"
                  name={key}
                  defaultChecked={key in draft ? draft[key] === "on" : true}
                />
                {label}
              </label>
            ))}
          </>
        ) : (
          <div className="onboarding-celebration">
            <BrandGraphic slug="bee" fallback={<BrandIsotype />} />
            <p>
              {draft.babyName
                ? `Un espacio para vos y ${draft.babyName}.`
                : "Cada paso, cada emoción, cada recuerdo."}
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy
            ? "Preparando tu espacio…"
            : step < 3
              ? "Continuar"
              : "Comenzar mi recorrido"}
          <ArrowRight size={18} />
        </button>
        {step > 1 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setStep(step - 1)}
          >
            Volver
          </button>
        )}
      </form>
    </main>
  );
}
