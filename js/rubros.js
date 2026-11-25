// Rubros: el tipo exacto de negocio (barbería, ferretería, electrodomésticos…).
// Cada rubro arma la app a su medida: qué funciones vienen encendidas, sus servicios y productos de ejemplo
// y sus grupos. Lo que no viene encendido queda en Ajustes → Funciones, listo para activarlo con un toque.
import { tipo } from './paises.js';

// Funciones que se pueden encender o apagar. g: grupo en Ajustes.
export const MODULOS = [
  { k: 'inventario', g: 'Productos', i: 'caja', n: 'Inventario y existencias', d: 'Cuántas unidades tienes de cada producto, aviso de lo que falta y reponer.' },
  { k: 'servicios', g: 'Productos', i: 'llave', n: 'Servicios y mano de obra', d: 'Servicios con su precio y duración, o mano de obra, instalación y envío junto con los productos.' },
  { k: 'medidas', g: 'Productos', i: 'regla', n: 'Venta por peso o medida', d: 'Kilo, gramo, litro, metro y metro cuadrado. Lee las etiquetas de la balanza.' },
  { k: 'variantes', g: 'Productos', i: 'capas', n: 'Tallas, colores y variantes', d: 'Un mismo producto en varias tallas, colores o sabores, cada uno con su existencia.' },
  { k: 'garantia', g: 'Productos', i: 'escudo', n: 'Garantía y número de serie', d: 'Meses de garantía por producto. El serial y la fecha de vencimiento salen en el recibo.' },
  { k: 'escaner', g: 'Productos', i: 'escanear', n: 'Escáner con la cámara', d: 'Lee códigos de barras y nombres con la cámara del teléfono para vender o contar.' },
  { k: 'compras', g: 'Productos', i: 'doc', n: 'Factura del proveedor con una foto', d: 'Toma una foto de la factura y Orbe suma lo que llegó al inventario.' },
  { k: 'precios', g: 'Productos', i: 'sube', n: 'Cuidar precios', d: 'Te avisa cuando un precio queda por debajo de lo que cuesta reponerlo.' },
  { k: 'agenda', g: 'Clientes y atención', i: 'calendario', n: 'Agenda de citas', d: 'Citas por día y por profesional, recordatorio por WhatsApp y cobro al terminar.' },
  { k: 'comisiones', g: 'Clientes y atención', i: 'personas', n: 'Quién atendió y comisiones', d: 'Cada venta guarda quién atendió y el reporte calcula la comisión de cada uno.' },
  { k: 'cotizaciones', g: 'Clientes y atención', i: 'doc', n: 'Cotizaciones y presupuestos', d: 'Arma una lista con precios, mándala en PDF por WhatsApp y conviértela en venta cuando el cliente acepte.' },
  { k: 'ordenes', g: 'Clientes y atención', i: 'orden', n: 'Órdenes de trabajo y pedidos', d: 'Recibe equipos o encargos con anticipo, sigue cada uno y mándalo en PDF por WhatsApp.' },
  { k: 'cuotas', g: 'Clientes y atención', i: 'calendario', n: 'Cuotas y apartados', d: 'Vende en cuotas con fechas y recordatorios, o aparta un producto con un abono hasta que lo termine de pagar.' },
  { k: 'fiado', g: 'Clientes y atención', i: 'tarjeta', n: 'Fiado y cuentas por cobrar', d: 'Vende a crédito y lleva lo que te debe cada cliente, con sus abonos.' },
  { k: 'promos', g: 'Ventas y caja', i: 'porciento', n: 'Promociones', d: '2x1, descuentos por porcentaje y precios especiales por cantidad.' },
  { k: 'caja', g: 'Ventas y caja', i: 'billete', n: 'Caja con fondo y turnos', d: 'Abre la caja con un fondo, anota retiros y cierra cada turno contando el dinero.' }
];
const TODOS = ['inventario', 'servicios', 'medidas', 'variantes', 'escaner', 'compras', 'precios', 'promos', 'fiado', 'ordenes', 'caja'];
// Negocios creados antes de los rubros: todo lo que ya tenían sigue encendido.
const BASE = {
  tienda: TODOS, comida: TODOS, online: TODOS,
  citas: ['servicios', 'promos', 'fiado', 'ordenes', 'caja'],
  indep: ['servicios', 'promos', 'fiado', 'ordenes', 'caja']
};

