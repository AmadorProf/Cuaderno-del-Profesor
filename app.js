/* ==========================================================================
   Cuaderno del Profesor — app tipo Notion para docentes
   Sin dependencias. Persistencia en localStorage.
   ========================================================================== */

"use strict";

/* ---------------- Utilidades ---------------- */

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function htmlToText(html) {
  const d = document.createElement("div");
  d.innerHTML = html || "";
  return d.textContent;
}

function isEmptyHtml(html) {
  const d = document.createElement("div");
  d.innerHTML = html || "";
  return d.textContent.trim() === "" && !d.querySelector("img");
}

const ALLOWED_TAGS = new Set(["B", "I", "U", "S", "EM", "STRONG", "A", "CODE", "BR"]);

function sanitize(html) {
  const d = document.createElement("div");
  d.innerHTML = html || "";
  (function clean(node) {
    [...node.children].forEach(el => {
      clean(el);
      if (!ALLOWED_TAGS.has(el.tagName)) {
        while (el.firstChild) node.insertBefore(el.firstChild, el);
        el.remove();
      } else {
        [...el.attributes].forEach(a => {
          if (!(el.tagName === "A" && a.name === "href")) el.removeAttribute(a.name);
        });
      }
    });
  })(d);
  return d.innerHTML;
}

/* ---------------- Iconos SVG de la interfaz ---------------- */

const ICONS = {
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  check: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>',
  cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  play: '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  shuffle: '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
};

const svgIcon = (n, size = 16) =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;

/* ---------------- Resaltado de sintaxis ---------------- */

const CODE_LANG_OPTIONS = [
  ["auto", "Auto"], ["python", "Python"], ["javascript", "JavaScript"], ["html", "HTML"],
  ["css", "CSS"], ["sql", "SQL"], ["bash", "Bash"], ["java", "Java"], ["c", "C/C++"], ["plain", "Texto"],
];

const LANG_DEFS = {
  python: {
    tokens: [["#[^\\n]*", "com"], ["'''[\\s\\S]*?'''|\"\"\"[\\s\\S]*?\"\"\"", "str"], ["'(?:\\\\.|[^'\\\\\\n])*'|\"(?:\\\\.|[^\"\\\\\\n])*\"", "str"]],
    kw: /\b(def|class|if|elif|else|for|while|in|is|not|and|or|return|import|from|as|with|try|except|finally|raise|pass|break|continue|lambda|yield|global|assert|del|True|False|None|print|input|range|len|int|str|float|list|dict|set|self)\b/g,
  },
  javascript: {
    tokens: [["\\/\\/[^\\n]*", "com"], ["\\/\\*[\\s\\S]*?\\*\\/", "com"], ["`(?:\\\\.|[^`\\\\])*`|'(?:\\\\.|[^'\\\\\\n])*'|\"(?:\\\\.|[^\"\\\\\\n])*\"", "str"]],
    kw: /\b(function|const|let|var|if|else|for|while|do|switch|case|break|continue|return|class|extends|new|this|typeof|instanceof|in|of|try|catch|finally|throw|async|await|import|export|from|default|null|undefined|true|false|console|document|window)\b/g,
  },
  html: {
    tokens: [["<!--[\\s\\S]*?-->", "com"], ["\"[^\"\\n]*\"|'[^'\\n]*'", "str"], ["<\\/?[a-zA-Z][\\w-]*|\\/?>", "kw"]],
    kw: /\b(DOCTYPE|html)\b/g,
  },
  css: {
    tokens: [["\\/\\*[\\s\\S]*?\\*\\/", "com"], ["\"[^\"\\n]*\"|'[^'\\n]*'", "str"]],
    kw: /([\w-]+(?=\s*:))/g,
  },
  sql: {
    tokens: [["--[^\\n]*", "com"], ["'[^'\\n]*'", "str"]],
    kw: /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|AND|OR|NOT|NULL|ORDER|BY|GROUP|HAVING|LIMIT|DISTINCT|PRIMARY|KEY|FOREIGN|INT|VARCHAR|TEXT|DATE)\b/gi,
  },
  bash: {
    tokens: [["#[^\\n]*", "com"], ["'[^'\\n]*'|\"(?:\\\\.|[^\"\\\\])*\"", "str"]],
    kw: /(\b(?:if|then|else|elif|fi|for|in|do|done|while|case|esac|function|echo|read|exit|return|local|export|cd|ls|grep|sed|awk|cat|sudo|chmod|mkdir|rm)\b|\$\w+)/g,
  },
  java: {
    tokens: [["\\/\\/[^\\n]*", "com"], ["\\/\\*[\\s\\S]*?\\*\\/", "com"], ["\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'", "str"]],
    kw: /\b(public|private|protected|class|interface|extends|implements|static|final|void|int|double|float|boolean|char|String|new|this|if|else|for|while|do|switch|case|break|continue|return|try|catch|finally|throw|throws|import|package|null|true|false|System)\b/g,
  },
  c: {
    tokens: [["\\/\\/[^\\n]*", "com"], ["\\/\\*[\\s\\S]*?\\*\\/", "com"], ["\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'", "str"], ["#\\s*\\w+", "kw"]],
    kw: /\b(if|else|for|while|do|switch|case|break|continue|return|struct|typedef|const|static|void|int|float|double|char|long|short|unsigned|signed|sizeof|new|delete|class|public|private|namespace|using|std|cout|cin|endl|NULL|nullptr|true|false)\b/g,
  },
};

