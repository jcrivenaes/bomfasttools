// Rekonstruksjon av Deloittes finansielle Hordfast-modell (rapport 12.08.2026).
// Ren funksjon uten DOM-avhengigheter; kan testes med Node: require('./model.js').

// Konstanter fra Deloitte (s. 6–13). xlsx_export.js leser de samme, så siden og regnearket har én kilde.
const HF_CONST={
  y0:2025, start:2029, opYears:75,                                  // basisår for faste priser og diskontering, byggestart, driftsår
  kpi:{2026:.032,2027:.024,2028:.023,2029:.019}, kpiLater:.02,       // KPI-bane
  inv0:52257, idx23:1.021, idx24:1.016, idx25:1.033, exMva:.8,       // investering (prisår 2022) og indekser; mva-kompensasjon 20 %
  cumD:[0,.05,.20,.40,.65,.85,1.0],                                  // kumulativ byggeprofil etter hvert av 6 byggeår
  loan0:12345, tby:2035, tollLoanK:1.0063, loanYears:45,             // bompengelån (2035-kr), kalibrering, serielån
  r0:.049, r1:.04, ry0:2035, ry1:2045,                               // lånerente fallende fra ry0 til ry1
  ferry:897, hs0:642.2, cty0:134, aus0:116, bt:1.025, kai:4,         // ferjeutgifter: Deloitte, BT-tall 2026, deflator, kai
  countyAfter:40,                                                    // county:'after40': fylkessambandene spart fra dette driftsåret
  dvYears:20, dvStepF:1.5,                                           // D&V-påslag etter 20 år
  adt1:7500, adt2:850, t1:148, t2:728, g1:.007, g2:.014,             // trafikk og takster, lette og tunge
  tollYears:20, tollDiv:1.032, tollCost:.6, tollOpex:.8, tollInv:20, prem0:40,
  r109:{rates:[.04,.03,.02], breaks:[40,75]},                        // R-109: 4 % år 1–40, 3 % år 41–75, 2 % deretter
  irrLo:-0.05, irrHi:0.2,                                            // søkeintervall for internrenten
};