// Catálogo de ejemplo: [abreviatura, nombre, precio, costo, existencia (-1: servicio), mínimo, minutos, popularidad, extra]
// extra: { u: unidad, gar: meses de garantía, vars: [nombres] }
export const RUBROS = [
  { id: 'bodega', t: 'tienda', n: 'Bodega o minimarket', i: 'tienda', c: 'vio', ex: 'Abasto, víveres, kiosco, licorería',
    kw: ['bodega', 'abasto', 'minimarket', 'mini market', 'supermerc', 'viveres', 'kiosco', 'kiosko', 'licor', 'charcuter', 'frutería', 'fruteria'],
    mods: ['inventario', 'medidas', 'escaner', 'compras', 'precios', 'promos', 'fiado', 'ordenes', 'caja'], cat: 'tienda', nombre: 'Bodega La Esquina' },
  { id: 'ferreteria', t: 'tienda', n: 'Ferretería', i: 'llave', c: 'amb', ex: 'Materiales, herramientas, electricidad, pinturas',
    kw: ['ferreter', 'construcc', 'material', 'herramient', 'tornill', 'pintura', 'electricidad', 'plomer', 'cemento', 'cerami'],
    mods: ['cotizaciones', 'inventario', 'servicios', 'medidas', 'variantes', 'escaner', 'compras', 'precios', 'fiado', 'ordenes', 'caja'], nombre: 'Ferretería El Tornillo', ventas: 18,
    cat: [['TO', 'Tornillos 1/4" x 100', 4.5, 2.6, 30, 10, 0, 7], ['CE', 'Cemento gris 42,5 kg', 9.8, 7.6, 25, 10, 0, 8], ['CA', 'Cable 12 AWG', 0.65, 0.38, 180, 50, 0, 6, { u: 'm' }],
      ['TU', 'Tubo PVC 1/2"', 3.2, 2.1, 40, 12, 0, 5], ['PI', 'Pintura de caucho (galón)', 22, 15, 12, 4, 0, 4, { vars: ['Blanco', 'Gris', 'Beige'] }], ['MA', 'Martillo 16 oz', 8.5, 5.2, 9, 3, 0, 3],
      ['CL', 'Clavos 2"', 2.4, 1.5, 35, 8, 0, 6, { u: 'kg' }], ['CR', 'Cerámica 60x60', 12.5, 8.4, 120, 30, 0, 4, { u: 'm²' }], ['LL', 'Copia de llave', 1.5, 0.3, -1, 0, 10, 5], ['MZ', 'Mezcla de pintura', 2, 0, -1, 0, 15, 2]],
    grupos: [['Construcción', ['CE', 'CR', 'TU']], ['Electricidad', ['CA']], ['Herramientas', ['MA']], ['Tornillería', ['TO', 'CL']], ['Pinturas', ['PI', 'MZ']], ['Servicios', ['LL']]] },
  { id: 'electro', t: 'tienda', n: 'Electrodomésticos', i: 'tele', c: 'azu', ex: 'Línea blanca, TV, aires, celulares',
    kw: ['electrodom', 'linea blanca', 'nevera', 'lavadora', 'televis', 'tv', 'electronic', 'celular', 'telefono', 'aire acond', 'computad', 'laptop'],
    mods: ['cotizaciones', 'inventario', 'servicios', 'variantes', 'garantia', 'escaner', 'compras', 'precios', 'promos', 'fiado', 'cuotas', 'ordenes', 'caja'], nombre: 'Electro Hogar', ventas: 6,
    cat: [['NV', 'Nevera 14 pies', 520, 410, 4, 2, 0, 3, { gar: 12 }], ['LV', 'Lavadora 12 kg', 380, 295, 5, 2, 0, 4, { gar: 12 }], ['TV', 'TV 50" 4K', 420, 330, 6, 2, 0, 5, { gar: 12 }],
      ['AA', 'Aire acondicionado 12.000 BTU', 350, 270, 3, 2, 0, 4, { gar: 12 }], ['MI', 'Microondas', 95, 68, 10, 3, 0, 6, { gar: 6 }], ['LI', 'Licuadora', 38, 25, 14, 4, 0, 7, { gar: 6, vars: ['Negra', 'Roja'] }],
      ['CF', 'Cafetera', 29, 19, 9, 3, 0, 5, { gar: 6 }], ['IN', 'Instalación de aire', 45, 10, -1, 0, 120, 3], ['EN', 'Entrega a domicilio', 8, 3, -1, 0, 0, 6]],
    grupos: [['Línea blanca', ['NV', 'LV']], ['Climatización', ['AA']], ['TV y audio', ['TV']], ['Pequeños', ['MI', 'LI', 'CF']], ['Servicios', ['IN', 'EN']]] },
  { id: 'ropa', t: 'tienda', n: 'Ropa y calzado', i: 'camisa', c: 'ros', ex: 'Boutique, zapatería, accesorios',
    kw: ['ropa', 'calzado', 'zapat', 'boutique', 'moda', 'vestido', 'lenceria', 'accesorio', 'bisuter'],
    mods: ['inventario', 'variantes', 'escaner', 'precios', 'promos', 'caja'], nombre: 'Boutique Alma', ventas: 10,
    cat: [['CM', 'Camisa manga larga', 22, 11, 0, 6, 0, 6, { vars: ['S', 'M', 'L', 'XL'] }], ['JE', 'Jean clásico', 30, 15, 0, 6, 0, 7, { vars: ['28', '30', '32', '34'] }], ['VE', 'Vestido casual', 35, 16, 0, 4, 0, 4, { vars: ['S', 'M', 'L'] }],
      ['ZA', 'Zapatos deportivos', 45, 24, 0, 4, 0, 5, { vars: ['38', '39', '40', '41', '42'] }], ['FR', 'Franela básica', 9, 4, 0, 10, 0, 9, { vars: ['S', 'M', 'L'] }], ['CI', 'Cinturón de cuero', 15, 6, 18, 5, 0, 3], ['BO', 'Bolso', 28, 12, 8, 3, 0, 2]],
    grupos: [['Damas', ['VE', 'BO']], ['Caballeros', ['CM', 'CI']], ['Unisex', ['JE', 'FR']], ['Calzado', ['ZA']]] },
  { id: 'farmacia', t: 'tienda', n: 'Farmacia', i: 'pastilla', c: 'ver', ex: 'Medicinas, cuidado personal, bebés',
    kw: ['farmac', 'droguer', 'botica', 'medicin'],
    mods: ['inventario', 'servicios', 'escaner', 'compras', 'precios', 'promos', 'caja'], nombre: 'Farmacia Salud', ventas: 30,
    cat: [['AC', 'Acetaminofén 500 mg', 2.2, 1.4, 60, 20, 0, 9], ['IB', 'Ibuprofeno 400 mg', 3.1, 2, 45, 15, 0, 7], ['AL', 'Alcohol 500 ml', 2.5, 1.6, 24, 8, 0, 5], ['VC', 'Vitamina C x 30', 6.5, 4.2, 18, 6, 0, 4],
      ['PA', 'Pañales talla M x 30', 14, 10.5, 12, 5, 0, 5], ['SU', 'Suero oral', 1.8, 1.1, 30, 10, 0, 6], ['TA', 'Toma de tensión', 1, 0, -1, 0, 5, 3]],
    grupos: [['Medicinas', ['AC', 'IB', 'SU']], ['Cuidado personal', ['AL', 'VC']], ['Bebés', ['PA']], ['Servicios', ['TA']]] },
  { id: 'restaurante', t: 'comida', n: 'Restaurante o comida rápida', i: 'comida', c: 'amb', ex: 'Hamburguesas, pizzas, arepas, food truck',
    kw: ['restaur', 'comida', 'hamburgues', 'pizz', 'perro', 'arepa', 'food', 'sushi', 'pollo', 'empanad', 'parrilla', 'lunch', 'menu'],
    mods: ['inventario', 'servicios', 'promos', 'ordenes', 'caja'], cat: 'comida', nombre: 'Sabor Express' },
  { id: 'panaderia', t: 'comida', n: 'Panadería o cafetería', i: 'taza', c: 'amb', ex: 'Pan, tortas por encargo, café',
    kw: ['panader', 'pasteler', 'reposter', 'cafe', 'cafeter', 'torta', 'dulce', 'postre', 'heladeri'],
    mods: ['inventario', 'servicios', 'medidas', 'promos', 'ordenes', 'caja'], nombre: 'Panadería La Espiga', ventas: 40,
    cat: [['PC', 'Pan canilla', 0.8, 0.35, 60, 20, 0, 9], ['PD', 'Pan dulce', 1, 0.45, 40, 15, 0, 6], ['CJ', 'Cachito de jamón', 1.5, 0.7, 30, 10, 0, 7], ['TP', 'Torta (porción)', 2.5, 1, 16, 6, 0, 4],
      ['QS', 'Queso blanco', 5.5, 4.1, 8, 3, 0, 5, { u: 'kg' }], ['CL', 'Café con leche', 1.2, 0.4, -1, 0, 0, 8], ['TE', 'Torta entera por encargo', 30, 13, -1, 0, 0, 1]],
    grupos: [['Panes', ['PC', 'PD', 'CJ']], ['Dulces', ['TP', 'TE']], ['Charcutería', ['QS']], ['Bebidas', ['CL']]] },
  { id: 'barberia', t: 'citas', n: 'Barbería', i: 'tijeras', c: 'azu', ex: 'Cortes, barba, cejas',
    kw: ['barber', 'barba', 'corte de cabello', 'cortes'],
    mods: ['servicios', 'agenda', 'comisiones', 'promos', 'caja'], nombre: 'Barbería El Estilo', ventas: 14,
    cat: [['CC', 'Corte clásico', 8, 0.5, -1, 0, 30, 9], ['CD', 'Corte degradado', 10, 0.5, -1, 0, 40, 8], ['BA', 'Arreglo de barba', 5, 0.5, -1, 0, 20, 6], ['CB', 'Corte + barba', 13, 1, -1, 0, 50, 7],
      ['CE', 'Cejas', 3, 0.2, -1, 0, 10, 3], ['NI', 'Corte niño', 6, 0.5, -1, 0, 25, 4], ['PO', 'Pomada para cabello', 9, 4.5, 14, 4, 0, 3], ['CR', 'Cera modeladora', 7, 3.2, 10, 4, 0, 2]],
    grupos: [['Cortes', ['CC', 'CD', 'NI', 'CB']], ['Barba y cejas', ['BA', 'CE']], ['Productos', ['PO', 'CR']]] },
  { id: 'salon', t: 'citas', n: 'Salón de belleza', i: 'brillo', c: 'ros', ex: 'Peluquería, uñas, spa, estética',
    kw: ['salon', 'belleza', 'peluquer', 'unas', 'manicur', 'spa', 'estetica', 'pestan', 'maquill', 'cosmet', 'nail'],
    mods: ['servicios', 'agenda', 'comisiones', 'promos', 'caja'], nombre: 'Estudio Bella', ventas: 10,
    cat: [['CP', 'Corte y peinado', 15, 1, -1, 0, 45, 7], ['TI', 'Tinte completo', 35, 9, -1, 0, 120, 4], ['MB', 'Mechas o balayage', 60, 15, -1, 0, 180, 2], ['AK', 'Alisado con keratina', 70, 18, -1, 0, 150, 2],
      ['MA', 'Manicure', 10, 1.5, -1, 0, 40, 8], ['PE', 'Pedicure', 14, 2, -1, 0, 50, 5], ['UA', 'Uñas acrílicas', 25, 5, -1, 0, 90, 5], ['CJ', 'Cejas y pestañas', 8, 1, -1, 0, 30, 4], ['SH', 'Shampoo profesional', 12, 6.5, 10, 3, 0, 2]],
    grupos: [['Cabello', ['CP', 'TI', 'MB', 'AK']], ['Uñas', ['MA', 'PE', 'UA']], ['Rostro', ['CJ']], ['Productos', ['SH']]] },
  { id: 'taller', t: 'citas', n: 'Taller o servicio técnico', i: 'auto', c: 'vio', ex: 'Mecánica, motos, celulares, computadoras',
    kw: ['taller', 'repuesto', 'autoparte', 'mecanic', 'moto', 'carro', 'vehicul', 'reparac', 'servicio tecnico', 'tecnico', 'latoner', 'cauchera', 'lubricentro'],
    mods: ['cotizaciones', 'inventario', 'servicios', 'medidas', 'garantia', 'compras', 'precios', 'comisiones', 'fiado', 'ordenes', 'caja'], nombre: 'Taller El Pistón', ventas: 7,
    cat: [['CA', 'Cambio de aceite (mano de obra)', 10, 0, -1, 0, 40, 8], ['AF', 'Aceite 15W40', 6, 4, 40, 12, 0, 8, { u: 'l' }], ['FI', 'Filtro de aceite', 7, 4.5, 15, 5, 0, 7], ['PF', 'Pastillas de freno', 28, 18, 8, 4, 0, 4],
      ['AB', 'Alineación y balanceo', 20, 2, -1, 0, 60, 5], ['DI', 'Diagnóstico con escáner', 15, 0, -1, 0, 30, 4], ['BT', 'Batería 12 V', 95, 72, 4, 2, 0, 2, { gar: 12 }]],
    grupos: [['Mano de obra', ['CA', 'AB', 'DI']], ['Lubricantes', ['AF', 'FI']], ['Repuestos', ['PF', 'BT']]] },
  { id: 'online', t: 'online', n: 'Venta en línea', i: 'online', c: 'ros', ex: 'Instagram, WhatsApp o TikTok, con envíos',
    kw: ['online', 'en linea', 'instagram', 'tiktok', 'whatsapp', 'envio', 'tienda virtual', 'emprendimiento', 'catalogo'],
    mods: ['inventario', 'servicios', 'variantes', 'promos', 'ordenes'], cat: 'online', nombre: 'Estampa Store' },
  { id: 'indep', t: 'indep', n: 'Independiente', i: 'indep', c: 'azu', ex: 'Diseño, fotos, clases, consultoría',
    kw: ['disen', 'fotograf', 'clase', 'profesor', 'consult', 'asesor', 'freelance', 'abogad', 'contador', 'psicolog', 'entrenador', 'nutricion'],
    mods: ['cotizaciones', 'servicios', 'agenda', 'fiado', 'ordenes'], cat: 'indep', nombre: 'Ana Ruiz Estudio' }
];
export const rubro = id => RUBROS.find(r => r.id === id) || null;

