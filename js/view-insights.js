"use strict";
function propStatus(){
const td=todayStamp().slice(0,10);
return state.accounts.filter(a=>a.dl>0||a.md>0).map(a=>{
 const cl=state.trades.filter(t=>accountId(t)===a.id&&pnl(t)!=null);
 const today=cl.filter(t=>ek(t).slice(0,10)===td).reduce((x,t)=>x+pnl(t),0);
 const balance=num(a.balance)||0;
 let eq=balance,pk=balance,dd=balance>0?0:null;
 if(dd!=null)byExit(cl).forEach(t=>{eq+=pnl(t);pk=Math.max(pk,eq);if(pk>0)dd=Math.max(dd,(pk-eq)/pk*100)});
 return{name:a.name,dl:a.dl||0,used:Math.max(0,-today),md:a.md||0,dd};
})
}
function propCard(){
 const st=propStatus();if(!st.length)return"";
 const bar=(u,l,percent=false)=>{
  if(u==null)return '<span class="muted">Bakiye gerekli</span>';
  const p=Math.min(100,Math.round(u/l*100));
  return `<span class="mono ${p>=100?"dn":p>=80?"warn":""}">${numF(u,2)}${percent?"%":""} / ${numF(l,percent?2:0)}${percent?"%":""} (%${p})</span>`;
 };
 return `<div class="card"><p class="lbl">Hesap limitleri</p><div class="divide" style="margin-top:8px">${st.map(x=>(x.dl?`<div class="rowline"><span>${esc(x.name)} · günlük kayıp</span>${bar(x.used,x.dl)}</div>`:"")+(x.md?`<div class="rowline"><span>${esc(x.name)} · düşüş</span>${bar(x.dd,x.md,true)}</div>`:"")).join("")}</div></div>`;
}
function limitBanner(){
 const b=propStatus().filter(x=>(x.dl&&x.used>=x.dl)||(x.md&&x.dd!=null&&x.dd>=x.md));
 return b.length?`<div class="card" style="border-color:var(--dn)"><p class="dn">⚠ ${b.map(x=>esc(x.name)+": "+(x.dl&&x.used>=x.dl?"günlük kayıp limiti doldu":"maks. düşüş limitine ulaşıldı")).join(" · ")}</p></div>`:"";
}

function ddCard(trades){const cl=byExit(trades.filter(t=>pnl(t)!=null));if(cl.length<2)return"";let eq=0,pk=0;const dd=cl.map(t=>{eq+=pnl(t);pk=Math.max(pk,eq);return eq-pk}),mn=Math.min(...dd,-1e-9),W=640,H=110,X=i=>i/(dd.length-1)*W,Y=v=>6+(v/mn)*(H-12),d=dd.map((v,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1)).join(" "),dt=t=>{const x=ek(t).slice(0,10).split("-");return x[2]+"."+x[1]+"."+x[0].slice(2)};
return `<div class="card"><p class="lbl">Düşüş eğrisi (zirveden uzaklık) · en derin ${money(mn,2)}</p><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:110px;display:block;margin-top:8px"><path d="${d} L${W} 6 L0 6 Z" fill="var(--dn)" opacity=".16"/><path d="${d}" fill="none" stroke="var(--dn)" stroke-width="2" vector-effect="non-scaling-stroke"/><line x1="0" x2="${W}" y1="6" y2="6" stroke="var(--border)"/></svg><div class="bar" style="grid-template-columns:1fr auto;margin-top:6px"><span>${dt(cl[0])}</span><span>${dt(cl[cl.length-1])}</span></div></div>`}
function monthRows(trades){const m=new Map();unitize(trades).filter(t=>pnl(t)!=null).forEach(t=>{const k=ek(t).slice(0,7),r=m.get(k)||{key:k,n:0,wins:0,net:0};r.n++;r.net+=pnl(t);if(pnl(t)>0)r.wins++;m.set(k,r)});return[...m.values()].sort((a,b)=>b.key.localeCompare(a.key)).map(r=>({...r,key:["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"][+r.key.slice(5)-1]+" "+r.key.slice(0,4),winRate:100*r.wins/r.n}))}
function accRows(trades){return breakdown(trades,"acc").map(r=>({...r,key:(state.accounts.find(a=>a.id===r.key)||state.accounts[0]).name}))}

