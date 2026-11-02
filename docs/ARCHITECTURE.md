# Arquitectura

- `src/components/`: módulos visuales separados (cuenta, configuración, dashboard, semana, agenda, registros, familia, notificaciones, administración) y componentes compartidos accesibles.
- `src/app/api/`: controladores HTTP de cuenta, datos, archivos, privacidad, marca y administración. Escrituras con verificación de origen y validación Zod. Auth.js controla el flujo CSRF de credenciales.
- `src/lib/`: autenticación, PostgreSQL/Prisma, permisos, aritmética gestacional, almacenamiento, correo, errores públicos y catálogo inicial de idioma.
- `prisma/`: esquema y migraciones PostgreSQL versionadas, restricciones e índices.
- `scripts/worker.ts`: procesador durable e idempotente de notificaciones internas. Ejecución independiente del servidor web.
- `src/modules/ai/`: contrato de futura integración deshabilitada; no hay SDK ni API de IA.

## Datos y acceso

`Pregnancy` pertenece a una cuenta y conserva múltiples miembros y una historia inmutable de dataciones. Cada actualización explícita crea una nueva fecha en `PregnancyDatingHistory`. Un embarazo archivado conserva sus registros y puede seleccionarse desde el encabezado. Los permisos consultan el embarazo real de cada recurso; no confían en el ID enviado por el cliente.

Los recuerdos de diario, síntomas, ecografías y pancita comparten un sobre normalizado `Entry`, distinguido por `kind` restringido en la base. Los archivos viven fuera de PostgreSQL; `UploadedFile` contiene metadatos y una clave aleatoria. Los registros privados requieren titularidad. Los miembros solo acceden al progreso y a citas con permiso explícito; ese permiso también autoriza gestionar citas. La revocación se aplica en la siguiente solicitud. Las URLs de archivos ya emitidas pueden seguir siendo válidas hasta 60 segundos.

Auth.js usa JWT cifrados en cookies HttpOnly. Cada sesión contiene la versión de la cuenta; el servidor consulta `sessionVersion` para permitir revocación global inmediata. No se usa localStorage para credenciales o información médica. Los intentos de acceso se limitan mediante un contador atómico PostgreSQL por identificador hasheado y ventana de 15 minutos. La infraestructura debe añadir límites por IP/volumen y protección de abuso. Los logs de auditoría no incluyen síntomas, contraseñas o tokens.

Los tokens de recuperación e invitación se generan con 32 bytes aleatorios y solo su hash SHA-256 persiste. Los de recuperación vencen en 30 minutos; los familiares en 48 horas. La aceptación es explícita, ligada al correo y de uso único con transacción. Las contraseñas usan bcrypt con costo 12. Recuperar acceso invalida sesiones previas.

Las imágenes de marca publicadas tienen una entidad distinta `GraphicAsset`; publicar requiere rol administrativo y una imagen de propiedad de la cuenta sin asociación médica. No hay acceso público al bucket: se firman únicamente los gráficos publicados. Los archivos privados nunca se convierten en gráficos automáticamente.

## Fechas

Las fechas gestacionales son `DATE`, sin hora. Se usan números de días UTC solo para aritmética de fechas civiles. El día actual se obtiene con `Intl.DateTimeFormat` en la zona IANA configurada. La referencia son 280 días; la FPP de un profesional se conserva hasta una corrección explícita. El progreso se limita a 0–100%; una FPP superada no implica una evaluación clínica. La agenda almacena instantes UTC y el formulario aclara que usa la zona del dispositivo.

## Editorial, privacidad y límites

Solo se devuelven semanas con publicación y revisión registrada. Los cambios editoriales deben renovar la revisión. Las referencias clínicas y el texto se administran en PostgreSQL. La primera entrega no incluye contenido médico validado porque no se puede atribuir revisión profesional inexistente.

La traducción inicial está en español argentino; `src/lib/i18n.ts` define idioma/catálogo. Aún debe migrarse el resto de textos de componentes a catálogos para incorporar un segundo idioma. No se afirma cobertura multilingüe terminada.

La app necesita conexión para operar. La PWA incluye manifest, iconos PNG, apple-touch-icon y service worker sin caché de datos. El sistema operativo genera la pantalla de lanzamiento a partir de los metadatos; no hay splash con originales de marca. Web Push y generación de video están fuera de esta versión.
