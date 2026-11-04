// Eksport av Hordfast-modellen til xlsx med levende formler.
// Ingen eksterne biblioteker: bygger OOXML og en ukomprimert zip selv.
// Formlene gjenskaper model.js, og konstantene hentes fra HF_CONST der. Test med `node test_xlsx.js` (krever LibreOffice).
// Bruk: hfXlsxBuild(p) -> Uint8Array. p er samme parametre som hfModel(p).
// Formelcellene får lagrede verdier, så tallene vises også der regnearket ikke regner (Protected View, forhåndsvisning).
// opts.cached=false utelater dem; test_xlsx.js bruker det for å tvinge fram utregning.

const hfXlsxModel = typeof hfModel !== 'undefined' ? hfModel : require('./model.js');

function hfXlsxBuild(p0,opts={}){
  const p={...p0,build:p0.build||6,traffic:p0.traffic??1,premium:p0.premium??40}; // samme standardverdier som hfModel
  const C=hfXlsxModel.CONST;
  const FIRST=2, LAST=92, Y0=C.y0, LASTY=Y0+LAST-FIRST; // «År for år»: rad 2 = 2025, rad 92 = 2115 (byggetid opptil 12 år)
  const m=hfXlsxModel(p), OPEN=m.OPEN, YEND=OPEN+C.opYears-1;
  const YS="'År for år'!";
  const R=c=>`${YS}$${c}$${FIRST}:$${c}$${LAST}`;
  const b=x=>x?1:0;
  const kpiF=p.fidx==='kpi', r109=p.dr==='R109';
  const kpiAt=y=>y===Y0?0:C.kpi[y]??C.kpiLater;
  const sc=p.basis==='deloitte'?C.ferry/((C.hs0+C.cty0+C.aus0)/C.bt):1, PF=(1+p.premium/100)/(1+C.prem0/100);
  const [ra,rb,rc]=C.r109.rates, [b1,b2]=C.r109.breaks, pct=x=>String(x*100).replace('.',',');
  // Varsel når årsradene ikke dekker hele perioden. Vises øverst på «Forutsetninger» og «Resultat».
  const warnF=`IF(AND(p_start>=p_y0,p_yend<=${LASTY}),"","ADVARSEL: Årsradene dekker bare ${Y0}–${LASTY}. Byggestart og byggetid gir år utenfor, så tallene er ufullstendige.")`;
  const warnV=YEND<=LASTY?'':`ADVARSEL: Årsradene dekker bare ${Y0}–${LASTY}. Byggestart og byggetid gir år utenfor, så tallene er ufullstendige.`;

  // Stilindekser (se styles under): 0 std, 1 fet, 2 overskrift, 3 inndata, 4 inndata 0,00, 5 beløp, 6 faktor,
  // 7 inndata %, 8 %, 9 heltall, 10 0,00, 11 tittel, 12 varsel
  // ---------- Forutsetninger ----------
  const items=[
    {h:'Valg (gule felt kan endres)'},
    {n:'p_build',l:'Byggetid, år',v:p.build,s:3,t:`Deloitte 6. Byggestart er ${C.start}.`},
    {n:'p_invPct',l:'Endring i investeringskostnad, %',v:p.invPct,s:3},
    {n:'p_fixPrice',l:'Rettet prisår (1 = ta med 2023-indeksen)',v:b(p.fixPrice),s:3,t:'Deloitte indekserer fra 2024 og utelater 2023-leddet.'},
    {n:'p_ratePP',l:'Tillegg i lånerente, prosentpoeng',v:p.ratePP,s:4},
    {n:'p_traffic',l:'Trafikk, faktor mot Deloitte (1 = 8 350 ÅDT)',v:p.traffic,s:4},
    {n:'p_premium',l:'Takstpåslag over ferjepris, %',v:p.premium,s:3,t:'Deloitte 40.'},
    {n:'p_exante',l:'Bompengelån skaleres med trafikk (1) eller er fast og staten dekker avvik (0)',v:b(p.tollMode!=='expost'),s:3},
    {n:'p_dv',l:'Drift og vedlikehold, mill. 2025-kr per år',v:p.dv,s:4,t:'Deloitte 44,39. Fagrapporten annualisert 197.'},
    {n:'p_dvStep',l:'D&V øker med 50 % etter 20 år (1 = ja)',v:b(p.dvStep),s:3},
    {n:'p_fidxKpi',l:'Ferjeutgifter følger KPI (1) eller vokser med fast sats (0)',v:b(kpiF),s:3},
    {n:'p_fidxPct',l:'Fast vekst i ferjeutgifter, % per år',v:kpiF?2.5:p.fidx,s:4,t:'Brukes når KPI-valget over er 0. Deloitte 2,5.'},
    {n:'p_austevoll',l:'Austevoll-sambandene spart (1 = ja)',v:b(p.austevoll),s:3},
    {n:'p_hsOverride',l:'Halhjem–Sandvikvåg overstyrt, mill. 2025-kr før skalering (tomt = BT-tall)',v:p.hsOverride??'',s:4},
    {n:'p_county',l:`Fylkessambandene Halhjem–Våge og Jektevik–Hodnanes spart (1 = ja, 0 = nei, 2 = fra driftsår ${C.countyAfter})`,v:p.county==='all'?1:p.county==='after40'?2:0,s:3},
    {n:'p_huglo',l:'Huglo-ferja videreføres, mill. kr/år (trekkes fra fylkesdelen)',v:p.huglo,s:3},
    {n:'p_basisDel',l:`Ferjetall: Deloittes ${C.ferry} fordelt etter BT-tall (1) eller BT-tall direkte (0)`,v:b(p.basis==='deloitte'),s:3},
    {n:'p_drR109',l:'Diskontering: R-109 (1) eller flat realrente (0)',v:b(r109),s:3,t:`R-109: ${pct(ra)} % år 1–${b1}, ${pct(rb)} % år ${b1+1}–${b2}, ${pct(rc)} % deretter, regnet fra ${Y0}.`},
    {n:'p_drRate',l:'Flat realrente (brukes når R-109 er 0)',v:r109?0.04:p.dr,s:7},
    {h:'Konstanter fra Deloitte (s. 6–13)'},
    {n:'p_start',l:'Byggestart, år',v:C.start,s:3},
    {n:'p_y0',l:'Basisår for faste priser og diskontering',v:Y0},
    {n:'p_inv0',l:'Investering, mill. kr (prisår 2022 ifølge fagrapporten)',v:C.inv0,s:3},
    {n:'p_idx23',l:'Prisindeks 2023 (tas med ved rettet prisår)',v:C.idx23,s:4},
    {n:'p_idx24',l:'Prisindeks 2024',v:C.idx24,s:4},
    {n:'p_idx25',l:'Prisindeks 2025',v:C.idx25,s:4},
    {n:'p_exMva',l:'Andel av investeringen uten mva',v:C.exMva,s:4,t:'Mva-kompensasjon 20 %.'},
    {n:'p_loan0',l:`Bompengelån i ${C.tby}-kr, mill. kr`,v:C.loan0,s:3},
    {n:'p_tby',l:'Prisår for bompengelånet',v:C.tby,s:3},
    {n:'p_tollLoanK',l:'Kalibreringsfaktor bompengelån ved endret trafikk/takst',v:C.tollLoanK,s:4},
    {n:'p_loanYears',l:'Serielån, år',v:C.loanYears,s:3},
    {n:'p_r0',l:'Lånerente til og med rentebaneårets start',v:C.r0,s:7},
    {n:'p_r1',l:'Lånerente fra rentebaneårets slutt',v:C.r1,s:7},
    {n:'p_ry0',l:'Rentebane fra år',v:C.ry0,s:3},
    {n:'p_ry1',l:'Rentebane til år',v:C.ry1,s:3},
    {n:'p_ferry',l:'Ferjeutgifter spart, mill. 2025-kr (Deloitte)',v:C.ferry,s:3},
    {n:'p_hs0',l:'Halhjem–Sandvikvåg netto 2026 (BT), mill. kr',v:C.hs0,s:4},
    {n:'p_cty0',l:'Halhjem–Våge og Jektevik–Hodnanes netto 2026 (BT), mill. kr',v:C.cty0,s:3},
    {n:'p_aus0',l:'Austevoll-sambandene netto 2026 (BT), mill. kr',v:C.aus0,s:3},
    {n:'p_bt',l:'Omregning BT-tall til 2025-kr (deflator)',v:C.bt,s:4},
    {n:'p_kai',l:'Sparte kaiutgifter, mill. kr/år',v:C.kai,s:3},
    {n:'p_dvYears',l:'År med grunnnivå D&V før påslag',v:C.dvYears,s:3},
    {n:'p_dvStepF',l:'D&V-faktor etter påslag',v:C.dvStepF,s:4},
    {n:'p_adt1',l:'Lette kjøretøy, ÅDT',v:C.adt1,s:3},
    {n:'p_adt2',l:'Tunge kjøretøy, ÅDT',v:C.adt2,s:3},
    {n:'p_t1',l:'Takst lette, kr (2026-kr)',v:C.t1,s:3},
    {n:'p_t2',l:'Takst tunge, kr (2026-kr)',v:C.t2,s:3},
    {n:'p_g1',l:'Trafikkvekst lette per år',v:C.g1,s:7},
    {n:'p_g2',l:'Trafikkvekst tunge per år',v:C.g2,s:7},
    {n:'p_tollYears',l:'År med bompengeinnkreving',v:C.tollYears,s:3},
    {n:'p_tollDiv',l:'Inntektsdivisor (mva m.m.)',v:C.tollDiv,s:4},
    {n:'p_tollCost',l:'Innkrevingskostnad, kr per passering',v:C.tollCost,s:4},
    {n:'p_tollOpex',l:'Innkrevingsdrift, mill. kr/år',v:C.tollOpex,s:4},
    {n:'p_tollInv',l:'Innkrevingsinvestering året før åpning, mill. kr',v:C.tollInv,s:3},
    {n:'p_prem0',l:'Deloittes takstpåslag, %',v:C.prem0,s:3},
    {n:'p_opYears',l:'Antall driftsår',v:C.opYears,s:3},
    {h:'Beregnet fra forutsetningene (ikke endre)'},
    {n:'p_open',l:'Åpningsår',f:'p_start+p_build',c:OPEN},
    {n:'p_yend',l:'Siste driftsår',f:'p_open+p_opYears-1',c:YEND},
    {n:'p_realInv',l:'Investering inkl. mva, mill. 2025-kr',f:'p_inv0*IF(p_fixPrice=1,p_idx23,1)*p_idx24*p_idx25*(1+p_invPct/100)',s:5,c:C.inv0*(p.fixPrice?C.idx23:1)*C.idx24*C.idx25*(1+p.invPct/100)},
    {n:'p_sc',l:`Skalering av BT-tall til Deloittes ${C.ferry}`,f:'IF(p_basisDel=1,p_ferry/((p_hs0+p_cty0+p_aus0)/p_bt),1)',s:6,c:sc},
    {n:'p_hs',l:'Halhjem–Sandvikvåg, mill. 2025-kr',f:'IF(ISNUMBER(p_hsOverride),p_hsOverride,p_hs0/p_bt)*p_sc',s:5,c:(p.hsOverride??C.hs0/C.bt)*sc},
    {n:'p_cty',l:'Fylkessamband, mill. 2025-kr',f:'MAX(0,p_cty0-p_huglo)/p_bt*p_sc',s:5,c:Math.max(0,C.cty0-p.huglo)/C.bt*sc},
    {n:'p_aus',l:'Austevoll-sambandene, mill. 2025-kr',f:'p_aus0/p_bt*p_sc',s:5,c:C.aus0/C.bt*sc},
    {n:'p_PF',l:'Takstfaktor mot Deloitte',f:'(1+p_premium/100)/(1+p_prem0/100)',s:6,c:PF},
    {n:'p_bb',l:'Byggelån ved åpning, mill. kr nominelt',f:`SUMIF(${R('A')},p_open-1,${R('M')})`,s:5,c:m.bb},
    {n:'p_tollLoan',l:'Bompengelån, mill. kr nominelt',f:`IF(p_exante=1,p_loan0+(p_traffic*p_PF-1)*p_loan0*p_tollLoanK,p_loan0)*SUMIF(${R('A')},p_open,${R('C')})/SUMIF(${R('A')},p_tby,${R('C')})`,s:5,c:m.tollLoan},
    {n:'p_L',l:'Langsiktig lån (statens), mill. kr nominelt',f:'p_bb-p_tollLoan',s:5,c:m.L},
    {h:'Byggeprofil: kumulativ andel etter hvert av 6 byggeår (Deloitte), strekkes over byggetiden'},
  ];
  const cumD=C.cumD;
  const names=[], fRows=[];
  let row=3;
  const F=(r)=>fRows.push(r);
  F({r:1,cells:[{c:'A',v:'Hordfast-kalkulator: forutsetninger',s:11}]});
  F({r:2,cells:[{c:'A',v:'Gule felt er inndata. Alt annet regnes ut med formler. Beløp i mill. kr om ikke annet er oppgitt.',s:0}]});
  F({r:3,cells:[{c:'A',f:warnF,s:12,cv:warnV}]});
  for(const it of items){
    if(it.h){ row++; F({r:row,cells:[{c:'A',v:it.h,s:1}]}); row++; continue; }
    const cells=[{c:'A',v:it.l,s:0},it.f!==undefined?{c:'B',f:it.f,s:it.s||0,cv:it.c}:{c:'B',v:it.v,s:it.s||0}];
    if(it.t) cells.push({c:'C',v:it.t,s:0});
    F({r:row,cells}); names.push({n:it.n,ref:`Forutsetninger!$B$${row}`}); row++;
  }
  const cd0=row;
  cumD.forEach((v,i)=>{F({r:row,cells:[{c:'A',v:'Etter '+i+' av 6 byggeår',s:0},{c:'B',v:v,s:4}]});row++;});
  names.push({n:'p_cumD',ref:`Forutsetninger!$B$${cd0}:$B$${cd0+6}`});

  // ---------- Lagrede verdier for «År for år»: samme regning som formlene under, ut fra hfModel ----------
  const byY=new Map(m.rows.map(o=>[o.y,o])), Yv={};
  for(let r=FIRST;r<=LAST;r++){
    const y=Y0+r-FIRST, q=Yv[r-1]||{C:1,I:0,M:0,X:0,AB:0}, o=byY.get(y)||{ferryR:0,dv:0,loanR:0,toll:0,tollGap:0,inv:0,res:0,fin:null};
    const CI=r===FIRST?1:q.C*(1+kpiAt(y)), D=(y<=C.ry0?C.r0:y>=C.ry1?C.r1:C.r0-(y-C.ry0)*(C.r0-C.r1)/(C.ry1-C.ry0))+p.ratePP/100;
    const E=y-OPEN, op=y>=OPEN&&y<=YEND, F=op?1:0, G=(y-C.start+1)/p.build*6, H=Math.min(5,Math.max(0,Math.floor(G)));
    const I=y<C.start?0:y>=OPEN?1:cumD[H]+(cumD[H+1]-cumD[H])*(G-H), L=o.inv*CI;
    const M=y<C.start?0:y<OPEN?q.M*(1+D)+L*(1+D/2):q.M;
    const inToll=op&&E<C.tollYears, U=inToll?(C.adt1*C.t1*Math.pow(1+C.g1,E)+C.adt2*C.t2*Math.pow(1+C.g2,E))*365/1e6/C.tollDiv-(C.adt1*Math.pow(1+C.g1,E)+C.adt2*Math.pow(1+C.g2,E))*365*C.tollCost/1e6-C.tollOpex:0;
    const W=op?o.fin:'', X=op?(q.X===''?0:q.X)+W:'', Z=m.df(y,p.dr), AA=o.res*Z, AB=q.AB+AA;
    Yv[r]={C:CI,D,E,F,G,H,I,J:I-q.I,K:o.inv,L,M,N:o.loanR*CI,O:o.loanR,P:kpiF?CI:Math.pow(1+p.fidx/100,y-Y0),Q:(o.ferryR-F*C.kai)*CI,R:o.ferryR,S:o.dv,T:o.toll,U,V:o.tollGap,W,X,Y:o.res,Z,AA,AB,
      AC:op&&W>0?y:'',AD:op&&y>OPEN&&X>0?y:'',AE:y>OPEN&&AB>0?y:''};
  }
  const vals=c=>Object.values(Yv).map(v=>v[c]);
  const sum=c=>vals(c).reduce((s,v)=>s+(typeof v==='number'?v:0),0)/1000;
  const pvSum=c=>Object.values(Yv).reduce((s,v)=>s+v[c]*v.Z,0)/1000;
  const firstY=c=>{const a=vals(c).filter(v=>typeof v==='number');return a.length?Math.min(...a):'aldri';};
  const afterOpen=c=>{const a=firstY(c);return a==='aldri'?a:a-OPEN;};

  // ---------- År for år ----------
  const prev=(c,r,first)=>r===FIRST?first:`${c}${r-1}`;
  const colDefs=[
    ['A','År',9,r=>Y0+r-FIRST,9],
    ['B','KPI (årlig prisvekst)',10,r=>kpiAt(Y0+r-FIRST),7],
    ['C','Prisindeks (2025 = 1)',11,r=>r===FIRST?1:`C${r-1}*(1+B${r})`,6],
    ['D','Lånerente',10,r=>`IF(A${r}<=p_ry0,p_r0,IF(A${r}>=p_ry1,p_r1,p_r0-(A${r}-p_ry0)*(p_r0-p_r1)/(p_ry1-p_ry0)))+p_ratePP/100`,8],
    ['E','Driftsår (0 = åpningsår)',10,r=>`A${r}-p_open`,9],
    ['F','Driftsperiode (1 = ja)',10,r=>`IF(AND(A${r}>=p_open,A${r}<=p_yend),1,0)`,9],
    ['G','Hjelp: posisjon i byggeprofil',11,r=>`(A${r}-p_start+1)/p_build*6`,10],
    ['H','Hjelp: profilsteg',9,r=>`MIN(5,MAX(0,INT(G${r})))`,9],
    ['I','Kumulativ byggeandel',11,r=>`IF(A${r}<p_start,0,IF(A${r}>=p_open,1,INDEX(p_cumD,H${r}+1)+(INDEX(p_cumD,H${r}+2)-INDEX(p_cumD,H${r}+1))*(G${r}-H${r})))`,6],
    ['J','Byggeandel i året',10,r=>`I${r}-${r===FIRST?0:'I'+(r-1)}`,6],
    ['K','Investering ekskl. mva (mill. 2025-kr)',14,r=>`J${r}*p_realInv*p_exMva`,5],
    ['L','Byggelånstrekk (mill. kr nominelt)',14,r=>`K${r}*C${r}`,5],
    ['M','Byggelånssaldo ved årets slutt (mill. kr nominelt)',16,r=>`IF(A${r}<p_start,0,IF(A${r}<p_open,${prev('M',r,0)}*(1+D${r})+L${r}*(1+D${r}/2),${prev('M',r,0)}))`,5],
    ['N','Renter og avdrag, statens lån (mill. kr nominelt)',16,r=>`IF(AND(F${r}=1,E${r}<p_loanYears),(p_L-E${r}*p_L/p_loanYears-p_L/p_loanYears/2)*D${r}+p_L/p_loanYears,0)`,5],
    ['O','Renter og avdrag (mill. 2025-kr)',14,r=>`N${r}/C${r}`,5],
    ['P','Vekstfaktor ferjeutgifter',11,r=>`IF(p_fidxKpi=1,C${r},(1+p_fidxPct/100)^(A${r}-p_y0))`,6],
    ['Q','Sparte ferjeutgifter (mill. kr nominelt)',14,r=>`F${r}*P${r}*(p_hs+p_austevoll*p_aus+IF(OR(p_county=1,AND(p_county=2,E${r}>=${C.countyAfter})),1,0)*p_cty)`,5],
    ['R','Sparte ferje- og kaiutgifter (mill. 2025-kr)',14,r=>`Q${r}/C${r}+F${r}*p_kai`,5],
    ['S','Drift og vedlikehold (mill. 2025-kr)',14,r=>`IF(F${r}=1,IF(E${r}<p_dvYears,p_dv,p_dv*IF(p_dvStep=1,p_dvStepF,1)),0)`,5],
    ['T','Netto bompenger (mill. 2025-kr)',14,r=>`IF(AND(F${r}=1,E${r}<p_tollYears),(p_adt1*p_traffic*p_t1*p_PF*(1+p_g1)^E${r}+p_adt2*p_traffic*p_t2*p_PF*(1+p_g2)^E${r})*365/10^6/p_tollDiv-(p_adt1*(1+p_g1)^E${r}+p_adt2*(1+p_g2)^E${r})*p_traffic*365*p_tollCost/10^6-p_tollOpex,IF(A${r}=p_open-1,-p_tollInv,0))`,5],
    ['U','Netto bompenger ved Deloittes prognose (mill. 2025-kr)',16,r=>`IF(AND(F${r}=1,E${r}<p_tollYears),(p_adt1*p_t1*(1+p_g1)^E${r}+p_adt2*p_t2*(1+p_g2)^E${r})*365/10^6/p_tollDiv-(p_adt1*(1+p_g1)^E${r}+p_adt2*(1+p_g2)^E${r})*365*p_tollCost/10^6-p_tollOpex,0)`,5],
    ['V','Bompengeavvik dekket av staten (mill. 2025-kr)',16,r=>`IF(AND(p_exante=0,F${r}=1,E${r}<p_tollYears),T${r}-U${r},0)`,5],
    ['W','Netto for staten, udiskontert (mill. 2025-kr)',16,r=>`IF(F${r}=1,R${r}-S${r}-O${r}+V${r},"")`,5],
    ['X','Akkumulert udiskontert (mill. 2025-kr)',16,r=>`IF(F${r}=1,${r===FIRST?0:'N(X'+(r-1)+')'}+W${r},"")`,5],
    ['Y','Nettostrøm før finansiering (mill. 2025-kr)',16,r=>`R${r}-K${r}-S${r}+T${r}`,5],
    ['Z','Diskonteringsfaktor',11,r=>`IF(p_drR109=1,1/((1+${ra})^MIN(A${r}-p_y0,${b1})*(1+${rb})^MAX(0,MIN(A${r}-p_y0,${b2})-${b1})*(1+${rc})^MAX(0,A${r}-p_y0-${b2})),1/(1+p_drRate)^(A${r}-p_y0))`,6],
    ['AA','Nåverdi av årets strøm (mill. 2025-kr)',14,r=>`Y${r}*Z${r}`,5],
    ['AB','Akkumulert nåverdi (mill. 2025-kr)',14,r=>`${r===FIRST?0:'AB'+(r-1)}+AA${r}`,5],
    ['AC','Hjelp: år med overskudd',11,r=>`IF(F${r}=1,IF(W${r}>0,A${r},""),"")`,9],
    ['AD','Hjelp: år akkumulert i pluss (udiskontert)',14,r=>`IF(F${r}=1,IF(AND(A${r}>p_open,X${r}>0),A${r},""),"")`,9],
    ['AE','Hjelp: år akkumulert nåverdi i pluss',14,r=>`IF(AND(A${r}>p_open,AB${r}>0),A${r},"")`,9],
  ];
  const yRows=[{r:1,cells:colDefs.map(d=>({c:d[0],v:d[1],s:2}))}];
  for(let r=FIRST;r<=LAST;r++) yRows.push({r,cells:colDefs.map(d=>{const x=d[3](r);return typeof x==='number'?{c:d[0],v:x,s:d[4]}:{c:d[0],f:x,s:d[4],cv:Yv[r][d[0]]};})});

  // ---------- Internrente: halvering på nettostrømmen, 40 steg ----------
  const IT_FIRST=7, IT_LAST=46, LO=C.irrLo, HI=C.irrHi;
  const npvF=x=>`SUMPRODUCT(${R('Y')},(1+${x})^(p_y0-${R('A')}))/1000`;
  const npvV=x=>Object.entries(Yv).reduce((s,[r,v])=>s+v.Y*Math.pow(1+x,-(+r-FIRST)),0)/1000;
  const iRows=[{r:1,cells:[{c:'A',v:'Internrente: halvering',s:11}]},
    {r:2,cells:[{c:'A',v:'Samme metode som nettsiden: finner renten mellom grensene der nåverdien av nettostrømmen er null. Nåverdi i mrd kr.',s:0}]},
    {r:3,cells:[{c:'A',v:'Nedre grense',s:0},{c:'B',v:LO,s:8},{c:'C',f:npvF('B3'),s:5,cv:npvV(LO)}]},
    {r:4,cells:[{c:'A',v:'Øvre grense',s:0},{c:'B',v:HI,s:8},{c:'C',f:npvF('B4'),s:5,cv:npvV(HI)}]},
    {r:6,cells:['Steg','Nedre','Øvre','Midtpunkt','Nåverdi i midtpunktet'].map((v,i)=>({c:'ABCDE'[i],v,s:2}))}];
  const irrOK=npvV(LO)>0&&npvV(HI)<0;
  let iLo=LO,iHi=HI,irrMid=0;
  for(let r=IT_FIRST;r<=IT_LAST;r++){
    irrMid=(iLo+iHi)/2; const nv=npvV(irrMid), t=r-1;
    iRows.push({r,cells:[{c:'A',v:r-IT_FIRST+1,s:9},
      r===IT_FIRST?{c:'B',f:'B3',s:8,cv:iLo}:{c:'B',f:`IF(E${t}>0,D${t},B${t})`,s:8,cv:iLo},
      r===IT_FIRST?{c:'C',f:'B4',s:8,cv:iHi}:{c:'C',f:`IF(E${t}>0,C${t},D${t})`,s:8,cv:iHi},
      {c:'D',f:`(B${r}+C${r})/2`,s:8,cv:irrMid},{c:'E',f:npvF('D'+r),s:5,cv:nv}]});
    if(nv>0) iLo=irrMid; else iHi=irrMid;
  }

  // ---------- Resultat ----------
  const res=[
    {h:'Udiskontert (Deloittes metode), mrd 2025-kr'},
    ['Sparte ferje- og kaiutgifter',`SUM(${R('R')})/1000`,0,undefined,sum('R')],
    ['Renter og avdrag, statens lån',`-SUM(${R('O')})/1000`,0,undefined,-sum('O')],
    ['Drift, vedlikehold og reinvesteringer',`-SUM(${R('S')})/1000`,0,undefined,-sum('S')],
    ['Bompengeavvik dekket av staten',`SUM(${R('V')})/1000`,0,undefined,sum('V')],
    ['Netto for staten',`SUM(${R('W')})/1000`,1,undefined,sum('W')],
    ['Største akkumulerte underskudd',`MIN(0,MIN(${R('X')}))/1000`,0,undefined,Math.min(0,...vals('X').filter(v=>typeof v==='number'))/1000],
    ['Første år med overskudd',`IF(COUNT(${R('AC')})=0,"aldri",MIN(${R('AC')}))`,0,9,firstY('AC')],
    ['Akkumulert i pluss, år',`IF(COUNT(${R('AD')})=0,"aldri",MIN(${R('AD')}))`,0,9,firstY('AD')],
    ['Akkumulert i pluss, år etter åpning',`IF(COUNT(${R('AD')})=0,"aldri",MIN(${R('AD')})-p_open)`,0,9,afterOpen('AD')],
    {h:'Nåverdi før finansiering, mrd 2025-kr (diskontert til 2025)'},
    ['Sparte ferje- og kaiutgifter',`SUMPRODUCT(${R('R')},${R('Z')})/1000`,0,undefined,pvSum('R')],
    ['Investering ekskl. mva',`-SUMPRODUCT(${R('K')},${R('Z')})/1000`,0,undefined,-pvSum('K')],
    ['Drift, vedlikehold og reinvesteringer',`-SUMPRODUCT(${R('S')},${R('Z')})/1000`,0,undefined,-pvSum('S')],
    ['Netto bompenger (etter innkrevingskostnader)',`SUMPRODUCT(${R('T')},${R('Z')})/1000`,0,undefined,pvSum('T')],
    ['Nåverdi før finansiering',`SUM(${R('AA')})/1000`,1,undefined,sum('AA')],
    ['Akkumulert nåverdi i pluss, år',`IF(COUNT(${R('AE')})=0,"aldri",MIN(${R('AE')}))`,0,9,firstY('AE')],
    ['Akkumulert nåverdi i pluss, år etter åpning',`IF(COUNT(${R('AE')})=0,"aldri",MIN(${R('AE')})-p_open)`,0,9,afterOpen('AE')],
    // Fra arket «Internrente»: samme halvering som model.js. IRR() brukes ikke: den kan mangle konvergens ved negativ rente og finne en annen løsning.
    ['Internrente (reell rente der nåverdien er null)',`IF(AND(Internrente!$C$3>0,Internrente!$C$4<0),Internrente!$D$${IT_LAST},"Ikke funnet mellom −5 % og 20 %")`,0,8,irrOK?irrMid:'Ikke funnet mellom −5 % og 20 %'],
    {h:'Lån ved åpning, mrd kr nominelt'},
    ['Byggelån inkl. byggelånsrenter','p_bb/1000',0,undefined,m.bb/1000],
    ['Bompengelån','p_tollLoan/1000',0,undefined,m.tollLoan/1000],
    ['Langsiktig lån (statens)','p_L/1000',0,undefined,m.L/1000],
  ];
  const rRows=[{r:1,cells:[{c:'A',v:'Hordfast-kalkulator: resultat',s:11}]},{r:2,cells:[{c:'A',f:warnF,s:12,cv:warnV}]}];
  let rr=3;
  for(const x of res){
    if(x.h){ if(rr>3) rr++; rRows.push({r:rr,cells:[{c:'A',v:x.h,s:1}]}); rr++; continue; }
    rRows.push({r:rr,cells:[{c:'A',v:x[0],s:x[2]===1?1:0},{c:'B',f:x[1],s:x[3]!==undefined?x[3]:5,cv:x[4]}]}); rr++;
  }

  // ---------- Les meg ----------
  const lm=['Hordfast-kalkulator: regneark med formler',
    '',
    'Gjenskaper Deloittes finansielle modell («Hordfast. Finansiell analyse – Endelig rapport», 12.08.2026) og lar deg endre forutsetningene.',
    'Arket «Forutsetninger»: gule felt kan endres. Resten regnes ut.',
    'Arket «År for år»: én rad per år, alle kolonner er formler. Overskriftene oppgir enhet.',
    'Arket «Resultat»: summer og nøkkeltall, med samme definisjoner som nettsiden.',
    'Arket «Internrente»: hjelpeark som finner internrenten mellom −5 % og 20 % ved halvering.',
    '',
    'To resultatmål, ikke bland dem:',
    '- Udiskontert netto (Deloittes metode): sparte ferje- og kaiutgifter minus renter, avdrag og D&V, summert i faste 2025-kr. Bompengene betjener et eget lån og er ikke med.',
    '- Nåverdi før finansiering: investering ekskl. mva, D&V og netto bompenger mot sparte ferjeutgifter, diskontert til 2025. Renter og avdrag er ikke med. Ikke en full samfunnsøkonomisk analyse.',
    '',
    'Filen er laget med valgene som var satt på nettsiden da den ble lastet ned. Tallene ligger lagret i filen og regnes ut på nytt når regnearket åpnes for redigering.',
    `Byggetid kan settes fra 6 til 12 år. Årsradene dekker ${Y0}–${LASTY}, så siste driftsår kan ikke ligge senere. Går det utenfor, avvises verdien, og limes den inn, vises et varsel øverst på «Forutsetninger» og «Resultat».`];
  const lRows=lm.map((t,i)=>({r:i+1,cells:t?[{c:'A',v:t,s:i===0?11:0}]:[]}));

  const sheets=[
    {name:'Les meg',rows:lRows,widths:[130]},
    {name:'Forutsetninger',rows:fRows,widths:[78,16,60],validation:{
      sqref:['p_build','p_start'].map(n=>names.find(x=>x.n===n).ref.replace(/.*!|\$/g,'')).join(' '),
      formula:`AND(p_build=INT(p_build),p_build>=6,p_start=INT(p_start),p_start>=p_y0,p_start+p_build+p_opYears-1<=${LASTY})`,
      title:'Utenfor årsradene',
      error:`Byggetid må være et helt tall fra 6 år, og byggestart og byggetid må gi siste driftsår senest ${LASTY}.`}},
    {name:'År for år',rows:yRows,widths:colDefs.map(d=>d[2]+4),freeze:true},
    {name:'Resultat',rows:rRows,widths:[58,16]},
    {name:'Internrente',rows:iRows,widths:[16,12,12,12,22]},
  ];
  if(opts.cached===false) sheets.forEach(s=>s.rows.forEach(r=>r.cells.forEach(c=>{delete c.cv;})));
  return hfXlsxPack(sheets,names);
}

