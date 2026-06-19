# Cuaderno del Profesor

Aplicacion web para docentes que funciona como cuaderno digital tipo Notion. Sin dependencias externas. Todo se guarda automaticamente en el navegador mediante localStorage.

## Funcionalidades

- **Editor de paginas** — bloques enriquecidos: titulos, parrafos, listas, tareas, citas, codigo, tablas, imagenes, audio, video e iframes (Genially, GeoGebra, Maps…). Atajos de teclado y menu de comandos con `/`.
- **Agenda semanal** — planificacion de clases por horas con eventos repetidos semanalmente y vinculo a paginas de apuntes.
- **Vista Hoy** — clases del dia en orden, acceso rapido a grupos y resumen de tareas pendientes.
- **Grupos** — listas de alumnos, pase de lista diario (presente / retraso / ausente), selector de alumno al azar y libro de calificaciones exportable a CSV.
- **Asignaturas** — panel por asignatura con horario, paginas vinculadas, tareas pendientes y temporalizacion de unidades didacticas.
- **Tareas** — agrega en un unico lugar todas las casillas pendientes de todas las paginas, con filtros por asignatura.
- **Rubricas** — creacion y consulta de rubricas de evaluacion.
- **Modo presentacion** — convierte cualquier pagina en diapositivas (cada Titulo 1 abre una nueva diapositiva) con temporizador integrado.
- **Exportar** — descarga de cualquier pagina en formato Markdown.
- **Copia de seguridad** — exporta o restaura todos los datos en un archivo JSON.
- **Tema claro y oscuro**.

## Uso

Abre `index.html` en el navegador. No requiere servidor ni instalacion.

Los datos persisten en el `localStorage` del navegador. Para llevarlos a otro dispositivo usa la opcion de copia de seguridad en la barra lateral.

## Estructura

```
index.html   — estructura HTML y punto de entrada
styles.css   — estilos de la interfaz
app.js       — logica completa de la aplicacion
```

## Tecnologia

HTML, CSS y JavaScript vanilla. Sin frameworks ni dependencias.
