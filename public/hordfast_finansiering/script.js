const PRESETS={
  deloitte:{build:6,basis:'deloitte',county:'all',huglo:0,austevoll:true,fidx:'2.5',dv:45,dvStep:true,inv:0,rate:0,traffic:0,premium:40,expost:false},
  utenAus:{build:6,basis:'deloitte',county:'all',huglo:0,austevoll:false,fidx:'2.5',dv:45,dvStep:true,inv:0,rate:0,traffic:0,premium:40,expost:false},
  stat:{build:6,basis:'deloitte',county:'none',huglo:0,austevoll:false,fidx:'2.5',dv:45,dvStep:true,inv:0,rate:0,traffic:0,premium:40,expost:false},
  real:{build:6,basis:'deloitte',county:'none',huglo:0,austevoll:false,fidx:'kpi',dv:195,dvStep:false,inv:0,rate:0,traffic:0,premium:40,expost:false},
  hoy:{build:6,basis:'deloitte',county:'none',huglo:0,austevoll:false,fidx:'kpi',dv:600,dvStep:false,inv:0,rate:0,traffic:0,premium:40,expost:false}
};
const $=id=>document.getElementById(id);
const nf=new Intl.NumberFormat('nb-NO',{minimumFractionDigits:1,maximumFractionDigits:1});
const fmt=v=>(v>0?'+':v<0?'−':'')+nf.format(Math.abs(v));
function setPreset(k){const p=PRESETS[k];
  $('basis').value=p.basis;$('county').value=p.county;$('huglo').value=p.huglo;$('austevoll').checked=p.austevoll;
  $('fidx').value=p.fidx;$('dv').value=p.dv;$('dvStep').checked=p.dvStep;$('inv').value=p.inv;$('build').value=p.build;$('rate').value=p.rate;$('traffic').value=p.traffic;$('premium').value=p.premium;$('expost').checked=p.expost;$('fixPrice').checked=false;
  update(k);}
function params(){return{basis:$('basis').value,county:$('county').value,huglo:+$('huglo').value,austevoll:$('austevoll').checked,
  fidx:$('fidx').value==='kpi'?'kpi':+$('fidx').value,dv:+$('dv').value===45?44.39:(+$('dv').value===195?197:+$('dv').value),traffic:1+$('traffic').value/100,premium:+$('premium').value,tollMode:$('expost').checked?'expost':'exante',dvStep:$('dvStep').checked,invPct:+$('inv').value,fixPrice:$('fixPrice').checked,ratePP:+$('rate').value,
  build:+$('build').value,dr:$('dr').value==='R109'?'R109':+$('dr').value};}
function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
let c1,c2,lastR=null,lastP=null;
function sign(el,v){el.classList.toggle('neg',v<0);el.classList.toggle('pos',v>0);}
function payback(y,open,label){
  const t=y?`${y-open} år (${y})`:'aldri innen 75 år';
  return `<tr><td>${label} åpning</td><td class="n">${t}</td></tr>`;}
