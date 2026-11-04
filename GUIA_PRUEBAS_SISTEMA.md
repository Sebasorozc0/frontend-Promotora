# Guía de prueba del sistema completo

La creación guiada, los nuevos espacios por rol y la distribución de mesas dentro del mapa se explican en [GUIA_USO_RAPIDO.md](GUIA_USO_RAPIDO.md).

Esta guía corresponde al frontend React de `frontend-Promotora` y a la API .NET en el puerto 5080. Usa una base local de desarrollo. Los pagos y las liquidaciones son registros simulados: no realizan transferencias bancarias.

## 1. Encender el proyecto

Abre PowerShell en la raíz del backend:

```powershell
cd C:\Users\mario\OneDrive\Desktop\backendcomercial
```

Comprueba que Docker Desktop esté encendido. Conserva las credenciales existentes en el `.env` privado de la raíz; no las copies al frontend ni a archivos versionados.

En la primera terminal, levanta PostgreSQL, RabbitMQ, MailHog y Flyway:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Start-Local.ps1 -Servicio Infra
```

En una segunda terminal, desde la misma raíz, inicia la API:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Start-Local.ps1 -Servicio Api
```

Si ya estaba encendida antes de actualizar `develop`, detenla con Ctrl+C en su terminal y ejecuta el comando de nuevo. Swagger debe abrir en http://localhost:5080/swagger/index.html.

Para procesar compras y correos necesitas el Worker. Antes de activarlo, revisa las compras pendientes: consumirá también trabajo anterior. En el `.env` privado, las opciones de desarrollo son:

```dotenv
Outbox__Enabled=true
Compras__ConsumerEnabled=true
Notificaciones__Enabled=true
Expiracion__Enabled=true
Recuperacion__Enabled=true
```

