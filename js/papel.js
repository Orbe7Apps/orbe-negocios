// Papel formal: el motor de todos los PDF de la app (órdenes, cotizaciones, acuerdos, Cierre Z y reportes).
// Texto de verdad (no una foto de la pantalla), letra Inter guardada en la app, blanco y negro con filetes finos.
// Cada documento se arma con piezas: membrete, partes, tabla, totales con el monto en letras, firmas y pie con páginas.
import { iniciales } from './ui.js';

const BASE = new URL('./lib/', import.meta.url).href;
let cargando = null;
export const cargarPDF = () => cargando || (cargando = window.jspdf ? Promise.resolve() : new Promise((ok, mal) => {
  const s = document.createElement('script'); s.src = BASE + 'jspdf.umd.min.js'; s.onload = ok; s.onerror = () => { cargando = null; mal(new Error('jsPDF')); }; document.head.appendChild(s);
}));

// Letra Inter (solo las letras del español y signos comunes, unos 18 KB por grosor). Si no carga, se usa Helvetica.
const PESOS = { n: 400, m: 600, b: 700 };
let fuentes = null;
function cargarFuentes() {
  if (fuentes) return fuentes;
  const una = w => fetch(BASE + 'fuentes/inter-' + w + '.ttf').then(r => { if (!r.ok) throw new Error('fuente'); return r.arrayBuffer(); }).then(b => {
    const u = new Uint8Array(b); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  });
  fuentes = Promise.all(Object.keys(PESOS).map(k => una(PESOS[k]).then(b64 => [k, b64]))).catch(() => { fuentes = null; return null; });
  return fuentes;
}

// Signos que la letra no tiene: se cambian por los más parecidos.
const PERMITIDOS = /[^\n\x20-\x7E\xA0-\xFFıŒœ–—‘-„•…′€№−]/g;
const limpioInter = x => String(x == null ? '' : x).replace(/[   ]/g, ' ').replace(PERMITIDOS, '');
const limpioHelv = x => String(x == null ? '' : x).replace(/[—–]/g, '-').replace(/[“”„]/g, '"').replace(/[‘’‚]/g, "'").replace(/…/g, '...').replace(/−/g, '-').replace(/[   ]/g, ' ').replace(/[^\n\x20-\x7E\xA0-\xFF€·]/g, '');

// Carta en América; A4 en el resto.
const CARTA = ['US', 'CA', 'MX', 'GT', 'SV', 'HN', 'NI', 'CR', 'PA', 'DO', 'CO', 'VE', 'EC', 'PE', 'BO', 'CL', 'AR', 'UY', 'PY', 'BR', 'PH'];
export const papelDe = P => CARTA.includes(P.id) ? 'letter' : 'a4';

// El logo puede estar en WebP: el PDF necesita PNG.
export function aPNG(src) {
  return new Promise(ok => {
    if (!src) { ok(null); return; }
    const img = new Image();
    img.onload = () => { try { const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; cv.getContext('2d').drawImage(img, 0, 0); ok({ src: cv.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight }); } catch (e) { ok(null); } };
    img.onerror = () => ok(null); img.src = src;
  });
}

// ---------- monto en letras ----------
const UNI = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DEC = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CEN = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
function menosDeMil(n) {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100), r = n % 100;
  const resto = r < 30 ? UNI[r] : DEC[Math.floor(r / 10)] + (r % 10 ? ' y ' + UNI[r % 10] : '');
  return [CEN[c], resto].filter(Boolean).join(' ');
}
// “uno” delante de un sustantivo se dice “un” (veintiún, treinta y un, un millón).
const apocope = s => s.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');
export function numeroEnLetras(n) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'cero';
  const mill = Math.floor(n / 1e6), miles = Math.floor((n % 1e6) / 1000), resto = n % 1000, partes = [];
  if (mill) partes.push(mill === 1 ? 'un millón' : apocope(numeroEnLetras(mill)) + ' millones');
  if (miles) partes.push(miles === 1 ? 'mil' : apocope(menosDeMil(miles)) + ' mil');
  if (resto) partes.push(menosDeMil(resto));
  return partes.join(' ');
}
// “mil cuatrocientos cincuenta y nueve dólares con 51/100”.
export function montoEnLetras(v, P) {
  const cent = Math.round(Math.abs(v) * 100), ent = Math.floor(cent / 100), dec = cent % 100;
  const uno = ent === 1, moneda = P.id === 'VE' ? (uno ? 'dólar' : 'dólares') : P.eur ? (uno ? 'euro' : 'euros') : (P.cur || 'pesos');
  let palabras = numeroEnLetras(ent);
  if (/uno$/.test(palabras)) palabras = apocope(palabras);
  const de = ent >= 1e6 && ent % 1e6 === 0 ? 'de ' : '';
  return palabras + ' ' + de + moneda + ' con ' + String(dec).padStart(2, '0') + '/100';
}

