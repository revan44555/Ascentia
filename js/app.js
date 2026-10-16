"use strict";
let qcEmo="",qcNote="";
function parseHash(){const h=location.hash.slice(1)||"/",q=h.split("?");const path=q[0]||"/";const params={};if(q[1])q[1].split("&").forEach(p=>{const[k,v]=p.split("=");params[k]=decodeURIComponent(v||"")});return{path,params}}
const navKey=p=>p.startsWith("/trades")?"/trades":p;

function render(){
const{path,params}=parseHash();
const view=$("#view");
document.querySelectorAll("[data-r]").forEach(a=>a.classList.toggle("on",navKey(a.getAttribute("data-r"))===navKey(path)));
if(path==="/add"){
const d=(()=>{try{return JSON.parse(localStorage.getItem("tj_draft")||"null")}catch(e){return null}})();
if(form===null||form.__for!==path+(params.id||"")){
if(params.id){const tr0=state.trades.find(t=>t.id===params.id);form=tr0?fromTrade(tr0):emptyForm();
// FIX(4): yarım kalmış düzenleme taslaktan geri yüklenir
if(d&&d.__editId===params.id)Object.assign(form,d,{date:form.date})}
else{const e=emptyForm();form=Object.assign(e,d&&d.__editId?{...d,__editId:null,id:undefined}:d||{},{date:e.date})}
form.__for=path+(params.id||"")}
}
const html=path==="/"?viewHome():path==="/trades"?viewTrades():path==="/add"?viewAdd():path==="/insights"?viewInsights():path==="/more"?viewMore():path==="/more/accounts"?viewAccounts():path==="/more/tags"?viewTags():path==="/more/data"?viewMoreData():path.startsWith("/trades/")?viewTradeDetail(decodeURIComponent(path.slice(8))):viewHome();
view.innerHTML=html;
view.classList.remove("enter");void view.offsetWidth;
[...view.querySelectorAll(".card,.empty-hero>*")].forEach((el,i)=>el.style.setProperty("--i",i));
[...view.querySelectorAll(".heat .c")].forEach((el,i)=>el.style.setProperty("--d",i));
view.classList.add("enter");
if(lastPath!==path){window.scrollTo(0,0);lastPath=path}
}

function saveForm(){
if(!form)return;
["entry","stop","tp","stop0","exit"].forEach(k=>{if(form[k]!="")form[k]=fixThou(form.symbol,form[k])});
const sym=String(form.symbol||"").trim().toUpperCase();
if(sym){const r=symFind(sym);if(r.exact)applySym(r.exact)}
const q0=form.qty;applySym(sym);form.qty=q0;
const now=nowLocal();
const ex0=form.exit===""||form.exit==null?null:num(form.exit);
// FIX(12): çıkış yoksa "plana uydu" etiketi kaydedilmez
const rec={id:form.id||newId(),date:form.date||now,symbol:sym,dir:form.dir,entry:num(form.entry),exit:ex0,qty:num(form.qty),mult:num(form.mult)||1,acc:form.acc||"",plan:ex0!=null?form.plan:"",mist:form.mist||"",stop:form.stop===""?null:num(form.stop),stop0:form.stop0===""?null:num(form.stop0),tp:form.tp===""?null:num(form.tp),fees:num(form.fees)||0,fx:num(form.fx)>0?num(form.fx):1,exitDate:form.exitDate||"",setup:form.setup||"",emo:form.emo||"",notes:form.notes||"",rt:num(form.rt),img:form.img||""};
const old0=form.id?state.trades.find(t=>t.id===form.id):null;
rec.qc=old0?(old0.qc||0):(form.qc||0);
let chkToday=null;
try{const s0=localStorage.getItem("tj_chk_"+new Date().toISOString().slice(0,10));if(typeof s0==="string"&&s0.length)chkToday=[...s0].filter(c=>c==="1").length}catch(e){}
rec.chk=old0?old0.chk:chkToday;
if(old0&&old0.grp)rec.grp=old0.grp;
const qc=QCUR[sym]||(SYMS.find(x=>x[0]===sym)&&SYMS.find(x=>x[0]===sym)[2]==="Forex"&&!sym.endsWith("USD")?sym.slice(3,6):"");
if(qc&&rec.fx===1&&ex0!=null){showFormErr("P&L kuru gerekli ("+qc+" → "+(state.prefsCur||"USD")+"). Gelişmiş → P&L kuru alanına gir.");return}
const msg=validate(rec);
if(msg){showFormErr(msg);const g=$("#symsug");if(g)g.innerHTML=symHint(true);return}
if(ex0!=null&&!rec.exitDate)rec.exitDate=now;
try{localStorage.removeItem("tj_draft")}catch(e){}
const i=state.trades.findIndex(t=>t.id===rec.id);
if(i>=0)state.trades[i]=rec;else state.trades.push(rec);
saveTrades(state.trades);
LASTLOT[sym]=rec.qty;try{localStorage.setItem("tj_lastlot_v1",JSON.stringify(LASTLOT))}catch(e){}
const justAdded=rec.id;
form=null;
location.replace("#/trades/"+encodeURIComponent(justAdded));
if(i<0)toast("Kaydedildi")
}

