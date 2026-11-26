// Ayudas de seguridad para armar HTML a mano (hojas de impresión).
// Preact ya escapa todo lo que muestra; esto es solo para los pocos lugares que usan innerHTML.

// Escapa texto para ponerlo dentro de HTML o de un atributo entre comillas.
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Solo acepta imágenes guardadas por la app (data URL de una imagen en base64) o un blob local.
// Cualquier otra cosa (texto con comillas, javascript:, direcciones externas) se descarta.
const IMG_OK = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
export const imgSegura = s => typeof s === 'string' && (IMG_OK.test(s) || /^blob:https?:\/\/[^"'<>\s]+$/.test(s)) ? s : '';