No son contraseñas. El Worker también necesita la configuración existente de conexión, RabbitMQ, SMTP y firma de boletos. No reemplaces esas claves por valores de ejemplo. En una tercera terminal:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Start-Local.ps1 -Servicio Worker
```

En una cuarta terminal, entra al frontend:

```powershell
cd C:\Users\mario\OneDrive\Desktop\backendcomercial\frontend-Promotora
```

Si todavía no existen sus dependencias:

```powershell
npm ci
```

Arráncalo:

```powershell
npm run dev
```

Abre la dirección que indique Vite, normalmente http://localhost:5173. El frontend envía `/api` al backend mediante el proxy de Vite; no necesita claves de IA ni contraseñas de base de datos.

## 2. Cuentas y preparación

- Usa tus usuarios reales de desarrollo. Si conservas `.env.test-users`, consulta allí las credenciales de cliente, administrador y dueño. La interfaz no contiene contraseñas de demostración.
- El SUPERADMIN inicial usa la configuración privada de bootstrap. SUPERADMIN es un nivel del perfil ADMINISTRADOR, no un cuarto rol.
- Si aparece el cambio obligatorio, usa una contraseña nueva de 12 a 128 caracteres. Después vuelve a iniciar sesión.
- Para cambiar de rol, cierra sesión antes de entrar con otra cuenta. Puedes usar una ventana privada para el segundo cliente de la prueba de concurrencia.
- Prepara un evento en venta con fechas y ventana de venta vigentes, recinto activo, tipos de entrada activos y cupo. Una compra no debe probarse sobre un evento cancelado o fuera de venta.
- Los botones muestran lo autorizado por rol; el backend vuelve a verificar permisos y propiedad. Un error 403 no se sustituye por datos de ejemplo.

## 3. Visitante: catálogo, mapa y opiniones

1. Abre Cartelera. Debe listar eventos públicos reales; una lista vacía no debe mostrar eventos ficticios.
2. Filtra por una categoría real y busca por nombre o recinto. Limpia los filtros para recuperar el listado.
3. Abre un evento. Comprueba fecha local, recinto, descripción, tarifas y disponibilidad del detalle.
4. Abre su mapa. Los polígonos deben corresponder a las localidades guardadas. Selecciona una zona y continúa.
5. Sin sesión, intentar comprar debe abrir el inicio de sesión. Una cuenta de administrador o dueño no compra como cliente.
6. Revisa opiniones: solo deben aparecer reseñas aprobadas. Las calificaciones sin datos no deben inventar cinco estrellas.

## 4. Cliente: registro, perfil y sesión

1. Abre Ingresar y elige registrarte. Introduce nombre, apellido, correo y contraseña de al menos 12 caracteres. El registro no exige DPI.
2. Debes quedar autenticado como CLIENTE. Una cuenta duplicada debe mostrar el conflicto del servidor.
3. Abre Mi perfil, cambia un dato y guarda. Abre el perfil de nuevo para comprobarlo.
4. Cambia tu contraseña, vuelve a iniciar sesión con la nueva y comprueba que la anterior ya no sirve.
5. Recarga la página: la sesión debe restaurarse. Al vencer el acceso se intenta renovar una vez; una sesión revocada debe exigir ingresar de nuevo.
6. Cierra sesión. Las compras y boletos privados deben desaparecer de la interfaz.

## 5. Cliente: compra general y compra de carrera

1. En un evento EN_VENTA abre Comprar boletos. Selecciona una cantidad dentro del cupo y del límite por compra.
2. En una carrera completa nombre y documento de cada participante. El orden corresponde al de sus entradas.
3. Revisa el subtotal y crea la compra. No introduzcas datos de tarjeta: se usa la pasarela simulada del proyecto.
4. La reserva debe mostrar su `publicId`, estado y desglose confirmado por el backend: subtotal, comisión, IVA y total.
5. Con Worker habilitado, el estado debe pasar de PENDIENTE/PROCESANDO a un estado final. Solo COMPLETADA permite ver los boletos emitidos.
6. Si tarda, puedes cerrar y consultar Mis compras. Usa **Actualizar mis compras y boletos** para recuperar el estado y los QR reales. El tiempo de espera nunca convierte una compra en exitosa.
7. Sin modificar la selección, un reintento por fallo de conexión conserva la clave de esa intención mientras el checkout permanezca abierto. Si ya existe una reserva, consulta su estado antes de abrir otra compra.
8. En Mis boletos comprueba evento, tarifa, precio y QR. Copiar código permite probar la terminal de acceso; descargar QR guarda su imagen. El código es privado: no lo publiques.

### Cancelación y expiración

- Cancelar solo está disponible para una compra PENDIENTE. Debe aparecer CANCELADA y devolver el cupo una vez.
- Si el Worker ganó la transición a PROCESANDO, cancelar debe responder conflicto. Actualiza el historial: no asumas que se canceló.
- Para comprobar expiración sin procesar la compra, prepara el entorno de prueba con el consumidor deshabilitado y el job de expiración habilitado. Espera el vencimiento real; debe terminar EXPIRADA. No modifiques manualmente tablas operativas.
- La prueba de carrera procesar/expirar/cancelar ya corresponde a las pruebas del backend; el frontend no altera esos estados por su cuenta.

## 6. Dueño/administrador: recintos y localidades

1. En Recintos & Planos crea un recinto, con nombre, ciudad, dirección y capacidad. El dueño usa su perfil automáticamente; el administrador debe indicar el ID del perfil dueño, distinto del ID de usuario.
2. Edita el recinto y vuelve a cargarlo. Los cambios deben persistir. La baja puede ser rechazada si existen dependencias de negocio.
3. Sube una imagen de plano admitida por el servidor. Debe conservarse al recargar.
4. Traza un polígono de al menos tres puntos, define nombre, color y capacidad de la localidad y guarda.
5. Selecciona la localidad para editar sus datos. La capacidad agregada debe respetar el recinto.
6. Prueba la baja de una localidad de ensayo sin ventas. Un rechazo debe mostrarse como error, sin aparentar una eliminación.
7. Como dueño, comprueba que solo aparezcan tus recintos y que un ID ajeno no permita gestionarlo.

## 7. Administrador: categorías, talento y usuarios

1. En Categorías & Artistas crea una categoría, abre su edición, modifica la descripción y guarda. Prueba la baja solo sobre un registro de ensayo sin dependencias.
2. Crea un presentador seleccionando ARTISTA, EQUIPO, PRESENTADOR u ORGANIZACION; añade biografía y fotografía.
3. En Artistas del evento selecciona un evento propio permitido, asocia el presentador, modifica su rol o retira la asociación. El backend limita estos cambios según el estado y el historial del evento.
4. En Usuarios & Roles crea un dueño o administrador con una contraseña temporal válida. Comprueba su detalle y edita el perfil cuando tengas permiso.
5. Si una operación exige SUPERADMIN, utiliza ese perfil: ser administrador estándar no otorga todos los permisos.
6. La baja de un usuario es lógica. No debe borrar físicamente compras, auditoría ni movimientos. Usa únicamente cuentas de ensayo para probarla.

## 8. Dueño/administrador: eventos y tarifas

1. En Eventos & Entradas crea un evento BORRADOR usando un recinto y categoría reales.
2. Introduce inicio/fin y ventana de venta. Al editar, las fechas no deben desplazarse por mezclar hora local con UTC.
3. Sube el flyer y crea tipos de entrada: nombre, precio sin IVA, cupo y localidad, o entrada general sin localidad.
4. Edita una tarifa permitida y vuelve a abrirla para comprobar persistencia.
5. Cambia BORRADOR → PROGRAMADO → EN_VENTA según las validaciones del servidor. Comprueba que aparezca en el catálogo público.
6. La edición, baja o transición incompatible con ventas debe mostrar el conflicto real. No se fuerza desde la interfaz.

## 9. Sillas y mesas numeradas

1. Antes de publicar ventas, selecciona evento/localidad en Silletería Numerada y comprueba que existan tarifas para esa localidad.
2. Añade mesas y sillas. Cada mesa tiene etiqueta, modalidad y tarifa; cada silla tiene etiqueta, tarifa y, opcionalmente, mesa. Las sillas de una mesa deben compartir su tarifa.
3. Selecciona Mesas con sillas o Sillas en filas, indica cantidades y tarifa y pulsa Generar dentro de la localidad. Las coordenadas se calculan automáticamente a partir del polígono real. Puedes arrastrar mesas con sus sillas o mover una silla; el editor impide sacar posiciones de la zona.
4. Guarda el borrador. Recarga y comprueba etiquetas y posiciones. Las filas ya guardadas no se eliminan omitiéndolas; bloquea inventario que no se ofrecerá.
5. Publica el borrador guardado. Deben reconciliarse capacidades y cupos; una mesa completa debe caber en el máximo de boletos por compra.
6. Publicada la distribución, la estructura queda congelada. Bloquea/desbloquea una silla libre y comprueba su estado; las mesas COMPLETA se tratan como unidad.
7. Como cliente, abre el evento y selecciona sillas verdes. En POR_SILLA se eligen individualmente; en COMPLETA se eligen todas juntas.
8. El resumen muestra cantidad y precio por silla. La compra envía los IDs reales agrupados por tarifa; se emite un QR por persona.
9. Repite con una silla ocupada: no debe poder seleccionarse. Dos clientes que elijan la misma silla deben obtener una sola reserva; el otro recibe conflicto y actualiza el plano.
10. Verifica en el boleto la mesa/silla asignada. Un boleto USADO no libera una silla aunque después se reembolse la compra.

## 10. Control de acceso y reseñas

1. Como administrador abre **Usuarios y roles → Alta validador de boletos** y crea una cuenta de ensayo. En el primer inicio, cambia la contraseña temporal y vuelve a ingresar.
2. Como cliente abre el QR de un boleto VÁLIDO de ensayo en otro dispositivo. En **Control de entradas**, pulsa **Activar cámara**, concede el permiso y apunta al QR. Usa localhost o HTTPS para acceder a la cámara.
3. Confirma el acceso y la ubicación, si corresponde. Pulsa **Escanear otro boleto** y apunta al mismo QR. Debe rechazar el segundo ingreso.
4. Como administrador o dueño, comprueba también la entrada manual con un código inválido. La cuenta de validador usa la cámara. Si el navegador deniega el permiso, la pantalla muestra cómo revisar el acceso a la cámara.
5. Vuelve como cliente, actualiza Mis boletos y califica el evento del boleto USADO. Comentario opcional, máximo 510 caracteres; nota 1–5.
6. La reseña nace PENDIENTE y no aparece públicamente todavía.
7. Como administrador, modérala desde Moderación Reseñas. Solo PENDIENTE admite aprobación/rechazo.
8. Como cliente, en Mis reseñas puedes editar o retirar tu reseña. Editar vuelve a PENDIENTE; retirar no borra la fila.
9. Comprueba las opiniones públicas y las calificaciones después de aprobar. Un cliente sin boleto USADO no debe poder reseñar.

## 11. Finanzas y reembolsos

1. Abre Cuentas & Liquidación. El dueño solo debe ver sus cuentas; el administrador ve las autorizadas del sistema.
2. Selecciona moneda. Los saldos resumen no deben sumar monedas distintas.
3. Abre Extracto. Comprueba movimientos reales con signo y fecha; no se inventa un saldo posterior que la API no devuelve.
4. Como administrador, reembolsa totalmente una compra de ensayo COMPLETADA. El servidor revierte los movimientos originales y el pago; solo boletos VALIDO pasan a ANULADO y devuelven cupo.
5. Repite el mismo reembolso: no debe duplicar movimientos. La compra permanece COMPLETADA por contrato; el estado reembolsado corresponde al pago.
6. Como administrador, liquida un monto positivo de una cuenta DUENO activa y con saldo suficiente. Reintentar la misma operación conserva su clave hasta recibir éxito.
7. Cierra únicamente una cuenta DUENO con saldo cero. PLATAFORMA e IMPUESTOS no se cierran. No cierres una cuenta que necesitarás para otras pruebas.

## 12. Agente José y RAG

1. Como administrador, abre Documentos RAG y carga un TXT/MD público corto con información real de prueba, sin contraseñas ni instrucciones para el modelo.
2. Debe quedar PENDIENTE. Abre su detalle y revisa el texto extraído.
3. Indexa una sola vez. Se usan embeddings cloud y la cuota de la cuenta; sin claves/configuración debe mostrarse el error real.
4. Abre a José como visitante y realiza una pregunta breve cuya respuesta esté en el documento. Revisa la respuesta y despliega sus fuentes.
5. Pregunta algo que no esté documentado. Debe indicar falta de información; nunca inventar reglamentos, eventos o citas.
6. Una petición de datos privados no debe revelar usuarios, compras ni finanzas.
7. Carga una nueva versión e indexa; comprueba su estado. Desactiva una versión de ensayo si quieres retirarla de recuperación.
8. No repitas pruebas cloud en bucle. Las comprobaciones automáticas del frontend no consumen Ollama ni Gemini.

## 13. Los 15 reportes

1. Como administrador abre Reportes Excel / PDF.
2. Recorre R-01 a R-15. Cada reporte muestra solo filtros admitidos; desde/hasta son fechas UTC, con hasta exclusivo.
3. Consulta JSON desde la pantalla. Revisa filas, número de página, totales del conjunto filtrado y notas.
4. Cambia de página si hay más de 20 filas. En R-15 revisa sus dos secciones.
5. Descarga Excel y PDF y ábrelos. Para una verificación rápida, usa un reporte con ventas y R-15 con sus dos secciones; el resto comparte el exportador.
6. Un conjunto excesivo debe devolver 422 y pedir filtros, sin descargar un archivo parcial. Límites: 10000 filas por sección para Excel y 500 para PDF.
7. Como dueño o cliente, la ruta de reportes administrativos debe estar denegada.

| Código | Contenido |
|---|---|
| R-01–R-04 | Ventas por evento, categoría, recinto y fecha/método |
| R-05–R-06 | Ocupación y boletos |
| R-07–R-08 | Movimientos del dueño y comisiones |
| R-09–R-10 | Clientes y compras no completadas |
| R-11–R-13 | Calificaciones, estados de eventos y carreras |
| R-14–R-15 | Uso IA; auditoría y notificaciones |

Power BI se prueba abriendo tu `bi/Promotora.pbix` en Desktop y actualizando con el usuario de lectura configurado. No forma parte de una pantalla pública ni necesita exponer sus credenciales al frontend. Consulta `docs/POWER_BI.md` del backend.

## 14. Móvil y fallos esperados

- Revisa catálogo, detalle, menú, checkout y panel a 375, 768 y 1280 píxeles. Las columnas deben apilarse; las tablas y listas de sillas pueden desplazarse dentro de su área.
- Comprueba navegación con Tab, foco visible y selección de sillas con Enter/Espacio.
- Detén la API desde su terminal y recarga: debe aparecer un error de conexión, sin eventos o compras ficticios.
- Una respuesta 409 pide actualizar el estado/disponibilidad; 403 indica permisos; 429 pide esperar. No reenvíes compras repetidamente ante un error.

## 15. Comprobaciones realizadas y pendientes

La integración incluye comprobaciones del cliente API sin servicios cloud: adaptación de compras/boletos, paginación, renovación JWT con respuesta 204, propagación de errores de red/compra/IA y planos con más de 100 sillas.

Desde la carpeta del frontend puedes ejecutarlas:

```powershell
node scripts/check-contracts.cjs
```

Compilación:

```powershell
npm run build
```

Análisis estático:

```powershell
npm run lint
```

La revisión visual y los recorridos autenticados completos quedan pendientes de ejecutar en tu navegador: el permiso para abrir el navegador de comprobación fue rechazado durante este trabajo. El análisis estático conserva advertencias de estilo y recomendaciones de hooks; su salida debe revisarse, aunque termine sin errores. No se declara cerrada la salida de Fase 11 hasta completar el recorrido desde la interfaz. Esta carpeta sigue sin incorporarse al control de versiones del backend; no se hizo push ni PR.
