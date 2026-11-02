# Biblioteca editorial de semanas 1–42

Fuente: texto editorial adjunto proporcionado por el usuario el 2 de noviembre de 2026. Versión: `user-editorial-2026-11-02-v1`.

`weeks.es-AR.json` conserva los títulos, textos y asociaciones de tamaño aportados. Los resúmenes son extractos del texto original de hasta 35 palabras y los hitos son oraciones de ese mismo texto; no se genera contenido con IA en ejecución. No representan validación clínica.

Todos los registros nuevos se cargan con `PENDING_REVIEW`, `published=false`, `reviewedBy=null` y `reviewedAt=null`. Las fuentes propuestas se guardan como nombres pendientes de contraste. No se atribuyen URLs o revisiones médicas inexistentes. Los cambios maternos tienen un campo separado, inicialmente nulo: requieren redacción y revisión profesional antes de publicarse.

Las medidas guardan centímetros o rangos, sin usar cero para datos ausentes. Las semanas 1–3 y 41–42 no tienen longitud representativa. El cambio CRL → longitud total de la tabla ocurre entre 13 y 14 y debe contrastarse con fuentes coherentes antes de aprobarlo. El campo de trimestre de la biblioteca es editorial; el trimestre real de cada embarazo se calcula con su edad exacta.

La numeración de pantalla distingue semana en curso de semanas completas. Revisar especialmente títulos como «ya está a término» contra la edad exacta: el rótulo «Semana 39» puede corresponder a 38+1 bajo la convención solicitada; no equivale por sí solo a 39+0. La revisión profesional debe resolver esa correspondencia antes de publicar.

## Carga y preservación

```sh
npm run db:seed
```

Usa `upsert` por semana con `update: {}` dentro de una transacción: crea solo registros faltantes, no sobrescribe textos, medidas, revisión o publicación existentes, incluso si una versión futura cambia la fuente. Las nuevas versiones requieren una revisión editorial explícita. No borra embarazos, usuarios, archivos ni citas. Ejecutar otra vez no duplica semanas ni modifica `updatedAt` de registros existentes.

Vercel ejecuta el seed después de las migraciones del manifiesto de esta entrega. Solo se ha comprobado su ejecución local; verificar el build remoto antes de afirmar que está cargado en producción.

## Imágenes

Hay 39 PNG transparentes de 512×512, en rutas distintas para las comparaciones de semanas 4–42. Son marcadores neutros, no ilustraciones anatómicas o de frutas, y se identifican visualmente como «Ilustración específica pendiente». No están presentados como arte terminado. No contienen texto integrado ni marcas de agua. Las semanas 1–3 no simulan una fruta.

Un administrador puede cargar un original autorizado y seleccionarlo como ilustración de la semana; los recursos originales publicados tienen prioridad sobre el marcador. Los marcadores no deben aprobarse como ilustraciones definitivas.
