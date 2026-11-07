// Kontrollerer at xlsx-eksporten (formler) gir samme tall som model.js.
// Krever LibreOffice (soffice) som regner ut formlene. Kjør: node test_xlsx.js
// Uten soffice hoppes testen over, men feiler når miljøvariabelen CI er satt.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process'), url = require('url');
const hfModel = require('./model.js'), build = require('./xlsx_export.js');

const base = {basis:'deloitte',county:'all',huglo:0,austevoll:true,fidx:2.5,dv:44.39,dvStep:true,invPct:0,ratePP:0,
  traffic:1,premium:40,tollMode:'exante',build:6,dr:'R109'};
const scen = {
  'Deloitte': {},
  'Deloitte +20 % investering': {invPct:20},
  'Kombinert': {county:'none',austevoll:false,fidx:'kpi',dv:197,dvStep:false},
  'Trafikk +30 %, byggetid 9, flat 3 %': {traffic:1.3,build:9,dr:0.03},
  'Expost, takst 20 %, rente +1': {tollMode:'expost',traffic:0.7,premium:20,ratePP:1},
  'BT-tall, Huglo 30, rettet prisår': {basis:'bt',huglo:30,fixPrice:true,build:12},
  'Svakt negativ internrente': {county:'none',austevoll:false,fidx:'kpi',dv:300,dvStep:false},
  'Internrente med flere løsninger': {basis:'deloitte',county:'none',huglo:60,austevoll:false,fidx:1.5,dv:300,dvStep:true,invPct:-20,ratePP:1,traffic:1.3,premium:0,tollMode:'exante',build:6,dr:0.03,fixPrice:false},
  'Internrente ikke funnet, D&V 1200': {county:'none',austevoll:false,fidx:'kpi',dv:1200,dvStep:false},
  'Internrente ikke funnet, D&V 800 med påslag': {county:'none',austevoll:false,fidx:'kpi',dv:800,dvStep:true},
  'Overstyrt Halhjem–Sandvikvåg': {basis:'bt',hsOverride:500},
  'Uten standardverdier': {traffic:undefined,premium:undefined,build:undefined},
  'Fylkessamband fra driftsår 40': {county:'after40',huglo:30},
  'Uten tollMode, trafikk 0,8': {tollMode:undefined,traffic:0.8},
};
// Scenarioknappene hentes fra script.js, så testen følger siden.
const src = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
const PRESETS = new Function(src.slice(src.indexOf('const PRESETS'), src.indexOf('const $=')) + 'return PRESETS;')();
for (const [k, q] of Object.entries(PRESETS)) scen['Knapp ' + k] = {build:q.build,basis:q.basis,county:q.county,huglo:q.huglo,austevoll:q.austevoll,
  fidx:q.fidx==='kpi'?'kpi':+q.fidx,dv:q.dv===45?44.39:(q.dv===195?197:q.dv),dvStep:q.dvStep,invPct:q.inv,ratePP:q.rate,traffic:1+q.traffic/100,premium:q.premium,tollMode:q.expost?'expost':'exante'};

