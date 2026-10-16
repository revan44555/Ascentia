"use strict";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const num=v=>{if(v==null||v==="")return null;if(typeof v==="number")return Number.isFinite(v)?v:null;let s=String(v).trim().replace(/[\s ']/g,"");if(s==="")return null;const c=s.lastIndexOf(","),d=s.lastIndexOf(".");if(c>=0&&d>=0){s=c>d?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"")}else if(c>=0){s=s.indexOf(",")!==c?s.replace(/,/g,""):s.replace(",",".")}else if(d>=0&&s.indexOf(".")!==d)s=s.replace(/\./g,"");const n=Number(s);return Number.isFinite(n)?n:null};
function money(n,d){d=d===undefined?2:d;if(n==null||Number.isNaN(n))return"—";const a=Math.abs(n).toLocaleString("tr-TR",{minimumFractionDigits:d,maximumFractionDigits:d});if(n>0)return"+"+a;if(n<0)return"−"+a;return a}
function numF(n,d){if(n==null||Number.isNaN(n))return"—";return n.toLocaleString("tr-TR",{minimumFractionDigits:d,maximumFractionDigits:d})}
function pct(n,d){if(n==null||Number.isNaN(n))return"—";return numF(n,d===undefined?1:d)+"%"}
function rf(r){return(r<0?"−":"")+numF(Math.abs(r),2)+"R"}
const ORD=["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar","5 dk altı","5–30 dk","30 dk–4 sa","4 sa–1 gün","1 gün üstü","Belirsiz"];
function pnlClass(n){if(n==null)return"muted";if(n>0)return"up";if(n<0)return"dn";return"muted"}
function formatWhen(date){if(!date)return"—";const p=date.replace("T"," ").split(" ");const d=p[0].split("-");return d[2]+"."+d[1]+"."+d[0]+" "+(p[1]??"").slice(0,5)}
function todayStamp(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function weekStartStamp(){const d=new Date();const day=d.getDay();const diff=day===0?6:day-1;d.setDate(d.getDate()-diff);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function nowLocal(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
function newId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
const LDN=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",hour:"numeric",hourCycle:"h23"});
function sessionOf(date){const d=new Date(date);if(Number.isNaN(d.getTime()))return"Belirsiz";const h=Number(LDN.format(d));if(h>=8&&h<13)return"Londra";if(h>=13&&h<17)return"Londra / NY";if(h>=17&&h<22)return"New York";return"Asya"}
function weekdayOf(date){const d=new Date(date);if(Number.isNaN(d.getTime()))return"Belirsiz";return["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"][d.getDay()]}

// FIX(5): tarih damgası normalize — TR/ISO noktalı tarihler, çoklu boşluklar, saatsiz tarihler
function toStamp(v){let s=String(v||"").trim();if(!s)return"";s=s.replace(/^(\d{2})\.(\d{2})\.(\d{4})/,"$3-$2-$1").replace(/^(\d{4})\.(\d{2})\.(\d{2})/,"$1-$2-$3").replace(/\s+/g,"T");if(/^\d{4}-\d{2}-\d{2}$/.test(s))s+="T00:00";return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)?s.slice(0,16):""}
// CSV ayrıştırma (RFC 4180 — tırnaklı alanlar, kaçışlı tırnak)
function parseCsv(text){const rows=[];let r=[],c="",q=false;for(let i=0;i<text.length;i++){const ch=text[i];if(q){if(ch==='"'){if(text[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}else if(ch==='"')q=true;else if(ch===","){r.push(c);c=""}else if(ch==="\n"){r.push(c);rows.push(r);r=[];c=""}else if(ch!=="\r")c+=ch}if(c!==""||r.length){r.push(c);rows.push(r)}return rows}
// FIX(20): görsel sıkıştırma — canvas ile ≤1280px JPEG; başarısızsa ham dataURL (≤~1,1 MB)
async function imgPrep(file){const M=1280,S=1500000;
try{const bmp=await createImageBitmap(file);const sc=Math.min(1,M/Math.max(bmp.width,bmp.height));const c=document.createElement("canvas");c.width=Math.max(1,Math.round(bmp.width*sc));c.height=Math.max(1,Math.round(bmp.height*sc));c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);const u=c.toDataURL("image/jpeg",.72);if(u.length>S)throw 0;return u}catch(e){}
return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>String(r.result).length>S?rej():res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
