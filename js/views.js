/* ==========================================================================
   Cuaderno del Profesor — Vistas: etiquetas, Hoy, nota diaria, asignaturas, tareas y tablero.
   Script clásico sin módulos (funciona sobre file://); el orden de carga
   lo define index.html.
   ========================================================================== */

"use strict";

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
  else if (view.kind === "tag") renderTagView();
  else renderEditor();
}

/* ---------------- Vista de una etiqueta ---------------- */

function renderTagView() {
  elContent.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "tasks-view";

  const groups = [];
  state.pages.forEach(pg => {
    const hits = pg.blocks.filter(b => blockTags(b).includes(view.tag));
    if (hits.length) groups.push({ pg, hits });
  });
  const total = groups.reduce((n, g) => n + g.hits.length, 0);

  const head = document.createElement("div");
  head.className = "tasks-head";
  head.innerHTML = `<h1>#${esc(view.tag)}</h1><span class="tasks-summary">${total} bloque${total === 1 ? "" : "s"} en ${groups.length} página${groups.length === 1 ? "" : "s"}</span>`;
  wrap.appendChild(head);

  const tags = allTags();
  if (tags.length > 1) {
    const filters = document.createElement("div");
    filters.className = "task-filters";
    tags.forEach(([t, count]) => {
      const c = document.createElement("button");
      c.className = "filter-chip" + (t === view.tag ? " sel" : "");
      c.textContent = `#${t} · ${count}`;
      c.onclick = () => { view = { kind: "tag", tag: t }; renderAll(); };
      filters.appendChild(c);
    });
    wrap.appendChild(filters);
  }

  if (!groups.length) {
    const e = document.createElement("p");
    e.className = "tasks-empty";
    e.textContent = "Ya no hay bloques con esta etiqueta.";
    wrap.appendChild(e);
  }

  groups.forEach(({ pg, hits }) => {
    const sec = document.createElement("div");
    sec.className = "tasks-group";
    const h = document.createElement("div");
    h.className = "tasks-group-title";
    h.textContent = `${pg.icon || "📄"} ${pg.title || "Sin título"}`;
    h.title = "Abrir página";
    h.onclick = () => navigateToPage(pg.id);
    sec.appendChild(h);
    let n = 0;
    hits.forEach(b => {
      n = b.type === "number" ? n + 1 : 0;
      sec.appendChild(staticBlockEl(b, n, 2));
    });
    wrap.appendChild(sec);
  });
  elContent.appendChild(wrap);
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
  const dailyBtn = document.createElement("button");
  dailyBtn.className = "tpl-chip";
  dailyBtn.textContent = "📓 Nota de hoy";
  dailyBtn.title = "Abre (o crea) la página de diario de hoy";
  dailyBtn.onclick = openDailyNote;
  head.appendChild(dailyBtn);
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
    chk.onclick = () => { b.checked = true; commit(renderToday); };
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

/* ---------------- Nota diaria ---------------- */

function openDailyNote() {
  let diary = state.settings.diaryPageId ? getPage(state.settings.diaryPageId) : null;
  if (!diary) diary = state.pages.find(p => !p.parentId && p.title === "Diario de clase");
  if (!diary) {
    diary = {
      id: uid(), title: "Diario de clase", icon: "📓", parentId: null, open: true,
      blocks: [mkBlock("text", "Una página por día. Pulsa «📓 Nota de hoy» en la vista Hoy para crear la del día.")],
    };
    state.pages.push(diary);
  }
  state.settings.diaryPageId = diary.id;

  const dIso = isoDate(new Date());
  let note = childrenOf(diary.id).find(p => (p.title || "").startsWith(dIso));
  if (!note) {
    const label = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    note = {
      id: uid(), title: `${dIso} · ${label}`, icon: "📆", parentId: diary.id, open: true,
      blocks: [mkBlock("h2", "Notas del día"), mkBlock("text", ""), mkBlock("h2", "Tareas"), mkBlock("todo", "")],
    };
    state.pages.push(note);
    diary.open = true;
  }
  save();
  navigateToPage(note.id);
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
    commit();
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
  commit();
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
      chk.onclick = () => { b.checked = true; commit(renderSubject); };
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

  /* alternar Lista / Tablero */
  const mode = state.settings.tasksMode === "board" ? "board" : "list";
  const modeWrap = document.createElement("div");
  modeWrap.className = "task-mode";
  [["list", "Lista", "list"], ["board", "Tablero", "board"]].forEach(([val, label, icn]) => {
    const btn = document.createElement("button");
    btn.className = "filter-chip" + (mode === val ? " sel" : "");
    btn.innerHTML = svgIcon(icn, 13) + " " + label;
    btn.onclick = () => { state.settings.tasksMode = val; saveSoon(); renderTasks(); };
    modeWrap.appendChild(btn);
  });
  head.appendChild(modeWrap);
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

  if (mode === "board") {
    renderTaskBoard(wrap);
    elContent.appendChild(wrap);
    return;
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
      chk.onclick = () => { t.checked = !t.checked; commit(renderTasks); };
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

/* ---------------- Tablero de tareas (tipo Padlet/Trello) ---------------- */

let dragTask = null;

function taskMatchesFilter(pg) {
  return taskFilter === "all" || (taskFilter === "none" ? !pg.subjectId : pg.subjectId === taskFilter);
}

/* página comodín donde caen las tareas creadas directamente en el tablero */
function taskInboxPage() {
  let p = state.settings.inboxPageId ? getPage(state.settings.inboxPageId) : null;
  if (!p) p = state.pages.find(x => !x.parentId && x.title === "Bandeja de tareas");
  if (!p) {
    p = { id: uid(), title: "Bandeja de tareas", icon: "📥", parentId: null, open: true, blocks: [] };
    state.pages.push(p);
  }
  state.settings.inboxPageId = p.id;
  return p;
}

function renderTaskBoard(wrap) {
  const cols = state.taskCols;
  const items = [];
  state.pages.forEach(pg => {
    if (!taskMatchesFilter(pg)) return;
    pg.blocks.forEach(b => { if (b.type === "todo") items.push({ pg, b }); });
  });

  const firstCol = cols[0];
  const doneCol = cols.find(c => c.done);
  const colOf = it => {
    const c = it.b.boardCol && cols.find(x => x.id === it.b.boardCol);
    if (c) return c;
    return it.b.checked && doneCol ? doneCol : firstCol;
  };

  const board = document.createElement("div");
  board.className = "kanban";

  cols.forEach(col => {
    const colEl = document.createElement("div");
    colEl.className = "kb-col";
    const colItems = items.filter(it => colOf(it) === col);

    const headEl = document.createElement("div");
    headEl.className = "kb-head";
    headEl.innerHTML = `<span class="kb-name">${esc(col.name)}</span>` +
      (col.done ? '<span class="kb-doneflag" title="Las tarjetas que caen aquí se marcan como hechas">✓</span>' : "") +
      `<span class="kb-count">${colItems.length}</span>`;
    const cfg = document.createElement("button");
    cfg.className = "kb-cfg";
    cfg.innerHTML = svgIcon("edit", 12);
    cfg.title = "Editar columna";
    cfg.onclick = () => openColumnModal(col);
    headEl.appendChild(cfg);

    const cards = document.createElement("div");
    cards.className = "kb-cards";
    colItems.forEach(it => cards.appendChild(taskCard(it)));

    const addBtn = document.createElement("button");
    addBtn.className = "kb-add";
    addBtn.textContent = "＋ Tarea";
    addBtn.onclick = () => {
      const inp = document.createElement("input");
      inp.className = "kb-add-input";
      inp.placeholder = "Nueva tarea… (Enter)";
      addBtn.replaceWith(inp);
      inp.focus();
      let done = false;
      const commit = () => {
        if (done) return;
        done = true;
        const v = inp.value.trim();
        if (v) {
          const pg = taskInboxPage();
          const nb = mkBlock("todo", esc(v));
          nb.boardCol = col.id;
          nb.checked = !!col.done;
          pg.blocks.push(nb);
          save();
        }
        renderTasks();
      };
      inp.addEventListener("keydown", e => {
        if (e.key === "Enter") commit();
        else if (e.key === "Escape") { done = true; renderTasks(); }
      });
      inp.addEventListener("blur", commit);
    };

    colEl.addEventListener("dragover", e => {
      if (!dragTask) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      colEl.classList.add("drag-over");
    });
    colEl.addEventListener("dragleave", e => {
      if (!colEl.contains(e.relatedTarget)) colEl.classList.remove("drag-over");
    });
    colEl.addEventListener("drop", e => {
      if (!dragTask) return;
      e.preventDefault();
      const it = dragTask;
      dragTask = null;
      it.b.boardCol = col.id;
      it.b.checked = !!col.done;
      commit(renderTasks);
    });

    colEl.append(headEl, cards, addBtn);
    board.appendChild(colEl);
  });

  const addCol = document.createElement("button");
  addCol.className = "kb-addcol";
  addCol.textContent = "＋ Columna";
  addCol.onclick = () => {
    const name = prompt("Nombre de la columna:");
    if (name && name.trim()) {
      state.taskCols.push({ id: uid(), name: name.trim(), done: false });
      commit(renderTasks);
    }
  };
  board.appendChild(addCol);
  wrap.appendChild(board);
}

function taskCard(it) {
  const { pg, b } = it;
  const card = document.createElement("div");
  card.className = "kb-card" + (b.checked ? " done" : "");
  card.draggable = true;
  card.addEventListener("dragstart", e => {
    dragTask = it;
    card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
  });
  card.addEventListener("dragend", () => {
    dragTask = null;
    card.classList.remove("dragging");
    document.querySelectorAll(".kb-col.drag-over").forEach(el => el.classList.remove("drag-over"));
  });

  const top = document.createElement("div");
  top.className = "kb-card-top";
  const chk = document.createElement("div");
  chk.className = "bk-check";
  chk.textContent = b.checked ? "✓" : "";
  chk.onclick = () => {
    b.checked = !b.checked;
    const doneCol = state.taskCols.find(c => c.done);
    if (b.checked && doneCol) b.boardCol = doneCol.id;
    else if (!b.checked && doneCol && b.boardCol === doneCol.id) b.boardCol = state.taskCols[0].id;
    commit(renderTasks);
  };
  const txt = document.createElement("div");
  txt.className = "kb-text";
  txt.innerHTML = decorateHtml(b.html) || '<span class="kb-emptytxt">(sin texto)</span>';
  top.append(chk, txt);

  const src = document.createElement("div");
  src.className = "kb-src";
  const subj = pg.subjectId && getSubjectById(pg.subjectId);
  src.innerHTML = (subj ? `<span class="dot ev-${subj.color}"></span>` : "") +
    esc(`${pg.icon || "📄"} ${pg.title || "Sin título"}`);
  src.title = "Abrir página de origen";
  src.onclick = () => navigateToPage(pg.id);

  card.append(top, src);
  return card;
}

function openColumnModal(col) {
  const m = document.createElement("div");
  m.className = "modal";
  const canDelete = state.taskCols.length > 1;
  m.innerHTML = `
    <h3>Editar columna</h3>
    <label>Nombre</label>
    <input type="text" id="col-name" value="${esc(col.name)}">
    <label class="col-done-label"><input type="checkbox" id="col-done"${col.done ? " checked" : ""}>
      Las tarjetas que caen aquí se marcan como hechas</label>
    <div class="modal-btns">
      ${canDelete ? '<button class="btn danger" id="col-del">Eliminar</button>' : ""}
      <button class="btn" id="col-cancel">Cancelar</button>
      <button class="btn primary" id="col-save">Guardar</button>
    </div>`;
  openModal(m);
  m.querySelector("#col-cancel").onclick = closeModal;
  m.querySelector("#col-save").onclick = () => {
    const name = m.querySelector("#col-name").value.trim();
    if (name) col.name = name;
    col.done = m.querySelector("#col-done").checked;
    save();
    closeModal();
    renderTasks();
  };
  const delBtn = m.querySelector("#col-del");
  if (delBtn) delBtn.onclick = () => {
    if (!confirm(`¿Eliminar la columna «${col.name}»? Sus tarjetas pasan a la primera columna.`)) return;
    state.pages.forEach(pg => pg.blocks.forEach(b => {
      if (b.boardCol === col.id) delete b.boardCol;
    }));
    state.taskCols = state.taskCols.filter(c => c.id !== col.id);
    save();
    closeModal();
    renderTasks();
  };
  m.querySelector("#col-name").addEventListener("keydown", e => {
    if (e.key === "Enter") m.querySelector("#col-save").click();
  });
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
      commit(renderSubject);
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
    commit(renderSubject);
  };
  m.querySelector("#un-name").addEventListener("keydown", e => {
    if (e.key === "Enter") m.querySelector("#un-save").click();
  });
}
