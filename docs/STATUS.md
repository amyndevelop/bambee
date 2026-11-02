# Estado de BAMBEE v0.1.0

## Implementado

- Proyecto real con PostgreSQL/Prisma, migraciones versionadas y dependencias fijadas por lockfile.
- Registro con consentimiento explícito, contraseñas bcrypt, Auth.js, limitación atómica de intentos, recuperación por token y revocación global de sesiones.
- Configuración del embarazo por última menstruación o FPP profesional; historia de correcciones explícitas, embarazos archivados y selección de zona horaria.
- Dashboard calculado, navegador de semanas 1–42, biblioteca clínica administrable que no expone borradores ni contenido sin revisión.
- Agenda con lista y calendario mensual alineado por días, CRUD, estado realizada, notas y recordatorios internos persistentes procesados por un worker independiente.
- Diario y síntomas con edición, borrado y búsqueda; fotos opcionales en el diario. Registro de ecografías (imagen/PDF), pancita, comparación de dos fotografías y progresión secuencial. Vinculación de ecografías con citas realizadas.
- Servicio S3 privado con validación real de formato, límites de bytes/píxeles, eliminación de EXIF, verificación de propiedad y URLs de 60 segundos. Galerías con descarga, apertura y eliminación confirmada.
- Familia: invitaciones con hash/vencimiento, aceptación explícita, revocación, permisos separados de citas y tareas. CRUD de tareas compartidas. Los registros personales nunca se comparten por esos permisos.
- Centro interno de notificaciones y preferencias. Notificación de semana, recordatorios y recepción de invitaciones para cuentas existentes.
- Administración privada, métricas agregadas, vista básica de cuentas, edición y revisión editorial, gestión de originales gráficos y asociación de ilustraciones a semanas.
- Exportación JSON, eliminación de cuenta/objetos, borradores de privacidad y términos.
- Manifest, iconos PNG, apple-touch-icon, service worker sin caché de información sensible, safe areas y navegación responsive. Instalación requiere HTTPS.
- Instrucciones de instalación y arranque guardadas en el borrador del entorno. La app funciona sin API de inteligencia artificial.

## Verificación en esta instancia

- `npm ci --include=dev`: instalación desde lockfile.
- Generación del cliente con herramientas oficiales Prisma WASM.
- Migraciones aplicadas y segunda ejecución sin cambios.
- `npm run typecheck` y compilación de producción.
- 36 pruebas unitarias aprobadas de aritmética civil, FPP, semanas/días, zonas horarias/DST, datación y permisos.
- 19 subpruebas de integración aprobadas (20 resultados del runner con la prueba contenedora) sobre HTTP real contra Auth.js y PostgreSQL: consentimiento, cuentas/sesiones, CSRF, datación/historial, CRUD de diario y síntomas, agenda, recordatorios con deduplicación, tokens familiares, aislamiento de datos/archivos, tareas compartidas, roles editoriales, recuperación por token, exportación y revocación.
- 8 pruebas de Chromium aprobadas (flujo de embarazo y edición de borradores): registro, onboarding de cinco pantallas, dashboard sin desbordamiento horizontal, creación/persistencia de diario y eliminación de cuenta, en 390, 412, 768 y 1440 píxeles. Son pruebas por viewport; no equivalen a pruebas físicas de iOS/Safari o Android.
- Auditoría npm sin vulnerabilidades reportadas tras actualizar dependencias y quitar una dependencia opcional insegura. Esto no reemplaza una auditoría de seguridad del producto.

## Pendientes externos que bloquean la habilitación completa

1. **S3 privado:** no hay endpoint, bucket ni credenciales configurados. Los intentos de obtener MinIO desde Docker Hub y Quay fueron rechazados. El código está implementado, pero carga/descarga/borrado extremo a extremo de objetos reales no se validaron. La prueba de propiedad de archivos sí se ejecutó con metadatos de prueba en PostgreSQL. Configurar el servicio y ejecutar esa validación antes de usar archivos reales.
2. **SMTP:** faltan transporte y remitente. No se enviaron correos. El canje de tokens sí se probó, con tokens temporales creados en la base de pruebas; eso no demuestra entrega de invitaciones o recuperación por correo.
3. **Contenido clínico:** hay 42 borradores del usuario, pero no hay semanas ni señales de alerta con revisión médica real. Se muestran explicaciones neutrales. Un profesional debe preparar y aprobar el contenido siguiendo `EDITORIAL.md`. Las frutas, medidas y textos provienen del adjunto y están pendientes de contraste; no se presentaron como clínicamente validados.
4. **Originales gráficos:** el adjunto visual no estaba disponible como archivos en el checkout. Los originales deben cargarse desde administración; el texto de marca/iconos de instalación actuales son provisionales y no se declaran como arte aprobado. Falta validar visualmente la identidad final con esos recursos.
5. **Producción:** requieren configuración HTTPS, límites/observabilidad, backups y restauración probada, revisión de seguridad, análisis de privacidad y revisión legal. Los textos legales son borradores explícitos. El usuario publicó la aplicación en Vercel; este entorno no verificó el estado ni la configuración de su producción.

## Límites de esta entrega

- No hay invitación por notificación externa push: se prepara por categoría y worker interno. Web Push, video e IA permanecen deshabilitados como se pidió.
- No hay segundo idioma habilitado: existe el punto de extensión y resta extraer todos los textos a catálogos.
- El campo de desarrollo médico detallado permite secciones editoriales, pero no impone formularios separados por sistema biológico. La biblioteca requiere trabajo editorial real.
- No incluye antivirus de objetos, MFA, verificación de correo, moderación profesional automatizada ni un sistema de acreditación de revisores. Las tres primeras medidas deben evaluarse antes del lanzamiento según el modelo de riesgo.
- Las URLs firmadas ya emitidas conservan validez hasta su vencimiento, incluso si la cuenta cambia permisos durante esos 60 segundos.
- La reproducción en una tarea nueva y la publicación del snapshot no se verificaron; guardar instrucciones no publica el entorno.

Esta entrega es una implementación funcional de los módulos principales con persistencia y controles de acceso, **no una afirmación de cumplimiento completo de la especificación comercial**. Los bloqueos y límites anteriores deben resolverse antes de tratarla como un producto terminado.

## Corrección de semanas y biblioteca del adjunto

- La pantalla muestra semana en curso en grande y semanas completas/días aparte, con los casos 4+6 → 5, 5+0 → 5 y 5+1 → 6 probados.
- Migración aditiva `20261102050000_weekly_editorial`, incluida explícitamente en el manifiesto de despliegue. Conserva datos existentes.
- 42 borradores cargados en PostgreSQL local; ninguno publicado. El seed se verifica repetible y preserva modificaciones, citas y archivos. Su ejecución en producción depende del próximo build de Vercel y no se declara comprobada.
- 39 marcadores PNG transparentes, identificados como ilustraciones pendientes. Faltan los originales de frutas.
- Fuentes médicas específicas, medidas, hitos y cambios maternos pendientes de revisión/redacción profesional; la biblioteca pública mantiene estados neutrales hasta aprobación.
