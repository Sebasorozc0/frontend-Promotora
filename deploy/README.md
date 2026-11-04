# Despliegue del frontend

Construye desde la raíz del repositorio del frontend.

```sh
docker build -t promotora-web .
```

Sirve el puerto 80 del contenedor detrás de un punto de entrada HTTPS para permitir el acceso a cámara. Configura `API_UPSTREAM` con el origen interno de la API y sin barra final. Por defecto usa `http://api:8080`, que requiere un servicio llamado `api` en la misma red de contenedores. El proxy conserva la ruta completa `/api/*`; las rutas de la aplicación resuelven a `index.html` al recargar.

Para un alojamiento estático alternativo, ejecuta `npm ci` y `npm run build`, publica `dist` y configura las mismas reglas de proxy y fallback. Mantén secretos de JWT, PostgreSQL, RabbitMQ e IA exclusivamente en el backend. El alta inicial del administrador también ocurre en la API. El frontend usa el formulario de inicio de sesión con esa cuenta y permite cambiar la contraseña inicial.

Tras desplegar, verifica que al recargar una ruta web se conserve la navegación, que `/api` alcance al backend y que carguen las imágenes subidas. Prueba inicio de sesión, catálogo y acceso a cámara por HTTPS.
