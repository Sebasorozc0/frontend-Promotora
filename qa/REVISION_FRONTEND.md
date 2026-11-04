# Evaluación del frontend de administrador y dueño de recinto

> Documento histórico de la revisión inicial. Las correcciones posteriores y sus límites están en `qa/CORRECCIONES_FRONTEND.md`; los resultados de regresión se guardan por separado en `qa/results/frontend-regression.json`.

Fecha: 3 de noviembre de 2026.

**Resultado: no se puede dar por funcional todo el frontend.** Las pantallas renderizan con datos de prueba, pero existen errores de selección de datos, sesión y confirmación de operaciones. Una pantalla que no se rompe no necesariamente muestra información correcta ni confirma una operación real.

## Alcance y evidencia

- Solo frontend. No se inició, configuró ni contactó el backend ni PostgreSQL durante esta evaluación.
- `npm ci` completado; `npm run build` aprobado. Vite advirtió un bundle mayor de 500 kB.
- `npm run lint` completado con advertencias, sin error de ejecución.
- 107 escenarios exploratorios automatizados en Edge sin ventana, con interceptación de `fetch` antes de cargar la aplicación. Cero excepciones JavaScript no controladas y cero errores del script en los resultados finales. Esto no equivale a 107 pruebas funcionales aprobadas: se registraron comportamientos incorrectos.
- Matriz principal: ocho vistas de ADMINISTRADOR y cuatro de DUENO_RECINTO, cada una con carga 200, lista vacía, 400, 401 y 500: 60 escenarios.
- Casos adicionales: restricciones de acceso, contraseña obligatoria, eventos ajenos, distribución, formularios, moderación, documentos y operaciones financieras.
- Cuatro comprobaciones adicionales del cliente HTTP: refresh seguido de otro 401, archivo con 401, DELETE con 204 y escritura sin red.
- Fixtures sintéticos basados en los tipos que declara este frontend. No son respuestas capturadas de un servidor real. No se ha validado que los endpoints, permisos o cuerpos coincidan con el backend.

Archivos reproducibles:

- `qa/frontend-audit.mjs`: navegador, fixtures y escenarios. Se ejecuta desde la raíz con `node qa/frontend-audit.mjs` tras instalar dependencias. Usa Edge de Windows, puerto 5178 para Vite y 9337 para depuración; los cierra al finalizar. Usa un perfil de navegador temporal separado.
- `qa/results/frontend-audit.json`: texto visible, botones, entradas y peticiones observadas por escenario.
- `qa/results/inventario-endpoints.md`: llamadas identificadas en cada componente por lectura de código.

No se modificaron componentes ni lógica de producción.

## Resultado por vista y contenido esperado

