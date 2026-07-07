/* ==========================================================================
   Cuaderno del Profesor — Interfaz general: render principal, barra lateral, historial de versiones, topbar e índice.
   Script clásico sin módulos (funciona sobre file://); el orden de carga
   lo define index.html.
   ========================================================================== */

"use strict";

/* ---------------- Render: shell ---------------- */

const elTree = $("#page-tree");
const elTopbar = $("#topbar");
const elContent = $("#content");

function renderAll() {
  applyTheme();
  renderSidebar();
  renderTopbar();
  renderView();
  document.body.classList.remove("sidebar-open"); /* cerrar el menú móvil al navegar */
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
  if (!roots.length) {
    elTree.innerHTML = '<div class="sb-empty">Sin páginas. Pulsa +</div>';
  } else {
    const frag = document.createDocumentFragment();
    roots.forEach(p => frag.appendChild(pageRow(p)));
    elTree.appendChild(frag);
  }
  /* favoritos */
  const favs = state.pages.filter(p => p.starred);
  $("#fav-section").hidden = !favs.length;
  const fl = $("#fav-list");
  fl.innerHTML = "";
  favs.forEach(p => {
    const row = document.createElement("div");
    row.className = "pg-row" + (view.kind === "page" && view.pageId === p.id ? " active" : "");
    const iconEl = document.createElement("span");
    iconEl.className = "pg-icon";
    if (p.icon && p.icon !== "📄") iconEl.textContent = p.icon;
    else { iconEl.classList.add("mono-ic"); iconEl.innerHTML = svgIcon("file", 14); }
    const title = document.createElement("span");
    title.className = "pg-title";
    title.textContent = p.title || "Sin título";
    row.append(iconEl, title);
    row.onclick = () => navigateToPage(p.id);
    fl.appendChild(row);
  });

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
    subjectId: src.subjectId || null,
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
  commit();
}

/* ---------------- Historial de versiones por página ---------------- */

const MAX_VERSIONS = 12;

/* caché en memoria; se carga en initApp() y se persiste con el adaptador */
let _versions = {};

function loadVersions() { return _versions; }
function saveVersions(all) {
  _versions = all;
  storageSet("versions", VERSIONS_LS_KEY, all);
}

/* guarda una instantánea de la página si su contenido cambió desde la última */
function snapshotPage(p) {
  if (!p) return;
  const all = loadVersions();
  const arr = all[p.id] || [];
  const s = JSON.stringify(p.blocks);
  if (arr.length && arr[arr.length - 1].s === s) return;
  arr.push({ t: Date.now(), title: p.title || "", s });
  while (arr.length > MAX_VERSIONS) arr.shift();
  all[p.id] = arr;
  Object.keys(all).forEach(id => { if (!getPage(id)) delete all[id]; });
  saveVersions(all);
}

function openHistoryModal(p) {
  const m = document.createElement("div");
  m.className = "modal";
  const arr = (loadVersions()[p.id] || []).slice().reverse();
  m.innerHTML = `
    <h3>Historial de versiones</h3>
    <p class="modal-note">Se guarda una copia de la página al abrirla y cada pocos minutos mientras la editas.
    Restaurar una versión no borra nada: la versión actual también se guarda en el historial.</p>
    <div class="hist-list"></div>
    <div class="modal-btns"><button class="btn" id="hist-close">Cerrar</button></div>`;
  const list = m.querySelector(".hist-list");
  if (!arr.length) {
    list.innerHTML = '<p class="modal-note">Aún no hay versiones guardadas de esta página.</p>';
  }
  arr.forEach(v => {
    const row = document.createElement("div");
    row.className = "hist-row";
    const when = new Date(v.t).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    let blocks = [];
    try { blocks = JSON.parse(v.s); } catch { /* versión corrupta */ }
    row.innerHTML = `<span class="hist-when">${when}</span><span class="hist-info">${esc(v.title || "Sin título")} · ${blocks.length} bloque${blocks.length === 1 ? "" : "s"}</span>`;
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "Restaurar";
    btn.onclick = () => {
      if (!blocks.length && !confirm("Esta versión está vacía. ¿Restaurar igualmente?")) return;
      if (!confirm(`¿Restaurar la versión del ${when}?`)) return;
      snapshotPage(p); /* conservar el estado actual antes de pisarlo */
      p.blocks = blocks.map(b => ({ ...b }));
      save();
      closeModal();
      renderAll();
    };
    row.appendChild(btn);
    list.appendChild(row);
  });
  m.querySelector("#hist-close").onclick = closeModal;
  openModal(m);
}

function navigateToPage(id, focusTitle = false) {
  snapshotPage(getPage(id));
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
    else if (view.kind === "tag") c.textContent = "#" + view.tag;
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

  const starBtn = document.createElement("button");
  starBtn.className = "tb-btn tb-star" + (p.starred ? " on" : "");
  starBtn.innerHTML = svgIcon("star", 14);
  starBtn.title = p.starred ? "Quitar de favoritos" : "Añadir a favoritos";
  starBtn.onclick = () => {
    p.starred = !p.starred;
    commit(renderTopbar);
    renderSidebar();
  };

  const outlineBtn = document.createElement("button");
  outlineBtn.className = "tb-btn";
  outlineBtn.innerHTML = svgIcon("list", 14);
  outlineBtn.title = "Índice de la página";
  outlineBtn.onclick = e => openOutline(e.currentTarget, p);

  const histBtn = document.createElement("button");
  histBtn.className = "tb-btn";
  histBtn.innerHTML = svgIcon("clock", 14);
  histBtn.title = "Historial de versiones";
  histBtn.onclick = () => openHistoryModal(p);

  const exportBtn = document.createElement("button");
  exportBtn.className = "tb-btn";
  exportBtn.innerHTML = svgIcon("download", 14) + " Exportar";
  exportBtn.title = "Descargar como Markdown";
  exportBtn.onclick = exportMarkdown;

  const presentBtn = document.createElement("button");
  presentBtn.className = "tb-btn primary";
  presentBtn.innerHTML = svgIcon("play", 13) + " Presentar";
  presentBtn.onclick = startPresentation;

  elTopbar.append(spacer, starBtn, outlineBtn, histBtn, exportBtn, presentBtn);
}

/* ---------------- Índice de la página (outline) ---------------- */

function openOutline(anchor, p) {
  const pop = $("#popover");
  pop.innerHTML = "";
  const heads = p.blocks.filter(b => ["h1", "h2", "h3"].includes(b.type) && !isEmptyHtml(b.html));
  if (!heads.length) {
    pop.innerHTML = '<div class="slash-empty">Esta página no tiene títulos</div>';
  }
  heads.forEach(b => {
    const d = document.createElement("div");
    d.className = "slash-item ol-" + b.type;
    d.innerHTML = `<span class="slash-label">${esc(htmlToText(b.html))}</span>`;
    d.onclick = () => {
      pop.hidden = true;
      const el = elContent.querySelector(`.block-content[data-id="${b.id}"]`);
      if (!el) return;
      const row = el.closest(".block");
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      row.classList.add("flash");
      setTimeout(() => row.classList.remove("flash"), 1600);
    };
    pop.appendChild(d);
  });
  pop.hidden = false;
  const r = anchor.getBoundingClientRect();
  pop.style.top = Math.min(r.bottom + 6, innerHeight - 320) + "px";
  pop.style.left = Math.min(Math.max(r.left - 160, 10), innerWidth - 300) + "px";
}
