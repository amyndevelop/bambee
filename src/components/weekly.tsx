"use client";
import { FruitComparison } from "./fruit-comparison";
import { EditorialNotice } from "./editorial-notice";
import { hasMedicalReview } from "@/lib/weekly-content";
import { reviewLabels } from "@/lib/weekly-content";
import { api, type Row } from "@/lib/client";
import { useEffect, useState, useRef } from "react";
import { formatGestationalAge } from "@/lib/gestation";
import { Empty } from "./ui";
export function Weekly({
  current,
  age,
}: {
  current: number;
  age: { completedWeeks: number; days: number; trimester: number };
}) {
  const [weeks, setWeeks] = useState<Row[]>([]),
    [week, setWeek] = useState(Math.min(42, Math.max(1, current)));
  const previousCurrent = useRef(Math.min(42, Math.max(1, current)));
  useEffect(() => {
    const bounded = Math.min(42, Math.max(1, current));
    setWeek((selected) =>
      selected === previousCurrent.current ? bounded : selected,
    );
    previousCurrent.current = bounded;
  }, [current]);
  useEffect(() => {
    api("/api/data?kind=weeks").then(setWeeks);
  }, []);
  const content = weeks.find((w) => w.week === week);
  return (
    <>
      <p className="current-gestational-age">
        Tu semana en curso: <strong>Semana {current}</strong> ·{" "}
        {formatGestationalAge(age.completedWeeks, age.days)}
      </p>
      <div className="week-nav">
        {Array.from({ length: 42 }, (_, i) => i + 1).map((n) => (
          <button
            className={week === n ? "selected" : ""}
            aria-current={n === current ? "step" : undefined}
            aria-pressed={week === n}
            onClick={() => setWeek(n)}
            key={n}
          >
            Sem {n}
            {n === current ? " · Hoy" : ""}
          </button>
        ))}
      </div>
      <EditorialNotice content={content} />
      <section className="card">
        <p className="eyebrow">SEMANA {week}</p>
        {content ? (
          <>
            <h2>
              Semana {week} · Trimestre{" "}
              {week === current
                ? age.trimester
                : content.trimester || (week <= 13 ? 1 : week <= 27 ? 2 : 3)}
            </h2>
            <FruitComparison content={content} />
            <h2>{content.title}</h2>
            <p>{content.summary}</p>
            <p className="preserve">{content.details}</p>
            {!!content.developmentHighlights?.length && (
              <>
                <h3>Principales acontecimientos</h3>
                <ul>
                  {content.developmentHighlights.map(
                    (text: string, i: number) => (
                      <li key={i}>{text}</li>
                    ),
                  )}
                </ul>
              </>
            )}
            <h3>¿Qué puede estar pasando en tu cuerpo?</h3>
            <p className="preserve">
              {content.maternalChanges ||
                "Este apartado está pendiente de revisión profesional."}
            </p>
            <p>
              No todas las personas experimentan los mismos cambios. Este
              contenido educativo no evalúa tu embarazo ni reemplaza la consulta
              con tu equipo de salud.
            </p>
            <h3>
              {content.referenceUrls.length
                ? "Referencias"
                : "Referencias específicas pendientes"}
            </h3>
            {!content.referenceUrls.length && (
              <p>
                Todavía no se incorporaron referencias específicas verificadas.
                Fuentes propuestas para contrastar el contenido:{" "}
                {content.sourceNames?.join(", ") || "pendientes de selección"}.
              </p>
            )}
            {content.referenceUrls.map((url: string) => (
              <p key={url}>
                <a href={url} rel="noreferrer" target="_blank">
                  {url}
                </a>
              </p>
            ))}
            <small>
              {reviewLabels[content.reviewStatus]} · Actualizado:{" "}
              {new Date(content.updatedAt).toLocaleDateString("es-AR")}
              {hasMedicalReview(content) && (
                <>
                  {" "}
                  · Revisión registrada:{" "}
                  {new Date(content.reviewedAt).toLocaleDateString("es-AR")}
                </>
              )}
            </small>
          </>
        ) : (
          <Empty
            title="Información en preparación"
            text="Todavía no hay contenido publicado para esta semana. Tu edad gestacional no cambia al explorar otras semanas."
          />
        )}
      </section>
    </>
  );
}
