import type { Row } from "@/lib/client";
import { hasMedicalReview } from "@/lib/weekly-content";
export function EditorialNotice({
  content,
}: {
  content: Row | null | undefined;
}) {
  if (!content || hasMedicalReview(content)) return null;
  return (
    <div className="editorial-notice" role="note">
      <strong>Contenido educativo · Revisión profesional pendiente</strong>
      <p>
        Estos textos describen posibilidades generales, no certezas sobre tu
        embarazo. No cuentan con revisión médica de BAMBEE. Las lecturas
        externas enlazadas amplían la información; para evaluar tu caso,
        consultá a tu equipo de salud.
      </p>
    </div>
  );
}
