# Cómo usar la nueva interfaz

## Cada persona tiene su espacio

| Perfil | Espacio | Qué encontrará |
|---|---|---|
| Visitante y cliente | `/catalogo` | Eventos, mapa de localidades y asistente José |
| Cliente | `/compras`, `/boletos`, `/resenas` | Reservas, detalle de compra, entradas guardadas con QR y sus reseñas |
| Administrador | `/gestion` | Inicio de operaciones y menú de gestión general |
| Dueño de recinto | `/dueno` | Sus recintos, eventos, distribuciones y cuentas |

Al iniciar sesión, administradores y dueños entran a su panel. Desde allí, **Ver cartelera pública** permite comprobar cómo verá el evento un cliente. Para comprar se utiliza una cuenta CLIENTE. Las rutas antiguas `/admin/...` redirigen al espacio correspondiente.

## Crear un evento de principio a fin

1. Entra como administrador o dueño y pulsa **Crear evento**.
2. **Datos del evento:** nombre, categoría, recinto, descripción, fechas, límite de entradas por compra y flyer opcional. Introduce las fechas en tu hora local. Pulsa **Guardar y configurar entradas**.
3. **Entradas y precios:** crea entradas generales, sillas numeradas o mesas. Selecciona la localidad por nombre y define el precio por persona, sin IVA. Guarda cada entrada.
4. Si la localidad tiene sillas o mesas, pasa a **Sillas y mesas**. Elige la localidad dibujada en el mapa y genera su distribución.
5. **Revisar y publicar:** comprueba recinto, fecha, tarifas y distribuciones. Puedes **Solo programar** o **Confirmar y poner en venta**. El servidor verifica nuevamente las reglas del evento.

Cada paso guarda sus datos en el backend. Para continuar después, ve a **Mis eventos → Continuar preparación**. Si cambias datos del primer paso, guárdalos antes de avanzar.

Si todavía no tienes un recinto o sus localidades, usa **Recintos y localidades**: crea el lugar, carga su plano y dibuja las zonas. No necesitas escribir IDs para seleccionar un recinto o una localidad en el asistente.

## Distribuir mesas dentro de una localidad

1. Abre **Sillas y mesas** desde el asistente o desde el menú.
2. Selecciona el evento y la localidad. Es obligatorio que la localidad tenga un polígono dibujado en el mapa.
3. Elige **Mesas con sillas** e indica, por ejemplo, 6 mesas y 4 sillas por mesa: 24 personas.
4. Selecciona la tarifa de cada silla. Una mesa de cuatro sillas de Q100 tiene un subtotal de Q400, antes de comisión e IVA.
5. Elige la modalidad: **Mesa completa** obliga a comprar todas sus sillas juntas; **Por silla** permite venderlas individualmente. En ambos casos se emite un boleto por persona.
6. Pulsa **Generar dentro de la localidad**. Las mesas y todas sus sillas se colocan dentro del polígono real, incluso si tiene una forma irregular.
7. El plano se acerca a esa localidad. Usa **Ver el recinto completo** para orientarte.
8. Selecciona y arrastra una mesa: sus sillas la acompañan. También puedes mover una silla por separado. El sistema rechaza movimientos que saquen una posición de la localidad.
9. Al seleccionar una posición puedes cambiar su etiqueta y usar las flechas para ajustes pequeños. El botón **Generar** permite reemplazar la vista previa mientras aún no se haya guardado.
10. Guarda el borrador para continuar después. Revisa la distribución antes de **Guardar y publicar distribución**: después de publicarla ya no se cambian estructura, posiciones ni etiquetas; se permite bloquear o desbloquear sillas según su estado.

Para sillas sin mesas, elige **Sillas en filas** e indica filas y sillas por fila. Si la cantidad o forma no permite distribuirlas dentro de la zona, se muestra el problema sin colocar sillas fuera.

La capacidad del recinto/localidad y el máximo de personas por compra siguen aplicando. Una mesa completa debe caber en el límite por compra. Al publicar, el backend ajusta los cupos a las sillas configuradas. Los IDs y las coordenadas se administran automáticamente.

## Comprar y recuperar la entrada

1. Como cliente, abre un evento EN_VENTA y elige una entrada general, sillas individuales o una mesa completa.
2. Confirma la reserva y consulta el estado. Si sigue PENDIENTE o PROCESANDO, espera o ve a **Mis compras**. La interfaz no inventa una compra completada.
3. **Mis compras** muestra el importe y el estado de cada reserva. Las pendientes se actualizan durante un minuto y también existe el botón **Actualizar compras**.
4. Abre **Ver detalle de compra** para ver cantidades, precios, subtotal, comisión, IVA y total confirmado por el servidor.
5. Cuando esté COMPLETADA, pulsa **Ver mis boletos y QR**. Se muestran las entradas de esa compra.
6. En **Mis boletos**, cada tarjeta muestra evento, fecha, recinto, tarifa y mesa/silla cuando corresponda. Pulsa **Ver detalles y QR de entrada**.
7. El boleto completo muestra sus datos primero y su QR personal al final. Puedes descargar el QR o copiar el código para una prueba de validación autorizada.
8. Las entradas están guardadas en PostgreSQL y vinculadas a tu cuenta: cerrar el navegador o iniciar sesión después no las elimina. La pantalla vuelve a consultarlas al abrirla o recuperar el foco.

No compartas el QR. Un código usado o anulado no permite un nuevo ingreso. La pasarela del proyecto es simulada: no se realiza un cobro bancario real.

## Prueba breve recomendada

- Dueño: crear recinto y dibujar una localidad.
- Dueño o administrador: crear evento con el asistente, añadir una entrada y generar 6 mesas de 4 sillas dentro de la localidad. Mover una mesa y comprobar que ninguna silla pueda salir del polígono.
- Guardar, recargar y publicar la distribución. Programar el evento y ponerlo en venta.
- Cliente: comprar una mesa completa. Con el Worker habilitado, esperar COMPLETADA y comprobar cuatro boletos independientes con su mesa, silla y QR.
- Recargar el navegador: los boletos deben continuar en la cuenta. Validar uno y comprobar que el segundo intento se rechace.
- Administrador: revisar las demás funciones desde el menú lateral; el dueño solo debe gestionar su ámbito.

Para arranque, configuración del Worker y pruebas de los demás módulos, consulta [GUIA_PRUEBAS_SISTEMA.md](GUIA_PRUEBAS_SISTEMA.md).

## Verificación de esta entrega

Se realizan compilación del frontend, comprobaciones del cliente API y pruebas focalizadas del generador geométrico. Las pruebas automáticas no llaman a Ollama ni Gemini ni crean compras reales. El recorrido visual y autenticado completo no está acreditado: el permiso de navegador fue rechazado anteriormente. La carpeta continúa local, sin incorporarse al repositorio backend ni hacer push.
