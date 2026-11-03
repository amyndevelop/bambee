# Biblioteca editorial de semanas 1–42

Fuente: texto editorial adjunto proporcionado por el usuario el 2 de noviembre de 2026. Versión pública ampliada: `user-editorial-2026-11-03-maternal-v3`. La versión anterior se conserva en `weeks.es-AR.v1.json` para identificar registros de origen sin modificaciones.

`weeks.es-AR.json` contiene los textos y asociaciones de tamaño aportados. Los textos de semanas 37, 39, 40, 41 y 42 se ajustaron para distinguir los criterios de término basados en semanas completas de la etiqueta de semana en curso. Los resúmenes son extractos del texto original de hasta 35 palabras y los hitos son oraciones de ese mismo texto; no se genera contenido con IA en ejecución. No representan validación clínica.

Por pedido explícito del usuario, los 42 registros nuevos se hacen visibles con `editorialPublished=true` y el marcador `public-editorial-v2`. La revisión sigue en `PENDING_REVIEW`, `published=false` (publicación médica revisada), `reviewedBy=null` y `reviewedAt=null`. La aplicación muestra un aviso claro de revisión profesional pendiente en dashboard y Mi bebé. Las fuentes propuestas se guardan como nombres pendientes de contraste. Por pedido del usuario, las 42 semanas incluyen ahora una orientación sobre cambios posibles en el cuerpo, sin revisión clínica atribuida. Se enlazan recursos generales de NHS y MedlinePlus como lecturas complementarias, no como aval de estos textos ni como referencias específicas verificadas de cada afirmación. El acceso web del entorno a NHS fue bloqueado por el proxy: no se afirma haber consultado su versión actual. No se inventan revisores, fechas de revisión ni citas textuales.

Las medidas guardan centímetros o rangos, sin usar cero para datos ausentes. Las semanas 1–3 y 41–42 no tienen longitud representativa. El cambio CRL → longitud total de la tabla ocurre entre 13 y 14 y debe contrastarse con fuentes coherentes antes de aprobarlo. El campo de trimestre de la biblioteca es editorial; el trimestre real de cada embarazo se calcula con su edad exacta.

La numeración de pantalla distingue semana en curso de semanas completas. Revisar especialmente títulos como «ya está a término» contra la edad exacta: el rótulo «Semana 39» puede corresponder a 38+1 bajo la convención solicitada; no equivale por sí solo a 39+0. Los textos públicos expresan las clasificaciones de término en semanas completas y mantienen pendiente la revisión profesional.

## Carga y preservación

```sh
npm run db:seed
```

Usa `upsert` por semana dentro de una transacción. Crea registros faltantes y realiza una única transición de publicación para el origen v1, únicamente si todos sus campos coinciden con el archivo original y todavía no tiene marcador de publicación. No sobrescribe registros personalizados, revisiones o decisiones de ocultar contenido. Tras la transición, el marcador impide que un despliegue posterior vuelva a publicar una semana ocultada desde administración. No borra embarazos, usuarios, archivos ni citas. La ampliación v3 completa una sola vez los campos maternos vacíos del origen v2 pendiente de revisión y agrega lecturas generales si no había referencias. Conserva títulos propios y decisiones de ocultar, no altera semanas aprobadas y nunca reescribe una edición v3. Ejecutar otra vez no duplica semanas ni cambia los registros ya procesados.

Vercel ejecuta el seed después de las migraciones del manifiesto de esta entrega. Solo se ha comprobado su ejecución local; verificar el build remoto antes de afirmar que está cargado en producción.

## Imágenes

Las 39 ilustraciones originales del PDF `design/fruits/fyv.pdf` se extraen como PNG con transparencia para las semanas 4–42. `design/fruits/sources.json` registra el hash del original, la correspondencia por semana y las regiones de extracción. El seed sustituye únicamente los marcadores conocidos que aún conservan la misma fruta; preserva arte personalizado, textos, revisiones y decisiones de ocultar. Las semanas 1–3 no simulan una fruta. Los archivos `-pending.png` se conservan por compatibilidad con ediciones históricas.

Un administrador puede cargar un original autorizado y seleccionarlo como ilustración de la semana; los recursos originales publicados tienen prioridad sobre el marcador. Los marcadores no deben aprobarse como ilustraciones definitivas.