| Vista | Roles actuales | Qué debería aparecer | Resultado observado |
|---|---|---|---|
| Categorías y artistas | Administrador | Categorías y artistas reales, edición y asociación a eventos de gestión | Carga y formularios de creación funcionan contra mocks. Hay mensajes de error para categorías/artistas, pero fallos de asociaciones pueden convertirse en listas vacías. Los eventos de asociación salen del catálogo público. |
| Recintos y planos | Administrador y dueño | Recintos accesibles al usuario, plano y localidades del recinto elegido; estados vacío/error diferenciados | Carga, mapa y creación emiten las llamadas esperadas por el frontend. Un 400/401/500 de carga se confunde con ausencia de recintos; quedan controles de dibujo y subida visibles sin selección válida. |
| Eventos y entradas | Administrador y dueño | Eventos gestionables, incluyendo borradores/programados; dueño limitado a sus recintos | Se consulta el catálogo público; no se usa `getEventosAdmin`. Lista vacía y errores muestran eventos demo. El dueño ve un evento ajeno en el escenario de prueba. Editar sin cambios altera horas y envía fechas de venta nulas. |
| Silletería | Administrador y dueño | Evento/localidad válidos, distribución real, disponibilidad y publicación; estructura congelada tras publicar | Filtro de propiedad falla cuando no hay coincidencias. Guardado 500 muestra 40 sillas locales; el generador sigue disponible tras publicar. |
| Cuentas y liquidación | Administrador y dueño | Cuentas/extractos pertinentes al rol; importes por moneda y acciones autorizadas | Carga, liquidación y reembolso emiten solicitudes; los errores probados muestran feedback. El dueño recibe los mismos controles de liquidación/reembolso/cierre, sin comprobación de rol en el componente. Resúmenes suman monedas y muestran Q. |
| Moderación | Administrador | Reseñas reales, filtro consistente y estado confirmado por respuesta | Con 400/401/500 al aprobar, la interfaz igualmente cambia a APROBADA y anuncia éxito. Un error de carga presenta reseñas demo; el filtro PENDIENTE llega a mostrar APROBADAS. La pestaña de reseñas propias consulta un flujo de autor dentro del panel de administración. |
| Documentos RAG | Administrador | Documentos reales, carga pendiente, progreso y resultado real de indexación | Subida emite multipart y comunica errores. Fallos de listado muestran documentos demo. Reindexación 500 modifica localmente chunks a 16 y muestra INDEXADO/simulación. Detalle fallido fabrica datos locales. |
| Usuarios | Administrador | Usuarios reales, detalle, altas y baja; error distinto de lista vacía | Alta de administrador emite solicitud y muestra errores cuando corresponde. Fallos de listado 400/401/500 muestran tres usuarios demo con botones de edición. No hay navegación entre páginas. |

## Hallazgos prioritarios

### F01 — P1: moderación confirma operaciones rechazadas

Referencia: `src/components/admin/AdminReviews.tsx:80–94`.

Reproducción: `review-approve-400`, `review-approve-401`, `review-approve-500`. `PATCH /resenas/81/moderar` responde el error simulado, pero el estado visible se vuelve APROBADA y aparece feedback de éxito. El `catch` realiza el mismo cambio local que el bloque exitoso.

Esperado: conservar el estado previo, comunicar el error y permitir reintentar. No sustituir el resultado del servidor.

### F02 — P1: edición de eventos cambia fechas sin intervención del usuario

Referencia: `src/components/admin/AdminEvents.tsx:137–166`.

Reproducción: `event-edit-fields`. Un evento recibido con inicio `2027-01-20T18:00:00Z` se abre en un campo datetime-local mediante `substring(0,16)`. Guardar sin cambiarlo envía `2027-01-21T00:00:00.000Z` en el entorno de Guatemala: desplazamiento de seis horas. Fin del evento sufre el mismo problema.

Además, al editar se inicializan apertura/cierre de venta con cadenas vacías y el PUT envía ambas como `null`. La lista utilizada para editar no contiene todos los datos originales; no se recupera el detalle de gestión antes de guardar.

Esperado: conversión UTC → hora local al abrir y hora local → UTC al guardar, conservando los instantes. Cargar el detalle completo y preservar fechas de venta.

### F03 — P1: errores y listas vacías se sustituyen por información ficticia

Referencias: `AdminEvents.tsx:99`, `AdminUsers.tsx:79`, `AdminReviews.tsx:41`, `AdminRag.tsx:50`, `AdminSeating.tsx:47`, `src/api/client.ts:127`.

Reproducción: escenarios de carga 400/401/500 de Eventos, Usuarios, Moderación y RAG; `ADMINISTRADOR/eventos/empty`; `offline-create-category`.

El cliente HTTP convierte un fallo de red en una respuesta mock; incluso `crearCategoria` resuelve con éxito sin red. Algunos componentes reemplazan también errores HTTP por datos ficticios. En Eventos, una respuesta válida con `items: []` igualmente presenta el catálogo demo.

Esperado: distinguir carga, vacío, sesión expirada y error; solo usar demostraciones en un modo explícito separado. No informar escrituras exitosas que no ocurrieron.

