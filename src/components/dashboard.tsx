"use client";
import { FruitComparison } from "./fruit-comparison";
import { formatGestationalAge } from "@/lib/gestation";
import { type Row } from "@/lib/client";
import {
  ArrowRight,
  Baby,
  CalendarDays,
  ChevronRight,
  Flower2,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { extra, sections } from "./navigation";
import { BrandGraphic } from "./ui";
export function Dashboard({ data: d }: { data: Row }) {
  const g = d.gestation;
  return (
    <>
      <div className="dashboard-grid">
        <section className="pregnancy-card">
          <div className="card-top">
            <span className="pill">
              <Heart size={15} /> MI EMBARAZO
            </span>
            <span>Trimestre {g.trimester}</span>
          </div>
          <div className="pregnancy-content">
            <div>
              <p className="soft-label">Cada día, un poquito más cerca</p>
              <h2>Semana {g.currentWeek}</h2>
              <p className="exact-gestational-age">
                {formatGestationalAge(g.completedWeeks, g.days)}
              </p>
              <p>
                Estás en tu {["", "primer", "segundo", "tercer"][g.trimester]}{" "}
                trimestre.
              </p>
            </div>
            <div className="pregnancy-art">
              <div className="art-orbit" />
              <Heart size={84} strokeWidth={1.1} />
              <span className="sparkle">✦</span>
            </div>
          </div>
          <div className="progress-caption">
            <span>Un camino lleno de amor</span>
            <strong>{Math.round(g.percent)}%</strong>
          </div>
          <progress max={100} value={g.percent} />
          <div className="pregnancy-bottom">
            <div>
              <CalendarDays size={19} />
              <span>
                Fecha probable de parto
                <strong>
                  {new Date(d.pregnancy.dueDate).toLocaleDateString("es-AR", {
                    timeZone: "UTC",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
              </span>
            </div>
            <div>
              <span>
                Nos acercamos al gran día
                <strong>Faltan aprox. {g.remaining} días</strong>
              </span>
              <Heart size={22} />
            </div>
          </div>
        </section>
        <section className="size-card">
          <div className="tiny-icon">
            <Flower2 />
          </div>
          <p className="eyebrow">ASÍ DE PEQUEÑO, ASÍ DE INMENSO</p>
          <h2>El tamaño de tu bebé</h2>
          {d.week ? (
            <FruitComparison
              content={d.week}
              showFruit={d.user.preferences.size !== "measurement"}
            />
          ) : (
            <>
              <div className="size-placeholder">
                <Heart size={56} strokeWidth={1} />
              </div>
              <h3>Creciendo a su ritmo</h3>
              <p>
                La comparación de esta semana estará disponible cuando cuente
                con revisión médica.
              </p>
            </>
          )}
        </section>
      </div>
      <div className="section-title">
        <h2>Todo lo que querés cuidar</h2>
        <span>Tu mundo BAMBEE</span>
      </div>
      <div className="quick-grid">
        {[...sections.slice(1, 4), ...extra.slice(0, 3)].map(
          ([url, label, Icon], i) => (
            <Link href={url} className={"quick quick-" + i} key={url}>
              <div>
                <Icon size={25} />
              </div>
              <strong>{label}</strong>
              <ChevronRight size={16} />
            </Link>
          ),
        )}
      </div>
      <div className="lower-grid">
        <section className="card">
          <div className="section-title">
            <h2>¿Qué está pasando con tu bebé?</h2>
            <span className="tiny-icon">
              <Baby />
            </span>
          </div>
          {d.week ? (
            <>
              <h3>{d.week.title}</h3>
              <p>{d.week.summary}</p>
              <Link className="inline-link" href="/bebe">
                Conocer más sobre mi bebé <ArrowRight size={17} />
              </Link>
            </>
          ) : (
            <>
              <p>
                Tu historia es única. Estamos preparando información de esta
                etapa con referencias y revisión profesional.
              </p>
              <Link className="inline-link" href="/bebe">
                Explorar las semanas <ArrowRight size={17} />
              </Link>
            </>
          )}
        </section>
        <section className="card">
          <div className="section-title">
            <h2>Tu próxima cita</h2>
            <CalendarDays size={22} />
          </div>
          {d.next ? (
            <>
              <h3>{d.next.title}</h3>
              <p>
                {new Date(d.next.at).toLocaleString("es-AR", {
                  timeZone: d.user.timezone,
                })}
              </p>
              <p>
                {d.next.professional} · {d.next.location}
              </p>
            </>
          ) : (
            <p>
              Todavía no hay una próxima cita. Organizá tus consultas y dejá que
              te acompañemos con un recordatorio.
            </p>
          )}
          <Link className="inline-link" href="/agenda">
            Ir a mi agenda <ArrowRight size={17} />
          </Link>
        </section>
      </div>
      <section className="weekly-message">
        <BrandGraphic slug="bee" fallback={<Heart size={33} />} />
        <div>
          <p className="eyebrow">UN MIMO PARA ESTA SEMANA</p>
          <h3>
            No tenés que tener todas las respuestas. Vamos paso a paso, juntos.
          </h3>
        </div>
        <span>Con amor, BAMBEE ♡</span>
      </section>
    </>
  );
}
