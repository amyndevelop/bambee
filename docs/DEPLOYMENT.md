# Publicación en GitHub y Vercel

Repositorio: `amyndevelop/bambee`. Crear un proyecto Vercel `bambee`, conectado a este repositorio y con `main` como rama de producción. Directorio raíz: el repositorio. Node.js 24; framework Next.js. `vercel.json` configura instalación desde lockfile y `npm run vercel-build`, que genera Prisma antes de compilar. No ejecutar Docker ni `dev:services` en Vercel.

## Variables y base

Configurar `DATABASE_URL` con PostgreSQL externo y TLS verificado; nunca usar la base de loopback del entorno de desarrollo. Configurar `NEXTAUTH_SECRET`, `NEXTAUTH_URL` y `APP_URL` con el origen HTTPS asignado. Inyectar los valores de forma segura en Vercel, sin copiarlos al repositorio. Preview y Production necesitan configuraciones y bases apropiadas separadas.

Las migraciones se aplican explícitamente desde un proceso operativo autorizado con la `DATABASE_URL` del destino:

```sh
npm ci --include=dev
npm run db:generate
npm run db:migrate
```

El build no modifica automáticamente la base de producción. Verificar migraciones antes de habilitar tráfico.

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
