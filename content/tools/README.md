# Catálogo de nombres

Fuente principal: `baby-names.es-AR.json`, copia de los 572 objetos de `bambee_nombres.json` del ZIP aportado por el usuario. `catalog-572-source.txt` conserva el resumen del archivo. Se mantienen literalmente nombres, orígenes, significados y aclaraciones etimológicas. No se atribuye validación individual externa.

El importador adapta `masculino/femenino/unisex` a `M/F/U`; `sourceNote` se conserva como `source`. `published=true` hace visibles los registros y `reviewStatus=editorial_initial` es solo metadato. `verification` no oculta significados.

`baby-names.legacy.es-AR.json` conserva los 475 nombres de la primera versión y se usa exclusivamente para reconocer metadatos originales sin editar. No se recrean los registros anteriores. Al actualizar una base con esos 475 nombres, 320 coinciden exactamente con el nuevo catálogo: se completan en sus IDs existentes, se crean 252 y se conservan otros 155. El resultado es 727 registros, de los cuales 572 pertenecen al archivo nuevo. Los nombres anteriores sin definición conservan sus campos originales, sin inventar significados ni agregar placeholders al catálogo nuevo.

`nameKey` usa NFC, minúsculas y espacios exteriores recortados para identificar una grafía exacta. Conserva las tildes. `normalized` omite tildes solo para buscar y ya no es único: Mía/Mia y Sofía/Sofia tienen IDs independientes. Las relaciones `BabyNameChoice` no se eliminan ni se reasignan.

El seed usa upsert, procedencia y una huella del contenido para completar el catálogo inicial una sola vez. No reescribe correcciones propias ni decisiones de publicación administrativa. Repetir la importación no crea duplicados ni reactiva nombres despublicados. Los administradores pueden editar, añadir variantes, publicar/despublicar e importar arrays JSON de hasta 2000 registros desde el panel.

El catálogo público se consulta en `/nombres` y `/api/names`, sin sesión. La búsqueda admite mayúsculas, tildes, inicial, género, origen y longitud; se ordena alfabéticamente y se pagina en el servidor. Para guardar favoritos, notas o votos se exige autenticación, embarazo autorizado y, cuando corresponde, permiso familiar. La API pública nunca devuelve votos o notas personales.

La migración incremental `20261103140000_names_public_catalog` agrega metadatos e índices y reemplaza únicamente el índice único anterior de búsqueda. No elimina nombres, usuarios, tablas ni relaciones. El manifiesto de producción incluye ahora nueve migraciones.

Verificación: catálogo fuente de 572 filas completas; importación a PostgreSQL con los 475 IDs previos conservados; 572 registros importados publicados; búsqueda de Noah, Mía/Mia, Benjamín, Gael, Milo y Sofía/Sofia; conservación de favoritos/votos/notas; paginación, filtros y despublicación manual. La publicación remota depende de que finalice el despliegue de Vercel; las pruebas locales no verifican su estado.

Resultado ejecutado de esta entrega: `npm test` aprobó 46 pruebas; `npm run vercel-build` aprobó migraciones, seed y compilación; `npm run test:weekly-workflow` aprobó preservación del catálogo, 28 casos HTTP previos, las nuevas verificaciones públicas y 20 pruebas de navegador en cuatro resoluciones. La comparación directa confirmó que el JSON del repositorio es idéntico en contenido al JSON del ZIP.