function detectLang(src) {
  if (/^\s*<|<\/[a-z]+>/.test(src)) return "html";
  if (/\b(def |import |elif |print\(|self\.)/.test(src)) return "python";
  if (/#include|printf\(|std::/.test(src)) return "c";
  if (/\b(SELECT|INSERT|UPDATE|DELETE)\b[\s\S]*\b(FROM|INTO|SET|WHERE)\b/i.test(src)) return "sql";
  if (/^#!\/|(?:^|\n)\s*(?:fi|esac|done)\b|\becho /.test(src)) return "bash";
  if (/\b(public class|System\.out)/.test(src)) return "java";
  if (/\b(function|const|let|var|console\.)|=>/.test(src)) return "javascript";
  if (/[{;]\s*\n?\s*[\w-]+\s*:\s*[^;{]+;/.test(src)) return "css";
  return "plain";
}

function highlightCode(src, lang) {
  src = src || "";
  const escCode = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const L = (lang && lang !== "auto") ? lang : detectLang(src);
  const def = LANG_DEFS[L];
  if (!def) return escCode(src);
  const plain = txt => escCode(txt)
    .replace(def.kw, '<span class="tk-kw">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tk-num">$1</span>');
  const master = new RegExp(def.tokens.map(t => `(${t[0]})`).join("|"), "g");
  let out = "", last = 0, m;
  while ((m = master.exec(src))) {
    out += plain(src.slice(last, m.index));
    const gi = m.slice(1).findIndex(x => x !== undefined);
    out += `<span class="tk-${def.tokens[gi][1]}">${escCode(m[0])}</span>`;
    last = m.index + m[0].length;
    if (m[0].length === 0) master.lastIndex++;
  }
  out += plain(src.slice(last));
  return out;
}

/* fechas */
const pad = n => String(n).padStart(2, "0");
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function mondayOf(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toHHMM = min => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

/* ---------------- Estado ---------------- */

const STORAGE_KEY = "cuaderno-profe-v1";

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

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn("No se pudo cargar el estado:", e); }
  return null;
}

let state = loadState() || seedData();
if (!state.subjects) state.subjects = [];
if (!state.groups) state.groups = [];
if (!state.rubrics) state.rubrics = [];

/* ---------------- Índices de búsqueda rápida ---------------- */

let _pageMap = new Map();
let _subjectMap = new Map();
let _groupMap = new Map();

function rebuildMaps() {
  _pageMap    = new Map(state.pages.map(p => [p.id, p]));
  _subjectMap = new Map(state.subjects.map(s => [s.id, s]));
  _groupMap   = new Map(state.groups.map(g => [g.id, g]));
}
rebuildMaps();

function save() {
  rebuildMaps();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    alert("No se pudo guardar (¿almacenamiento lleno? Las imágenes subidas como archivo ocupan espacio).");
  }
}
const saveSoon = debounce(save, 250);

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

/* ---------------- Cursor en contenteditable ---------------- */

function getCaretOffset(el) {
  const sel = getSelection();
  if (!sel.rangeCount || !el.contains(sel.anchorNode)) return 0;
  const r = sel.getRangeAt(0).cloneRange();
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(r.endContainer, r.endOffset);
  return pre.toString().length;
}

function setCaretOffset(el, off) {
  el.focus();
  if (off === "end") off = el.textContent.length;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n, count = 0;
  while ((n = walker.nextNode())) {
    if (count + n.length >= off) {
      const r = document.createRange();
      r.setStart(n, off - count);
      r.collapse(true);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
      return;
    }
    count += n.length;
  }
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
}

function rangeFromOffsets(el, start, end) {
  const r = document.createRange();
  let sSet = false, eSet = false, count = 0;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    if (!sSet && count + n.length >= start) { r.setStart(n, start - count); sSet = true; }
    if (!eSet && count + n.length >= end) { r.setEnd(n, end - count); eSet = true; break; }
    count += n.length;
  }
  if (!sSet) r.setStart(el, el.childNodes.length);
  if (!eSet) r.setEnd(el, el.childNodes.length);
  return r;
}

/* divide el contenido de un bloque por el cursor, conservando formato */
function splitAtCaret(el) {
  const sel = getSelection();
  if (!sel.rangeCount || !el.contains(sel.anchorNode)) {
    return { before: el.innerHTML, after: "" };
  }
  const r = sel.getRangeAt(0);
  const tail = document.createRange();
  tail.selectNodeContents(el);
  tail.setStart(r.endContainer, r.endOffset);
  const frag = tail.extractContents();
  const tmp = document.createElement("div");
  tmp.appendChild(frag);
  return { before: el.innerHTML, after: tmp.innerHTML };
}

/* ---------------- Render: shell ---------------- */

const $ = sel => document.querySelector(sel);
const elTree = $("#page-tree");
const elTopbar = $("#topbar");
const elContent = $("#content");

function renderAll() {
  applyTheme();
  renderSidebar();
  renderTopbar();
  renderView();
}

function applyTheme() {
  document.body.dataset.theme = state.settings.theme;
  $("#theme-label").textContent = state.settings.theme === "dark" ? "Tema claro" : "Tema oscuro";
  $("#btn-theme .sb-item-icon").innerHTML = svgIcon(state.settings.theme === "dark" ? "sun" : "moon");
}

/* ---------------- Sidebar ---------------- */

function renderSidebar() {
  elTree.innerHTML = "";
  const roots = childrenOf(null);
  elTree.innerHTML = "";
  if (!roots.length) {
    elTree.innerHTML = '<div class="sb-empty">Sin páginas. Pulsa +</div>';
  } else {
    const frag = document.createDocumentFragment();
    roots.forEach(p => frag.appendChild(pageRow(p)));
    elTree.appendChild(frag);
  }
  $("#btn-today").classList.toggle("active", view.kind === "today");
  $("#btn-agenda").classList.toggle("active", view.kind === "agenda" || view.kind === "month");
  $("#btn-tasks").classList.toggle("active", view.kind === "tasks");
  $("#btn-rubrics").classList.toggle("active", view.kind === "rubrics" || view.kind === "rubric");

  const gl = $("#group-list");
  gl.innerHTML = "";
  if (!state.groups.length) {
    gl.innerHTML = '<div class="sb-empty">Crea tus grupos con +</div>';
  } else {
    const frag = document.createDocumentFragment();
    state.groups.forEach(g => {
      const row = document.createElement("div");
      row.className = "pg-row" + (view.kind === "group" && view.groupId === g.id ? " active" : "");
      const gIc = document.createElement("span");
      gIc.className = "pg-icon mono-ic";
      gIc.innerHTML = svgIcon("users", 14);
      const name = document.createElement("span");
      name.className = "pg-title";
      name.textContent = g.name;
      const actions = document.createElement("span");
      actions.className = "pg-actions";
      const editBtn = document.createElement("button");
      editBtn.innerHTML = svgIcon("edit", 12);
      editBtn.title = "Editar grupo";
      editBtn.onclick = e => { e.stopPropagation(); openGroupModal(g); };
      const delBtn = document.createElement("button");
      delBtn.innerHTML = svgIcon("trash", 12);
      delBtn.title = "Eliminar grupo";
      delBtn.onclick = e => { e.stopPropagation(); deleteGroup(g.id); };
      actions.append(editBtn, delBtn);
      row.append(gIc, name, actions);
      row.onclick = () => { view = { kind: "group", groupId: g.id, date: isoDate(new Date()) }; renderAll(); };
      frag.appendChild(row);
    });
    gl.appendChild(frag);
  }

  const list = $("#subject-list");
  list.innerHTML = "";
  if (!state.subjects.length) {
    list.innerHTML = '<div class="sb-empty">Crea tus asignaturas con +</div>';
  }
  state.subjects.forEach(s => {
    const row = document.createElement("div");
    row.className = "pg-row" + (view.kind === "subject" && view.subjectId === s.id ? " active" : "");
    const dot = document.createElement("span");
    dot.className = `pg-dot ev-${s.color}`;
    dot.style.marginLeft = "6px";
    const name = document.createElement("span");
    name.className = "pg-title";
    name.textContent = s.name;
    const actions = document.createElement("span");
    actions.className = "pg-actions";
    const editBtn = document.createElement("button");
    editBtn.innerHTML = svgIcon("edit", 12);
    editBtn.title = "Editar asignatura";
    editBtn.onclick = e => { e.stopPropagation(); openSubjectModal(s); };
    const delBtn = document.createElement("button");
    delBtn.innerHTML = svgIcon("trash", 12);
    delBtn.title = "Eliminar asignatura";
    delBtn.onclick = e => { e.stopPropagation(); deleteSubject(s.id); };
    actions.append(editBtn, delBtn);
    row.append(dot, name, actions);
    row.onclick = () => { view = { kind: "subject", subjectId: s.id }; renderAll(); };
    list.appendChild(row);
  });
}

function pageRow(p) {
  const wrap = document.createElement("div");
  const row = document.createElement("div");
  row.className = "pg-row" + (view.kind === "page" && view.pageId === p.id ? " active" : "");
  row.dataset.id = p.id;

  const kids = childrenOf(p.id);
  const chev = document.createElement("button");
  chev.className = "pg-chev" + (p.open ? " open" : "") + (kids.length ? "" : " empty");
  chev.textContent = "▶";
  chev.title = "Expandir";
  chev.onclick = e => { e.stopPropagation(); p.open = !p.open; saveSoon(); renderSidebar(); };

  const iconEl = document.createElement("span");
  iconEl.className = "pg-icon";
  if (p.icon && p.icon !== "📄") iconEl.textContent = p.icon;
  else { iconEl.classList.add("mono-ic"); iconEl.innerHTML = svgIcon("file", 14); }

  const title = document.createElement("span");
  title.className = "pg-title";
  title.textContent = p.title || "Sin título";

  const actions = document.createElement("span");
  actions.className = "pg-actions";
  const addBtn = document.createElement("button");
  addBtn.textContent = "+";
  addBtn.title = "Añadir subpágina";
  addBtn.onclick = e => { e.stopPropagation(); createPage(p.id); };
  const dupBtn = document.createElement("button");
  dupBtn.innerHTML = svgIcon("copy", 12);
  dupBtn.title = "Duplicar página";
  dupBtn.onclick = e => {
    e.stopPropagation();
    const np = clonePageTree(p.id, p.parentId, " (copia)");
    save();
    navigateToPage(np.id);
  };
  const delBtn = document.createElement("button");
  delBtn.innerHTML = svgIcon("trash", 12);
  delBtn.title = "Eliminar página";
  delBtn.onclick = e => {
    e.stopPropagation();
    if (confirm(`¿Eliminar «${p.title || "Sin título"}» y sus subpáginas?`)) deletePage(p.id);
  };
  actions.append(addBtn, dupBtn, delBtn);

  row.append(chev, iconEl, title);
  const subj = p.subjectId && getSubjectById(p.subjectId);
  if (subj) {
    const dot = document.createElement("span");
    dot.className = `pg-dot ev-${subj.color}`;
    dot.title = subj.name;
    row.appendChild(dot);
  }
  row.appendChild(actions);
  row.onclick = () => navigateToPage(p.id);
  wrap.appendChild(row);

  if (p.open && kids.length) {
    const cont = document.createElement("div");
    cont.className = "pg-children";
    kids.forEach(k => cont.appendChild(pageRow(k)));
    wrap.appendChild(cont);
  }
  return wrap;
}

function createPage(parentId) {
  const p = { id: uid(), title: "", icon: "📄", parentId, open: true, blocks: [mkBlock("text", "")] };
  state.pages.push(p);
  if (parentId) { const parent = getPage(parentId); if (parent) parent.open = true; }
  save();
  navigateToPage(p.id, true);
}

function clonePageTree(srcId, parentId, suffix) {
  const src = getPage(srcId);
  const np = {
    id: uid(),
    title: (src.title || "Sin título") + suffix,
    icon: src.icon,
    parentId,
    open: src.open,
    blocks: src.blocks.map(b => ({ ...b, id: uid(), rows: b.rows ? b.rows.map(r => [...r]) : undefined })),
  };
  state.pages.splice(state.pages.indexOf(src) + 1, 0, np);
  childrenOf(srcId).forEach(k => clonePageTree(k.id, np.id, ""));
  return np;
}

function deletePage(id) {
  const toDelete = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    state.pages.forEach(p => {
      if (p.parentId && toDelete.has(p.parentId) && !toDelete.has(p.id)) { toDelete.add(p.id); grew = true; }
    });
  }
  state.pages = state.pages.filter(p => !toDelete.has(p.id));
  if (view.kind === "page" && toDelete.has(view.pageId)) {
    if (!state.pages.length) {
      state.pages.push({ id: uid(), title: "", icon: "📄", parentId: null, open: true, blocks: [mkBlock("text", "")] });
    }
    view.pageId = state.pages[0].id;
  }
  save();
  renderAll();
}

function navigateToPage(id, focusTitle = false) {
  view = { kind: "page", pageId: id };
  renderAll();
  if (focusTitle) {
    const t = $(".page-title");
    if (t) setCaretOffset(t, "end");
  }
}

/* ---------------- Topbar ---------------- */

function renderTopbar() {
  elTopbar.innerHTML = "";
  if (view.kind !== "page") {
    const c = document.createElement("span");
    c.className = "crumb last";
    if (view.kind === "agenda") c.textContent = "Agenda semanal";
    else if (view.kind === "month") c.textContent = "Agenda mensual";
    else if (view.kind === "tasks") c.textContent = "Tareas";
    else if (view.kind === "today") c.textContent = "Hoy";
    else if (view.kind === "rubrics") c.textContent = "Rúbricas";
    else if (view.kind === "rubric") {
      const r = state.rubrics.find(x => x.id === view.rubricId);
      c.textContent = r ? `Rúbricas / ${r.name}` : "Rúbrica";
    }
    else if (view.kind === "group") {
      const g = state.groups.find(x => x.id === view.groupId);
      c.textContent = g ? g.name : "Grupo";
    } else {
      const s = getSubjectById(view.subjectId);
      c.textContent = s ? s.name : "Asignatura";
    }
    elTopbar.appendChild(c);
    return;
  }
  const p = currentPage();
  if (!p) return;

  const chain = [];
  let cur = p;
  while (cur) { chain.unshift(cur); cur = cur.parentId ? getPage(cur.parentId) : null; }
  chain.forEach((pg, i) => {
    const c = document.createElement("span");
    c.className = "crumb" + (i === chain.length - 1 ? " last" : "");
    c.textContent = `${pg.icon || "📄"} ${pg.title || "Sin título"}`;
    c.onclick = () => navigateToPage(pg.id);
    elTopbar.appendChild(c);
    if (i < chain.length - 1) {
      const sep = document.createElement("span");
      sep.className = "crumb-sep";
      sep.textContent = "/";
      elTopbar.appendChild(sep);
    }
  });

  const spacer = document.createElement("div");
  spacer.className = "topbar-spacer";

  const exportBtn = document.createElement("button");
  exportBtn.className = "tb-btn";
  exportBtn.innerHTML = svgIcon("download", 14) + " Exportar";
  exportBtn.title = "Descargar como Markdown";
  exportBtn.onclick = exportMarkdown;

  const presentBtn = document.createElement("button");
  presentBtn.className = "tb-btn primary";
  presentBtn.innerHTML = svgIcon("play", 13) + " Presentar";
  presentBtn.onclick = startPresentation;

  elTopbar.append(spacer, exportBtn, presentBtn);
}

/* ---------------- Vista principal ---------------- */

function renderView() {
  if (view.kind === "agenda") renderAgenda();
  else if (view.kind === "month") renderMonth();
  else if (view.kind === "tasks") renderTasks();
  else if (view.kind === "subject") renderSubject();
  else if (view.kind === "today") renderToday();
  else if (view.kind === "group") renderGroup();
  else if (view.kind === "rubrics") renderRubrics();
  else if (view.kind === "rubric") renderRubric();
  else renderEditor();
}

/* ---------------- Vista «Hoy» ---------------- */

function renderToday() {
  elContent.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "today-view";
  const now = new Date();
  const dIso = isoDate(now);
  const dateTxt = now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  const head = document.createElement("div");
  head.className = "tasks-head";
  head.innerHTML = `<h1>Hoy</h1><span class="tasks-summary">${dateTxt.charAt(0).toUpperCase() + dateTxt.slice(1)}</span>`;
  wrap.appendChild(head);

  /* clases de hoy */
  const sec = document.createElement("div");
  sec.className = "subject-section";
  sec.innerHTML = "<h2>Clases de hoy</h2>";
  const evs = eventsOnDay(dIso).sort((a, b) => toMin(a.start) - toMin(b.start));
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (!evs.length) {
    sec.insertAdjacentHTML("beforeend", '<div class="subj-muted">No tienes clases hoy.</div>');
  }
  let nextMarked = false;
  evs.forEach(ev => {
    const current = nowMin >= toMin(ev.start) && nowMin < toMin(ev.end);
    let badge = "";
    if (current) badge = '<span class="today-badge now">Ahora</span>';
    else if (!nextMarked && toMin(ev.start) > nowMin) { badge = '<span class="today-badge">Siguiente</span>'; nextMarked = true; }
    const subj = ev.subjectId && getSubjectById(ev.subjectId);
    const row = document.createElement("div");
    row.className = "subj-row" + (current ? " today-now" : "");
    row.innerHTML = `<span class="dot ev-${evColorKey(ev)}"></span>
      <span class="subj-time">${ev.start}–${ev.end}</span>
      <span class="today-ev-title">${(ev.title || "(sin título)").replace(/</g, "&lt;")}${subj ? ` <span class="today-subj">· ${subj.name.replace(/</g, "&lt;")}</span>` : ""}</span>
      ${badge}`;
    if (ev.pageId && getPage(ev.pageId)) {
      const open = document.createElement("button");
      open.className = "tpl-chip";
      open.textContent = "Abrir apuntes";
      open.onclick = e => { e.stopPropagation(); navigateToPage(ev.pageId); };
      row.appendChild(open);
    }
    row.onclick = () => openEventModal(ev);
    sec.appendChild(row);
  });
  wrap.appendChild(sec);

  /* grupos: acceso rápido */
  if (state.groups.length) {
    const secG = document.createElement("div");
    secG.className = "subject-section";
    secG.innerHTML = "<h2>Grupos</h2>";
    state.groups.forEach(g => {
      const row = document.createElement("div");
      row.className = "subj-row";
      row.innerHTML = `<span class="mono-ic">${svgIcon("users", 15)}</span><span>${g.name.replace(/</g, "&lt;")}</span><span class="today-subj">· ${(g.students || []).length} alumnos</span>`;
      const rand = document.createElement("button");
      rand.className = "tpl-chip";
      rand.innerHTML = svgIcon("shuffle", 12) + " Al azar";
      rand.onclick = e => { e.stopPropagation(); openRandomPicker(g); };
      row.appendChild(rand);
      row.onclick = () => { view = { kind: "group", groupId: g.id, date: dIso }; renderAll(); };
      secG.appendChild(row);
    });
    wrap.appendChild(secG);
  }

  /* tareas pendientes */
  const secT = document.createElement("div");
  secT.className = "subject-section";
  const todos = state.pages.flatMap(p => p.blocks.filter(b => b.type === "todo" && !b.checked).map(b => ({ p, b })));
  const h2 = document.createElement("h2");
  h2.textContent = "Tareas pendientes";
  if (todos.length > 8) {
    const more = document.createElement("button");
    more.className = "tpl-chip";
    more.textContent = `Ver todas (${todos.length}) →`;
    more.onclick = () => { view = { kind: "tasks" }; renderAll(); };
    h2.appendChild(more);
  }
  secT.appendChild(h2);
  if (!todos.length) {
    secT.insertAdjacentHTML("beforeend", '<div class="subj-muted">Nada pendiente.</div>');
  }
  todos.slice(0, 8).forEach(({ p, b }) => {
    const row = document.createElement("div");
    row.className = "task-row";
    const chk = document.createElement("div");
    chk.className = "bk-check";
    chk.onclick = () => { b.checked = true; save(); renderToday(); };
    const txt = document.createElement("span");
    txt.className = "task-text";
    txt.innerHTML = b.html;
    const src = document.createElement("span");
    src.className = "task-src";
    src.textContent = p.title || "Sin título";
    src.onclick = () => navigateToPage(p.id);
    row.append(chk, txt, src);
    secT.appendChild(row);
  });
  wrap.appendChild(secT);

  elContent.appendChild(wrap);
}

/* ---------------- Asignaturas ---------------- */

const DAY_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function openSubjectModal(subj, onSave) {
  const isNew = !subj;
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <h3>${isNew ? "Nueva asignatura" : "Editar asignatura"}</h3>
    <label>Nombre</label>
    <input type="text" id="sj-name" placeholder="Historia, Matemáticas, Lengua…" value="${isNew ? "" : subj.name.replace(/"/g, "&quot;")}">
    <label>Color</label>
    <div class="color-swatches" id="sj-colors"></div>
    <div class="modal-btns">
      ${isNew ? "" : '<button class="btn danger" id="sj-del">Eliminar</button>'}
      <button class="btn" id="sj-cancel">Cancelar</button>
      <button class="btn primary" id="sj-save">Guardar</button>
    </div>`;
  openModal(m);

  let color = isNew ? "blue" : subj.color;
  const swatches = m.querySelector("#sj-colors");
  let selSwatch = null;
  EV_COLORS.forEach(c => {
    const s = document.createElement("div");
    s.className = `swatch ev-${c}` + (c === color ? " sel" : "");
    if (c === color) selSwatch = s;
    s.onclick = () => {
      color = c;
      if (selSwatch) selSwatch.classList.remove("sel");
      s.classList.add("sel");
      selSwatch = s;
    };
    swatches.appendChild(s);
  });

  m.querySelector("#sj-cancel").onclick = closeModal;
  if (!isNew) m.querySelector("#sj-del").onclick = () => { closeModal(); deleteSubject(subj.id); };
  m.querySelector("#sj-save").onclick = () => {
    const name = m.querySelector("#sj-name").value.trim();
    if (!name) { m.querySelector("#sj-name").focus(); return; }
    let saved;
    if (isNew) {
      saved = { id: uid(), name, color };
      state.subjects.push(saved);
    } else {
      Object.assign(subj, { name, color });
      saved = subj;
    }
    closeModal();
    save();
    renderAll();
    if (onSave) onSave(saved);
  };
  m.querySelector("#sj-name").addEventListener("keydown", e => {
    if (e.key === "Enter") m.querySelector("#sj-save").click();
  });
}

function deleteSubject(id) {
  const s = getSubjectById(id);
  if (!s) return;
  if (!confirm(`¿Eliminar la asignatura «${s.name}»? Sus páginas y eventos no se borran, solo quedan sin asignatura.`)) return;
  state.subjects = state.subjects.filter(x => x.id !== id);
  state.pages.forEach(p => { if (p.subjectId === id) p.subjectId = null; });
  state.events.forEach(ev => { if (ev.subjectId === id) ev.subjectId = null; });
  if (view.kind === "subject" && view.subjectId === id) {
    view = state.pages.length ? { kind: "page", pageId: state.pages[0].id } : { kind: "agenda" };
  }
  save();
  renderAll();
}

function renderSubject() {
  const s = getSubjectById(view.subjectId);
  if (!s) {
    view = state.pages.length ? { kind: "page", pageId: state.pages[0].id } : { kind: "agenda" };
    renderAll();
    return;
  }
  elContent.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "subject-view";

  const pages = state.pages.filter(p => p.subjectId === s.id);
  const weekly = state.events.filter(ev => ev.subjectId === s.id && ev.repeat === "weekly");
  const todos = pages.flatMap(p => p.blocks.filter(b => b.type === "todo" && !b.checked).map(b => ({ page: p, b })));
  const hours = weekly.reduce((n, ev) => n + (toMin(ev.end) - toMin(ev.start)), 0) / 60;

  const head = document.createElement("div");
  head.className = "subject-head";
  const dot = document.createElement("span");
  dot.className = `dot big ev-${s.color}`;
  const h1 = document.createElement("h1");
  h1.textContent = s.name;
  const edit = document.createElement("button");
  edit.className = "tb-btn";
  edit.innerHTML = svgIcon("edit", 13) + " Editar";
  edit.onclick = () => openSubjectModal(s);
  head.append(dot, h1, edit);

  const stats = document.createElement("div");
  stats.className = "subject-stats";
  const hoursTxt = hours ? ` · ${(Math.round(hours * 10) / 10).toString().replace(".", ",")} h de clase a la semana` : "";
  stats.textContent = `${pages.length} página${pages.length === 1 ? "" : "s"} · ${todos.length} tarea${todos.length === 1 ? "" : "s"} pendiente${todos.length === 1 ? "" : "s"}${hoursTxt}`;
  wrap.append(head, stats);

  /* submenú de la asignatura */
  const tabs = document.createElement("div");
  tabs.className = "tab-bar";
  [["overview", "Resumen"], ["timeline", "Temporalización"]].forEach(([id, label]) => {
    const t = document.createElement("button");
    t.className = "tab" + ((view.tab || "overview") === id ? " active" : "");
    t.textContent = label;
    t.onclick = () => { view.tab = id; renderSubject(); };
    tabs.appendChild(t);
  });
  wrap.appendChild(tabs);

  if (view.tab === "timeline") {
    renderSubjectTimeline(wrap, s);
    elContent.appendChild(wrap);
    return;
  }

  /* horario semanal */
  const secH = document.createElement("div");
  secH.className = "subject-section";
  secH.innerHTML = "<h2>Horario semanal</h2>";
  if (!weekly.length) {
    secH.insertAdjacentHTML("beforeend", '<div class="subj-muted">Sin clases recurrentes. Créalas en la agenda marcando «Se repite cada semana».</div>');
  } else {
    [...weekly]
      .sort((a, b) => {
        const wa = (new Date(a.date + "T00:00").getDay() + 6) % 7;
        const wb = (new Date(b.date + "T00:00").getDay() + 6) % 7;
        return wa - wb || toMin(a.start) - toMin(b.start);
      })
      .forEach(ev => {
        const wd = (new Date(ev.date + "T00:00").getDay() + 6) % 7;
        const row = document.createElement("div");
        row.className = "subj-row";
        row.innerHTML = `<span class="dot ev-${evColorKey(ev)}"></span><span class="subj-time">${DAY_FULL[wd]} · ${ev.start}–${ev.end}</span><span>${(ev.title || "(sin título)").replace(/</g, "&lt;")}</span>`;
        row.onclick = () => openEventModal(ev);
        secH.appendChild(row);
      });
  }
  wrap.appendChild(secH);

  /* páginas */
  const secP = document.createElement("div");
  secP.className = "subject-section";
  const h2p = document.createElement("h2");
  h2p.textContent = "Páginas";
  const newBtn = document.createElement("button");
  newBtn.className = "tpl-chip";
  newBtn.textContent = "+ Nueva página";
  newBtn.onclick = () => {
    const np = { id: uid(), title: "", icon: "📄", parentId: null, open: true, subjectId: s.id, blocks: [mkBlock("text", "")] };
    state.pages.push(np);
    save();
    navigateToPage(np.id, true);
  };
  h2p.appendChild(newBtn);
  secP.appendChild(h2p);
  if (!pages.length) {
    secP.insertAdjacentHTML("beforeend", '<div class="subj-muted">Aún no hay páginas de esta asignatura.</div>');
  } else {
    pages.forEach(p => {
      const row = document.createElement("div");
      row.className = "subj-row";
      row.innerHTML = `<span>${p.icon || "📄"}</span><span>${(p.title || "Sin título").replace(/</g, "&lt;")}</span>`;
      row.onclick = () => navigateToPage(p.id);
      secP.appendChild(row);
    });
  }
  wrap.appendChild(secP);

  /* tareas pendientes */
  const secT = document.createElement("div");
  secT.className = "subject-section";
  secT.innerHTML = "<h2>Tareas pendientes</h2>";
  if (!todos.length) {
    secT.insertAdjacentHTML("beforeend", '<div class="subj-muted">Nada pendiente.</div>');
  } else {
    todos.forEach(({ page, b }) => {
      const row = document.createElement("div");
      row.className = "task-row";
      const chk = document.createElement("div");
      chk.className = "bk-check";
      chk.onclick = () => { b.checked = true; save(); renderSubject(); };
      const txt = document.createElement("span");
      txt.className = "task-text";
      txt.innerHTML = b.html;
      const src = document.createElement("span");
      src.className = "task-src";
      src.textContent = page.title || "Sin título";
      src.title = "Abrir página";
      src.onclick = () => navigateToPage(page.id);
      row.append(chk, txt, src);
      secT.appendChild(row);
    });
  }
  wrap.appendChild(secT);

  elContent.appendChild(wrap);
}

/* ---------------- Vista de tareas (todas las páginas) ---------------- */

let taskFilter = "all"; /* "all" | "none" | id de asignatura */

function renderTasks() {
  elContent.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "tasks-view";

  if (taskFilter !== "all" && taskFilter !== "none" && !getSubjectById(taskFilter)) taskFilter = "all";

  const groups = state.pages
    .map(p => ({ page: p, todos: p.blocks.filter(b => b.type === "todo") }))
    .filter(g => g.todos.length)
    .filter(g =>
      taskFilter === "all" ||
      (taskFilter === "none" ? !g.page.subjectId : g.page.subjectId === taskFilter)
    );
  const pending = groups.reduce((n, g) => n + g.todos.filter(t => !t.checked).length, 0);

  const head = document.createElement("div");
  head.className = "tasks-head";
  head.innerHTML = `<h1>Tareas</h1><span class="tasks-summary">${groups.length === 0 ? "" : pending === 0 ? "Todo hecho" : pending + " pendiente" + (pending === 1 ? "" : "s")}</span>`;
  wrap.appendChild(head);

  if (state.subjects.length) {
    const filters = document.createElement("div");
    filters.className = "task-filters";
    const mkChip = (label, value, dotColor) => {
      const c = document.createElement("button");
      c.className = "filter-chip" + (taskFilter === value ? " sel" : "");
      c.innerHTML = (dotColor ? `<span class="dot ev-${dotColor}"></span>` : "") + label.replace(/</g, "&lt;");
      c.onclick = () => { taskFilter = value; renderTasks(); };
      filters.appendChild(c);
    };
    mkChip("Todas", "all", null);
    state.subjects.forEach(s => mkChip(s.name, s.id, s.color));
    mkChip("Sin asignatura", "none", null);
    wrap.appendChild(filters);
  }

  if (!groups.length) {
    const e = document.createElement("p");
    e.className = "tasks-empty";
    e.innerHTML = taskFilter === "all"
      ? "Aún no hay tareas. Crea una en cualquier página escribiendo <code>[] </code> al inicio de una línea o con el comando <code>/tareas</code>."
      : "No hay tareas con este filtro.";
    wrap.appendChild(e);
  }

  groups.forEach(g => {
    const sec = document.createElement("div");
    sec.className = "tasks-group";
    const h = document.createElement("div");
    h.className = "tasks-group-title";
    h.textContent = `${g.page.icon || "📄"} ${g.page.title || "Sin título"}`;
    h.title = "Abrir página";
    h.onclick = () => navigateToPage(g.page.id);
    sec.appendChild(h);

    [...g.todos].sort((a, b) => a.checked - b.checked).forEach(t => {
      const row = document.createElement("div");
      row.className = "task-row" + (t.checked ? " done" : "");
      const chk = document.createElement("div");
      chk.className = "bk-check";
      chk.textContent = t.checked ? "✓" : "";
      chk.onclick = () => { t.checked = !t.checked; save(); renderTasks(); };
      const txt = document.createElement("span");
      txt.className = "task-text";
      txt.innerHTML = t.html;
      row.append(chk, txt);
      sec.appendChild(row);
    });
    wrap.appendChild(sec);
  });
  elContent.appendChild(wrap);
}

/* ---------------- Temporalización de la asignatura ---------------- */

const EVAL_NAMES = ["1.ª evaluación", "2.ª evaluación", "3.ª evaluación", "Sin evaluación"];

function unitStatus(u) {
  if (!u.start || !u.end) return "pending";
  const today = isoDate(new Date());
  if (today < u.start) return "pending";
  if (today <= u.end) return "current";
  return "done";
}

function fmtShortDate(d) {
  return new Date(d + "T00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function renderSubjectTimeline(wrap, s) {
  s.units = s.units || [];

  const sec = document.createElement("div");
  sec.className = "subject-section";
  const h2 = document.createElement("h2");
  h2.textContent = "Unidades didácticas";
  const add = document.createElement("button");
  add.className = "tpl-chip";
  add.textContent = "+ Unidad";
  add.onclick = () => openUnitModal(s, null);
  h2.appendChild(add);
  sec.appendChild(h2);

  const dated = s.units.filter(u => u.start && u.end);
  if (dated.length) {
    const min = dated.reduce((a, u) => u.start < a ? u.start : a, dated[0].start);
    const max = dated.reduce((a, u) => u.end > a ? u.end : a, dated[0].end);
    const t0 = new Date(min + "T00:00").getTime();
    const t1 = new Date(max + "T00:00").getTime() + 864e5;
    const pct = Math.min(100, Math.max(0, Math.round((Date.now() - t0) / (t1 - t0) * 100)));
    const totalWeeks = Math.max(1, Math.round((t1 - t0) / (7 * 864e5)));
    const curWeek = Math.min(totalWeeks, Math.max(1, Math.ceil((Date.now() - t0) / (7 * 864e5))));
    const prog = document.createElement("div");
    prog.className = "course-progress";
    prog.innerHTML = `
      <div class="cp-bar"><div class="cp-fill" style="width:${pct}%"></div></div>
      <div class="cp-label">${fmtShortDate(min)} — ${fmtShortDate(max)} · semana ${curWeek} de ${totalWeeks} · ${pct}% del curso</div>`;
    sec.appendChild(prog);
  }

  if (!s.units.length) {
    sec.insertAdjacentHTML("beforeend",
      '<div class="subj-muted">Planifica el curso por unidades: nombre, evaluación y fechas. La unidad en curso se resalta automáticamente.</div>');
  }

  const byEval = [[], [], [], []];
  s.units.forEach(u => byEval[u.ev >= 0 && u.ev <= 2 ? u.ev : 3].push(u));
  byEval.forEach(list => list.sort((a, b) => (a.start || "9999") < (b.start || "9999") ? -1 : 1));

  byEval.forEach((list, ei) => {
    if (!list.length) return;
    const evh = document.createElement("div");
    evh.className = "eval-head";
    evh.textContent = EVAL_NAMES[ei];
    sec.appendChild(evh);
    list.forEach(u => {
      const st = unitStatus(u);
      const row = document.createElement("div");
      row.className = "unit-row" + (st === "current" ? " unit-current" : "");
      const dotCls = st === "current" ? "unit-dot on" : st === "done" ? "unit-dot done" : "unit-dot";
      const weeks = u.start && u.end
        ? Math.max(1, Math.round((new Date(u.end + "T00:00") - new Date(u.start + "T00:00")) / (7 * 864e5) + 0.01))
        : null;
      const dates = u.start && u.end
        ? `${fmtShortDate(u.start)} – ${fmtShortDate(u.end)} · ${weeks} sem.`
        : "Sin fechas";
      const stTxt = st === "current" ? "En curso" : st === "done" ? "Terminada" : "Pendiente";
      row.innerHTML = `<span class="${dotCls}"></span>
        <span class="unit-name">${(u.name || "Sin título").replace(/</g, "&lt;")}</span>
        <span class="unit-dates">${dates}</span>
        <span class="unit-status st-${st}">${stTxt}</span>`;
      if (u.pageId && getPage(u.pageId)) {
        const open = document.createElement("button");
        open.className = "tpl-chip";
        open.textContent = "Apuntes";
        open.onclick = e => { e.stopPropagation(); navigateToPage(u.pageId); };
        row.appendChild(open);
      }
      row.onclick = () => openUnitModal(s, u);
      sec.appendChild(row);
    });
  });

  wrap.appendChild(sec);
}

function openUnitModal(s, u) {
  const isNew = !u;
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <h3>${isNew ? "Nueva unidad" : "Editar unidad"}</h3>
    <label>Nombre</label>
    <input type="text" id="un-name" placeholder="UD 1 · Introducción a Python" value="${isNew ? "" : (u.name || "").replace(/"/g, "&quot;")}">
    <label>Evaluación</label>
    <select id="un-ev">
      ${EVAL_NAMES.map((n, i) => `<option value="${i === 3 ? "" : i}" ${!isNew && ((u.ev === i) || (i === 3 && (u.ev == null || u.ev < 0))) ? "selected" : ""}>${n}</option>`).join("")}
    </select>
    <div class="modal-row">
      <div><label>Inicio</label><input type="date" id="un-start" value="${isNew ? "" : u.start || ""}"></div>
      <div><label>Fin</label><input type="date" id="un-end" value="${isNew ? "" : u.end || ""}"></div>
    </div>
    <label>Página de apuntes (opcional)</label>
    <select id="un-page"><option value="">— Ninguna —</option></select>
    <div class="modal-btns">
      ${isNew ? "" : '<button class="btn danger" id="un-del">Eliminar</button>'}
      <button class="btn" id="un-cancel">Cancelar</button>
      <button class="btn primary" id="un-save">Guardar</button>
    </div>`;
  openModal(m);

  const pageSel = m.querySelector("#un-page");
  state.pages.forEach(p => {
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = `${p.icon || ""} ${p.title || "Sin título"}`.trim();
    if (!isNew && u.pageId === p.id) o.selected = true;
    pageSel.appendChild(o);
  });

  m.querySelector("#un-cancel").onclick = closeModal;
  if (!isNew) {
    m.querySelector("#un-del").onclick = () => {
      if (!confirm(`¿Eliminar la unidad «${u.name}»?`)) return;
      s.units = s.units.filter(x => x.id !== u.id);
      closeModal();
      save();
      renderSubject();
    };
  }
  m.querySelector("#un-save").onclick = () => {
    const name = m.querySelector("#un-name").value.trim();
    if (!name) { m.querySelector("#un-name").focus(); return; }
    const evRaw = m.querySelector("#un-ev").value;
    let start = m.querySelector("#un-start").value || null;
    let end = m.querySelector("#un-end").value || null;
    if (start && end && end < start) end = start;
    const data = { name, ev: evRaw === "" ? null : +evRaw, start, end, pageId: pageSel.value || null };
    if (isNew) {
      s.units = s.units || [];
      s.units.push({ id: uid(), ...data });
    } else {
      Object.assign(u, data);
    }
    closeModal();
    save();
    renderSubject();
  };
  m.querySelector("#un-name").addEventListener("keydown", e => {
    if (e.key === "Enter") m.querySelector("#un-save").click();
  });
}

/* ---------------- Grupos de alumnos ---------------- */

const pickedMemo = {}; /* groupId → Set de alumnos ya elegidos al azar (solo en memoria) */

