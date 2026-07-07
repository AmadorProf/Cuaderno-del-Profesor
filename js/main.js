/* ==========================================================================
   Cuaderno del Profesor — Atajos globales, cableado de la interfaz y arranque.
   Script clásico sin módulos (funciona sobre file://); el orden de carga
   lo define index.html.
   ========================================================================== */

"use strict";

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

/* menú lateral deslizante en pantallas pequeñas */
$("#btn-hamburger").onclick = () => document.body.classList.toggle("sidebar-open");
$("#sb-backdrop").onclick = () => document.body.classList.remove("sidebar-open");

/* clic en enlaces wiki y en #etiquetas, en cualquier vista */
document.addEventListener("click", e => {
  const a = e.target.closest("a[data-wiki]");
  if (a) {
    e.preventDefault();
    const pg = getPage(a.getAttribute("data-wiki"));
    if (!pg) { alert("La página enlazada ya no existe."); return; }
    if (!elPresent.hidden) exitPresentation();
    navigateToPage(pg.id);
    return;
  }
  const tag = e.target.closest(".hashtag");
  if (tag && tag.dataset.tag) {
    e.preventDefault();
    view = { kind: "tag", tag: tag.dataset.tag };
    renderAll();
  }
});

window.addEventListener("beforeunload", () => {
  if (!state) return;
  save();
  snapshotPage(currentPage());
  /* copia de emergencia: la escritura en IndexedDB durante el cierre no está
     garantizada; si el estado cabe en localStorage, se deja también ahí */
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* demasiado grande: solo IndexedDB */ }
});

/* instantánea periódica de la página abierta para el historial */
setInterval(() => { if (state) snapshotPage(currentPage()); }, 5 * 60000);

/* ---------------- Arranque ----------------
   La carga es asíncrona (IndexedDB). En el primer arranque tras la
   actualización se migran los datos existentes de localStorage. */

async function initApp() {
  _db = await idbOpen();

  /* el estado puede vivir en IndexedDB y/o en localStorage (datos antiguos o
     copia de emergencia del cierre): se elige la copia más reciente */
  const fromIdb = _db ? await idbGet("state") : undefined;
  let fromLs = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) fromLs = JSON.parse(raw);
  } catch (e) { console.warn("No se pudo leer la copia de localStorage:", e); }
  let data = fromIdb || null;
  if (fromLs && (!data || (Number(fromLs.savedAt) || 0) > (Number(data.savedAt) || 0))) data = fromLs;

  state = normalizeState(data || seedData());
  _versions = (await storageGet("versions", VERSIONS_LS_KEY)) || {};
  save(); /* persiste migración/saneado (y copia los datos heredados a IndexedDB) */
  renderAll();
}

const appReady = initApp();