function update(presetKey){
  const p=params(),r=hfModel(p);lastR=r;lastP=p;
  document.querySelectorAll('#presets button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.p===presetKey?'true':'false'));
  $('hugloO').textContent=p.huglo+' mill. kr/år';
  $('trafficO').textContent=(+$('traffic').value>0?'+':'')+$('traffic').value+' % ('+Math.round(8350*p.traffic).toLocaleString('nb-NO')+' ÅDT)';
  $('premiumO').textContent=p.premium+' %';
  $('dvO').textContent=Math.round(p.dv)+' mill. kr/år';
  $('buildO').textContent=p.build+' år (åpning '+(2029+p.build)+')';
  $('invO').textContent=(p.invPct>0?'+':'')+p.invPct+' %';
  $('rateO').textContent=(p.ratePP>0?'+':'')+p.ratePP.toFixed(2).replace('.',',')+' pp';
  $('kU').textContent=fmt(r.undisc/1e3);sign($('kU'),r.undisc);
  $('kN').textContent=fmt(r.npvSel/1e3);sign($('kN'),r.npvSel);
  $('kNu').textContent='mrd 2025-kr · '+$('dr').selectedOptions[0].text.split(':')[0];
  $('kM').textContent=fmt(r.minCum/1e3);sign($('kM'),r.minCum);
  $('kF').textContent=r.firstPosYear??'aldri';
  $('kFu').textContent=r.cumPosYear?('akkumulert i pluss '+r.cumPosYear):'akkumulert aldri i pluss';
  $('kI').textContent=r.irr===null?'Ikke funnet':nf.format(r.irr*100)+' %';
  $('kIu').textContent=r.irr===null?'ingen entydig løsning mellom −5 % og 20 %':'reell rente der nåverdien er null';
  const op=r.rows.filter(o=>o.fin!==null);
  const sum=k=>op.reduce((s,o)=>s+o[k],0)/1e3;
  $('ledger').innerHTML=[['Sparte ferje- og kaiutgifter',sum('ferryR')],['Renter og avdrag, langsiktig lån ('+nf.format(r.L/1e3)+' mrd nominelt; bompengelån '+nf.format(r.tollLoan/1e3)+' mrd)',-sum('loanR')],['Drift, vedlikehold og reinvesteringer',-sum('dv')]].concat(p.tollMode==='expost'&&Math.abs(sum('tollGap'))>0.005?[['Avvik i bompengeinntekter dekket av staten',sum('tollGap')]]:[])
    .map(([a,b])=>`<tr><td>${a}</td><td class="n">${fmt(b)}</td></tr>`).join('')+`<tr class="tot"><td>Netto for staten</td><td class="n">${fmt(r.undisc/1e3)}</td></tr>`+payback(r.cumPosYear,r.OPEN,'Akkumulert i pluss etter');
  const pv=k=>r.rows.reduce((s,o)=>s+o[k]*r.df(o.y,p.dr),0)/1e3;
  const pvTot=r.npvSel/1e3;
  $('drLabel').textContent='('+$('dr').selectedOptions[0].text.split(':')[0]+')';
  $('ledgerPv').innerHTML=[['Sparte ferje- og kaiutgifter',pv('ferryR')],['Investering ekskl. mva',-pv('inv')],['Drift, vedlikehold og reinvesteringer',-pv('dv')],['Netto bompenger (etter innkrevingskostnader)',pv('toll')]]
    .map(([a,b])=>`<tr><td>${a}</td><td class="n">${fmt(b)}</td></tr>`).join('')+`<tr class="tot"><td>Nåverdi før finansiering</td><td class="n">${fmt(pvTot)}</td></tr>`+payback((r.cumR.find(o=>o.y>r.OPEN&&o.v>0)||{}).y,r.OPEN,'Akkumulert i pluss etter');
  draw(r);
}
function draw(r){
  if(typeof Chart==='undefined')return;
  const fg=css('--muted'),grid=css('--line'),gain=css('--gain'),loss=css('--loss'),ink=css('--ink-series'),font={family:'IBM Plex Mono',size:11};
  const op=r.rows.filter(o=>o.fin!==null);
  const tt={backgroundColor:css('--panel'),titleColor:css('--fg'),bodyColor:css('--fg'),borderColor:grid,borderWidth:1,padding:8,titleFont:font,bodyFont:font,
    callbacks:{label:c=>' '+(c.dataset.label?c.dataset.label+': ':'')+fmt(c.parsed.y)+(c.chart===c1?' mill. kr':' mrd kr')}};
  const scales=(unit)=>({x:{grid:{display:false},ticks:{color:fg,font,maxRotation:0,autoSkip:true,maxTicksLimit:9}},
    y:{grid:{color:c=>c.tick.value===0?fg:grid,lineWidth:c=>c.tick.value===0?1.5:1},border:{display:false},ticks:{color:fg,font,callback:v=>nf.format(v).replace(',0','')},title:{display:true,text:unit,color:fg,font}}});
  const d1={labels:op.map(o=>o.y),datasets:[{data:op.map(o=>o.fin),backgroundColor:op.map(o=>o.fin>=0?gain:loss),borderRadius:2,barPercentage:.8,categoryPercentage:.9}]};
  const yrsAll=r.cumR.map(o=>o.y), fMap=Object.fromEntries(r.cumF.map(o=>[o.y,o.v/1e3]));
  const d2={labels:yrsAll,datasets:[
    {label:'Udiskontert',data:yrsAll.map(y=>fMap[y]??null),borderColor:ink,borderWidth:2,pointRadius:0,tension:0,spanGaps:false},
    {label:'Nåverdi',data:r.cumR.map(o=>o.v/1e3),borderColor:gain,borderWidth:2,pointRadius:0,tension:0}]};
  const common={responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:tt}};
  if(c1){c1.data=d1;c1.options.scales=scales('mill. 2025-kr');c1.options.plugins.tooltip=tt;c1.update();}
  else c1=new Chart($('c1'),{type:'bar',data:d1,options:{...common,scales:scales('mill. 2025-kr')}});
  if(c2){c2.data=d2;c2.options.scales=scales('mrd 2025-kr');c2.options.plugins.tooltip=tt;c2.update();}
  else c2=new Chart($('c2'),{type:'line',data:d2,options:{...common,scales:scales('mrd 2025-kr')}});
}
document.querySelectorAll('#presets button').forEach(b=>b.addEventListener('click',()=>setPreset(b.dataset.p)));
document.querySelectorAll('aside input,aside select').forEach(el=>el.addEventListener('input',()=>update(el.id==='dr'?document.querySelector('#presets [aria-pressed="true"]')?.dataset.p:null)));
const redraw=()=>update(document.querySelector('#presets [aria-pressed="true"]')?.dataset.p);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',redraw);
new MutationObserver(redraw).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
setPreset('deloitte');