function openGroupModal(g, onSave) {
  const isNew = !g;
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <h3>${isNew ? "Nuevo grupo" : "Editar grupo"}</h3>
    <label>Nombre del grupo</label>
    <input type="text" id="gr-name" placeholder="1.º Bach B, 4.º ESO A…" value="${isNew ? "" : g.name.replace(/"/g, "&quot;")}">
    <label>Asignatura (opcional)</label>
    <select id="gr-subject"><option value="">— Ninguna —</option></select>
    <div class="modal-btns">
      <button class="btn" id="gr-cancel">Cancelar</button>
      <button class="btn primary" id="gr-save">Guardar</button>
    </div>`;
  openModal(m);

  const sel = m.querySelector("#gr-subject");
  state.subjects.forEach(s => {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = s.name;
    if (!isNew && g.subjectId === s.id) o.selected = true;
    sel.appendChild(o);
  });

  m.querySelector("#gr-cancel").onclick = closeModal;
  m.querySelector("#gr-save").onclick = () => {
    const name = m.querySelector("#gr-name").value.trim();
    if (!name) { m.querySelector("#gr-name").focus(); return; }
    const subjectId = sel.value || null;
    let saved;
    if (isNew) {
      saved = { id: uid(), name, subjectId, students: [], attendance: {}, notes: {} };
      state.groups.push(saved);
      view = { kind: "group", groupId: saved.id, date: isoDate(new Date()) };
    } else {
      Object.assign(g, { name, subjectId });
      saved = g;
    }
    closeModal();
    save();
    renderAll();
    if (onSave) onSave(saved);
  };
  m.querySelector("#gr-name").addEventListener("keydown", e => {
    if (e.key === "Enter") m.querySelector("#gr-save").click();
  });
}

function deleteGroup(id) {
  const g = state.groups.find(x => x.id === id);
  if (!g) return;
  if (!confirm(`¿Eliminar el grupo «${g.name}» con su lista de alumnos y asistencia?`)) return;
  state.groups = state.groups.filter(x => x.id !== id);
  if (view.kind === "group" && view.groupId === id) view = { kind: "today" };
  save();
  renderAll();
}

/* ----- calificaciones ----- */

function gradeAvg(g, sid) {
  let wsum = 0, acc = 0;
  (g.assessments || []).forEach(a => {
    const v = g.grades && g.grades[sid] ? g.grades[sid][a.id] : undefined;
    if (typeof v === "number") {
      acc += (v / (a.max || 10)) * 10 * (a.weight || 1);
      wsum += (a.weight || 1);
    }
  });
  return wsum ? acc / wsum : null;
}

const fmtGrade = v => v == null ? "—" : (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");

function refreshGradeStats(g) {
  /* calcular medias de alumno una sola vez */
  const avgBySid = new Map(g.students.map(s => [s.id, gradeAvg(g, s.id)]));

  avgBySid.forEach((v, sid) => {
    const el = document.getElementById(`gavg-${sid}`);
    if (!el) return;
    el.textContent = fmtGrade(v);
    el.className = "gavg" + (v == null ? "" : v < 5 ? " gr-low" : v < 6 ? " gr-mid" : " gr-ok");
  });

  (g.assessments || []).forEach(a => {
    const el = document.getElementById(`cavg-${a.id}`);
    if (!el) return;
    let sum = 0, cnt = 0;
    g.students.forEach(s => {
      const v = g.grades && g.grades[s.id] ? g.grades[s.id][a.id] : undefined;
      if (typeof v === "number") { sum += v / (a.max || 10) * 10; cnt++; }
    });
    el.textContent = cnt ? fmtGrade(sum / cnt) : "—";
  });

  const tot = document.getElementById("cavg-total");
  if (tot) {
    let sum = 0, cnt = 0;
    avgBySid.forEach(v => { if (v != null) { sum += v; cnt++; } });
    tot.textContent = cnt ? fmtGrade(sum / cnt) : "—";
  }
}

function openAssessmentModal(g, a) {
  const isNew = !a;
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <h3>${isNew ? "Nueva actividad" : "Editar actividad"}</h3>
    <label>Nombre</label>
    <input type="text" id="as-name" placeholder="Examen T1, Práctica 2, Proyecto…" value="${isNew ? "" : a.name.replace(/"/g, "&quot;")}">
    <div class="modal-row">
      <div><label>Peso en la media</label><input type="text" id="as-weight" inputmode="decimal" value="${isNew ? "1" : String(a.weight || 1).replace(".", ",")}"></div>
      <div><label>Nota máxima</label><input type="text" id="as-max" inputmode="decimal" value="${isNew ? "10" : String(a.max || 10).replace(".", ",")}"></div>
    </div>
    <div class="modal-btns">
      ${isNew ? "" : '<button class="btn danger" id="as-del">Eliminar</button>'}
      <button class="btn" id="as-cancel">Cancelar</button>
      <button class="btn primary" id="as-save">Guardar</button>
    </div>`;
  openModal(m);

  m.querySelector("#as-cancel").onclick = closeModal;
  if (!isNew) {
    m.querySelector("#as-del").onclick = () => {
      if (!confirm(`¿Eliminar «${a.name}» y todas sus notas?`)) return;
      g.assessments = g.assessments.filter(x => x.id !== a.id);
      Object.values(g.grades || {}).forEach(rec => delete rec[a.id]);
      closeModal();
      save();
      renderGroup();
    };
  }
  m.querySelector("#as-save").onclick = () => {
    const name = m.querySelector("#as-name").value.trim();
    if (!name) { m.querySelector("#as-name").focus(); return; }
    const weight = Math.max(parseFloat(m.querySelector("#as-weight").value.replace(",", ".")) || 1, 0.1);
    const max = Math.max(parseFloat(m.querySelector("#as-max").value.replace(",", ".")) || 10, 1);
    if (isNew) {
      g.assessments = g.assessments || [];
      g.assessments.push({ id: uid(), name, weight, max });
    } else {
      Object.assign(a, { name, weight, max });
    }
    closeModal();
    save();
    renderGroup();
  };
  m.querySelector("#as-name").addEventListener("keydown", e => {
    if (e.key === "Enter") m.querySelector("#as-save").click();
  });
}

function exportGradesCSV(g) {
  const sep = ";";
  const cell = s => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [["Alumno", ...g.assessments.map(a => `${a.name} (/${a.max || 10})`), "Media"].map(cell).join(sep)];
  g.students.forEach(s => {
    const row = [s.name];
    g.assessments.forEach(a => {
      const v = g.grades && g.grades[s.id] ? g.grades[s.id][a.id] : undefined;
      row.push(typeof v === "number" ? String(v).replace(".", ",") : "");
    });
    const avg = gradeAvg(g, s.id);
    row.push(avg == null ? "" : fmtGrade(avg));
    lines.push(row.map(cell).join(sep));
  });
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${g.name.replace(/[\\/:*?"<>|]/g, "-")}-calificaciones.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function attTally(g, sid) {
  let f = 0, r = 0;
  Object.values(g.attendance || {}).forEach(rec => {
    if (rec[sid] === "A") f++;
    if (rec[sid] === "R") r++;
  });
  return { f, r };
}

function renderGroup() {
  const g = state.groups.find(x => x.id === view.groupId);
  if (!g) { view = { kind: "today" }; renderAll(); return; }
  g.students = g.students || [];
  g.attendance = g.attendance || {};
  g.notes = g.notes || {};
  const date = view.date || isoDate(new Date());
  const dayRec = g.attendance[date] || {};

  elContent.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "subject-view";

  const head = document.createElement("div");
  head.className = "subject-head";
  const h1 = document.createElement("h1");
  h1.textContent = g.name;
  const edit = document.createElement("button");
  edit.className = "tb-btn";
  edit.innerHTML = svgIcon("edit", 13) + " Editar";
  edit.onclick = () => openGroupModal(g);
  const rand = document.createElement("button");
  rand.className = "tb-btn primary";
  rand.innerHTML = svgIcon("shuffle", 13) + " Alumno al azar";
  rand.onclick = () => openRandomPicker(g);
  head.append(h1, edit, rand);
  wrap.appendChild(head);

  const subj = g.subjectId && getSubjectById(g.subjectId);
  const absToday = g.students.filter(s => dayRec[s.id] === "A").length;
  const stats = document.createElement("div");
  stats.className = "subject-stats";
  stats.textContent = `${g.students.length} alumno${g.students.length === 1 ? "" : "s"}` +
    (subj ? ` · ${subj.name}` : "") +
    (absToday ? ` · ${absToday} ausente${absToday === 1 ? "" : "s"} en la fecha elegida` : "");
  wrap.appendChild(stats);

  /* pasar lista */
  const secL = document.createElement("div");
  secL.className = "subject-section";
  const h2l = document.createElement("h2");
  h2l.textContent = "Pasar lista";
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.className = "ctl-input";
  dateInput.value = date;
  dateInput.onchange = () => { view.date = dateInput.value || isoDate(new Date()); renderGroup(); };
  h2l.appendChild(dateInput);
  secL.appendChild(h2l);

  const note = document.createElement("input");
  note.type = "text";
  note.className = "ctl-input group-note";
  note.placeholder = "Incidencias del día (opcional)…";
  note.value = g.notes[date] || "";
  note.addEventListener("change", () => {
    if (note.value.trim()) g.notes[date] = note.value.trim();
    else delete g.notes[date];
    save();
  });
  secL.appendChild(note);

  if (!g.students.length) {
    secL.insertAdjacentHTML("beforeend", '<div class="subj-muted">Añade alumnos abajo para poder pasar lista.</div>');
  }
  g.students.forEach(s => {
    const row = document.createElement("div");
    row.className = "std-row";
    const name = document.createElement("span");
    name.className = "std-name";
    name.textContent = s.name;
    const tally = attTally(g, s.id);
    const tal = document.createElement("span");
    tal.className = "att-tally";
    tal.textContent = (tally.f || tally.r) ? `${tally.f} F · ${tally.r} R` : "";
    tal.title = "Faltas y retrasos acumulados";
    const seg = document.createElement("span");
    seg.className = "att-seg";
    const attVals = [["P", "Presente"], ["R", "Retraso"], ["A", "Ausente"]];
    const cur = dayRec[s.id] || "P";
    const attBtns = attVals.map(([v, title]) => {
      const btn = document.createElement("button");
      btn.className = "att-btn" + (cur === v ? " sel-" + v : "");
      btn.textContent = v;
      btn.title = title;
      btn.onclick = () => {
        g.attendance[date] = g.attendance[date] || {};
        if (v === "P") delete g.attendance[date][s.id];
        else g.attendance[date][s.id] = v;
        if (!Object.keys(g.attendance[date]).length) delete g.attendance[date];
        save();
        /* actualización quirúrgica — sin re-render completo */
        const nowVal = (g.attendance[date] || {})[s.id] || "P";
        attBtns.forEach((b, i) => {
          b.className = "att-btn" + (nowVal === attVals[i][0] ? " sel-" + attVals[i][0] : "");
        });
        const t = attTally(g, s.id);
        tal.textContent = (t.f || t.r) ? `${t.f} F · ${t.r} R` : "";
        const absNow = g.students.filter(x => (g.attendance[date] || {})[x.id] === "A").length;
        stats.textContent = `${g.students.length} alumno${g.students.length === 1 ? "" : "s"}` +
          (subj ? ` · ${subj.name}` : "") +
          (absNow ? ` · ${absNow} ausente${absNow === 1 ? "" : "s"} en la fecha elegida` : "");
      };
      seg.appendChild(btn);
      return btn;
    });
    row.append(name, tal, seg);
    secL.appendChild(row);
  });
  wrap.appendChild(secL);

  /* calificaciones */
  g.assessments = g.assessments || [];
  g.grades = g.grades || {};
  const secC = document.createElement("div");
  secC.className = "subject-section";
  const h2c = document.createElement("h2");
  h2c.textContent = "Calificaciones";
  const addAct = document.createElement("button");
  addAct.className = "tpl-chip";
  addAct.textContent = "+ Actividad";
  addAct.onclick = () => openAssessmentModal(g, null);
  h2c.appendChild(addAct);
  if (g.assessments.length && g.students.length) {
    const csvBtn = document.createElement("button");
    csvBtn.className = "tpl-chip";
    csvBtn.textContent = "Exportar CSV";
    csvBtn.onclick = () => exportGradesCSV(g);
    h2c.appendChild(csvBtn);
  }
  secC.appendChild(h2c);

  if (!g.assessments.length) {
    secC.insertAdjacentHTML("beforeend", '<div class="subj-muted">Crea una actividad (examen, práctica, proyecto…) para empezar a calificar.</div>');
  } else if (!g.students.length) {
    secC.insertAdjacentHTML("beforeend", '<div class="subj-muted">Añade alumnos para poder poner notas.</div>');
  } else {
    const twrap = document.createElement("div");
    twrap.className = "grades-wrap";
    const tbl = document.createElement("table");
    tbl.className = "grades-table";

    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    const th0 = document.createElement("th");
    th0.textContent = "Alumno";
    hr.appendChild(th0);
    g.assessments.forEach(a => {
      const th = document.createElement("th");
      th.className = "gr-act";
      th.title = "Editar actividad";
      th.innerHTML = `${a.name.replace(/</g, "&lt;")}<span class="gr-sub">×${String(a.weight || 1).replace(".", ",")} · sobre ${String(a.max || 10).replace(".", ",")}</span>`;
      th.onclick = () => openAssessmentModal(g, a);
      hr.appendChild(th);
    });
    const thAvg = document.createElement("th");
    thAvg.textContent = "Media";
    hr.appendChild(thAvg);
    thead.appendChild(hr);
    tbl.appendChild(thead);

    const tbody = document.createElement("tbody");
    /* event delegation: un solo listener para toda la tabla */
    tbody.addEventListener("change", e => {
      const inp = e.target;
      if (!inp.classList.contains("grade-input")) return;
      const sid = inp.closest("tr").dataset.sid;
      const aid = inp.dataset.aid;
      const a   = g.assessments.find(x => x.id === aid);
      const raw = inp.value.trim().replace(",", ".");
      g.grades[sid] = g.grades[sid] || {};
      if (raw === "" || isNaN(parseFloat(raw))) {
        delete g.grades[sid][aid];
        inp.value = "";
      } else {
        let val = Math.max(0, Math.min(parseFloat(raw), a ? a.max || 10 : 10));
        val = Math.round(val * 100) / 100;
        g.grades[sid][aid] = val;
        inp.value = String(val).replace(".", ",");
      }
      if (!Object.keys(g.grades[sid]).length) delete g.grades[sid];
      saveSoon();
      refreshGradeStats(g);
    });

    const tbodyFrag = document.createDocumentFragment();
    g.students.forEach(s => {
      const tr = document.createElement("tr");
      tr.dataset.sid = s.id;
      const tdName = document.createElement("td");
      tdName.textContent = s.name;
      tr.appendChild(tdName);
      g.assessments.forEach(a => {
        const td = document.createElement("td");
        const inp = document.createElement("input");
        inp.className = "grade-input";
        inp.inputMode = "decimal";
        inp.dataset.aid = a.id;
        const v = g.grades[s.id] ? g.grades[s.id][a.id] : undefined;
        inp.value = typeof v === "number" ? String(v).replace(".", ",") : "";
        td.appendChild(inp);
        tr.appendChild(td);
      });
      const tdAvg = document.createElement("td");
      tdAvg.id = `gavg-${s.id}`;
      tr.appendChild(tdAvg);
      tbodyFrag.appendChild(tr);
    });
    tbody.appendChild(tbodyFrag);
    tbl.appendChild(tbody);

    const tfoot = document.createElement("tfoot");
    const fr = document.createElement("tr");
    const f0 = document.createElement("td");
    f0.textContent = "Media del grupo";
    fr.appendChild(f0);
    g.assessments.forEach(a => {
      const td = document.createElement("td");
      td.id = `cavg-${a.id}`;
      fr.appendChild(td);
    });
    const fTot = document.createElement("td");
    fTot.id = "cavg-total";
    fr.appendChild(fTot);
    tfoot.appendChild(fr);
    tbl.appendChild(tfoot);

    twrap.appendChild(tbl);
    secC.appendChild(twrap);
    setTimeout(() => refreshGradeStats(g), 0);
  }
  wrap.appendChild(secC);

  /* estadísticas del grupo */
  if (g.assessments && g.assessments.length && g.students.length) {
    wrap.appendChild(buildGroupStats(g));
  }

  /* alumnos */
  const secA = document.createElement("div");
  secA.className = "subject-section";
  const h2a = document.createElement("h2");
  h2a.textContent = "Alumnos";
  const paste = document.createElement("button");
  paste.className = "tpl-chip";
  paste.textContent = "Pegar lista…";
  paste.onclick = () => openStudentListModal(g);
  h2a.appendChild(paste);
  const importCSVBtn = document.createElement("button");
  importCSVBtn.className = "tpl-chip";
  importCSVBtn.textContent = "Importar CSV…";
  importCSVBtn.onclick = () => openImportCSVModal(g);
  h2a.appendChild(importCSVBtn);
  secA.appendChild(h2a);

  const addBar = document.createElement("div");
  addBar.className = "add-student";
  const addInput = document.createElement("input");
  addInput.type = "text";
  addInput.className = "ctl-input";
  addInput.placeholder = "Nombre del alumno…";
  const addStudent = () => {
    const n = addInput.value.trim();
    if (!n) return;
    g.students.push({ id: uid(), name: n });
    addInput.value = "";
    save();
    renderGroup();
    /* mantener el foco para añadir varios seguidos */
    const inp = elContent.querySelector(".add-student input");
    if (inp) inp.focus();
  };
  addInput.addEventListener("keydown", e => { if (e.key === "Enter") addStudent(); });
  const addBtn = document.createElement("button");
  addBtn.className = "btn";
  addBtn.textContent = "Añadir";
  addBtn.onclick = addStudent;
  addBar.append(addInput, addBtn);
  secA.appendChild(addBar);

  g.students.forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "std-row";
    const name = document.createElement("span");
    name.className = "std-name std-name-link";
    name.textContent = s.name;
    name.title = "Ver perfil del alumno";
    name.onclick = () => openStudentProfile(g, s);
    const profBtn = document.createElement("button");
    profBtn.className = "tb-btn";
    profBtn.innerHTML = svgIcon("info", 13);
    profBtn.title = "Ver perfil";
    profBtn.onclick = () => openStudentProfile(g, s);
    const del = document.createElement("button");
    del.className = "std-del";
    del.innerHTML = svgIcon("trash", 13);
    del.title = "Quitar alumno";
    del.onclick = () => {
      if (!confirm(`¿Quitar a ${s.name} del grupo?`)) return;
      g.students.splice(i, 1);
      if (g.grades) delete g.grades[s.id];
      save();
      renderGroup();
    };
    row.append(name, profBtn, del);
    secA.appendChild(row);
  });
  wrap.appendChild(secA);

  elContent.appendChild(wrap);
}

/* ============================================================
   1. Importar alumnos desde CSV
   ============================================================ */
function openImportCSVModal(g) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <h3>Importar alumnos desde CSV</h3>
    <p class="modal-note">Selecciona un archivo CSV o pega el contenido directamente.<br>
    Cada fila es un alumno. Si hay dos columnas (nombre;apellidos o apellidos,nombre), se combinan.<br>
    Se ignoran filas ya existentes con el mismo nombre.</p>
    <label>Archivo CSV</label>
    <input type="file" id="csv-file" accept=".csv,.txt" style="margin-bottom:8px">
    <label>— o pega el CSV aquí —</label>
    <textarea id="csv-text" class="std-textarea" rows="8" placeholder="Ana;García&#10;Carlos;López&#10;…"></textarea>
    <div class="modal-btns">
      <button class="btn" id="csv-cancel">Cancelar</button>
      <button class="btn primary" id="csv-import">Importar</button>
    </div>`;
  openModal(m);

  const fileIn = m.querySelector("#csv-file");
  const textIn = m.querySelector("#csv-text");

  fileIn.onchange = () => {
    const f = fileIn.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = e => { textIn.value = e.target.result; };
    reader.readAsText(f, "UTF-8");
  };

  m.querySelector("#csv-cancel").onclick = closeModal;
  m.querySelector("#csv-import").onclick = () => {
    const raw = textIn.value.trim();
    if (!raw) return;
    const existing = new Set(g.students.map(s => norm(s.name)));
    const sep = raw.includes(";") ? ";" : ",";
    let added = 0;
    raw.split(/\r?\n/).forEach(line => {
      const parts = line.split(sep).map(p => p.trim()).filter(Boolean);
      if (!parts.length) return;
      const name = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0];
      if (!name || existing.has(norm(name))) return;
      g.students.push({ id: uid(), name });
      existing.add(norm(name));
      added++;
    });
    save(); closeModal();
    if (added) renderGroup();
    else alert("No se encontraron alumnos nuevos.");
  };
}

/* ============================================================
   2. Perfil de alumno
   ============================================================ */
function openStudentProfile(g, s) {
  g.attendance = g.attendance || {};
  g.grades = g.grades || {};
  g.assessments = g.assessments || [];

  /* asistencia: contar todos los registros del alumno */
  let pres = 0, ret = 0, aus = 0;
  Object.entries(g.attendance).forEach(([, rec]) => {
    const v = rec[s.id];
    if (v === "P") pres++;
    else if (v === "R") ret++;
    else if (v === "A") aus++;
  });
  const total = pres + ret + aus;
  const pct = total ? Math.round((pres / total) * 100) : null;

  /* últimas ausencias */
  const lastAbs = Object.entries(g.attendance)
    .filter(([, rec]) => rec[s.id] === "A")
    .map(([d]) => d)
    .sort()
    .slice(-5)
    .reverse();

  /* notas */
  const stGrades = g.grades[s.id] || {};
  const assessRows = g.assessments.map(a => {
    const v = stGrades[a.id];
    return { name: a.name, max: a.max || 10, weight: a.weight || 1, value: typeof v === "number" ? v : null };
  });
  const avg = gradeAvg(g, s.id);

  /* rúbricas aplicadas a este alumno en este grupo */
  const rubricRows = [];
  state.rubrics.forEach(r => {
    (r.applications || []).forEach(app => {
      if (app.groupId !== g.id) return;
      const sc = (app.scores || {})[s.id];
      if (!sc) return;
      let totalW = 0, wSum = 0;
      (r.ras || []).forEach(ra => {
        const insts = (ra.instruments || []);
        if (!insts.length) return;
        const instW = insts.reduce((x, i) => x + (Number(i.weight) || 0), 0);
        let raS = 0, raW = 0;
        insts.forEach(inst => {
          const v = sc[inst.id];
          if (v !== undefined && v !== null && v !== "") {
            const w = instW > 0 ? (Number(inst.weight) || 0) : 1;
            raS += Number(v) * w; raW += w;
          }
        });
        if (raW > 0) { wSum += (raS / raW) * (Number(ra.weight) || 0); totalW += (Number(ra.weight) || 0); }
      });
      const nota = totalW > 0 ? (wSum / totalW).toFixed(1) : "—";
      rubricRows.push({ rName: r.name, appName: app.name, date: app.date, nota });
    });
  });

  const m = document.createElement("div");
  m.className = "modal modal-wide";

  const gradeColor = v => v == null ? "" : v >= 8 ? "color:var(--green)" : v >= 5 ? "color:var(--orange)" : "color:var(--red)";

  const assRows = assessRows.map(a =>
    `<tr>
      <td style="text-align:left">${a.name.replace(/</g,"&lt;")}</td>
      <td>${a.value != null ? `<b style="${gradeColor(a.value)}">${String(a.value).replace(".",",")}</b>` : "<span style='color:var(--muted)'>—</span>"}</td>
      <td style="color:var(--muted);font-size:12px">/${a.max}</td>
    </tr>`
  ).join("");

  const rubRows = rubricRows.map(r =>
    `<tr>
      <td style="text-align:left">${r.rName.replace(/</g,"&lt;")} · ${r.appName.replace(/</g,"&lt;")}</td>
      <td style="color:var(--muted);font-size:12px">${r.date || ""}</td>
      <td><b style="${gradeColor(parseFloat(r.nota))}">${r.nota}</b></td>
    </tr>`
  ).join("");

  m.innerHTML = `
    <h3>${s.name}</h3>

    <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:16px">
      <div class="profile-stat">
        <div class="profile-stat-val${pct != null ? (pct >= 90 ? " gr-ok" : pct >= 70 ? " gr-mid" : " gr-low") : ""}">${pct != null ? pct + "%" : "—"}</div>
        <div class="profile-stat-lbl">Asistencia</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-val">${pres}</div>
        <div class="profile-stat-lbl">Presente</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-val" style="color:var(--orange)">${ret}</div>
        <div class="profile-stat-lbl">Retraso</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-val" style="color:var(--red)">${aus}</div>
        <div class="profile-stat-lbl">Ausente</div>
      </div>
      ${avg != null ? `<div class="profile-stat">
        <div class="profile-stat-val" style="${gradeColor(avg)}">${avg.toFixed(1)}</div>
        <div class="profile-stat-lbl">Media notas</div>
      </div>` : ""}
    </div>

    ${lastAbs.length ? `<p style="font-size:12px;color:var(--muted);margin-bottom:12px">Últimas ausencias: ${lastAbs.join(", ")}</p>` : ""}

    ${assessRows.length ? `
    <label>Calificaciones</label>
    <div class="grades-wrap" style="margin-bottom:12px">
      <table class="grades-table">
        <thead><tr><th style="text-align:left">Actividad</th><th>Nota</th><th>Sobre</th></tr></thead>
        <tbody>${assRows}</tbody>
      </table>
    </div>` : ""}

    ${rubricRows.length ? `
    <label>Evaluaciones con rúbrica</label>
    <div class="grades-wrap" style="margin-bottom:12px">
      <table class="grades-table">
        <thead><tr><th style="text-align:left">Rúbrica · Evaluación</th><th>Fecha</th><th>Nota</th></tr></thead>
        <tbody>${rubRows}</tbody>
      </table>
    </div>` : ""}

    <div class="modal-btns">
      <button class="btn" id="prof-close">Cerrar</button>
    </div>`;
  openModal(m);
  m.querySelector("#prof-close").onclick = closeModal;
}

/* ============================================================
   3. Vincular rúbrica → calificador del grupo
   ============================================================ */
function pushRubricToGradebook(r, app, group, students, calcFinal, actRow) {
  if (!app || !app.scores) { alert("Guarda la evaluación primero."); return; }
  const evalName = app.name || r.name;
  group.assessments = group.assessments || [];
  group.grades = group.grades || {};

  /* crear o reutilizar la actividad en el calificador */
  let assessment = group.assessments.find(a => a._rubricAppId === app.id);
  if (!assessment) {
    assessment = { id: uid(), name: evalName, weight: 1, max: 10, _rubricAppId: app.id };
    group.assessments.push(assessment);
  } else {
    assessment.name = evalName;
  }

  /* volcar las notas calculadas */
  let pushed = 0;
  students.forEach(st => {
    const v = calcFinal(st.id);
    if (v !== null) {
      group.grades[st.id] = group.grades[st.id] || {};
      group.grades[st.id][assessment.id] = Math.round(v * 10) / 10;
      pushed++;
    }
  });
  save();

  const msg = document.createElement("span");
  msg.style.cssText = "font-size:13px;color:var(--green)";
  msg.textContent = `✓ ${pushed} notas enviadas al calificador de "${group.name}"`;
  actRow.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}

/* ============================================================
   7. Estadísticas del grupo (gráfico SVG)
   ============================================================ */
function buildGroupStats(g) {
  const avgs = g.students
    .map(s => ({ name: s.name, avg: gradeAvg(g, s.id) }))
    .filter(x => x.avg != null);

  if (!avgs.length) return document.createElement("div");

  const sec = document.createElement("div");
  sec.className = "subject-section";
  const h2 = document.createElement("h2");
  h2.textContent = "Estadísticas";
  sec.appendChild(h2);

  /* métricas rápidas */
  const classAvg = avgs.reduce((s, x) => s + x.avg, 0) / avgs.length;
  const passing = avgs.filter(x => x.avg >= 5).length;
  const top = avgs.filter(x => x.avg >= 8).length;

  const pills = document.createElement("div");
  pills.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px";
  [
    ["Media del grupo", classAvg.toFixed(1), classAvg >= 8 ? "var(--green)" : classAvg >= 5 ? "var(--orange)" : "var(--red)"],
    ["Aprobados", `${passing} / ${avgs.length}`, passing === avgs.length ? "var(--green)" : "var(--orange)"],
    ["Sobresaliente", `${top} / ${avgs.length}`, top > 0 ? "var(--green)" : "var(--muted)"],
  ].forEach(([lbl, val, col]) => {
    const pill = document.createElement("div");
    pill.style.cssText = `background:var(--code-bg);border:1px solid var(--border);border-radius:10px;padding:10px 16px;min-width:110px`;
    pill.innerHTML = `<div style="font-size:20px;font-weight:700;color:${col}">${val}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">${lbl}</div>`;
    pills.appendChild(pill);
  });
  sec.appendChild(pills);

  /* gráfico de barras horizontales */
  const sorted = [...avgs].sort((a, b) => b.avg - a.avg);
  const BAR_H = 22, GAP = 4, LABEL_W = 130, BAR_AREA = 200;
  const svgH = sorted.length * (BAR_H + GAP);
  const svgW = LABEL_W + BAR_AREA + 40;

  const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgEl.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
  svgEl.setAttribute("width", svgW);
  svgEl.setAttribute("height", svgH);
  svgEl.style.cssText = "max-width:100%;display:block;margin-top:4px";

  sorted.forEach((item, i) => {
    const y = i * (BAR_H + GAP);
    const barW = (item.avg / 10) * BAR_AREA;
    const col = item.avg >= 8 ? "#34a853" : item.avg >= 5 ? "#e8841a" : "#ff3b30";

    /* fondo */
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", LABEL_W); bg.setAttribute("y", y);
    bg.setAttribute("width", BAR_AREA); bg.setAttribute("height", BAR_H);
    bg.setAttribute("rx", "4"); bg.setAttribute("fill", "var(--code-bg)");
    svgEl.appendChild(bg);

    /* barra */
    if (barW > 0) {
      const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bar.setAttribute("x", LABEL_W); bar.setAttribute("y", y);
      bar.setAttribute("width", barW); bar.setAttribute("height", BAR_H);
      bar.setAttribute("rx", "4"); bar.setAttribute("fill", col);
      svgEl.appendChild(bar);
    }

    /* nombre */
    const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lbl.setAttribute("x", LABEL_W - 8); lbl.setAttribute("y", y + BAR_H / 2 + 4);
    lbl.setAttribute("text-anchor", "end"); lbl.setAttribute("font-size", "12");
    lbl.setAttribute("fill", "var(--fg)");
    /* truncar nombre largo */
    const nameShort = item.name.length > 18 ? item.name.slice(0, 17) + "…" : item.name;
    lbl.textContent = nameShort;
    svgEl.appendChild(lbl);

    /* valor */
    const val = document.createElementNS("http://www.w3.org/2000/svg", "text");
    val.setAttribute("x", LABEL_W + barW + 6); val.setAttribute("y", y + BAR_H / 2 + 4);
    val.setAttribute("font-size", "12"); val.setAttribute("font-weight", "600");
    val.setAttribute("fill", col);
    val.textContent = item.avg.toFixed(1);
    svgEl.appendChild(val);
  });

  sec.appendChild(svgEl);
  return sec;
}

