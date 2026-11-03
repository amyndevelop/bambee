# BAMBEE — AMPLIACIÓN FUNCIONAL COMPLETA

## Prompt maestro para Codex — 6 módulos nuevos

### OBJETIVO GENERAL

Actuá como un ingeniero de software senior especializado en Next.js, TypeScript, PostgreSQL, Prisma, aplicaciones PWA y diseño de productos digitales.

Tu objetivo es ampliar la aplicación BAMBEE, una plataforma integral de seguimiento del embarazo, incorporando seis módulos completamente funcionales:

1. Preparativos y bolso maternal.
2. Buscador de nombres para bebés.
3. Tarjetas personalizadas para compartir.
4. Preguntas para el médico.
5. Timelapse de evolución de la pancita.
6. Cronómetro de contracciones.

**IMPORTANTE: BAMBEE YA EXISTE Y ESTÁ EN DESARROLLO.**

No crees otro proyecto, no reinicies la aplicación y no reemplaces funcionalidades existentes.

Primero analizá el repositorio y comprendé su arquitectura actual.

Conservá:

- Autenticación.
- Dashboard.
- Seguimiento gestacional.
- Contenido semanal.
- Comparaciones con frutas.
- Agenda médica.
- Ecografías.
- Galería de pancita.
- Diario.
- Salud.
- Familia.
- Panel administrativo.
- Sistema de notificaciones.
- Branding BAMBEE.

Implementá los módulos nuevos integrándolos con las funcionalidades existentes.

No utilices datos simulados para fingir funcionalidad.

Toda la información personal creada por los usuarios debe persistir correctamente en PostgreSQL.

---

# 1. IDENTIDAD VISUAL Y EXPERIENCIA

Respetá el sistema visual existente de BAMBEE.

### Colores de referencia

- Coral: `#F59B8F`
- Coral profundo: `#E37E74`
- Amarillo manteca: `#F7D98A`
- Menta: `#A8DCCB`
- Crema: `#FFF7F0`
- Arena rosada: `#EFD6CB`
- Cacao: `#66564F`

### Tipografías

- Nunito.
- Plus Jakarta Sans.

### Diseño

Usar componentes actuales del proyecto.

Mantener:

- Tarjetas redondeadas.
- Ilustraciones cálidas.
- Íconos amigables.
- Sombras suaves.
- Espaciados consistentes.
- Diseño mobile-first.
- Estados vacíos personalizados.
- Mascota BAMBEE cuando corresponda.

No implementar pantallas visualmente diferentes del resto de la aplicación.

No utilizar colores arbitrarios ni modificar estilos globales innecesariamente.

Cada pantalla debe funcionar correctamente en dispositivos móviles.

---

# 2. MÓDULO: PREPARATIVOS Y BOLSO MATERNAL

Crear una nueva sección denominada:

**Mis preparativos**

Su objetivo será ayudar a organizar todo lo necesario antes del nacimiento.

## Pantalla principal

Mostrar:

- Progreso general de preparativos.
- Cantidad de tareas completadas.
- Cantidad de tareas pendientes.
- Próximas tareas.
- Categorías disponibles.

### Categorías iniciales

**Bolso de mamá**

- Documentación personal.
- Documentación médica.
- Ropa cómoda.
- Artículos de higiene.
- Elementos personales.
- Cargador del teléfono.

**Bolso del bebé**

- Ropa para recién nacido.
- Mantas.
- Pañales.
- Artículos de higiene.
- Ropa para el alta.

**Habitación del bebé**

- Espacio para dormir.
- Ropa de cama apropiada.
- Organización de prendas.
- Elementos de higiene.

**Compras**

- Ropa.
- Artículos de alimentación.
- Transporte.
- Higiene.
- Otros productos.

**Trámites**

- Documentación.
- Cobertura médica.
- Licencias.
- Inscripción del nacimiento.
- Otros trámites personalizados.

Estas listas deben ser plantillas editables, no requisitos obligatorios universales.

Evitar recomendaciones de productos o prácticas contrarias a las pautas actuales de sueño seguro y cuidados neonatales.

## Funcionalidades obligatorias

Permitir:

- Crear tareas.
- Editar tareas.
- Eliminar tareas.
- Marcar como completadas.
- Desmarcar tareas.
- Crear categorías personalizadas.
- Reordenar tareas.
- Agregar notas.
- Establecer fecha límite.
- Asignar responsable.
- Filtrar pendientes y completadas.
- Mostrar porcentaje de progreso.
- Compartir tareas con la pareja autorizada.

Las tareas deben persistir después de cerrar sesión.

## Plantillas iniciales

Crear plantillas de preparativos en la base de datos.

Cuando se configura un embarazo, permitir importar las listas predefinidas.

No duplicar las tareas cada vez que se ingresa al módulo.

Cada usuario debe poder personalizarlas.

## Integración con BAMBEE

Agregar:

- Acceso desde Inicio.
- Tarjeta de progreso de preparativos.
- Recordatorios configurables.
- Acceso desde Familia para tareas compartidas.

---

# 3. MÓDULO: BUSCADOR DE NOMBRES

Crear una sección denominada:

**Nombres para mi bebé**

Debe ser una herramienta interactiva y visualmente atractiva.

## Base de datos de nombres

Crear un catálogo inicial de al menos 300 nombres, con registros reales y sin duplicados.

Campos sugeridos:

- Nombre.
- Género de uso habitual: femenino, masculino o unisex.
- Origen.
- Significado.
- Variantes.
- Pronunciación opcional.
- Fuente de información.
- Estado de verificación del significado.

No inventar etimologías.

Cuando existan significados controvertidos, indicar que son interpretaciones posibles.

Los nombres sin información verificada pueden utilizarse en el buscador, pero no deben mostrar significados inventados.

## Buscador

Permitir buscar por:

- Nombre.
- Primera letra.
- Origen.
- Género de uso habitual.
- Longitud del nombre.

Agregar filtros combinables.

Implementar búsqueda normalizada para que las tildes no impidan encontrar resultados.

Ejemplo:

Buscar "Benjamin" también debe encontrar "Benjamín".

## Favoritos

Cada usuario puede:

- Guardar nombres.
- Quitar favoritos.
- Consultar favoritos.
- Comparar nombres.
- Agregar notas privadas.

Los favoritos deben persistir.

## Votación en pareja

Esta será una funcionalidad diferencial.

Cuando exista una pareja vinculada:

- Ambos podrán guardar nombres.
- Cada integrante podrá votar independientemente.
- Permitir "Me gusta", "No me convence" y "Favorito".
- Mostrar coincidencias cuando ambos hayan votado.
- Permitir elegir candidatos finales.

No revelar votos privados antes de que ambos hayan participado, salvo decisión explícita de compartirlos.

## Modo descubrimiento

Implementar una interfaz tipo tarjetas.

Mostrar un nombre por vez.

Acciones:

- Me gusta.
- Pasar.
- Favorito.
- Ver significado.

Guardar la elección para no repetir nombres innecesariamente.

## Integración

Acceso desde:

- Familia.
- Dashboard.
- Menú de herramientas.

---

# 4. MÓDULO: TARJETAS PARA COMPARTIR

Crear una sección llamada:

**Compartir mi embarazo**

Debe permitir generar imágenes personalizadas para compartir mediante WhatsApp, Instagram y otras aplicaciones.

## Tipos de tarjetas

### Tarjeta 1: Mi semana

Contenido:

- Semana gestacional.
- Días de gestación.
- Fruta correspondiente.
- Ilustración.
- Nombre BAMBEE.
- Mensaje breve.

Ejemplo:

"¡Estamos en la semana 12!"

"Nuestro bebé tiene aproximadamente el tamaño de una ciruela."

### Tarjeta 2: Cuenta regresiva

Mostrar:

- Días restantes para la fecha probable de parto.
- Ilustración BAMBEE.
- Mensaje personalizable.

### Tarjeta 3: Anuncio de embarazo

Diseños con frases editables.

Ejemplos:

"Una nueva aventura está comenzando."

"Pronto seremos uno más."

### Tarjeta 4: Próximo nacimiento

Permitir crear tarjetas indicando el mes estimado de llegada, sin obligar a mostrar la fecha exacta.

### Tarjeta 5: Foto personalizada

Permitir seleccionar una fotografía del diario, de la galería de pancita o una imagen subida específicamente.

Debe solicitarse confirmación antes de incluir una ecografía o cualquier archivo médico privado.

## Editor de tarjetas

Permitir:

- Elegir plantilla.
- Modificar texto.
- Cambiar fondo entre variantes BAMBEE.
- Elegir ilustración cuando corresponda.
- Incorporar fotografías autorizadas.
- Previsualizar resultado.
- Descargar PNG.
- Compartir mediante Web Share API cuando esté disponible.

Formatos:

- Historia vertical: 1080 × 1920.
- Publicación cuadrada: 1080 × 1080.
- Publicación vertical: 1080 × 1350.

## Renderizado

Generar imágenes reales de alta calidad.

No utilizar capturas de pantalla de baja resolución.

Utilizar un motor compatible con el entorno de despliegue, como SVG renderizado de manera segura y convertido a PNG, o una tecnología equivalente.

El archivo exportado debe respetar el diseño elegido.

## Persistencia

Guardar configuraciones de las tarjetas creadas:

- Usuario.
- Embarazo.
- Tipo.
- Plantilla.
- Texto.
- Imágenes autorizadas.
- Fecha de creación.

Permitir consultar tarjetas guardadas, editarlas y regenerarlas.

No almacenar indefinidamente imágenes exportadas cuando puedan regenerarse a partir de su configuración, salvo necesidad funcional y consentimiento.

## Privacidad

Las tarjetas públicas deben generarse únicamente mediante una acción expresa del usuario.

No incluir automáticamente nombres, datos médicos, resultados de estudios ni fechas sensibles.

Las tarjetas no deben publicarse automáticamente en redes sociales.

---

# 5. MÓDULO: PREGUNTAS PARA EL MÉDICO

Crear una sección:

**Mis preguntas**

El objetivo es evitar que la persona olvide dudas durante una consulta.

## Funcionalidades

Permitir:

- Crear pregunta.
- Editar pregunta.
- Eliminar pregunta.
- Marcar como respondida.
- Guardar respuesta.
- Asociar pregunta a una cita.
- Clasificar por categoría.
- Filtrar pendientes.
- Consultar historial.

## Categorías

- Desarrollo del bebé.
- Síntomas.
- Alimentación.
- Medicamentos.
- Estudios.
- Parto.
- Posparto.
- Otros.

## Integración con agenda

Cada cita debe mostrar las preguntas asociadas.

Ejemplo:

**Control obstétrico — 11 de noviembre**

Preguntas pendientes: 3.

Al abrir la cita, permitir marcar las preguntas respondidas y registrar la explicación proporcionada por el profesional.

## Función especial

Implementar un botón:

**Preparar mi próxima consulta**

Mostrar una vista ordenada con:

- Fecha de la consulta.
- Profesional.
- Preguntas pendientes.
- Notas personales.

Permitir descargar o imprimir una versión sencilla.

## Seguridad

Las preguntas son privadas por defecto.

La pareja solo puede acceder si el titular habilita explícitamente el permiso.

No generar respuestas médicas automáticas.

---

# 6. MÓDULO: TIMELAPSE DE MI PANCITA

Integrar esta funcionalidad dentro del módulo existente:

**Mi pancita**

No crear una galería duplicada.

Reutilizar las fotografías guardadas previamente por el usuario.

## Pantalla de generación

Agregar botón:

**Crear mi evolución**

Mostrar todas las fotografías disponibles del embarazo actual.

Permitir:

- Seleccionar fotografías.
- Reordenar manualmente.
- Utilizar orden cronológico.
- Elegir duración de cada imagen.
- Elegir relación de aspecto.
- Ver una vista previa.
- Generar video.
- Descargar video.

## Formatos

- Vertical 9:16.
- Cuadrado 1:1.
- Horizontal 16:9.

## Presentación

Cada fotografía puede mostrar opcionalmente:

- Semana gestacional.
- Fecha.
- Nombre o apodo.
- Marca BAMBEE.

El usuario podrá activar o desactivar estos elementos.

## Transiciones

Implementar al menos:

- Fundido suave.
- Corte directo.

No utilizar efectos exagerados.

## Procesamiento

Generar un archivo de video real, preferentemente MP4 compatible con navegadores y dispositivos móviles.

Elegir entre procesamiento cliente o servidor según las capacidades reales de la infraestructura.

Si se utiliza FFmpeg:

- No bloquear el hilo principal.
- Controlar duración y resolución.
- Limitar recursos.
- Validar entradas.
- Limpiar archivos temporales.
- Gestionar errores.
- Evitar procesos sin límites.

