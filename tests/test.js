/* ==========================================================================
   Pruebas de humo del Cuaderno del Profesor.
   Se inyectan tras js/main.js en una copia temporal de la app y se ejecutan
   con Chrome headless (ver tests/run.sh). El resultado queda en el <title>
   (ALL-PASS / SOME-FAIL) y el detalle en <pre id="test-out">.
   ========================================================================== */

"use strict";

(async () => {
  const out = [];
  async function t(name, fn) {
    try { await fn(); out.push("PASS " + name); }
    catch (e) { out.push("FAIL " + name + ": " + (e && e.message)); }
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  await appReady;
  out.push("· backend de almacenamiento: " + (_db ? "IndexedDB" : "localStorage (reserva)"));

  /* ---------- arquitectura: persistencia, esquema, frontera ---------- */

  await t("estado cargado con versión de esquema actual", () => {
    if (!state) throw Error("state nulo");
    if (state.version !== SCHEMA_VERSION) throw Error("version=" + state.version);
  });

  await t("migración de esquema v1 → v" + SCHEMA_VERSION, () => {
    const d = { pages: [] };
    normalizeState(d);
    if (d.version !== SCHEMA_VERSION) throw Error("version=" + d.version);
    if (!Array.isArray(d.taskCols) || d.taskCols.length !== 3) throw Error("sin taskCols");
  });

  await t("frontera: sanea html de datos importados sin ejecutarlo", () => {
    window.__pwned = false;
    const d = { pages: [{ id: "x", title: "t", parentId: null, open: true, blocks: [
      { id: "b1", type: "text", html: '<img src=x onerror="window.__pwned=true">hola<scr' + 'ipt>window.__pwned=true</scr' + 'ipt>', indent: 0 },
      { id: "b2", type: "table", rows: [['<b onclick="x()">A</b>']], header: true, html: "", indent: 0 },
    ] }] };
    normalizeState(d);
    if (/onerror|<script/i.test(d.pages[0].blocks[0].html)) throw Error(d.pages[0].blocks[0].html);
    if (/onclick/.test(d.pages[0].blocks[1].rows[0][0])) throw Error("celda sin sanear");
    if (window.__pwned) throw Error("el html malicioso se ejecutó durante el saneado");
  });

  await t("frontera: no toca el código ni las URLs de recursos", () => {
    const d = { pages: [{ id: "y", title: "t", parentId: null, open: true, blocks: [
      { id: "c1", type: "code", html: "if (a < b) { x(); }", indent: 0 },
      { id: "c2", type: "video", html: "https://x.com/v?a=1&b=2", indent: 0 },
    ] }] };
    normalizeState(d);
    if (d.pages[0].blocks[0].html !== "if (a < b) { x(); }") throw Error(d.pages[0].blocks[0].html);
    if (d.pages[0].blocks[1].html !== "https://x.com/v?a=1&b=2") throw Error(d.pages[0].blocks[1].html);
  });

  await t("almacenamiento: ida y vuelta con el adaptador", async () => {
    storageSet("test-clave", "cuaderno-test-ls", { a: 1 });
    await wait(80);
    const v = await storageGet("test-clave", "cuaderno-test-ls");
    if (!v || v.a !== 1) throw Error(JSON.stringify(v));
  });

  await t("commit() guarda, re-renderiza y sella savedAt", async () => {
    const before = state.savedAt || 0;
    state.pages[0].title = "Bienvenida ✔";
    await wait(5);
    commit();
    if (!document.querySelector("#page-tree").textContent.includes("Bienvenida ✔")) throw Error("sidebar sin actualizar");
    await wait(120);
    const stored = await storageGet("state", STORAGE_KEY);
    if (!stored || stored.pages[0].title !== "Bienvenida ✔") throw Error("no persistido");
    if (!(stored.savedAt >= before)) throw Error("savedAt no avanza");
  });

  await t("historial persiste con el adaptador", async () => {
    state.pages[0].blocks.push(mkBlock("text", "cambio para el historial"));
    snapshotPage(state.pages[0]);
    await wait(120);
    const v = await storageGet("versions", VERSIONS_LS_KEY);
    if (!v || !v[state.pages[0].id] || !v[state.pages[0].id].length) throw Error("sin versiones");
  });

  /* ---------- funciones de la aplicación ---------- */

  await t("estado con columnas de tablero", () => {
    if (state.taskCols.length !== 3) throw Error("cols=" + state.taskCols.length);
  });

  await t("sanitize conserva data-wiki y quita onclick", () => {
    const h = sanitize('<a data-wiki="abc" href="#" onclick="x()">Pag</a>');
    if (!h.includes('data-wiki="abc"')) throw Error(h);
    if (h.includes("onclick")) throw Error("onclick no eliminado");
  });

  await t("decorateHtml envuelve #etiquetas", () => {
    const h = decorateHtml("repasar #Examen mañana");
    if (!h.includes('class="hashtag"') || !h.includes('data-tag="examen"')) throw Error(h);
  });

  await t("decorateHtml no toca URLs ni código", () => {
    const h = decorateHtml('<a href="https://x.com/#frag">link</a> <code>#nope</code> #si');
    if ((h.match(/hashtag/g) || []).length !== 1) throw Error(h);
  });

  await t("stripDecor devuelve html limpio", () => {
    const h = stripDecor(decorateHtml("repasar #examen"));
    if (h !== "repasar #examen") throw Error(h);
  });

  await t("blockTags", () => {
    const tags = blockTags(mkBlock("text", "hola #Uno y #dos-tres"));
    if (tags.join(",") !== "uno,dos-tres") throw Error(tags.join(","));
  });

  await t("menú wiki encuentra páginas y ofrece crear", () => {
    const el = document.createElement("div");
    el.textContent = "[[Bien";
    document.body.appendChild(el);
    openWikiMenu(el, state.pages[0].blocks[0], 0, "Bien");
    if (!wiki.items.some(i => i.page && (i.page.title || "").startsWith("Bienvenida"))) throw Error("no encuentra Bienvenida");
    if (!wiki.items.some(i => i.create === "Bien")) throw Error("sin opción crear");
    closeWiki();
    el.remove();
  });

  await t("backlinksTo", () => {
    const target = state.pages[0];
    const src = { id: uid(), title: "Fuente", icon: "📄", parentId: null, open: true,
      blocks: [mkBlock("text", `ver <a data-wiki="${target.id}" href="#">x</a>`)] };
    state.pages.push(src);
    rebuildMaps();
    if (!backlinksTo(target.id).some(x => x.page === src)) throw Error("no encontrado");
  });

  await t("render página: backlinks, callout warn, página incrustada", () => {
    const p = state.pages[0];
    p.blocks.push(Object.assign(mkBlock("callout", "ojo"), { kind: "warn" }));
    p.blocks.push(Object.assign(mkBlock("pageembed"), { pageId: state.pages[1].id }));
    navigateToPage(p.id);
    if (!document.querySelector(".backlinks")) throw Error("sin backlinks");
    if (!document.querySelector(".block.b-callout.co-warn")) throw Error("sin co-warn");
    if (!document.querySelector(".bk-pageembed .pe-body .st-block")) throw Error("sin embed");
  });

  await t("tablero kanban con 3 columnas y tarjetas", () => {
    state.settings.tasksMode = "board";
    view = { kind: "tasks" };
    renderAll();
    if (document.querySelectorAll(".kb-col").length !== 3) throw Error("cols=" + document.querySelectorAll(".kb-col").length);
    if (!document.querySelector(".kb-card")) throw Error("sin tarjetas");
    if (!document.querySelector(".kb-addcol")) throw Error("sin botón columna");
  });

  await t("vista de etiqueta", () => {
    state.pages[0].blocks.push(mkBlock("text", "prueba #smoke"));
    view = { kind: "tag", tag: "smoke" };
    renderAll();
    if (!document.querySelector(".tasks-group")) throw Error("sin grupos");
  });

  await t("nota diaria crea diario + nota y navega", () => {
    openDailyNote();
    const diary = state.pages.find(pg => pg.title === "Diario de clase");
    if (!diary) throw Error("sin diario");
    if (!childrenOf(diary.id).length) throw Error("sin nota del día");
    if (view.kind !== "page") throw Error("no navegó");
  });

  await t("favoritos aparecen en sidebar y topbar", () => {
    const p = currentPage();
    p.starred = true;
    commit();
    if (document.querySelector("#fav-section").hidden) throw Error("sección oculta");
    if (!document.querySelector("#fav-list .pg-row")) throw Error("sin fila");
    if (!document.querySelector(".tb-star.on")) throw Error("estrella no encendida");
  });

  await t("outline lista los títulos", () => {
    openOutline(document.querySelector(".tb-btn"), currentPage());
    const pop = document.querySelector("#popover");
    if (pop.hidden || !pop.querySelector(".slash-item")) throw Error("popover sin items");
    pop.hidden = true;
  });

  await t("markdown: [[wiki]], callout tipado y ![[embed]]", () => {
    const md = pageToMarkdown({ title: "T", icon: "", blocks: [
      mkBlock("text", '<a data-wiki="x" href="#">Otra página</a>'),
      Object.assign(mkBlock("callout", "c"), { kind: "ok" }),
      Object.assign(mkBlock("pageembed"), { pageId: state.pages[1].id }),
    ] });
    if (!md.includes("[[Otra página]]")) throw Error(md);
    if (!md.includes("✅")) throw Error(md);
    if (!md.includes("![[")) throw Error(md);
  });

  await t("tarjeta en columna «hecho» se muestra tachada", () => {
    const doneCol = state.taskCols.find(c => c.done);
    const b = mkBlock("todo", "prueba drop");
    state.pages[0].blocks.push(b);
    b.boardCol = doneCol.id;
    b.checked = true;
    state.settings.tasksMode = "board";
    view = { kind: "tasks" };
    renderAll();
    if (!document.querySelector(".kb-card.done")) throw Error("sin tarjeta hecha");
  });

  /* ---------- resultado ---------- */

  const fails = out.filter(l => l.startsWith("FAIL"));
  document.title = fails.length ? "SOME-FAIL" : "ALL-PASS";
  const pre = document.createElement("pre");
  pre.id = "test-out";
  pre.textContent = out.join("\n");
  document.body.appendChild(pre);
})();
