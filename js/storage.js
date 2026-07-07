/* ==========================================================================
   Cuaderno del Profesor — Persistencia (IndexedDB + reserva localStorage), esquema/migraciones y estado.
   Script clásico sin módulos (funciona sobre file://); el orden de carga
   lo define index.html.
   ========================================================================== */

"use strict";

/* ---------------- Persistencia ----------------
   Principal: IndexedDB (sin el límite de ~5 MB de localStorage).
   Reserva: localStorage, si IndexedDB no está disponible (p. ej. algunos
   contextos file:// o de navegación privada). Los datos antiguos en
   localStorage se migran automáticamente en el primer arranque y no se borran. */

const STORAGE_KEY = "cuaderno-profe-v1";              /* clave heredada en localStorage */
const VERSIONS_LS_KEY = "cuaderno-profe-versions-v1"; /* clave heredada del historial */
const DB_NAME = "cuaderno-profe";
const DB_STORE = "kv";

let _db = null; /* conexión abierta; null ⇒ reserva en localStorage */

function idbOpen() {
  return new Promise(resolve => {
    let settled = false;
    const done = db => { if (!settled) { settled = true; resolve(db); } };
    /* en algunos contextos (p. ej. file:// en modo headless) la petición no
       responde nunca: pasado un plazo se usa la reserva en localStorage */
    const timer = setTimeout(() => done(null), 1500);
    let req;
    try { req = indexedDB.open(DB_NAME, 1); } catch { clearTimeout(timer); done(null); return; }
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => {
      clearTimeout(timer);
      if (settled) { req.result.close(); return; } /* llegó tarde: no mezclar backends */
      done(req.result);
    };
    req.onerror = () => { clearTimeout(timer); done(null); };
    req.onblocked = () => { clearTimeout(timer); done(null); };
  });
}

function idbGet(key) {
  return new Promise(resolve => {
    try {
      const r = _db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(undefined);
    } catch { resolve(undefined); }
  });
}

function idbSet(key, value) {
  return new Promise((resolve, reject) => {
    try {
      const tx = _db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    } catch (e) { reject(e); }
  });
}

/* lee una clave: primero IndexedDB; si no existe, la clave heredada de localStorage */
async function storageGet(key, lsKey) {
  if (_db) {
    const v = await idbGet(key);
    if (v !== undefined) return v;
  }
  try {
    const raw = localStorage.getItem(lsKey);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn("No se pudo leer", lsKey, e); }
  return null;
}

let _persistErrorShown = false;
function persistError() {
  if (_persistErrorShown) return;
  _persistErrorShown = true;
  alert("No se pudieron guardar los datos en el navegador. Exporta una copia de seguridad cuanto antes.");
}

/* escribe una clave en el almacenamiento disponible (asíncrono, mejor esfuerzo) */
function storageSet(key, lsKey, value) {
  if (_db) {
    idbSet(key, value).catch(persistError);
  } else {
    try { localStorage.setItem(lsKey, JSON.stringify(value)); }
    catch { persistError(); }
  }
}

/* ---------------- Esquema y migraciones ----------------
   El estado lleva un número de versión. MIGRATIONS[n] transforma la versión n
   en la n+1; al cargar (o importar una copia) se aplican las que falten. */

const SCHEMA_VERSION = 2;

const MIGRATIONS = {
  /* v1 → v2 (2026-07): tablero de tareas tipo kanban */
  1: data => {
    if (!Array.isArray(data.taskCols) || !data.taskCols.length) {
      data.taskCols = [
        { id: uid(), name: "Por hacer", done: false },
        { id: uid(), name: "En curso", done: false },
        { id: uid(), name: "Hecho", done: true },
      ];
    }
  },
};

function migrateState(data) {
  let v = Number(data.version) || 1;
  while (v < SCHEMA_VERSION) {
    if (MIGRATIONS[v]) MIGRATIONS[v](data);
    v++;
  }
  data.version = SCHEMA_VERSION;
  return data;
}

