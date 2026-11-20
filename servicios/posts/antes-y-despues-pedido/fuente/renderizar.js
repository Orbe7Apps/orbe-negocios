// Convierte fuente/html/NN.html en NN.png (1080x1350) dentro de la carpeta de la publicación.
// Uso: node renderizar.js   (necesita Playwright con Chromium)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const dir = path.join(__dirname, 'html');
  const salida = path.join(__dirname, '..');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.html')).sort()) {
    await p.goto('file://' + path.join(dir, f));
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(400);
    // Aviso si algún texto se sale de la lámina
    const fuera = await p.evaluate(() => [...document.querySelectorAll('h1,h2,p,span,b,small,div')].filter(e => { const r = e.getBoundingClientRect(); return e.children.length === 0 && e.textContent.trim() && (r.right > 1080.5 || r.bottom > 1350.5 || r.left < -0.5); }).map(e => e.textContent.trim().slice(0, 40)));
    if (fuera.length) console.log(f, 'texto fuera de la lámina:', fuera);
    await p.screenshot({ path: path.join(salida, f.replace('.html', '.png')) });
    console.log('ok', f.replace('.html', '.png'));
  }
  await b.close();
})();
