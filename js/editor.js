/* ==========================================================================
   Cuaderno del Profesor — Editor de bloques: cursor, plantillas, render, eventos, menú /, enlaces wiki y modales.
   Script clásico sin módulos (funciona sobre file://); el orden de carga
   lo define index.html.
   ========================================================================== */

"use strict";

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

/* tipos de destacado (callout), estilo Obsidian */
const CALLOUT_KINDS = {
  info: { emoji: "ℹ️", name: "Información" },
  idea: { emoji: "💡", name: "Idea" },
  ok: { emoji: "✅", name: "Éxito" },
  warn: { emoji: "⚠️", name: "Aviso" },
  danger: { emoji: "🚫", name: "Importante" },
  question: { emoji: "❓", name: "Pregunta" },
};
const calloutKind = b => CALLOUT_KINDS[b.kind] ? b.kind : "info";

/* bloques de recursos (sin texto editable, como la imagen) */
const RESOURCE_TYPES = ["video", "audio", "embed", "bookmark"];
const NON_TEXT_TYPES = ["divider", "image", "table", "pageembed", ...RESOURCE_TYPES];
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

/* ---------------- Página incrustada (transclusión) ---------------- */

/* render compacto de solo lectura de un bloque (para incrustar y vista de etiquetas) */
function staticBlockEl(b, num, depth) {
  const d = document.createElement("div");
  d.className = "st-block st-" + b.type;
  d.style.marginLeft = (b.indent || 0) * 18 + "px";
  switch (b.type) {
    case "todo":
      d.innerHTML = `<span class="st-check">${b.checked ? "☑" : "☐"}</span> <span class="${b.checked ? "st-done" : ""}">${decorateHtml(b.html)}</span>`;
      break;
    case "bullet": d.innerHTML = "•&nbsp; " + decorateHtml(b.html); break;
    case "number": d.innerHTML = `${num}.&nbsp; ` + decorateHtml(b.html); break;
    case "toggle": d.innerHTML = "▸ " + decorateHtml(b.html); break;
    case "callout": d.innerHTML = CALLOUT_KINDS[calloutKind(b)].emoji + " " + decorateHtml(b.html); break;
    case "code": d.innerHTML = highlightCode(b.html, b.lang); break;
    case "divider": d.innerHTML = "<hr>"; break;
    case "image":
      if (b.html) { const i = document.createElement("img"); i.src = b.html; d.appendChild(i); }
      break;
    case "table": {
      const tbl = document.createElement("table");
      tbl.className = "bk-table";
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
    case "pageembed": {
      if (depth < 2) { d.appendChild(pageEmbedEl(b, depth)); break; }
      const t = b.pageId && getPage(b.pageId);
      if (t) d.innerHTML = `<a href="#" data-wiki="${t.id}">${esc(t.icon || "📄")} ${esc(t.title || "Sin título")}</a>`;
      break;
    }
    case "video": case "audio": case "embed": case "bookmark":
      if (b.html) d.appendChild(resourceEl(b));
      break;
    default: d.innerHTML = decorateHtml(b.html);
  }
  return d;
}

function pageEmbedEl(b, depth) {
  const box = document.createElement("div");
  box.className = "bk-pageembed";
  const target = b.pageId && getPage(b.pageId);
  if (!target) {
    const ph = document.createElement("button");
    ph.className = "bk-img-placeholder";
    ph.textContent = b.pageId ? "La página incrustada ya no existe. Elegir otra…" : "Elegir página para incrustar";
    box.appendChild(ph);
    return box;
  }
  const head = document.createElement("a");
  head.className = "pe-head";
  head.href = "#";
  head.setAttribute("data-wiki", target.id);
  head.contentEditable = "false";
  head.innerHTML = `${esc(target.icon || "📄")} ${esc(target.title || "Sin título")} <span class="pe-tag">incrustada</span>`;
  box.appendChild(head);
  const body = document.createElement("div");
  body.className = "pe-body";
  let n = 0;
  target.blocks.forEach(tb => {
    n = tb.type === "number" ? n + 1 : 0;
    body.appendChild(staticBlockEl(tb, n, depth + 1));
  });
  box.appendChild(body);
  return box;
}

function openPageEmbedModal(block) {
  const m = document.createElement("div");
  m.className = "modal search-modal";
  m.innerHTML = `
    <input type="text" id="pe-input" placeholder="Buscar la página que quieres incrustar…">
    <div class="search-results" id="pe-results"></div>`;
  openModal(m);

  const input = m.querySelector("#pe-input");
  const results = m.querySelector("#pe-results");
  const cur = currentPage();
  let sel = 0, matches = [];

  const pick = p => {
    block.pageId = p.id;
    closeModal();
    commit(renderEditor);
  };

  function run() {
    const q = norm(input.value.trim());
    matches = state.pages.filter(p => p !== cur && (!q || norm(p.title).includes(q))).slice(0, 30);
    sel = 0;
    paint();
  }
  function paint() {
    results.innerHTML = "";
    if (!matches.length) {
      results.innerHTML = '<div class="search-none">Sin resultados</div>';
      return;
    }
    matches.forEach((p, i) => {
      const d = document.createElement("div");
      d.className = "search-result" + (i === sel ? " sel" : "");
      d.innerHTML = `<div class="sr-title">${esc(p.icon || "📄")} ${esc(p.title || "Sin título")}</div>`;
      d.onclick = () => pick(p);
      results.appendChild(d);
    });
  }
  input.addEventListener("input", run);
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, matches.length - 1); paint(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); paint(); }
    else if (e.key === "Enter" && matches[sel]) pick(matches[sel]);
    else if (e.key === "Escape") closeModal();
  });
  run();
}