### F04 — P1: distribución permite continuar con datos que no se guardaron

Referencia: `src/components/admin/AdminSeating.tsx:195–268` y botón del generador alrededor de línea 355.

Reproducción: `seating-save-500`. El PUT de distribución responde 500; el generador cierra el modal y reemplaza el plano por 40 sillas con feedback local de simulación. `seating-published-generator` permite abrir el generador después de publicar.

Esperado: conservar el plano persistido tras error y evitar regeneración de una estructura publicada. Los borradores locales deben identificarse y separarse del estado guardado.

### F05 — P1: falta activar el cambio obligatorio de contraseña

Referencias: `src/App.tsx:877`, `src/components/PasswordChangeModal.tsx:19`.

Reproducción: `mandatory-password`, sesión con `debeCambiarPassword: true`. El panel y sus acciones aparecen sin el modal obligatorio.

App siempre pasa `isOpen={isManualPasswordChangeOpen}`, inicialmente false. El modal da prioridad a esa prop definida e ignora el indicador obligatorio. Esto puede llevar al usuario a acciones que el servidor rechace por sesión limitada.

Esperado: abrir automáticamente el cambio obligatorio y posponer acciones de gestión hasta completar el flujo.

### F06 — P1: dueño puede seleccionar eventos que no corresponden a sus recintos

Referencias: `AdminEvents.tsx:102`, `AdminSeating.tsx:63–68`.

Reproducción: `owner-events-unrelated`, `owner-seating-unrelated`. El recinto accesible tiene ID 11 y el evento pertenece a recinto 999. Ambas vistas mantienen el evento seleccionable. En Silletería solo se reemplaza la lista cuando `propios.length > 0`; cero coincidencias deja la lista original.

Esperado: lista vacía si no hay eventos propios; ninguna acción sobre eventos ajenos. La autorización efectiva debe seguir siendo responsabilidad del servidor; esta prueba no demuestra acceso real a datos ajenos.

### F07 — P2: sesión y archivos manejan 401 de forma inconsistente

Referencia: `src/api/client.ts:98–109`, `requestFormData` alrededor de línea 137.

Reproducción: `upload-401` y `refresh-retry-401-log` en el bloque transport del JSON.

- Las peticiones JSON intentan refresh; las subidas multipart no lo intentan. Con un token vencido, las subidas fallan aunque exista refresh token.
- Si refresh responde 200 y el reintento vuelve a dar 401, el token permanece y no se emite la expiración de sesión.
- El reintento JSON siempre llama a `json()`, sin el manejo de 204 que tiene la primera respuesta; riesgo identificado por lectura, no probado en el navegador.
- El listener de expiración se registra después de una salida temprana cuando no existe sesión inicial (`AuthContext.tsx:64–119`); quien inicia sesión después de abrir la app sin sesión puede quedarse sin ese listener. Identificado por lectura.

Esperado: comportamiento uniforme para JSON y archivos, limpieza coherente de sesión y manejo de respuestas sin contenido.

### F08 — P2: la gestión de eventos utiliza una fuente y estados inconsistentes

Referencias: `src/api/client.ts:710`, `AdminEvents.tsx:102`, `AdminCatalog.tsx:92`, `AdminSeating.tsx:63`, `src/types/api.ts:5`.

Existe `getEventosAdmin()` para `/eventos`, pero ninguna vista lo consume. Gestión de eventos, line-up y silletería consultan `/catalogo/eventos`. Si el catálogo expone únicamente eventos públicos, los borradores/programados no podrán administrarse desde esas listas. La diferencia real de filtros debe confirmarse con el contrato del servidor; no se probó aquí.

Adicionalmente, el filtro y la explicación del ciclo usan PUBLICADO; el tipo EstadoEvento y el modal de transición usan PROGRAMADO. AGOTADO tampoco está en el filtro. Inconsistencia confirmada dentro del propio frontend.

### F09 — P2: acciones financieras sin distinción de rol e importes mezclados

