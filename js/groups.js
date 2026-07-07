/* ==========================================================================
   Cuaderno del Profesor — Grupos: alumnos, pase de lista, calificaciones y selector al azar.
   Script clásico sin módulos (funciona sobre file://); el orden de carga
   lo define index.html.
   ========================================================================== */

"use strict";

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
    commit();
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
  commit();
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
      commit(renderGroup);
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
    commit(renderGroup);
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
    commit(renderGroup);
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
      commit(renderGroup);
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
    commit(renderGroup);
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
