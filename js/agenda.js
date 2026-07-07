/* ==========================================================================
   Cuaderno del Profesor — Búsqueda ⌘K y agenda semanal/mensual con eventos.
   Script clásico sin módulos (funciona sobre file://); el orden de carga
   lo define index.html.
   ========================================================================== */

"use strict";

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

  /* volver a la vista desde la que se abrió el modal (Hoy, mes, asignatura…) */
  const finish = evDate => {
    closeModal();
    save();
    if (view.kind === "agenda" && evDate) {
      weekStart = mondayOf(new Date(evDate + "T00:00"));
      renderAgenda();
    } else if (view.kind === "month" && evDate) {
      monthStart = new Date(new Date(evDate + "T00:00").getFullYear(), new Date(evDate + "T00:00").getMonth(), 1);
      renderMonth();
    } else {
      renderAll();
    }
  };

  m.querySelector("#ev-cancel").onclick = closeModal;
  if (!isNew) {
    m.querySelector("#ev-del").onclick = () => {
      if (!confirm(`¿Eliminar el evento «${ev.title || "(sin título)"}»${ev.repeat === "weekly" ? " y todas sus repeticiones semanales" : ""}?`)) return;
      state.events = state.events.filter(x => x.id !== ev.id);
      finish(null);
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
    finish(date);
  };
  m.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.id === "ev-title") m.querySelector("#ev-save").click(); });
}
