"use strict";
function backupStatus(){const t=state.lastBackupAt;if(!state.trades.length&&!t)return{c:"ok",t:"Henüz yedeklenecek işlem yok",s:"İlk işlemlerini kaydedince yedek almayı unutma."};if(!t)return state.trades.length<5?{c:"warn",t:"Henüz yedek alınmadı",s:"Veriler yalnızca bu cihazda. İstediğinde yedekle."}:{c:"bad",t:"Henüz yedek alınmadı",s:"Düzenli yedek al."};const d=Math.floor((Date.now()-t)/864e5);return{c:d>7?"warn":"ok",t:"Son yedek "+(d<1?"bugün":d+" gün önce"),s:new Date(t).toLocaleString("tr-TR")}}
function backupNote(){return state.lastBackupAt?"Son yedek: "+new Date(state.lastBackupAt).toLocaleDateString("tr-TR")+".":"Hiç yedek almadın."}
function typedConfirm(m){const v=prompt(m+"\n\nOnaylamak için SİL yaz.");return v!=null&&v.trim().toLocaleUpperCase("tr-TR").replace("İ","I")==="SIL"}
const TAGKIND=[["setups","Setup"],["emos","Duygu"],["mists","Hata"]];
function addTag(k,v){const raw=(v||"").trim(),n=raw.slice(0,24),lc=x=>x.toLocaleLowerCase("tr");if(!n)return;if(state.tags[k].some(x=>lc(x)===lc(n))){toast("Bu etiket zaten var");return}state.tags[k].push(n);saveTags(state.tags);render()}
function pageHead(t,back){return `<header class="page-h">${back?`<a class="bk" href="#/more">‹ Daha</a>`:`<p class="eyebrow">Ayarlar</p>`}<h1>${t}</h1></header>`}
function lrl(t,d,btn){return `<div class="lrow"><div><div class="lt">${t}</div><div class="subtle ld">${d}</div></div>${btn}</div>`}
function lpick(t,d,kind,acc){return lrl(t,d,`<label class="btn sm secondary" style="cursor:pointer">Seç<input type="file" accept="${acc}" hidden data-file="${kind}"></label>`)}
function viewMore(){const bs=backupStatus(),nt=TAGKIND.reduce((n,[k])=>n+state.tags[k].length,0);
const row=(h,t,v)=>`<a class="lrow" href="${h}"><span>${t}</span><span class="lv">${v}<i>›</i></span></a>`;
return `<div class="stack">${pageHead("Daha")}
<div class="card bkc"><div><div class="bkt"><span class="dot ${bs.c}"></span>${bs.t}</div><div class="subtle bks">${bs.s}</div></div><button type="button" class="btn sm primary" data-act="jsonexport">Yedekle</button></div>
<div class="card lgrp">${row("#/more/accounts","Hesaplar",state.accounts.length+" hesap")}${row("#/more/tags","Etiketler",nt+" etiket")}${row("#/more/data","Veri ve yedek","")}</div>
<div class="card lgrp"><div class="lrow"><span>Görünüm</span><span class="sg"><button type="button" class="${state.theme==="dark"?"on":""}" data-act="theme" data-v="dark">Koyu</button><button type="button" class="${state.theme==="light"?"on":""}" data-act="theme" data-v="light">Açık</button></span></div></div>
<p class="subtle foot">${state.trades.length} işlem · veriler yalnızca bu cihazda</p></div>`}
function viewMoreAccounts(){return `<div class="stack">${pageHead("Hesaplar",1)}
<div class="stack" style="gap:12px">${state.accounts.map(a=>{const bal=currentBalance(a),n=state.trades.filter(t=>accountId(t)===a.id).length;
const del=state.accounts.length<=1?`<span class="subtle">Son hesap silinemez</span>`:n?`<span class="subtle">İşlemi olan hesap silinemez</span>`:`<button type="button" class="btn sm danger" data-act="delacc" data-id="${esc(a.id)}">Sil</button>`;
return `<div class="card acc"><div class="acc-grid"><label class="fld"><span>Ad</span><input class="inp" data-aid="${esc(a.id)}" data-af="name" value="${esc(a.name)}"></label>
<label class="fld"><span>Başlangıç bakiyesi</span><input class="inp" data-aid="${esc(a.id)}" data-af="balance" type="text" inputmode="decimal" placeholder="ör. 10000" value="${a.balance||""}"></label>
<label class="fld"><span>Günlük kayıp limiti</span><input class="inp" data-aid="${esc(a.id)}" data-af="dl" type="text" inputmode="decimal" placeholder="boşsa kapalı" value="${a.dl||""}"></label>
<label class="fld"><span>Maks. düşüş limiti</span><input class="inp" data-aid="${esc(a.id)}" data-af="md" type="text" inputmode="decimal" placeholder="boşsa kapalı" value="${a.md||""}"></label></div>
<div class="acc-f"><span class="muted">${a.balance>0?"Güncel "+numF(bal,2):"Bakiye girince risk % hesaplanır"} · ${n} işlem</span>${del}</div></div>`}).join("")}</div>
<div class="addrow"><input class="inp" placeholder="Yeni hesap adı" data-newacc="1"><button type="button" class="btn md secondary" data-act="addacc">Ekle</button></div></div>`}
function viewMoreTags(){return `<div class="stack">${pageHead("Etiketler",1)}
${TAGKIND.map(([k,l])=>`<section class="card tgs"><div class="tgh"><span>${l}</span><span class="subtle">${state.tags[k].length}</span></div><div class="chips">${state.tags[k].map(x=>`<button type="button" class="chip off" data-act="deltag" data-kind="${k}" data-v="${esc(x)}" aria-label="${esc(x)} etiketini kaldır">${esc(x)} ✕</button>`).join("")}</div><input class="inp" data-newtag="${k}" maxlength="24" placeholder="+ Yeni etiket, Enter"></section>`).join("")}
<p class="subtle foot">Etiketi kaldırmak eski işlemlerdeki kaydı değiştirmez.</p></div>`}
function viewMoreData(){
const file=hasFS?(state.file==="none"?lrl("Otomatik dosya kaydı","Her değişiklik seçtiğin dosyaya yazılır.",`<button type="button" class="btn sm secondary" data-act="filelink">Aç</button>`):lrl("Bağlı dosya",`<span class="mono">${esc(state.fileName)}</span>`,`<span style="display:flex;gap:8px">${state.file==="need"?`<button type="button" class="btn sm primary" data-act="fileresume">İzni yenile</button>`:""}<button type="button" class="btn sm ghost" data-act="fileunlink">Kaldır</button></span>`)):"";
const stor=state.memoryOnly?"Tarayıcı bu oturumdan sonra veriyi tutmuyor.":state.durable?"Tarayıcı verini kalıcı olarak saklıyor.":"Tarayıcı, yer açmak için veriyi silebilir. Düzenli yedek al.";
return `<div class="stack">${pageHead("Veri ve yedek",1)}
<div class="card lgrp">${file}
${lrl("CSV dışa aktar","Analiz için, bakiyeler dahil değil.",`<button type="button" class="btn sm secondary" data-act="csvexport">İndir</button>`)}
${navigator.canShare?lrl("Yedeği paylaş","Telefon ↔ bilgisayar.",`<button type="button" class="btn sm secondary" data-act="sharejson">Paylaş</button>`):""}
${lpick("JSON'dan işlem ekle","Mevcut verinin üstüne birleştirir.","jsonmerge","application/json,.json")}
${lpick("JSON geri yükle","Defterin yerini alır.","json","application/json,.json")}
${lpick("CSV içe aktar","Ascentia CSV'si veya uyan başlıklar.","csv",".csv,text/csv,text/plain")}</div>
<p class="subtle foot">${stor}${hasFS?"":" Otomatik dosya kaydı yalnızca masaüstü Chrome veya Edge'de çalışır."}</p>
<div class="card zone lgrp">${lrl("Tümünü sil","İşlemler, hesaplar, etiketler. Geri alınamaz.",`<button type="button" class="btn sm danger" data-act="clear">Sil</button>`)}</div></div>`}

