# Publicación en GitHub y Vercel

Repositorio: `amyndevelop/bambee`. Crear un proyecto Vercel `bambee`, conectado a este repositorio y con `main` como rama de producción. Directorio raíz: el repositorio. Node.js 24; framework Next.js. `vercel.json` configura instalación desde lockfile y `npm run vercel-build`, que genera Prisma, inicializa las tablas, carga los borradores faltantes y compila. No ejecutar Docker ni `dev:services` en Vercel.

## Variables y base

Configurar `DATABASE_URL` con PostgreSQL externo y TLS verificado; nunca usar la base de loopback del entorno de desarrollo. Configurar `NEXTAUTH_SECRET`, `NEXTAUTH_URL` y `APP_URL` con el origen HTTPS asignado. Inyectar los valores de forma segura en Vercel, sin copiarlos al repositorio. Preview y Production necesitan configuraciones y bases apropiadas separadas.

El despliegue está autorizado para ejecutar las cinco migraciones iniciales y las migraciones aditivas `20261102050000_weekly_editorial` y `20261102060000_editorial_publication` sobre la base conectada. `db:bootstrap` verifica el manifiesto y los checksums de esos siete archivos antes de aplicarlos con el historial estándar de Prisma. Los siguientes despliegues los omiten si ya fueron aplicados. No se aplican automáticamente migraciones nuevas agregadas posteriormente. Para migraciones posteriores, usar un proceso operativo autorizado con la `DATABASE_URL` del destino:

```sh
npm ci --include=dev
npm run db:generate
npm run db:migrate
```

El build se detiene si falta DATABASE_URL o falla la inicialización. Mantener bases separadas para Preview y Production. Revisar y respaldar cualquier cambio posterior de esquema antes de aplicarlo. El bootstrap no crea el servicio PostgreSQL: la base debe estar conectada en Vercel primero. Luego `db:seed` completa las semanas faltantes y ejecuta la publicación editorial autorizada de los textos de origen. El marcador de publicación conserva ediciones propias y decisiones administrativas de ocultar contenido. No atribuye revisiones médicas.

S3 privado y SMTP requieren las variables documentadas en `.env.example`. Su configuración no se inventa ni se reemplaza por datos de desarrollo. El transporte SMTP debe poder utilizarse desde Vercel. El endpoint de archivos actualmente recibe multipart: verificar el límite de cuerpo del plan de Vercel antes de habilitar el máximo de 10 MB de la app; puede requerirse una carga directa firmada a S3 para archivos grandes.

## Recordatorios serverless

Vercel no ejecuta el proceso continuo `npm run worker`. Para despliegues serverless existe `GET /api/cron/reminders`, que ejecuta la misma lógica durable e idempotente. Requiere `Authorization: Bearer <CRON_SECRET>` con un secreto aleatorio de al menos 32 caracteres. Sin secreto responde 503; sin autorización válida, 401. No devuelve contenido médico.

Configurar un programador confiable que lo invoque cada minuto o con la frecuencia elegida para los recordatorios. Puede ser Vercel Cron si el plan permite esa frecuencia, o un programador externo autorizado. No se agregó un cron de frecuencia incompatible ni se contrató un plan pago automáticamente. El endpoint por sí solo no programa ejecuciones. El worker local sigue disponible para un host persistente.

## Comprobación posterior

- Confirmar deployment Ready y dominio HTTPS real, sin protección de deployment si se busca acceso público.
- Comprobar bienvenida, manifest, registro, sesión y persistencia contra la base de destino.
- Confirmar carga/descarga privada y correo real solo tras configurar sus proveedores.
- Confirmar una invocación autorizada del programador y su deduplicación.
- Consultar `STATUS.md`: revisión médica/editorial, arte original y revisión legal continúan siendo requisitos del lanzamiento comercial.

## Dominio de producción

Para el dominio actual, configurar en Production:

```text
NEXTAUTH_URL=https://bambee-eta.vercel.app
APP_URL=https://bambee-eta.vercel.app
```

Luego redeployar para aplicar las variables. Si cambia el dominio, actualizar ambas. La validación de origen también permite los hosts exactos de `VERCEL_PROJECT_PRODUCTION_URL` y `VERCEL_URL` provistos por la plataforma. No confía en `Host`, `X-Forwarded-Host` ni en todos los subdominios de vercel.app. Las solicitudes sin un origen permitido continúan rechazadas.

## Diagnóstico de registro y sesiones

`/api/health` incluye `authentication.sessionConfigured`: comprueba únicamente la presencia del secreto que utiliza Auth.js, sin devolver su valor ni garantizar una sesión real. Si es falso en Production, configurar `NEXTAUTH_SECRET` (o `AUTH_SECRET` si el primero no existe) con un secreto aleatorio persistente y redeployar. No generar un secreto distinto por petición ni publicarlo en Git o en el chat. No dejar `NEXTAUTH_SECRET` vacío si se utiliza `AUTH_SECRET`.

El formulario comprueba `/api/auth/providers` antes de registrar para evitar crear cuentas cuando Auth.js no está disponible. El servidor rechaza el registro con 503 si falta el secreto de sesión en producción. Usuario, consentimiento y auditoría de registro se guardan en una sola transacción. Si la cuenta se crea pero falla la apertura de sesión, el formulario pasa a ingreso e informa que no hace falta volver a registrarse. Una prueba local exitosa no confirma la configuración de Vercel: revisar también sus logs de `/api/account` y `/api/auth/*`, sin compartir datos personales ni secretos.

## Comprobar identidad y biblioteca después del deploy

Abrir `https://bambee-eta.vercel.app/api/health` después de Ready. Debe informar 42 semanas completas, fuente Inter y marca `original-pdf-2026-11-02`; el commit permite distinguir un deployment anterior. Las 42 semanas de origen deben aparecer como publicación educativa con aviso de revisión pendiente. `weeklyContent.published` debe ser 42 y `publicationComplete` verdadero. La revisión médica se informa por separado. La verificación del endpoint requiere acceso de red al dominio; una compilación local no demuestra que el deployment remoto finalizó.

## Ampliación de herramientas

Este release agrega la migración aditiva octava `20261103120000_family_tools` al manifiesto autorizado. El build carga catálogos mediante `db:seed` sin sobrescribir registros editados. Ver `TOOLS.md` para permisos, variables, cronómetro offline y despliegue del trabajador MP4. El worker multimedia requiere un host persistente; dejar `MEDIA_WORKER_ENABLED=false` hasta que esté funcionando. La compilación de Vercel por sí sola no habilita el procesamiento de video.
