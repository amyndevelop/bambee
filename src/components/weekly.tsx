"use client";
import { api, type Row } from "@/lib/client";
import { useEffect, useState } from "react";
import { Empty } from "./ui";
export function Weekly({ current }: { current: number }) {
  const [weeks, setWeeks] = useState<Row[]>([]),
    [week, setWeek] = useState(Math.min(42, Math.max(1, current)));
  useEffect(() => {
    api("/api/data?kind=weeks").then(setWeeks);
  }, []);
  const content = weeks.find((w) => w.week === week);
  return (
    <>
      <div className="week-nav">
        {Array.from({ length: 42 }, (_, i) => i + 1).map((n) => (
          <button
            className={week === n ? "selected" : ""}
            onClick={() => setWeek(n)}
            key={n}
          >
            Sem {n}
            {n === current ? " · Hoy" : ""}
          </button>
        ))}
      </div>
      <section className="card">
        <p className="eyebrow">SEMANA {week}</p>
        {content ? (
          <>
            {content.illustration?.published && (
              <img
                className="weekly-illustration"
                alt={content.fruit}
                src={"/api/brand?slug=" + content.illustration.slug}
              />
            )}
            <h2>{content.title}</h2>
            <p>{content.summary}</p>
            <h3>
              {content.fruit} · {content.measurement}
            </h3>
            <p className="preserve">{content.details}</p>
            <h3>Referencias</h3>
            {content.referenceUrls.map((url: string) => (
              <p key={url}>
                <a href={url} rel="noreferrer" target="_blank">
                  {url}
                </a>
              </p>
            ))}
            <small>
              Revisión registrada:{" "}
              {new Date(content.reviewedAt).toLocaleDateString("es-AR")}
            </small>
          </>
        ) : (
          <Empty
            title="Información en preparación"
            text="Todavía no hay contenido clínico publicado y revisado para esta semana. Tu edad gestacional no cambia al explorar otras semanas."
          />
        )}
      </section>
    </>
  );
}
