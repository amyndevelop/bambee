# Herramientas de BAMBEE

Esta ampliación conserva Inter, la identidad y todos los módulos existentes. El pedido original se conserva en `TOOLS_REQUEST.md`; la indicación posterior del usuario de utilizar Inter prevalece sobre las fuentes anteriores mencionadas allí.

## Rutas y modelos

| Pantalla                     | Ruta                 | Persistencia                                                                     |
| ---------------------------- | -------------------- | -------------------------------------------------------------------------------- |
| Herramientas para esta etapa | `/herramientas`      | Resumen autorizado del embarazo                                                  |
| Mis preparativos             | `/preparativos`      | `Task` existente, `PreparationCategory`, `ToolTemplate`                          |
| Nombres para mi bebé         | `/nombres`           | `BabyName`, `BabyNameChoice`                                                     |
| Compartir mi embarazo        | `/compartir`         | `ShareCard`, `ToolTemplate`, `UploadedFile` existente                            |
| Mis preguntas                | `/preguntas`         | `MedicalQuestion`, `Appointment` existente                                       |
| Crear mi evolución           | `/pancita/evolucion` | `BellyTimelapse` (proyecto y trabajo durable), `Entry`/`UploadedFile` existentes |
| Mis contracciones            | `/contracciones`     | `ContractionSession`, `ContractionRecord`                                        |

Controladores: `/api/tools` (CRUD autorizado), `/api/tools/admin` (catálogos generales), `/api/tools/cards` (PNG privado) y `/api/tools/media` (descarga privada de MP4). No existe un endpoint público para registros personales. Ningún rol administrativo omite los permisos de fotos, videos, preguntas o contracciones.

La migración aditiva `20261103120000_family_tools` es la octava del manifiesto autorizado de este release. No elimina tablas, datos ni columnas. Agrega claves foráneas, índices y restricciones de duración, votos, progreso y una sola contracción abierta por sesión. Los casos de concurrencia de importación y sesiones usan bloqueos PostgreSQL por embarazo. El proceso de despliegue aplica esta migración antes de cargar catálogos y compilar.

## Preparativos y preguntas

Las categorías y tareas iniciales son plantillas editables, no recomendaciones universales. La importación es explícita, tanto en el alta del embarazo como en el módulo, y no duplica ni sobrescribe personalizaciones. Se reutilizan las tareas de Familia y su permiso `tasks`. El responsable debe ser titular o miembro con acceso a tareas.

Las preguntas son privadas y pertenecen a su creador. Compartir una requiere marcarla y habilitar al miembro con el permiso `questions`. La asociación de una pregunta a una cita comprueba embarazo y acceso a la agenda. La vista de preparación de consulta permite imprimir o guardar PDF desde el navegador, sin respuestas médicas automáticas.

`tick()` integra recordatorios internos de tareas con fecha/hora configurada y preguntas pendientes de una cita durante las próximas 24 horas. Se deduplican por registro y fecha. Configuración permite habilitarlos o deshabilitarlos. El cron privado existente y el worker normal llaman al mismo procesador; su programador debe estar configurado en producción.

## Catálogo de nombres

El seed incorpora los 572 nombres del catálogo aportado, con origen y significado visibles, cinco diseños de tarjetas y la plantilla de preparativos. El estado `editorial_initial` no bloquea la publicación ni oculta definiciones. Conserva los registros anteriores y sus relaciones; una base con los 475 nombres iniciales pasa a 727, incluidos los 572 completos del ZIP. Ver `content/tools/README.md` para procedencia, grafías independientes, búsqueda pública y preservación de correcciones.

La búsqueda normaliza tildes y mayúsculas y combina nombre, inicial, género de uso, longitud y origen disponible. Se conservan favoritos, notas propias, votos y candidatos. El servidor nunca devuelve notas de otras personas. Solo devuelve un voto de pareja cuando ambos votaron ese nombre o la persona autorizó compartirlo antes. La revocación de la membresía o del permiso `names` se aplica en la siguiente solicitud. Los registros de antiguos miembros no participan en coincidencias.

## PNG y fotos

Las tarjetas se renderizan con `next/og` a PNG, no mediante capturas de pantalla. Inter se convierte desde el WOFF2 de `@fontsource-variable/inter` a TTF estático (400/700); su licencia está incluida en `public/brand/Inter-LICENSE.txt`. Se generan 1080×1920, 1080×1080 y 1080×1350. Texto se trata como texto, nunca HTML/SVG del usuario. Las imágenes pasan por Sharp con límites de píxeles y tamaño.

Los datos de gestación se incluyen solo si la persona activa esa opción. Las fotografías son optativas. Las ecografías vinculadas y archivos marcados como médicos requieren confirmación explícita en servidor; los PDF no se admiten como imagen de tarjeta. Un miembro con permiso `cards` puede consultar configuraciones marcadas como compartidas, pero no exportar la fotografía privada de otra persona. No se almacena el PNG exportado ni se publica automáticamente. La configuración se guarda y permite regenerar con los datos gestacionales vigentes al momento de exportar.

## Cronómetro sin conexión

La duración se calcula desde timestamps. El servidor guarda inicios/finales y admite replay idempotente con IDs estables: un evento antiguo de inicio no reabre una contracción terminada. Las correcciones validan duración y horas futuras. Las medias e intervalos solo usan registros reales. El CSV escapa fórmulas de planilla.

