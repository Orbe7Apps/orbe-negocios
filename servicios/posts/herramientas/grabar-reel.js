// Graba un reel cuadro por cuadro y lo une con ffmpeg.
// Uso: node grabar-reel.js <ruta/al/reel.html> <salida.mp4> <segundos> [portada_en_segundos]
// Requiere Playwright (Chromium) y ffmpeg. Crea también <salida>-portada.png con el cuadro elegido.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
(async () => {
  const [html, salida, segs, tPortada] = process.argv.slice(2);
  const fps = 30, n = Math.round(+segs * fps);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.resolve(html));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(800);
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => window.pintar(t), i / fps);
    await p.screenshot({ path: path.join(tmp, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 92 });
  }
  if (tPortada !== undefined) {
    await p.evaluate(t => window.pintar(t), +tPortada);
    await p.screenshot({ path: salida.replace(/\.mp4$/, '-portada.png') });
  }
  await b.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(tmp, '%05d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', salida]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('Listo:', salida, `(${segs} s, ${n} cuadros)`);
})();