function openStudentListModal(g) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <h3>Pegar lista de alumnos</h3>
    <p class="modal-note">Un alumno por línea. Se añaden a los ya existentes.</p>
    <textarea id="std-list" class="std-textarea" rows="10" placeholder="Ana García&#10;Carlos López&#10;…"></textarea>
    <div class="modal-btns">
      <button class="btn" id="std-cancel">Cancelar</button>
      <button class="btn primary" id="std-ok">Añadir</button>
    </div>`;
  openModal(m);
  m.querySelector("#std-cancel").onclick = closeModal;
  m.querySelector("#std-ok").onclick = () => {
    const names = m.querySelector("#std-list").value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    names.forEach(n => g.students.push({ id: uid(), name: n }));
    closeModal();
    save();
    renderGroup();
  };
  setTimeout(() => m.querySelector("#std-list").focus(), 0);
}

function openRandomPicker(g) {
  const students = g.students || [];
  const todayRec = (g.attendance || {})[isoDate(new Date())] || {};
  const candidates = students.filter(s => todayRec[s.id] !== "A"); /* sin los ausentes de hoy */
  if (!candidates.length) {
    alert(students.length ? "Todos los alumnos están marcados como ausentes hoy." : "Este grupo aún no tiene alumnos.");
    return;
  }
  pickedMemo[g.id] = pickedMemo[g.id] || new Set();

  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <h3>Alumno al azar · ${g.name.replace(/</g, "&lt;")}</h3>
    <div class="picker-name" id="pk-name">…</div>
    <div class="picker-sub" id="pk-sub"></div>
    <div class="modal-btns">
      <button class="btn" id="pk-close">Cerrar</button>
      <button class="btn primary" id="pk-again">Otro</button>
    </div>`;
  openModal(m);

  const nameEl = m.querySelector("#pk-name");
  const subEl = m.querySelector("#pk-sub");
  let spinInt = null;

  function spin() {
    let pool = candidates.filter(s => !pickedMemo[g.id].has(s.id));
    let reset = false;
    if (!pool.length) { pickedMemo[g.id].clear(); pool = candidates; reset = true; }
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    clearInterval(spinInt);
    nameEl.classList.remove("settled");
    spinInt = setInterval(() => {
      nameEl.textContent = candidates[Math.floor(Math.random() * candidates.length)].name;
    }, 70);
    setTimeout(() => {
      clearInterval(spinInt);
      spinInt = null;
      nameEl.textContent = chosen.name;
      nameEl.classList.add("settled");
      pickedMemo[g.id].add(chosen.id);
      subEl.textContent = (reset ? "Ronda completada, empezando de nuevo · " : "") +
        `Ya han salido ${pickedMemo[g.id].size} de ${candidates.length}` +
        (candidates.length < students.length ? " (sin contar ausentes de hoy)" : "");
    }, 900);
  }

  m.querySelector("#pk-close").onclick = () => { clearInterval(spinInt); closeModal(); };
  m.querySelector("#pk-again").onclick = spin;
  spin();
}

/* ---------------- Plantillas de página ---------------- */

const TEMPLATES = [
  {
    icon: "📖", name: "Plan de clase",
    make: () => [
      mkBlock("h2", "🎯 Objetivos"),
      mkBlock("bullet", ""),
      mkBlock("h2", "📚 Contenidos"),
      mkBlock("bullet", ""),
      mkBlock("h2", "🧭 Desarrollo de la sesión"),
      mkBlock("number", "<b>Inicio (10 min)</b> — repaso y motivación"),
      mkBlock("number", "<b>Desarrollo (35 min)</b> — explicación y práctica"),
      mkBlock("number", "<b>Cierre (10 min)</b> — síntesis y dudas"),
      mkBlock("h2", "🧰 Materiales"),
      mkBlock("todo", ""),
      mkBlock("h2", "📝 Evaluación y deberes"),
      mkBlock("todo", ""),
    ],
  },
  {
    icon: "📝", name: "Examen",
    make: () => [
      mkBlock("callout", "<b>Instrucciones:</b> tiempo disponible, materiales permitidos y puntuación de cada pregunta."),
      mkBlock("h2", "Preguntas"),
      mkBlock("number", ""),
      mkBlock("number", ""),
      mkBlock("number", ""),
      mkBlock("divider"),
      mkBlock("h2", "Criterios de corrección"),
      mkBlock("bullet", ""),
    ],
  },
  {
    icon: "👥", name: "Reunión",
    make: () => [
      mkBlock("text", "<b>Fecha:</b> "),
      mkBlock("text", "<b>Asistentes:</b> "),
      mkBlock("h2", "Orden del día"),
      mkBlock("number", ""),
      mkBlock("number", ""),
      mkBlock("h2", "Acuerdos y tareas"),
      mkBlock("todo", ""),
    ],
  },
  {
    icon: "🗓️", name: "Plan semanal",
    make: () => ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].flatMap(d => [
      mkBlock("h3", d),
      mkBlock("todo", ""),
    ]),
  },
];

/* ---------------- Editor ---------------- */

const BLOCK_PH = {
  text: "Escribe «/» para comandos",
  h1: "Título 1", h2: "Título 2", h3: "Título 3",
  todo: "Tarea", bullet: "Lista", number: "Lista",
  toggle: "Desplegable", quote: "Cita", callout: "Escribe algo…", code: "",
};

/* bloques de recursos (sin texto editable, como la imagen) */
const RESOURCE_TYPES = ["video", "audio", "embed", "bookmark"];
const NON_TEXT_TYPES = ["divider", "image", "table", ...RESOURCE_TYPES];
const RES_PLACEHOLDER = {
  video: "Añadir vídeo (YouTube, Vimeo o .mp4)",
  audio: "Añadir audio (URL o archivo)",
  embed: "Incrustar contenido (Genially, Maps, GeoGebra, PDF…)",
  bookmark: "Añadir enlace web",
};

function videoEmbed(url) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { iframe: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { iframe: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.startsWith("data:video")) return { video: url };
  return { iframe: url };
}

function resourceEl(b) {
  if (b.type === "audio") {
    const a = document.createElement("audio");
    a.controls = true;
    a.src = b.html;
    a.className = "bk-audio";
    return a;
  }
  if (b.type === "bookmark") {
    const a = document.createElement("a");
    a.className = "bk-bookmark";
    a.href = b.html;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = `<span class="mono-ic">${svgIcon("link", 17)}</span><span class="bk-bm-text">${(b.caption || b.html).replace(/</g, "&lt;")}<span class="bk-bm-url">${b.html.replace(/</g, "&lt;")}</span></span>`;
    return a;
  }
  /* video / embed */
  const src = b.type === "video" ? videoEmbed(b.html) : { iframe: b.html };
  if (src.video) {
    const v = document.createElement("video");
    v.controls = true;
    v.src = src.video;
    v.className = "bk-videofile";
    return v;
  }
  const wrap = document.createElement("div");
  wrap.className = "bk-frame" + (b.type === "embed" ? " embed" : "");
  const f = document.createElement("iframe");
  f.src = src.iframe;
  f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
  f.allowFullscreen = true;
  f.loading = "lazy";
  wrap.appendChild(f);
  return wrap;
}

/* texto plano de un bloque, para búsquedas */
function blockText(b) {
  if (b.type === "table") return (b.rows || []).flat().map(htmlToText).join(" ");
  if (b.type === "image") return "";
  if (RESOURCE_TYPES.includes(b.type)) {
    return ((b.caption || "") + " " + (b.html && b.html.startsWith("data:") ? "" : b.html || "")).trim();
  }
  return htmlToText(b.html);
}

function renderEditor(focusId, caret) {
  const p = currentPage();
  if (!p) { elContent.innerHTML = ""; return; }

  elContent.innerHTML = "";
  const ed = document.createElement("div");
  ed.className = "editor";

  const iconBig = document.createElement("span");
  iconBig.className = "page-icon-big";
  iconBig.textContent = p.icon || "📄";
  iconBig.title = "Cambiar icono";
  iconBig.onclick = e => openEmojiPicker(e.currentTarget, p);

  const title = document.createElement("div");
  title.className = "page-title";
  title.contentEditable = "true";
  title.spellcheck = false;
  title.textContent = p.title;
  title.addEventListener("input", () => {
    p.title = title.textContent.replace(/\n/g, " ");
    const sb = elTree.querySelector(`.pg-row[data-id="${p.id}"] .pg-title`);
    if (sb) sb.textContent = p.title || "Sin título";
    saveSoon();
  });
  title.addEventListener("keydown", e => {
    if (e.key === "Enter" || (e.key === "ArrowDown" && getCaretOffset(title) === title.textContent.length)) {
      e.preventDefault();
      if (!p.blocks.length) p.blocks.push(mkBlock("text", ""));
      renderEditor(p.blocks[0].id, 0);
    }
  });
  title.addEventListener("blur", renderTopbar);

  const meta = document.createElement("div");
  meta.className = "page-meta";
  const subj = p.subjectId && getSubjectById(p.subjectId);
  const chip = document.createElement("button");
  chip.className = "subject-chip" + (subj ? ` ev-${subj.color}` : " empty");
  chip.textContent = subj ? subj.name : "＋ Asignatura";
  chip.title = "Asignatura de esta página";
  chip.onclick = e => openSubjectPicker(e.currentTarget, p);
  meta.appendChild(chip);

  let tplBar = null;
  const isBlank = p.blocks.length === 1 && p.blocks[0].type === "text" && isEmptyHtml(p.blocks[0].html);
  if (isBlank) {
    tplBar = document.createElement("div");
    tplBar.className = "tpl-bar";
    const lbl = document.createElement("span");
    lbl.className = "tpl-label";
    lbl.textContent = "Empezar con una plantilla:";
    tplBar.appendChild(lbl);
    TEMPLATES.forEach(tpl => {
      const btn = document.createElement("button");
      btn.className = "tpl-chip";
      btn.textContent = `${tpl.icon} ${tpl.name}`;
      btn.onclick = () => {
        p.blocks = tpl.make();
        if (!p.icon || p.icon === "📄") p.icon = tpl.icon;
        save();
        renderAll();
      };
      tplBar.appendChild(btn);
    });
  }

  const blocksWrap = document.createElement("div");
  blocksWrap.id = "blocks";
  buildBlocks(blocksWrap, p);
  attachEditorEvents(blocksWrap);

  const tail = document.createElement("div");
  tail.className = "editor-tail";
  tail.onclick = () => {
    const last = p.blocks[p.blocks.length - 1];
    if (last && last.type === "text" && isEmptyHtml(last.html)) {
      renderEditor(last.id, 0);
    } else {
      const nb = mkBlock("text", "");
      p.blocks.push(nb);
      saveSoon();
      renderEditor(nb.id, 0);
    }
  };

  ed.append(iconBig, title, meta);
  if (tplBar) ed.appendChild(tplBar);
  ed.append(blocksWrap, tail);
  elContent.appendChild(ed);

  if (focusId) {
    const el = blocksWrap.querySelector(`.block-content[data-id="${focusId}"]`);
    if (el) setCaretOffset(el, caret == null ? "end" : caret);
  }
}

function buildBlocks(wrap, page) {
  wrap.innerHTML = "";
  const counters = {};
  let hideBelow = null;

  for (const b of page.blocks) {
    if (hideBelow !== null) {
      if (b.indent > hideBelow) continue;
      hideBelow = null;
    }
    let num = null;
    if (b.type === "number") {
      counters[b.indent] = (counters[b.indent] || 0) + 1;
      Object.keys(counters).forEach(k => { if (+k > b.indent) delete counters[k]; });
      num = counters[b.indent];
    } else {
      Object.keys(counters).forEach(k => { if (+k >= b.indent) delete counters[k]; });
    }
    wrap.appendChild(blockRow(b, num));
    if (b.type === "toggle" && b.collapsed) hideBelow = b.indent;
  }
}

function blockRow(b, num) {
  const row = document.createElement("div");
  row.className = `block b-${b.type}` + (b.type === "todo" && b.checked ? " checked" : "");
  row.dataset.id = b.id;
  row.style.marginLeft = b.indent * 26 + "px";

  const controls = document.createElement("div");
  controls.className = "block-controls";
  const addBtn = document.createElement("button");
  addBtn.textContent = "+";
  addBtn.title = "Añadir bloque debajo";
  addBtn.className = "bk-add";
  const handle = document.createElement("button");
  handle.textContent = "⋮⋮";
  handle.title = "Arrastrar para mover";
  handle.className = "bk-handle";
  handle.draggable = true;
  controls.append(addBtn, handle);
  row.appendChild(controls);

  if (b.type === "divider") {
    const hr = document.createElement("div");
    hr.className = "bk-hr";
    const del = document.createElement("button");
    del.className = "bk-del";
    del.textContent = "✕";
    del.title = "Eliminar";
    row.append(hr, del);
    return row;
  }

  if (b.type === "image") {
    if (b.html) {
      const img = document.createElement("img");
      img.className = "bk-img";
      img.src = b.html;
      row.appendChild(img);
    } else {
      const ph = document.createElement("button");
      ph.className = "bk-img-placeholder";
      ph.textContent = "Añadir imagen (URL o archivo)";
      row.appendChild(ph);
    }
    const del = document.createElement("button");
    del.className = "bk-del";
    del.textContent = "✕";
    del.title = "Eliminar";
    row.appendChild(del);
    return row;
  }

  if (RESOURCE_TYPES.includes(b.type)) {
    if (b.html) {
      row.appendChild(resourceEl(b));
    } else {
      const ph = document.createElement("button");
      ph.className = "bk-img-placeholder";
      ph.textContent = RES_PLACEHOLDER[b.type];
      row.appendChild(ph);
    }
    const del = document.createElement("button");
    del.className = "bk-del";
    del.textContent = "✕";
    del.title = "Eliminar";
    row.appendChild(del);
    return row;
  }

  if (b.type === "table") {
    if (!Array.isArray(b.rows) || !b.rows.length) { b.rows = [["", ""], ["", ""]]; b.header = true; }
    const wrap = document.createElement("div");
    wrap.className = "bk-table-wrap";
    const tbl = document.createElement("table");
    tbl.className = "bk-table";
    b.rows.forEach((cells, ri) => {
      const tr = document.createElement("tr");
      cells.forEach((cellHtml, ci) => {
        const td = document.createElement(b.header !== false && ri === 0 ? "th" : "td");
        td.className = "bk-cell";
        td.contentEditable = "true";
        td.spellcheck = false;
        td.dataset.id = b.id;
        td.dataset.r = ri;
        td.dataset.c = ci;
        td.innerHTML = cellHtml;
        tr.appendChild(td);
      });
      tbl.appendChild(tr);
    });
    const bar = document.createElement("div");
    bar.className = "tbl-bar";
    [["addrow", "+ Fila"], ["delrow", "− Fila"], ["addcol", "+ Columna"], ["delcol", "− Columna"]].forEach(([act, label]) => {
      const btn = document.createElement("button");
      btn.className = "tbl-btn";
      btn.dataset.act = act;
      btn.textContent = label;
      bar.appendChild(btn);
    });
    wrap.append(tbl, bar);
    const del = document.createElement("button");
    del.className = "bk-del";
    del.textContent = "✕";
    del.title = "Eliminar tabla";
    row.append(wrap, del);
    return row;
  }

  if (b.type === "todo") {
    const chk = document.createElement("div");
    chk.className = "bk-check";
    chk.textContent = b.checked ? "✓" : "";
    row.appendChild(chk);
  } else if (b.type === "bullet") {
    const m = document.createElement("span");
    m.className = "bk-marker";
    m.textContent = "•";
    row.appendChild(m);
  } else if (b.type === "number") {
    const m = document.createElement("span");
    m.className = "bk-marker bk-num";
    m.textContent = num + ".";
    row.appendChild(m);
  } else if (b.type === "toggle") {
    const chev = document.createElement("button");
    chev.className = "bk-chev" + (b.collapsed ? "" : " open");
    chev.textContent = "▶";
    row.appendChild(chev);
  } else if (b.type === "callout") {
    const ic = document.createElement("span");
    ic.className = "bk-callout-icon mono-ic";
    ic.innerHTML = svgIcon("info", 17);
    row.appendChild(ic);
  }

  const content = document.createElement("div");
  content.className = "block-content";
  content.contentEditable = "true";
  content.spellcheck = false;
  content.dataset.id = b.id;
  content.dataset.ph = BLOCK_PH[b.type] || "";
  if (b.type === "code") content.innerHTML = highlightCode(b.html, b.lang);
  else content.innerHTML = b.html;
  row.appendChild(content);

  if (b.type === "code") {
    const sel = document.createElement("select");
    sel.className = "code-lang";
    CODE_LANG_OPTIONS.forEach(([v, label]) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = label;
      sel.appendChild(o);
    });
    sel.value = b.lang || "auto";
    sel.onchange = () => {
      b.lang = sel.value;
      saveSoon();
      content.innerHTML = highlightCode(b.html, b.lang);
    };
    row.appendChild(sel);
  }

  return row;
}