Si se utilizan trabajos en segundo plano, persistir su estado y disponer de un trabajador o servicio de procesamiento correctamente configurado.

No dejar la generación dependiente de una petición HTTP que pueda interrumpirse.

## Privacidad

Las imágenes originales deben permanecer privadas.

No subir fotografías a servicios externos innecesarios.

No utilizar servicios de IA para procesarlas.

Permitir eliminar el video generado.

## Persistencia

Guardar:

- Usuario.
- Embarazo.
- Fotografías seleccionadas.
- Orden.
- Duración.
- Formato.
- Estado del procesamiento.
- Ubicación privada del video final.
- Fecha de creación.

Implementar expiración o limpieza controlada de videos temporales.

## Experiencia

Mostrar:

- Progreso real del procesamiento.
- Estado del trabajo.
- Mensajes de error.
- Vista previa.
- Descarga final.

No mostrar una barra de progreso ficticia.

---

# 7. MÓDULO: CRONÓMETRO DE CONTRACCIONES

Crear una sección:

**Mis contracciones**

Esta herramienta debe ser clara, accesible y muy sencilla de utilizar.

## Pantalla principal

Mostrar un cronómetro grande.

Botón principal:

**Comenzar contracción**

Al pulsarlo:

- Registrar fecha y hora de inicio.
- Iniciar el contador.

Cambiar botón a:

**Terminar contracción**

Al pulsarlo:

- Registrar fecha y hora de finalización.
- Calcular duración.
- Guardar registro.

## Historial

Mostrar:

- Hora de inicio.
- Duración.
- Intervalo entre inicios consecutivos.
- Cantidad de contracciones registradas.
- Sesión a la que pertenecen.

## Estadísticas

Calcular:

- Duración media.
- Intervalo medio.
- Número de contracciones en una ventana temporal seleccionada.
- Evolución reciente.

Las estadísticas deben basarse exclusivamente en registros reales.

## Sesiones

Permitir:

- Iniciar una sesión.
- Pausarla o finalizarla.
- Consultar sesiones anteriores.
- Eliminar registros incorrectos.
- Corregir manualmente una contracción.

No permitir registros con duración negativa.

## Persistencia del cronómetro

El cronómetro debe funcionar correctamente si:

- Se bloquea el teléfono.
- Se cambia de pestaña.
- Se recarga la página.
- Se pierde temporalmente la conexión.

Persistir la hora de inicio en el servidor cuando exista conectividad.

Para funcionamiento sin conexión, utilizar una cola local segura, con sincronización posterior, resolución de duplicados y sin depender solamente de un contador en memoria.

Calcular la duración a partir de marcas temporales, no de la cantidad de ejecuciones de un temporizador JavaScript.

## Información de seguridad

Mostrar una aclaración visible:

"Esta herramienta sirve para registrar contracciones, pero no determina por sí sola si estás en trabajo de parto."

No utilizar una regla universal de frecuencia para indicar que el parto comenzó.

Permitir guardar indicaciones específicas del equipo obstétrico sobre cuándo comunicarse con maternidad.

Mostrar información revisada por profesionales sobre signos que requieren atención urgente.

La aplicación no debe retrasar la consulta médica por esperar a completar registros.

## Exportación

Permitir descargar un resumen con:

- Fecha.
- Horario.
- Duración.
- Intervalos.
- Observaciones.

---

# 8. INTEGRACIÓN CON EL DASHBOARD

No saturar la pantalla principal.

Agregar una tarjeta denominada:

**Herramientas para esta etapa**

Con accesos visuales a:

- Mis preparativos.
- Nombres para mi bebé.
- Compartir mi embarazo.
- Mis preguntas.
- Mi pancita.
- Mis contracciones.

La tarjeta puede reorganizarse según el avance gestacional.

Ejemplos:

Durante el primer trimestre:

- Nombres.
- Preguntas médicas.
- Diario.
- Fotografías.

Durante el segundo trimestre:

- Preparativos.
- Fotografías.
- Tarjetas para compartir.

Durante el tercer trimestre:

- Bolso maternal.
- Citas.
- Preguntas.
- Cronómetro de contracciones.

No ocultar herramientas importantes únicamente porque la semana no coincida.

El usuario debe poder acceder siempre al listado completo.

---

# 9. BASE DE DATOS Y PRISMA

