# Pendientes para cuando Orbe se formalice

Lista de cambios que quedaron en espera hasta tener RIF de empresa e imprenta digital.

1. **Términos y privacidad** (`terminos.html`, `privacidad.html`): agregar la razón social y el RIF de la empresa donde hoy dice «Orbe Apps, Venezuela» (están marcados con el comentario `PENDIENTE al formalizar`). No poner datos personales (cédula ni nombre de persona).
2. **Factura de la suscripción** (`js/pantallas/cuenta.js`): volver a mostrar «Necesito factura» cambiando `PEDIR_FACTURA` a `true`, con el texto «Factura fiscal», y que el panel recuerde emitirla con la imprenta digital en cada pago aprobado.
3. **Datos del emisor** en el panel (`admin.html` → Datos de cobro → Tus datos para facturar): razón social, RIF, dirección fiscal e imprenta digital.
4. **Precios**: con el contador, definir si van «+ IVA 16 %» o con IVA incluido, y cómo se maneja el IGTF de los cobros en divisas.
5. **Formas de pago** (`js/pantallas/cuenta.js`, `METODOS_PAGO`): hoy solo Binance. Volver a agregar Pago Móvil (y efectivo) cuando se decida.
6. **Presentación PDF**: actualizar los datos de la empresa y las formas de pago.