function insightsCard(trades){const nCl=trades.filter(t=>pnl(t)!=null).length;if(nCl<10)return nCl?`<div class="card"><p class="lbl">Bulgular</p><p class="subtle" style="margin-top:6px;font-size:14px">10 kapanmış işlemden sonra kalıp analizi burada görünür (şu an ${nCl}).</p></div>`:"";const out=[];
// FIX(10): "Belirsiz" (geçersiz tarihli işlem) de bulgulara karışmaz
const skip=r=>/^(Etiketsiz|Belirtilmemiş|Belirsiz)$/.test(r.key);
const worst=(k,f,ok)=>{const w=breakdown(trades,k).filter(r=>r.n>=3&&!skip(r)&&(!ok||ok(r))).sort((a,b)=>a.net-b.net)[0];if(w&&w.net<0)out.push(f(w))};
worst("mist",r=>"“"+r.key+"” hatasıyla "+r.n+" işlem: "+money(r.net));
worst("emo",r=>r.key+" duygusuyla "+r.n+" işlem: "+money(r.net));
worst("plan",r=>"Plan dışı "+r.n+" işlem: "+money(r.net),r=>r.key==="Uymadım");
worst("session",r=>r.key+" seansında "+r.n+" işlem: "+money(r.net));
{const cp=trades.filter(t=>pnl(t)!=null&&rr(t)!=null&&t.rt),hi=cp.filter(t=>t.rt>=4),lo=cp.filter(t=>t.rt<=3),av=a=>a.reduce((x,t)=>x+rr(t),0)/a.length;if(hi.length>=3&&lo.length>=3)out.push("4-5 puanlı işlemlerde ort. "+rf(av(hi))+", düşük puanlılarda "+rf(av(lo)))}
{const avg=a=>a.length?a.reduce((x,t)=>x+rr(t),0)/a.length:null,cl=trades.filter(t=>pnl(t)!=null&&rr(t)!=null&&t.chk!=null),f=cl.filter(t=>t.chk>=CHK.length),e=cl.filter(t=>t.chk<CHK.length);if(f.length>=3&&e.length>=3)out.push("Kontrol listesi tam işlemlerde ort. "+rf(avg(f))+", eksiklerde "+rf(avg(e)))}
const b=bestSetup(trades);if(b&&b.net>0)out.push("En iyi setup: "+b.key+", "+b.n+" işlem "+money(b.net));
return out.length?`<div class="card"><p class="lbl">Bulgular</p><ul class="finds">${out.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:""}
function barList(rows){const m=Math.max(1,...rows.map(r=>Math.abs(r.v)));return `<div class="bars">${rows.map(r=>`<div class="bar"><span>${esc(r.k)}</span><i><b class="${r.v>=0?"up":"dn"}" style="width:${Math.round(Math.abs(r.v)/m*100)}%"></b></i><em class="mono">${r.t}</em></div>`).join("")}</div>`}
function distCards(trades){const cl=trades.filter(t=>pnl(t)!=null);const bins=[["< −2R",r=>r<-2],["−2 … −1R",r=>r>=-2&&r<-1],["−1 … 0R",r=>r>=-1&&r<0],["0 … 1R",r=>r>=0&&r<1],["1 … 2R",r=>r>=1&&r<=2],["> 2R",r=>r>2]];
const rs=cl.map(rr).filter(v=>v!=null);const rb=bins.map(([k,f],i)=>{const n=rs.filter(f).length;return{k,v:i<3?-n:n,t:n}});
// FIX(15): saat dağılımı da diğer istatistiklerle tutarlı olarak çıkış zamanına (ek) göre
const h=new Map();cl.forEach(t=>{const k=String(ek(t)||"").slice(11,13);if(!k)return;h.set(k,(h.get(k)||0)+pnl(t))});
const hr=[...h.entries()].sort((a,b)=>a[0]-b[0]).map(([k,v])=>({k:k+":00",v,t:money(v,0)}));
return `<div class="card"><p class="lbl">R dağılımı (işlem sayısı)</p>${rs.length?barList(rb):'<p class="muted">Stop girilmiş işlem yok.</p>'}</div><div class="card"><p class="lbl">Kapanış saatine göre net</p>${barList(hr)}</div>`}
function wkKey(){const d=new Date(),t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7));const y=t.getUTCFullYear();return y+"-W"+Math.ceil(((t-Date.UTC(y,0,1))/864e5+1)/7)}
const lsg=k=>{try{return localStorage.getItem(k)||""}catch(e){return""}},lss=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const CHK=["Setup planıma uyuyor","Stop ve hedef belli","Risk limitimin içinde","Sakinim, acelem yok"];
const chkKey=()=>"tj_chk_"+new Date().toISOString().slice(0,10);
function checklistCard(){const v=lsg(chkKey());return `<details class="dt"><summary>İşlem öncesi kontrol <span id="chkN" class="mono">${[...v].filter(c=>c==="1").length}/${CHK.length}</span></summary><div class="stack" style="margin:8px 0">${CHK.map((x,i)=>`<label class="chk"><input type="checkbox" data-chk="${i}"${v[i]==="1"?" checked":""}> ${x}</label>`).join("")}</div></details>`}
function reviewCard(){return `<details class="dt"><summary><span>Haftalık değerlendirme <small class="subtle" style="margin-left:6px">${lsg("tj_review_"+wkKey())?"yazıldı ✓":"bu haftanın notu"}</small></span></summary><textarea class="inp" rows="4" id="wkNote" aria-label="Haftalık değerlendirme" placeholder="Bu hafta neyi iyi yaptım, neyi tekrarlamayacağım?" style="margin:8px 0">${esc(lsg("tj_review_"+wkKey()))}</textarea></details>`}
const OPENS=new Set(),dKey=d=>{const m=d.querySelector("summary");return m?location.hash.split("?")[0]+"|"+m.textContent.replace(/\s*\d+\/\d+$/,"").trim():""};
document.addEventListener("toggle",e=>{const d=e.target;if(d.tagName!=="DETAILS")return;const k=dKey(d);if(k)d.open?OPENS.add(k):OPENS.delete(k)},true);
new MutationObserver(()=>document.querySelectorAll("#view details").forEach(d=>{if(!d.open&&OPENS.has(dKey(d)))d.open=true})).observe(document.getElementById("view"),{childList:true});
document.addEventListener("input",e=>{if(e.target.id==="wkNote")lss("tj_review_"+wkKey(),e.target.value)});
document.addEventListener("change",e=>{if(e.target.dataset&&e.target.dataset.chk!==undefined){const v=CHK.map((_,i)=>{const c=document.querySelector('[data-chk="'+i+'"]');return c&&c.checked?"1":"0"}).join("");lss(chkKey(),v);const n=document.getElementById("chkN");if(n)n.textContent=[...v].filter(c=>c==="1").length+"/"+CHK.length}});
function breakdownTable(title,rows){if(!rows.length)return"";
return `<div><h2 class="h2t" style="margin-bottom:8px">${esc(title)}</h2>
<div class="card p0" style="overflow-x:auto"><table class="tbl">
<thead><tr><th style="text-align:left">${esc(title)}</th><th>İşlem</th><th>Kazanç</th><th>Net</th></tr></thead>
<tbody>${rows.map(r=>`<tr><td>${esc(r.key)}</td><td class="r mono">${r.n}</td><td class="r mono">${Math.round(r.winRate)}%</td><td class="r mono" style="color:var(--${pnlClass(r.net)})">${money(r.net)}</td></tr>`).join("")}</tbody>
</table></div></div>`}

function equityChart(points){
if(points.length<2)return `<div class="card h44 muted" style="font-size:15px">Equity eğrisi için kapanmış işlem gerekli.</div>`;
const W=640,H=176,pt=10,pb=10,pl=0,iw=W;
let mn=Infinity,mx=-Infinity;points.forEach(p=>{mn=Math.min(mn,p.equity);mx=Math.max(mx,p.equity)});
if(mn===mx){mn-=1;mx+=1}
const ih=H-pt-pb,X=i=>i/(points.length-1)*iw,Y=v=>pt+(1-(v-mn)/(mx-mn))*ih;
const ticks=[0,1,2,3].map(i=>mx-(mx-mn)*i/3);EQ={pts:points,pl,iw,W};
let d=`M ${X(0).toFixed(1)} ${Y(points[0].equity).toFixed(1)}`;for(let i=1;i<points.length;i++)d+=` L ${X(i).toFixed(1)} ${Y(points[i].equity).toFixed(1)}`;
return `<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;font-size:13px"><span style="font-weight:500;letter-spacing:.04em;color:var(--muted)">Kümülatif P&L</span><span id="eqread" class="mono muted"></span></div>
<div class="eqwrap"><svg id="eqsvg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="touch-action:pan-y;cursor:crosshair">
<defs><linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity="0.16"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
${ticks.map(t=>`<line x1="0" x2="${W}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="var(--border)"/>`).join("")}
${mn<0&&mx>0?`<line x1="0" x2="${W}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="var(--border)" stroke-dasharray="3"/>`:""}
<path d="${d} L ${W} ${H-pb} L 0 ${H-pb} Z" class="eqfill" fill="url(#eqFill)"/>
<path d="${d}" class="eqfill" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<line id="eqcur" y1="${pt}" y2="${H-pb}" stroke="var(--fg)" stroke-opacity=".35" opacity="0"/>
</svg>${ticks.map(t=>`<span class="eqt mono" style="top:${(Y(t)/H*100).toFixed(1)}%">${money(t,0).replace("+","")}</span>`).join("")}</div></div>`}
let calOff=0;
function calendarHeat(trades){
const MONTHS=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const now=new Date(),dt=new Date(now.getFullYear(),now.getMonth()+calOff,1),year=dt.getFullYear(),month=dt.getMonth();
const cells=monthCells(trades,year,month),td=todayStamp();
const start=new Date(year,month,1).getDay();const offset=start===0?6:start-1;
const tone=c=>(!c.n?"c none":c.net>0?"c win":c.net<0?"c loss":"c zero")+(c.date===td?" today":"");
const mnet=cells.reduce((a,c)=>a+c.net,0);
return `<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><button type="button" class="btn sm ghost" data-act="calprev" aria-label="Önceki ay">‹</button><p style="font-size:13px;font-weight:500;letter-spacing:.04em;color:var(--muted)">${MONTHS[month]} ${year} · <span class="mono ${pnlClass(mnet)}">${money(mnet)}</span></p><button type="button" class="btn sm ghost" data-act="calnext" aria-label="Sonraki ay">›</button></div>
<div class="heat">${["Pt","Sa","Ça","Pe","Cu","Ct","Pz"].map(d=>`<div class="h">${d}</div>`).join("")}
${Array.from({length:offset},()=>"<div></div>").join("")}
${cells.map(c=>`<div class="${tone(c)}" title="${c.date} · ${c.n} işlem · ${money(c.net)}" data-tip="${c.date} · ${c.n} işlem · ${money(c.net)}">${Number(c.date.slice(8))}</div>`).join("")}
</div></div>`}
function viewInsights(){
const trades=filterAccount(state.trades,state.filterAccountId).filter(inRange);
const s=summarize(trades);
if(!s.closed){return `<div style="padding:64px 0;text-align:center"><h1 style="font-size:24px;font-weight:500;letter-spacing:-.02em">Analiz</h1><p class="muted" style="margin-top:8px;font-size:15px">İstatistik için kapanmış işlem gerekli.</p></div>`}
return `<div class="stack">
<header class="page-h"><p class="eyebrow">Performans</p><h1>Analiz</h1></header>
<details class="filt"${(state.filterAccountId!=="all"||RANGE!=="all")?" open":""}><summary>Filtreler</summary><div class="s3" style="margin-top:8px">${accChips()}${rangeChips()}</div></details>
<div class="g4">
${kpi("Net P&L",money(s.net),s.net>0?"up":s.net<0?"dn":"muted","","Komisyon düşüldükten sonra toplam kâr/zarar.")}
${kpi("Kazanma oranı",s.winRate==null?"—":Math.round(s.winRate)+"%","","","Kârla kapanan işlemlerin yüzdesi.")}
${kpi("Kâr faktörü",s.profitFactor==null?(s.closed?"Zarar yok":"—"):numF(s.profitFactor,2),"","","Toplam kâr ÷ toplam zarar. 1'in üstü kârlı demektir.")}
${kpi("Ort. R",s.avgR==null?(s.closed?"Stop yok":"—"):rf(s.avgR),s.avgR!=null&&s.avgR>0?"up":s.avgR!=null&&s.avgR<0?"dn":"muted","","Kazancın riske (stop mesafesi) oranı. 1R = riske ettiğin tutar.")}
</div>
${equityChart(equityPoints(trades))}
${insightsCard(trades)}
<details class="dt"><summary>Daha fazla istatistik</summary><div class="g3" style="margin-top:8px">
${kpi("Kapanan",String(s.closed),"","sm","Kapanmış işlem sayısı.")}
${kpi("Maks. düşüş",money(-s.maxDd),s.maxDd?"dn":"muted","sm","Zirveden en büyük geri çekilme (tutar).")}
${kpi("Düşüş %",s.ddPct==null?"—":"−"+pct(s.ddPct),s.ddPct?"dn":"muted","sm","Aynı geri çekilme, bakiyeye göre yüzde.")}
${kpi("Ort. risk %",pct(s.avgRiskPct),"","sm","İşlem başına bakiyenin yüzde kaçını riske attığın.")}
${kpi("Maks. risk %",pct(s.maxRiskPct),"","sm","En yüksek tek işlem riski.")}
${kpi("Beklenti",s.expectancy==null?"—":money(s.expectancy),s.expectancy!=null&&s.expectancy>0?"up":s.expectancy!=null&&s.expectancy<0?"dn":"muted","sm","İşlem başına ortalama kâr/zarar.")}
${kpi("Kazanç/kayıp",s.payoff==null?"—":numF(s.payoff,2),"","sm","Ortalama kazanç ÷ ortalama kayıp.")}
${kpi("Kazanç serisi",String(s.streakWin),"","sm","En uzun üst üste kazanç.")}
${kpi("Kayıp serisi",String(s.streakLoss),"","sm","En uzun üst üste kayıp.")}
</div></details>
<details class="dt"><summary>R ve saat dağılımı</summary><div class="stack" style="margin-top:8px">${distCards(trades)}</div></details>
<details class="dt"><summary>Düşüş, aylık ve hesap</summary><div class="stack" style="margin-top:8px">${ddCard(trades)}${breakdownTable("Ay",monthRows(trades))}${state.accounts.length>1?breakdownTable("Hesap",accRows(trades)):""}</div></details>
<details class="dt"><summary>Takvim</summary>${calendarHeat(filterAccount(state.trades,state.filterAccountId))}</details>
<details class="dt"><summary>Dağılımlar</summary><div class="stack" style="margin-top:8px">${breakdownTable("Setup",breakdown(trades,"setup"))}
${breakdownTable("Sembol",breakdown(trades,"symbol"))}
${breakdownTable("Duygu",breakdown(trades,"emo"))}
${breakdownTable("Hata",breakdown(trades,"mist").filter(r=>r.key!=="Etiketsiz"))}
${breakdownTable("Plan",breakdown(trades,"plan"))}
${breakdownTable("Yön",breakdown(trades,"dir"))}
${breakdownTable("Seans (Londra)",breakdown(trades,"session"))}
${breakdownTable("Gün",breakdown(trades,"weekday"))}
${breakdownTable("Tutma süresi",breakdown(trades,"hold").filter(r=>r.key!=="Belirsiz"))}</div></details>

</div>`}