// La tasa que se usó, dicha completa: “Tasa BCV del 28 nov 2026: Bs 875,68 por $”.
export function textoTasa(S, P, D) {
  if (!D.dual) return '';
  const nf = new Intl.NumberFormat(P.loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fuente = P.id === 'VE' ? ((S.tasa && S.tasa.fuente) === 'oficial' || !(S.tasa && S.tasa.fuente) ? 'BCV' : (S.tasa.fuente === 'paralela' ? 'paralela' : S.tasa.fuente)) : 'del dólar';
  const hoy = new Date().toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
  return { nombre: 'Tasa ' + fuente, fecha: hoy, valor: P.id === 'VE' ? 'Bs ' + nf.format(D.tasa) + ' por $' : P.s + ' ' + nf.format(D.tasa) + ' por US$' };
}

export const fechaDoc = t => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
export const fechaHoraDoc = t => fechaDoc(t) + ', ' + new Date(t).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' });

// Lo que va en el membrete del negocio, igual en todos los documentos.
export function membreteDe(S, P) {
  const n = S.negocio;
  return {
    negocio: n.nombre, inic: iniciales(n.nombre), logo: n.logo || '',
    razon: n.razon && n.razon !== n.nombre ? n.razon : '', fiscal: n.fiscal ? P.fiscal[0] + ' ' + n.fiscal : '',
    lineas: [n.dir || '', [n.tel, n.correo].filter(Boolean).join(' · ')].filter(Boolean)
  };
}

// ---------- el papel ----------
const TINTA = [23, 22, 31], GRIS = [92, 90, 107], TENUE = [142, 140, 156], CEBRA = [245, 245, 248], FILETE = [217, 216, 226];

export async function nuevoPapel(formato) {
  await cargarPDF();
  const b64 = await cargarFuentes();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: formato || 'letter' });
  let FAM = 'helvetica', limpio = limpioHelv;
  if (b64) {
    try { b64.forEach(([k, d]) => { doc.addFileToVFS('inter-' + k + '.ttf', d); doc.addFont('inter-' + k + '.ttf', 'Inter', k); }); FAM = 'Inter'; limpio = limpioInter; }
    catch (e) { FAM = 'helvetica'; limpio = limpioHelv; }
  }
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 16, ARRIBA = 15, LIMITE = H - 22;
  const pp = { doc, W, H, M, y: ARRIBA, limpio, cabezaSig: null };
  const estilo = { n: 'normal', m: 'bold', b: 'bold' };
  // Grosor (n normal, m seminegrita, b negrita), tamaño en puntos y color.
  const f = pp.f = (peso, pt, color) => { doc.setFont(FAM, FAM === 'Inter' ? peso : estilo[peso]); doc.setFontSize(pt); doc.setTextColor(...(color || TINTA)); };
  const ancho = pp.ancho = (t, cs) => doc.getTextWidth(limpio(t)) + (cs ? cs * Math.max(0, limpio(t).length - 1) : 0);
  // Escribe un texto; con der = true lo alinea a la derecha de x; cs = espacio entre letras (mm).
  const T = pp.T = (t, x, y, o = {}) => {
    const s = limpio(t); if (!s) return;
    const cs = o.cs || 0, w = doc.getTextWidth(s) + cs * Math.max(0, s.length - 1);
    const x0 = o.der ? x - w : o.centro ? x - w / 2 : x;
    if (cs) { doc.setCharSpace(cs); doc.text(s, x0, y); doc.setCharSpace(0); } else doc.text(s, x0, y);
  };
  const partir = pp.partir = (t, w) => doc.splitTextToSize(limpio(t), w);
  const linea = pp.linea = (x1, y1, x2, y2, g, color) => { doc.setDrawColor(...(color || TINTA)); doc.setLineWidth(g); doc.line(x1, y1, x2, y2); };
  const etiqueta = pp.etiqueta = (t, x, y, o = {}) => { f('m', 7.1, o.color || TENUE); T(String(t).toUpperCase(), x, y, { cs: 0.32, der: o.der }); };

  // Página nueva: arriba una línea corta con el negocio y el documento, para no perder el hilo.
  const pagina = pp.pagina = () => {
    doc.addPage(); pp.y = ARRIBA;
    if (pp.cabezaSig) {
      const c = pp.cabezaSig;
      f('m', 8.6); T(c.negocio, M, pp.y + 3);
      f('n', 8.3, GRIS); T(c.tipo + ' ' + c.numero + ' (continuación)', W - M, pp.y + 3, { der: true });
      linea(M, pp.y + 6, W - M, pp.y + 6, 0.2, FILETE); pp.y += 12;
    }
  };
  const cabe = pp.cabe = alto => { if (pp.y + alto > LIMITE) { pagina(); return false; } return true; };

  // Membrete: logo, negocio con razón social y RIF; a la derecha el tipo de documento, su número y fechas.
  pp.membrete = async (m, tipo, numero, meta) => {
    const y0 = pp.y, L = 14.3;
    pp.cabezaSig = { negocio: m.negocio, tipo: tipo.charAt(0) + tipo.slice(1).toLowerCase(), numero };
    const lg = await aPNG(m.logo);
    if (lg) { const k = Math.min(L / lg.w, L / lg.h); doc.addImage(lg.src, 'PNG', M + (L - lg.w * k) / 2, y0 + (L - lg.h * k) / 2, lg.w * k, lg.h * k); }
    else { doc.setFillColor(...TINTA); doc.roundedRect(M, y0, L, L, 2.6, 2.6, 'F'); f('b', 13, [255, 255, 255]); T(m.inic, M + L / 2, y0 + L / 2 + 1.7, { centro: true }); }
    // Lado derecho primero, para saber cuánto ancho le queda al negocio.
    f('m', 8.3, GRIS); const wTipo = ancho(tipo, 0.45);
    T(tipo, W - M, y0 + 3.2, { cs: 0.45, der: true });
    f('b', 18); T(numero, W - M, y0 + 10.8, { der: true }); const wNum = ancho(numero);
    f('n', 8.3); const wv = Math.max(0, ...meta.map(r => ancho(r[1])));
    let yr = y0 + 16.4;
    meta.forEach(r => { f('n', 8.3, TENUE); T(r[0], W - M - wv - 3.5, yr, { der: true }); f('m', 8.3); T(r[1], W - M, yr, { der: true }); yr += 4.3; });
    const wDer = Math.max(wTipo, wNum, wv + 3.5 + Math.max(0, ...meta.map(r => (f('n', 8.3), ancho(r[0])))));
    const x = M + L + 4.5, wIzq = W - M - wDer - 8 - x;
    f('b', 14.3); const nom = partir(m.negocio, wIzq).slice(0, 2); nom.forEach((l, i) => T(l, x, y0 + 5 + i * 5.6));
    let yl = y0 + 5 + (nom.length - 1) * 5.6 + 5.2;
    if (m.razon || m.fiscal) {
      if (m.razon) { f('m', 8.3); T(m.razon, x, yl); }
      if (m.fiscal) { const dx = m.razon ? (f('m', 8.3), ancho(m.razon)) : 0; f('n', 8.3, GRIS); T((m.razon ? ' · ' : '') + m.fiscal, x + dx, yl); }
      yl += 4.1;
    }
    f('n', 8.3, GRIS); m.lineas.forEach(l => partir(l, wIzq).slice(0, 2).forEach(s => { T(s, x, yl); yl += 4.1; }));
    pp.y = Math.max(y0 + L, yl - 2.5, yr - 2.5) + 5.2;
    // Doble filete: uno grueso y uno fino.
    linea(M, pp.y, W - M, pp.y, 0.55); linea(M, pp.y + 0.95, W - M, pp.y + 0.95, 0.2);
    pp.y += 7.5;
  };

  // Dos columnas de datos (cliente a la izquierda; oferta, equipo o resumen a la derecha).
  pp.partes = (izq, der) => {
    const w = W - 2 * M, wi = w * 0.53, xd = M + wi + 8, wd = W - M - xd;
    const col = (b, x, wc, wk) => {
      if (!b) return pp.y;
      let y = pp.y; etiqueta(b.tit, x, y); y += 5.2;
      b.filas.filter(r => r[1]).forEach(r => {
        f('n', 8.6, GRIS); T(r[0], x, y);
        f('m', 8.6); const ls = partir(r[1], wc - wk).slice(0, 3); ls.forEach((l, i) => T(l, x + wk, y + i * 4.2));
        y += 4.2 * ls.length + 0.9;
      });
      return y;
    };
    const fin = Math.max(col(izq, M, wi, 30), col(der, xd, wd, 31));
    pp.y = fin + 3.5;
  };

  // Un título chico con un párrafo debajo (detalles, condiciones, acuerdo).
  pp.parrafo = (tit, txt, o = {}) => {
    if (!txt) return;
    const ls = (f('n', o.pt || 8, GRIS), partir(txt, W - 2 * M));
    cabe(6 + ls.length * 4.1);
    if (tit) { etiqueta(tit, M, pp.y); pp.y += 4.8; }
    f('n', o.pt || 8, o.color || GRIS); ls.forEach(l => { T(l, M, pp.y); pp.y += 4.1; });
    pp.y += 2.5;
  };
  pp.subtitulo = (t, x) => { etiqueta(t, x == null ? M : x, pp.y); pp.y += 2.6; };

  // Tabla: encabezado entre dos filetes, filas con cebra suave (sin líneas entre filas) y filete al final.
  // cols: [{ t, w, der, tenue }] (una sin w se lleva el resto). filas: celdas de texto o { v, sub }.
  pp.tabla = (cols, filas, o = {}) => {
    const x0 = o.x == null ? M : o.x, wt = o.w || (W - 2 * M), pad = 2;
    const fijo = cols.reduce((a, c) => a + (c.w || 0), 0), libre = cols.filter(c => !c.w).length || 1;
    const ws = cols.map(c => c.w || (wt - fijo) / libre);
    const xs = []; ws.reduce((a, w, i) => { xs[i] = a; return a + w; }, x0);
    const cabeza = () => {
      linea(x0, pp.y, x0 + wt, pp.y, 0.26);
      cols.forEach((c, i) => { etiqueta(c.t, c.der ? xs[i] + ws[i] - pad : xs[i] + pad, pp.y + 4.4, { der: c.der, color: c.tenue ? TENUE : TINTA }); });
      pp.y += 6.6; linea(x0, pp.y, x0 + wt, pp.y, 0.26);
    };
    cabe(14); cabeza();
    if (!filas.length && o.vacio) { f('n', 8.6, GRIS); T(o.vacio, x0 + pad, pp.y + 4.6); pp.y += 6.8; }
    filas.forEach((fila, r) => {
      f('n', 8.6);
      const celdas = fila.map((c, i) => {
        const v = c && typeof c === 'object' ? c : { v: c };
        const ls = cols[i].der ? [limpio(v.v)] : partir(v.v, ws[i] - 2 * pad);
        const sub = v.sub ? (f('n', 7.9), partir(v.sub, ws[i] - 2 * pad)) : [];
        f('n', 8.6); return { ls, sub, b: v.b };
      });
      const alto = Math.max(...celdas.map(c => c.ls.length * 4.2 + c.sub.length * 3.7)) + 2.8;
      if (pp.y + alto > LIMITE) { linea(x0, pp.y, x0 + wt, pp.y, 0.26); pagina(); cabeza(); }
      if (r % 2 === 1) { doc.setFillColor(...CEBRA); doc.rect(x0, pp.y, wt, alto, 'F'); }
      celdas.forEach((c, i) => {
        const x = cols[i].der ? xs[i] + ws[i] - pad : xs[i] + pad;
        f(c.b ? 'm' : 'n', 8.6, cols[i].tenue ? TENUE : TINTA);
        c.ls.forEach((l, k) => T(l, x, pp.y + 4.5 + k * 4.2, { der: cols[i].der }));
        f('n', 7.9, GRIS); c.sub.forEach((l, k) => T(l, x, pp.y + 4.5 + c.ls.length * 4.2 - 0.4 + k * 3.7, { der: cols[i].der }));
      });
      pp.y += alto;
    });
    linea(x0, pp.y, x0 + wt, pp.y, 0.26);
    pp.y += o.despues == null ? 4 : o.despues;
  };

  // Totales a la derecha y el monto en letras (con la tasa) a la izquierda.
  // filas: [etiqueta, monto, 'fuerte' | 'bs' | ''].
  pp.totales = (filas, letras, nota) => {
    const wT = 71, xT = W - M - wT, wL = W - 2 * M - wT - 8;
    const lsL = letras ? (f('n', 8.3), partir('Son: ' + letras, wL)) : [], lsN = nota ? (f('n', 8.3), partir(nota, wL)) : [];
    const altoT = filas.reduce((a, r) => a + (r[2] === 'fuerte' ? 9 : 5), 0), altoL = lsL.length * 4.2 + (lsN.length ? 4 + lsN.length * 4.2 : 0);
    cabe(Math.max(altoT, altoL) + 2);
    const y0 = pp.y + 1;
    // Izquierda: “Son: …” y la nota de la tasa debajo de un filete fino.
    let yl = y0 + 3.4;
    lsL.forEach((l, i) => {
      if (i === 0) { f('m', 8.3); T('Son:', M, yl); const dx = ancho('Son: '); f('n', 8.3, GRIS); T(l.slice(5), M + dx, yl); }
      else { f('n', 8.3, GRIS); T(l, M, yl); }
      yl += 4.2;
    });
    if (lsN.length) { if (lsL.length) { linea(M, yl - 1.8, M + wL, yl - 1.8, 0.2, FILETE); yl += 2.4; } f('n', 8.3, GRIS); lsN.forEach(l => { T(l, M, yl); yl += 4.2; }); }
    // Derecha.
    let yr = y0 + 3.4;
    filas.forEach(r => {
      if (r[2] === 'fuerte') { yr += 0.6; linea(xT, yr - 2.6, W - M, yr - 2.6, 0.4); yr += 3.4; f('b', 10.5); T(r[0], xT, yr); T(r[1], W - M, yr, { der: true }); yr += 5; return; }
      if (r[2] === 'bs') { f('m', 8.6); } else f('n', 8.6, GRIS);
      T(r[0], xT, yr);
      if (r[2] === 'bs') f('m', 8.6); else f('m', 8.6);
      T(r[1], W - M, yr, { der: true }); yr += 5;
    });
    pp.y = Math.max(yl, yr) + 3;
  };

  // Cuatro cifras grandes entre filetes (Cierre Z y reportes).
  pp.cifras = items => {
    const n = items.length, w = (W - 2 * M) / n, alto = 17;
    cabe(alto + 4);
    linea(M, pp.y, W - M, pp.y, 0.26);
    items.forEach((it, i) => {
      const x = M + i * w + 3.2;
      if (i) linea(M + i * w, pp.y, M + i * w, pp.y + alto, 0.2, FILETE);
      etiqueta(it[0], x, pp.y + 5);
      f('b', 12.8); T(partir(it[1], w - 5)[0], x, pp.y + 10.6);
      f('n', 7.9, GRIS); T(partir(it[2] || '', w - 5)[0] || '', x, pp.y + 14.6);
    });
    pp.y += alto; linea(M, pp.y, W - M, pp.y, 0.26); pp.y += 7;
  };

  // Firmas al pie de la última página (o en una nueva si no caben).
  pp.firmas = (a, b) => {
    const yF = H - 36;
    if (pp.y > yF - 12) pagina();
    const w = (W - 2 * M - 17) / 2;
    [a, b].forEach((x, i) => {
      if (!x) return;
      const x0 = M + i * (w + 17);
      linea(x0, yF, x0 + w, yF, 0.2);
      f('m', 8); T(x[0], x0, yF + 4.6);
      f('n', 8, TENUE); T(x[1] || '', x0, yF + 8.6);
    });
  };

  // Pie en todas las páginas: número del documento, marca y “Página 1 de 2”.
  pp.cerrar = (izq, marca = true) => {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      linea(M, H - 13.5, W - M, H - 13.5, 0.2, FILETE);
      f('n', 7.1, TENUE);
      T(izq, M, H - 9.3);
      if (marca) T('Hecho con Orbe Negocios', W / 2, H - 9.3, { centro: true });
      T('Página ' + i + ' de ' + n, W - M, H - 9.3, { der: true });
    }
    return doc.output('blob');
  };
  return pp;
}

// Compartir un PDF: en el teléfono abre el menú (WhatsApp, Archivos, correo); si no se puede, lo descarga.
export async function compartirArchivo(blob, nombre, texto) {
  const archivo = new File([blob], nombre, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try { await navigator.share(Object.assign({ files: [archivo], title: nombre }, texto ? { text: texto } : {})); return 'compartido'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancelado'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  return 'descargado';
}
