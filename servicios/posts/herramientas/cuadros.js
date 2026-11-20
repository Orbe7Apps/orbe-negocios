// Saca cuadros sueltos de un reel para revisarlos antes de grabar.
// Uso: node cuadros.js <reel.html> <carpeta_salida> <t1> <t2> ...
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [html, out, ...ts] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.resolve(html));
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  for (const t of ts) { await p.evaluate(x => window.pintar(x), +t); await p.screenshot({ path: path.join(out, `t${t}.png`) }); }
  await b.close();
})();