/* texto plano de un bloque, para búsquedas */
function blockText(b) {
  if (b.type === "table") return (b.rows || []).flat().map(htmlToText).join(" ");
  if (b.type === "image") return "";
  if (b.type === "pageembed") {
    const t = b.pageId && getPage(b.pageId);
    return t ? (t.title || "") : "";
  }
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
        commit();
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

  /* backlinks: páginas que enlazan aquí */
  const backs = backlinksTo(p.id);
  if (backs.length) {
    const bl = document.createElement("div");
    bl.className = "backlinks";
    bl.innerHTML = `<div class="bl-title">${svgIcon("link", 13)} ${backs.length} página${backs.length === 1 ? "" : "s"} enlaza${backs.length === 1 ? "" : "n"} aquí</div>`;
    backs.forEach(({ page, snippet }) => {
      const row = document.createElement("div");
      row.className = "bl-row";
      row.innerHTML = `<span class="bl-page">${esc(page.icon || "📄")} ${esc(page.title || "Sin título")}</span>` +
        (snippet ? `<span class="bl-snippet">${esc(snippet)}</span>` : "");
      row.onclick = () => navigateToPage(page.id);
      bl.appendChild(row);
    });
    ed.appendChild(bl);
  }

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

  if (b.type === "pageembed") {
    row.appendChild(pageEmbedEl(b, 0));
    const del = document.createElement("button");
    del.className = "bk-del";
    del.textContent = "✕";
    del.title = "Eliminar (la página original no se borra)";
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
    const kind = calloutKind(b);
    row.classList.add("co-" + kind);
    const ic = document.createElement("button");
    ic.className = "bk-callout-icon";
    ic.textContent = CALLOUT_KINDS[kind].emoji;
    ic.title = "Cambiar tipo de destacado";
    row.appendChild(ic);
  }

  const content = document.createElement("div");
  content.className = "block-content";
  content.contentEditable = "true";
  content.spellcheck = false;
  content.dataset.id = b.id;
  content.dataset.ph = BLOCK_PH[b.type] || "";
  if (b.type === "code") content.innerHTML = highlightCode(b.html, b.lang);
  else content.innerHTML = decorateHtml(b.html);
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
  b.html = stripDecor(el.innerHTML);
  saveSoon();

  const bar = elContent.querySelector(".tpl-bar");
  if (bar && !isEmptyHtml(b.html)) bar.remove();

  /* conversiones instantáneas */
  if (b.type === "text") {
    const t = el.textContent;
    if (t === "---") { b.type = "divider"; b.html = ""; rerenderWithNextFocus(b); return; }
    if (t === "```") { b.type = "code"; b.html = ""; rerender(b.id, 0); return; }
  }
  maybeWiki(el, b);
  if (!wiki.openFor) maybeSlash(el, b);
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
  /* navegación del menú de enlaces wiki [[ */
  if (wiki.openFor) {
    if (e.key === "ArrowDown") { e.preventDefault(); wikiMove(1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); wikiMove(-1); return; }
    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); wikiApply(); return; }
    if (e.key === "Escape") { e.preventDefault(); closeWiki(); return; }
  }

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
      if (prev.type === "divider" || prev.type === "image" || prev.type === "pageembed" || RESOURCE_TYPES.includes(prev.type)) {
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
    else if (b.type === "pageembed") openPageEmbedModal(b);
    else openResourceModal(b);
    return;
  }
  if (e.target.classList.contains("bk-callout-icon")) {
    openCalloutKindPicker(e.target, b);
    return;
  }
}