function hfModel(p){
  const C=HF_CONST, Y0=C.y0, START=C.start, N=p.build||6, OPEN=START+N, Y1=OPEN+C.opYears-1;
  const yrs=[],D={};let d=1;
  for(let y=Y0;y<=Y1;y++){ if(y>Y0) d*=1+(C.kpi[y]??C.kpiLater); D[y]=d; yrs.push(y);}
  const sc = p.basis==='deloitte' ? C.ferry/((C.hs0+C.cty0+C.aus0)/C.bt) : 1;
  const hs=(p.hsOverride??C.hs0/C.bt)*sc, cty=Math.max(0,(C.cty0-p.huglo))/C.bt*sc, aus=C.aus0/C.bt*sc;
  const m=1+p.invPct/100;
  const r=y=> (y<=C.ry0?C.r0: y>=C.ry1?C.r1: C.r0-(y-C.ry0)*(C.r0-C.r1)/(C.ry1-C.ry0))+p.ratePP/100;
  // byggeprofil: Deloittes kumulative S-kurve strukket over N år
  const cumD=C.cumD, S=cumD.length-1;
  const cumAt=x=>{const t=x*S,i=Math.min(S-1,Math.floor(t));return cumD[i]+(cumD[i+1]-cumD[i])*(t-i);};
  const share={}; for(let k=0;k<N;k++) share[START+k]=cumAt((k+1)/N)-cumAt(k/N);
  const realInv=C.inv0*(p.fixPrice?C.idx23:1)*C.idx24*C.idx25*m;   // 2025-kr inkl. mva; fixPrice tar med 2023-leddet (2,1 %) som Deloitte utelater
  let bb=0; for(let y=START;y<OPEN;y++){ const draw=realInv*share[y]*D[y]*C.exMva; bb=bb*(1+r(y))+draw*(1+r(y)/2); }
  const expost=p.tollMode==='expost';                                // standard er 'exante'
  const T=p.traffic??1, PF=(1+(p.premium??C.prem0)/100)/(1+C.prem0/100);
  const tollLoan=(expost?C.loan0:C.loan0+(T*PF-1)*C.loan0*C.tollLoanK)*D[OPEN]/D[C.tby];
  const L=bb-tollLoan;
  const [ra,rb,rc]=C.r109.rates, [b1,b2]=C.r109.breaks;
  const df=(y,dr)=>{const t=y-Y0; if(dr==='R109') return Math.pow(1+ra,-Math.min(t,b1))*Math.pow(1+rb,-Math.max(0,Math.min(t,b2)-b1))*Math.pow(1+rc,-Math.max(0,t-b2)); return Math.pow(1+dr,-t);};
  const tf=(k,t,pf)=>(C.adt1*t*C.t1*pf*Math.pow(1+C.g1,k)+C.adt2*t*C.t2*pf*Math.pow(1+C.g2,k))*365/1e6/C.tollDiv
    -(C.adt1*Math.pow(1+C.g1,k)+C.adt2*Math.pow(1+C.g2,k))*t*365*C.tollCost/1e6-C.tollOpex;
  let bal=L; const rows=[];
  for(const y of yrs){
    const op=y>=OPEN, k=y-OPEN;
    const g=p.fidx==='kpi'?D[y]:Math.pow(1+p.fidx/100,y-Y0);
    let ferryN=0;
    if(op){ ferryN=hs*g; if(p.austevoll) ferryN+=aus*g;
      if(p.county==='all' || (p.county==='after40' && k>=C.countyAfter)) ferryN+=cty*g; }
    const ferryR=ferryN/D[y]+(op?C.kai:0);
    const dv= op ? (k<C.dvYears? p.dv : p.dv*(p.dvStep?C.dvStepF:1)) : 0;
    let loanN=0;
    if(op && k<C.loanYears){ const a=L/C.loanYears; loanN=(bal-a/2)*r(y)+a; bal-=a; }
    let toll=0,toll1=0; if(op&&k<C.tollYears){toll=tf(k,T,PF);toll1=tf(k,1,1);} if(y===OPEN-1) toll=-C.tollInv;
    const tollGap=(expost&&op&&k<C.tollYears)?(toll-toll1):0; const fin=ferryR-dv-loanN/D[y]+tollGap;
    const inv=(share[y]||0)*realInv*C.exMva;
    const res=ferryR-(inv+dv-toll);
    rows.push({y,fin:op?fin:null,res,ferryR:op?ferryR:0,dv,loanR:loanN/D[y],tollGap,inv,toll});
  }
  const npv=dr=>rows.reduce((s,o)=>s+o.res*df(o.y,dr),0);
  const undisc=rows.reduce((s,o)=>s+(o.fin||0),0);
  let cum=0,firstPosYear=null,cumPosYear=null,minCum=0; const cumF=[],cumR=[]; let cr=0;
  for(const o of rows){ cr+=o.res*df(o.y,p.dr); if(o.y>=START) cumR.push({y:o.y,v:cr});
    if(o.fin===null) continue; cum+=o.fin; cumF.push({y:o.y,v:cum}); minCum=Math.min(minCum,cum);
    if(firstPosYear===null && o.fin>0) firstPosYear=o.y; if(cumPosYear===null && cum>0 && o.y>OPEN) cumPosYear=o.y; }
  // Internrente ved halvering. null når nåverdien ikke skifter fortegn mellom grensene.
  let lo=C.irrLo,hi=C.irrHi,irr=null; if(npv(lo)>0&&npv(hi)<0){for(let i=0;i<80;i++){const mid=(lo+hi)/2; npv(mid)>0?lo=mid:hi=mid;} irr=(lo+hi)/2;}
  return {tollLoan,rows,undisc,npvSel:npv(p.dr),npvR109:npv('R109'),firstPosYear,cumPosYear,minCum,cumF,cumR,irr,bb,L,OPEN,df};
}
hfModel.CONST = HF_CONST;

if (typeof module !== 'undefined') module.exports = hfModel;
