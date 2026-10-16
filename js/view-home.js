"use strict";
function viewHome(){
if(!state.trades.length){
return `<div class="empty-hero">
<svg class="mark" viewBox="0 0 120 40" aria-hidden="true"><path class="draw" pathLength="1" d="M2 32 C 20 30, 26 14, 44 18 S 70 34, 84 20 S 106 6, 118 8"/></svg><p class="eyebrow" lang="en">Ascentia</p>
<h1>Bugünü yaz.</h1>
<p class="sub">İşlem, risk, R ve duygu — hepsi bu cihazda. Sunucuya gitmez.</p>
<div class="acts">
<a href="#/add" class="btn lg primary">İlk işlemi kaydet</a>
<a href="#/more/data" class="btn lg secondary">CSV veya yedekten içe aktar</a>
</div></div>`}
const trades=filterAccount(state.trades,state.filterAccountId);
const today=todayStamp(),week=weekStartStamp();
const todayTrades=trades.filter(t=>ek(t).startsWith(today));
const weekTrades=trades.filter(t=>ek(t)>=week);
const todayNet=todayTrades.reduce((s,t)=>s+(pnl(t)??0),0);
const weekSum=summarize(weekTrades);
const leak=topLeak(trades),best=bestSetup(trades);
const adh=adherence(todayTrades.length?todayTrades:weekTrades);
const recent=trades.filter(t=>t.exit!=null).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
const opens=trades.filter(t=>t.exit==null).sort((a,b)=>a.date.localeCompare(b.date));
return `<div class="stack">
<header class="page-h"><p class="eyebrow">Bugün</p><h1>Özet</h1></header>
${state.memoryOnly?`<div class="card" style="font-size:15px;color:var(--muted)">Depolama kullanılamıyor. Veriler yalnızca bu oturumda durur.</div>`:""}
<div class="card hero"><p class="lbl">Bugün</p><p class="mono big ${todayNet>0?"up":todayNet<0?"dn":"muted"}">${todayTrades.some(t=>pnl(t)!=null)?money(todayNet):"—"}</p>
<div class="divide" style="margin-top:8px">
<div class="rowline"><span>Bugün işlem</span><span class="mono">${todayTrades.length}</span></div>
<div class="rowline"><span>Hafta</span><span class="mono ${pnlClass(weekSum.net)}">${money(weekSum.net)}</span></div>
<div class="rowline"><span>Plan uyumu</span><span class="mono">${adh==null?"—":Math.round(adh)+"%"}</span></div>
${best&&best.net>0?`<div class="rowline"><span>En iyi setup</span><span>${esc(best.key)} <span class="mono ${pnlClass(best.net)}">${money(best.net)}</span></span></div>`:""}
${leak?`<div class="rowline"><span>En büyük sızıntı</span><span>${esc(leak.key)} <span class="mono dn">${money(leak.net)}</span></span></div>`:""}
</div></div>
${quickEvalCard()}${propCard()}
${reviewCard()}
${opens.length?`<div class="gap2"><h2 class="h2t">Açık pozisyonlar (${opens.length})</h2>${opens.map(tradeCard).join("")}</div>`:""}
<div class="sechead">
<h2 class="h2t">Son işlemler</h2>
<a href="#/trades" class="muted" style="display:inline-flex;align-items:center;gap:4px;font-size:13px;min-height:44px;padding:0 4px">Tümü <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>
</div>
<div class="gap2">${recent.map(tradeCard).join("")}</div>
${state.file==="need"?`<div class="card"><p style="font-weight:500">Otomatik kaydetme duraklatıldı</p><p class="muted" style="margin-top:4px;font-size:15px">${esc(state.fileName)} dosyasına yazmak için izin ver.</p><button type="button" class="btn lg secondary" style="margin-top:12px" data-act="fileresume">Devam et</button></div>`:""}

</div>`}

