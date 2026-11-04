# Cobertura de operaciones REST en el frontend

Inventario de 87 operaciones de Swagger. La integración se realizó mediante cliente API y pantallas por rol; esta matriz no acredita una prueba autenticada de cada operación. Las imágenes se consumen mediante img/image, y refresh se utiliza automáticamente al renovar la sesión.

| Método y ruta | Pantalla o flujo |
|---|---|
| POST /api/v1/auth/registro | Ingresar, registro, cerrar sesión y renovación automática |
| POST /api/v1/auth/login | Ingresar, registro, cerrar sesión y renovación automática |
| POST /api/v1/auth/refresh | Ingresar, registro, cerrar sesión y renovación automática |
| POST /api/v1/auth/logout | Ingresar, registro, cerrar sesión y renovación automática |
| POST /api/v1/boletos/validar | Mis boletos / Validar acceso |
| GET /api/v1/boletos | Mis boletos / Validar acceso |
| GET /api/v1/catalogo/eventos | Cartelera y detalle público |
| GET /api/v1/catalogo/eventos/{id} | Cartelera y detalle público |
| POST /api/v1/categorias | Categorías & Artistas / Artistas del evento |
| GET /api/v1/categorias | Categorías & Artistas / Artistas del evento |
| GET /api/v1/categorias/{id} | Categorías & Artistas / Artistas del evento |
| PUT /api/v1/categorias/{id} | Categorías & Artistas / Artistas del evento |
| DELETE /api/v1/categorias/{id} | Categorías & Artistas / Artistas del evento |
| GET /api/v1/compras/{publicId} | Checkout / Mis compras |
| GET /api/v1/compras | Checkout / Mis compras |
| POST /api/v1/compras | Checkout / Mis compras |
| POST /api/v1/compras/{publicId}/cancelar | Checkout / Mis compras |
| POST /api/v1/ia/consultas | Chat José |
| GET /api/v1/cuentas | Cuentas & Liquidación |
| GET /api/v1/cuentas/{id} | Cuentas & Liquidación |
| GET /api/v1/cuentas/{id}/movimientos | Cuentas & Liquidación |
| POST /api/v1/cuentas/{id}/liquidar | Cuentas & Liquidación |
| POST /api/v1/cuentas/{id}/cerrar | Cuentas & Liquidación |
| PUT /api/v1/eventos/{eventoId}/localidades/{localidadId}/distribucion | Silletería Numerada / selector del checkout |
| GET /api/v1/eventos/{eventoId}/localidades/{localidadId}/distribucion | Silletería Numerada / selector del checkout |
| POST /api/v1/eventos/{eventoId}/localidades/{localidadId}/distribucion/publicar | Silletería Numerada / selector del checkout |
| GET /api/v1/eventos/{eventoId}/localidades/{localidadId}/asientos | Silletería Numerada / selector del checkout |
| POST /api/v1/eventos/{eventoId}/localidades/{localidadId}/asientos/bloquear | Silletería Numerada / selector del checkout |
| POST /api/v1/eventos/{eventoId}/localidades/{localidadId}/asientos/desbloquear | Silletería Numerada / selector del checkout |
| POST /api/v1/ia/documentos | Documentos RAG |
| GET /api/v1/ia/documentos | Documentos RAG |
| POST /api/v1/ia/documentos/{id}/versiones | Documentos RAG |
| GET /api/v1/ia/documentos/{id} | Documentos RAG |
| POST /api/v1/ia/documentos/{id}/desactivar | Documentos RAG |
| POST /api/v1/ia/documentos/{id}/reindexar | Documentos RAG |
| POST /api/v1/eventos/{eventoId}/presentadores | Categorías & Artistas / Artistas del evento |
| GET /api/v1/eventos/{eventoId}/presentadores | Categorías & Artistas / Artistas del evento |
| PUT /api/v1/eventos/{eventoId}/presentadores/{presentadorId} | Categorías & Artistas / Artistas del evento |
| DELETE /api/v1/eventos/{eventoId}/presentadores/{presentadorId} | Categorías & Artistas / Artistas del evento |
| POST /api/v1/eventos | Eventos & Entradas |
| GET /api/v1/eventos | Eventos & Entradas |
| GET /api/v1/eventos/{id} | Eventos & Entradas |
| PUT /api/v1/eventos/{id} | Eventos & Entradas |
| DELETE /api/v1/eventos/{id} | Eventos & Entradas |
| PUT /api/v1/eventos/{id}/estado | Eventos & Entradas |
| POST /api/v1/recintos/{id}/imagen-plano | Recintos & Planos / mapa público |
| POST /api/v1/eventos/{id}/imagen | Eventos & Entradas |
| POST /api/v1/presentadores/{id}/imagen | Categorías & Artistas / Artistas del evento |
| GET /api/v1/imagenes/{nombre} | Flyer, foto de presentador o plano |
| POST /api/v1/recintos/{recintoId}/localidades | Recintos & Planos / mapa público |
| GET /api/v1/recintos/{recintoId}/localidades | Recintos & Planos / mapa público |
| GET /api/v1/recintos/{recintoId}/localidades/{id} | Recintos & Planos / mapa público |
| PUT /api/v1/recintos/{recintoId}/localidades/{id} | Recintos & Planos / mapa público |
| DELETE /api/v1/recintos/{recintoId}/localidades/{id} | Recintos & Planos / mapa público |
| POST /api/v1/presentadores | Categorías & Artistas / Artistas del evento |
| GET /api/v1/presentadores | Categorías & Artistas / Artistas del evento |
| GET /api/v1/presentadores/{id} | Categorías & Artistas / Artistas del evento |
| PUT /api/v1/presentadores/{id} | Categorías & Artistas / Artistas del evento |
| DELETE /api/v1/presentadores/{id} | Categorías & Artistas / Artistas del evento |
| GET /api/v1/recintos/{id}/mapa | Recintos & Planos / mapa público |
| POST /api/v1/recintos | Recintos & Planos / mapa público |
| GET /api/v1/recintos | Recintos & Planos / mapa público |
| GET /api/v1/recintos/{id} | Recintos & Planos / mapa público |
| PUT /api/v1/recintos/{id} | Recintos & Planos / mapa público |
| DELETE /api/v1/recintos/{id} | Recintos & Planos / mapa público |
| POST /api/v1/compras/{publicId}/reembolsar | Cuentas & Liquidación |
| GET /api/v1/reportes/{codigo} | Reportes Excel / PDF |
| GET /api/v1/resenas/mis | Opiniones públicas / Mis reseñas / Moderación |
| PUT /api/v1/resenas/{id} | Opiniones públicas / Mis reseñas / Moderación |
| POST /api/v1/resenas/{id}/retirar | Opiniones públicas / Mis reseñas / Moderación |
| GET /api/v1/presentadores/{id}/calificacion | Opiniones del evento |
| GET /api/v1/eventos/{id}/resenas | Opiniones públicas / Mis reseñas / Moderación |
| GET /api/v1/resenas | Opiniones públicas / Mis reseñas / Moderación |
| POST /api/v1/resenas | Opiniones públicas / Mis reseñas / Moderación |
| PATCH /api/v1/resenas/{id}/moderar | Opiniones públicas / Mis reseñas / Moderación |
| POST /api/v1/eventos/{eventoId}/tipos-entrada | Eventos & Entradas |
| GET /api/v1/eventos/{eventoId}/tipos-entrada | Eventos & Entradas |
| PUT /api/v1/eventos/{eventoId}/tipos-entrada/{id} | Eventos & Entradas |
| DELETE /api/v1/eventos/{eventoId}/tipos-entrada/{id} | Eventos & Entradas |
| GET /api/v1/eventos/{eventoId}/tipos-entrada/{id} | Eventos & Entradas |
| GET /api/v1/usuarios | Mi perfil / Usuarios & Roles / cambio de contraseña |
| GET /api/v1/usuarios/{id} | Mi perfil / Usuarios & Roles / cambio de contraseña |
| PUT /api/v1/usuarios/{id} | Mi perfil / Usuarios & Roles / cambio de contraseña |
| DELETE /api/v1/usuarios/{id} | Mi perfil / Usuarios & Roles / cambio de contraseña |
| PUT /api/v1/usuarios/{id}/password | Mi perfil / Usuarios & Roles / cambio de contraseña |
| POST /api/v1/usuarios/administradores | Mi perfil / Usuarios & Roles / cambio de contraseña |
| POST /api/v1/usuarios/duenos-recinto | Mi perfil / Usuarios & Roles / cambio de contraseña |