/* re-render manteniendo el foco */
function rerender(focusId, caret) {
  saveSoon();
  renderEditor(focusId, caret);
}

/* ---------------- Eventos del editor ---------------- */

let dragId = null;

function attachEditorEvents(wrap) {
  wrap.addEventListener("input", onBlockInput);
  wrap.addEventListener("keydown", onBlockKeydown);
  wrap.addEventListener("click", onBlockClick);
  wrap.addEventListener("paste", onBlockPaste);

  wrap.addEventListener("dragstart", e => {
    const row = e.target.closest && e.target.closest(".block");
    if (!row || !e.target.classList.contains("bk-handle")) return;
    dragId = row.dataset.id;
    row.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragId);
  });
  wrap.addEventListener("dragend", () => {
    dragId = null;
    wrap.querySelectorAll(".dragging, .drop-above, .drop-below").forEach(el =>
      el.classList.remove("dragging", "drop-above", "drop-below"));
  });
  wrap.addEventListener("dragover", e => {
    if (!dragId) return;
    const row = e.target.closest(".block");
    if (!row || row.dataset.id === dragId) return;
    e.preventDefault();
    const rect = row.getBoundingClientRect();
    const below = e.clientY > rect.top + rect.height / 2;
    wrap.querySelectorAll(".drop-above, .drop-below").forEach(el =>
      el.classList.remove("drop-above", "drop-below"));
    row.classList.add(below ? "drop-below" : "drop-above");
  });
  wrap.addEventListener("drop", e => {
    if (!dragId) return;
    const row = e.target.closest(".block");
    if (!row || row.dataset.id === dragId) return;
    e.preventDefault();
    const p = currentPage();
    const from = blockIndex(dragId);
    const moved = p.blocks.splice(from, 1)[0];
    let to = p.blocks.findIndex(b => b.id === row.dataset.id);
    const rect = row.getBoundingClientRect();
    if (e.clientY > rect.top + rect.height / 2) to++;
    p.blocks.splice(to, 0, moved);
    dragId = null;
    rerender(moved.id, "end");
  });
}

function onBlockInput(e) {
  const cell = e.target.closest(".bk-cell");
  if (cell) {
    const tb = findBlock(cell.dataset.id);
    if (tb) {
      tb.rows[+cell.dataset.r][+cell.dataset.c] = cell.innerHTML === "<br>" ? "" : cell.innerHTML;
      saveSoon();
    }
    return;
  }
  const el = e.target.closest(".block-content");
  if (!el) return;
  if (el.innerHTML === "<br>") el.innerHTML = "";
  const b = findBlock(el.dataset.id);
  if (!b) return;

  if (b.type === "code") {
    b.html = el.textContent;
    saveSoon();
    /* re-resaltar conservando el cursor */
    const off = getCaretOffset(el);
    el.innerHTML = highlightCode(b.html, b.lang);
    setCaretOffset(el, off);
    return;
  }
  b.html = el.innerHTML;
  saveSoon();

  const bar = elContent.querySelector(".tpl-bar");
  if (bar && !isEmptyHtml(b.html)) bar.remove();

  /* conversiones instantáneas */
  if (b.type === "text") {
    const t = el.textContent;
    if (t === "---") { b.type = "divider"; b.html = ""; rerenderWithNextFocus(b); return; }
    if (t === "```") { b.type = "code"; b.html = ""; rerender(b.id, 0); return; }
  }
  maybeSlash(el, b);
}

function rerenderWithNextFocus(b) {
  const p = currentPage();
  let next = nextVisible(b.id);
  if (!next) {
    next = mkBlock("text", "");
    insertBlockAfter(b.id, next);
  }
  rerender(next.id, 0);
}

function onBlockKeydown(e) {
  /* navegación del menú slash */
  if (slash.openFor) {
    if (e.key === "ArrowDown") { e.preventDefault(); slashMove(1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); slashMove(-1); return; }
    if (e.key === "Enter") { e.preventDefault(); slashApply(); return; }
    if (e.key === "Escape") { e.preventDefault(); closeSlash(); return; }
  }

  /* navegación dentro de tablas */
  const cell = e.target.closest(".bk-cell");
  if (cell) {
    const tb = findBlock(cell.dataset.id);
    if (!tb) return;
    const r = +cell.dataset.r, c = +cell.dataset.c;
    const cols = tb.rows[0].length, rows = tb.rows.length;
    if (e.key === "Tab") {
      e.preventDefault();
      const idx = r * cols + c + (e.shiftKey ? -1 : 1);
      if (idx < 0) return;
      if (idx >= rows * cols) {
        tb.rows.push(Array(cols).fill(""));
        rerender();
        focusCell(tb.id, rows, 0);
        return;
      }
      focusCell(tb.id, Math.floor(idx / cols), idx % cols);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (r + 1 >= rows) {
        tb.rows.push(Array(cols).fill(""));
        rerender();
        focusCell(tb.id, rows, c);
        return;
      }
      focusCell(tb.id, r + 1, c);
      return;
    }
    return;
  }

  const el = e.target.closest(".block-content");
  if (!el) return;
  const b = findBlock(el.dataset.id);
  if (!b) return;
  const p = currentPage();

  /* formato inline */
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && ["b", "i", "u"].includes(e.key.toLowerCase()) && b.type !== "code") {
    e.preventDefault();
    document.execCommand({ b: "bold", i: "italic", u: "underline" }[e.key.toLowerCase()]);
    b.html = el.innerHTML;
    saveSoon();
    return;
  }

  if (e.key === "Enter" && e.shiftKey && b.type !== "code") {
    e.preventDefault();
    document.execCommand("insertLineBreak");
    return;
  }

  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (b.type === "code") { document.execCommand("insertText", false, "\n"); return; }

    const empty = isEmptyHtml(el.innerHTML);
    if (empty && ["todo", "bullet", "number", "toggle", "quote", "callout"].includes(b.type)) {
      if (b.indent > 0) b.indent--;
      else b.type = "text";
      rerender(b.id, 0);
      return;
    }
    const { before, after } = splitAtCaret(el);
    b.html = sanitize(before);
    const keepType = ["todo", "bullet", "number"].includes(b.type) ? b.type : "text";
    const nb = mkBlock(keepType, sanitize(after));
    nb.indent = (b.type === "toggle" && !b.collapsed) ? b.indent + 1 : b.indent;
    insertBlockAfter(b.id, nb);
    rerender(nb.id, 0);
    return;
  }

  if (e.key === "Backspace") {
    const off = getCaretOffset(el);
    const hasSel = !getSelection().isCollapsed;
    if (off === 0 && !hasSel) {
      e.preventDefault();
      if (b.type !== "text" && b.type !== "code") { b.type = "text"; rerender(b.id, 0); return; }
      if (b.type === "code") { b.type = "text"; b.html = sanitize(el.textContent.replace(/\n/g, "<br>")); rerender(b.id, 0); return; }
      if (b.indent > 0) { b.indent--; rerender(b.id, 0); return; }
      const prev = prevVisible(b.id);
      if (!prev) return;
      if (prev.type === "table") return; /* no borrar tablas por accidente */
      if (prev.type === "divider" || prev.type === "image" || RESOURCE_TYPES.includes(prev.type)) {
        removeBlock(prev.id);
        rerender(b.id, 0);
        return;
      }
      const prevLen = prev.type === "code" ? prev.html.length : htmlToText(prev.html).length;
      if (prev.type === "code") prev.html += el.textContent;
      else prev.html = (prev.html || "") + (b.type === "code" ? el.textContent : b.html || "");
      removeBlock(b.id);
      rerender(prev.id, prevLen);
      return;
    }
    return;
  }

  if (e.key === "Tab") {
    e.preventDefault();
    if (e.shiftKey) { if (b.indent > 0) { b.indent--; rerender(b.id, getCaretOffset(el)); } }
    else {
      const i = blockIndex(b.id);
      const prev = i > 0 ? p.blocks[i - 1] : null;
      if (prev && b.indent <= prev.indent) { b.indent++; rerender(b.id, getCaretOffset(el)); }
    }
    return;
  }

  /* atajos markdown con espacio */
  if (e.key === " " && b.type === "text") {
    const off = getCaretOffset(el);
    const t = el.textContent.slice(0, off);
    const map = { "#": "h1", "##": "h2", "###": "h3", "-": "bullet", "*": "bullet", "1.": "number", "[]": "todo", ">": "quote" };
    if (map[t]) {
      e.preventDefault();
      rangeFromOffsets(el, 0, off).deleteContents();
      b.html = sanitize(el.innerHTML);
      b.type = map[t];
      if (b.type === "todo") b.checked = false;
      rerender(b.id, 0);
      return;
    }
  }

  if (e.key === "ArrowUp" && getCaretOffset(el) === 0 && getSelection().isCollapsed) {
    const prev = prevVisible(b.id);
    if (prev && !NON_TEXT_TYPES.includes(prev.type)) {
      e.preventDefault();
      focusBlock(prev.id, "end");
    } else if (!prev) {
      e.preventDefault();
      setCaretOffset($(".page-title"), "end");
    }
    return;
  }
  if (e.key === "ArrowDown" && getCaretOffset(el) === el.textContent.length && getSelection().isCollapsed) {
    const next = nextVisible(b.id);
    if (next && !NON_TEXT_TYPES.includes(next.type)) {
      e.preventDefault();
      focusBlock(next.id, 0);
    }
    return;
  }
}

function focusBlock(id, caret) {
  const el = elContent.querySelector(`.block-content[data-id="${id}"]`);
  if (el) setCaretOffset(el, caret);
}

function focusCell(id, r, c) {
  const t = elContent.querySelector(`.bk-cell[data-id="${id}"][data-r="${r}"][data-c="${c}"]`);
  if (t) setCaretOffset(t, "end");
}

function onBlockClick(e) {
  const row = e.target.closest(".block");
  if (!row) return;
  const b = findBlock(row.dataset.id);
  if (!b) return;

  const act = e.target.dataset ? e.target.dataset.act : null;
  if (act && b.type === "table") {
    const cols = b.rows[0].length;
    if (act === "addrow") b.rows.push(Array(cols).fill(""));
    if (act === "delrow" && b.rows.length > 1) b.rows.pop();
    if (act === "addcol") b.rows.forEach(r => r.push(""));
    if (act === "delcol" && cols > 1) b.rows.forEach(r => r.pop());
    rerender();
    return;
  }

  if (e.target.classList.contains("bk-check")) {
    b.checked = !b.checked;
    row.classList.toggle("checked", b.checked);
    e.target.textContent = b.checked ? "✓" : "";
    saveSoon();
    return;
  }
  if (e.target.classList.contains("bk-chev")) {
    b.collapsed = !b.collapsed;
    rerender(b.id, "end");
    return;
  }
  if (e.target.classList.contains("bk-del")) {
    removeBlock(b.id);
    rerender();
    return;
  }
  if (e.target.classList.contains("bk-add")) {
    const nb = mkBlock("text", "");
    nb.indent = b.indent;
    insertBlockAfter(b.id, nb);
    rerender(nb.id, 0);
    return;
  }
  if (e.target.classList.contains("bk-img-placeholder")) {
    if (b.type === "image") openImageModal(b);
    else openResourceModal(b);
    return;
  }
}

function onBlockPaste(e) {
  const el = e.target.closest(".block-content");
  if (!el) return;
  e.preventDefault();
  const text = e.clipboardData.getData("text/plain");
  const b = findBlock(el.dataset.id);
  if (!b) return;

  if (b.type !== "code" && text.includes("\n")) {
    /* pegar varias líneas → varios bloques */
    const lines = text.split(/\r?\n/);
    document.execCommand("insertText", false, lines[0]);
    b.html = b.type === "code" ? el.textContent : el.innerHTML;
    let ref = b.id;
    for (let i = 1; i < lines.length; i++) {
      const nb = mkBlock("text", lines[i].replace(/&/g, "&amp;").replace(/</g, "&lt;"));
      nb.indent = b.indent;
      insertBlockAfter(ref, nb);
      ref = nb.id;
    }
    rerender(ref, "end");
  } else {
    document.execCommand("insertText", false, text);
  }
}

/* ---------------- Menú slash ---------------- */

const SLASH_ITEMS = [
  { t: "text", icon: "Aa", label: "Texto", kw: "texto parrafo normal" },
  { t: "h1", icon: "H1", label: "Título 1", kw: "h1 titulo encabezado grande" },
  { t: "h2", icon: "H2", label: "Título 2", kw: "h2 titulo encabezado mediano" },
  { t: "h3", icon: "H3", label: "Título 3", kw: "h3 titulo encabezado pequeno" },
  { t: "todo", icon: "✓", label: "Lista de tareas", kw: "todo tarea check pendiente" },
  { t: "bullet", icon: "•", label: "Lista con viñetas", kw: "vineta bullet lista puntos" },
  { t: "number", icon: "1.", label: "Lista numerada", kw: "numerada ordenada numeros" },
  { t: "toggle", icon: "›", label: "Desplegable", kw: "toggle desplegable plegar" },
  { t: "quote", icon: "❝", label: "Cita", kw: "cita quote frase" },
  { t: "callout", icon: "i", label: "Destacado", kw: "callout destacado nota aviso" },
  { t: "code", icon: "</>", label: "Código", kw: "codigo code programar" },
  { t: "divider", icon: "—", label: "Divisor", kw: "divisor separador linea hr" },
  { t: "image", icon: "⊡", label: "Imagen", kw: "imagen foto archivo url" },
  { t: "table", icon: "⊞", label: "Tabla", kw: "tabla celdas filas columnas" },
  { t: "video", icon: "▷", label: "Vídeo", kw: "video youtube vimeo mp4 pelicula" },
  { t: "audio", icon: "♪", label: "Audio", kw: "audio sonido musica mp3 escuchar" },
  { t: "bookmark", icon: "@", label: "Enlace web", kw: "enlace link marcador web url" },
  { t: "embed", icon: "⧉", label: "Incrustar", kw: "incrustar embed genially maps geogebra pdf iframe" },
];

const elSlash = $("#slash-menu");
let slash = { openFor: null, start: 0, query: "", sel: 0, items: [] };

function maybeSlash(el, b) {
  if (b.type === "code") return closeSlash();
  const off = getCaretOffset(el);
  const text = el.textContent.slice(0, off);
  const idx = text.lastIndexOf("/");
  if (idx === -1 || (idx > 0 && !/[\s ]/.test(text[idx - 1]))) return closeSlash();
  const q = text.slice(idx + 1);
  if (q.length > 16 || /\n/.test(q)) return closeSlash();
  openSlash(el, b, idx, q);
}

function openSlash(el, b, start, query) {
  const nq = norm(query);
  const items = SLASH_ITEMS.filter(it => norm(it.label + " " + it.kw).includes(nq));
  slash = { openFor: b.id, start, query, sel: 0, items };
  elSlash.hidden = false;
  renderSlash();

  const sel = getSelection();
  let rect = null;
  if (sel.rangeCount) rect = sel.getRangeAt(0).getBoundingClientRect();
  if (!rect || (rect.x === 0 && rect.y === 0)) rect = el.getBoundingClientRect();
  const top = Math.min(rect.bottom + 6, innerHeight - 330);
  const left = Math.min(Math.max(rect.left, 10), innerWidth - 280);
  elSlash.style.top = top + "px";
  elSlash.style.left = left + "px";
}

function renderSlash() {
  if (!slash.items.length) {
    elSlash.innerHTML = '<div class="slash-empty">Sin resultados</div>';
    return;
  }
  elSlash.innerHTML = "";
  slash.items.forEach((it, i) => {
    const d = document.createElement("div");
    d.className = "slash-item" + (i === slash.sel ? " sel" : "");
    d.innerHTML = `<span class="slash-icon">${it.icon}</span><span class="slash-label">${it.label}</span>`;
    d.onmousedown = e => { e.preventDefault(); slash.sel = i; slashApply(); };
    elSlash.appendChild(d);
  });
  const selEl = elSlash.children[slash.sel];
  if (selEl) selEl.scrollIntoView({ block: "nearest" });
}

function slashMove(dir) {
  if (!slash.items.length) return;
  slash.sel = (slash.sel + dir + slash.items.length) % slash.items.length;
  renderSlash();
}

function closeSlash() {
  slash.openFor = null;
  elSlash.hidden = true;
}

function slashApply() {
  const item = slash.items[slash.sel];
  const b = findBlock(slash.openFor);
  if (!item || !b) return closeSlash();
  const el = elContent.querySelector(`.block-content[data-id="${b.id}"]`);

  /* borrar "/consulta" del bloque */
  rangeFromOffsets(el, slash.start, slash.start + 1 + slash.query.length).deleteContents();
  b.html = sanitize(el.innerHTML);
  const caret = slash.start;
  closeSlash();

  if (item.t === "divider") {
    if (isEmptyHtml(b.html)) {
      b.type = "divider"; b.html = "";
      rerenderWithNextFocus(b);
    } else {
      const d = mkBlock("divider");
      d.indent = b.indent;
      insertBlockAfter(b.id, d);
      const nb = mkBlock("text", "");
      nb.indent = b.indent;
      insertBlockAfter(d.id, nb);
      rerender(nb.id, 0);
    }
    return;
  }
  if (item.t === "image" || RESOURCE_TYPES.includes(item.t)) {
    const openFn = bk => item.t === "image" ? openImageModal(bk) : openResourceModal(bk);
    if (isEmptyHtml(b.html)) {
      b.type = item.t;
      b.html = "";
      save(); renderEditor(); openFn(b);
    } else {
      const nb = mkBlock(item.t, "");
      nb.indent = b.indent;
      insertBlockAfter(b.id, nb);
      save(); renderEditor(); openFn(nb);
    }
    return;
  }
  if (item.t === "table") {
    if (isEmptyHtml(b.html)) {
      b.type = "table";
      b.html = "";
      b.rows = [["", ""], ["", ""]];
      b.header = true;
      rerender();
      focusCell(b.id, 0, 0);
    } else {
      const nb = mkBlock("table");
      nb.rows = [["", ""], ["", ""]];
      nb.header = true;
      nb.indent = b.indent;
      insertBlockAfter(b.id, nb);
      rerender();
      focusCell(nb.id, 0, 0);
    }
    return;
  }
  if (item.t === "code") {
    b.type = "code";
    b.html = htmlToText(b.html);
    rerender(b.id, caret);
    return;
  }
  b.type = item.t;
  if (b.type === "todo") b.checked = false;
  if (b.type === "toggle") b.collapsed = false;
  rerender(b.id, caret);
}

document.addEventListener("mousedown", e => {
  if (!elSlash.hidden && !elSlash.contains(e.target)) closeSlash();
  const pop = $("#popover");
  if (!pop.hidden && !pop.contains(e.target)) pop.hidden = true;
});

/* ---------------- Selector de emoji ---------------- */

const EMOJIS = ["📄", "📚", "📝", "📅", "🏫", "👨‍🏫", "🧪", "🧮", "🗣️", "🌍", "🎨", "🎵", "⚽", "🔬", "📐", "🖥️", "🧠", "📖", "✏️", "🗂️", "⭐", "✅", "💡", "🏭", "🎯", "🔔", "🧬", "🗺️", "🏛️", "📊", "🎬", "❤️"];

function openEmojiPicker(anchor, page) {
  const pop = $("#popover");
  pop.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "emoji-grid";
  EMOJIS.forEach(em => {
    const btn = document.createElement("button");
    btn.textContent = em;
    btn.onclick = () => {
      page.icon = em;
      pop.hidden = true;
      save();
      renderAll();
    };
    grid.appendChild(btn);
  });
  pop.appendChild(grid);
  pop.hidden = false;
  const r = anchor.getBoundingClientRect();
  pop.style.top = Math.min(r.bottom + 6, innerHeight - 220) + "px";
  pop.style.left = Math.min(r.left, innerWidth - 300) + "px";
}

/* ---------------- Selector de asignatura para una página ---------------- */

function openSubjectPicker(anchor, page) {
  const pop = $("#popover");
  pop.innerHTML = "";

  const mkRow = (label, dotColor, fn) => {
    const d = document.createElement("div");
    d.className = "slash-item";
    d.innerHTML = (dotColor ? `<span class="dot ev-${dotColor}"></span>` : '<span class="dot dot-none"></span>') +
      `<span class="slash-label">${label.replace(/</g, "&lt;")}</span>`;
    d.onclick = fn;
    pop.appendChild(d);
  };

  state.subjects.forEach(s => mkRow(s.name, s.color, () => {
    page.subjectId = s.id;
    pop.hidden = true;
    save();
    renderAll();
  }));
  if (page.subjectId) mkRow("Sin asignatura", null, () => {
    page.subjectId = null;
    pop.hidden = true;
    save();
    renderAll();
  });
  mkRow("＋ Nueva asignatura…", null, () => {
    pop.hidden = true;
    openSubjectModal(null, ns => { page.subjectId = ns.id; save(); renderAll(); });
  });

  pop.hidden = false;
  const r = anchor.getBoundingClientRect();
  pop.style.top = Math.min(r.bottom + 6, innerHeight - 260) + "px";
  pop.style.left = Math.min(r.left, innerWidth - 300) + "px";
}

/* ---------------- Modales genéricos ---------------- */

