/* ==========================================================================
   Cuaderno del Profesor — Rúbricas: diseño, calificación y exportación.
   Script clásico sin módulos (funciona sobre file://); el orden de carga
   lo define index.html.
   ========================================================================== */

"use strict";

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
      const dotHtml = sub ? `<span class="dot ev-${sub.color || "blue"}" style="margin-right:4px"></span>${esc(sub.name)}` : "Sin asignatura";
      card.innerHTML = `
        <div class="rubric-card-name">${esc(r.name || "Sin nombre")}</div>
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
        commit(renderRubrics);
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
    .map(s => `<option value="${s.id}"${r && r.subjectId === s.id ? " selected" : ""}>${esc(s.name)}</option>`)
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
      commit(renderRubric);
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
          <span class="criterio-name">${esc(inst.name || "Sin nombre")}</span>
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
          commit(renderRubric);
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
    state.groups.map(g => `<option value="${g.id}"${view.applyGroupId === g.id ? " selected" : ""}>${esc(g.name)}</option>`).join("");
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
      chip.innerHTML = `<span>${esc(app.name)}</span><span style="opacity:.65">${g ? esc(g.name) : "?"} · ${esc(app.date || "")}</span>`;
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
        commit(renderRubric);
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
    th.innerHTML = `${esc(inst.name)}<br><span style="color:var(--muted);font-weight:400">${inst.weight || 0}%</span>`;
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
  const blob = new Blob(["﻿" + rows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `rubrica-${(r.name || "sin-nombre").replace(/\s+/g, "-")}-${(app.name || "eval").replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