function tradesToCsv(trades){
const q=v=>{const s=String(v??"");return/^[=+\-@\t\r]/.test(s)?"'"+s:s};
const head=["tarih","sembol","yon","hacim","giris","kapanis","komisyon","swap","tp","sl","ilk_stop","cikis_tarihi","carpan","kur","net_pnl","R","setup","duygu","hata","plan","puan","chk","not","hesap"];
const lines=[head.join(",")];
trades.forEach(t=>{lines.push([q(formatWhen(t.date)),q(t.symbol),t.dir,q(t.qty),q(t.entry),q(t.exit),q(t.fees||""),q(t.swap||""),q(t.tp),q(t.stop),q(t.stop0),q(t.exitDate?formatWhen(t.exitDate):""),q(t.mult||1),q(t.fx||1),q(pnl(t)),q(rr(t)!=null?Math.round(rr(t)*100)/100:""),q(t.setup),q(t.emo),q(t.mist),q(t.plan),q(t.rt||""),q(t.chk==null?"":t.chk),q(t.notes),q((accountOf(t)||{}).name||"")].join(","))});
return lines.join("\n")}
function downloadText(name,text,mime){const b=new Blob([mime==="text/csv"?"﻿"+text:text],{type:mime||"text/plain"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function markBackup(){state.lastBackupAt=Date.now();saveBackupStamp(String(Date.now()))}

document.getElementById("view").addEventListener("click",e=>{
const actEl=e.target.closest("[data-act],[data-sym],[data-facc],[data-rng],[data-lchip],[data-chip],[data-qd],[data-qx],[data-tip]");
if(!actEl)return;
if(actEl.dataset.tip!==undefined&&actEl.hasAttribute("data-tip")&&!actEl.dataset.act){toast(actEl.getAttribute("data-tip"));return}
if(actEl.dataset.qd!==undefined){const m=+actEl.dataset.qd,d=new Date(Date.now()-m*6e4);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());form.date=d.toISOString().slice(0,16);const di=document.querySelector('[data-f="date"]');if(di)di.value=form.date;return}
if(actEl.dataset.qx!==undefined&&form.date){const m=+actEl.dataset.qx,b=new Date(new Date(form.date).getTime()+m*6e4),n=new Date();b.setMinutes(b.getMinutes()-b.getTimezoneOffset());n.setMinutes(n.getMinutes()-n.getTimezoneOffset());form.exitDate=(b>n?n:b).toISOString().slice(0,16);const di=document.querySelector('[data-f="exitDate"]');if(di)di.value=form.exitDate;return}
if(actEl.dataset.facc!==undefined){state.filterAccountId=actEl.dataset.facc;render();return}
if(actEl.dataset.rng!==undefined){RANGE=actEl.dataset.rng;render();return}
if(actEl.dataset.lchip!==undefined){const[k,v]=actEl.dataset.lchip.split(":");listState[k]=listState[k]===v?"":v;const tl=$("#tradeList");if(tl)tl.innerHTML=tradesListHtml();document.querySelectorAll("[data-lchip]").forEach(c=>{const[a,b]=c.dataset.lchip.split(":");c.classList.toggle("on",listState[a]===b);c.setAttribute("aria-pressed",listState[a]===b)});return}
if(actEl.dataset.qcemo!==undefined){qcEmo=qcEmo===actEl.dataset.qcemo?"":actEl.dataset.qcemo;render();return}
if(actEl.dataset.chip!==undefined&&form){const k=actEl.dataset.chip,v=actEl.dataset.v;
if(k==="acc"||k==="dir"){form[k]=v;render();return}
if(form[k]===v&&actEl.dataset.off!=="0"){form[k]=""}else form[k]=v;
if(k==="rt")render();else{const on=form[k]===v;actEl.classList.toggle("on",on);actEl.classList.toggle("off",!on);actEl.setAttribute("aria-pressed",on)}
return}
if(actEl.dataset.sym!==undefined){applySym(actEl.dataset.sym);render();return}
const act=actEl.dataset.act;if(!act)return;
if(act==="save"){saveForm();return}
if(act==="qcsave"){const t0=state.trades.find(x=>x.id===actEl.dataset.id);if(!t0)return;if(qcEmo)t0.emo=qcEmo;const n=((document.getElementById("qcNote")||{}).value||"").trim();if(n)t0.notes=t0.notes?t0.notes+"\n"+n:n;t0.qc=1;qcEmo="";qcNote="";saveTrades(state.trades);toast("Değerlendirme kaydedildi");render();return}
if(act==="imgdel"){if(form)form.img="";render();return}
if(act==="install"){if(!INSTALL_PROMPT)return;INSTALL_PROMPT.prompt();INSTALL_PROMPT=null;render();return}
if(act==="togglemore"){moreOpen=!moreOpen;render();return}
if(act==="theme"){state.theme=actEl.dataset.v;saveTheme(state.theme);document.documentElement.classList.add("tx");applyTheme();setTimeout(()=>document.documentElement.classList.remove("tx"),400);render();return}
if(act==="jsonexport"){const j=backupJson();markBackup();if(navigator.share){const f=new File([j],"ascentia-defter.json",{type:"application/json"});if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:"Ascentia yedek"}).catch(()=>{});render();return}}downloadText("ascentia-defter.json",j,"application/json");toast("Yedek indirildi");render();return}
// FIX(11): csvexport yalnızca Veri sayfasındadır; ölü inRange koşulu kaldırıldı
if(act==="csvexport"){const csv=tradesToCsv(filterAccount(state.trades,state.filterAccountId));downloadText("ascentia-islemler.csv",csv,"text/csv");toast("CSV indirildi");return}
if(act==="jsonmerge"){const inp=document.querySelector('[data-file="json"]');if(inp){inp.dataset.merge="1";inp.click()}return}
if(act==="linkfile"){linkFile();return}
if(act==="unlinkfile"){unlinkFile();toast("Otomatik kayıt kapatıldı");return}
if(act==="fileresume"){resumeFile();return}
if(act==="calprev"){calOff--;render();return}
if(act==="calnext"){calOff++;render();return}
if(act==="more"){listState.limit+=50;const tl=$("#tradeList");if(tl)tl.innerHTML=tradesListHtml();return}
if(act==="addacc"){const i=document.querySelector("[data-newacc]");const n=(i&&i.value||"").trim().slice(0,24);if(!n){toast("Hesap adı gir");return}state.accounts.push({id:"a"+Date.now().toString(36),name:n,balance:0,dl:0,md:0,cur:""});saveAccounts(state.accounts);render();return}
if(act==="delacc"){const id=actEl.dataset.id;if(state.accounts.length<=1){toast("Son hesap silinemez","err");return}
if(state.trades.some(t=>accountId(t)===id)){toast("Bu hesapta işlem var","err");return}
if(!typedConfirm("Hesap silinsin mi?"))return;
state.accounts=state.accounts.filter(a=>a.id!==id);if(state.filterAccountId===id)state.filterAccountId="all";saveAccounts(state.accounts);render();return}
if(act==="addtag"){const i=document.querySelector('[data-newtag="'+actEl.dataset.kind+'"]');addTag(actEl.dataset.kind,i?i.value:"");return}
if(act==="deltag"){const{k,v}=actEl.dataset;state.tags[k]=state.tags[k].filter(x=>x!==v);saveTags(state.tags);render();return}
if(act==="tagdraft"){tagDraft={kind:actEl.dataset.kind,value:""};render();return}
if(act==="addsym"){const raw=(form.symbol||"").trim().toUpperCase();if(raw.length<2){toast("En az 2 karakter");return}
if(!state.tags.syms.includes(raw)){state.tags.syms.push(raw);saveTags(state.tags)}
applySym(raw);render();return}
if(act==="deltrade"){const id=actEl.dataset.id,t=state.trades.find(x=>x.id===id);if(!t)return;
if(!typedConfirm("İşlem silinsin mi? ("+t.symbol+" "+formatWhen(t.date)+")"))return;
const idx=state.trades.indexOf(t);state.trades.splice(idx,1);saveTrades(state.trades);location.hash="#/trades";
toast("Silindi",null,2200,{label:"Geri al",fn:()=>{state.trades.splice(idx,0,t);saveTrades(state.trades);render()}});return}
if(act==="clone"){const t=state.trades.find(x=>x.id===actEl.dataset.id);if(!t)return;const c=fromTrade(t);delete c.id;form={...c,date:nowLocal(),__for:"/add"};location.hash="#/add";render();return}
if(act==="clear"){if(!typedConfirm("TÜM veriler silinsin mi?"))return;
const d=state.theme,f=state.fileName;try{localStorage.clear()}catch(e){}
Object.assign(state,{trades:[],accounts:[{id:"a1",name:"Ana hesap",balance:0,dl:0,md:0,cur:""}],tags:JSON.parse(JSON.stringify(DEFAULT_TAGS)),filterAccountId:"all",lastBackupAt:null,memoryOnly:false,file:"none",fileName:f,theme:d});
saveBackupStamp("");location.hash="#/";render();return}
if(act==="closetrade"){const t=state.trades.find(x=>x.id===actEl.dataset.id);if(!t||t.exit!=null)return;const p=num($("#cx").value),q=$("#cq")?num($("#cq").value):null,e=$("#fe-cq");
if(p==null||p<=0){if(e)e.textContent="Geçerli bir çıkış fiyatı gir.";return}
// FIX(3): kısmi kapanış tek çekirdekten (applyPartial) — prompt tabanlı kopya kaldırıldı
if(q!=null){const pe=applyPartial(t.id,q,p);if(pe){if(e)e.textContent=pe;return}toast("Kısmi kapatıldı: "+numF(q,2)+" @ "+numF(p,4)+" · kalan "+numF(t.qty,2));render();return}
t.exit=p;t.exitDate=nowLocal()<t.date?t.date:nowLocal();saveTrades(state.trades);render();return}
});