function viewTradeDetail(id){
const t=state.trades.find(x=>x.id===id);
if(!t)return `<div style="padding:64px 0;text-align:center"><p class="muted" style="font-size:15px">İşlem bulunamadı.</p><a href="#/trades" style="display:block;margin-top:16px;font-size:15px;color:var(--accent)">Listeye dön</a></div>`;
const p=pnl(t),r=rr(t),rk=risk(t),rp=riskPct(t),acc=accountOf(t);const si=SYMS.find(x=>x[0]===t.symbol),needFix=si&&si[1]!==1&&(t.mult||1)===1;
const row=(k,v)=>`<div class="rowline"><span>${k}</span><span>${v}</span></div>`;
const fmtPx=pxs;
return `<div class="stack4">
<a class="bk" href="#/trades">‹ İşlemler</a>
<header style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
<div>
<div style="display:flex;align-items:center;gap:8px"><h1 style="font-size:24px;font-weight:500;letter-spacing:-.02em">${esc(t.symbol)}</h1>${badge(t.dir==="LONG"?"Long":"Short",t.dir==="LONG"?"up":"dn")}</div>
<p class="muted" style="margin-top:4px;font-size:15px">${esc(formatWhen(t.date))}</p>
</div>
<div style="text-align:right">
<p class="mono" style="font-size:28px;font-weight:500;letter-spacing:-.02em;color:${p==null?"var(--muted)":"var(--"+pnlClass(p)+")"}">${p==null?"Açık":money(p)}</p>
<p class="mono" style="font-size:15px;color:${r==null?"var(--muted)":"var(--"+pnlClass(r)+")"}">${r==null?"R yok":rf(r)}</p>
</div>
</header>
${t.exit==null?`<div class="card s3" style="padding:16px"><p style="font-weight:500">İşlemi kapat</p><div class="grid2"><label class="fld"><span>Çıkış fiyatı</span><input class="inp" id="cx" type="text" inputmode="decimal" enterkeyhint="next" autocomplete="off" placeholder="giriş ${esc(pxs(t.entry,pxd(t)))}"></label>${t.qty>0?`<label class="fld"><span>Miktar</span><input class="inp" id="cq" type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" placeholder="tümü: ${esc(String(t.qty))}"></label>`:""}</div><label class="fld"><span>Çıkış zamanı (isteğe bağlı)</span><input class="inp" id="cd" type="datetime-local" value="${nowLocal()}"></label><button type="button" class="btn lg primary" data-act="closetrade" data-id="${esc(t.id)}">Kapat</button><p class="subtle" style="font-size:13px">Miktarı boş bırakırsan işlemin tamamı kapanır; daha küçük girersen kısmi kapanır.</p><p id="cerr" class="dn" style="font-size:15px"></p></div>`:""}
${needFix?`<div class="card s3" style="padding:16px"><p style="font-weight:500">Çarpan kontrolü</p><p class="muted" style="font-size:15px">${esc(t.symbol)} için 1 lot genelde ${numF(si[1],0)} birimdir, bu işlemde çarpan 1. Kâr/zarar çok küçük görünüyorsa düzelt.</p><button type="button" class="btn lg secondary" data-act="fixmult" data-id="${esc(t.id)}">Çarpanı ${numF(si[1],0)} yap</button></div>`:""}
<div class="card divide" style="padding:0 12px">
${row("Hesap",esc(acc?acc.name:"—"))}
${row("Giriş",pxs(t.entry,pxd(t)))}
${row("Çıkış",t.exit==null?"Açık":pxs(t.exit,pxd(t)))}
${row("Miktar",numF(t.qty,Math.min(4,(String(t.qty).split(".")[1]||"").length)))}
${row("Stop",fmtPx(t.stop,pxd(t)))}
${row("Hedef",fmtPx(t.tp,pxd(t)))}
${t.rt?row("Puan",t.rt+" ★"):""}${row("Risk",rk==null?"—":numF(rk,2))}
<details class="dr"><summary>Diğer ayrıntılar</summary>
${row("Komisyon",numF(t.fees,2))}
${row("Çarpan",numF(t.mult||1,0))}${t.fx&&t.fx!==1?row("Kur",String(t.fx)):""}
${row("Risk %",rp==null?'<span class="subtle">stop veya hesap bakiyesi yok</span>':pct(rp))}
${row("Seans (Londra saati)",sessionOf(t.date))}
${t.exitDate?row("Çıkış zamanı",esc(formatWhen(t.exitDate))):""}${holdMin(t)!=null?row("Süre",holdText(holdMin(t))):""}${t.stop0!=null&&t.stop0!==t.stop?row("İlk stop",fmtPx(t.stop0,pxd(t))):""}
</details>
</div>
<div class="card">
<p style="font-size:13px;font-weight:500;letter-spacing:.04em;color:var(--muted)">İnceleme</p>
<div class="chips" style="margin-top:8px">
${t.setup?badge(t.setup):""}${t.emo?badge(t.emo):""}
${t.plan==="evet"?badge("Plana uydum","up"):""}${t.plan==="hayır"?badge("Plan dışı","dn"):""}
${t.mist?badge(t.mist,"dn"):""}
${!t.setup&&!t.emo&&!t.plan&&!t.mist?`<p class="muted" style="font-size:15px">Etiket yok.</p>`:""}
</div>
${t.notes?`<p style="margin-top:12px;font-size:15px;line-height:1.6">${esc(t.notes)}</p>`:""}
</div>
<div class="actrow">
<button type="button" class="btn lg secondary" data-act="clone" data-id="${esc(t.id)}">Kopyala</button>
<a href="#/add?id=${encodeURIComponent(t.id)}" class="btn lg secondary"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>Düzenle</a>
<button type="button" class="btn lg danger" data-act="deltrade" data-id="${esc(t.id)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>Sil</button>
</div>
</div>`}

