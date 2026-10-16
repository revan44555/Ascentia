"use strict";
let form=null,moreOpen=false,techForce=false,tagDraft=null;const detailsFilled=f=>!!(f&&(f.setup||f.emo||f.mist||f.plan||f.rt||f.notes||f.exitDate||f.stop0||f.fx));const techOpen=()=>techForce||!!(form&&(form.stop0||form.fx));
function emptyForm(){return{date:nowLocal(),symbol:"",dir:"LONG",entry:"",exit:"",qty:"",mult:"",acc:state.accounts[0]?state.accounts[0].id:"a1",plan:"",mist:"",stop:"",tp:"",fees:"",setup:"",emo:"",notes:"",exitDate:"",stop0:"",fx:"",rt:"",img:""}}
function fromTrade(t){return{date:t.date,symbol:t.symbol,dir:t.dir,entry:String(t.entry),exit:t.exit==null?"":String(t.exit),qty:String(t.qty),mult:t.mult&&t.mult!==1?String(t.mult):"",acc:t.acc||"",plan:t.plan||"",mist:t.mist||"",stop:t.stop==null?"":String(t.stop),tp:t.tp==null?"":String(t.tp),fees:t.fees?String(t.fees):"",setup:t.setup||"",emo:t.emo||"",notes:t.notes||"",exitDate:t.exitDate||"",stop0:t.stop0==null?"":String(t.stop0),fx:t.fx&&t.fx!==1?String(t.fx):"",rt:t.rt?String(t.rt):"",img:t.img||"",id:t.id}}
const PH={entry:"ör. 1.0842",stop:"ör. 1.0820",tp:"ör. 1.0880",qty:"ör. 0.10",exit:"açıksa boş",fees:"ör. 2.00"};
function fld(k,l,type){return `<div><label class="fld"><span>${l}</span><input class="inp" data-f="${k}" placeholder="${PH[k]||""}" type="${type||"text"}" ${type?"":'inputmode="decimal" enterkeyhint="next" autocomplete="off"'} value="${esc(form?form[k]:"")}"></label><p class="ferr" id="fe-${k}" role="alert"></p></div>`}
function errKey(m){if(/^Tarih/.test(m))return"date";if(/^Sembol/.test(m))return"symbol";if(/^Çıkış zamanı/.test(m))return"exitDate";if(/^Giriş/.test(m))return"entry";if(/^Miktar/.test(m))return"qty";if(/^Çıkış/.test(m))return"exit";if(/^Komisyon/.test(m))return"fees";if(/^Kontrat/.test(m))return"mult";if(/stop/i.test(m)&&!/kuru/.test(m))return form&&form.stop0?"stop0":"stop";if(/hedef/i.test(m))return"tp";if(/kuru gerekli/.test(m))return"fx";return null}
function showFormErr(msg){const k=errKey(msg);if(k&&["exitDate","mult","fx","stop0"].includes(k)){if(k==="exitDate"?!moreOpen:!(moreOpen&&techOpen())){moreOpen=true;if(k!=="exitDate")techForce=true;render()}}document.querySelectorAll(".ferr").forEach(p=>p.textContent="");document.querySelectorAll("[aria-invalid]").forEach(i=>i.removeAttribute("aria-invalid"));const lh=document.querySelector("#liveh .dn"),dup=!!lh&&(k==="stop"||k==="tp");const e=$("#err");if(e)e.textContent=dup?"":msg;if(!k)return;const inp=document.querySelector('[data-f="'+k+'"]'),fe=$("#fe-"+k);if(fe)fe.textContent=dup?"":msg;if(inp){inp.setAttribute("aria-invalid","true");inp.scrollIntoView({block:"center",behavior:"smooth"});try{inp.focus({preventScroll:true})}catch(_){}}}
function tagSection(kind,label,items,key){return `<div>
<p style="margin-bottom:6px;font-size:13px;font-weight:500;letter-spacing:.04em;color:var(--muted)">${label}</p>
${chipRow(items.map(x=>({v:x,l:x})),form[key],key,true)}
${tagDraft&&tagDraft.kind===kind?`<input class="inp" style="margin-top:8px" placeholder="Yeni etiket" data-tagdraft="1" value="${esc(tagDraft.value)}">`:`<button type="button" class="chip off" style="margin-top:8px" data-act="tagdraft" data-kind="${kind}">+ Ekle</button>`}
</div>`}
const QCUR={GER40:"EUR",FRA40:"EUR",UK100:"GBP",JP225:"JPY"};
function bigPx(sym){const i=SYMS.find(x=>x[0]===sym);return!!i&&(i[2]==="Endeks"||i[2]==="Altın"||(i[2]==="Vadeli"&&sym!=="CL")||/^(BTC|ETH)/.test(sym))}
// FIX(7): bilinmeyen sembolde de binlik ayracı tutarlı şekilde sıfırlanır
// ("21.500" bilinen endeksse 21500, bilinmeyen sembolde de 21500 olur — 21.5 değil)
function fixThou(rawSym,v){const sf=symFind(rawSym),sym=sf.exact||sf.auto;v=String(v==null?"":v).trim();if(!/^\d{1,3}(\.\d{3})+$/.test(v))return v;return (sym&&bigPx(sym))||!sym?v.replace(/\./g,""):v}
function liveHint(){const e=num(form.entry),st=num(form.stop),t=num(form.tp),q=num(form.qty),x=num(form.exit);let m="";
if(e!=null&&st!=null&&num(form.stop0)==null&&x==null){if(form.dir==="LONG"&&st>=e)m="Long için stop girişin altında olmalı.";else if(form.dir==="SHORT"&&st<=e)m="Short için stop girişin üstünde olmalı."}
if(!m&&e!=null&&t!=null){if(form.dir==="LONG"&&t<=e)m="Long için hedef girişin üstünde olmalı.";else if(form.dir==="SHORT"&&t>=e)m="Short için hedef girişin altında olmalı."}
const err=m?`<p class="dn" style="font-size:13px;margin-bottom:8px">${m}</p>`:"";
if(e==null||q==null||q<=0)return err+`<p class="subtle" style="font-size:13px">Giriş, stop ve lot girince risk ve R otomatik hesaplanır.</p>`;
const tr={id:"__new",dir:form.dir==="SHORT"?"SHORT":"LONG",entry:e,stop:st,qty:q,mult:num(form.mult)||1,fx:num(form.fx)>0?num(form.fx):1,acc:form.acc,date:form.date||"",exit:x,fees:num(form.fees)||0};
const rk=st==null||m?null:risk(tr),rp=rk==null?null:riskPct(tr),rw=rk!=null&&t!=null&&!m?Math.abs(t-e)/Math.abs(e-st):null,pl=x!=null&&!m?pnl(tr):null;
const c=(l,v,cl)=>`<div><span>${l}</span><b class="mono ${cl||""}">${v}</b></div>`;
const nb=rk!=null&&rp==null?`<p class="subtle" style="font-size:13px;margin-top:8px">Risk % için Daha → Hesaplar'dan bakiye gir.</p>`:"";
return err+`<div class="pv">${c("Risk",rk==null?"—":numF(rk,2))}${c("Risk %",rp==null?"—":numF(rp,2)+"%")}${c("Ödül/risk",rw==null?"—":"1 : "+numF(rw,1))}${c("Sonuç",pl==null?"—":money(pl),pl==null?"":pnlClass(pl))}</div>${nb}`}
function viewAdd(){
const existing=form.id?state.trades.find(t=>t.id===form.id):null;
return `<div class="stack4">
<header class="page-h"><p class="eyebrow">Kayıt</p><h1>${existing?"İşlemi düzenle":"Yeni işlem"}</h1></header>
${limitBanner()}
${checklistCard()}
<div class="stack4 addgrid">
<div class="card s3" style="padding:16px">
<div><label class="fld"><span>Tarih / saat</span><input class="inp" data-f="date" type="datetime-local" value="${esc(form.date)}"></label><p class="ferr" id="fe-date" role="alert"></p>
<div class="chips scroll" style="margin-top:8px"><button type="button" class="chip off" data-qd="0">Şimdi</button><button type="button" class="chip off" data-qd="60">1 sa önce</button><button type="button" class="chip off" data-qd="240">4 sa önce</button><button type="button" class="chip off" data-qd="1440">Dün</button></div></div>
${state.accounts.length>1?`<div><p style="margin-bottom:6px;font-size:13px;font-weight:500;letter-spacing:.04em;color:var(--muted)">Hesap</p>${chipRow(state.accounts.map(a=>({v:a.id,l:a.name})),form.acc||state.accounts[0].id,"acc",false)}</div>`:""}
<p class="sec">Enstrüman</p>
<div><label class="fld"><span>Sembol</span><input class="inp" data-f="symbol" placeholder="NAS100" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" value="${esc(form.symbol)}"></label><p class="ferr" id="fe-symbol" role="alert"></p></div>
<div id="symsug">${symHint(true)}</div>
<div><p style="margin-bottom:6px;font-size:13px;font-weight:500;letter-spacing:.04em;color:var(--muted)">Yön</p><div class="dirbtn"><button type="button" aria-pressed="${form.dir==="LONG"}" class="long ${form.dir==="LONG"?"on":""}" data-chip="dir" data-v="LONG" data-off="0">Long ↑</button><button type="button" aria-pressed="${form.dir==="SHORT"}" class="short ${form.dir==="SHORT"?"on":""}" data-chip="dir" data-v="SHORT" data-off="0">Short ↓</button></div></div>
<p class="sec">Seviyeler</p>
<div class="grid2">${fld("entry","Giriş")}${fld("stop","Stop-loss")}</div>
<div class="grid2">${fld("tp","Hedef")}${fld("qty","Lot / adet")}</div>
<div id="liveh">${liveHint()}</div>
<p class="sec">Sonuç · opsiyonel</p>
<div class="grid2">${fld("exit","Çıkış fiyatı")}${fld("fees","Komisyon")}</div>
</div>
<div class="stack4 addside">
<button type="button" class="btn lg secondary" data-act="togglemore" aria-expanded="${moreOpen}">${moreOpen?"Ayrıntıları gizle":"Ayrıntılar: etiket, not, çıkış zamanı"}</button>
${moreOpen?`<div class="card s3" style="padding:16px">
<div><label class="fld"><span>Çıkış zamanı</span><input class="inp" data-f="exitDate" type="datetime-local" value="${esc(form.exitDate)}"></label><p class="ferr" id="fe-exitDate" role="alert"></p><div class="chips" style="margin-top:8px"><button type="button" class="chip off" data-qx="0">Şimdi</button><button type="button" class="chip off" data-qx="60">Girişten 1 sa sonra</button></div></div>
${tagSection("setups","Setup",state.tags.setups,"setup")}
${tagSection("emos","Duygu",state.tags.emos,"emo")}
<div><p style="margin-bottom:6px;font-size:13px;font-weight:500;letter-spacing:.04em;color:var(--muted)">İşlem puanı (uygulama kalitesi)</p>${chipRow([1,2,3,4,5].map(n=>({v:String(n),l:n+" ★"})),form.rt,"rt",true)}</div>
<div id="planwrap" ${form.exit?"":"hidden"}><p style="margin-bottom:6px;font-size:13px;font-weight:500;letter-spacing:.04em;color:var(--muted)">Plana uydun mu?</p>${chipRow([{v:"evet",l:"Uydum"},{v:"hayır",l:"Uymadım"}],form.plan,"plan",true)}</div>
${tagSection("mists","Hata",state.tags.mists,"mist")}
<div><p style="margin-bottom:6px;font-size:13px;font-weight:500;letter-spacing:.04em;color:var(--muted)">Görsel (chart ekran görüntüsü)</p>
${form.img?`<img src="${form.img}" alt="İşlem grafiği" style="width:100%;border-radius:10px;display:block">`:`<p class="subtle" style="font-size:13px">Henüz görsel yok.</p>`}
<div class="acc-f" style="margin-top:8px"><label class="btn sm secondary" style="cursor:pointer">Görsel seç<input type="file" accept="image/*" hidden data-file="img"></label>${form.img?`<button type="button" class="btn sm ghost" data-act="imgdel">Kaldır</button>`:""}</div></div>
<label class="fld"><span>Not</span><textarea class="inp" rows="3" data-f="notes">${esc(form.notes)}</textarea></label>
<details class="dt adv" ${techOpen()?"open":""}><summary>Gelişmiş: ilk stop, kur, çarpan</summary><div class="stack4" style="margin:8px 0">
${fld("stop0","Stop'u oynattıysan: ilk stop (R için)")}
${fld("fx","P&L kuru (işlem → hesap para birimi, boşsa 1)")}
<div><label class="fld"><span>Kontrat çarpanı (sembolden otomatik, boşsa 1)</span><input class="inp" data-f="mult" step="any" inputmode="decimal" placeholder="ör. forex 100000" value="${esc(form.mult)}"></label><p class="ferr" id="fe-mult" role="alert"></p></div>
</div></details>
</div>`:""}
</div>
</div>
<div class="savebar"><p id="err" class="dn" role="alert" style="font-size:14px;color:var(--dn);margin-bottom:6px"></p><button type="button" class="btn lg primary" data-act="save">Kaydet</button></div>
</div>`}