// Busca el rubro por lo que la persona escribe (“tengo una barbería”, “vendo neveras”…).
const plano = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function adivinarRubro(texto) {
  const t = plano(texto).trim(); if (t.length < 3) return [];
  const palabras = t.split(/[^a-z0-9ñ]+/).filter(w => w.length >= 4);
  return RUBROS.map(r => {
    let p = plano(r.n).includes(t) ? 6 : 0;
    r.kw.forEach(k => {
      if (t.includes(k)) p += k.length;
      // Palabras a medio escribir o con otra terminación: “barb”, “bodeguita”, “peluquería”.
      else if (palabras.some(w => k.startsWith(w) || (k.length >= 5 && w.startsWith(k.slice(0, 5))))) p += Math.min(k.length, 5) * 0.8;
    });
    return { r, p };
  }).filter(x => x.p > 0).sort((a, b) => b.p - a.p).map(x => x.r);
}

// Funciones encendidas de un negocio: las del rubro (o las de antes) más lo que la persona cambió.
export function modulosDe(neg) {
  const r = rubro(neg && neg.rubro), base = r ? r.mods : (BASE[(neg && neg.tipo) || 'tienda'] || TODOS);
  const m = {}; MODULOS.forEach(x => { m[x.k] = base.includes(x.k); });
  return Object.assign(m, (neg && neg.mods) || {});
}
// El tipo con el que trabaja la app (T): el tipo base más el rubro y sus funciones.
export function tipoNegocio(neg) {
  const b = tipo(neg && neg.tipo), r = rubro(neg && neg.rubro), mods = modulosDe(neg);
  return Object.assign({}, b, { base: b.n, rubro: r ? r.id : '', n: r ? r.n : b.n, icono: r ? r.i : b.id, mods, mod: k => !!mods[k], inv: !!mods.inventario });
}