document.getElementById("view").addEventListener("input",e=>{
const t=e.target;if(!t.dataset)return;
if(t.id==="qcNote"){qcNote=t.value;return}
if(t.dataset.lq!==undefined){listState.q=t.value;const tl=$("#tradeList");if(tl)tl.innerHTML=tradesListHtml();return}
if(t.dataset.newtag!==undefined||t.dataset.newacc!==undefined||t.dataset.aid!==undefined){
// FIX(8): hesap alanları her tuşta IndexedDB'ye yazmaz — 400 ms debounce
if(t.dataset.aid!==undefined){const[f,id]=t.dataset.aid.split(":");const a=state.accounts.find(x=>x.id===id);if(!a)return;
a[f]=f==="name"?(t.value||"").toString().slice(0,32):f==="cur"?(t.value||"").toUpperCase().slice(0,3):num(t.value)||0;
if(f==="cur"&&a.cur)state.prefsCur=a.cur;
clearTimeout(accTimer);accTimer=setTimeout(()=>saveAccounts(state.accounts),400)}
return}
if(t.dataset.tagdraft!==undefined){if(tagDraft)tagDraft.value=t.value;return}
if(!form)return;
if(t.dataset.f===undefined)return;
const f=t.dataset.f;let v=t.value;
if(["entry","stop","tp","stop0","exit"].includes(f)){const f2=fixThou(form.symbol,v);if(f2!==v){t.value=f2;v=f2}}
form[f]=v;
if(f==="symbol"){const r=symFind(v);if(r.exact)applySym(r.exact);form.symbol=v;const mi=document.querySelector("[data-f=mult]");if(mi&&form.multAuto)mi.value=form.mult;const su=$("#symsug");if(su)su.innerHTML=symHint(false);return}
if(f==="exit"){const pw=$("#planwrap");if(pw)pw.hidden=!t.value.trim();
// FIX(12): çıkış silinirken plan etiketi de temizlenir
if(!t.value.trim()){form.plan="";document.querySelectorAll('[data-chip="plan"]').forEach(c=>{c.classList.remove("on");c.classList.add("off");c.setAttribute("aria-pressed","false")})}
const lh=$("#liveh");if(lh)lh.innerHTML=liveHint();return}
if(f==="exitDate"||f==="date"||f==="fees"){const lh=$("#liveh");if(lh)lh.innerHTML=liveHint();return}
if(f==="stop"||f==="stop0"||f==="tp"||f==="qty"||f==="mult"||f==="fx"||f==="entry"){const lh=$("#liveh");if(lh)lh.innerHTML=liveHint();return}
});

