"use strict";
function accountId(t){return t.acc&&state.accounts.some(a=>a.id===t.acc)?t.acc:state.accounts[0].id}
function ek(t){return t.exitDate||t.date}
function byExit(a){return a.slice().sort((x,y)=>ek(x).localeCompare(ek(y)))}
function holdMin(t){if(!t.exitDate||!t.date)return null;const m=(new Date(t.exitDate)-new Date(t.date))/6e4;return m>=0?m:null}
function holdText(m){return m<60?Math.round(m)+" dk":m<1440?Math.floor(m/60)+" sa "+Math.round(m%60)+" dk":Math.floor(m/1440)+" gün "+Math.floor(m%1440/60)+" sa"}
function holdBucket(t){const m=holdMin(t);if(m==null)return"Belirsiz";if(m<5)return"5 dk altı";if(m<30)return"5–30 dk";if(m<240)return"30 dk–4 sa";if(m<1440)return"4 sa–1 gün";return"1 gün üstü"}
function normTrade(x){if(!x||typeof x!=="object")return null;const sym=String(x.symbol||"").trim().toUpperCase(),en=num(x.entry),q=num(x.qty),nd=v=>String(v||"").trim().replace(" ","T"),dt=nd(x.date);if(!sym||!dt||en==null||en<=0||q==null||q<=0)return null;return{id:String(x.id||newId()),date:dt,symbol:sym,dir:["SHORT","SELL"].includes(String(x.dir||"").trim().toUpperCase())?"SHORT":"LONG",entry:en,exit:(ex=>ex!=null&&ex>0?ex:null)(num(x.exit)),qty:q,stop:num(x.stop),stop0:num(x.stop0),tp:num(x.tp),fees:Math.max(0,num(x.fees)||0),mult:(mu=>mu>0?mu:1)(num(x.mult)),fx:num(x.fx)>0?num(x.fx):1,acc:x.acc?String(x.acc):"",exitDate:x.exitDate?nd(x.exitDate):"",plan:x.plan==="evet"||x.plan==="hayır"?x.plan:"",mist:String(x.mist||""),setup:String(x.setup||""),emo:String(x.emo||""),notes:String(x.notes||""),chk:Number.isInteger(x.chk)?x.chk:null,rt:Number.isInteger(x.rt)&&x.rt>=1&&x.rt<=5?x.rt:null,...(x.grp?{grp:String(x.grp)}:{})}}
function accountOf(t){const id=accountId(t);return state.accounts.find(a=>a.id===id)||state.accounts[0]}
function risk(t){if(t.__risk!==undefined)return t.__risk;const s=t.stop0!=null?t.stop0:t.stop;if(s==null)return null;const d=t.dir==="SHORT"?s-t.entry:t.entry-s;const r=d*t.qty*(t.mult||1)*(t.fx>0?t.fx:1);return r>0?r:null}
function pnl(t){if(t.__pnl!==undefined)return t.__pnl;if(t.exit==null)return null;const g=(t.dir==="LONG"?t.exit-t.entry:t.entry-t.exit)*t.qty*(t.mult||1)*(t.fx>0?t.fx:1);return Math.round((g-(t.fees||0))*100)/100}
function rr(t){const p=pnl(t),r=risk(t);return p==null||r==null?null:p/r}
function balanceAt(t){const a=accountOf(t);if(!a||!(a.balance>0))return null;return a.balance+state.trades.filter(x=>x.id!==t.id&&accountId(x)===accountId(t)&&ek(x)<=t.date&&pnl(x)!=null).reduce((s,x)=>s+pnl(x),0)}
function riskPcts(trades){return trades.map(riskPct).filter(v=>v!=null)}
function riskPct(t){const r=risk(t),b=balanceAt(t);return r==null||b==null||b<=0?null:r/b*100}
function currentBalance(a){return(a.balance||0)+state.trades.filter(t=>accountId(t)===a.id&&pnl(t)!=null).reduce((s,t)=>s+pnl(t),0)}
function filterAccount(trades,id){if(id==="all")return trades;return trades.filter(t=>accountId(t)===id)}
function unitize(trades){const m=new Map(),out=[];for(const t of trades){if(!t.grp){out.push(t);continue}let a=m.get(t.grp);if(!a){a=[];m.set(t.grp,a);out.push(a)}a.push(t)}
return out.map(u=>{if(!Array.isArray(u))return u;if(u.length<2)return u[0];const rep=u.find(t=>t.id===t.grp)||u[0],done=u.every(t=>t.exit!=null),rs=u.map(risk),last=u.slice().sort((a,b)=>ek(a).localeCompare(ek(b))).pop();
return{...rep,qty:u.reduce((s,t)=>s+t.qty,0),exit:done?last.exit:null,exitDate:done?ek(last):"",__pnl:done?Math.round(u.reduce((s,t)=>s+pnl(t),0)*100)/100:null,__risk:rs.every(r=>r!=null)?rs.reduce((a,b)=>a+b,0):null}})}
function summarize(trades){
const closed=trades.filter(t=>pnl(t)!=null),U=unitize(trades),uc=U.filter(t=>pnl(t)!=null),open=U.length-uc.length;
const ps=uc.map(t=>pnl(t)),wins=ps.filter(p=>p>0),losses=ps.filter(p=>p<0);
const net=closed.reduce((a,t)=>a+pnl(t),0),unet=ps.reduce((a,b)=>a+b,0),gw=wins.reduce((a,b)=>a+b,0),gl=Math.abs(losses.reduce((a,b)=>a+b,0));
const rs=uc.map(rr).filter(r=>r!=null);
const base=[...new Set(trades.map(accountId))].reduce((s,id)=>s+((state.accounts.find(a=>a.id===id)||{}).balance||0),0);let eq=0,peak=0,dd=0,ddPct=null;byExit(closed).forEach(t=>{eq+=pnl(t);peak=Math.max(peak,eq);dd=Math.max(dd,peak-eq);if(base>0&&base+peak>0)ddPct=Math.max(ddPct||0,(peak-eq)/(base+peak)*100)});
const rps=riskPcts(U);
let sw=0,sl=0,cw=0,cl2=0;byExit(uc).forEach(t=>{const p=pnl(t);if(p>0){cw++;cl2=0;sw=Math.max(sw,cw)}else if(p<0){cl2++;cw=0;sl=Math.max(sl,cl2)}else{cw=0;cl2=0}});
const avgWin=wins.length?gw/wins.length:null,avgLoss=losses.length?gl/losses.length:null;
return{closed:uc.length,open,net,wins:wins.length,losses:losses.length,winRate:uc.length?100*wins.length/uc.length:null,profitFactor:gl?gw/gl:null,avgR:rs.length?rs.reduce((a,b)=>a+b,0)/rs.length:null,maxDd:dd,ddPct,avgRiskPct:rps.length?rps.reduce((a,b)=>a+b,0)/rps.length:null,maxRiskPct:rps.length?Math.max.apply(null,rps):null,expectancy:uc.length?unet/uc.length:null,avgWin,avgLoss,payoff:avgWin!=null&&avgLoss?avgWin/avgLoss:null,streakWin:sw,streakLoss:sl}}
function equityPoints(trades){const closed=byExit(trades.filter(t=>pnl(t)!=null));let eq=0;const pts=[{i:0,date:"",equity:0,pnl:0}];closed.forEach((t,i)=>{eq+=pnl(t);pts.push({i:i+1,date:ek(t),equity:eq,pnl:pnl(t)})});return pts}
function breakdown(trades,key){const closed=unitize(trades).filter(t=>pnl(t)!=null);const m=new Map();
const label=t=>{if(key==="plan")return t.plan==="evet"?"Uydum":t.plan==="hayır"?"Uymadım":"Belirtilmemiş";if(key==="dir")return t.dir==="LONG"?"Long":"Short";if(key==="session")return sessionOf(t.date);if(key==="weekday")return weekdayOf(t.date);if(key==="hold")return holdBucket(t);return t[key]||"Etiketsiz"};
for(const t of closed){const g=label(t);const row=m.get(g)||{key:g,n:0,wins:0,net:0};const p=pnl(t);row.n++;row.net+=p;if(p>0)row.wins++;m.set(g,row)}
return Array.from(m.values()).map(r=>({...r,winRate:r.n?100*r.wins/r.n:0})).sort(key==="weekday"||key==="hold"?(a,b)=>ORD.indexOf(a.key)-ORD.indexOf(b.key):(a,b)=>b.net-a.net)}
function topLeak(trades){return breakdown(trades,"mist").filter(r=>r.key!=="Etiketsiz"&&r.net<0).sort((a,b)=>a.net-b.net)[0]||null}
function bestSetup(trades){return breakdown(trades,"setup").filter(r=>r.key!=="Etiketsiz"&&r.n>=3)[0]||null}
function adherence(trades){const tagged=unitize(trades).filter(t=>t.plan==="evet"||t.plan==="hayır");if(tagged.length<3)return null;return 100*tagged.filter(t=>t.plan==="evet").length/tagged.length}
function monthCells(trades,year,month0){const prefix=year+"-"+String(month0+1).padStart(2,"0");const map=new Map();
for(const t of trades){if(!ek(t).startsWith(prefix))continue;const p=pnl(t);if(p==null)continue;const day=ek(t).slice(0,10);const c=map.get(day)||{date:day,net:0,n:0};c.net+=p;c.n++;map.set(day,c)}
const days=new Date(year,month0+1,0).getDate();const out=[];for(let i=1;i<=days;i++){const date=prefix+"-"+String(i).padStart(2,"0");out.push(map.get(date)||{date,net:0,n:0})}return out}
function validate(o){
if(!o.date)return"Tarih gerekli.";if(!o.symbol)return"Sembol gerekli.";
if(o.entry==null||o.entry<=0)return"Giriş fiyatı 0'dan büyük olmalı.";
if(o.qty==null||o.qty<=0)return"Miktar 0'dan büyük olmalı.";
if(o.exit!=null&&o.exit<=0)return"Çıkış fiyatı 0'dan büyük olmalı.";
if(o.fees!=null&&o.fees<0)return"Komisyon negatif olamaz.";
if(o.mult!=null&&o.mult<=0)return"Kontrat çarpanı 0'dan büyük olmalı.";
if(o.exitDate&&o.date&&o.exitDate<o.date)return"Çıkış zamanı girişten önce olamaz.";
const L=o.dir==="LONG";
const S=o.stop0!=null?o.stop0:(o.exit==null?o.stop:null);if(S!=null&&(L?S>=o.entry:S<=o.entry))return L?"Long işlemde stop girişin altında olmalı.":"Short işlemde stop girişin üstünde olmalı.";
if(o.tp!=null&&(L?o.tp<=o.entry:o.tp>=o.entry))return L?"Long işlemde hedef girişin üstünde olmalı.":"Short işlemde hedef girişin altında olmalı.";
return null}