const elOverlay = $("#overlay");

function openModal(modalEl) {
  elOverlay.innerHTML = "";
  elOverlay.appendChild(modalEl);
  elOverlay.hidden = false;
  const first = modalEl.querySelector("input");
  if (first) setTimeout(() => first.focus(), 0);
}
function closeModal() {
  elOverlay.hidden = true;
  elOverlay.innerHTML = "";
}
elOverlay.addEventListener("mousedown", e => { if (e.target === elOverlay) closeModal(); });

/* ---------------- Modal de imagen ---------------- */

function openImageModal(block) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <h3>Añadir imagen</h3>
    <label>Desde URL</label>
    <input type="url" id="img-url" placeholder="https://…">
    <label>O subir archivo (se guarda en el navegador)</label>
    <input type="file" id="img-file" accept="image/*">
    <div class="modal-btns">
      <button class="btn" id="img-cancel">Cancelar</button>
      <button class="btn primary" id="img-ok">Insertar</button>
    </div>`;
  openModal(m);

  const done = src => {
    block.html = src;
    closeModal();
    save();
    renderEditor();
  };
  m.querySelector("#img-cancel").onclick = closeModal;
  m.querySelector("#img-ok").onclick = () => {
    const url = m.querySelector("#img-url").value.trim();
    if (url) done(url);
  };
  m.querySelector("#img-url").addEventListener("keydown", e => {
    if (e.key === "Enter") m.querySelector("#img-ok").click();
  });
  m.querySelector("#img-file").addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 1.5 * 1024 * 1024) { alert("Imagen demasiado grande (máx. 1,5 MB). Usa una URL."); return; }
    const r = new FileReader();
    r.onload = () => done(r.result);
    r.readAsDataURL(f);
  });
}

/* ---------------- Modal de recursos (vídeo, audio, enlace, incrustar) ---------------- */

function openResourceModal(block) {
  const META = {
    video: { title: "Insertar vídeo", help: "Pega un enlace de YouTube, Vimeo o un archivo de vídeo (.mp4, .webm)." },
    audio: { title: "Insertar audio", help: "Pega la URL de un audio o sube un archivo pequeño (se guarda en el navegador).", file: true },
    embed: { title: "Incrustar contenido", help: "Pega la URL de cualquier recurso incrustable: Genially, Google Maps, GeoGebra, un PDF en línea…" },
    bookmark: { title: "Enlace web", help: "Crea una tarjeta con un enlace que se abre en una pestaña nueva.", caption: true },
  };
  const meta = META[block.type] || META.embed;

  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <h3>${meta.title}</h3>
    <p class="modal-note">${meta.help}</p>
    <label>URL</label>
    <input type="url" id="res-url" placeholder="https://…" value="${(block.html && !block.html.startsWith("data:") ? block.html : "").replace(/"/g, "&quot;")}">
    ${meta.caption ? `<label>Texto a mostrar (opcional)</label><input type="text" id="res-caption" value="${(block.caption || "").replace(/"/g, "&quot;")}">` : ""}
    ${meta.file ? '<label>O subir archivo</label><input type="file" id="res-file" accept="audio/*">' : ""}
    <div class="modal-btns">
      <button class="btn" id="res-cancel">Cancelar</button>
      <button class="btn primary" id="res-ok">Insertar</button>
    </div>`;
  openModal(m);

  const done = src => {
    block.html = src;
    if (meta.caption) block.caption = (m.querySelector("#res-caption").value || "").trim();
    closeModal();
    save();
    renderEditor();
  };
  m.querySelector("#res-cancel").onclick = closeModal;
  m.querySelector("#res-ok").onclick = () => {
    const url = m.querySelector("#res-url").value.trim();
    if (url) done(url);
  };
  m.querySelector("#res-url").addEventListener("keydown", e => {
    if (e.key === "Enter") m.querySelector("#res-ok").click();
  });
  const fileInput = m.querySelector("#res-file");
  if (fileInput) fileInput.addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { alert("Archivo demasiado grande (máx. 2 MB). Usa una URL."); return; }
    const r = new FileReader();
    r.onload = () => done(r.result);
    r.readAsDataURL(f);
  });
}

/* ---------------- Búsqueda (⌘K) ---------------- */

function openSearch() {
  const m = document.createElement("div");
  m.className = "modal search-modal";
  m.innerHTML = `
    <input type="text" id="search-input" placeholder="Buscar en tus páginas…">
    <div class="search-results" id="search-results"></div>`;
  openModal(m);

  const input = m.querySelector("#search-input");
  const results = m.querySelector("#search-results");
  let sel = 0, matches = [];

  function run() {
    const q = norm(input.value.trim());
    matches = [];
    state.pages.forEach(p => {
      const inTitle = norm(p.title).includes(q);
      let snippet = "";
      if (q) {
        const hit = p.blocks.find(b => norm(blockText(b)).includes(q));
        if (hit) snippet = blockText(hit).slice(0, 90);
        if (!inTitle && !hit) return;
      }
      matches.push({ page: p, snippet });
    });
    sel = 0;
    paint();
  }

  function paint() {
    results.innerHTML = "";
    if (!matches.length) {
      results.innerHTML = '<div class="search-none">Sin resultados</div>';
      return;
    }
    matches.forEach((mt, i) => {
      const d = document.createElement("div");
      d.className = "search-result" + (i === sel ? " sel" : "");
      d.innerHTML = `<div class="sr-title">${mt.page.icon || "📄"} ${(mt.page.title || "Sin título").replace(/</g, "&lt;")}</div>` +
        (mt.snippet ? `<div class="sr-snippet">${mt.snippet.replace(/</g, "&lt;")}</div>` : "");
      d.onclick = () => { closeModal(); navigateToPage(mt.page.id); };
      results.appendChild(d);
    });
  }

  input.addEventListener("input", run);
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, matches.length - 1); paint(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); paint(); }
    else if (e.key === "Enter" && matches[sel]) { closeModal(); navigateToPage(matches[sel].page.id); }
    else if (e.key === "Escape") closeModal();
  });
  run();
}

/* ---------------- Agenda semanal ---------------- */

const HOUR_START = 7, HOUR_END = 22, HOUR_H = 52;
const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const EV_COLORS = ["blue", "green", "orange", "red", "purple", "gray"];

/* eventos de un día concreto, incluyendo los que se repiten cada semana */
function eventsOnDay(dIso) {
  const wd = new Date(dIso + "T00:00").getDay();
  return state.events.filter(ev =>
    ev.date === dIso ||
    (ev.repeat === "weekly" && ev.date < dIso && new Date(ev.date + "T00:00").getDay() === wd)
  );
}

function renderAgenda() {
  elContent.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "agenda";

  const endOfWeek = addDays(weekStart, 6);
  const fmt = d => d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  const toolbar = document.createElement("div");
  toolbar.className = "ag-toolbar";
  toolbar.innerHTML = `
    <span class="ag-title">Agenda semanal</span>
    <span class="ag-range">${fmt(weekStart)} — ${fmt(endOfWeek)} de ${endOfWeek.getFullYear()}</span>
    <div class="ag-nav">
      <button id="ag-prev" title="Semana anterior">‹</button>
      <button id="ag-today">Hoy</button>
      <button id="ag-next" title="Semana siguiente">›</button>
      <button id="ag-month" class="ag-view-toggle">Vista mes</button>
      <button id="ag-new">+ Evento</button>
    </div>`;
  wrap.appendChild(toolbar);

  const grid = document.createElement("div");
  grid.className = "ag-grid";

  const head = document.createElement("div");
  head.className = "ag-head";
  head.appendChild(document.createElement("div"));
  const todayIso = isoDate(new Date());
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const h = document.createElement("div");
    h.className = "ag-day-head" + (isoDate(d) === todayIso ? " today" : "");
    h.innerHTML = `${DAY_NAMES[i]}<span class="ag-day-num">${d.getDate()}</span>`;
    head.appendChild(h);
  }
  grid.appendChild(head);

  const body = document.createElement("div");
  body.className = "ag-body";
  const totalH = (HOUR_END - HOUR_START) * HOUR_H;

  const times = document.createElement("div");
  times.className = "ag-times";
  times.style.height = totalH + "px";
  for (let h = HOUR_START + 1; h < HOUR_END; h++) {
    const lbl = document.createElement("div");
    lbl.className = "ag-time-label";
    lbl.style.top = (h - HOUR_START) * HOUR_H + "px";
    lbl.textContent = pad(h) + ":00";
    times.appendChild(lbl);
  }
  body.appendChild(times);

  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const dIso = isoDate(d);
    const col = document.createElement("div");
    col.className = "ag-col" + (dIso === todayIso ? " today" : "");
    col.style.height = totalH + "px";
    col.dataset.date = dIso;

    for (let h = HOUR_START + 1; h < HOUR_END; h++) {
      const line = document.createElement("div");
      line.className = "ag-hline";
      line.style.top = (h - HOUR_START) * HOUR_H + "px";
      col.appendChild(line);
    }

    if (dIso === todayIso) {
      const mins = now.getHours() * 60 + now.getMinutes() - HOUR_START * 60;
      if (mins >= 0 && mins <= (HOUR_END - HOUR_START) * 60) {
        const line = document.createElement("div");
        line.className = "ag-now";
        line.style.top = (mins / 60) * HOUR_H + "px";
        col.appendChild(line);
      }
    }

    eventsOnDay(dIso).forEach(ev => {
      const s = toMin(ev.start), e2 = toMin(ev.end);
      const div = document.createElement("div");
      div.className = `ag-ev ev-${evColorKey(ev)}`;
      div.style.top = ((s - HOUR_START * 60) / 60) * HOUR_H + "px";
      div.style.height = Math.max(((e2 - s) / 60) * HOUR_H - 2, 18) + "px";
      const marks = ev.repeat === "weekly" ? "↻ " : "";
      div.innerHTML = `<div class="ev-title">${marks}${(ev.title || "(sin título)").replace(/</g, "&lt;")}</div><div class="ev-time">${ev.start}–${ev.end}</div>`;
      div.onclick = e => { e.stopPropagation(); openEventModal(ev); };
      col.appendChild(div);
    });

    col.onclick = e => {
      const rect = col.getBoundingClientRect();
      const y = e.clientY - rect.top;
      let mins = HOUR_START * 60 + Math.round((y / HOUR_H) * 60 / 30) * 30;
      mins = Math.min(mins, HOUR_END * 60 - 60);
      openEventModal({ date: dIso, start: toHHMM(mins), end: toHHMM(mins + 60), color: "blue" });
    };

    body.appendChild(col);
  }
  grid.appendChild(body);
  wrap.appendChild(grid);
  elContent.appendChild(wrap);

  toolbar.querySelector("#ag-prev").onclick = () => { weekStart = addDays(weekStart, -7); renderAgenda(); };
  toolbar.querySelector("#ag-next").onclick = () => { weekStart = addDays(weekStart, 7); renderAgenda(); };
  toolbar.querySelector("#ag-today").onclick = () => { weekStart = mondayOf(new Date()); renderAgenda(); };
  toolbar.querySelector("#ag-month").onclick = () => {
    monthStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
    view = { kind: "month" }; renderAll();
  };
  toolbar.querySelector("#ag-new").onclick = () =>
    openEventModal({ date: isoDate(new Date()), start: "09:00", end: "10:00", color: "blue" });

  /* desplazar la vista a las 8:00 */
  grid.scrollTop = HOUR_H * 0.5;
}

/* ---------------- Agenda mensual ---------------- */

function renderMonth() {
  elContent.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "agenda month-view";

  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const todayIso = isoDate(new Date());

  const title = monthStart.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const toolbar = document.createElement("div");
  toolbar.className = "ag-toolbar";
  toolbar.innerHTML = `
    <span class="ag-title">Agenda mensual</span>
    <span class="ag-range">${title.charAt(0).toUpperCase() + title.slice(1)}</span>
    <div class="ag-nav">
      <button id="mn-prev">‹</button>
      <button id="mn-today">Hoy</button>
      <button id="mn-next">›</button>
      <button id="mn-week" class="ag-view-toggle">Vista semana</button>
      <button id="mn-new">+ Evento</button>
    </div>`;
  wrap.appendChild(toolbar);

  /* primer lunes de la cuadrícula (semana que contiene el día 1 del mes) */
  const gridStart = mondayOf(new Date(year, month, 1));

  const grid = document.createElement("div");
  grid.className = "month-grid";

  /* cabeceras de día */
  DAY_NAMES.forEach(name => {
    const h = document.createElement("div");
    h.className = "month-col-hdr";
    h.textContent = name;
    grid.appendChild(h);
  });

  /* 6 semanas × 7 días = 42 celdas */
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    const dIso = isoDate(d);
    const inMonth = d.getMonth() === month;

    const cell = document.createElement("div");
    cell.className = "month-cell" +
      (dIso === todayIso ? " today" : "") +
      (!inMonth ? " other-month" : "");

    const numEl = document.createElement("div");
    numEl.className = "month-day-num";
    numEl.textContent = d.getDate();
    cell.appendChild(numEl);

    /* eventos del día, ordenados por hora */
    const evs = eventsOnDay(dIso).sort((a, b) => toMin(a.start) - toMin(b.start));
    const MAX_SHOWN = 3;
    evs.slice(0, MAX_SHOWN).forEach(ev => {
      const chip = document.createElement("div");
      chip.className = `month-ev ev-${evColorKey(ev)}`;
      chip.textContent = (ev.repeat === "weekly" ? "↻ " : "") + (ev.title || "(sin título)");
      chip.title = `${ev.start}–${ev.end}  ${ev.title || ""}`;
      chip.onclick = e => { e.stopPropagation(); openEventModal(ev); };
      cell.appendChild(chip);
    });

    if (evs.length > MAX_SHOWN) {
      const more = document.createElement("div");
      more.className = "month-more";
      more.textContent = `+${evs.length - MAX_SHOWN} más`;
      more.onclick = e => { e.stopPropagation(); openDayPopover(dIso, evs, more); };
      cell.appendChild(more);
    }

    /* clic en celda vacía → nuevo evento */
    cell.onclick = () => openEventModal({ date: dIso, start: "09:00", end: "10:00", color: "blue" });

    grid.appendChild(cell);
  }

  wrap.appendChild(grid);
  elContent.appendChild(wrap);

  toolbar.querySelector("#mn-prev").onclick = () => {
    monthStart = new Date(year, month - 1, 1); renderMonth();
  };
  toolbar.querySelector("#mn-next").onclick = () => {
    monthStart = new Date(year, month + 1, 1); renderMonth();
  };
  toolbar.querySelector("#mn-today").onclick = () => {
    monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1); renderMonth();
  };
  toolbar.querySelector("#mn-week").onclick = () => {
    weekStart = mondayOf(new Date(year, month, 1));
    view = { kind: "agenda" }; renderAll();
  };
  toolbar.querySelector("#mn-new").onclick = () =>
    openEventModal({ date: todayIso, start: "09:00", end: "10:00", color: "blue" });
}

/* popover de eventos de un día en vista mensual */
function openDayPopover(dIso, evs, anchor) {
  const d = new Date(dIso + "T00:00");
  const title = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  const pop = document.createElement("div");
  pop.className = "popover day-popover";
  pop.innerHTML = `<div class="pop-title">${title.charAt(0).toUpperCase() + title.slice(1)}</div>`;
  evs.forEach(ev => {
    const row = document.createElement("div");
    row.className = "pop-row";
    row.innerHTML = `<span class="dot ev-${evColorKey(ev)}"></span><span class="pop-ev-time">${ev.start}–${ev.end}</span><span>${(ev.title || "(sin título)").replace(/</g, "&lt;")}</span>`;
    row.onclick = () => { closePopover(); openEventModal(ev); };
    pop.appendChild(row);
  });
  const addBtn = document.createElement("button");
  addBtn.className = "btn"; addBtn.style.marginTop = "8px"; addBtn.style.width = "100%";
  addBtn.textContent = "+ Nuevo evento este día";
  addBtn.onclick = () => { closePopover(); openEventModal({ date: dIso, start: "09:00", end: "10:00", color: "blue" }); };
  pop.appendChild(addBtn);

  const rect = anchor.getBoundingClientRect();
  const elPop = document.getElementById("popover");
  elPop.innerHTML = "";
  elPop.appendChild(pop);
  elPop.hidden = false;
  elPop.style.top = (rect.bottom + window.scrollY + 4) + "px";
  elPop.style.left = Math.min(rect.left + window.scrollX, window.innerWidth - 220) + "px";

  const closePopover = () => { elPop.hidden = true; document.removeEventListener("click", outside); };
  const outside = e => { if (!elPop.contains(e.target)) closePopover(); };
  setTimeout(() => document.addEventListener("click", outside), 10);
}

function openEventModal(ev) {
  const isNew = !ev.id;
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <h3>${isNew ? "Nuevo evento" : "Editar evento"}</h3>
    <label>Título</label>
    <input type="text" id="ev-title" placeholder="Clase, reunión, tutoría…" value="${(ev.title || "").replace(/"/g, "&quot;")}">
    <label>Fecha</label>
    <input type="date" id="ev-date" value="${ev.date}">
    <div class="modal-row">
      <div><label>Inicio</label><input type="time" id="ev-start" value="${ev.start}" step="300"></div>
      <div><label>Fin</label><input type="time" id="ev-end" value="${ev.end}" step="300"></div>
    </div>
    <label>Asignatura</label>
    <select id="ev-subject"><option value="">— Ninguna —</option></select>
    <label>Color (se usa si no hay asignatura)</label>
    <div class="color-swatches" id="ev-colors"></div>
    <label class="check-label"><input type="checkbox" id="ev-repeat" ${ev.repeat === "weekly" ? "checked" : ""}> Se repite cada semana</label>
    <label>Página vinculada (apuntes de la clase)</label>
    <select id="ev-page"><option value="">— Ninguna —</option></select>
    <div class="modal-btns">
      ${isNew ? "" : '<button class="btn danger" id="ev-del">Eliminar</button>'}
      ${!isNew && ev.pageId ? '<button class="btn" id="ev-open">Abrir página</button>' : ""}
      <button class="btn" id="ev-cancel">Cancelar</button>
      <button class="btn primary" id="ev-save">Guardar</button>
    </div>`;
  openModal(m);

  const subjSel = m.querySelector("#ev-subject");
  state.subjects.forEach(s => {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = s.name;
    if (ev.subjectId === s.id) o.selected = true;
    subjSel.appendChild(o);
  });

  const pageSel = m.querySelector("#ev-page");
  state.pages.forEach(p => {
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = `${p.icon || "📄"} ${p.title || "Sin título"}`;
    if (ev.pageId === p.id) o.selected = true;
    pageSel.appendChild(o);
  });
  const openBtn = m.querySelector("#ev-open");
  if (openBtn) openBtn.onclick = () => { closeModal(); navigateToPage(ev.pageId); };

  let color = ev.color || "blue";
  const swatches = m.querySelector("#ev-colors");
  let selSwatch = null;
  EV_COLORS.forEach(c => {
    const s = document.createElement("div");
    s.className = `swatch ev-${c}` + (c === color ? " sel" : "");
    if (c === color) selSwatch = s;
    s.onclick = () => {
      color = c;
      if (selSwatch) selSwatch.classList.remove("sel");
      s.classList.add("sel");
      selSwatch = s;
    };
    swatches.appendChild(s);
  });

  m.querySelector("#ev-cancel").onclick = closeModal;
  if (!isNew) {
    m.querySelector("#ev-del").onclick = () => {
      state.events = state.events.filter(x => x.id !== ev.id);
      closeModal();
      save();
      renderAgenda();
    };
  }
  m.querySelector("#ev-save").onclick = () => {
    const title = m.querySelector("#ev-title").value.trim();
    const date = m.querySelector("#ev-date").value;
    let start = m.querySelector("#ev-start").value || "09:00";
    let end = m.querySelector("#ev-end").value || "10:00";
    if (!date) return;
    if (toMin(end) <= toMin(start)) end = toHHMM(Math.min(toMin(start) + 60, 23 * 60 + 59));
    const repeat = m.querySelector("#ev-repeat").checked ? "weekly" : null;
    const pageId = m.querySelector("#ev-page").value || null;
    const subjectId = m.querySelector("#ev-subject").value || null;
    if (isNew) {
      state.events.push({ id: uid(), title, date, start, end, color, repeat, pageId, subjectId });
    } else {
      Object.assign(ev, { title, date, start, end, color, repeat, pageId, subjectId });
    }
    closeModal();
    save();
    weekStart = mondayOf(new Date(date + "T00:00"));
    renderAgenda();
  };
  m.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.id === "ev-title") m.querySelector("#ev-save").click(); });
}

/* ---------------- Presentación ---------------- */

const elPresent = $("#present");
let presentSlides = [], presentIdx = 0;

function startPresentation() {
  const p = currentPage();
  if (!p) return;

  presentSlides = [{ titleSlide: true, icon: p.icon, title: p.title || "Sin título" }];
  let cur = null;
  for (const b of p.blocks) {
    if (b.type === "h1") {
      cur = { heading: htmlToText(b.html), blocks: [] };
      presentSlides.push(cur);
      continue;
    }
    if (b.type === "divider") { cur = null; continue; }
    if (!cur) { cur = { heading: "", blocks: [] }; presentSlides.push(cur); }
    cur.blocks.push(b);
  }
  presentSlides = presentSlides.filter(s => s.titleSlide || s.heading || s.blocks.length);
  presentIdx = 0;
  elPresent.hidden = false;
  renderSlide();
  try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); } catch (e) { /* opcional */ }
}

function renderSlide() {
  const s = presentSlides[presentIdx];
  elPresent.innerHTML = "";

  const progress = document.createElement("div");
  progress.className = "pr-progress";
  progress.style.width = ((presentIdx + 1) / presentSlides.length * 100) + "%";

  const slide = document.createElement("div");
  slide.className = "pr-slide" + (s.titleSlide ? " title-slide" : "");

  if (s.titleSlide) {
    slide.innerHTML = `<div class="pr-icon">${s.icon || "📄"}</div><h1>${(s.title).replace(/</g, "&lt;")}</h1>`;
  } else {
    if (s.heading) {
      const h = document.createElement("h1");
      h.textContent = s.heading;
      slide.appendChild(h);
    }
    let n = 0;
    s.blocks.forEach(b => {
      n = b.type === "number" ? n + 1 : 0;
      slide.appendChild(presentBlock(b, n));
    });
  }
  slide.onclick = () => nav(1);

  const footer = document.createElement("div");
  footer.className = "pr-footer";
  const exit = document.createElement("button");
  exit.className = "pr-exit";
  exit.textContent = "✕ Salir (Esc)";
  exit.onclick = e => { e.stopPropagation(); exitPresentation(); };

  const timerWrap = document.createElement("span");
  timerWrap.className = "pr-timer-wrap";
  if (prTimer.int) {
    const t = document.createElement("button");
    t.className = "pr-exit pr-timer";
    t.id = "pr-timer";
    t.title = "Detener temporizador";
    t.textContent = timerText();
    t.onclick = e => { e.stopPropagation(); stopTimer(); renderSlide(); };
    timerWrap.appendChild(t);
  } else {
    const lbl = document.createElement("span");
    lbl.textContent = "⏱";
    timerWrap.appendChild(lbl);
    [5, 10, 15].forEach(min => {
      const btn = document.createElement("button");
      btn.className = "pr-exit";
      btn.textContent = min + "′";
      btn.title = `Temporizador de ${min} minutos`;
      btn.onclick = e => { e.stopPropagation(); startTimer(min); };
      timerWrap.appendChild(btn);
    });
  }

  const counter = document.createElement("span");
  counter.className = "pr-counter";
  counter.textContent = `${presentIdx + 1} / ${presentSlides.length}`;
  footer.append(exit, timerWrap, counter);

  elPresent.append(progress, slide, footer);
}

