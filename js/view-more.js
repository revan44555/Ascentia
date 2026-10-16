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
const row=(h,t,v)=>`<a class="lrow" href="${h}"><span>${t}</span><span class="lv">${v}<i>›</i></span></span></a>`;
return `<div class="stack">${pageHead("Daha")}
<div class="card bkc"><div><div class="bkt"><span class="dot ${bs.c}"></span>${bs.t}</div><div class="subtle bks">${bs.s}</div></div><button type="button" class="btn sm primary" data-act="jsonexport">Yedekle</button></div>
<div class="card lgrp">${row("#/more/accounts","Hesaplar",state.accounts.length+" hesap")}${row("#/more/tags","Etiketler",nt+" etiket")}${row("#/more/data","Veri ve yedek","")}</div>
<div class="card lgrp"><div class="lrow"><span>Görünüm</span><span class="sg"><button type="button" class="${state.theme==="dark"?"on":""}" data-act="theme" data-v="dark">Koyu</button><button type="button" class="${state.theme==="light"?"on":""}" data-act="theme" data-v="light">Açık</button></span></div></div>
<p class="subtle foot">${state.trades.length} işlem · veriler yalnızca bu cihazda</p></div>`}

function viewAccounts(){
return `<div class="stack">${pageHead("Hesaplar",1)}
<div class="card s3">
${state.accounts.map(a=>`<div class="card" style="padding:12px;background:var(--elevated);box-shadow:none">
<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><input class="inp" style="height:40px" data-aid="name:${a.id}" value="${esc(a.name)}" aria-label="Hesap adı">${state.accounts.length>1?`<button type="button" class="btn sm danger" data-act="delacc" data-id="${a.id}" aria-label="Hesabı sil">Sil</button>`:""}</div>
<div class="grid2" style="margin-top:8px"><div><label class="fld"><span>Bakiye (${esc(state.prefsCur||"USD")})</span><input class="inp" inputmode="decimal" data-aid="balance:${a.id}" value="${a.balance||""}"></label></div>
<div><label class="fld"><span>Para birimi</span><input class="inp" data-aid="cur:${a.id}" maxlength="3" value="${esc(a.cur||"")}"></label></div></div>
<div class="grid2"><div><label class="fld"><span>Günlük kayıp limiti</span><input class="inp" inputmode="decimal" placeholder="ör. 200" data-aid="dl:${a.id}" value="${a.dl||""}"></label></div>
<div><label class="fld"><span>Maks. düşüş (%)</span><input class="inp" inputmode="decimal" placeholder="ör. 6" data-aid="md:${a.id}" value="${a.md||""}"></label></div></div>
<div class="rowline" style="padding-bottom:0"><span>Güncel bakiye</span><span class="mono ${pnlClass(currentBalance(a))}">${money(currentBalance(a))}</span></div>
</div>`).join("")}
<div class="addrow"><input class="inp" placeholder="Yeni hesap adı" data-newacc="1"><button type="button" class="btn md secondary" data-act="addacc">Ekle</button></div>
<p class="subtle" style="font-size:13px">Bakiye girince risk yüzdesi ve equity eğrisi hesaplanır. Limitler Analiz ekranında izlenir.</p>
</div></div>`}
function viewTags(){
return `<div class="stack">${pageHead("Etiketler",1)}
${TAGKIND.map(([k,l])=>`<div class="card s3"><p class="sect-h">${l}</p>${state.tags[k].length?`<div class="chips">${state.tags[k].map(x=>`<span class="chip off">${esc(x)} <button type="button" data-act="deltag" data-kind="${k}" data-v="${esc(x)}" aria-label="Etiketi sil">✕</button></span>`).join("")}</div>`:`<p class="subtle" style="font-size:14px">Etiket yok.</p>`}
<div class="addrow"><input class="inp" placeholder="Yeni ${l.toLocaleLowerCase("tr-TR")} ekle" data-newtag="${k}"><button type="button" class="btn md secondary" data-act="addtag" data-kind="${k}">Ekle</button></div></div>`).join("")}
<div class="card s3"><p class="sect-h">Sembol önerileri</p>${state.tags.syms.length?`<div class="chips">${state.tags.syms.map(x=>`<span class="chip off">${esc(x)} <button type="button" data-act="deltag" data-kind="syms" data-v="${esc(x)}" aria-label="Sembolü sil">✕</button></span>`).join("")}</div>`:`<p class="subtle" style="font-size:14px">Ekleme ekranından "özel sembol olarak ekle" dediklerin burada listelenir.</p>`}</div>
</div>`}
function viewMoreData(){const bs=backupStatus(),hasFS=typeof window.showSaveFilePicker==="function",stor=state.file==="ok"?"<b>otomatik dosya kaydı açık</b> ("+esc(state.fileName)+")":state.file==="need"?"otomatik kayıt için izin gerekli":"otomatik dosya kaydı kapalı";
return `<div class="stack">${pageHead("Veri ve yedek",1)}
<div class="card s3">
<p class="sect-h">Yedek</p>
<div class="acc-f"><span class="btn sm primary" style="cursor:pointer">JSON yedekle<input type="file" hidden></span><button type="button" class="btn sm secondary" data-act="jsonexport">Paylaş</button></div>
<p class="subtle" style="font-size:13px">${backupNote()}</p>
<div class="acc-f"><button type="button" class="btn sm secondary" data-act="csvexport">CSV dışa aktar</button></div>
</div>
<div class="card s3">
<p class="sect-h">Geri yükleme</p>
<div class="acc-f">
${lpick("JSON yedeğini geri yükle.","Mevcut defterin üzerine yazar; işlem listesi yenilenir.","json",".json")}
${lpick("İşlemleri CSV'den içe aktar.","Excel/MT5/TradingView dışa aktarımı. Sütunlar otomatik eşleşir.","csv",".csv")}
${hasFS?`<div class="acc-f"><button type="button" class="btn sm secondary" data-act="jsonmerge">Başka yedeği birleştir</button><span class="muted" style="font-size:13px">Çiftleri atlar, yenisini ekler.</span></div>`:""}
${hasFS?(state.file==="ok"?`<div class="acc-f"><span class="muted" style="font-size:13px">${stor}</span><button type="button" class="btn sm ghost" data-act="unlinkfile">Kapat</button></div>`:`<div class="acc-f"><button type="button" class="btn sm secondary" data-act="linkfile">Otomatik kayıt dosyası seç</button><span class="muted" style="font-size:13px">${stor}${state.file==="need"?" (izin gerekli)":""}</span></div>`):""}
</div>
</div>
<div class="card s3">
<p class="sect-h">Tehlike bölgesi</p>
<div class="acc-f"><button type="button" class="btn sm danger" data-act="clear">Tüm verileri sıfırla</button><span class="muted" style="font-size:13px">Gerçekten istiyorsan SİL yaz.</span></div>
</div>
<p class="subtle foot">${state.trades.length} işlem · ${state.accounts.length} hesap${state.memoryOnly?" · depolama kullanılamıyor":""}</p>
</div>`}
const fmtPx=pxs;
function viewTradeDetail(id){const t=state.trades.find(x=>x.id===id);if(!t)return `<div style="padding:64px 0;text-align:center"><p class="muted">İşlem bulunamadı.</p></div>`;
const r=risk(t),p=pnl(t),by=byExit(state.trades.filter(x=>accountId(x)===accountId(t))),i=by.findIndex(x=>x.id===id),eqAfter=by.slice(0,i+1).reduce((s,x)=>s+pnl(x),0),rp=riskPct(t),a=accountOf(t),si=SYMS.find(x=>x[0]===t.symbol),needFix=si&&si[1]!==1&&(t.mult||1)===1;
const row=(l,v)=>`<div class="rowline"><span>${l}</span><span>${v}</span></div>`;
const longNote=t.qty*(t.mult||1)>=1e4?"Kontrat çarpanı eksik olabilir (ör. forex 100.000). Kontrol et.":"";
const d=dcs(t.entry),closeCard=t.exit==null?`<div class="card s3"><p class="sect-h">Pozisyonu kapat</p>
<div class="grid2">${fld("cx","Çıkış fiyatı")}<div><label class="fld"><span>Miktar (boş = tamamı)</span><input class="inp" id="cq" inputmode="decimal" placeholder="ör. 0.05"></label><p class="ferr" id="fe-cq" role="alert"></p></div></div>
<p class="subtle" style="font-size:13px">Açık miktar: ${numF(t.qty,2)} · Miktarı boş bırakırsan tamamı kapanır; daha küçük girersen kısmi kapanır.</p>
<button type="button" class="btn lg primary" data-act="closetrade" data-id="${t.id}">Kapat</button></div>`:"";
return `<div class="stack">
<a href="#/trades" class="bk">‹ İşlemler</a>
<div class="card">
<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><h1 style="font-size:24px;font-weight:600;letter-spacing:-.03em">${esc(t.symbol)}</h1>${badge(t.dir==="LONG"?"Long":"Short",t.dir==="LONG"?"up":"dn")}${t.plan==="evet"?badge("plana uydu","up"):""}${t.plan==="hayır"?badge("plan dışı","dn"):""}${p!=null?badge(money(p),p>0?"up":p<0?"dn":"muted"):""}</div>
<p class="subtle mono" style="margin-top:6px;font-size:13px">${esc(formatWhen(t.date))}${t.exitDate?" → "+esc(formatWhen(t.exitDate)):""}${holdMin(t)!=null?" · "+holdText(holdMin(t)):""}</p>
${t.exit==null?`<div class="card" style="margin-top:12px;background:var(--elevated);box-shadow:none"><p class="lbl">Açık pozisyon</p><p class="mono" style="margin-top:4px;font-size:20px;font-weight:500">${esc(fmtPx(t.qty,2))} lot @ ${esc(fmtPx(t.entry,d))}</p>${r!=null?`<p class="muted" style="margin-top:4px;font-size:13px">Stop ${esc(fmtPx(t.stop,d))} · risk ${money(r)}${rp!=null?" ("+numF(rp,2)+"%)":""}</p>`:""}</div>`:`<div class="card" style="margin-top:12px;background:var(--elevated);box-shadow:none"><p class="lbl">Sonuç</p><p class="mono" style="margin-top:4px;font-size:20px;font-weight:500;${p!=null?"color:var(--"+pnlClass(p)+")":""}">${p==null?"—":money(p)}</p>${rr(t)!=null?`<p class="muted" style="margin-top:4px;font-size:13px">${rf(rr(t))} · risk ${r!=null?money(r):"—"}</p>`:""}</div>`}
</div>
${closeCard}
<div class="card"><p class="lbl">İşlem bilgileri</p><div class="divide" style="margin-top:8px">
${row("Giriş","<span class=\"mono\">"+esc(fmtPx(t.entry,d))+"</span>")}
${t.exit!=null?row("Çıkış","<span class=\"mono\">"+esc(fmtPx(t.exit,d))+"</span>"):""}
${row("Miktar","<span class=\"mono\">"+esc(fmtPx(t.qty,2))+"</span>"+(t.mult&&t.mult!==1?" × "+esc(fmtPx(t.mult,0)):""))}
${t.stop!=null?row("Stop-loss","<span class=\"mono\">"+esc(fmtPx(t.stop,d))+"</span>"):""}
${t.stop0!=null?row("İlk stop","<span class=\"mono\">"+esc(fmtPx(t.stop0,d))+"</span>"):""}
${t.tp!=null?row("Hedef","<span class=\"mono\">"+esc(fmtPx(t.tp,d))+"</span>"):""}
${t.fees?row("Komisyon","<span class=\"mono\">"+esc(money(t.fees))+"</span>"):""}
${t.fx&&t.fx!==1?row("Kur","<span class=\"mono\">"+esc(numF(t.fx,4))+"</span>"):""}
${t.setup?row("Setup",esc(t.setup)):""}
${t.emo?row("Duygu",esc(t.emo)):""}
${t.mist?row("Hata",esc(t.mist)):""}
${t.rt?row("İşlem puanı",t.rt+" ★"):""}
${t.notes?`<div style="margin-top:8px"><p class="lbl">Not</p><p style="margin-top:4px;font-size:15px;white-space:pre-wrap">${esc(t.notes)}</p></div>`:""}
</div></div>
<div class="card"><p class="lbl">Hesap</p><div class="divide" style="margin-top:8px">
${row("Hesap",esc(a?a.name:"—"))}
${row("Güncel bakiye","<span class=\"mono\">"+esc(money(a?currentBalance(a):null))+"</span>")}
${row("Equity (bu işleme kadar)","<span class=\"mono\">"+esc(money(eqAfter))+"</span>")}
</div></div>
${(longNote||needFix)?`<div class="card"><p class="lbl">Notlar</p>${longNote?`<p class="warn" style="margin-top:4px;font-size:14px">${longNote}</p>`:""}${needFix?`<p class="warn" style="margin-top:4px;font-size:14px">${si[0]} için kontrat çarpanı girilmemiş (şu an 1).${si[2]==="Forex"?" Forex çarpanı genelde 100.000.":""} Düzenle → Gelişmiş'ten gir.</p>`:""}</div>`:""}
<div class="actrow"><a class="btn md secondary" href="#/add?id=${encodeURIComponent(t.id)}">Düzenle</a><button type="button" class="btn md secondary" data-act="clone" data-id="${t.id}">Kopyala</button><button type="button" class="btn md danger" data-act="deltrade" data-id="${t.id}">Sil</button></div>
</div>`}