function saveBlob(blob,filename){
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function csvNum(v){return v==null?'':(Math.round(v*1000)/1000).toString().replace('.',',');}
function downloadCsv(){
  if(!lastR)return;
  const r=lastR,p=lastP;
  const cumF=Object.fromEntries(r.cumF.map(o=>[o.y,o.v])),cumR=Object.fromEntries(r.cumR.map(o=>[o.y,o.v]));
  const head=['År','Sparte ferje- og kaiutgifter','Investering ekskl. mva','Drift og vedlikehold og reinvesteringer','Netto bompenger','Renter og avdrag','Bompengeavvik dekket av staten','Netto for staten (udiskontert)','Akkumulert udiskontert','Diskonteringsfaktor','Nåverdi før finansiering – årets strøm','Akkumulert nåverdi'].map((h,i)=>i===0||i===9?h:h+' (mill. 2025-kr)');
  const q=v=>'"'+v+'"';
  const lines=[head.map(q).join(';')];
  for(const o of r.rows){
    const f=r.df(o.y,p.dr);
    lines.push([o.y,o.ferryR,-o.inv,-o.dv,o.toll,o.fin===null?null:-o.loanR,o.fin===null?null:o.tollGap,o.fin,cumF[o.y],f,o.res*f,cumR[o.y]].map((v,i)=>q(i===0?v:csvNum(v))).join(';'));
  }
  saveBlob(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),'hordfast_ar_for_ar.csv');
}
$('csvBtn').addEventListener('click',downloadCsv);

function downloadXlsx(){
  if(!lastP)return;
  saveBlob(new Blob([hfXlsxBuild(lastP)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'hordfast_modell.xlsx');
}
$('xlsxBtn').addEventListener('click',downloadXlsx);
