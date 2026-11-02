import type { Row } from "@/lib/client";
import { measurementLabels } from "@/lib/weekly-content";
export function FruitComparison({
  content,
  showFruit = true,
}: {
  content: Row;
  showFruit?: boolean;
}) {
  const approvedAsset = content.illustration?.published;
  const placeholder =
    content.fruitImageIsPlaceholder ||
    content.fruitImage?.endsWith("-pending.png");
  return (
    <div className="fruit-comparison">
      {approvedAsset ? (
        <img
          className="weekly-illustration"
          src={"/api/brand?slug=" + content.illustration.slug}
          alt={content.fruit}
        />
      ) : content.fruitImage ? (
        <figure className="fruit-figure">
          <img
            className="weekly-illustration"
            src={content.fruitImage}
            alt={
              placeholder
                ? "Ilustración de " + content.fruit + " pendiente"
                : content.fruit
            }
          />
          {placeholder && (
            <figcaption>Ilustración específica pendiente</figcaption>
          )}
        </figure>
      ) : null}
      <h3>{showFruit ? content.fruit : "Medida orientativa"}</h3>
      <p>{content.measurement}</p>
      {content.measurementMethod && (
        <p className="measurement-method">
          {measurementLabels[content.measurementMethod]}
        </p>
      )}
      {content.week === 14 && (
        <p className="measurement-method">
          Esta tabla cambia de CRL a longitud total entre las semanas 13 y 14.
          Las dos medidas no son directamente comparables.
        </p>
      )}
      <p>
        Comparación orientativa; no representa una medición clínica individual.
      </p>
    </div>
  );
}
