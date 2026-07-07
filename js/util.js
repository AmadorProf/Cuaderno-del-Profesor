/* ==========================================================================
   Cuaderno del Profesor — Utilidades: helpers, sanitizado, etiquetas, iconos, resaltado, fechas.
   Script clásico sin módulos (funciona sobre file://); el orden de carga
   lo define index.html.
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

/* escapar texto para insertarlo en innerHTML */
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/* Documento inerte para parsear HTML no confiable: aquí dentro no se ejecutan
   scripts, no se disparan manejadores (onerror…) y no se cargan recursos.
   Asignar HTML de origen dudoso a innerHTML de un div del documento vivo,
   aunque esté desconectado, SÍ ejecuta cargas como <img onerror=…>. */
const _inertDoc = document.implementation.createHTMLDocument("");

function inertDiv(html) {
  const d = _inertDoc.createElement("div");
  d.innerHTML = html || "";
  return d;
}

function htmlToText(html) {
  return inertDiv(html).textContent;
}

function isEmptyHtml(html) {
  const d = inertDiv(html);
  return d.textContent.trim() === "" && !d.querySelector("img");
}

const ALLOWED_TAGS = new Set(["B", "I", "U", "S", "EM", "STRONG", "A", "CODE", "BR"]);

function sanitize(html) {
  const d = inertDiv(html);
  (function clean(node) {
    [...node.children].forEach(el => {
      clean(el);
      if (!ALLOWED_TAGS.has(el.tagName)) {
        while (el.firstChild) node.insertBefore(el.firstChild, el);
        el.remove();
      } else {
        [...el.attributes].forEach(a => {
          if (!(el.tagName === "A" && (a.name === "href" || a.name === "data-wiki"))) el.removeAttribute(a.name);
        });
        /* solo esquemas seguros en los enlaces */
        if (el.tagName === "A" && el.hasAttribute("href") &&
            !/^(https?:|mailto:|#|\/)/i.test(el.getAttribute("href").trim())) {
          el.removeAttribute("href");
        }
      }
    });
  })(d);
  return d.innerHTML;
}

/* ---------------- Etiquetas #tag ---------------- */

const TAG_RE = /(^|[\s(>])#([\p{L}\p{N}_-]+)/gu;

/* envuelve las #etiquetas de un html en <span class="hashtag"> (solo para mostrar) */
function decorateHtml(html) {
  if (!html || !html.includes("#")) return html || "";
  const d = inertDiv(html);
  const walker = _inertDoc.createTreeWalker(d, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentElement && n.parentElement.closest("a, code, .hashtag")
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) if (n.nodeValue.includes("#")) nodes.push(n);
  nodes.forEach(node => {
    const text = node.nodeValue;
    const re = new RegExp(TAG_RE.source, "gu");
    let m, last = 0, hit = false;
    const frag = _inertDoc.createDocumentFragment();
    while ((m = re.exec(text))) {
      hit = true;
      frag.appendChild(_inertDoc.createTextNode(text.slice(last, m.index) + m[1]));
      const span = _inertDoc.createElement("span");
      span.className = "hashtag";
      span.dataset.tag = m[2].toLowerCase();
      span.textContent = "#" + m[2];
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (!hit) return;
    frag.appendChild(_inertDoc.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  });
  return d.innerHTML;
}

/* quita los <span class="hashtag"> antes de guardar (el dato queda limpio) */
function stripDecor(html) {
  if (!html || !html.includes("hashtag")) return html || "";
  const d = inertDiv(html);
  d.querySelectorAll("span.hashtag").forEach(el => {
    while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
    el.remove();
  });
  return d.innerHTML;
}

/* etiquetas presentes en un bloque (en minúsculas) */
function blockTags(b) {
  const out = [];
  const re = new RegExp(TAG_RE.source, "gu");
  const t = blockText(b);
  let m;
  while ((m = re.exec(t))) out.push(m[2].toLowerCase());
  return out;
}

function allTags() {
  const counts = new Map();
  state.pages.forEach(pg => pg.blocks.forEach(b =>
    blockTags(b).forEach(t => counts.set(t, (counts.get(t) || 0) + 1))));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
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
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  board: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>',
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

const $ = sel => document.querySelector(sel);
