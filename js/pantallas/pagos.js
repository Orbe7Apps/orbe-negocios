// Forma de pago, sencilla o combinada. Se usa en todo lugar donde entra o sale dinero:
// cobrar, abonos, gastos y devoluciones. Ej.: una parte por Pago Móvil y el resto por Binance Pay.
// En Venezuela y Argentina cada parte se puede escribir en la otra moneda (Bs o US$).
import { html, useState } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { Icono, Chips, Interruptor, simbolo } from '../ui.js';
import { tasaMetodo } from '../datos.js';
import { esElectronico, esEuro, TASAS_EXTRA } from '../paises.js';

export const conSimbolo = lista => lista.map(x => ({ v: x, n: html`<span class="simb"><${Icono} n=${simbolo(x)} t=${13} g=${2.2} /></span>${x}` }));
// Lee lo que se escribe: “1.250,50”, “1250,5”, “1,5”, “0.125”. El punto es de miles solo si está en grupos de tres
// y no empieza en cero (“1.250” = 1250; “0.125” = 0,125).
export const numero = t => {
  let s = String(t == null ? '' : t).replace(/\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const v = parseFloat(s); return isFinite(v) ? v : 0;
};
export const esEfectivo = m => /Efectivo/.test(m);

// Formas que normalmente se pagan en la otra moneda: en Venezuela, bolívares; en Argentina, dólares.
const enOtra = (P, m) => P.id === 'VE' ? /Bs|Pago Móvil|Punto de venta/.test(m) : P.usd2 ? /USDT|US\$|Efectivo \$|Zelle|Binance/.test(m) : false;
// Moneda en que se escribe un monto con esa forma de pago: principal ('p'), la otra ('s': Bs o US$) o euros ('e').
export const monedaForma = (S, P, D, m) => D.dual && !!S.negocio.euro && esEuro(m) ? 'e' : D.dual && enOtra(P, m) ? 's' : 'p';
// Nombre de la tasa con que se pasa a Bs esa forma de pago (vacío si es la principal).
const nombreTasa = (S, P, m) => { const k = (S.negocio.tasaPago || {})[m]; if (k === 'euro') return P.id === 'VE' ? 'tasa BCV euro' : 'tasa del euro'; const x = k && (TASAS_EXTRA[P.id] || []).find(t => t.k === k); return x ? 'tasa ' + x.n.toLowerCase() : ''; };
// Montos pasados de Bs a $: con más decimales, para que al volver a Bs den lo mismo que se escribió.
const fino = x => Math.round(x * 1e6) / 1e6;
const enTexto = (x, D, en) => { if (!(x > 0)) return ''; const r = en !== 'p' || D.dec ? Math.round(x * 100) / 100 : Math.round(x); return new Intl.NumberFormat('es-VE', { minimumFractionDigits: Number.isInteger(r) ? 0 : 2, maximumFractionDigits: 2 }).format(r); };

// Monto que se escribe en la moneda de la forma de pago: con Pago Móvil, Punto de venta o Efectivo Bs, en bolívares.
// Al cambiar de forma de pago lo escrito se pasa a la nueva moneda (20 $ → Bs 4.700). El botón $/Bs cambia la moneda a mano.
// Se usa junto con usePagos: usePagos(mo.total, metodos, inicial, ajuste, mo) y mo.campo(fp.m, { titulo }).
// enInicial: moneda de lo que viene escrito; con mInicial (la forma elegida al abrir) se pasa a la moneda de esa forma.
export function useMonto(inicial = '', enInicial, mInicial) {
  const { S, P, D } = useApp();
  const auto = mm => monedaForma(S, P, D, mm);
  const [st, setSt] = useState(() => {
    if (mInicial === undefined || !enInicial) return { txt: inicial, en: enInicial || null };
    const e1 = auto(mInicial), x = numero(inicial);
    if (e1 === enInicial || !(x > 0)) return { txt: inicial, en: null };
    const v = enInicial === 's' ? D.deOtra(x, tasaMetodo(mInicial)) : enInicial === 'e' ? D.deEur(x) : x;
    return { txt: enTexto(e1 === 's' ? D.aOtra(v, tasaMetodo(mInicial)) : e1 === 'e' ? D.aEur(v) : v, D, e1), en: null };
  });
  const enDe = mm => st.en || auto(mm);
  const aPrin = (x, en, mm) => en === 's' ? D.deOtra(x, tasaMetodo(mm)) : en === 'e' ? D.deEur(x) : x;
  const deMain = (v, en, mm) => en === 's' ? D.aOtra(v, tasaMetodo(mm)) : en === 'e' ? D.aEur(v) : v;
  // Lo escrito, en la moneda principal (dólares en Venezuela).
  const total = mm => { const en = enDe(mm), v = aPrin(numero(st.txt), en, mm); return en === 'p' ? v : fino(v); };
  // Lo escrito en Bs (o la otra moneda), para guardarlo tal cual: { otra, tasa }.
  const original = mm => { const en = enDe(mm), x = numero(st.txt); return en === 's' && x > 0 ? { otra: x, tasa: tasaMetodo(mm) } : null; };
  // Se recuerda el valor exacto de la última conversión: Bs 1.000 → $ 1,14 → Bs 1.000 (no 998,28).
  const seguir = (de, a) => setSt(s => {
    const e0 = s.en || auto(de), e1 = auto(a), x = numero(s.txt);
    if (e0 === e1 || !(x > 0)) return s.en ? { txt: s.txt, en: null, base: s.base } : s;
    const v = s.base && s.base.txt === s.txt ? s.base.v : aPrin(x, e0, de), txt = enTexto(deMain(v, e1, a), D, e1);
    return { txt, en: null, base: { txt, v } };
  });
  // Poner un monto que viene en la moneda principal (p. ej. “Todo” o “La cuota 2”).
  const poner = (v, mm) => setSt(s => ({ txt: enTexto(deMain(v, s.en || auto(mm), mm), D, s.en || auto(mm)), en: s.en }));
  const monedas = ['p'].concat(D.dual ? ['s'] : [], D.dual && S.negocio.euro ? ['e'] : []);
  const simb = en => en === 's' ? (P.id === 'VE' ? 'Bs' : 'US$') : en === 'e' ? '€' : P.s;
  const f2 = x => new Intl.NumberFormat(P.loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x);
  // Se llama como función (no como componente) para que el campo no pierda lo escrito al redibujar.
  function campo(mm, { titulo = 'Monto', grande = true, placeholder = '0', clase = '' } = {}) {
    const en = enDe(mm), x = numero(st.txt), v = aPrin(x, en, mm);
    const tasaN = en === 'e' ? 'tasa euro' : nombreTasa(S, P, mm) || (P.id === 'VE' ? 'tasa BCV' : 'tasa');
    const eq = !(x > 0) || !D.dual ? '' : en !== 'p' ? '= ' + D.m(v) + ' · ' + tasaN + ' ' + f2(en === 'e' ? D.tasaEur : tasaMetodo(mm))
      : auto(mm) === 's' ? '= ' + simb('s') + ' ' + f2(D.aOtra(v, tasaMetodo(mm))) : '';
    return html`<div class=${'campo ' + clase}><span>${titulo}</span>
      <div class=${'pago-monto monto-forma' + (grande ? ' grande' : '')}>
        ${monedas.length > 1 && html`<button type="button" class="pago-moneda toca" aria-label=${'Moneda: ' + simb(en) + '. Tocar para cambiar'} title="Cambiar moneda" onClick=${() => setSt(s => ({ txt: s.txt, en: monedas[(monedas.indexOf(s.en || auto(mm)) + 1) % monedas.length] }))}>${simb(en)}</button>`}
        <input class="num" type="text" inputmode="decimal" autocomplete="off" placeholder=${placeholder} value=${st.txt} aria-label=${titulo + ' en ' + simb(en)} onInput=${e => { const t = e.target.value; setSt(s => ({ txt: t, en: s.en })); }} />
      </div>
      ${eq && html`<span class="sub num faint">${eq}</span>`}
    </div>`;
  }
  return { txt: st.txt, total, original, seguir, poner, campo, en: enDe };
}

// ajuste(m): recargo que se suma al pagar con esa forma (p. ej. IGTF 3 % en divisas), solo para mostrar el monto final.
// total puede ser un número o una función de la forma de pago elegida (con useMonto: mo.total).
export function usePagos(totalDe, metodos, inicial, ajuste, mo) {
  const { S, P, D } = useApp();
  const [m, setMRaw] = useState(inicial && metodos.includes(inicial) ? inicial : metodos[0]);
  const setM = x => { if (mo && x !== m) mo.seguir(m, x); setMRaw(x); };
  const total = typeof totalDe === 'function' ? totalDe(m) : totalDe;
  const [ref, setRef] = useState('');
  // Pedir el número de referencia de los pagos electrónicos (para conciliar con el banco).
  const pideRef = mm => !!S.negocio.pedirRef && esElectronico(mm);
  const otra = x => (P.id === 'VE' ? 'Bs ' : 'US$ ') + new Intl.NumberFormat(P.loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x);
  const nombreTasaDe = mm => nombreTasa(S, P, mm);
  const [varias, setVariasRaw] = useState(false);
  const [filas, setFilas] = useState([]);
  const tol = D.dec ? 0.01 : 1;
  const simb2 = P.id === 'VE' ? 'Bs' : 'US$';
  // Moneda en que se escribe cada parte: principal ('p'), la otra ('s': Bs o US$) o euros ('e').
  const conEuro = D.dual && !!S.negocio.euro;
  const monedaDe = mm => monedaForma(S, P, D, mm);
  const monedas = ['p'].concat(D.dual ? ['s'] : [], conEuro ? ['e'] : []);
  const simMoneda = en => en === 's' ? simb2 : en === 'e' ? '€' : P.s;
  const fila = mm => ({ m: mm, txt: '', en: monedaDe(mm) });
  // Pasa lo escrito en la otra moneda a la principal (y al revés para mostrar).
  // Cada forma de pago se convierte con su propia tasa (oficial, paralela, USDT o la del negocio).
  const aPrincipal = (f, x) => f.en === 's' ? D.deOtra(x, tasaMetodo(f.m)) : f.en === 'e' ? D.deEur(x) : x;
  const aOtra = (x, mm) => D.aOtra(x, tasaMetodo(mm));
  const valor = f => aPrincipal(f, numero(f.txt));
  const suma = filas.reduce((a, f) => a + valor(f), 0);
  const falta = varias ? D.redondo(total - suma) : 0;
  const hayEfectivo = filas.some(f => esEfectivo(f.m) && numero(f.txt) > 0);
  const vuelto = varias && falta < -tol && hayEfectivo ? -falta : 0;
  const ok = !varias || Math.abs(falta) <= tol || vuelto > 0;

  // Lo que se guarda: cada parte en la moneda principal; el redondeo y el vuelto se ajustan en la última parte que corresponda.
  function pagos() {
    if (!varias) return [Object.assign({ m, v: total }, pideRef(m) && ref.trim() ? { ref: ref.trim() } : {})];
    const out = filas.map(f => Object.assign({ m: f.m, v: f.en !== 'p' ? fino(valor(f)) : D.redondo(valor(f)) }, pideRef(f.m) && (f.ref || '').trim() ? { ref: f.ref.trim() } : {})).filter(p => p.v > 0);
    const junt = []; out.forEach(p => { const x = junt.find(y => y.m === p.m && !y.ref && !p.ref); if (x) x.v = fino(x.v + p.v); else junt.push(p); });
    let resto = D.redondo(total - junt.reduce((a, p) => a + p.v, 0));
    if (resto && junt.length) {
      const k = resto < 0 && vuelto ? junt.map(p => esEfectivo(p.m)).lastIndexOf(true) : junt.length - 1;
      junt[k].v = D.redondo(junt[k].v + resto);
    }
    return junt.filter(p => p.v > 0);
  }

  const setVarias = v => {
    setVariasRaw(v);
    if (v && !filas.length) setFilas([Object.assign(fila(m), { txt: '' }), fila(metodos.find(x => x !== m) || m)]);
  };
  const pon = (k, o) => setFilas(fs => fs.map((f, i) => i === k ? Object.assign({}, f, o) : f));
  const llenar = k => {
    const f = filas[k], ya = filas.reduce((a, x, i) => a + (i === k ? 0 : valor(x)), 0), r = Math.max(0, total - ya);
    const x = f.en === 's' ? aOtra(r, f.m) : f.en === 'e' ? D.aEur(r) : r;
    pon(k, { txt: (f.en !== 'p' || D.dec ? x.toFixed(2) : String(Math.round(x))).replace('.', ',') });
  };

  // calido: para marcar “Fiado” en ámbar.
  // Se llama como función (no como componente) para que los campos no pierdan lo escrito al redibujar.
  function vista({ titulo = 'Forma de pago', desliza, calido, ayuda, sinInterruptor, equivalente = !mo } = {}) {
    const pagado = Math.min(total, suma);
    return html`<div class="pila" style="gap:12px">
      ${!varias && html`<div class="campo"><span>${titulo}</span><${Chips} opciones=${conSimbolo(metodos)} valor=${m} onCambio=${setM} desliza=${desliza} calido=${calido} /></div>`}
      ${!varias && equivalente && conEuro && esEuro(m) && total > 0 && html`<span class="sub num entra">Con ${m}: € ${new Intl.NumberFormat(P.loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(D.aEur(total * (ajuste ? ajuste(m) : 1)))} · tasa euro</span>`}
      ${!varias && equivalente && D.dual && total > 0 && nombreTasaDe(m) && html`<span class="sub num entra">Con ${m}: ${otra(aOtra(total * (ajuste ? ajuste(m) : 1), m))} · ${nombreTasaDe(m)}</span>`}
      ${!varias && pideRef(m) && html`<label class="campo entra"><span>Referencia (opcional)</span><input class="num" type="text" inputmode="numeric" autocomplete="off" maxlength="20" placeholder="Últimos números" value=${ref} onInput=${e => setRef(e.target.value.replace(/[^\dA-Za-z]/g, ''))} /></label>`}
      ${metodos.length > 1 && !sinInterruptor && html`<${Interruptor} on=${varias} onCambio=${setVarias} titulo="Pagar con dos formas" sub=${ayuda || 'Ej.: mitad ' + metodos[0] + ', mitad ' + (metodos[1] || metodos[0])} />`}
      ${varias && html`<div class="pagos-mix entra">
        ${filas.map((f, k) => { const v = valor(f); return html`<div class="pago-fila entra" key=${k} style=${{ '--i': k }}>
          <div class="pago-linea">
            <label class="pago-forma"><span class="simb"><${Icono} n=${simbolo(f.m)} t=${14} g=${2.2} /></span>
              <select value=${f.m} aria-label=${'Forma de pago ' + (k + 1)} onChange=${e => pon(k, { m: e.target.value, en: !f.txt ? monedaDe(e.target.value) : f.en })}>${metodos.map(x => html`<option value=${x}>${x}</option>`)}</select></label>
            <div class="pago-monto">
              ${D.dual && html`<button type="button" class="pago-moneda toca" aria-label=${'Moneda: ' + simMoneda(f.en) + '. Tocar para cambiar'} title="Cambiar moneda" onClick=${() => pon(k, { en: monedas[(monedas.indexOf(f.en) + 1) % monedas.length], txt: '' })}>${simMoneda(f.en)}</button>`}
              <input class="num" type="text" inputmode="decimal" autocomplete="off" placeholder="0" value=${f.txt} aria-label=${'Monto con ' + f.m} onInput=${e => pon(k, { txt: e.target.value })} />
            </div>
            ${filas.length > 2 ? html`<button type="button" class="icono-btn chico toca" aria-label="Quitar esta parte" onClick=${() => setFilas(filas.filter((_, i) => i !== k))}><${Icono} n="cerrar" t=${14} g=${2.4} /></button>` : null}
          </div>
          <div class="fila sub" style="gap:8px;min-height:22px;padding:0 4px">
            <span class="crece num faint">${v > 0 ? (f.en !== 'p' ? '= ' + D.m(v) : D.dual ? '= ' + otra(aOtra(v, f.m)) : '') + (f.en === 'e' ? ' · tasa euro' : nombreTasaDe(f.m) ? ' · ' + nombreTasaDe(f.m) : '') : ''}</span>
            ${falta > tol && !(numero(f.txt) > 0) ? html`<button type="button" class="pago-resto toca" onClick=${() => llenar(k)}>Poner lo que falta</button>` : null}
          </div>
          ${pideRef(f.m) && html`<input class="pago-ref num" type="text" inputmode="numeric" autocomplete="off" maxlength="20" placeholder="Referencia (opcional)" value=${f.ref || ''} aria-label=${'Referencia de ' + f.m} onInput=${e => pon(k, { ref: e.target.value.replace(/[^\dA-Za-z]/g, '') })} />`}
        </div>`; })}
        ${filas.length < 5 && html`<button type="button" class="btn2 chico toca" style="align-self:flex-start" onClick=${() => setFilas(filas.concat([fila(metodos.find(x => !filas.some(f => f.m === x)) || metodos[0])]))}>+ Otra forma de pago</button>`}
        <div class="pago-cuenta">
          <span class="barra-prog" style="height:8px"><i style=${{ width: Math.round(pagado / (total || 1) * 100) + '%', background: ok ? 'var(--in)' : 'var(--accent)' }}></i></span>
          <span class="fila num" style="justify-content:space-between;font-size:13px">
            <span class="muted">Pagado ${D.m(suma)} de ${D.m(total)}</span>
            <b style=${{ color: vuelto ? 'var(--in)' : ok ? 'var(--in)' : falta > 0 ? 'var(--amber)' : 'var(--out)' }}>${vuelto ? 'Vuelto ' + D.m(vuelto) : ok ? 'Cuadra' : falta > 0 ? 'Falta ' + D.m(falta) : 'Sobra ' + D.m(-falta)}</b>
          </span>
        </div>
      </div>`}
    </div>`;
  }

  // Armar las partes desde fuera (cuotas: “inicial hoy” + lo que va en cuotas). Montos en la moneda principal.
  const preparar = lista => { if (!lista || !lista.length) { setVariasRaw(false); return; } setVariasRaw(true); setFilas(lista.map(([mm, v]) => Object.assign(fila(mm), { en: 'p', txt: v > 0 ? String(v).replace('.', ',') : '' }))); };
  return { m, setM, total, varias, setVarias, ok, falta, vuelto, pagos, vista, preparar, efectivo: !varias && esEfectivo(m) };
}
