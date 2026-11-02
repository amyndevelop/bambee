# BAMBEE · v0.1.0

**Creciendo juntos, desde el comienzo.**

Aplicación de seguimiento del embarazo en español de Argentina. Next.js App Router, React, TypeScript, Tailwind CSS 4, PostgreSQL, Prisma 7, Auth.js (NextAuth estable 4), Zod y almacenamiento S3 privado.

## Estado real

El repositorio contiene una implementación conectada a PostgreSQL, sin cuentas, métricas ni contenidos clínicos ficticios. Los registros y permisos se resuelven en el servidor. **No es una certificación de producto listo para lanzamiento comercial.** Ver [pendientes y límites](docs/STATUS.md) antes de desplegar o incorporar datos reales de salud.

Incluye registro con consentimiento, ingreso y revocación de sesiones; configuración de embarazo, datación con historial y embarazos históricos; dashboard calculado por zona horaria; biblioteca semanal con revisión y publicación; agenda mensual/lista y recordatorios internos; diario y síntomas con edición/borrado/búsqueda; ecografías y fotografías privadas, comparación y progresión; invitaciones familiares con vencimiento, aceptación y permisos independientes de citas y tareas; preferencias, exportación y eliminación; administración editorial, recursos de marca y métricas agregadas. Recuperación de contraseña e invitaciones por correo requieren SMTP. Galerías requieren S3.

## Inicio rápido

Requisitos: Node.js 24 LTS, npm, PostgreSQL 17 o compatible. Docker se usa solo para PostgreSQL local; no es obligatorio con una base externa.