/* tipos cuyo html se pinta con innerHTML y por tanto se sanea al entrar datos */
const RICH_TEXT_TYPES = ["text", "h1", "h2", "h3", "todo", "bullet", "number", "toggle", "quote", "callout"];

/* defensa única en la frontera: todo estado que entra (localStorage antiguo,
   copia de seguridad, GitHub) queda saneado; el resto del código confía en él */
function sanitizeState(data) {
  data.pages.forEach(p => (p.blocks || []).forEach(b => {
    if (RICH_TEXT_TYPES.includes(b.type) && typeof b.html === "string") b.html = sanitize(b.html);
    if (b.type === "table" && Array.isArray(b.rows)) b.rows = b.rows.map(r => r.map(c => sanitize(c || "")));
  }));
  return data;
}

/* ---------------- Estado ---------------- */

function mkBlock(type, html = "", extra = {}) {
  return { id: uid(), type, html, indent: 0, checked: false, collapsed: false, ...extra };
}

function seedData() {
  const monday = mondayOf(new Date());
  const subjHistoria = { id: uid(), name: "Programación", color: "blue" };
  const subjGeo = { id: uid(), name: "Sistemas operativos", color: "green" };
  const welcome = {
    id: uid(), title: "Bienvenida", icon: "👋", parentId: null, open: true,
    blocks: [
      mkBlock("callout", "Este es tu cuaderno digital. Todo se guarda automáticamente en este navegador."),
      mkBlock("h2", "Cómo se usa"),
      mkBlock("bullet", "Escribe <b>/</b> en cualquier línea para insertar bloques: títulos, listas, tareas, citas, código, imágenes, <b>tablas</b>, <b>vídeos</b> (YouTube/Vimeo), <b>audio</b>, <b>enlaces</b> y <b>contenido incrustado</b> (Genially, Maps, GeoGebra…)."),
      mkBlock("bullet", "Atajos al escribir: <code># </code> título, <code>- </code> viñeta, <code>[] </code> tarea, <code>1. </code> lista numerada, <code>&gt; </code> cita, <code>---</code> divisor."),
      mkBlock("bullet", "<b>Tab</b> y <b>Shift+Tab</b> para anidar bloques. Arrastra el tirador <b>⋮⋮</b> para reordenarlos."),
      mkBlock("bullet", "Crea páginas y subpáginas desde la barra lateral. Haz clic en el icono grande para cambiarlo."),
      mkBlock("h2", "Para tus clases"),
      mkBlock("bullet", "<b>🏠 Hoy</b>: tu pantalla de inicio — las clases de hoy en orden, con acceso directo a los apuntes, tus grupos y las tareas pendientes."),
      mkBlock("bullet", "<b>👥 Grupos</b>: listas de alumnos por grupo, <b>pasar lista</b> (presente/retraso/ausente) con incidencias por día, y un <b>selector de alumno al azar</b> que evita repetir hasta completar la ronda."),
      mkBlock("bullet", "<b>🏷️ Asignaturas</b>: crea cada asignatura que impartes con su color. Asígnalas a páginas y eventos, y haz clic en una asignatura en la barra lateral para ver su panel: horario, páginas y tareas pendientes."),
      mkBlock("bullet", "<b>📅 Agenda semanal</b>: planifica tus clases por horas. Los eventos pueden <b>repetirse cada semana</b> (tu horario fijo), tener asignatura y vincularse a una página de apuntes."),
      mkBlock("bullet", "<b>✅ Tareas</b>: reúne en un solo lugar todas las casillas pendientes de todas tus páginas."),
      mkBlock("bullet", "<b>▶ Presentar</b>: convierte cualquier página en diapositivas (cada Título 1 inicia una nueva). Incluye un <b>temporizador</b> de 5/10/15 min para actividades."),
      mkBlock("bullet", "Las páginas nuevas ofrecen <b>plantillas</b>: plan de clase, examen, reunión y plan semanal."),
      mkBlock("bullet", "<b>⌘K</b> busca en todas tus páginas. <b>Exportar</b> descarga la página como Markdown."),
      mkBlock("bullet", "Escribe <b>[[</b> para enlazar otra página (estilo wiki). Al pie de cada página verás qué páginas enlazan a ella."),
      mkBlock("bullet", "Usa <b>#etiquetas</b> en cualquier línea y haz clic en una para ver todo lo etiquetado. Marca páginas como <b>⭐ favoritas</b> desde la barra superior, donde también tienes el <b>índice</b> de la página y su <b>historial de versiones</b>."),
      mkBlock("bullet", "En <b>✅ Tareas</b> cambia a la vista <b>Tablero</b>: columnas tipo Padlet donde arrastras tus tareas entre «Por hacer», «En curso» y «Hecho»."),
      mkBlock("bullet", "<b>💾 Copia de seguridad</b> (barra lateral): exporta o restaura todos tus datos en un archivo."),
      mkBlock("divider"),
      mkBlock("todo", "Probar el menú escribiendo / aquí debajo"),
      mkBlock("text", ""),
    ],
  };
  const lesson = {
    id: uid(), title: "Tema 3 · Bucles en Python", icon: "🐍", parentId: null, open: true, subjectId: subjHistoria.id,
    blocks: [
      mkBlock("callout", "Ejemplo de página de clase. Pulsa <b>▶ Presentar</b> arriba a la derecha para verla como diapositivas."),
      mkBlock("h1", "¿Para qué sirven los bucles?"),
      mkBlock("text", "Permiten repetir un bloque de código sin escribirlo varias veces."),
      mkBlock("bullet", "<b>for</b>: cuando sabemos cuántas veces repetir"),
      mkBlock("bullet", "<b>while</b>: mientras se cumpla una condición"),
      mkBlock("h1", "Ejemplo: bucle for"),
      mkBlock("code", 'for i in range(1, 11):\n    print(f"{i} x 7 = {i * 7}")'),
      mkBlock("text", "¿Qué imprime este programa? ¿Cómo lo cambiarías para la tabla del 9?"),
      mkBlock("h1", "Ejemplo: bucle while"),
      mkBlock("code", 'intentos = 3\nwhile intentos > 0:\n    clave = input("Contraseña: ")\n    if clave == "secreta":\n        print("¡Correcto!")\n        break\n    intentos -= 1'),
      mkBlock("quote", "«Primero haz que funcione, luego hazlo bonito, después hazlo rápido.» — Kent Beck"),
      mkBlock("h1", "Actividad para casa"),
      mkBlock("todo", "Ejercicios 1–5 de la ficha de bucles"),
      mkBlock("todo", "Escribir un programa que adivine un número con intentos limitados"),
    ],
  };
  const planning = {
    id: uid(), title: "Planificación del trimestre", icon: "🗂️", parentId: null, open: true,
    blocks: [
      mkBlock("h2", "Pendiente esta semana"),
      mkBlock("todo", "Corregir exámenes del Tema 4"),
      mkBlock("todo", "Preparar diapositivas del Tema 5"),
      mkBlock("todo", "Reunión de departamento — llevar propuesta de salidas"),
      mkBlock("h2", "Ideas"),
      mkBlock("bullet", "Visita al museo industrial"),
      mkBlock("bullet", "Debate por grupos: pros y contras de la industrialización"),
    ],
  };
  return {
    pages: [welcome, lesson, planning],
    subjects: [subjHistoria, subjGeo],
    groups: [],
    events: [
      { id: uid(), title: "Programación · 1.º Bach B", date: isoDate(addDays(monday, 0)), start: "09:00", end: "10:00", color: "blue", repeat: "weekly", pageId: lesson.id, subjectId: subjHistoria.id },
      { id: uid(), title: "Programación · 1.º Bach A", date: isoDate(addDays(monday, 1)), start: "11:00", end: "12:00", color: "blue", repeat: "weekly", pageId: lesson.id, subjectId: subjHistoria.id },
      { id: uid(), title: "Sistemas operativos · 4.º ESO", date: isoDate(addDays(monday, 2)), start: "12:30", end: "13:30", color: "green", repeat: "weekly", pageId: null, subjectId: subjGeo.id },
      { id: uid(), title: "Reunión de departamento", date: isoDate(addDays(monday, 3)), start: "16:00", end: "17:30", color: "orange", repeat: null, pageId: null, subjectId: null },
    ],
    settings: { theme: "light" },
  };
}

