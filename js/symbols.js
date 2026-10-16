"use strict";
const mk=(a,m,k,h)=>a.map(n=>[n,m,k,h]);
const SYMS=[].concat(
mk(["EURUSD","GBPUSD","USDJPY","USDCHF","USDCAD","AUDUSD","NZDUSD","EURGBP","EURJPY","EURCHF","EURAUD","EURCAD","EURNZD","GBPJPY","GBPCHF","GBPAUD","GBPCAD","GBPNZD","AUDJPY","AUDCHF","AUDCAD","AUDNZD","NZDJPY","NZDCHF","NZDCAD","CADJPY","CADCHF","CHFJPY","USDTRY","EURTRY","USDMXN","USDZAR","USDSEK","USDNOK","USDSGD","USDHKD"],100000,"Forex","1 lot = 100.000 birim"),
mk(["XAUUSD"],100,"Altın","1 lot = 100 ons"),mk(["XAGUSD"],5000,"Gümüş","1 lot = 5.000 ons"),
mk(["NAS100","US30","SPX500","GER40","UK100","JP225","FRA40","US2000"],1,"Endeks","1 lot = nokta başına 1 birim"),
mk(["USOIL","UKOIL"],1000,"Petrol","1 lot = 1.000 varil"),
mk(["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","BNBUSDT","BTCUSD","ETHUSD"],1,"Kripto","1 adet = 1 coin"),
mk(["NQ"],20,"Vadeli","1 kontrat = 20$ / puan"),mk(["MNQ"],2,"Vadeli","1 kontrat = 2$ / puan"),mk(["ES"],50,"Vadeli","1 kontrat = 50$ / puan"),mk(["MES"],5,"Vadeli","1 kontrat = 5$ / puan"),mk(["YM"],5,"Vadeli","1 kontrat = 5$ / puan"),mk(["GC"],100,"Vadeli","1 kontrat = 100 ons"),mk(["CL"],1000,"Vadeli","1 kontrat = 1.000 varil"));
const ALIAS={GOLD:"XAUUSD",XAU:"XAUUSD",SILVER:"XAGUSD",XAG:"XAGUSD",US100:"NAS100",NDX:"NAS100",NASDAQ:"NAS100",USTEC:"NAS100",DOW:"US30",DJ30:"US30",DJI:"US30",WS30:"US30",US500:"SPX500",SPX:"SPX500",SP500:"SPX500",DAX:"GER40",DE40:"GER40",GER30:"GER40",DE30:"GER40",FTSE:"UK100",FTSE100:"UK100",NIKKEI:"JP225",N225:"JP225",WTI:"USOIL",CRUDE:"USOIL",BRENT:"UKOIL",BTC:"BTCUSDT",ETH:"ETHUSDT",SOL:"SOLUSDT",XRP:"XRPUSDT",BNB:"BNBUSDT"};
function lev(a,b){const m=a.length,n=b.length;let p=Array.from({length:n+1},(_,j)=>j);for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
const symAll=()=>SYMS.map(x=>x[0]).concat(state.tags.syms||[]);
function symFind(raw){const n=String(raw||"").toUpperCase().replace(/[^A-Z0-9]/g,""),r={exact:null,auto:null,sug:[]};if(!n)return r;const all=symAll();
if(all.includes(n)){r.exact=n;return r}
if(ALIAS[n]){r.auto=ALIAS[n];return r}
for(const f of["MICRO","PRO","RAW","ECN","M","C","I"])if(n.length>f.length&&n.endsWith(f)){const b=n.slice(0,-f.length);if(all.includes(b)){r.auto=b;return r}if(ALIAS[b]){r.auto=ALIAS[b];return r}}
for(let i=0;i<n.length-1;i++){const w=n.slice(0,i)+n[i+1]+n[i]+n.slice(i+2);if(all.includes(w)){r.auto=w;return r}}
const sc=all.map(x=>{const l=lev(n,x);return{x,l,d:l+(x.startsWith(n)?-2:x.includes(n)?-1:0)}}).sort((a,b)=>a.d-b.d||a.l-b.l);
r.sug=sc.filter(o=>o.d<=(n.length<=4?1:2)).slice(0,5).map(o=>o.x);
if(sc[0]&&sc[0].l<=1&&n.length>=5&&(!sc[1]||sc[1].l>1))r.auto=sc[0].x;
return r}
function applySym(nm){form.symbol=nm;if(!form.id&&form.qty===""&&LASTLOT[nm]){form.qty=LASTLOT[nm];const qi=document.querySelector("[data-f=qty]");if(qi)qi.value=form.qty}const i=SYMS.find(x=>x[0]===nm);if(i&&!form.id&&(form.mult===""||form.multAuto)){form.mult=i[1]!==1?String(i[1]):"";form.multAuto=true}}
function symHint(strict){const raw=String(form.symbol||"").trim();if(!raw)return"";const r=symFind(raw),nm=r.exact||r.auto;
if(nm){const i=SYMS.find(x=>x[0]===nm);return `<p class="subtle" style="font-size:13px">${nm!==raw.toUpperCase()?`<span class="up">→ ${esc(nm)}</span> · `:""}${i?esc(i[2]+" · "+i[3])+(i[2]==="Forex"&&!nm.endsWith("USD")?" · ⚠ P&L "+nm.slice(3,6)+" cinsinden · kuru ek alanlara gir":""):"Özel sembol · çarpan 1 (vadeli ise ek alanlardan gir)"}</p>`}
return `<div class="chips">${r.sug.map(x=>`<button type="button" class="chip off" data-sym="${esc(x)}">${esc(x)}</button>`).join("")}</div>${strict?`<p class="dn" style="font-size:13px;margin-top:6px">"${esc(raw)}" listede yok.${r.sug.length?" Yukarıdan birini seç ya da":""} <button type="button" class="chip off" data-act="addsym" style="height:32px">özel sembol olarak ekle</button></p>`:""}`}