Analizá primero el esquema existente.

Reutilizá:

- User.
- Pregnancy.
- PregnancyMember.
- Appointment.
- BellyPhoto.
- UploadedFile.
- Notification.

Crear modelos nuevos únicamente cuando sean necesarios.

Modelos sugeridos:

### Preparativos

- PreparationCategory
- PreparationTask
- PreparationTemplate
- PreparationTemplateItem

### Nombres

- BabyName
- BabyNameFavorite
- BabyNameVote
- BabyNameNote

### Tarjetas

- ShareCard
- ShareCardTemplate
- ShareCardAsset

### Preguntas

- MedicalQuestion

### Timelapse

- BellyTimelapse
- BellyTimelapsePhoto
- MediaProcessingJob

### Contracciones

- ContractionSession
- ContractionRecord

Definir relaciones correctamente.

Agregar:

- Restricciones únicas.
- Índices.
- Claves foráneas.
- Fechas UTC y presentación en zona horaria local.
- Permisos de acceso.
- Estados.
- Reglas de eliminación.

No almacenar archivos multimedia binarios dentro de PostgreSQL.

Todos los registros personales deben asociarse correctamente al embarazo y al usuario autorizado.

---

# 10. PERMISOS Y PRIVACIDAD FAMILIAR

BAMBEE permite vincular a la pareja.

Los nuevos módulos deben respetar los permisos existentes.

### Compartidos cuando el titular lo autorice

- Preparativos.
- Votación de nombres.
- Algunas tarjetas.
- Preguntas médicas seleccionadas.

### Privados por defecto

- Fotos de la pancita.
- Videos timelapse.
- Preguntas médicas.
- Registros de contracciones.
- Información clínica personal.

El acceso debe comprobarse en el servidor.

No confiar en controles visuales como mecanismo de autorización.

La desvinculación de la pareja debe revocar inmediatamente los permisos de acceso correspondientes.

---

# 11. NOTIFICACIONES

Integrar los módulos con el sistema existente.

Agregar recordatorios configurables para:

- Tareas próximas.
- Preparativos pendientes.
- Preguntas asociadas a una próxima cita.

No enviar notificaciones repetitivas o innecesarias.

No mostrar datos privados en notificaciones externas sin consentimiento.

---

# 12. PANEL ADMINISTRATIVO

Ampliar el panel existente para administrar contenido general.

### Preparativos

Gestionar plantillas predeterminadas.

### Nombres

- Importar catálogo.
- Editar nombres.
- Administrar orígenes.
- Revisar significados.
- Detectar duplicados.

### Tarjetas

Administrar plantillas visuales y textos generales.

No otorgar a administradores acceso indiscriminado a fotografías privadas, preguntas médicas o videos familiares.

---

# 13. REQUISITOS DE SEGURIDAD

Aplicar:

- Validación Zod en operaciones de entrada.
- Autenticación.
- Autorización por usuario y embarazo.
- Protección contra accesos horizontales a datos de otros usuarios.
- Validación de archivos.
- Límites de tamaño.
- Límites de frecuencia.
- Manejo seguro de errores.
- Protección de información sensible.
- Registros de auditoría cuando corresponda.
- URLs privadas y temporales para multimedia.

Para la generación de imágenes y videos:

- Validar datos proporcionados por usuarios.
- No ejecutar comandos de sistema con cadenas sin sanitizar.
- Establecer límites de CPU, memoria y tiempo.
- Controlar archivos temporales.
- No exponer rutas internas.

No introducir dependencias innecesarias.

---

# 14. MIGRACIONES Y COMPATIBILIDAD

No eliminar datos existentes.

No ejecutar:

- `prisma migrate reset`
- Limpieza completa de tablas.
- Migraciones destructivas sin revisión.
- Reemplazo de datos reales por seeds.

Crear migraciones incrementales.

Implementar seeds idempotentes para:

- Plantillas de preparativos.
- Catálogo inicial de nombres verificados.
- Plantillas de tarjetas.

No sobrescribir configuraciones personalizadas existentes.

---

# 15. PRUEBAS OBLIGATORIAS

Crear o ampliar pruebas automatizadas.

### Preparativos

- Crear y completar tareas.
- Calcular progreso.
- Importar plantillas sin duplicados.
- Compartir con permisos.

### Nombres