/* punto único de entrada de datos: garantiza estructura, migra el esquema
   y sanea el HTML, venga de donde venga (IndexedDB, localStorage antiguo,
   copia de seguridad o GitHub) */
function normalizeState(data) {
  if (!Array.isArray(data.pages)) data.pages = [];
  if (!data.pages.length) {
    data.pages.push({ id: uid(), title: "", icon: "📄", parentId: null, open: true, blocks: [mkBlock("text", "")] });
  }
  if (!Array.isArray(data.events)) data.events = [];
  if (!Array.isArray(data.subjects)) data.subjects = [];
  if (!Array.isArray(data.groups)) data.groups = [];
  if (!Array.isArray(data.rubrics)) data.rubrics = [];
  if (!data.settings) data.settings = { theme: "light" };
  migrateState(data);
  sanitizeState(data);
  return data;
}

let state = null; /* se asigna en initApp() */

/* ---------------- Índices de búsqueda rápida ---------------- */

let _pageMap = new Map();
let _subjectMap = new Map();
let _groupMap = new Map();

function rebuildMaps() {
  _pageMap    = new Map(state.pages.map(p => [p.id, p]));
  _subjectMap = new Map(state.subjects.map(s => [s.id, s]));
  _groupMap   = new Map(state.groups.map(g => [g.id, g]));
}