```sh
cd /workspace/bambee
npm ci
npm run dev:services
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

`dev:services` conserva `.env` si existe, genera un secreto de sesión local y prepara un contenedor PostgreSQL persistente en `bambee-pg`. Este PostgreSQL usa `trust` exclusivamente para desarrollo en loopback. Nunca debe exponerse o utilizarse en producción. Con una base externa, crear `.env` a partir de `.env.example` y configurar `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` y `APP_URL` antes de migrar. No guardar secretos en Git.

En otro proceso, iniciar el procesador de notificaciones:

```sh
npm run worker
```

El worker consulta recordatorios vencidos cada 30 segundos, recupera trabajo tras reinicios y usa claves únicas para evitar duplicados. Debe ejecutarse bajo supervisión con reinicio automático en producción; no depende del navegador abierto. No envía Web Push en esta versión.

Prisma usa el generador y el motor de migraciones WebAssembly oficiales, fijados a 7.10.1, con el adaptador PostgreSQL. Esto evita descargar motores nativos desde dominios restringidos y mantiene la verificación de integridad de npm. No se ignoran checksums ni TLS. Los wrappers usan APIs internas versionadas: una actualización de Prisma debe probar generación, migraciones y consultas juntas. `npm run db:migrate` aplica las migraciones versionadas con el historial estándar de Prisma. Nunca ejecutar `scripts/migrate.mjs --initial` sobre un historial existente: se utilizó para crear la migración inicial.

## Configuración

| Variable                                     | Uso                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`                               | Conexión PostgreSQL; producción debe usar TLS verificado                 |
| `NEXTAUTH_SECRET`                            | Secreto aleatorio de al menos 32 bytes, compartido por las instancias    |
| `NEXTAUTH_URL`                               | Origen externo exacto para sesiones y CSRF; HTTPS en producción          |
| `APP_URL`                                    | URL canónica para enlaces de invitación/recuperación                     |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`      | Endpoint compatible con S3 y bucket **privado**                          |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Credenciales del almacenamiento o identidad de carga equivalente del SDK |
| `SMTP_URL`, `MAIL_FROM`                      | Transporte SMTP autenticado y remitente autorizado                       |

Configurar secretos de firma S3 como variables seguras reales o identidad del SDK. Un placeholder de proxy HTTP no reemplaza credenciales de firma SigV4. Las variables se documentan sin valores reales en `.env.example`.

S3: bloquear acceso público al bucket, restringir IAM a sus objetos, usar HTTPS y cifrado de almacenamiento. Aplicar una política apropiada de backups/retención y un origen de archivos separado del de la aplicación. Las URLs firmadas vencen en 60 segundos. Las descargas autenticadas y respuestas de API son `private, no-store`. El service worker no guarda respuestas ni datos médicos. Las imágenes se decodifican y se reescriben para quitar metadatos EXIF; se verifican tipo real y tamaño (10 MB), y se limita la cantidad de píxeles. PDF acepta firma y terminación válidas; un escaneo antimalware de producción está pendiente.

## Administración y contenido

Registrar una cuenta normal y asignar un rol desde un entorno operativo autorizado:

```sh
npm run admin:grant -- profesional@tu-dominio ADMIN
# También: EDITOR o REVIEWER
```

No hay credenciales administrativas predeterminadas. `/admin` autoriza cada operación en backend. EDITOR mantiene borradores; REVIEWER y ADMIN pueden registrar revisión y publicar. La asignación de REVIEWER requiere verificar las credenciales profesionales fuera de la aplicación. Modificar contenido invalida la revisión anterior salvo que un revisor lo vuelva a aprobar explícitamente. La base impide publicar sin referencias/revisión.

La biblioteca incorpora los 42 textos aportados por el usuario como borradores no publicados y sin revisión médica atribuida. Ver [fuente y política del seed](content/pregnancy/README.md). Consultar [proceso editorial](docs/EDITORIAL.md). Sin contenido revisado para una semana, la interfaz presenta un estado neutral. No se muestran medidas o frutas inventadas.

Los originales de marca no estaban disponibles como archivos en el checkout. El administrador permite cargar los originales aprobados con identificadores `logo` y `bee`; se muestran automáticamente en bienvenida y mensajes. Los recursos publicados son gráficos de marca visibles a todas las personas, nunca archivos médicos. Los iconos de instalación actuales y el texto de marca deben reemplazarse por los originales aprobados antes de publicar.

## Verificación y producción

```sh
npm run typecheck
npm test
npm run build
npm start
# Con el servidor de producción iniciado y .env configurado:
npm run test:integration
npm run test:browser
npm audit
```

Las pruebas de integración usan cuentas temporales contra la base configurada; eliminan sus datos al terminar. Usar una base dedicada de pruebas. Chromium debe estar instalado: la configuración utiliza `/usr/bin/chromium`; se puede cambiar `PLAYWRIGHT_CHROMIUM_EXECUTABLE` para otro entorno. El test de navegador elimina la cuenta al completar el flujo. Fallos intermedios pueden dejar una cuenta `browser-…@example.test`, que debe limpiarse de la base de pruebas.

Desplegar `npm run build` y `npm start`, junto con `npm run worker` supervisado, PostgreSQL administrado y S3 privado. Aplicar `npm run db:migrate` como un paso controlado previo al rollout; hacer backups antes de migraciones. Requiere HTTPS para instalación PWA y cookies seguras, límites de carga del proxy (11 MB), observabilidad, restauración probada y revisión de seguridad y legal antes de producción. No hay publicación o despliegue automático.

[Arquitectura](docs/ARCHITECTURE.md) · [Estado y validación](docs/STATUS.md) · [Proceso editorial](docs/EDITORIAL.md)

## Vercel

Ver [publicación en GitHub y Vercel](docs/DEPLOYMENT.md). El build de Vercel genera Prisma, aplica únicamente las seis migraciones verificadas del manifiesto de esta entrega, carga los borradores faltantes sin sobrescribir ediciones y compila. Es idempotente y no aplica automáticamente migraciones futuras. El programador serverless utiliza un endpoint autenticado; los procesos locales y la base de Docker no se trasladan al alojamiento.

## Edad gestacional y semana en curso

`completedWeeks` y `days` representan la edad exacta. `currentWeek` sigue la regla solicitada: si hay días adicionales, suma uno a las semanas completas; en múltiplos exactos de siete conserva las semanas completas. El intervalo 0–6 muestra semana 1. Por compatibilidad, `weeks` sigue significando semanas completas. Con FUM 29/09/2026: 02/11 → 4+6, semana 5; 03/11 → 5+0, semana 5; 04/11 → 5+1, semana 6.

El día civil se obtiene en la zona configurada por la titular del embarazo, también al verlo desde una cuenta familiar. La FPP guardada conserva la datación médica confirmada. Dashboard, biblioteca, fruta, navegador, recuerdos y notificaciones usan `currentWeek` para el rótulo y conservan la edad exacta aparte. Navegar otras semanas no altera la datación.

Con PostgreSQL local y el build preparado, `npm run test:weekly-workflow` crea una base temporal separada, comprueba el seed y los permisos, ejecuta las pruebas HTTP y de navegador, y elimina únicamente esa base al finalizar. Rechaza bases remotas.