const probe = cp.spawnSync('soffice', ['--version']);
if (probe.error) {
  console.log(process.env.CI ? 'FEIL  soffice ikke installert (CI er satt)' : 'SKIP  soffice ikke installert, xlsx-formlene er IKKE testet');
  process.exit(process.env.CI ? 1 : 0);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hfxlsx-'));
let code = 1;
try { code = run(); }
catch (e) { console.log('FEIL ', e.message); }
finally { fs.rmSync(dir, {recursive: true, force: true}); }
process.exit(code);

function run() {
  const names = Object.keys(scen);
  // Uten lagrede verdier, så tallene under garantert er regnet ut av LibreOffice.
  const files = names.map((n, i) => [`s${i}`, build({...base, ...scen[n]}, {cached: false})]);
  // Byggetid 13 går utenfor årsradene og skal gi varsel. Vanlig fil skal kunne åpnes med lagrede verdier.
  files.push(['warn', build({...base, build: 13}, {cached: false})], ['cached', build(base)]);
  for (const [f, buf] of files) fs.writeFileSync(path.join(dir, f + '.xlsx'), buf);
  const out = path.join(dir, 'out');
  // Egen profil, så en åpen LibreOffice ikke overtar konverteringen.
  const res = cp.spawnSync('soffice', ['-env:UserInstallation=' + url.pathToFileURL(path.join(dir, 'profile')).href, '--headless',
    '--convert-to', 'csv:Text - txt - csv (StarCalc):44,34,76,1,,0,false,false,false,false,false,-1',
    '--outdir', out, ...files.map(([f]) => path.join(dir, f + '.xlsx'))], {encoding: 'utf8', timeout: 300000});
  if (res.error || res.status !== 0) throw new Error('soffice: ' + (res.error ? res.error.message : res.stderr));

  const parse = f => {
    if (!fs.existsSync(f)) throw new Error('soffice laget ikke ' + path.basename(f) + '. stderr: ' + res.stderr);
    return fs.readFileSync(f, 'utf8').split(/\r?\n/).map(l => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(x => x.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')));
  };
  let fail = 0;
  const chk = (label, got, exp, tol = 0) => {
    const ok = typeof exp === 'number' ? Math.abs(+got - exp) <= tol : String(got) === String(exp);
    if (!ok) { fail++; console.log('  AVVIK', label, 'regneark:', got, 'modell:', exp); }
  };
  // Lagrede verdier leses rett fra filen (zip uten komprimering) og sammenlignes med LibreOffices utregning.
  const SHEETS = ['Forutsetninger', 'År for år', 'Resultat', 'Internrente'];
  const colNum = c => [...c].reduce((s, x) => s * 26 + x.charCodeAt(0) - 64, 0) - 1;
  const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const cachedCells = buf => {
    const parts = Buffer.from(buf).toString('utf8').split('<worksheet').slice(1);
    return SHEETS.map((_, k) => [...parts[k + 1].split('</worksheet>')[0].matchAll(/<c r="([A-Z]+)(\d+)"[^>]*?( t="str")?><f>[^<]*<\/f>(?:<v>([^<]*)<\/v>)?<\/c>/g)]);
  };
  const checkCached = (label, buf, i) => {
    cachedCells(buf).forEach((cells, k) => {
      const csv = parse(path.join(out, `s${i}-${SHEETS[k]}.csv`));
      if (!cells.length) { fail++; console.log('  AVVIK', label, SHEETS[k], 'ingen formelceller funnet'); }
      for (const [, c, r, isStr, v] of cells) {
        if (v === undefined) { fail++; console.log('  AVVIK', label, SHEETS[k], c + r, 'mangler lagret verdi'); continue; }
        const got = (csv[r - 1] || [])[colNum(c)] ?? '', where = `${label} ${SHEETS[k]} ${c}${r} lagret`;
        if (isStr) chk(where, got, unesc(v));
        else if (got.endsWith('%')) chk(where, parseFloat(got) / 100, +v, 1e-4);
        else chk(where, got, +v, 1e-6 * Math.max(1, Math.abs(+v)));
      }
    });
  };
  const warnCell = name => (parse(path.join(out, `${name}-Resultat.csv`))[1] || [])[0] || '';
  if (!warnCell('warn').startsWith('ADVARSEL')) { fail++; console.log('  AVVIK byggetid 13 gir ikke varsel'); }
  if (!/ADVARSEL/.test(Buffer.from(build({...base, build: 13})).toString('utf8'))) { fail++; console.log('  AVVIK byggetid 13 mangler lagret varsel'); }
  if (warnCell('cached') !== '') { fail++; console.log('  AVVIK Deloitte gir varsel'); }
  chk('fil med lagrede verdier', parse(path.join(out, 'cached-Resultat.csv')).find(x => x[0] === 'Netto for staten')[1], hfModel(base).undisc / 1e3, 1e-6);

  names.forEach((n, i) => {
    checkCached(n, build({...base, ...scen[n]}), i);
    const p = {...base, ...scen[n]}, r = hfModel(p), before = fail;
    const Y = parse(path.join(out, `s${i}-År for år.csv`)), RS = parse(path.join(out, `s${i}-Resultat.csv`));
    const col = h => Y[0].findIndex(x => x.startsWith(h));
    const cI = {R: col('Sparte ferje- og kai'), K: col('Investering ekskl'), S: col('Drift og vedl'), O: col('Renter og avdrag (mill. 2025'), T: col('Netto bompenger (mill'), W: col('Netto for staten'), Y: col('Nettostrøm'), X: col('Akkumulert udisk'), AB: col('Akkumulert nåverdi')};
    const byYear = {}; Y.slice(1).forEach(row => { byYear[row[0]] = row; });
    const cumF = new Map(r.cumF.map(o => [o.y, o.v])), cumR = new Map(r.cumR.map(o => [o.y, o.v]));
    for (const o of r.rows) {
      const row = byYear[o.y];
      chk(o.y + ' ferje', row[cI.R], o.ferryR, 1e-6 * 1e3);
      chk(o.y + ' inv', row[cI.K], o.inv, 1e-3);
      chk(o.y + ' dv', row[cI.S], o.dv, 1e-6);
      chk(o.y + ' lån', row[cI.O], o.loanR, 1e-3);
      chk(o.y + ' bom', row[cI.T], o.toll, 1e-3);
      chk(o.y + ' res', row[cI.Y], o.res, 1e-3);
      if (o.fin !== null) chk(o.y + ' netto', row[cI.W], o.fin, 1e-3);
      if (cumF.has(o.y)) chk(o.y + ' akk. udiskontert', row[cI.X], cumF.get(o.y), 1e-3);
      if (cumR.has(o.y)) chk(o.y + ' akk. nåverdi', row[cI.AB], cumR.get(o.y), 1e-3);
    }
    const all = RS.filter(x => x[0]);
    const find = (label, nth = 0) => all.filter(x => x[0] === label)[nth][1];
    chk('udiskontert netto', find('Netto for staten'), r.undisc / 1e3, 1e-6);
    chk('nåverdi', find('Nåverdi før finansiering'), r.npvSel / 1e3, 1e-6);
    chk('største underskudd', find('Største akkumulerte underskudd'), r.minCum / 1e3, 1e-6);
    chk('første overskudd', find('Første år med overskudd'), r.firstPosYear ?? 'aldri');
    chk('akk. pluss', find('Akkumulert i pluss, år'), r.cumPosYear ?? 'aldri');
    const pvPos = r.cumR.find(o => o.y > r.OPEN && o.v > 0);
    chk('akk. nåverdi pluss', find('Akkumulert nåverdi i pluss, år'), pvPos ? pvPos.y : 'aldri');
    const irr = find('Internrente (reell rente der nåverdien er null)');
    if (r.irr !== null) chk('internrente', parseFloat(irr) / 100, r.irr, 1e-4);
    else chk('internrente', irr, 'Ikke funnet mellom −5 % og 20 %');
    chk('byggelån', find('Byggelån inkl. byggelånsrenter'), r.bb / 1e3, 1e-6);
    chk('bompengelån', find('Bompengelån'), r.tollLoan / 1e3, 1e-6);
    chk('langsiktig lån', find('Langsiktig lån (statens)'), r.L / 1e3, 1e-6);
    console.log((fail === before ? 'OK   ' : 'FEIL ') + n + ': netto ' + (r.undisc / 1e3).toFixed(2) + ', nåverdi ' + (r.npvSel / 1e3).toFixed(2));
  });
  return fail ? 1 : 0;
}