El navegador usa IndexedDB, AES-GCM y una clave WebCrypto no exportable por ámbito cuenta/embarazo. No se utiliza localStorage. Se persisten sesiones del cronómetro y eventos pendientes cifrados, con vencimiento de 48 horas desde el último cambio. Las escrituras locales se serializan para no perder eventos al sincronizar. La copia local no sustituye un respaldo del servidor. Cerrar sesión o eliminar la cuenta limpia el almacenamiento local de contracciones; sincronizar antes de hacerlo.

Al abrir el cronómetro se prepara su shell público y el código estático para la recarga sin conexión. La interfaz confirma cuando está listo. El service worker **no guarda respuestas de API, archivos médicos, PNG, MP4 ni fotos**. El HTML del shell es genérico, generado sin datos personales del cliente. Al recargar sin red se recupera únicamente un cronómetro cifrado no vencido. Al volver la conexión se exige nuevamente la sesión para sincronizar; los eventos sin enviar permanecen pendientes ante errores. El dispositivo debe ofrecer HTTPS, Service Worker, IndexedDB y WebCrypto. La protección local no sustituye el bloqueo del dispositivo ni protege frente a un script malicioso ejecutándose dentro del mismo origen.

No hay reglas universales de diagnóstico ni avisos automáticos de trabajo de parto. La advertencia visible indica consultar sin esperar a completar registros. No se afirma revisión médica de una guía que no la tenga: `contraction-safety` puede publicarse desde administración solo con revisión y fuentes específicas. La guía profesional de signos urgentes está pendiente de revisión editorial real.

## Timelapse MP4 privado

Las selecciones reutilizan `Entry(kind=belly)` y sus archivos. No existe una segunda galería. Se guardan selección/orden, tiempo por foto, formato, transición y elementos opcionales; luego se encola el trabajo. El servidor valida propiedad, embarazo, tipo y pertenencia de cada foto; el worker lo comprueba de nuevo antes de leer S3.

`npm run worker:media` ejecuta el trabajador privado persistente. Requiere PostgreSQL, el mismo S3 privado y FFmpeg con libx264; `Dockerfile.media` permite desplegarlo en un host de procesos continuos. No se ejecuta FFmpeg dentro de una Function de Vercel ni se contrata un servicio automáticamente.

Variables nuevas:

- `MEDIA_WORKER_ENABLED=true` en la app **solo después de desplegar y comprobar el worker**; predeterminado `false`.
- `FFMPEG_PATH` únicamente en el worker; predeterminado `ffmpeg`.

Se conservan las variables `DATABASE_URL`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION` y credenciales AWS de la configuración existente. Inyectarlas como secretos. El worker usa una tarea por proceso y limita cada proyecto a 30 fotos de 10 MB, dos minutos, 720p/1280px máximo y un proceso FFmpeg con un hilo por vez. Las entradas se procesan en un directorio temporal aleatorio, sin shell ni argumentos derivados de texto de usuario. Se limpian en `finally`. Los nombres de salida y archivos son generados por el servidor.

El progreso representa clips efectivamente codificados (hasta 95%) y finaliza en 100% solo después de guardar el MP4 y su referencia privada. Se guardan errores y estados; los trabajos interrumpidos se detectan y pueden reintentarse. Los videos vencen a los siete días y el mismo worker elimina sus objetos privados y metadatos; también pueden eliminarse explícitamente. Las descargas usan la autorización existente y URLs firmadas por 60 segundos. Los originales permanecen privados y nunca se envían a IA.

**Activación pendiente en producción:** hace falta un host persistente para el worker y comprobar sus permisos S3/PostgreSQL. Mientras no esté habilitado, la interfaz guarda proyectos y explica que no puede exportar; no muestra una generación ficticia. El motor real de MP4 se verifica localmente con FFmpeg/ffprobe, pero eso no demuestra una carga/descarga contra el S3 de producción.

## Pruebas y límites operativos

`npm test` incluye catálogo, validaciones, cálculo de tiempos/intervalos, CSV, PNG de los tres tamaños y MP4 H.264 válidos con ambas transiciones. `npm run test:weekly-workflow` crea una base temporal, aplica las ocho migraciones, prueba seed/API y ejecuta navegador; nunca resetea la base real. `tests/tools.integration.ts` prueba acceso horizontal, permisos, catálogos idempotentes, preguntas privadas/compartidas, votos, archivos médicos, proyectos y replay de contracciones. `tests/browser/tools.spec.ts` recorre los módulos y prueba recuperación/sincronización offline.

La configuración del worker, la revisión clínica de guías, la verificación documental de significados y la comprobación remota de multimedia son dependencias reales de operación. No se presentan como tareas ya ejecutadas. Mantener copias de seguridad de PostgreSQL y S3 antes del despliegue y revisar límites de carga del plan Vercel existentes (el cuerpo de Functions puede ser menor que el máximo lógico de 10 MB).

### Resultado de esta entrega

Se ejecutaron y aprobaron `npm test` (46 pruebas, incluyendo PNG y MP4 reales), `npm run vercel-build` y `npm run test:weekly-workflow`: dos pruebas de seed, 20 casos HTTP existentes más ocho nuevos, y 16 pruebas de navegador en cuatro resoluciones. La prueba nueva verifica recarga sin red, reconexión y dos contracciones persistidas sin duplicados. El trazado de la función de tarjetas incluye fuentes e ilustraciones necesarias para Vercel. No se verificó un trabajador ni el S3 de producción, y no se realizó revisión clínica profesional de las guías pendientes.
