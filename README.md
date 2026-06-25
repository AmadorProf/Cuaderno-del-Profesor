# Cuaderno del Profesor

[![Licencia CC BY 4.0](https://img.shields.io/badge/Licencia-CC%20BY%204.0-green?style=flat-square)](https://creativecommons.org/licenses/by/4.0/)

Aplicación web para docentes que funciona como cuaderno digital. Sin dependencias externas ni servidor. Todo se guarda automáticamente en el navegador mediante localStorage.

## Funcionalidades

- **Editor de páginas** — bloques enriquecidos: títulos, párrafos, listas, tareas, citas, código, tablas, imágenes, audio, vídeo e iframes (Genially, GeoGebra, Maps…). Menú de comandos con `/` y atajos de teclado.
- **Agenda semanal** — planificación de clases por horas con eventos repetidos y vínculo a páginas de apuntes.
- **Vista Hoy** — clases del día en orden, acceso rápido a grupos y resumen de tareas pendientes.
- **Grupos** — listas de alumnos, pase de lista (presente / retraso / ausente), selector aleatorio y libro de calificaciones exportable a CSV.
- **Asignaturas** — panel con horario, páginas vinculadas, tareas pendientes y temporalización de unidades didácticas.
- **Tareas** — agrega en un único lugar todas las casillas pendientes de todas las páginas, con filtros por asignatura.
- **Rúbricas** — creación y consulta de rúbricas de evaluación.
- **Modo presentación** — convierte cualquier página en diapositivas (cada Título 1 = nueva diapositiva) con temporizador integrado.
- **Exportar** — descarga de cualquier página en Markdown.
- **Copia de seguridad** — exporta o restaura todos los datos en un archivo JSON.
- **Tema claro y oscuro**.

## Uso

Abre `index.html` en el navegador. No requiere instalación ni servidor.

Los datos persisten en el `localStorage` del navegador. Para llevarlos a otro dispositivo usa la opción de copia de seguridad en la barra lateral.

## Estructura

```
index.html   — estructura HTML y punto de entrada
styles.css   — estilos de la interfaz
app.js       — lógica completa de la aplicación
```

Tecnología: HTML, CSS y JavaScript vanilla. Sin frameworks ni dependencias externas.

---

Publicado bajo [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) — puedes usar, compartir y adaptar con atribución.