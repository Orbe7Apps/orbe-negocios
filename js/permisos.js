// Perfiles y permisos dentro de cada negocio. El dueño siempre puede todo.
// Solo quien tiene el permiso “equipo” (las cuentas principales) crea perfiles y cambia permisos.

export const PERMISOS = [
  { k: 'vender', n: 'Vender y cobrar', g: 'Ventas', i: 'carrito' },
  { k: 'anular', n: 'Anular ventas y hacer devoluciones', g: 'Ventas', i: 'deshacer', delicado: 'puede anular ventas ya cobradas y hacer devoluciones' },
  { k: 'fiado', n: 'Fiar o vender a crédito', g: 'Ventas', i: 'reloj' },
  { k: 'descuentos', n: 'Dar descuentos y cambiar precios al vender', g: 'Ventas', i: 'porciento', delicado: 'puede bajar precios y dar descuentos al vender' },
  { k: 'ordenes', n: 'Órdenes de trabajo y pedidos', g: 'Ventas', i: 'lista' },
  { k: 'clientes', n: 'Agregar clientes y anotar abonos', g: 'Clientes', i: 'personas' },
  { k: 'ganancias', n: 'Ver ganancias, costos y reportes', g: 'Dinero', i: 'grafico', delicado: 've cuánto ganas, tus costos y todos los reportes' },
  { k: 'gastos', n: 'Anotar gastos y pagar cuentas', g: 'Dinero', i: 'dinero' },
  { k: 'cierre', n: 'Hacer el cierre del día', g: 'Dinero', i: 'candado' },
  { k: 'tasas', n: 'Cambiar las tasas del dólar y del euro', g: 'Dinero', i: 'sube' },
  { k: 'productos', n: 'Agregar productos y cambiar precios', g: 'Inventario', i: 'etiqueta' },
  { k: 'reponer', n: 'Reponer inventario', g: 'Inventario', i: 'caja' },
  { k: 'ajustes', n: 'Cambiar los ajustes del negocio', g: 'Administración', i: 'ajustes', delicado: 'puede cambiar formas de pago, impuestos y los datos del negocio' },
  { k: 'equipo', n: 'Crear perfiles y dar permisos', g: 'Administración', i: 'escudo', principal: true, delicado: 'puede crear perfiles y dar permisos (incluso a sí mismo)' }
];

const todo = v => PERMISOS.reduce((o, p) => (o[p.k] = v, o), {});
const con = ks => PERMISOS.reduce((o, p) => (o[p.k] = ks.includes(p.k), o), {});
export const ROLES_BASE = () => [
  { id: 'dueno', n: 'Dueño', fijo: true, p: todo(true) },
  { id: 'admin', n: 'Administrador', p: todo(true) },
  { id: 'encargado', n: 'Encargado', p: con(['vender', 'anular', 'fiado', 'descuentos', 'ordenes', 'clientes', 'gastos', 'cierre', 'reponer']) },
  { id: 'cajero', n: 'Cajero', p: con(['vender']) }
];

// En un aparato del equipo (cuenta propia del aparato, no la del dueño) nadie administra el equipo ni los permisos:
// el servidor no lo deja y la app ni lo muestra. Se hace desde el aparato del dueño.
let enAparatoEquipo = false;
export const ponerAparatoEquipo = v => { enAparatoEquipo = !!v; };
export const esAparatoEquipo = () => enAparatoEquipo;

export function rolDe(S, perfil) { return (S.roles || []).find(r => r.id === (perfil && perfil.rol)) || null; }
export function puede(S, perfil, k) {
  if (!perfil) return false;
  if (k === 'equipo' && enAparatoEquipo) return false;
  if (perfil.rol === 'dueno') return true;
  const r = rolDe(S, perfil);
  return !!(r && r.p[k]);
}
// Qué puede tocar quien administra: el dueño todo; un administrador no cambia al dueño ni a otros administradores,
// ni el permiso de administrar el equipo.
export function puedeEditarRol(yo, rolId) { return yo && (yo.rol === 'dueno' || (rolId !== 'dueno' && rolId !== 'admin')); }
export function puedeEditarPermiso(yo, k) { return yo && (yo.rol === 'dueno' || k !== 'equipo'); }