document.getElementById("view").addEventListener("change",e=>{
const t=e.target;
if(t.dataset&&t.dataset.file==="img"){const f=t.files[0];t.value="";if(!f)return;
if(!/^image\//.test(f.type)){toast("Görsel dosyası seç","err");return}
imgPrep(f).then(u=>{if(!form)return;form.img=u;render();toast("Görsel eklendi")}).catch(()=>toast("Görsel eklenemedi (çok büyük olabilir)","err"));return}
if(t.dataset&&t.dataset.file!==undefined){const f=t.files[0];t.value="";if(!f)return;
if(t.dataset.file==="csv"){f.text().then(txt=>{const st=importCsv(txt);state.trades=st.trades;saveTrades(state.trades);if(st.added){toast(st.added+" işlem içe aktarıldı"+(st.skipped?" · "+st.skipped+" atlandı":"")+(st.why?" ("+st.why+")":""));if(st.nofx)toast(st.nofx+" işlemde P&L kuru eksik — kapanmış sonuçlar bozuk olabilir","err")}else{toast("İçe aktarılamadı: "+(st.why||"satır bulunamadı"),"err")}}).catch(()=>toast("CSV okunamadı","err"));return}
if(t.dataset.file==="json"){f.text().then(txt=>{let raw;try{raw=JSON.parse(txt)}catch(e2){toast("JSON okunamadı","err");return}
if(t.dataset.merge==="1"){const r=jsonmerge(raw);toast(r?r.added+" eklendi · "+r.skipped+" atlandı":"Geçersiz yedek","err");if(r)render();return}
const n=restoreJson(raw,!state.trades.length);
if(n!=null){saveTrades(state.trades);saveAccounts(state.accounts);saveTags(state.tags);toast(n+" işlem geri yüklendi")}else if(n===null&&state.trades.length){/* vazgeçildi */}
render()}).catch(()=>toast("Dosya okunamadı","err"));return}}
});

// FIX(1): tek keydown handler — Enter sonraki alana geçer, son alanda kaydeder; datetime dahil tutarlı
document.getElementById("view").addEventListener("keydown",e=>{
if(e.key!=="Enter"||!e.target.dataset)return;
if(e.target.dataset.f&&e.target.tagName==="INPUT"){e.preventDefault();const all=[...document.querySelectorAll("#view input[data-f]")],i=all.indexOf(e.target);if(all[i+1])all[i+1].focus();else saveForm();return}
if(e.target.dataset.tagdraft!==undefined&&tagDraft){e.preventDefault();const v=e.target.value,kind=tagDraft.kind;tagDraft=null;addTag(kind,v);return}
if(e.target.dataset.newacc!==undefined){e.preventDefault();const b=document.querySelector('[data-act="addacc"]');if(b)b.click();return}
if(e.target.dataset.newtag!==undefined){e.preventDefault();const b=e.target.closest(".card")&&e.target.closest(".card").querySelector('[data-act="addtag"]');if(b)b.click();return}
});

document.getElementById("view").addEventListener("pointermove",e=>{
if(!EQ)return;const svg=e.target.closest&&e.target.closest("#eqsvg");if(!svg)return;const r=svg.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*EQ.W;let i=Math.round((x-EQ.pl)/EQ.iw*(EQ.pts.length-1));i=Math.max(0,Math.min(EQ.pts.length-1,i));const p=EQ.pts[i],cur=svg.querySelector("#eqcur");if(cur){cur.setAttribute("x",x.toFixed(1));cur.setAttribute("opacity","1")}const read=document.getElementById("eqread");if(read)read.textContent=(p.date?formatWhen(p.date):"Başlangıç")+" · "+money(p.equity)});
document.getElementById("view").addEventListener("pointerout",e=>{if(!EQ)return;if(e.target.closest&&e.target.closest("#eqsvg"))return;const svg=document.getElementById("eqsvg");if(!svg)return;const cur=svg.querySelector("#eqcur");if(cur)cur.setAttribute("opacity","0");const read=document.getElementById("eqread");if(read)read.textContent=""});

let accTimer=null;

window.addEventListener("hashchange",()=>{
if(!location.hash.startsWith("#/add")){
// FIX(4): düzenleme formları da taslak olarak korunur (anahtar: __editId)
if(form&&form.__for&&form.__for.startsWith("/add")&&Object.keys(form).some(k=>!k.startsWith("__")&&form[k]!==emptyForm()[k])){try{localStorage.setItem("tj_draft",JSON.stringify({...form,__editId:form.id||null}))}catch(e){}}
form=null}
render()});

// FIX(9): sekmeler arası senkron etiketleri de kapsar
window.addEventListener("storage",e=>{if(e.key!=="tj_ts")return;(async()=>{const t=await kvGet("trades"),a=await kvGet("accounts"),g=await kvGet("tags");if(Array.isArray(t))state.trades=t;if(Array.isArray(a)&&a.length)state.accounts=a;if(g&&typeof g==="object"&&!Array.isArray(g))state.tags=normTags(g);render()})()});

(async()=>{await loadAll();await fileInit();render()})();
// FIX(18): PWA — yüklenebilirlik + çevrimdışı (yalnızca gerçek tarayıcıda)
let INSTALL_PROMPT=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();INSTALL_PROMPT=e;render()});
if("serviceWorker" in navigator&&/^https?:$/.test(location.protocol||""))window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(()=>{})});
