# Correcciones del frontend

Se corrigieron los fallos reproducibles de la revisión de administrador y dueño de recinto sin ejecutar ni contactar la API real.

## Cambios

- Cliente HTTP compartido para JSON y multipart: renovación de token, reintento único, limpieza de sesión ante un 401 definitivo y respuestas 204 sin intentar leer JSON vacío. Las validaciones por campo se incluyen en el mensaje de error.
- Se eliminaron las respuestas mock automáticas del cliente y los reemplazos ficticios de datos en las vistas de gestión. Una desconexión o un error HTTP se propaga como error.
- Usuarios, documentos, eventos, recintos, categorías, artistas, cuentas y movimientos de gestión reúnen las páginas anunciadas por la respuesta antes de aplicar filtros locales.
- Eventos, line-up y silletería utilizan la lista de gestión `/eventos`. La edición consulta `/eventos/{id}` y conserva los datos completos de venta.
- Fechas de eventos: conversión correcta de UTC a hora local; guardar sin cambios conserva el instante y su precisión original. Validación del orden de fechas. No se inventan IDs de recinto/categoría.
- Dueño: eventos restringidos a los recintos de su lista accesible, incluso si no existen coincidencias; las acciones financieras de administración quedan ocultas y protegidas también en los handlers.
- Moderación: no cambia el estado si la petición falla; solo ofrece aprobar/rechazar reseñas pendientes; respeta el filtro después de moderar. Se retiró la mezcla de flujos de autor/cliente en esta vista administrativa.
- RAG: no fabrica documentos, contenido extraído ni resultados de indexación. Un error de indexación conserva los datos previos.
- Distribución: un guardado fallido conserva el plano anterior; una distribución publicada bloquea el generador. Los cambios de evento/localidad descartan respuestas antiguas y limpian la selección. Un 404 deja una distribución vacía que puede crearse.
- Recintos: carga/error/vacío visibles, controles deshabilitados sin selección válida, limpieza de selección al cambiar de recinto y restauración del plano previo cuando falla su subida.
- Finanzas: importes separados por moneda y presentación de la moneda de cada cuenta/extracto. Un reintento de liquidación dentro del mismo formulario conserva la clave de idempotencia.
- Sesión: el listener de expiración existe también cuando la aplicación comienza sin usuario; el cambio obligatorio de contraseña se abre automáticamente y bloquea el panel hasta completarlo.

## Verificación

```powershell
npm run build
npm run lint
npm run test:frontend
```

La compilación pasó; Vite conserva su advertencia de tamaño del bundle. Lint completó sin errores y conserva advertencias de código sin usar y hooks. El informe bruto de lint está en `qa/results/lint-final.txt`.

La prueba de navegador utiliza Edge instalado en Windows, un servidor Vite temporal en el puerto 5178 y un perfil separado. Intercepta `fetch` antes de cargar React: ninguna petición de prueba llega al backend. Resultado final: **111 escenarios y 204 aserciones aprobadas**, sin errores del script ni excepciones JavaScript no controladas. El resultado y las aserciones quedan en `qa/results/frontend-regression.json`. El archivo `frontend-audit.json` conserva la evidencia de la revisión inicial.

Las comprobaciones incluyen respuestas exitosas/vacías/400/401/500, formularios, archivos, sesión, filtros de propiedad, fechas, publicación, varias monedas y reintentos. Se debe consultar el JSON para el conteo final y los detalles.

## Límites

La integración real continúa pendiente: permisos, nombres exactos de campos, rutas, métodos y reglas del servidor deben cotejarse contra una API disponible. La lectura de detalle de evento y la paginación usan los contratos que ya expresa el frontend; no se modificó el backend ni se certificó persistencia real.

El alcance de estas correcciones es el cliente HTTP y las vistas de administrador/dueño revisadas. Las demostraciones y flujos de compra/boletos del área pública siguen requiriendo su propia revisión. No se eliminaron funciones del cliente destinadas a esas pantallas.