Referencia: `src/components/admin/AdminFinance.tsx:24`, `:134–147`, `:282`, `:355–377`.

Reproducción: `owner-finance-actions` abre la liquidación como dueño; listado muestra reembolso y cierre sin condiciones de rol. El componente no consulta `useAuth`.

Esperado: definir qué puede ejecutar cada rol y reflejarlo en controles, con autorización final en API. No se comprobó el permiso real de esos endpoints.

Por lectura, los resúmenes suman saldos por tipo sin agrupar por moneda y los presentan como Q, aunque el DTO contiene `moneda`. Con varias monedas, el resumen sería incorrecto.

### F10 — P2: paginación y errores de validación incompletos

Referencias: funciones de carga en cada vista y `src/api/client.ts`.

Usuarios carga página 1 con 100 elementos; eventos/reseñas/documentos cargan 50–100; otras listas usan el tamaño predeterminado. Los filtros actúan sobre la lista cargada y no hay navegación para recuperar el resto. No se probó un conjunto de datos grande: hallazgo por lectura.

Los formularios muestran principalmente `detail`, ignorando `ProblemDetails.errors`; un 400 con errores por campo puede terminar en un mensaje genérico sin señalar la entrada inválida. No se comprobó el contrato de validación del servidor.

### F11 — P2: indexación RAG fallida cambia estado y cantidades

Referencia: `src/components/admin/AdminRag.tsx:133–147`.

Reproducción: `rag-reindex-500`. Respuesta 500 seguida de actualización local a INDEXADO y 16 chunks. Aunque el mensaje menciona simulación, la tarjeta se presenta como indexada y cambia sus métricas.

Esperado: conservar el estado/índice confirmado y mostrar error de indexación.

### F12 — P2: controles activos sin datos válidos y resultados engañosos

Referencia: `src/components/VenueMapEditor.tsx:68–110` y controles alrededor de líneas 460–500.

Reproducción: cargas de Recintos 400/401/500 y listas vacías. Se muestra «Sin recintos registrados» sin comunicar el fallo de carga, con botones de plano y dibujo activos.

Esperado: explicar el error y deshabilitar operaciones que requieren recinto hasta que exista una selección válida.

## Qué se comprobó favorablemente

- Las 12 combinaciones de rol/vista de la matriz renderizan las fixtures exitosas sin excepciones no controladas.
- Cliente y anónimo ven acceso restringido al intentar abrir Usuarios. El dueño que abre Usuarios se redirige a Recintos y no carga la lista de usuarios del módulo.
- Creación de categoría, recinto y administrador, subida RAG y liquidación emiten las peticiones del cliente y distinguen éxito/error en los casos probados, salvo los fallos transversales de sesión y mocks descritos.
- Reembolso, transición de evento y desactivación RAG emiten solicitudes y muestran error ante 500 simulado.
- DELETE con respuesta 204 se maneja correctamente en la petición inicial del cliente.

Estas observaciones validan interacción y manejo de respuestas simuladas, no persistencia real ni reglas de negocio del servidor.

## Cobertura pendiente

Se inventariaron por lectura todas las llamadas de los componentes de administración y del editor de recintos. No se ejercitó individualmente cada botón/variante: trazo geométrico y guardado/edición/baja de localidades, subida de plano/flyer/foto de artista, todas las variantes de edición/baja de usuarios y catálogos, asociaciones de artistas, nueva versión RAG, bloqueo/desbloqueo y creación/edición/baja de tipos de entrada requieren casos adicionales. No se realizaron pruebas de accesibilidad, móvil o carga/concurrencia.

Sin backend no es posible certificar «cada endpoint devuelve 200 y ninguno devuelve 400/401/500». Sí se comprobó que actualmente el frontend puede ocultar esos errores y anunciar resultados incorrectos. Antes de darlo por validado, deben corregirse los hallazgos y verificarse los contratos reales en una fase posterior.