/* selector del tipo de destacado */
function openCalloutKindPicker(anchor, b) {
  const pop = $("#popover");
  pop.innerHTML = "";
  Object.entries(CALLOUT_KINDS).forEach(([k, def]) => {
    const d = document.createElement("div");
    d.className = "slash-item" + (calloutKind(b) === k ? " sel" : "");
    d.innerHTML = `<span class="slash-icon">${def.emoji}</span><span class="slash-label">${def.name}</span>`;
    d.onclick = () => {
      b.kind = k;
      pop.hidden = true;
      save();
      rerender(b.id, "end");
    };
    pop.appendChild(d);
  });
  pop.hidden = false;
  const r = anchor.getBoundingClientRect();
  pop.style.top = Math.min(r.bottom + 6, innerHeight - 260) + "px";
  pop.style.left = Math.min(r.left, innerWidth - 300) + "px";
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
  { t: "pageembed", icon: "⿻", label: "Página incrustada", kw: "pagina incrustada transclusion wiki subpagina reutilizar" },
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
  if (item.t === "image" || item.t === "pageembed" || RESOURCE_TYPES.includes(item.t)) {
    const openFn = bk => item.t === "image" ? openImageModal(bk)
      : item.t === "pageembed" ? openPageEmbedModal(bk)
      : openResourceModal(bk);
    if (isEmptyHtml(b.html)) {
      b.type = item.t;
      b.html = "";
      commit(renderEditor); openFn(b);
    } else {
      const nb = mkBlock(item.t, "");
      nb.indent = b.indent;
      insertBlockAfter(b.id, nb);
      commit(renderEditor); openFn(nb);
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
  if (!elSlash.hidden && !elSlash.contains(e.target)) { closeSlash(); closeWiki(); }
  const pop = $("#popover");
  if (!pop.hidden && !pop.contains(e.target)) pop.hidden = true;
});

/* ---------------- Enlaces wiki [[ ---------------- */

let wiki = { openFor: null, start: 0, query: "", sel: 0, items: [] };

function maybeWiki(el, b) {
  if (b.type === "code") return closeWiki();
  const off = getCaretOffset(el);
  const text = el.textContent.slice(0, off);
  const idx = text.lastIndexOf("[[");
  if (idx === -1) return closeWiki();
  const q = text.slice(idx + 2);
  if (q.length > 40 || /[\n\]]/.test(q)) return closeWiki();
  openWikiMenu(el, b, idx, q);
}

