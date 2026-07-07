# Cuaderno del Profesor

[![Licencia CC BY 4.0](https://img.shields.io/badge/Licencia-CC%20BY%204.0-green?style=flat-square)](https://creativecommons.org/licenses/by/4.0/)

**Demo:** https://amadorprof.github.io/Cuaderno-del-Profesor/

Aplicación web para docentes que funciona como cuaderno digital. Sin dependencias externas ni servidor. Todo se guarda automáticamente en el navegador (IndexedDB, con reserva en localStorage).

## Funcionalidades

- **Editor de páginas** — bloques enriquecidos: títulos, párrafos, listas, tareas, citas, código, tablas, imágenes, audio, vídeo e iframes (Genially, GeoGebra, Maps…). Menú de comandos con `/` y atajos de teclado.
- **Enlaces wiki y backlinks** — escribe `[[` para enlazar otra página (con autocompletado, estilo Obsidian); cada página muestra al pie qué páginas enlazan a ella.
- **Etiquetas** — escribe `#etiqueta` en cualquier línea; haz clic en una etiqueta para ver todos los bloques etiquetados, agrupados por página.
- **Páginas incrustadas** — el bloque «Página incrustada» muestra otra página dentro de la actual (transclusión), ideal para reutilizar rúbricas o criterios.
- **Destacados con tipos** — callouts de información, idea, éxito, aviso, importante y pregunta, cada uno con su color.
- **Favoritos** — marca páginas con ⭐ y accede a ellas desde la barra lateral.
- **Índice e historial** — tabla de contenidos de la página y historial de versiones con restauración (se guarda una copia al abrir la página y cada pocos minutos).
- **Nota diaria** — desde la vista Hoy, crea/abre la página de diario del día dentro de «Diario de clase».
- **Agenda semanal** — planificación de clases por horas con eventos repetidos y vínculo a páginas de apuntes.
- **Vista Hoy** — clases del día en orden, acceso rápido a grupos y resumen de tareas pendientes.
- **Grupos** — listas de alumnos, pase de lista (presente / retraso / ausente), selector aleatorio y libro de calificaciones exportable a CSV.
- **Asignaturas** — panel con horario, páginas vinculadas, tareas pendientes y temporalización de unidades didácticas.
- **Tareas** — agrega en un único lugar todas las casillas pendientes de todas las páginas, con filtros por asignatura. Incluye vista **Tablero** tipo Padlet/Trello: columnas personalizables («Por hacer», «En curso», «Hecho»…) con tarjetas que se arrastran entre columnas y creación rápida de tareas.
- **Rúbricas** — creación y consulta de rúbricas de evaluación.
- **Modo presentación** — convierte cualquier página en diapositivas (cada Título 1 = nueva diapositiva) con temporizador integrado.
- **Exportar** — descarga de cualquier página en Markdown (los enlaces wiki se exportan como `[[...]]`).
- **Copia de seguridad** — exporta o restaura todos los datos en un archivo JSON.
- **Tema claro y oscuro**.
- **Diseño adaptable** — en pantallas pequeñas (tablet/móvil) la barra lateral se convierte en un menú deslizante.

## Uso

Abre `index.html` en el navegador. No requiere instalación ni servidor.

Los datos persisten en **IndexedDB** (sin el límite de ~5 MB de localStorage); si IndexedDB no está disponible se usa localStorage como reserva, y los datos de versiones anteriores se migran automáticamente. Para llevarlos a otro dispositivo usa la copia de seguridad de la barra lateral o la sincronización con GitHub.

## Estructura

```
index.html      — estructura HTML y punto de entrada (define el orden de carga)
styles.css      — estilos de la interfaz
js/util.js      — helpers, saneado de HTML (en documento inerte), etiquetas, iconos
js/storage.js   — persistencia (IndexedDB + reserva), esquema versionado y migraciones
js/editor.js    — editor de bloques, menú «/», enlaces wiki y modales
js/shell.js     — render principal, barra lateral, historial de versiones, topbar
js/views.js     — vistas: Hoy, etiquetas, asignaturas, tareas y tablero
js/groups.js    — grupos, pase de lista y calificaciones
js/agenda.js    — búsqueda ⌘K y agendas semanal/mensual
js/present.js   — modo presentación y exportación a Markdown
js/sync.js      — copia de seguridad y sincronización con GitHub
js/rubrics.js   — rúbricas
js/main.js      — atajos globales y arranque
tests/          — pruebas de humo (test.js) y runner (run.sh)
```

Tecnología: HTML, CSS y JavaScript vanilla, en scripts clásicos sin módulos ES para que siga funcionando abriendo `index.html` directamente (`file://`). Sin frameworks ni dependencias externas.

Notas de arquitectura:

- **Estado versionado** — los datos llevan un número de versión de esquema y las migraciones se aplican al cargar, también sobre copias de seguridad antiguas.
- **Saneado en la frontera** — todo estado que entra (almacenamiento, copia de seguridad, GitHub) pasa por `sanitize()` en un documento inerte, donde el HTML malicioso ni se ejecuta ni carga recursos.
- **`commit()`** — guardar y re-renderizar van juntos en un único helper.

## Pruebas

```
bash tests/run.sh
```

Ejecuta la suite de humo (funciones y arquitectura) sobre una copia temporal de la app en Chrome/Chromium headless.

---

Publicado bajo [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) — puedes usar, compartir y adaptar con atribución.