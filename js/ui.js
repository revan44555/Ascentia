"use strict";
let RANGE = "all";
let LASTLOT = {};
try {
  LASTLOT = JSON.parse(localStorage.getItem("tj_lastlot_v1") || "{}");
} catch (e) {}
const dateStamp = d =>
  d.getFullYear() +
  "-" +
  String(d.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(d.getDate()).padStart(2, "0");
function inRange(t) {
  if (RANGE === "all") return true;
  const d = new Date();
  let f;
  if (RANGE === "7") {
    d.setDate(d.getDate() - 6);
    f = dateStamp(d);
  } else if (RANGE === "30") {
    d.setDate(d.getDate() - 29);
    f = dateStamp(d);
  } else if (RANGE === "month") f = todayStamp().slice(0, 8) + "01";
  else f = todayStamp().slice(0, 5) + "01-01";
  return closedAt(t) >= f;
}
function rangeChips() {
  return `<div class="chips scroll">${[
    ["all", "Tümü"],
    ["7", "7 gün"],
    ["30", "30 gün"],
    ["month", "Bu ay"],
    ["year", "Bu yıl"],
  ]
    .map(
      ([v, l]) =>
        `<button type="button" aria-pressed="${RANGE === v}" class="chip ${RANGE === v ? "on" : "off"}" data-rng="${v}">${l}</button>`
    )
    .join("")}</div>`;
}
function toast(msg, kind, ms, action) {
  const box = $("#toasts");
  box.innerHTML = "";
  const t = document.createElement("div");
  t.className = "toast" + (kind ? " " + kind : "");
  t.setAttribute("role", "status");
  const s = document.createElement("span");
  s.textContent = msg;
  t.appendChild(s);
  t.style.pointerEvents = "auto";
  let done = false;
  const rm = () => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 250);
  };
  if (action) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "toast-act";
    b.textContent = action.label;
    b.onclick = e => {
      e.stopPropagation();
      if (done) return;
      done = true;
      rm();
      action.fn();
    };
    t.appendChild(b);
  } else t.onclick = () => t.remove();
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(rm, ms || (action ? 6000 : 2200));
}

function kpi(label, value, tone, cls, tip) {
  return `<div class="card kpi ${cls || ""}"${tip ? ` data-tip="${esc(tip)}" tabindex="0" role="button"` : ""}><p>${esc(label)}</p><p class="mono ${tone || ""}">${esc(value)}</p></div>`;
}
function badge(txt, tone) {
  return `<span class="badge ${tone || "muted"}">${esc(txt)}</span>`;
}
const decimalPlaces = v => (String(v).split(".")[1] || "").length;
const priceDecimals = t =>
  Math.min(
    6,
    Math.max.apply(
      null,
      [t.entry, t.exit, t.stop, t.tp, t.stop0].filter(v => v != null).map(decimalPlaces)
    )
  );
const formatPrice = (v, d) => {
  if (v == null) return "—";
  const k = d == null ? Math.min(6, decimalPlaces(v)) : d;
  return v.toLocaleString("tr-TR", {
    minimumFractionDigits: k,
    maximumFractionDigits: k,
    useGrouping: false,
  });
};
function tradeCard(t) {
  const p = pnl(t),
    r = rr(t);
  const bits = [
    t.setup,
    t.emo,
    r != null ? formatR(r) : "",
    t.plan === "hayır" ? "plan dışı" : "",
    t.mist,
  ].filter(Boolean);
  return `<a href="#/trades/${encodeURIComponent(t.id)}" class="block"><div class="card trade-card" style="--stripe:var(--${p == null ? "subtle" : p > 0 ? "up" : p < 0 ? "dn" : "muted"})">
<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
<div style="min-width:0">
<div style="display:flex;align-items:center;gap:8px"><p class="truncate" style="font-weight:500;letter-spacing:-.02em">${esc(t.symbol)}</p>${badge(t.dir === "LONG" ? "Long" : "Short", t.dir === "LONG" ? "up" : "dn")}</div>
<p class="mono tc-px" style="margin-top:4px;font-size:13px"><span class="nw">${esc(formatPrice(t.entry, priceDecimals(t)))}${t.exit != null ? " → " + esc(formatPrice(t.exit, priceDecimals(t))) : ""}</span> <span class="muted nw">× ${esc(String(t.qty))}</span></p>
<p class="subtle" style="margin-top:2px;font-size:12px">${esc(formatWhen(t.date))}</p>
</div>
<p class="mono" style="font-size:15px;font-weight:500;${p == null ? "color:var(--fg);font-size:15px" : "color:var(--" + pnlClass(p) + ")"}">${p == null ? "Açık" : money(p)}</p>
</div>
${bits.length ? `<p class="subtle truncate" style="margin-top:8px;font-size:13px">${esc(bits.join(" · "))}</p>` : ""}
</div></a>`;
}
function chipRow(items, value, group, allowOff) {
  return `<div class="chips">${items
    .map(it => {
      const on = value === it.v;
      return `<button type="button" aria-pressed="${on}" class="chip ${on ? "on" : "off"}" data-chip="${group}" data-v="${esc(it.v)}" data-off="${allowOff === false ? "0" : "1"}">${esc(it.l)}</button>`;
    })
    .join("")}</div>`;
}
function accChips() {
  if (state.accounts.length <= 1) return "";
  return `<div class="chips scroll"><button type="button" class="chip ${state.filterAccountId === "all" ? "on" : "off"}" data-facc="all">Tüm hesaplar</button>${state.accounts.map(a => `<button type="button" class="chip ${state.filterAccountId === a.id ? "on" : "off"}" data-facc="${esc(a.id)}">${esc(a.name)}</button>`).join("")}</div>`;
}

/* klavye açıkken alt menüyü gizle, Kaydet çubuğunu klavyenin hemen üstüne indir */
(function () {
  const vv = window.visualViewport;
  if (!vv) return;
  const f = () => {
    const open = window.innerHeight - vv.height > 150;
    document.body.classList.toggle("kb", open);
  };
  vv.addEventListener("resize", f);
  f();
})();

function typedConfirm(m) {
  const v = prompt(m + "\n\nOnaylamak için SİL yaz.");
  return v != null && v.trim().toLocaleUpperCase("tr-TR").replace("İ", "I") === "SIL";
}

/* Ortak tıklamalar: ipucu, tarih aralığı, hesap filtresi */
Core.click("tip", { when: el => !el.dataset.act, run: el => toast(el.getAttribute("data-tip")) });
Core.click("facc", {
  run: el => {
    setAccountFilter(el.dataset.facc);
    Core.refresh();
  },
});
Core.click("rng", {
  run: el => {
    RANGE = el.dataset.rng;
    Core.refresh();
  },
});

/** Etiket ekleme sonucunu kullanıcıya yansıtır (hem form hem Etiketler sayfası kullanır). */
function addTagFeedback(kind, value) {
  const result = addTag(kind, value);
  if (result === "exists") toast("Bu etiket zaten var");
  else if (result === "ok") Core.refresh();
}
