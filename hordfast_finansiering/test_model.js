// Regresjonstest for model.js. Kjør: node test_model.js
// Tallene er kontrollert mot Deloitte-rapporten (12.08.2026) og mot notatet
// «Deloittes Hordfast-analyse: kontrollberegning og vurdering». Endres modellen,
// skal disse fortsatt stemme med mindre endringen er bevisst.

const hfModel = require('./model.js');

const DELOITTE = {
  basis: 'deloitte', county: 'all', huglo: 0, austevoll: true,
  fidx: 2.5, dv: 44.39, dvStep: true, invPct: 0, ratePP: 0,
  dr: 'R109', build: 6, traffic: 1, premium: 40, tollMode: 'exante',
};

const cases = [
  // [navn, avvik fra DELOITTE, forventet udiskontert (mrd), forventet R-109 (mrd)]
  ['Deloitte basis (rapporten: 27,673)', {}, 27.7, -10.1],
  ['Investering +20 % (rapporten s. 17: 14,533)', { invPct: 20 }, 14.6, null],
  ['Uten Austevoll', { austevoll: false }, 16.8, -12.4],
  ['Kun staten (Halhjem–Sandvikvåg)', { austevoll: false, county: 'none' }, 4.3, -15.2],
  ['Konstant kjøpekraft i ferjeutgiftene', { fidx: 'kpi' }, 11.3, -12.5],
  ['D&V 197 mill. kr/år flatt', { dv: 197, dvStep: false }, 17.5, -12.6],
  ['Kombinert: kun staten + KPI + D&V 197', { austevoll: false, county: 'none', fidx: 'kpi', dv: 197, dvStep: false }, -17.8, -19.4],
  ['Trafikk −30 %', { traffic: 0.7 }, 23.5, -12.0],
  ['Trafikk +30 %', { traffic: 1.3 }, 31.9, -8.2],
];

let fail = 0;
for (const [name, over, expU, expN] of cases) {
  const r = hfModel({ ...DELOITTE, ...over });
  const u = Math.round(r.undisc / 100) / 10;
  const n = Math.round(r.npvR109 / 100) / 10;
  const okU = Math.abs(u - expU) <= 0.1;
  const okN = expN === null || Math.abs(n - expN) <= 0.1;
  if (!okU || !okN) fail++;
  console.log(`${okU && okN ? 'OK  ' : 'FEIL'} ${name}: udiskontert ${u} (forventet ${expU}), R-109 ${n}${expN === null ? '' : ` (forventet ${expN})`}`);
}

// Avstemming mot Deloittes figur s. 5 og rekonstruksjonen
const base = hfModel(DELOITTE);
const checks = [
  ['Første år med overskudd', base.firstPosYear, 2058],
  ['Akkumulert i pluss', base.cumPosYear, 2086],
];
for (const [name, got, exp] of checks) {
  if (got !== exp) fail++;
  console.log(`${got === exp ? 'OK  ' : 'FEIL'} ${name}: ${got} (forventet ${exp})`);
}

process.exit(fail ? 1 : 0);