// ---------- OOXML og zip ----------
function hfXlsxPack(sheets,names){
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const enc=new TextEncoder();
  const HDR='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const sheetXml=sh=>{
    const cols=sh.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
    const view=sh.freeze?'<sheetView workbookViewId="0"><pane xSplit="1" ySplit="1" topLeftCell="B2" activePane="bottomRight" state="frozen"/></sheetView>':'<sheetView workbookViewId="0"/>';
    const v=sh.validation, dv=v?`<dataValidations count="1"><dataValidation type="custom" allowBlank="0" showErrorMessage="1" errorTitle="${esc(v.title)}" error="${esc(v.error)}" sqref="${v.sqref}"><formula1>${esc(v.formula)}</formula1></dataValidation></dataValidations>`:'';
    const rows=sh.rows.map(row=>`<row r="${row.r}">`+row.cells.map(c=>{
      const a=c.c+row.r, st=c.s?` s="${c.s}"`:'';
      if(c.f!==undefined){
        if(c.cv===undefined) return `<c r="${a}"${st}><f>${esc(c.f)}</f></c>`;
        return typeof c.cv==='string'?`<c r="${a}"${st} t="str"><f>${esc(c.f)}</f><v>${esc(c.cv)}</v></c>`:`<c r="${a}"${st}><f>${esc(c.f)}</f><v>${c.cv}</v></c>`;
      }
      if(typeof c.v==='number') return `<c r="${a}"${st}><v>${c.v}</v></c>`;
      return `<c r="${a}"${st} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
    }).join('')+'</row>').join('');
    return HDR+`<worksheet xmlns="${NS}"><sheetViews>${view}</sheetViews><cols>${cols}</cols><sheetData>${rows}</sheetData>${dv}</worksheet>`;
  };
  const styles=HDR+`<styleSheet xmlns="${NS}">`+
    '<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.0;\\-#,##0.0"/><numFmt numFmtId="165" formatCode="0.0000"/></numFmts>'+
    '<fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><sz val="11"/><color rgb="FF0000FF"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFC00000"/><name val="Calibri"/></font></fonts>'+
    '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill></fills>'+
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    '<cellXfs count="13">'+
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'+
    '<xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>'+
    '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'+
    '<xf numFmtId="2" fontId="2" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>'+
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'+
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'+
    '<xf numFmtId="10" fontId="2" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>'+
    '<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'+
    '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'+
    '<xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'+
    '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>'+
    '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>'+
    '</cellXfs></styleSheet>';
  const n=sheets.length;
  const wb=HDR+`<workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>`+
    sheets.map((s,i)=>`<sheet name="${esc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets><definedNames>'+
    names.map(x=>`<definedName name="${x.n}">${esc(x.ref)}</definedName>`).join('')+'</definedNames><calcPr fullCalcOnLoad="1"/></workbook>';
  const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const wbRels=HDR+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="${REL}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+
    `<Relationship Id="rId${n+1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`;
  const ct=HDR+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
    sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>';
  const rels=HDR+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const files=[['[Content_Types].xml',ct],['_rels/.rels',rels],['xl/workbook.xml',wb],['xl/_rels/workbook.xml.rels',wbRels],['xl/styles.xml',styles]]
    .concat(sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,sheetXml(s)])).map(([name,txt])=>({name,data:enc.encode(txt)}));
  return hfZipStore(files);
}

function hfZipStore(files){
  const enc=new TextEncoder();
  const tab=new Uint32Array(256);
  for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;tab[i]=c>>>0;}
  const crc=d=>{let c=0xFFFFFFFF;for(let i=0;i<d.length;i++)c=tab[(c^d[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
  const chunks=[],central=[];let off=0,csize=0;
  const dt=new Date(),time=(dt.getHours()<<11)|(dt.getMinutes()<<5)|(dt.getSeconds()>>1),date=((dt.getFullYear()-1980)<<9)|((dt.getMonth()+1)<<5)|dt.getDate();
  for(const f of files){
    const nm=enc.encode(f.name),c=crc(f.data),h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,time,true);h.setUint16(12,date,true);
    h.setUint32(14,c,true);h.setUint32(18,f.data.length,true);h.setUint32(22,f.data.length,true);h.setUint16(26,nm.length,true);h.setUint16(28,0,true);
    chunks.push(new Uint8Array(h.buffer),nm,f.data);
    const e=new DataView(new ArrayBuffer(46));
    e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x0800,true);e.setUint16(10,0,true);e.setUint16(12,time,true);e.setUint16(14,date,true);
    e.setUint32(16,c,true);e.setUint32(20,f.data.length,true);e.setUint32(24,f.data.length,true);e.setUint16(28,nm.length,true);e.setUint32(42,off,true);
    central.push(new Uint8Array(e.buffer),nm);csize+=46+nm.length;
    off+=30+nm.length+f.data.length;
  }
  const end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,csize,true);end.setUint32(16,off,true);
  const all=chunks.concat(central,[new Uint8Array(end.buffer)]);
  const out=new Uint8Array(all.reduce((s,a)=>s+a.length,0));let o=0;
  for(const a of all){out.set(a,o);o+=a.length;}
  return out;
}

if (typeof module !== 'undefined') module.exports = hfXlsxBuild;
