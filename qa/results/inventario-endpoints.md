# Inventario de llamadas del frontend

Las llamadas se identificaron por lectura de código. Su presencia no demuestra compatibilidad con una API real.

## src/components/VenueMapEditor.tsx

- getRecintos
- getMapaRecinto
- crearRecinto
- actualizarLocalidad
- crearLocalidad
- eliminarLocalidad
- subirPlanoRecinto

## src/components/admin/AdminCatalog.tsx

- getCategorias
- getPresentadores
- getEventos
- getEventoPresentadores
- actualizarCategoria
- crearCategoria
- eliminarCategoria
- actualizarPresentador
- crearPresentador
- eliminarPresentador
- subirFotoPresentador
- asignarPresentadorEvento
- quitarPresentadorEvento

## src/components/admin/AdminEvents.tsx

- getRecintos
- getCategorias
- getEventos
- actualizarEvento
- crearEvento
- eliminarEvento
- actualizarEstadoEvento
- subirImagenEvento
- getTiposEntrada
- getLocalidades
- actualizarTipoEntrada
- crearTipoEntrada
- eliminarTipoEntrada

## src/components/admin/AdminFinance.tsx

- getCuentas
- getMovimientosCuenta
- liquidarCuenta
- cerrarCuenta
- reembolsarCompra

## src/components/admin/AdminRag.tsx

- getDocumentosRag
- subirDocumentoRag
- subirNuevaVersionDocumentoRag
- reindexarDocumentoRag
- desactivarDocumentoRag
- getDocumentoRag

## src/components/admin/AdminReviews.tsx

- getColaResenas
- getMisResenas
- moderarResena
- editarResena
- retirarResena

## src/components/admin/AdminSeating.tsx

- getRecintos
- getEventos
- getLocalidades
- getDistribucion
- desbloquearAsiento
- bloquearAsiento
- publicarDistribucion
- guardarDistribucion

## src/components/admin/AdminUsers.tsx

- getUsuarios
- altaAdministrador
- altaDuenoRecinto
- actualizarPerfil
- darBajaUsuario

