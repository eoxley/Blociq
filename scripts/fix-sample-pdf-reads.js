const fs = require('fs');
const path = require('path');

const roots = ['app', 'src', 'lib'];
const exclude = new Set(['node_modules', '.next', 'coverage', 'reports', 'public', 'scripts']);

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    if (exclude.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) out.push(full);
  }
}

const files = [];
for (const r of roots) if (fs.existsSync(r)) walk(r, files);

const readRx = /fs\.readFileSync\(([^)]*05-versions-space\.pdf[^)]*)\)/g;

let patched = 0;
const touched = [];
for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  const orig = src;

  // Wrap any sample PDF read with a production guard so it won't run at build time
  src = src.replace(readRx, (_, inner) =>
    `(() => { if (process.env.NODE_ENV !== 'production' && process.env.USE_SAMPLE_PDF === 'true') { return fs.readFileSync(${inner}); } return Buffer.alloc(0); })()`
  );

  if (src !== orig) {
    fs.writeFileSync(file, src, 'utf8');
    patched++;
    touched.push(file);
  }
}

console.log(`📌 Guarded import-time sample PDF reads in ${patched} file(s).`);
for (const f of touched) console.log(' -', f);

if (patched === 0) {
  console.log('ℹ️  No import-time reads of 05-versions-space.pdf found in app/lib/src (good).');
}