/* temporizador de actividad (visible durante la presentación) */
let prTimer = { end: 0, int: null };

function timerText() {
  const r = Math.round((prTimer.end - Date.now()) / 1000);
  if (r <= 0) return "⏰ ¡Tiempo!";
  return `⏱ ${Math.floor(r / 60)}:${pad(r % 60)}`;
}

function startTimer(min) {
  stopTimer();
  prTimer.end = Date.now() + min * 60000;
  prTimer.int = setInterval(() => {
    const el = document.getElementById("pr-timer");
    if (!el) return;
    el.textContent = timerText();
    el.classList.toggle("pr-timer-over", prTimer.end - Date.now() <= 0);
  }, 500);
  renderSlide();
}

function stopTimer() {
  if (prTimer.int) clearInterval(prTimer.int);
  prTimer = { end: 0, int: null };
}

function presentBlock(b, num) {
  const d = document.createElement("div");
  d.className = "pr-block";
  switch (b.type) {
    case "h2": d.classList.add("pr-h2"); d.innerHTML = b.html; break;
    case "h3": d.classList.add("pr-h3"); d.innerHTML = b.html; break;
    case "bullet": d.classList.add("pr-bullet"); d.innerHTML = b.html; break;
    case "number": d.innerHTML = `<b>${num}.</b> ` + b.html; break;
    case "todo": d.innerHTML = (b.checked ? "✓ " : "◯ ") + `<span class="${b.checked ? "pr-todo-done" : ""}">${b.html}</span>`; break;
    case "quote": d.classList.add("pr-quote"); d.innerHTML = b.html; break;
    case "callout": d.classList.add("pr-callout"); d.innerHTML = "💡 " + b.html; break;
    case "code": d.classList.add("pr-code"); d.innerHTML = highlightCode(b.html, b.lang); break;
    case "toggle": d.innerHTML = "▸ " + b.html; break;
    case "image": { const img = document.createElement("img"); img.src = b.html; d.appendChild(img); break; }
    case "table": {
      const tbl = document.createElement("table");
      tbl.className = "pr-table";
      (b.rows || []).forEach((cells, ri) => {
        const tr = document.createElement("tr");
        cells.forEach(cellHtml => {
          const td = document.createElement(b.header !== false && ri === 0 ? "th" : "td");
          td.innerHTML = cellHtml;
          tr.appendChild(td);
        });
        tbl.appendChild(tr);
      });
      d.appendChild(tbl);
      break;
    }
    case "video":
    case "audio":
    case "embed":
    case "bookmark": {
      if (b.html) d.appendChild(resourceEl(b));
      break;
    }
    default: d.innerHTML = b.html;
  }
  return d;
}

function nav(dir) {
  const next = presentIdx + dir;
  if (next < 0) return;
  if (next >= presentSlides.length) { exitPresentation(); return; }
  presentIdx = next;
  renderSlide();
}

function exitPresentation() {
  stopTimer();
  elPresent.hidden = true;
  try { document.fullscreenElement && document.exitFullscreen(); } catch (e) { /* opcional */ }
}

/* ---------------- Exportar Markdown ---------------- */

function mdInline(html) {
  const d = document.createElement("div");
  d.innerHTML = html || "";
  d.querySelectorAll("b, strong").forEach(el => el.replaceWith(`**${el.textContent}**`));
  d.querySelectorAll("i, em").forEach(el => el.replaceWith(`*${el.textContent}*`));
  d.querySelectorAll("code").forEach(el => el.replaceWith(`\`${el.textContent}\``));
  d.querySelectorAll("a").forEach(el => el.replaceWith(`[${el.textContent}](${el.getAttribute("href") || ""})`));
  d.querySelectorAll("br").forEach(el => el.replaceWith("\n"));
  return d.textContent;
}

