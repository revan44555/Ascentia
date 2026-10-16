"use strict";
const TRADES_KEY="tj_trades_v1",ACC_KEY="tj_acc_v1",TAGS_KEY="tj_tags_v1",THEME_KEY="tj_theme",BACKUP_KEY="tj_lb";
const DEFAULT_TAGS={setups:["Breakout","Pullback","Trend takibi","Setup yok"],emos:["Sakin","Kaygılı","Heyecanlı","İntikam","FOMO"],mists:["Erken giriş","Geç giriş","Stop oynattım","Erken çıkış","Fazla risk","Plan dışı işlem"],syms:[]};
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
const IDB_TIMEOUT=4000;let _db=null;function idb(){return _db||(_db=new Promise(res=>{let done=false;const fin=v=>{if(!done){done=true;res(v)}};setTimeout(()=>fin(null),IDB_TIMEOUT);try{const r=indexedDB.open("tj",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>fin(r.result);r.onerror=()=>fin(null);r.onblocked=()=>fin(null)}catch(e){fin(null)}}))}
async function kvGet(k){const d=await idb();if(!d)return undefined;return new Promise(res=>{try{const q=d.transaction("kv").objectStore("kv").get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>res(undefined)}catch(e){res(undefined)}})}
async function kvSet(k,v){const d=await idb();if(!d)return false;return new Promise(res=>{try{const t=d.transaction("kv","readwrite");t.objectStore("kv").put(v,k);t.oncomplete=()=>res(true);t.onerror=()=>res(false)}catch(e){res(false)}})}
async function dual(lk,lv,kk,v){const ts=Date.now();const a=lsSet(lk,lv);if(a){lsSet("tj_ts:"+kk,String(ts));lsSet("tj_ts",String(ts))}const b=await kvSet(kk,v);if(b)await kvSet("ts:"+kk,ts);if(!a&&!b){if(!state.memoryOnly){state.memoryOnly=true;toast("Kaydedilemedi. Şimdi JSON yedek al.","err")}}else state.memoryOnly=false;queueFile()}
function saveTrades(t){dual(TRADES_KEY,JSON.stringify(t),"trades",t)}
function saveAccounts(a){dual(ACC_KEY,JSON.stringify(a),"accounts",a)}
function saveTags(t){dual(TAGS_KEY,JSON.stringify({s:t.setups,e:t.emos,m:t.mists,y:t.syms||[]}),"tags",t)}
function saveTheme(t){lsSet(THEME_KEY,t)}
function saveBackupStamp(ts){lsSet(BACKUP_KEY,String(ts))}
let EQ=null,lastPath=null,fh=null,fileTimer=null;
const hasFS=typeof window.showSaveFilePicker==="function";
function backupJson(){return JSON.stringify({schemaVersion:2,exportedAt:new Date().toISOString(),source:"ascentia",accounts:state.accounts,trades:state.trades,tags:state.tags},null,2)}
async function fileInit(){if(!hasFS)return;fh=(await kvGet("fh"))||null;if(!fh)return;state.fileName=fh.name;try{state.file=(await fh.queryPermission({mode:"readwrite"}))==="granted"?"ok":"need"}catch(e){state.file="need"}}
function queueFile(){if(!fh||state.file!=="ok")return;clearTimeout(fileTimer);fileTimer=setTimeout(writeFile,500)}
async function writeFile(){if(!fh)return false;try{const w=await fh.createWritable();await w.write(backupJson());await w.close();markBackup();state.file="ok";return true}catch(e){state.file="need";return false}}
async function linkFile(){try{fh=await window.showSaveFilePicker({suggestedName:"ascentia-defter.json",types:[{description:"Ascentia defteri",accept:{"application/json":[".json"]}}]});await kvSet("fh",fh);state.fileName=fh.name;state.file="ok";try{const f=await fh.getFile();if(f.size>0){const raw=JSON.parse(await f.text());if(raw&&Array.isArray(raw.trades)&&raw.trades.length&&Array.isArray(raw.accounts)&&confirm("Bu dosyada "+raw.trades.length+" işlem var.\n\nTamam = dosyadan yükle\nİptal = dosyanın üzerine mevcut defter yazılır")){const n=restoreJson(raw,!state.trades.length);if(n!=null){saveTrades(state.trades);saveAccounts(state.accounts);saveTags(state.tags)}}}}catch(e){}const ok=await writeFile();toast(ok?"Dosyaya bağlandı":"Dosyaya yazılamadı",ok?"":"err")}catch(e){}render()}
async function resumeFile(){if(!fh)return;try{state.file=(await fh.requestPermission({mode:"readwrite"}))==="granted"?"ok":"need"}catch(e){state.file="need"}if(state.file==="ok"){await writeFile();toast("Otomatik kaydetme açık")}render()}
async function unlinkFile(){fh=null;state.file="none";state.fileName="";await kvSet("fh",null);render()}
function countUp(){}

const state={trades:[],accounts:[{id:"a1",name:"Ana hesap",balance:0}],tags:JSON.parse(JSON.stringify(DEFAULT_TAGS)),theme:"dark",filterAccountId:"all",lastBackupAt:null,durable:false,memoryOnly:false,file:"none",fileName:""};
function normTags(o){const L=(a,d)=>Array.isArray(a)&&a.length?a.map(String):d.slice();return{setups:L(o.setups,DEFAULT_TAGS.setups),emos:L(o.emos,DEFAULT_TAGS.emos),mists:L(o.mists,DEFAULT_TAGS.mists),syms:Array.isArray(o.syms)?o.syms.map(String):[]}}
async function loadAll(){
const pj=k=>{try{return JSON.parse(lsGet(k)||"null")}catch(e){return null}};
const tsL=k=>Number(lsGet("tj_ts:"+k)||lsGet("tj_ts")||0);
const tsI=async k=>Number((await kvGet("ts:"+k))||(await kvGet("ts"))||0);
// iki depodan hangisi daha yeniyse onu al: her anahtarın kendi zaman damgası var, eşitlikte localStorage
const pick=async(iv,lv,k)=>{if(iv==null)return lv;if(lv==null)return iv;return(await tsI(k))>tsL(k)?iv:lv};
let iT=null,iA=null,iG=null;try{const v=await kvGet("trades");if(Array.isArray(v))iT=v;const x=await kvGet("accounts");if(Array.isArray(x)&&x.length)iA=x;const g=await kvGet("tags");if(g&&typeof g==="object"&&!Array.isArray(g))iG=normTags(g)}catch(e){}
let lT=pj(TRADES_KEY);if(!Array.isArray(lT))lT=null;
let lA=pj(ACC_KEY);if(!Array.isArray(lA)||!lA.length)lA=null;
const tg=pj(TAGS_KEY);const lG=tg&&typeof tg==="object"?normTags({setups:tg.s,emos:tg.e,mists:tg.m,syms:tg.y}):null;
state.trades=(await pick(iT,lT,"trades"))||[];
const ac=await pick(iA,lA,"accounts");if(ac)state.accounts=ac;
const tags=await pick(iG,lG,"tags");if(tags)state.tags=tags;
state.theme=lsGet(THEME_KEY)==="light"?"light":"dark";
state.lastBackupAt=Number(lsGet(BACKUP_KEY)||0)||null;
try{if(navigator.storage&&navigator.storage.persisted){state.durable=await navigator.storage.persisted();if(!state.durable&&navigator.storage.persist)navigator.storage.persist().then(v=>{state.durable=v}).catch(()=>{})}}catch(e){}
applyTheme();
}
function applyTheme(){document.documentElement.classList.toggle("light",state.theme==="light");document.documentElement.classList.toggle("dark",state.theme!=="light");const tc=document.querySelector("meta[name=theme-color]");if(tc)tc.content=state.theme==="light"?"#f4f1ea":"#0c0c0e"}
