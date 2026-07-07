/* ==========================================================================
   Cuaderno del Profesor — Modo presentación y exportación a Markdown.
   Script clásico sin módulos (funciona sobre file://); el orden de carga
   lo define index.html.
   ========================================================================== */

"use strict";

/* ---------------- Presentación ---------------- */

const elPresent = $("#present");
let presentSlides = [], presentIdx = 0;

function startPresentation() {
  const p = currentPage();
  if (!p) return;

  presentSlides = [{ titleSlide: true, icon: p.icon, title: p.title || "Sin título" }];
  let cur = null;
  for (const b of p.blocks) {
    if (b.type === "h1") {
      cur = { heading: htmlToText(b.html), blocks: [] };
      presentSlides.push(cur);
      continue;
    }
    if (b.type === "divider") { cur = null; continue; }
    if (!cur) { cur = { heading: "", blocks: [] }; presentSlides.push(cur); }
    cur.blocks.push(b);
  }
  presentSlides = presentSlides.filter(s => s.titleSlide || s.heading || s.blocks.length);
  presentIdx = 0;
  elPresent.hidden = false;
  renderSlide();
  try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); } catch (e) { /* opcional */ }
}

function renderSlide() {
  const s = presentSlides[presentIdx];
  elPresent.innerHTML = "";

  const progress = document.createElement("div");
  progress.className = "pr-progress";
  progress.style.width = ((presentIdx + 1) / presentSlides.length * 100) + "%";

  const slide = document.createElement("div");
  slide.className = "pr-slide" + (s.titleSlide ? " title-slide" : "");

  if (s.titleSlide) {
    slide.innerHTML = `<div class="pr-icon">${s.icon || "📄"}</div><h1>${(s.title).replace(/</g, "&lt;")}</h1>`;
  } else {
    if (s.heading) {
      const h = document.createElement("h1");
      h.textContent = s.heading;
      slide.appendChild(h);
    }
    let n = 0;
    s.blocks.forEach(b => {
      n = b.type === "number" ? n + 1 : 0;
      slide.appendChild(presentBlock(b, n));
    });
  }
  slide.onclick = () => nav(1);

  const footer = document.createElement("div");
  footer.className = "pr-footer";
  const exit = document.createElement("button");
  exit.className = "pr-exit";
  exit.textContent = "✕ Salir (Esc)";
  exit.onclick = e => { e.stopPropagation(); exitPresentation(); };

  const timerWrap = document.createElement("span");
  timerWrap.className = "pr-timer-wrap";
  if (prTimer.int) {
    const t = document.createElement("button");
    t.className = "pr-exit pr-timer";
    t.id = "pr-timer";
    t.title = "Detener temporizador";
    t.textContent = timerText();
    t.onclick = e => { e.stopPropagation(); stopTimer(); renderSlide(); };
    timerWrap.appendChild(t);
  } else {
    const lbl = document.createElement("span");
    lbl.textContent = "⏱";
    timerWrap.appendChild(lbl);
    [5, 10, 15].forEach(min => {
      const btn = document.createElement("button");
      btn.className = "pr-exit";
      btn.textContent = min + "′";
      btn.title = `Temporizador de ${min} minutos`;
      btn.onclick = e => { e.stopPropagation(); startTimer(min); };
      timerWrap.appendChild(btn);
    });
  }

  const counter = document.createElement("span");
  counter.className = "pr-counter";
  counter.textContent = `${presentIdx + 1} / ${presentSlides.length}`;
  footer.append(exit, timerWrap, counter);

  elPresent.append(progress, slide, footer);
}

/* temporizador de actividad (visible durante la presentación) */
let prTimer = { end: 0, int: null };

function timerText() {
  const r = Math.round((prTimer.end - Date.now()) / 1000);
  if (r <= 0) return "⏰ ¡Tiempo!";
  return `⏱ ${Math.floor(r / 60)}:${pad(r % 60)}`;
}

function startTimer(min) {
  stopTimer();
  prTimer.end = Date.now() + min * 60000;
  prTimer.int = setInterval(() => {
    const el = document.getElementById("pr-timer");
    if (!el) return;
    el.textContent = timerText();
    el.classList.toggle("pr-timer-over", prTimer.end - Date.now() <= 0);
  }, 500);
  renderSlide();
}

function stopTimer() {
  if (prTimer.int) clearInterval(prTimer.int);
  prTimer = { end: 0, int: null };
}

