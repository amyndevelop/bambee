# Frutas y verduras originales

Fuente: `fyv.pdf`, adjuntado por el usuario para reemplazar los marcadores semanales. Contiene 39 ilustraciones en el orden de semanas 4–42. No se generan ni redibujan los originales.

`sources.json` conserva SHA-256 del PDF, fruta, semana, ruta PNG y coordenadas de extracción. Las regiones poligonales excluyen fragmentos de ilustraciones vecinas. Los PNG conservan el canal alfa del PDF y sus dimensiones nativas; las semillas tienen menor resolución en el original.

Extracción reproducible con Python y PyMuPDF: ejecutar `python design/fruits/extract.py` y luego `python design/fruits/refine.py` desde cualquier directorio. Son herramientas de diseño; no son dependencias del despliegue. El seed de producción reemplaza los marcadores conocidos sin cambiar textos, estado de revisión, visibilidad ni arte personalizado.
