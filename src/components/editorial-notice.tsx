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
        Los textos, las comparaciones y las medidas orientativas están
        publicados para consulta general. Todavía no cuentan con revisión médica
        registrada y no describen la evolución individual de tu embarazo ni
        reemplazan la consulta profesional.
      </p>
    </div>
  );
}
