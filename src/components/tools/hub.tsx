"use client";
import Link from "next/link";
import {
  Backpack,
  Heart,
  Share2,
  MessageCircle,
  Film,
  Timer,
} from "lucide-react";
import { useTool } from "./common";
export const toolLinks = [
  ["/preparativos", "Mis preparativos", "preparations", Backpack],
  ["/nombres", "Nombres para mi bebé", "names", Heart],
  ["/compartir", "Compartir mi embarazo", "cards", Share2],
  ["/preguntas", "Mis preguntas", "questions", MessageCircle],
  ["/pancita/evolucion", "Mi evolución en video", "private", Film],
  ["/contracciones", "Mis contracciones", "private", Timer],
] as const;
export function ToolsHub({
  pregnancyId,
  compact = false,
}: {
  pregnancyId: string;
  compact?: boolean;
}) {
  const t = useTool("overview", pregnancyId),
    tasks = t.data?.tasks;
  return (
    <section className="card tools-hub">
      <p className="eyebrow">TE ACOMPAÑAMOS</p>
      <h2>Herramientas para esta etapa</h2>
      <p>
        Organizá lo que viene, guardá tus dudas y creá recuerdos a tu ritmo.
      </p>
      {t.error && (
        <p className="error" role="alert">
          {t.error}
        </p>
      )}
      <div className="tool-grid">
        {toolLinks
          .filter(
            ([, , permission]) => !t.data || t.data?.permissions[permission],
          )
          .map(([url, label, , Icon]) => (
            <Link className="tool-link" key={url} href={url}>
              <Icon size={25} />
              <strong>{label}</strong>
            </Link>
          ))}
      </div>
      {tasks?.total > 0 && (
        <div className="tool-progress">
          <Link href="/preparativos">
            Preparativos: {tasks.completed} de {tasks.total} completados
          </Link>
          <progress max={tasks.total} value={tasks.completed} />
        </div>
      )}
      {t.data?.pendingQuestions > 0 && (
        <Link href="/preguntas">
          Tenés {t.data?.pendingQuestions} preguntas pendientes para conversar.
        </Link>
      )}
      {compact && (
        <Link className="text-button" href="/herramientas">
          Ver todas las herramientas →
        </Link>
      )}
    </section>
  );
}