function presentBlock(b, num) {
  const d = document.createElement("div");
  d.className = "pr-block";
  switch (b.type) {
    case "h2": d.classList.add("pr-h2"); d.innerHTML = b.html; break;
    case "h3": d.classList.add("pr-h3"); d.innerHTML = b.html; break;
    case "bullet": d.classList.add("pr-bullet"); d.innerHTML = b.html; break;
    case "number": d.innerHTML = `<b>${num}.</b> ` + b.html; break;
    case "todo": d.innerHTML = (b.checked ? "✓ " : "◯ ") + `<span class="${b.checked ? "pr-todo-done" : ""}">${b.html}</span>`; break;
    case "quote": d.classList.add("pr-quote"); d.innerHTML = b.html; break;
    case "callout": d.classList.add("pr-callout"); d.innerHTML = CALLOUT_KINDS[calloutKind(b)].emoji + " " + b.html; break;
    case "pageembed": {
      const t = b.pageId && getPage(b.pageId);
      if (t) { d.classList.add("pr-quote"); d.textContent = `${t.icon || "📄"} ${t.title || "Sin título"}`; }
      break;
    }
    case "code": d.classList.add("pr-code"); d.innerHTML = highlightCode(b.html, b.lang); break;
    case "toggle": d.innerHTML = "▸ " + b.html; break;
    case "image": { const img = document.createElement("img"); img.src = b.html; d.appendChild(img); break; }
    case "table": {
      const tbl = document.createElement("table");
      tbl.className = "pr-table";
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
    case "video":
    case "audio":
    case "embed":
    case "bookmark": {
      if (b.html) d.appendChild(resourceEl(b));
      break;
    }
    default: d.innerHTML = b.html;
  }
  return d;
}

function nav(dir) {
  const next = presentIdx + dir;
  if (next < 0) return;
  if (next >= presentSlides.length) { exitPresentation(); return; }
  presentIdx = next;
  renderSlide();
}

function exitPresentation() {
  stopTimer();
  elPresent.hidden = true;
  try { document.fullscreenElement && document.exitFullscreen(); } catch (e) { /* opcional */ }
}

/* ---------------- Exportar Markdown ---------------- */

function mdInline(html) {
  const d = inertDiv(html);
  d.querySelectorAll("b, strong").forEach(el => el.replaceWith(`**${el.textContent}**`));
  d.querySelectorAll("i, em").forEach(el => el.replaceWith(`*${el.textContent}*`));
  d.querySelectorAll("code").forEach(el => el.replaceWith(`\`${el.textContent}\``));
  d.querySelectorAll("a").forEach(el => el.replaceWith(el.hasAttribute("data-wiki")
    ? `[[${el.textContent}]]`
    : `[${el.textContent}](${el.getAttribute("href") || ""})`));
  d.querySelectorAll("br").forEach(el => el.replaceWith("\n"));
  return d.textContent;
}

function pageToMarkdown(p) {
  const lines = [`# ${p.icon || ""} ${p.title || "Sin título"}`.trim(), ""];
  let n = 0;
  for (const b of p.blocks) {
    const ind = "  ".repeat(b.indent);
    const t = mdInline(b.html);
    n = b.type === "number" ? n + 1 : 0;
    switch (b.type) {
      case "h1": lines.push(`# ${t}`); break;
      case "h2": lines.push(`## ${t}`); break;
      case "h3": lines.push(`### ${t}`); break;
      case "todo": lines.push(`${ind}- [${b.checked ? "x" : " "}] ${t}`); break;
      case "bullet": lines.push(`${ind}- ${t}`); break;
      case "number": lines.push(`${ind}${n}. ${t}`); break;
      case "toggle": lines.push(`${ind}- ${t}`); break;
      case "quote": lines.push(`> ${t}`); break;
      case "callout": lines.push(`> ${CALLOUT_KINDS[calloutKind(b)].emoji} ${t}`); break;
      case "pageembed": {
        const tp = b.pageId && getPage(b.pageId);
        lines.push(`![[${tp ? (tp.title || "Sin título") : "página eliminada"}]]`);
        break;
      }
      case "code": lines.push("```" + (b.lang && b.lang !== "auto" && b.lang !== "plain" ? b.lang : ""), b.html, "```"); break;
      case "divider": lines.push("---"); break;
      case "image": lines.push(`![imagen](${b.html})`); break;
      case "table": {
        (b.rows || []).forEach((cells, ri) => {
          lines.push("| " + cells.map(c => mdInline(c).replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ") + " |");
          if (ri === 0 && b.header !== false) lines.push("|" + cells.map(() => " --- ").join("|") + "|");
        });
        break;
      }
      case "video": lines.push(`▶ [Vídeo](${b.html})`); break;
      case "audio": lines.push(`🔊 [Audio](${b.html})`); break;
      case "embed": lines.push(`🌐 [Contenido incrustado](${b.html})`); break;
      case "bookmark": lines.push(`🔗 [${mdInline(b.caption || "") || b.html}](${b.html})`); break;
      default: lines.push(`${ind}${t}`);
    }
  }
  return lines.join("\n");
}

function exportMarkdown() {
  const p = currentPage();
  if (!p) return;
  const blob = new Blob([pageToMarkdown(p)], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (p.title || "pagina").replace(/[\\/:*?"<>|]/g, "-") + ".md";
  a.click();
  URL.revokeObjectURL(a.href);
}