- Buscar.
- Filtrar.
- Guardar favoritos.
- Registrar votos.
- Detectar coincidencias.
- Evitar duplicados.

### Tarjetas

- Generar PNG.
- Respetar dimensiones.
- Guardar configuraciones.
- No incluir datos privados sin confirmación.

### Preguntas

- Crear y editar.
- Asociar a citas.
- Marcar respondidas.
- Respetar privacidad.

### Timelapse

- Seleccionar fotografías.
- Ordenar.
- Generar video válido.
- Controlar errores.
- Descargar.
- Eliminar archivos autorizados.
- Impedir acceso entre usuarios.

### Contracciones

- Iniciar y finalizar.
- Calcular duración.
- Calcular intervalos.
- Recuperar sesión tras recarga.
- Evitar registros duplicados.
- Manejar reconexiones.

### Generales

- Responsive.
- Navegación.
- Autenticación.
- Permisos.
- Persistencia.
- Compilación de producción.

---

# 16. CRITERIOS DE ACEPTACIÓN

Un módulo solo se considera terminado cuando:

1. Tiene interfaz funcional.
2. Está conectado al backend.
3. Persiste correctamente los datos.
4. Tiene validaciones.
5. Respeta permisos.
6. Funciona en móvil.
7. Tiene estados de carga, error y vacío.
8. Tiene pruebas suficientes.
9. Está integrado a la navegación.
10. No rompe funciones existentes.

Para timelapse, no aceptar como terminado un simple pase de diapositivas: debe generarse un archivo de video real.

Para tarjetas, no aceptar una captura de baja calidad: debe exportarse un PNG real.

Para contracciones, no aceptar un contador temporal sin persistencia.

Para nombres, no aceptar una lista estática sin favoritos, votos y búsqueda funcional.

Para preparativos, no aceptar checklists que se reinicien al recargar.

Para preguntas médicas, no aceptar notas que no estén vinculadas a la cuenta y al embarazo.

---

# 17. ORDEN DE IMPLEMENTACIÓN

Desarrollar en este orden:

**Fase 1 — Análisis e infraestructura**

- Inspeccionar proyecto.
- Revisar modelos.
- Planificar migraciones.
- Verificar reutilización de componentes.
- Implementar cambios de base de datos.

**Fase 2 — Preparativos y preguntas médicas**

- Crear CRUD.
- Integrar agenda y notificaciones.
- Implementar permisos.

**Fase 3 — Buscador de nombres**

- Crear catálogo.
- Favoritos.
- Filtros.
- Votación en pareja.

**Fase 4 — Tarjetas para compartir**

- Editor.
- Plantillas.
- Generación PNG.
- Descarga y persistencia.

**Fase 5 — Contracciones**

- Cronómetro.
- Historial.
- Persistencia.
- Estadísticas.
- Exportación.

**Fase 6 — Timelapse**

- Reutilizar fotografías existentes.
- Crear editor.
- Implementar procesamiento de video.
- Descarga.
- Gestión de archivos.

**Fase 7 — Integración y pruebas**

- Dashboard.
- Navegación.
- Responsive.
- Seguridad.
- Pruebas de regresión.
- Build de producción.

---

# 18. ENTREGA FINAL

Al finalizar, informar:

- Archivos modificados.
- Modelos nuevos.
- Migraciones creadas.
- Rutas implementadas.
- Funciones terminadas.
- Seeds cargados.
- Pruebas ejecutadas y resultados.
- Servicios externos necesarios.
- Variables de entorno nuevas.
- Limitaciones pendientes.
- Riesgos conocidos.

No afirmar que una función está terminada si solo está diseñada.

No declarar pruebas como aprobadas si no se ejecutaron.

Si alguna dependencia externa impide completar una funcionalidad, dejar la implementación preparada y explicar exactamente qué falta.

## INSTRUCCIÓN FINAL

Implementá estas seis funcionalidades dentro del repositorio actual de BAMBEE, respetando estrictamente su identidad visual, arquitectura, componentes existentes y datos de los usuarios.

Priorizar código mantenible, seguridad, una excelente experiencia móvil y persistencia real.

**No quiero mockups ni simulaciones: quiero funcionalidades operativas e integradas a la aplicación existente.**

Comenzá inspeccionando el código actual y ejecutá el desarrollo por fases hasta completar todo lo que permita el entorno disponible.
