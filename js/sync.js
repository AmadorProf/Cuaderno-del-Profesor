/* ==========================================================================
   Cuaderno del Profesor — Copia de seguridad y sincronización con GitHub.
   Script clásico sin módulos (funciona sobre file://); el orden de carga
   lo define index.html.
   ========================================================================== */

"use strict";

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
      normalizeState(data);
      if (state.settings.github) data.settings.github = state.settings.github; /* conserva el token local */
      state = data;
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
      normalizeState(data);
      data.settings.github = c; /* conserva el token local */
      state = data;
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