function openWikiMenu(el, b, start, query) {
  const nq = norm(query);
  const items = state.pages
    .filter(p => !nq || norm(p.title).includes(nq))
    .slice(0, 8)
    .map(p => ({ page: p }));
  const q = query.trim();
  if (q && !state.pages.some(p => norm(p.title) === norm(q))) items.push({ create: q });
  wiki = { openFor: b.id, start, query, sel: 0, items };
  closeSlash();
  elSlash.hidden = false;
  renderWikiMenu();

  const sel = getSelection();
  let rect = null;
  if (sel.rangeCount) rect = sel.getRangeAt(0).getBoundingClientRect();
  if (!rect || (rect.x === 0 && rect.y === 0)) rect = el.getBoundingClientRect();
  elSlash.style.top = Math.min(rect.bottom + 6, innerHeight - 330) + "px";
  elSlash.style.left = Math.min(Math.max(rect.left, 10), innerWidth - 280) + "px";
}

function renderWikiMenu() {
  if (!wiki.items.length) {
    elSlash.innerHTML = '<div class="slash-empty">Sin páginas</div>';
    return;
  }
  elSlash.innerHTML = "";
  wiki.items.forEach((it, i) => {
    const d = document.createElement("div");
    d.className = "slash-item" + (i === wiki.sel ? " sel" : "");
    d.innerHTML = it.page
      ? `<span class="slash-icon">${esc(it.page.icon || "📄")}</span><span class="slash-label">${esc(it.page.title || "Sin título")}</span>`
      : `<span class="slash-icon">＋</span><span class="slash-label">Crear «${esc(it.create)}»</span>`;
    d.onmousedown = e => { e.preventDefault(); wiki.sel = i; wikiApply(); };
    elSlash.appendChild(d);
  });
  const selEl = elSlash.children[wiki.sel];
  if (selEl) selEl.scrollIntoView({ block: "nearest" });
}

function wikiMove(dir) {
  if (!wiki.items.length) return;
  wiki.sel = (wiki.sel + dir + wiki.items.length) % wiki.items.length;
  renderWikiMenu();
}

function closeWiki() {
  if (!wiki.openFor) return;
  wiki.openFor = null;
  if (!slash.openFor) elSlash.hidden = true;
}

function wikiApply() {
  const item = wiki.items[wiki.sel];
  const b = findBlock(wiki.openFor);
  if (!item || !b) return closeWiki();
  const el = elContent.querySelector(`.block-content[data-id="${b.id}"]`);

  let page = item.page;
  if (!page) {
    page = { id: uid(), title: item.create, icon: "📄", parentId: null, open: true, blocks: [mkBlock("text", "")] };
    state.pages.push(page);
    rebuildMaps();
  }

  /* sustituir "[[consulta" por el enlace */
  const r = rangeFromOffsets(el, wiki.start, wiki.start + 2 + wiki.query.length);
  r.deleteContents();
  const a = document.createElement("a");
  a.setAttribute("data-wiki", page.id);
  a.setAttribute("href", "#");
  a.textContent = page.title || "Sin título";
  r.insertNode(a);
  a.insertAdjacentText("afterend", " ");

  const caretAfter = wiki.start + a.textContent.length + 1;
  b.html = sanitize(el.innerHTML);
  closeWiki();
  rerender(b.id, caretAfter);
}

/* páginas que enlazan a una página (backlinks) */
function backlinksTo(id) {
  const out = [];
  const needle = `data-wiki="${id}"`;
  state.pages.forEach(pg => {
    if (pg.id === id) return;
    const hit = pg.blocks.find(b =>
      (typeof b.html === "string" && b.html.includes(needle)) ||
      (b.type === "pageembed" && b.pageId === id));
    if (hit) out.push({ page: pg, snippet: blockText(hit).slice(0, 100) });
  });
  return out;
}

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
      commit();
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
    commit();
  }));
  if (page.subjectId) mkRow("Sin asignatura", null, () => {
    page.subjectId = null;
    pop.hidden = true;
    commit();
  });
  mkRow("＋ Nueva asignatura…", null, () => {
    pop.hidden = true;
    openSubjectModal(null, ns => { page.subjectId = ns.id; commit(); });
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
    commit(renderEditor);
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
    commit(renderEditor);
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