function pageToMarkdown(p) {
  const lines = [`# ${p.icon || ""} ${p.title || "Sin título"}`.trim(), ""];
  let n = 0;
  for (const b of p.blocks) {
    const ind = "  ".repeat(b.indent);
    const t = mdInline(b.html);
    n = b.type === "number" ? n + 1 : 0;
    switch (b.type) {
      case "h1": lines.push(`# ${t}`); break;
      case "h2": lines.push(`## ${t}`); break;
      case "h3": lines.push(`### ${t}`); break;
      case "todo": lines.push(`${ind}- [${b.checked ? "x" : " "}] ${t}`); break;
      case "bullet": lines.push(`${ind}- ${t}`); break;
      case "number": lines.push(`${ind}${n}. ${t}`); break;
      case "toggle": lines.push(`${ind}- ${t}`); break;
      case "quote": lines.push(`> ${t}`); break;
      case "callout": lines.push(`> 💡 ${t}`); break;
      case "code": lines.push("```" + (b.lang && b.lang !== "auto" && b.lang !== "plain" ? b.lang : ""), b.html, "```"); break;
      case "divider": lines.push("---"); break;
      case "image": lines.push(`![imagen](${b.html})`); break;
      case "table": {
        (b.rows || []).forEach((cells, ri) => {
          lines.push("| " + cells.map(c => mdInline(c).replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ") + " |");
          if (ri === 0 && b.header !== false) lines.push("|" + cells.map(() => " --- ").join("|") + "|");
        });
        break;
      }
      case "video": lines.push(`▶ [Vídeo](${b.html})`); break;
      case "audio": lines.push(`🔊 [Audio](${b.html})`); break;
      case "embed": lines.push(`🌐 [Contenido incrustado](${b.html})`); break;
      case "bookmark": lines.push(`🔗 [${mdInline(b.caption || "") || b.html}](${b.html})`); break;
      default: lines.push(`${ind}${t}`);
    }
  }
  return lines.join("\n");
}

function exportMarkdown() {
  const p = currentPage();
  if (!p) return;
  const blob = new Blob([pageToMarkdown(p)], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (p.title || "pagina").replace(/[\\/:*?"<>|]/g, "-") + ".md";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------- Copia de seguridad ---------------- */

function openBackupModal() {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <h3>Copia de seguridad</h3>
    <p class="modal-note">Tus datos viven solo en este navegador. Exporta un archivo para guardarlos
    o para llevarlos a otro ordenador, y restáuralo cuando quieras.</p>
    <div class="modal-btns" style="justify-content:flex-start">
      <button class="btn primary" id="bk-export">Exportar datos</button>
      <button class="btn" id="bk-import">Importar archivo…</button>
      <input type="file" id="bk-file" accept=".json,application/json" hidden>
    </div>`;
  openModal(m);

  m.querySelector("#bk-export").onclick = () => {
    const full = JSON.parse(JSON.stringify(state));
    if (full.settings && full.settings.github) delete full.settings.github.token;
    const blob = new Blob([JSON.stringify(full, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cuaderno-backup-${isoDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const fileInput = m.querySelector("#bk-file");
  m.querySelector("#bk-import").onclick = () => fileInput.click();
  fileInput.addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let data;
      try { data = JSON.parse(r.result); } catch { alert("El archivo no es una copia válida."); return; }
      if (!data || !Array.isArray(data.pages)) { alert("El archivo no es una copia válida."); return; }
      if (!confirm("Esto reemplazará TODOS los datos actuales por los del archivo. ¿Continuar?")) return;
      data.events = Array.isArray(data.events) ? data.events : [];
      data.subjects = Array.isArray(data.subjects) ? data.subjects : [];
      data.settings = data.settings || { theme: "light" };
      if (state.settings.github) data.settings.github = state.settings.github; /* conserva el token local */
      state = data;
      if (!state.pages.length) state.pages.push({ id: uid(), title: "", icon: "📄", parentId: null, open: true, blocks: [mkBlock("text", "")] });
      view = { kind: "page", pageId: state.pages[0].id };
      save();
      closeModal();
      renderAll();
    };
    r.readAsText(f);
  });
}

/* ---------------- Sincronización con GitHub ---------------- */

const b64encode = s => btoa(unescape(encodeURIComponent(s)));
const b64decode = s => decodeURIComponent(escape(atob((s || "").replace(/\n/g, ""))));
const encodePath = p => p.split("/").map(encodeURIComponent).join("/");

function ghConfig() {
  return state.settings.github || {};
}

async function ghReq(cfg, method, path, body) {
  const res = await fetch(`https://api.github.com/repos/${cfg.repo}/${path}`, {
    method,
    headers: {
      "Authorization": "Bearer " + cfg.token,
      "Accept": "application/vnd.github+json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404) return { notFound: true };
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Error ${res.status}`);
  }
  return res.json();
}

const ghGetFile = (cfg, path) =>
  ghReq(cfg, "GET", `contents/${encodePath(path)}?ref=${encodeURIComponent(cfg.branch)}`);

/* sube un archivo solo si su contenido cambió; devuelve true si hubo subida */
async function ghPutFile(cfg, path, content, message) {
  const existing = await ghGetFile(cfg, path);
  if (!existing.notFound && typeof existing.content === "string") {
    try { if (b64decode(existing.content) === content) return false; } catch { /* contenido binario: subir */ }
  }
  await ghReq(cfg, "PUT", `contents/${encodePath(path)}`, {
    message,
    content: b64encode(content),
    branch: cfg.branch,
    ...(existing.sha ? { sha: existing.sha } : {}),
  });
  return true;
}

function ghPageFilename(p) {
  const t = (p.title || "sin-titulo").replace(/[\\/:*?"<>|#%]/g, "-").trim().slice(0, 60);
  return `${t}-${p.id}.md`;
}

async function ghPush(cfg, setStatus) {
  const folder = cfg.folder ? cfg.folder.replace(/^\/+|\/+$/g, "") + "/" : "";
  const stamp = new Date().toLocaleString("es-ES");

  /* copia completa, sin el token */
  const full = JSON.parse(JSON.stringify(state));
  if (full.settings) delete full.settings.github;

  const files = [{ path: `${folder}cuaderno-data.json`, content: JSON.stringify(full, null, 2) }];
  state.pages.forEach(p => files.push({ path: `${folder}paginas/${ghPageFilename(p)}`, content: pageToMarkdown(p) }));

  let uploaded = 0;
  for (let i = 0; i < files.length; i++) {
    setStatus(`Subiendo ${i + 1}/${files.length}…`);
    if (await ghPutFile(cfg, files[i].path, files[i].content, `Cuaderno: sincronización ${stamp}`)) uploaded++;
  }

  /* limpia .md de páginas que ya no existen o cambiaron de nombre */
  setStatus("Limpiando archivos antiguos…");
  const expected = new Set(state.pages.map(p => ghPageFilename(p)));
  const listing = await ghGetFile(cfg, `${folder}paginas`);
  if (Array.isArray(listing)) {
    for (const f of listing) {
      if (f.type === "file" && f.name.endsWith(".md") && !expected.has(f.name)) {
        await ghReq(cfg, "DELETE", `contents/${encodePath(`${folder}paginas/${f.name}`)}`, {
          message: `Cuaderno: eliminar ${f.name}`,
          sha: f.sha,
          branch: cfg.branch,
        });
      }
    }
  }
  return uploaded;
}

async function ghPull(cfg) {
  const folder = cfg.folder ? cfg.folder.replace(/^\/+|\/+$/g, "") + "/" : "";
  /* Accept "raw" para que funcione también con archivos de más de 1 MB */
  const res = await fetch(`https://api.github.com/repos/${cfg.repo}/contents/${encodePath(folder + "cuaderno-data.json")}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: { "Authorization": "Bearer " + cfg.token, "Accept": "application/vnd.github.raw" },
  });
  if (res.status === 404) throw new Error("No hay copia en ese repositorio/carpeta. Sube primero tus apuntes.");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Error ${res.status}`);
  }
  const data = JSON.parse(await res.text());
  if (!data || !Array.isArray(data.pages)) throw new Error("El archivo del repositorio no es válido.");
  return data;
}

function openGitHubModal() {
  const cfg = ghConfig();
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <h3>Sincronizar con GitHub</h3>
    <p class="modal-note">Guarda tus apuntes en un repositorio: cada página como Markdown legible (carpeta
    <code>paginas/</code>) y una copia completa (<code>cuaderno-data.json</code>) con la que restaurar todo
    en otro ordenador. Necesitas un <b>token de acceso personal</b> con permiso de lectura/escritura de
    contenido sobre ese repositorio (GitHub → Settings → Developer settings → Fine-grained tokens).
    El token se guarda solo en este navegador y nunca se sube.</p>
    <label>Token de acceso personal</label>
    <input type="password" id="gh-token" placeholder="github_pat_…" value="${(cfg.token || "").replace(/"/g, "&quot;")}">
    <label>Repositorio (usuario/nombre)</label>
    <input type="text" id="gh-repo" placeholder="miusuario/mis-apuntes" value="${(cfg.repo || "").replace(/"/g, "&quot;")}">
    <div class="modal-row">
      <div><label>Rama</label><input type="text" id="gh-branch" value="${(cfg.branch || "main").replace(/"/g, "&quot;")}"></div>
      <div><label>Carpeta (opcional)</label><input type="text" id="gh-folder" value="${(cfg.folder == null ? "cuaderno" : cfg.folder).replace(/"/g, "&quot;")}"></div>
    </div>
    <div class="gh-status" id="gh-status">${cfg.lastSync ? "Última sincronización: " + new Date(cfg.lastSync).toLocaleString("es-ES") : "Aún sin sincronizar."}</div>
    <div class="modal-btns">
      <button class="btn" id="gh-close">Cerrar</button>
      <button class="btn" id="gh-pull">Restaurar de GitHub</button>
      <button class="btn primary" id="gh-push">Subir apuntes</button>
    </div>`;
  openModal(m);

  const statusEl = m.querySelector("#gh-status");
  const setStatus = (txt, cls) => { statusEl.textContent = txt; statusEl.className = "gh-status" + (cls ? " " + cls : ""); };

  function readConfig() {
    const c = {
      token: m.querySelector("#gh-token").value.trim(),
      repo: m.querySelector("#gh-repo").value.trim().replace(/^https:\/\/github\.com\//, "").replace(/\/+$/, ""),
      branch: m.querySelector("#gh-branch").value.trim() || "main",
      folder: m.querySelector("#gh-folder").value.trim().replace(/^\/+|\/+$/g, ""),
      lastSync: ghConfig().lastSync || null,
    };
    if (!c.token) { setStatus("Falta el token de acceso.", "err"); return null; }
    if (!/^[\w.-]+\/[\w.-]+$/.test(c.repo)) { setStatus("El repositorio debe tener el formato usuario/nombre.", "err"); return null; }
    state.settings.github = c;
    save();
    return c;
  }

  let busy = false;
  m.querySelector("#gh-close").onclick = closeModal;

  m.querySelector("#gh-push").onclick = async () => {
    if (busy) return;
    const c = readConfig();
    if (!c) return;
    busy = true;
    try {
      const uploaded = await ghPush(c, setStatus);
      c.lastSync = new Date().toISOString();
      state.settings.github = c;
      save();
      setStatus(uploaded ? `✅ Sincronizado: ${uploaded} archivo${uploaded === 1 ? "" : "s"} actualizado${uploaded === 1 ? "" : "s"}.` : "✅ Todo estaba ya al día.", "ok");
    } catch (err) {
      setStatus("Error: " + err.message, "err");
    }
    busy = false;
  };

  m.querySelector("#gh-pull").onclick = async () => {
    if (busy) return;
    const c = readConfig();
    if (!c) return;
    if (!confirm("Esto reemplazará TODOS los datos locales por la copia del repositorio. ¿Continuar?")) return;
    busy = true;
    setStatus("Descargando…");
    try {
      const data = await ghPull(c);
      data.events = Array.isArray(data.events) ? data.events : [];
      data.subjects = Array.isArray(data.subjects) ? data.subjects : [];
      data.settings = data.settings || { theme: "light" };
      data.settings.github = c; /* conserva el token local */
      state = data;
      if (!state.pages.length) state.pages.push({ id: uid(), title: "", icon: "📄", parentId: null, open: true, blocks: [mkBlock("text", "")] });
      view = { kind: "page", pageId: state.pages[0].id };
      save();
      closeModal();
      renderAll();
    } catch (err) {
      setStatus("Error: " + err.message, "err");
      busy = false;
    }
  };
}

/* ============================================================
   Rúbricas — lista, diseño y aplicación
   ============================================================ */

/* ---- Lista de rúbricas ---- */
function renderRubrics() {
  elContent.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "subject-view";

  const head = document.createElement("div");
  head.className = "subject-head";
  const h1 = document.createElement("h1");
  h1.innerHTML = svgIcon("grid", 22) + " Rúbricas";
  h1.style.cssText = "display:flex;align-items:center;gap:10px";
  const btnNew = document.createElement("button");
  btnNew.className = "tb-btn primary";
  btnNew.innerHTML = svgIcon("edit", 13) + " Nueva rúbrica";
  btnNew.onclick = () => openRubricModal(null);
  head.append(h1, btnNew);
  wrap.appendChild(head);

  if (!state.rubrics.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `${svgIcon("grid", 36)}<p>Sin rúbricas todavía.<br>Crea una para evaluar actividades por Resultados de Aprendizaje.</p>`;
    wrap.appendChild(empty);
  } else {
    const grid = document.createElement("div");
    grid.className = "rubrics-list";
    for (const r of state.rubrics) {
      const card = document.createElement("div");
      card.className = "rubric-card";
      const sub = r.subjectId ? state.subjects.find(s => s.id === r.subjectId) : null;
      const raCount = (r.ras || []).length;
      const appCount = (r.applications || []).length;
      const dotHtml = sub ? `<span class="dot ev-${sub.color || "blue"}" style="margin-right:4px"></span>${sub.name}` : "Sin asignatura";
      card.innerHTML = `
        <div class="rubric-card-name">${r.name || "Sin nombre"}</div>
        <div class="rubric-card-meta" style="margin:4px 0">${dotHtml}</div>
        <div class="rubric-card-meta">${raCount} RA${raCount !== 1 ? "s" : ""} · ${appCount} evaluación${appCount !== 1 ? "es" : ""}</div>`;
      card.onclick = () => { view = { kind: "rubric", rubricId: r.id, tab: "design" }; renderAll(); };
      const del = document.createElement("button");
      del.className = "tb-btn rubric-card-del";
      del.title = "Eliminar rúbrica";
      del.innerHTML = svgIcon("trash", 13);
      del.onclick = e => {
        e.stopPropagation();
        if (!confirm(`¿Eliminar la rúbrica "${r.name}"?`)) return;
        state.rubrics = state.rubrics.filter(x => x.id !== r.id);
        save(); renderRubrics();
      };
      card.appendChild(del);
      grid.appendChild(card);
    }
    wrap.appendChild(grid);
  }
  elContent.appendChild(wrap);
}

/* ---- Modal crear/editar rúbrica ---- */
function openRubricModal(r) {
  const isNew = !r;
  const m = document.createElement("div");
  m.className = "modal";
  const subOpts = state.subjects
    .map(s => `<option value="${s.id}"${r && r.subjectId === s.id ? " selected" : ""}>${s.name}</option>`)
    .join("");
  m.innerHTML = `
    <h3>${isNew ? "Nueva rúbrica" : "Editar rúbrica"}</h3>
    <label>Nombre</label>
    <input id="rb-name" type="text" placeholder="Ej. Rúbrica de programación"
      value="${r ? (r.name || "").replace(/"/g, "&quot;") : ""}">
    <label>Asignatura (opcional)</label>
    <select id="rb-subj">
      <option value="">— Sin asignatura —</option>${subOpts}
    </select>
    <div class="modal-btns">
      <button class="btn" id="rb-cancel">Cancelar</button>
      <button class="btn primary" id="rb-save">${isNew ? "Crear y diseñar" : "Guardar"}</button>
    </div>`;
  openModal(m);
  m.querySelector("#rb-cancel").onclick = closeModal;
  m.querySelector("#rb-save").onclick = () => {
    const name = m.querySelector("#rb-name").value.trim();
    if (!name) { m.querySelector("#rb-name").focus(); return; }
    const subjectId = m.querySelector("#rb-subj").value || null;
    if (isNew) {
      const nr = { id: uid(), name, subjectId, ras: [], applications: [] };
      state.rubrics.push(nr);
      save(); closeModal();
      view = { kind: "rubric", rubricId: nr.id, tab: "design" };
      renderAll();
    } else {
      r.name = name; r.subjectId = subjectId;
      save(); closeModal(); renderAll();
    }
  };
  setTimeout(() => m.querySelector("#rb-name").focus(), 50);
}

/* ---- Niveles por defecto para nuevos RAs ---- */
/* ---- Vista detalle de una rúbrica ---- */
function renderRubric() {
  const r = state.rubrics.find(x => x.id === view.rubricId);
  if (!r) { view = { kind: "rubrics" }; renderAll(); return; }
  if (!r.ras) r.ras = [];
  if (!r.applications) r.applications = [];

  elContent.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "subject-view";

  const head = document.createElement("div");
  head.className = "subject-head";
  const h1 = document.createElement("h1");
  h1.textContent = r.name;
  const btnEdit = document.createElement("button");
  btnEdit.className = "tb-btn";
  btnEdit.innerHTML = svgIcon("edit", 13) + " Editar";
  btnEdit.onclick = () => openRubricModal(r);
  head.append(h1, btnEdit);
  wrap.appendChild(head);

  if (!view.tab) view.tab = "design";
  const tabBar = document.createElement("div");
  tabBar.className = "tab-bar";
  tabBar.style.marginBottom = "20px";
  [["design", "Diseño"], ["apply", "Calificar grupo"]].forEach(([id, lbl]) => {
    const t = document.createElement("button");
    t.className = "tab" + (view.tab === id ? " active" : "");
    t.textContent = lbl;
    t.onclick = () => { view.tab = id; renderRubric(); };
    tabBar.appendChild(t);
  });
  wrap.appendChild(tabBar);

  if (view.tab === "design") renderRubricDesign(wrap, r);
  else renderRubricApply(wrap, r);

  elContent.appendChild(wrap);
}

/* ---- Tab Diseño ---- */
function renderRubricDesign(wrap, r) {
  const addBtn = document.createElement("button");
  addBtn.className = "tb-btn primary";
  addBtn.innerHTML = svgIcon("edit", 13) + " Añadir RA";
  addBtn.onclick = () => openRAModal(r, null);
  wrap.appendChild(addBtn);

  if (!r.ras.length) {
    const p = document.createElement("p");
    p.style.cssText = "color:var(--muted);margin-top:18px;font-size:14px";
    p.textContent = "Sin Resultados de Aprendizaje. Añade el primero con el botón de arriba.";
    wrap.appendChild(p);
    return;
  }

  const totalW = r.ras.reduce((s, ra) => s + (Number(ra.weight) || 0), 0);
  const wDiv = document.createElement("div");
  wDiv.style.cssText = `font-size:12px;margin:8px 0 16px;color:${Math.abs(totalW - 100) < 0.5 ? "var(--green)" : "var(--orange)"}`;
  wDiv.textContent = `Peso total de los RAs: ${totalW}%${Math.abs(totalW - 100) < 0.5 ? " ✓" : " (debe sumar 100%)"}`;
  wrap.appendChild(wDiv);

  const raList = document.createElement("div");
  raList.className = "ra-list";

  for (const ra of r.ras) {
    if (!ra.instruments) ra.instruments = [];

    const card = document.createElement("div");
    card.className = "ra-card";

    /* cabecera del RA */
    const hdr = document.createElement("div");
    hdr.className = "ra-header";
    const nameSpan = document.createElement("span");
    nameSpan.className = "ra-name";
    nameSpan.textContent = ra.name || "RA sin nombre";
    const weightSpan = document.createElement("span");
    weightSpan.className = "ra-weight";
    weightSpan.textContent = `${ra.weight || 0}%`;
    const editBtn = document.createElement("button");
    editBtn.className = "tb-btn"; editBtn.title = "Editar RA";
    editBtn.innerHTML = svgIcon("edit", 13);
    editBtn.onclick = e => { e.stopPropagation(); openRAModal(r, ra); };
    const delBtn = document.createElement("button");
    delBtn.className = "tb-btn"; delBtn.title = "Eliminar RA";
    delBtn.innerHTML = svgIcon("trash", 13);
    delBtn.onclick = e => {
      e.stopPropagation();
      if (!confirm(`¿Eliminar "${ra.name}"?`)) return;
      r.ras = r.ras.filter(x => x.id !== ra.id);
      save(); renderRubric();
    };
    hdr.append(nameSpan, weightSpan, editBtn, delBtn);
    card.appendChild(hdr);

    /* cuerpo: lista de instrumentos */
    const body = document.createElement("div");
    body.className = "ra-body";

    if (!ra.instruments.length) {
      const hint = document.createElement("p");
      hint.style.cssText = "font-size:13px;color:var(--muted);margin:10px 0 6px";
      hint.textContent = "Sin instrumentos. Añade exámenes, trabajos, prácticas…";
      body.appendChild(hint);
    } else {
      const instW = ra.instruments.reduce((s, i) => s + (Number(i.weight) || 0), 0);
      const instWDiv = document.createElement("div");
      instWDiv.style.cssText = `font-size:11px;margin:8px 0 4px;color:${Math.abs(instW - 100) < 0.5 ? "var(--green)" : "var(--orange)"}`;
      instWDiv.textContent = `Peso instrumentos: ${instW}%${Math.abs(instW - 100) < 0.5 ? " ✓" : " (debe sumar 100%)"}`;
      body.appendChild(instWDiv);

      for (const inst of ra.instruments) {
        const row = document.createElement("div");
        row.className = "criterio-row";
        row.innerHTML = `
          <span class="criterio-name">${inst.name || "Sin nombre"}</span>
          <span class="ra-weight" style="font-size:12px">${inst.weight || 0}%</span>`;
        const acts = document.createElement("div");
        acts.style.cssText = "display:flex;gap:4px;flex-shrink:0;margin-left:4px";
        const eI = document.createElement("button");
        eI.className = "tb-btn"; eI.title = "Editar instrumento";
        eI.innerHTML = svgIcon("edit", 12);
        eI.onclick = () => openInstrumentModal(r, ra, inst);
        const dI = document.createElement("button");
        dI.className = "tb-btn"; dI.title = "Eliminar";
        dI.innerHTML = svgIcon("trash", 12);
        dI.onclick = () => {
          if (!confirm(`¿Eliminar "${inst.name}"?`)) return;
          ra.instruments = ra.instruments.filter(x => x.id !== inst.id);
          save(); renderRubric();
        };
        acts.append(eI, dI);
        row.appendChild(acts);
        body.appendChild(row);
      }
    }

    const addInstBtn = document.createElement("button");
    addInstBtn.className = "tb-btn";
    addInstBtn.style.marginTop = "10px";
    addInstBtn.innerHTML = svgIcon("edit", 12) + " + Instrumento";
    addInstBtn.onclick = () => openInstrumentModal(r, ra, null);
    body.appendChild(addInstBtn);

    card.appendChild(body);
    raList.appendChild(card);
  }
  wrap.appendChild(raList);
}

/* ---- Tab Calificar ---- */
function renderRubricApply(wrap, r) {
  const hasInstruments = r.ras.some(ra => (ra.instruments || []).length > 0);
  if (!r.ras.length || !hasInstruments) {
    const p = document.createElement("p");
    p.style.cssText = "color:var(--muted);font-size:14px";
    p.textContent = "Diseña la rúbrica primero: añade RAs e instrumentos de evaluación en la pestaña Diseño.";
    wrap.appendChild(p); return;
  }

  /* barra superior: grupo + nombre + fecha */
  const tb = document.createElement("div");
  tb.style.cssText = "display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:18px";

  const grpDiv = document.createElement("div");
  grpDiv.innerHTML = `<label class="field-label">Grupo</label>`;
  const grpSel = document.createElement("select");
  grpSel.className = "modal-select";
  grpSel.innerHTML = `<option value="">— Seleccionar —</option>` +
    state.groups.map(g => `<option value="${g.id}"${view.applyGroupId === g.id ? " selected" : ""}>${g.name}</option>`).join("");
  grpSel.onchange = () => { view.applyGroupId = grpSel.value || null; view.applyAppId = null; renderRubric(); };
  grpDiv.appendChild(grpSel);
  tb.appendChild(grpDiv);

  const nameDiv = document.createElement("div");
  nameDiv.innerHTML = `<label class="field-label">Nombre de la evaluación</label>`;
  const nameIn = document.createElement("input");
  nameIn.type = "text"; nameIn.placeholder = "Ej. 1.ª evaluación, Práctica 2…";
  nameIn.className = "modal-input-inline"; nameIn.style.width = "200px";
  nameIn.value = view.applyName || "";
  nameIn.oninput = () => { view.applyName = nameIn.value; };
  nameDiv.appendChild(nameIn);
  tb.appendChild(nameDiv);

  const dateDiv = document.createElement("div");
  dateDiv.innerHTML = `<label class="field-label">Fecha</label>`;
  const dateIn = document.createElement("input");
  dateIn.type = "date"; dateIn.className = "modal-input-inline";
  dateIn.value = view.applyDate || isoDate(new Date());
  dateIn.oninput = () => { view.applyDate = dateIn.value; };
  dateDiv.appendChild(dateIn);
  tb.appendChild(dateDiv);
  wrap.appendChild(tb);

  /* evaluaciones guardadas */
  if (r.applications.length) {
    const chipWrap = document.createElement("div");
    chipWrap.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:18px";
    const lbl = document.createElement("span");
    lbl.style.cssText = "font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em";
    lbl.textContent = "Guardadas:";
    chipWrap.appendChild(lbl);
    for (const app of r.applications) {
      const g = state.groups.find(x => x.id === app.groupId);
      const active = view.applyAppId === app.id;
      const chip = document.createElement("div");
      chip.style.cssText = `display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 12px;background:${active ? "var(--accent)" : "var(--code-bg)"};color:${active ? "#fff" : "var(--fg)"};border:1px solid ${active ? "var(--accent)" : "var(--border)"};border-radius:980px;font-size:12px;cursor:pointer`;
      chip.innerHTML = `<span>${app.name}</span><span style="opacity:.65">${g ? g.name : "?"} · ${app.date || ""}</span>`;
      chip.onclick = () => {
        view.applyGroupId = app.groupId; view.applyAppId = app.id;
        view.applyName = app.name; view.applyDate = app.date;
        renderRubric();
      };
      const delApp = document.createElement("button");
      delApp.className = "tb-btn";
      delApp.style.color = active ? "#fff" : "";
      delApp.innerHTML = svgIcon("trash", 11);
      delApp.onclick = e => {
        e.stopPropagation();
        if (!confirm(`¿Eliminar evaluación "${app.name}"?`)) return;
        r.applications = r.applications.filter(x => x.id !== app.id);
        if (view.applyAppId === app.id) { view.applyAppId = null; view.applyName = ""; }
        save(); renderRubric();
      };
      chip.appendChild(delApp);
      chipWrap.appendChild(chip);
    }
    wrap.appendChild(chipWrap);
  }

  if (!view.applyGroupId) return;
  const group = state.groups.find(g => g.id === view.applyGroupId);
  if (!group) return;
  const students = (group.students || []).filter(s => s && s.id);
  if (!students.length) {
    const p = document.createElement("p");
    p.style.cssText = "color:var(--muted);font-size:14px";
    p.textContent = "Este grupo no tiene alumnos.";
    wrap.appendChild(p); return;
  }

  /* obtener o inicializar la evaluación en curso */
  let app = view.applyAppId ? r.applications.find(a => a.id === view.applyAppId) : null;
  const isExisting = !!app;
  if (!app) {
    app = { id: uid(), groupId: view.applyGroupId, name: "", date: view.applyDate || isoDate(new Date()), scores: {} };
    view.applyAppId = app.id;
  }
  if (!app.scores) app.scores = {};

  /* lista plana: [{ra, inst}] */
  const activeInstruments = [];
  for (const ra of r.ras) {
    for (const inst of (ra.instruments || [])) activeInstruments.push({ ra, inst });
  }

  /* función de cálculo: nota de un RA = media ponderada de sus instrumentos */
  const scoreRef = app.scores;

  function calcRAGrade(ra, stId) {
    const insts = (ra.instruments || []).filter(i => i);
    if (!insts.length) return null;
    const totalInstW = insts.reduce((s, i) => s + (Number(i.weight) || 0), 0);
    let wSum = 0, wTotal = 0;
    for (const inst of insts) {
      const v = scoreRef[stId] && scoreRef[stId][inst.id];
      if (v !== undefined && v !== null && v !== "") {
        const w = totalInstW > 0 ? (Number(inst.weight) || 0) : 1;
        wSum += Number(v) * w;
        wTotal += w;
      }
    }
    return wTotal > 0 ? wSum / wTotal : null;
  }

  function calcFinal(stId) {
    let totalW = 0, weightedSum = 0;
    for (const ra of r.ras) {
      if (!(ra.instruments || []).length) continue;
      const raGrade = calcRAGrade(ra, stId);
      if (raGrade !== null) {
        const w = Number(ra.weight) || 0;
        weightedSum += raGrade * w;
        totalW += w;
      }
    }
    return totalW > 0 ? weightedSum / totalW : null;
  }

  /* tabla de calificaciones */
  const tableWrap = document.createElement("div");
  tableWrap.className = "rubric-apply-grid";
  const table = document.createElement("table");
  table.className = "rubric-apply-table";
  const thead = table.createTHead();

  /* fila 1: "Alumno" | RA spans | "Nota final" */
  const r1 = thead.insertRow();
  const th0 = document.createElement("th");
  th0.rowSpan = 2; th0.textContent = "Alumno"; r1.appendChild(th0);
  for (const ra of r.ras) {
    const insts = (ra.instruments || []);
    if (!insts.length) continue;
    const th = document.createElement("th");
    th.colSpan = insts.length; th.className = "ra-span";
    th.textContent = `${ra.name} (${ra.weight || 0}%)`;
    r1.appendChild(th);
  }
  const thNota = document.createElement("th");
  thNota.rowSpan = 2; thNota.textContent = "Nota final"; thNota.style.minWidth = "72px"; r1.appendChild(thNota);

  /* fila 2: nombres de instrumentos */
  const r2 = thead.insertRow();
  for (const { inst } of activeInstruments) {
    const th = document.createElement("th");
    th.style.cssText = "max-width:110px;font-size:11px;font-weight:500";
    th.innerHTML = `${inst.name}<br><span style="color:var(--muted);font-weight:400">${inst.weight || 0}%</span>`;
    r2.appendChild(th);
  }

  /* body: una fila por alumno */
  const tbody = table.createTBody();

  for (const st of students) {
    if (!scoreRef[st.id]) scoreRef[st.id] = {};
    const tr = tbody.insertRow();
    const tdName = tr.insertCell();
    tdName.textContent = st.name || st.id;
    tdName.style.cssText = "font-weight:500";

    for (const { inst } of activeInstruments) {
      const td = tr.insertCell();
      const inp = document.createElement("input");
      inp.type = "number"; inp.min = "0"; inp.max = "10"; inp.step = "0.1";
      inp.className = "grade-input";
      inp.style.cssText = "width:54px;text-align:center";
      inp.placeholder = "—";
      const cur = scoreRef[st.id][inst.id];
      if (cur !== undefined && cur !== null && cur !== "") inp.value = cur;
      inp.oninput = () => {
        const v = inp.value.trim();
        if (v === "") delete scoreRef[st.id][inst.id];
        else scoreRef[st.id][inst.id] = Math.min(10, Math.max(0, Number(v)));
        refreshFinalCell(tr, st.id);
      };
      td.appendChild(inp);
    }

    /* celda nota final */
    const tdFinal = tr.insertCell();
    tdFinal.className = "apply-final";

    function refreshFinalCell(row, stId) {
      const cell = row.cells[row.cells.length - 1];
      const v = calcFinal(stId);
      if (v === null) { cell.textContent = "—"; cell.className = "apply-final"; }
      else {
        cell.textContent = v.toFixed(1);
        cell.className = "apply-final " + (v >= 5 ? (v >= 8 ? "gr-ok" : "gr-mid") : "gr-low");
      }
    }
    refreshFinalCell(tr, st.id);
  }

  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);

  /* acciones */
  const actRow = document.createElement("div");
  actRow.style.cssText = "display:flex;gap:10px;align-items:center;margin-top:16px;flex-wrap:wrap";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn primary";
  saveBtn.textContent = isExisting ? "Guardar cambios" : "Guardar evaluación";
  saveBtn.onclick = () => {
    app.name = (view.applyName || nameIn.value || "Nueva evaluación").trim() || "Nueva evaluación";
    app.date = view.applyDate || isoDate(new Date());
    app.groupId = view.applyGroupId;
    if (!isExisting) r.applications.push(app);
    save();
    const msg = document.createElement("span");
    msg.style.cssText = "font-size:13px;color:var(--green)";
    msg.textContent = "✓ Guardado";
    actRow.appendChild(msg);
    setTimeout(() => msg.remove(), 2000);
    renderAll();
  };

  const expBtn = document.createElement("button");
  expBtn.className = "btn";
  expBtn.innerHTML = svgIcon("download", 13) + " Exportar CSV";
  expBtn.onclick = () => exportRubricCSV(r, app, students, activeInstruments, calcFinal);

  const sendBtn = document.createElement("button");
  sendBtn.className = "btn";
  sendBtn.innerHTML = svgIcon("check", 13) + " Enviar al calificador";
  sendBtn.title = "Crea una actividad en el calificador del grupo con las notas calculadas";
  sendBtn.onclick = () => pushRubricToGradebook(r, app, group, students, calcFinal, actRow);

  actRow.append(saveBtn, expBtn, sendBtn);
  wrap.appendChild(actRow);
}

/* ---- Modal RA (nombre + peso) ---- */
function openRAModal(r, ra) {
  const isNew = !ra;
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <h3>${isNew ? "Nuevo Resultado de Aprendizaje" : "Editar RA"}</h3>
    <label>Nombre del RA</label>
    <input id="ra-name" type="text"
      placeholder="Ej. RA1 – Desarrolla programas con estructuras de control"
      value="${ra ? (ra.name || "").replace(/"/g, "&quot;") : ""}">
    <label>Peso en la nota final (%)</label>
    <input id="ra-weight" type="number" min="0" max="100" step="5"
      value="${ra ? (ra.weight || 0) : 0}" placeholder="0–100">
    <div class="modal-btns">
      <button class="btn" id="ra-cancel">Cancelar</button>
      <button class="btn primary" id="ra-save">${isNew ? "Crear RA" : "Guardar"}</button>
    </div>`;
  openModal(m);
  m.querySelector("#ra-cancel").onclick = closeModal;
  m.querySelector("#ra-save").onclick = () => {
    const name = m.querySelector("#ra-name").value.trim();
    if (!name) { m.querySelector("#ra-name").focus(); return; }
    const weight = Math.max(0, Math.min(100, Number(m.querySelector("#ra-weight").value) || 0));
    if (isNew) {
      r.ras.push({ id: uid(), name, weight, instruments: [] });
    } else {
      ra.name = name; ra.weight = weight;
    }
    save(); closeModal(); renderRubric();
  };
  setTimeout(() => m.querySelector("#ra-name").focus(), 50);
}

/* ---- Modal Instrumento ---- */
const INSTRUMENT_TYPES = [
  "Examen escrito", "Examen oral", "Trabajo", "Prácticas",
  "Proyecto", "Exposición oral", "Portfolio", "Actitud/Participación", "Otro",
];

function openInstrumentModal(r, ra, inst) {
  const isNew = !inst;
  const m = document.createElement("div");
  m.className = "modal";
  const typeOpts = INSTRUMENT_TYPES
    .map(t => `<option${inst && inst.name === t ? " selected" : ""}>${t}</option>`)
    .join("");
  m.innerHTML = `
    <h3>${isNew ? "Nuevo instrumento" : "Editar instrumento"}</h3>
    <label>Tipo de instrumento</label>
    <select id="inst-type">
      <option value="">— Seleccionar tipo —</option>${typeOpts}
    </select>
    <label>Nombre personalizado (opcional)</label>
    <input id="inst-name" type="text" placeholder="Ej. Examen T3, Práctica de redes…"
      value="${inst ? (inst.name || "").replace(/"/g, "&quot;") : ""}">
    <label>Peso dentro del RA (%)</label>
    <input id="inst-weight" type="number" min="0" max="100" step="5"
      value="${inst ? (inst.weight || 0) : 0}" placeholder="0–100">
    <div class="modal-btns">
      <button class="btn" id="inst-cancel">Cancelar</button>
      <button class="btn primary" id="inst-save">${isNew ? "Añadir" : "Guardar"}</button>
    </div>`;
  openModal(m);

  const typeEl = m.querySelector("#inst-type");
  const nameEl = m.querySelector("#inst-name");
  typeEl.onchange = () => { if (typeEl.value && !nameEl.value) nameEl.placeholder = typeEl.value; };

  m.querySelector("#inst-cancel").onclick = closeModal;
  m.querySelector("#inst-save").onclick = () => {
    const name = (nameEl.value.trim() || typeEl.value).trim();
    if (!name) { nameEl.focus(); return; }
    const weight = Math.max(0, Math.min(100, Number(m.querySelector("#inst-weight").value) || 0));
    if (isNew) {
      if (!ra.instruments) ra.instruments = [];
      ra.instruments.push({ id: uid(), name, weight });
    } else {
      inst.name = name; inst.weight = weight;
    }
    save(); closeModal(); renderRubric();
  };
  setTimeout(() => typeEl.focus(), 50);
}

/* ---- Exportar evaluación a CSV ---- */
function exportRubricCSV(r, app, students, activeInstruments, calcFinal) {
  const sep = ";";
  const scoreRef = app.scores || {};
  const rows = [];
  rows.push(["Alumno", ...activeInstruments.map(({ inst }) => inst.name), "Nota final"].join(sep));
  for (const st of students) {
    const stS = scoreRef[st.id] || {};
    const cols = activeInstruments.map(({ inst }) => {
      const v = stS[inst.id];
      return (v !== undefined && v !== null && v !== "") ? v : "";
    });
    const final = calcFinal(st.id);
    rows.push([st.name || st.id, ...cols, final !== null ? final.toFixed(1) : ""].join(sep));
  }
  const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `rubrica-${(r.name || "sin-nombre").replace(/\s+/g, "-")}-${(app.name || "eval").replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------- Atajos globales e init ---------------- */

document.addEventListener("keydown", e => {
  if (!elPresent.hidden) {
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); nav(1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); nav(-1); }
    else if (e.key === "Escape") exitPresentation();
    return;
  }
  if (!elOverlay.hidden && e.key === "Escape") { closeModal(); return; }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    openSearch();
  }
});

/* iconos de la interfaz */
$(".sb-brand-icon").innerHTML = svgIcon("book", 18);
$("#btn-today .sb-item-icon").innerHTML = svgIcon("home");
$("#btn-search .sb-item-icon").innerHTML = svgIcon("search");
$("#btn-agenda .sb-item-icon").innerHTML = svgIcon("calendar");
$("#btn-tasks .sb-item-icon").innerHTML = svgIcon("check");
$("#btn-github .sb-item-icon").innerHTML = svgIcon("cloud");
$("#btn-backup .sb-item-icon").innerHTML = svgIcon("archive");
$("#btn-rubrics .sb-item-icon").innerHTML = svgIcon("grid");

$("#btn-search").onclick = openSearch;
$("#btn-today").onclick = () => { view = { kind: "today" }; renderAll(); };
$("#btn-new-group").onclick = () => openGroupModal(null);
$("#btn-agenda").onclick = () => {
  if (view.kind === "agenda") {
    monthStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
    view = { kind: "month" };
  } else if (view.kind === "month") {
    weekStart = mondayOf(new Date(monthStart.getFullYear(), monthStart.getMonth(), 1));
    view = { kind: "agenda" };
  } else {
    monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    view = { kind: "month" };
  }
  renderAll();
};
$("#btn-tasks").onclick = () => { view = { kind: "tasks" }; renderAll(); };
$("#btn-rubrics").onclick = () => { view = { kind: "rubrics" }; renderAll(); };
$("#btn-backup").onclick = openBackupModal;
$("#btn-github").onclick = openGitHubModal;
$("#btn-new-subject").onclick = () => openSubjectModal(null);
$("#btn-new-page").onclick = () => createPage(null);
$("#btn-theme").onclick = () => {
  state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
  save();
  applyTheme();
};

window.addEventListener("beforeunload", save);

renderAll();

