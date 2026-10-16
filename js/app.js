"use strict";
function parseHash(){const h=location.hash.replace(/^#/,"")||"/";const q=h.indexOf("?");let path=h,params={};
if(q>=0){path=h.slice(0,q);new URLSearchParams(h.slice(q+1)).forEach((v,k)=>params[k]=v)}
return{path,params}}
function navKey(path){if(path==="/")return"/";for(const p of["/trades","/add","/insights","/more"])if(path===p||path.startsWith(p+"/"))return p;return"/"}
function render(){
const{path,params}=parseHash();const view=$("#view");let html="";
if(path==="/")html=viewHome();
else if(path==="/trades")html=viewTrades();
else if(path==="/add"){
if(form===null||form.__for!==path+(params.id||"")){form=(()=>{const t=params.id&&state.trades.find(x=>x.id===params.id);if(t)return fromTrade(t);const e=emptyForm();if(!params.id){try{const d=JSON.parse(sessionStorage.getItem("tj_draft")||"null");if(d)Object.assign(e,d,{date:e.date})}catch(_){}}return e})();form.__for=path+(params.id||"");moreOpen=detailsFilled(form);techForce=false;tagDraft=null}
html=viewAdd()}
else if(path==="/insights")html=viewInsights();
else if(path==="/more")html=viewMore();
else if(path==="/more/accounts")html=viewMoreAccounts();
else if(path==="/more/tags")html=viewMoreTags();
else if(path==="/more/data")html=viewMoreData();
else if(path.startsWith("/trades/"))html=viewTradeDetail(decodeURIComponent(path.slice(8)));
else html=viewHome();
const changed=path!==lastPath;lastPath=path;view.classList.remove("enter");view.innerHTML=html;
const nk=navKey(path);
document.querySelectorAll("[data-r]").forEach(a=>a.classList.toggle("on",a.dataset.r===nk));
if(changed){window.scrollTo(0,0);view.querySelectorAll(".card,.empty-hero>*").forEach((el,i)=>el.style.setProperty("--i",Math.min(i,12)));view.querySelectorAll(".heat .c").forEach((el,i)=>el.style.setProperty("--d",i));void view.offsetWidth;view.classList.add("enter");countUp()}}

function saveForm(){if(!form)return;
for(const k of["entry","stop","tp","stop0","exit"])form[k]=fixThou(form.symbol,form[k]);
const sf=symFind(form.symbol),sym=sf.exact||sf.auto;if(!sym){const e=$("#err"),raw=String(form.symbol||"").trim();showFormErr(raw?"Sembol listede yok.":"Sembol gerekli.");const g=$("#symsug");if(g&&raw){g.innerHTML=symHint(true)}return}{const q0=form.qty;applySym(sym);form.qty=q0}
const si0=SYMS.find(x=>x[0]===sym);const qc=QCUR[sym]||(si0&&si0[2]==="Forex"&&!sym.endsWith("USD")?sym.slice(3,6):null);if(qc&&!(num(form.fx)>0)){moreOpen=true;techForce=true;render();const ee=$("#err");if(ee)ee.textContent=sym+" için P&L kuru gerekli ("+qc+" → hesap para birimi). Örn. "+(qc==="JPY"?"JPY için 1/kur ≈ 0,0067.":qc+" için "+qc+"/USD kuru.");const fi=document.querySelector("[data-f=fx]");if(fi){const fe=$("#fe-fx");if(fe)fe.textContent="P&L kuru gerekli.";fi.setAttribute("aria-invalid","true");fi.scrollIntoView({block:"center",behavior:"smooth"});fi.focus({preventScroll:true})}return}
const entry=num(form.entry),qty=num(form.qty),ex=num(form.exit),st=num(form.stop),tp=num(form.tp),fe=num(form.fees),mu=num(form.mult);
const dir=form.dir==="SHORT"?"SHORT":"LONG";
const error=validate({date:form.date,symbol:form.symbol.trim(),dir,entry,qty,exit:ex,stop:st,tp,fees:fe,mult:mu,exitDate:form.exitDate,stop0:num(form.stop0)});
if(error){showFormErr(error);return}
if(st!=null&&entry>0&&Math.abs(entry-st)/entry>0.2){const sig=entry+"|"+st;if(form._farOk!==sig){form._farOk=sig;const m="Stop girişten %"+Math.round(Math.abs(entry-st)/entry*100)+" uzakta. Doğruysa Kaydet'e tekrar dokun.";const ee=$("#err");if(ee)ee.textContent=m;toast(m,"err",3500);const si=document.querySelector('[data-f="stop"]');if(si){si.setAttribute("aria-invalid","true");si.scrollIntoView({block:"center",behavior:"smooth"})}return}}
const old0=state.trades.find(t=>t.id===form.id),cv0=lsg(chkKey());const rec={rt:num(form.rt)>=1?Math.min(5,Math.round(num(form.rt))):null,chk:old0?old0.chk:(cv0?[...cv0].filter(c=>c==="1").length:null),id:form.id||newId(),...(old0&&old0.grp?{grp:old0.grp}:{}),date:form.date,symbol:form.symbol.trim().toUpperCase(),dir,entry,exit:ex,qty,stop:st,tp,fees:fe||0,mult:mu||1,exitDate:ex!=null?form.exitDate:"",stop0:num(form.stop0),fx:num(form.fx)>0?num(form.fx):1,acc:form.acc||state.accounts[0].id,plan:form.plan,mist:form.mist,setup:form.setup,emo:form.emo,notes:form.notes.trim()};
const i=state.trades.findIndex(t=>t.id===rec.id);
if(i>=0)state.trades[i]=rec;else state.trades.push(rec);
LASTLOT[form.symbol.trim().toUpperCase()]=form.qty;lsSet("tj_lastlot_v1",JSON.stringify(LASTLOT));saveTrades(state.trades);toast("Kaydedildi");form=null;try{sessionStorage.removeItem("tj_draft")}catch(_){}
location.replace("#/trades/"+encodeURIComponent(rec.id))}

function tradesToCsv(trades){
const HEADERS=["tarih","sembol","yon","giris","cikis","miktar","stop","hedef","komisyon","net_pnl","R","setup","duygu","not","carpan","hesap","plan","hata","cikis_tarihi","ilk_stop","kur"];
const q=v=>{let s=String(v??"");if(typeof v==="string"&&/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
return[HEADERS.join(",")].concat(trades.map(t=>[t.date,t.symbol,t.dir,t.entry,t.exit,t.qty,t.stop,t.tp,t.fees,pnl(t),rr(t)==null?"":Math.round(rr(t)*100)/100,t.setup,t.emo,t.notes,t.mult||1,accountOf(t)?accountOf(t).name:"",t.plan,t.mist,t.exitDate,t.stop0,t.fx||1].map(q).join(","))).join("\n")}
function downloadText(filename,data,mime){const blob=new Blob([mime.startsWith("text/csv")?"\uFEFF"+data:data],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
function markBackup(){state.lastBackupAt=Date.now();saveBackupStamp(state.lastBackupAt)}
function parseCsv(s,dl){dl=dl||",";const R=[];let r=[],c="",qu=false;for(let i=0;i<s.length;i++){const ch=s[i];
if(qu){if(ch==='"'){if(s[i+1]==='"'){c+='"';i++}else qu=false}else c+=ch}
else if(ch==='"')qu=true;else if(ch===dl){r.push(c);c=""}
else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&s[i+1]==="\n")i++;r.push(c);R.push(r);r=[];c=""}else c+=ch}
if(c!==""||r.length){r.push(c);R.push(r)}return R}
function importCsv(text){
const tx=text.replace(/^\uFEFF/,""),fl=tx.split("\n")[0];const rows=parseCsv(tx,fl.split(";").length>fl.split(",").length?";":",");if(!rows.length)return{added:0,skipped:0};
const h=(rows.shift()||[]).map(x=>x.trim().toLowerCase());
const AL={tarih:["open time","date","time"],sembol:["symbol","instrument"],giris:["open price","price","entry"],cikis:["close price","exit"],miktar:["volume","lots","size","qty"],yon:["type","side","direction"]};AL.cikis_tarihi=["close time","closing time","close date"];AL.stop=["s / l","s/l","sl","stop loss"];AL.hedef=["t / p","t/p","tp","take profit"];AL.komisyon=["commission","fee","fees"];AL.swap=["swap"];AL.sembol.push("item","pair");AL.giris.push("open","avg price");AL.miktar.push("amount","quantity","executed qty");AL.tarih.push("opening time","open date","date(utc)","time(utc)");
const nth=(n,k)=>{let c=0;for(let i=0;i<h.length;i++)if(h[i]===n&&++c===k)return i;return-1};
const g=(r,k)=>{const i=[k].concat(AL[k]||[]).map(x=>h.indexOf(x)).find(x=>x>=0);if(i==null){if(k==="cikis"&&nth("price",2)>=0)return r[nth("price",2)]??"";if(k==="cikis_tarihi"&&nth("time",2)>=0)return r[nth("time",2)]??"";return""}return r[i]??""};
let why="";const nn=num;const accs=state.accounts.slice();const trades=state.trades.slice();let added=0,skipped=0;
for(const r of rows){
if(!r.some(cell=>cell.trim()))continue;
const entry=nn(g(r,"giris")),qty=nn(g(r,"miktar")),sym=(x=>{const f=symFind(x);return f.exact||f.auto||x.trim().toUpperCase()})(g(r,"sembol"));
if(!sym||entry==null||qty==null){skipped++;why=why||"giriş/miktar/sembol sütunu okunamadı";continue}
const hn=g(r,"hesap").trim();let ac=hn?accs.find(a=>a.name===hn):undefined;
if(hn&&!ac){ac={id:"a"+newId(),name:hn,balance:0};accs.push(ac)}
let d0=g(r,"tarih").trim().replace(/^(\d{2})\.(\d{2})\.(\d{4})/,"$3-$2-$1").replace(/^(\d{4})\.(\d{2})\.(\d{2})/,"$1-$2-$3").replace(" ","T");if(/^\d{4}-\d{2}-\d{2}$/.test(d0))d0+="T00:00";if(!d0){skipped++;why=why||"tarih sütunu yok veya boş";continue}if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(d0)){skipped++;why=why||"tarih okunamadı";continue}const date=d0.slice(0,16);const dir=["SHORT","SELL"].includes(g(r,"yon").trim().toUpperCase())?"SHORT":"LONG";
const acId=(ac||accs[0]).id;
if(trades.some(t=>t.date===date&&t.symbol===sym&&t.entry===entry&&t.qty===qty&&t.dir===dir&&(t.acc||accs[0].id)===acId)){skipped++;continue}
const rec={id:newId(),date,symbol:sym,dir,entry,exit:nn(g(r,"cikis")),exitDate:(x=>{x=x.trim().replace(/^(\d{2})\.(\d{2})\.(\d{4})/,"$3-$2-$1").replace(/^(\d{4})\.(\d{2})\.(\d{2})/,"$1-$2-$3").replace(" ","T");if(/^\d{4}-\d{2}-\d{2}$/.test(x))x+="T00:00";return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(x)?x.slice(0,16):""})(g(r,"cikis_tarihi")),stop0:nn(g(r,"ilk_stop")),qty,stop:nn(g(r,"stop")),tp:nn(g(r,"hedef")),fees:(c=>Math.max(0,Math.round((c-(nn(g(r,"swap"))||0))*100)/100))(Math.abs(nn(g(r,"komisyon"))||0)),mult:nn(g(r,"carpan"))||(SYMS.find(x=>x[0]===sym)||[0,1])[1],fx:nn(g(r,"kur"))||1,acc:(ac||accs[0]).id,plan:g(r,"plan")==="evet"||g(r,"plan")==="hayır"?g(r,"plan"):"",mist:g(r,"hata"),setup:g(r,"setup"),emo:g(r,"duygu"),notes:g(r,"not")};const ve=validate(rec);if(ve){skipped++;why=why||ve;continue}trades.push(rec);
added++}
state.trades=trades;state.accounts=accs;saveTrades(trades);saveAccounts(accs);
const nofx=trades.filter(t=>(QCUR[t.symbol]||((SYMS.find(x=>x[0]===t.symbol)||[])[2]==="Forex"&&!t.symbol.endsWith("USD")))&&!(t.fx>0&&t.fx!==1)).length;if(nofx)setTimeout(()=>toast(nofx+" işlemde P&L kuru eksik. USD dışı enstrümanlarda P&L yanlış görünür.","",6500),1200);
return{added,skipped,why}}

document.getElementById("view").addEventListener("click",e=>{
const el=e.target.closest("[data-act],[data-chip],[data-facc],[data-lchip],[data-rng],[data-sym],[data-tip],[data-qd],[data-qx]");if(!el)return;
if(el.dataset.tip&&!el.dataset.act){toast(el.dataset.tip,"",4500);return}
if(el.dataset.qx!==undefined){const x=new Date();if(el.dataset.qx!=="0"&&form.date){const b=new Date(form.date);if(!isNaN(b))x.setTime(b.getTime()+Number(el.dataset.qx)*6e4)}x.setMinutes(x.getMinutes()-x.getTimezoneOffset());form.exitDate=x.toISOString().slice(0,16);const di=document.querySelector("[data-f=exitDate]");if(di)di.value=form.exitDate;return}if(el.dataset.qd!==undefined){const x=new Date();x.setMinutes(x.getMinutes()-x.getTimezoneOffset()-Number(el.dataset.qd));form.date=x.toISOString().slice(0,16);const di=document.querySelector("[data-f=date]");if(di)di.value=form.date;return}
if(el.dataset.sym){applySym(el.dataset.sym);render();return}
if(el.dataset.rng){RANGE=el.dataset.rng;listState.limit=50;render();return}
if(el.dataset.facc){state.filterAccountId=el.dataset.facc;render();return}
if(el.dataset.lchip){listState.limit=50;const[k,v]=el.dataset.lchip.split(":");if(k==="side")listState.side=listState.side===v?"":v;else listState.result=listState.result===v?"":v;render();return}
if(el.dataset.chip){const g=el.dataset.chip,v=el.dataset.v;
if(form){if(form[g]===v&&el.dataset.off!=="0")form[g]="";else form[g]=v;render()}
return}
const act=el.dataset.act;
if(act==="theme"){state.theme=el.dataset.v;saveTheme(state.theme);document.documentElement.classList.add("tx");setTimeout(()=>document.documentElement.classList.remove("tx"),500);applyTheme();render()}
else if(act==="save"){saveForm()}else if(act==="clone"){const t=state.trades.find(x=>x.id===el.dataset.id);if(t){form=emptyForm();Object.assign(form,{symbol:t.symbol,dir:t.dir,qty:String(t.qty),acc:t.acc||"",mult:t.mult&&t.mult!==1?String(t.mult):"",setup:t.setup||"",emo:t.emo||"",__for:"/add"});moreOpen=detailsFilled(form);techForce=false;location.hash="#/add"}}
else if(act==="more"){listState.limit+=50;render()}
else if(act==="addsym"){const n=String(form.symbol||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(n.length<2)return;state.tags.syms=(state.tags.syms||[]).concat(n);saveTags(state.tags);applySym(n);toast(n+" özel sembol olarak eklendi");render()}
else if(act==="fixmult"){const t=state.trades.find(x=>x.id===el.dataset.id),i=t&&SYMS.find(x=>x[0]===t.symbol);if(i){t.mult=i[1];saveTrades(state.trades);toast("Çarpan güncellendi");render()}}
else if(act==="sharejson"){const f=new File([backupJson()],"ascentia-yedek.json",{type:"application/json"});if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:"Ascentia yedeği"}).catch(()=>{});else toast("Bu cihaz dosya paylaşımını desteklemiyor","err")}
else if(act==="calprev"){calOff--;render()}else if(act==="calnext"){calOff++;render()}else if(act==="closetrade"){closeTrade(el.dataset.id)}else if(act==="partial"){partialClose(el.dataset.id)}else if(act==="filelink"){linkFile()}else if(act==="fileresume"){resumeFile()}else if(act==="fileunlink"){unlinkFile()}
else if(act==="deltag"){const k=el.dataset.kind,v=el.dataset.v,f={setups:"setup",emos:"emo",mists:"mist"}[k],n=state.trades.filter(t=>t[f]===v).length;if(!confirm(n?"“"+v+"” "+n+" işlemde kullanılıyor. Listeden kaldırılsın mı? İşlemlerdeki kayıt değişmez.":"“"+v+"” listeden silinsin mi?"))return;state.tags[k]=state.tags[k].filter(x=>x!==v);saveTags(state.tags);render()}
else if(act==="togglemore"){moreOpen=!moreOpen;render()}
else if(act==="tagdraft"){tagDraft={kind:el.dataset.kind,value:""};render();const i=document.querySelector("[data-tagdraft]");if(i)i.focus()}
else if(act==="addacc"){const i=document.querySelector("[data-newacc]");const n=(i?i.value:"").trim();if(!n)return;state.accounts.push({id:"a"+Date.now().toString(36),name:n,balance:0});saveAccounts(state.accounts);render();toast("Hesap eklendi")}
else if(act==="delacc"){const id=el.dataset.id;if(state.accounts.length<=1)return;if(state.trades.some(t=>accountId(t)===id))return;state.accounts=state.accounts.filter(a=>a.id!==id);saveAccounts(state.accounts);render()}
else if(act==="deltrade"){const id=el.dataset.id,idx=state.trades.findIndex(t=>t.id===id);if(idx>=0){const gone=state.trades[idx];state.trades=state.trades.filter(t=>t.id!==id);saveTrades(state.trades);location.hash="#/trades";toast("İşlem silindi","",7000,{label:"Geri al",fn:()=>{if(state.trades.some(t=>t.id===gone.id))return;state.trades.splice(Math.min(idx,state.trades.length),0,gone);saveTrades(state.trades);toast("İşlem geri alındı");render()}})}}
else if(act==="clear"){if(typedConfirm("Tüm işlemler, hesaplar ve etiketler silinecek. "+backupNote()+" Bağlı yedek dosyasına dokunulmaz.")){if(fh){fh=null;state.file="none";state.fileName="";kvSet("fh",null)}state.trades=[];state.accounts=[{id:"a1",name:"Ana hesap",balance:0}];state.tags=JSON.parse(JSON.stringify(DEFAULT_TAGS));state.lastBackupAt=null;saveTrades(state.trades);saveAccounts(state.accounts);saveTags(state.tags);saveBackupStamp("");toast("Defter sıfırlandı");render()}}
else if(act==="csvexport"){downloadText("ascentia-trades.csv",tradesToCsv(filterAccount(state.trades,state.filterAccountId).filter(t=>parseHash().path==="/insights"?inRange(t):true)),"text/csv;charset=utf-8");toast("CSV indirildi")}
else if(act==="jsonexport"){downloadText("ascentia-backup.json",backupJson(),"application/json");markBackup();toast("JSON yedek indirildi");render()}
});

document.getElementById("view").addEventListener("input",e=>{
const t=e.target;
if(t.dataset.f&&form){if(["entry","stop","tp","stop0","exit"].includes(t.dataset.f)){const fx=fixThou(form.symbol,t.value);if(fx!==t.value)t.value=fx}form[t.dataset.f]=t.value;{const fe=$("#fe-"+t.dataset.f);if(fe)fe.textContent="";t.removeAttribute("aria-invalid");const ge=$("#err");if(ge)ge.textContent=""}if(t.dataset.f==="exit"){const pw=$("#planwrap");if(pw)pw.hidden=!t.value.trim()}if(t.dataset.f==="mult")form.multAuto=false;if(["entry","stop","tp","stop0","qty","exit","fees"].includes(t.dataset.f)){const h=$("#liveh");if(h)h.innerHTML=liveHint()}if(t.dataset.f==="symbol"){const r=symFind(t.value);if(r.exact)applySym(r.exact);form.symbol=t.value;const sg=$("#symsug");if(sg)sg.innerHTML=symHint(false);const mi=document.querySelector("[data-f=mult]");if(mi)mi.value=form.mult}return}
if(t.dataset.lq!==undefined){listState.q=t.value;listState.limit=50;const l=$("#tradeList");if(l)l.innerHTML=tradesListHtml();return}
if(t.dataset.aid){const a=state.accounts.find(x=>x.id===t.dataset.aid);if(a){a[t.dataset.af]=["balance","dl","md"].includes(t.dataset.af)?(num(t.value)||0):(t.value||a.name);saveAccounts(state.accounts)}return}
if(t.dataset.tagdraft!==undefined&&tagDraft){tagDraft.value=t.value}
});
document.getElementById("view").addEventListener("mousedown",e=>{if(e.target.closest&&e.target.closest("[data-sym],[data-act=addsym]"))e.preventDefault()});
document.getElementById("view").addEventListener("keydown",e=>{
if(e.key==="Enter"&&form&&e.target.tagName==="INPUT"&&e.target.dataset&&e.target.dataset.f){e.preventDefault();{const all=[...document.querySelectorAll("#view input[data-f]")],i=all.indexOf(e.target);if(all[i+1])all[i+1].focus();else e.target.blur()}return}
if(e.key==="Enter"&&e.target.dataset&&e.target.dataset.tagdraft!==undefined&&tagDraft){e.preventDefault();
const name=tagDraft.value.trim();
if(name&&!state.tags[tagDraft.kind].includes(name)){state.tags[tagDraft.kind].push(name);saveTags(state.tags)}
if(name&&form){const key=tagDraft.kind==="setups"?"setup":tagDraft.kind==="emos"?"emo":"mist";form[key]=name}
tagDraft=null;render()}
});
document.getElementById("view").addEventListener("change",e=>{
const t=e.target;
if(t.dataset.f==="symbol"&&form){const raw=t.value.trim().toUpperCase(),r=symFind(t.value),nm=r.exact||r.auto;if(nm){if(raw&&nm!==raw)toast(raw+" → "+nm+" olarak düzeltildi");applySym(nm);t.value=nm}const sg=$("#symsug");if(sg)sg.innerHTML=symHint(true);const mi=document.querySelector("[data-f=mult]");if(mi)mi.value=form.mult}
else if(t.dataset.file==="csv"&&t.files&&t.files[0]){const f=t.files[0];t.value="";f.text().then(text=>{const r=importCsv(text);render();toast(r.added+" işlem içe aktarıldı"+(r.skipped?", "+r.skipped+" atlandı":"")+(r.why?" ("+r.why+")":""))}).catch(()=>toast("Dosya okunamadı"))}
else if(t.dataset.file==="jsonmerge"&&t.files&&t.files[0]){const f=t.files[0];t.value="";f.text().then(text=>{try{const raw=JSON.parse(text);if(!raw||!Array.isArray(raw.trades)){toast("Geçersiz yedek dosyası","err");return}const key=x=>[x.date,x.symbol,x.entry,x.qty,x.dir,x.acc||state.accounts[0].id].join("|"),have=new Set(state.trades.map(key)),ids=new Set(state.trades.map(x=>x.id));let add=0;raw.trades.map(normTrade).filter(Boolean).forEach(x=>{if(have.has(key(x)))return;if(ids.has(x.id))x.id=newId();state.trades.push(x);have.add(key(x));add++});(Array.isArray(raw.accounts)?raw.accounts:[]).forEach(a=>{if(a&&a.id&&!state.accounts.some(y=>y.id===a.id))state.accounts.push({id:String(a.id),name:String(a.name||"Hesap"),balance:num(a.balance)||0})});saveTrades(state.trades);saveAccounts(state.accounts);render();toast(add+" yeni işlem eklendi")}catch(err){toast("Dosya okunamadı","err")}})}
else if(t.dataset.file==="json"&&t.files&&t.files[0]){const f=t.files[0];t.value="";f.text().then(text=>{try{const raw=JSON.parse(text);if(!raw||typeof raw!=="object"||!Array.isArray(raw.trades)||!Array.isArray(raw.accounts)){toast("Geçersiz yedek dosyası");return}
const n=restoreJson(raw);if(n==null)return;
saveTrades(state.trades);saveAccounts(state.accounts);saveTags(state.tags);render();toast(n+" işlem geri yüklendi")}catch(err){toast("Dosya okunamadı")}})}
});

function closeTrade(id){const t=state.trades.find(x=>x.id===id),e=$("#cerr");if(!t)return;const px=num($("#cx").value),cd=$("#cd").value,qv=$("#cq")?$("#cq").value.trim():"",q=qv===""?null:num(qv);if(px==null||px<=0){e.textContent="Çıkış fiyatı 0'dan büyük olmalı.";$("#cx").focus();return}if(cd&&cd<t.date){e.textContent="Çıkış zamanı girişten önce olamaz.";return}
if(q!=null&&q<t.qty){if(q<=0){e.textContent="Miktar 0'dan büyük olmalı.";$("#cq").focus();return}const now=nowLocal(),ch={...t,id:newId(),grp:t.grp||t.id,rt:null,chk:null,qty:q,exit:px,fees:0,exitDate:cd||(now<t.date?t.date:now)},ve=validate(ch);if(ve){e.textContent=ve;return}t.grp=ch.grp;t.qty=Math.round((t.qty-q)*1e8)/1e8;state.trades.push(ch);saveTrades(state.trades);toast("Kısmi kapatıldı: "+q+" @ "+px+" · kalan "+t.qty);render();return}
if(q!=null&&q>t.qty){e.textContent="Miktar açık pozisyondan ("+t.qty+") büyük olamaz.";$("#cq").focus();return}
t.exit=px;t.exitDate=cd||"";saveTrades(state.trades);toast("İşlem kapatıldı");render()}
function restoreJson(raw,silent){const tr=raw.trades.map(normTrade).filter(Boolean),bad=raw.trades.length-tr.length;if(!silent&&!confirm("Mevcut defter ("+state.trades.length+" işlem) bu yedekle değişecek"+(bad?" ("+bad+" geçersiz kayıt atlanacak)":"")+". Devam edilsin mi?"))return null;state.trades=tr;const ac=raw.accounts.filter(a=>a&&typeof a==="object").map(a=>({id:String(a.id||"a"+newId()),name:String(a.name||"Hesap"),balance:num(a.balance)||0}));if(ac.length)state.accounts=ac;const tg=raw.tags&&typeof raw.tags==="object"?raw.tags:{};const L=k=>Array.isArray(tg[k])&&tg[k].length?tg[k].map(String):DEFAULT_TAGS[k].slice();state.tags={setups:L("setups"),emos:L("emos"),mists:L("mists"),syms:Array.isArray(tg.syms)?tg.syms.map(String):[]};return tr.length}
const resetEq=()=>{const c=$("#eqcur"),r=$("#eqread");if(c)c.setAttribute("opacity","0");if(r)r.textContent=""};
document.getElementById("view").addEventListener("pointermove",e=>{const s=e.target.closest&&e.target.closest("#eqsvg");if(!s||!EQ)return;const b=s.getBoundingClientRect(),n=EQ.pts.length;const i=Math.max(0,Math.min(n-1,Math.round(((e.clientX-b.left)/b.width*EQ.W-EQ.pl)/EQ.iw*(n-1))));const p=EQ.pts[i],x=EQ.pl+i/(n-1)*EQ.iw,c=$("#eqcur");c.setAttribute("x1",x);c.setAttribute("x2",x);c.setAttribute("opacity","1");$("#eqread").textContent=(p.date?formatWhen(p.date)+" · ":"Başlangıç · ")+money(p.equity)});
document.getElementById("view").addEventListener("pointerout",e=>{if(e.target.closest&&e.target.closest("#eqsvg")&&!(e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest("#eqsvg")))resetEq()});
window.addEventListener("hashchange",()=>{if(!location.hash.startsWith("#/add")){if(form&&form.__for==="/add"&&(form.symbol||form.entry||form.stop||form.qty)){try{sessionStorage.setItem("tj_draft",JSON.stringify(form))}catch(_){}}form=null}render()});

document.getElementById("view").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.dataset){if(e.target.dataset.f&&e.target.tagName==="INPUT"&&e.target.type!=="datetime-local"){e.preventDefault();saveForm();return}if(e.target.dataset.newtag){e.preventDefault();addTag(e.target.dataset.newtag,e.target.value);return}if(e.target.dataset.newacc){e.preventDefault();const bt=document.querySelector("[data-act=addacc]");if(bt)bt.click();return}}if((e.key==="Enter"||e.key===" ")&&e.target.dataset&&e.target.dataset.tip){e.preventDefault();toast(e.target.dataset.tip,"",4500)}});
window.addEventListener("storage",e=>{if(e.key!=="tj_ts")return;try{const t=JSON.parse(lsGet(TRADES_KEY)||"null"),a=JSON.parse(lsGet(ACC_KEY)||"null");if(Array.isArray(t))state.trades=t;if(Array.isArray(a)&&a.length)state.accounts=a;render()}catch(x){}});
(async function init(){await loadAll();await fileInit();if(!location.hash)location.hash="#/";render()})();

document.querySelectorAll("#bottomNav a,#sideNav a").forEach(a=>a.addEventListener("click",()=>{const b=document.getElementById("toasts");if(b)b.innerHTML=""}));
document.getElementById("view").addEventListener("toggle",e=>{const d=e.target;if(d&&d.classList&&d.classList.contains("adv"))techForce=d.open},true);