function save() {
  rebuildMaps();
  state.savedAt = Date.now(); /* para elegir la copia más reciente al arrancar */
  storageSet("state", STORAGE_KEY, state);
}
const saveSoon = debounce(save, 250);

/* guarda y re-renderiza en un solo paso; render por defecto: toda la interfaz */
function commit(render = renderAll) {
  save();
  if (render) render();
}

/* vista actual: la app arranca en «Hoy» */
let view = { kind: "today" };
let weekStart = mondayOf(new Date());
let monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

/* ---------------- Acceso a datos ---------------- */

const getPage       = id  => _pageMap.get(id);
const childrenOf    = pid => state.pages.filter(p => p.parentId === pid);
const getSubjectById = id => _subjectMap.get(id);

/* color efectivo de un evento: el de su asignatura, si la tiene */
function evColorKey(ev) {
  const s = ev.subjectId && getSubjectById(ev.subjectId);
  return (s && s.color) || ev.color || "blue";
}

function currentPage() { return view.kind === "page" ? getPage(view.pageId) : null; }

function findBlock(id) {
  const p = currentPage();
  return p ? p.blocks.find(b => b.id === id) : null;
}
function blockIndex(id) {
  const p = currentPage();
  return p.blocks.findIndex(b => b.id === id);
}
function insertBlockAfter(refId, block) {
  const p = currentPage();
  p.blocks.splice(blockIndex(refId) + 1, 0, block);
}
function removeBlock(id) {
  const p = currentPage();
  const i = blockIndex(id);
  if (i >= 0) p.blocks.splice(i, 1);
}

/* bloques visibles (respetando desplegables cerrados) */
function visibleBlocks() {
  const p = currentPage();
  const out = [];
  let hideBelow = null;
  for (const b of p.blocks) {
    if (hideBelow !== null) {
      if (b.indent > hideBelow) continue;
      hideBelow = null;
    }
    out.push(b);
    if (b.type === "toggle" && b.collapsed) hideBelow = b.indent;
  }
  return out;
}
/* prevVisible y nextVisible comparten el mismo cálculo — llamar visibleBlocks una vez */
function prevNextVisible(id) {
  const v = visibleBlocks();
  const i = v.findIndex(b => b.id === id);
  return { prev: i > 0 ? v[i - 1] : null, next: i >= 0 && i < v.length - 1 ? v[i + 1] : null };
}
function prevVisible(id) { return prevNextVisible(id).prev; }
function nextVisible(id) { return prevNextVisible(id).next; }