const listState={q:"",side:"",result:"",limit:50};
function filteredTrades(){let list=filterAccount(state.trades,state.filterAccountId).filter(inRange);
const needle=listState.q.trim().toLowerCase();
if(needle){const nu=listState.q.trim().toUpperCase().replace(/[^A-Z0-9]/g,""),al=ALIAS[nu]?ALIAS[nu].toLowerCase():"";list=list.filter(t=>{const h=[t.symbol,t.setup,t.emo,t.mist,t.notes].join(" ").toLowerCase();return h.includes(needle)||(al&&h.includes(al))})}
if(listState.side)list=list.filter(t=>t.dir===listState.side);
if(listState.result==="open")list=list.filter(t=>t.exit==null);
if(listState.result==="win")list=list.filter(t=>(pnl(t)??0)>0);
if(listState.result==="loss")list=list.filter(t=>(pnl(t)??0)<0);
return list.slice().sort((a,b)=>b.date.localeCompare(a.date))}
function tradesListHtml(){const list=filteredTrades();
if(!list.length)return `<p class="muted" style="padding:64px 0;text-align:center;font-size:15px">${state.trades.length?"Eşleşen işlem yok.":"Henüz işlem yok. Ekle sekmesinden ilk işlemini kaydet."}</p>`;
return `<div class="gap2">${list.slice(0,listState.limit).map(tradeCard).join("")}</div>${list.length>listState.limit?`<button type="button" class="btn lg secondary" style="margin-top:8px" data-act="more">Daha fazla göster (${list.length-listState.limit})</button>`:""}`}
function viewTrades(){
return `<div class="stack4">
<header class="page-h" style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px">
<div><p class="eyebrow">Defter</p><h1>İşlemler</h1></div>
</header>
<div class="searchwrap"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
<input class="inp" aria-label="Ara" placeholder="Sembol, setup, not…" value="${esc(listState.q)}" data-lq="1"></div>
<details class="filt"${(state.filterAccountId!=="all"||RANGE!=="all"||listState.side||listState.result)?" open":""}><summary>Filtreler</summary><div class="s3" style="margin-top:8px">${accChips()}${rangeChips()}<div class="chips scroll">

<button type="button" class="chip ${listState.side==="LONG"?"on":"off"}" data-lchip="side:LONG">Long</button>
<button type="button" class="chip ${listState.side==="SHORT"?"on":"off"}" data-lchip="side:SHORT">Short</button>
<button type="button" class="chip ${listState.result==="win"?"on":"off"}" data-lchip="result:win">Kazanan</button>
<button type="button" class="chip ${listState.result==="loss"?"on":"off"}" data-lchip="result:loss">Kaybeden</button>
<button type="button" class="chip ${listState.result==="open"?"on":"off"}" data-lchip="result:open">Açık</button>
</div></div></details>
<div id="tradeList">${tradesListHtml()}</div>
</div>`}
// FIX(19): son 72 saatte kapanan, değerlendirilmemiş işlem için hızlı duygu+not kartı
function quickEvalCard(){
const cut=new Date(Date.now()-72*36e5);
const t=filterAccount(state.trades,state.filterAccountId).filter(x=>x.exit!=null&&x.qc==null&&new Date(ek(x))>cut).sort((a,b)=>ek(b).localeCompare(ek(a)))[0];
if(!t)return"";
return `<div class="card s3"><p class="sect-h">Anı değerlendir</p>
<p class="subtle" style="font-size:14px">${esc(t.symbol)} işlemi kapanalı birkaç saat oldu — o sırada ne hissettin?</p>
<div class="chips scroll">${state.tags.emos.map(x=>`<button type="button" aria-pressed="${qcEmo===x}" class="chip ${qcEmo===x?"on":"off"}" data-qcemo="${esc(x)}">${esc(x)}</button>`).join("")}</div>
<textarea class="inp" rows="2" id="qcNote" placeholder="Bir cümleyle o anı anlat (isteğe bağlı)" aria-label="Anı notu">${esc(qcNote)}</textarea>
<button type="button" class="btn lg primary" data-act="qcsave" data-id="${esc(t.id)}">Kaydet</button></div>`}
