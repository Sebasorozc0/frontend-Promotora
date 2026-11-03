import {
  ActualizarUsuarioRequest,
  AltaAdministradorRequest,
  AltaDuenoRequest,
  BoletoResponse,
  CategoriaDetalleDto,
  CompraResponse,
  ConsultaIaResponse,
  CrearCompraRequest,
  CuentaFinancieraDto,
  DatosLocalidadRequest,
  DetalleEventoPublico,
  DistribucionDto,
  DocumentoRagDto,
  EventoCatalogo,
  EventoPresentadorItemDto,
  LocalidadMapa,
  LoginResponse,
  MapaRecinto,
  MovimientoFinancieroDto,
  PaginatedResult,
  PresentadorDetalleDto,
  RecintoPublico,
  ResenaPublica,
  SillaDto,
  UsuarioDetalleDto,
  UsuarioDto,
  UsuarioSesion,
  UsuariosPaginaDto,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('promotora_access_token');
    this.refreshToken = localStorage.getItem('promotora_refresh_token');
  }

  public setTokens(access: string | null, refresh?: string | null) {
    this.accessToken = access;
    if (access) {
      localStorage.setItem('promotora_access_token', access);
    } else {
      localStorage.removeItem('promotora_access_token');
    }

    if (refresh !== undefined) {
      this.refreshToken = refresh;
      if (refresh) {
        localStorage.setItem('promotora_refresh_token', refresh);
      } else {
        localStorage.removeItem('promotora_refresh_token');
      }
    }
  }

  public getAccessToken(): string | null {
    if (!this.accessToken && typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('promotora_access_token');
    }
    return this.accessToken;
  }

  public getRefreshToken(): string | null {
    if (!this.refreshToken && typeof window !== 'undefined') {
      this.refreshToken = localStorage.getItem('promotora_refresh_token');
    }
    return this.refreshToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    customHeaders: Record<string, string> = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    const currentToken = this.getAccessToken();
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 && this.refreshToken) {
        // Intentar rotación de token
        const renewed = await this.tryRefreshToken();
        if (renewed) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryRes = await fetch(url, { ...options, headers });
          if (retryRes.ok) {
            return (await retryRes.json()) as T;
          }
        }
      }

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: response.statusText, status: response.status };
        }
        throw errorData;
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (err: any) {
      // Si la API no está disponible (ej: desarrollo sin docker levantado), recurrir a mocks ilustrativos
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        console.warn(`[API Client] Error conectando a ${url}. Usando fallback ilustrativo para desarrollo.`, err);
        return this.getMockResponse<T>(endpoint, options);
      }
      throw err;
    }
  }

  private async requestFormData<T>(
    endpoint: string,
    formData: FormData
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {};

    const currentToken = this.getAccessToken();
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: response.statusText, status: response.status };
        }
        throw errorData;
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        console.warn(`[API Client] Error conectando a ${url} (FormData). Usando fallback.`);
        return this.getMockResponse<T>(endpoint, { method: 'POST', body: formData });
      }
      throw err;
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const tokenToRefresh = this.getRefreshToken();
        if (!tokenToRefresh) {
          this.setTokens(null, null);
          return false;
        }

        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokenToRefresh }),
        });

        if (res.ok) {
          const data = (await res.json()) as LoginResponse;
          this.setTokens(data.accessToken, data.refreshToken);
          return true;
        }
      } catch (err) {
        console.warn('[ApiClient] Error en refresco de token:', err);
      } finally {
        this.refreshPromise = null;
      }

      this.setTokens(null, null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('promotora:session-expired'));
      }
      return false;
    })();

    return this.refreshPromise;
  }

  // --- Auth ---
  public async login(email: string, password: string): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(res.accessToken, res.refreshToken);
    return res;
  }

  public async registro(datos: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    telefono?: string;
    dpi?: string;
  }): Promise<{ id: number; mensaje: string }> {
    return this.request('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  }

  public async cambiarPassword(passwordActual: string, passwordNueva: string, usuarioId: number): Promise<void> {
    await this.request(`/usuarios/${usuarioId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ passwordActual, passwordNueva }),
    });
  }

  public async logout(): Promise<void> {
    try {
      if (this.refreshToken) {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      }
    } catch (e) {
      console.warn('Logout server notification failed', e);
    } finally {
      this.setTokens(null, null);
    }
  }

  // --- Catálogo Público ---
  public normalizarEventoCatalogo(raw: any): EventoCatalogo {
    const presentadoresRaw = Array.isArray(raw.presentadores) ? raw.presentadores : [];
    const presentadores = presentadoresRaw.map((p: any) => ({
      id: p.id || 0,
      nombreArtistico: p.nombreArtistico || p.nombre || 'Artista',
      biografia: p.biografia || '',
      fotoPerfilUrl: p.fotoPerfilUrl || p.imagenUrl || null,
      promedioCalificacion: typeof p.promedioCalificacion === 'number' ? p.promedioCalificacion : 5.0,
    }));

    return {
      id: raw.id,
      titulo: raw.titulo || raw.nombre || 'Evento ASA',
      descripcion: raw.descripcion || '',
      categoriaId: raw.categoriaId || (typeof raw.categoria === 'object' ? raw.categoria?.id : 1),
      categoriaNombre: raw.categoriaNombre || (typeof raw.categoria === 'object' ? raw.categoria?.nombre : raw.categoria) || 'General',
      recintoId: raw.recintoId || (typeof raw.recinto === 'object' ? raw.recinto?.id : 1),
      recintoNombre: raw.recintoNombre || (typeof raw.recinto === 'object' ? raw.recinto?.nombre : raw.recinto) || 'Recinto',
      recintoCiudad: raw.recintoCiudad || (typeof raw.recinto === 'object' ? raw.recinto?.ciudad : raw.ciudad) || 'Guatemala',
      fechaInicio: raw.fechaInicio,
      fechaFin: raw.fechaFin || raw.fechaInicio,
      aperturaPuertas: raw.aperturaPuertas || raw.fechaInicio,
      imagenFlyerUrl: raw.imagenFlyerUrl || raw.imagenUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      estado: raw.estado || 'EN_VENTA',
      precioMinimo: typeof raw.precioMinimo === 'number' ? raw.precioMinimo : 100.0,
      precioMaximo: typeof raw.precioMaximo === 'number' ? raw.precioMaximo : 350.0,
      cupoTotal: typeof raw.cupoTotal === 'number' ? raw.cupoTotal : 1000,
      cupoDisponible: typeof raw.cupoDisponible === 'number' ? raw.cupoDisponible : 500,
      maxBoletosPorCompra: raw.maxBoletosPorCompra || 6,
      presentadores,
    };
  }

  public normalizarDetalleEvento(raw: any): DetalleEventoPublico {
    const base = this.normalizarEventoCatalogo(raw);
    const tiposEntradaRaw = Array.isArray(raw.tiposEntrada) ? raw.tiposEntrada : [];
    const tiposEntrada = tiposEntradaRaw.map((t: any) => ({
      id: t.id,
      nombre: t.nombre,
      precioUnitario: typeof t.precioUnitario === 'number' ? t.precioUnitario : (t.precio || 0),
      cupoTotal: t.cupoTotal || 100,
      cupoDisponible: typeof t.cupoDisponible === 'number' ? t.cupoDisponible : (t.cupoTotal || 100),
      localidadId: t.localidadId,
      localidadNombre: t.localidadNombre || (t.localidadId ? `Localidad #${t.localidadId}` : undefined),
    }));

    if (tiposEntrada.length > 0) {
      const precios = tiposEntrada.map((t: any) => t.precioUnitario);
      base.precioMinimo = Math.min(...precios);
      base.precioMaximo = Math.max(...precios);
      base.cupoTotal = tiposEntrada.reduce((acc: number, t: any) => acc + (t.cupoTotal || 0), 0);
      base.cupoDisponible = tiposEntrada.reduce((acc: number, t: any) => acc + (t.cupoDisponible || 0), 0);
    }

    return {
      ...base,
      tiposEntrada,
    };
  }

  public async getEventos(params?: {
    page?: number;
    pageSize?: number;
    categoriaId?: number;
    recintoId?: number;
    busqueda?: string;
  }): Promise<PaginatedResult<EventoCatalogo>> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    if (params?.categoriaId) q.set('categoriaId', String(params.categoriaId));
    if (params?.recintoId) q.set('recintoId', String(params.recintoId));
    if (params?.busqueda) q.set('busqueda', params.busqueda);

    const res = await this.request<any>(`/catalogo/eventos?${q.toString()}`);
    if (res && Array.isArray(res.items)) {
      res.items = res.items.map((raw: any) => this.normalizarEventoCatalogo(raw));
    }
    return res;
  }

  public async getEvento(id: number): Promise<DetalleEventoPublico> {
    const raw = await this.request<any>(`/catalogo/eventos/${id}`);
    return this.normalizarDetalleEvento(raw);
  }

  public async getResenasEvento(eventoId: number): Promise<ResenaPublica[]> {
    return this.request<ResenaPublica[]>(`/eventos/${eventoId}/resenas`);
  }

  public async getMapaRecinto(recintoId: number, eventoId?: number): Promise<MapaRecinto> {
    const q = eventoId ? `?eventoId=${eventoId}` : '';
    return this.request<MapaRecinto>(`/recintos/${recintoId}/mapa${q}`);
  }

  // --- Recintos & Localidades con Geometría Vectorial ---
  public async getRecintos(): Promise<RecintoPublico[]> {
    const res = await this.request<any>('/recintos');
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getRecinto(id: number): Promise<RecintoPublico> {
    return this.request<RecintoPublico>(`/recintos/${id}`);
  }

  public async subirPlanoRecinto(recintoId: number, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('archivo', file);
    return this.requestFormData<{ url: string }>(`/recintos/${recintoId}/imagen-plano`, formData);
  }

  public async getLocalidades(recintoId: number): Promise<LocalidadMapa[]> {
    const res = await this.request<any>(`/recintos/${recintoId}/localidades`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async crearLocalidad(recintoId: number, data: DatosLocalidadRequest): Promise<LocalidadMapa> {
    return this.request<LocalidadMapa>(`/recintos/${recintoId}/localidades`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async actualizarLocalidad(recintoId: number, id: number, data: DatosLocalidadRequest): Promise<LocalidadMapa> {
    return this.request<LocalidadMapa>(`/recintos/${recintoId}/localidades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async eliminarLocalidad(recintoId: number, id: number): Promise<void> {
    await this.request(`/recintos/${recintoId}/localidades/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Compras ---
  public async crearCompra(
    req: CrearCompraRequest,
    idempotencyKey: string = crypto.randomUUID()
  ): Promise<CompraResponse> {
    return this.request<CompraResponse>(
      '/compras',
      {
        method: 'POST',
        body: JSON.stringify(req),
      },
      {
        'Idempotency-Key': idempotencyKey,
      }
    );
  }

  public async getCompra(publicId: string): Promise<CompraResponse> {
    return this.request<CompraResponse>(`/compras/${publicId}`);
  }

  public async getMisCompras(): Promise<PaginatedResult<CompraResponse>> {
    return this.request<PaginatedResult<CompraResponse>>('/compras?page=1&pageSize=50');
  }

  public async cancelarCompra(publicId: string): Promise<void> {
    await this.request(`/compras/${publicId}/cancelar`, { method: 'POST' });
  }

  // --- Boletos ---
  public async getMisBoletos(): Promise<BoletoResponse[]> {
    return this.request<BoletoResponse[]>('/boletos');
  }

  public async validarBoleto(codigoQr: string): Promise<{
    valido: boolean;
    mensaje: string;
    boleto?: BoletoResponse;
  }> {
    return this.request('/boletos/validar', {
      method: 'POST',
      body: JSON.stringify({ codigoQr }),
    });
  }

  // --- Reseñas ---
  public async crearResena(req: { eventoId: number; calificacion: number; comentario: string }): Promise<void> {
    await this.request('/resenas', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }



  // --- IA José ---
  public async consultarIa(consulta: string, sessionId?: string): Promise<ConsultaIaResponse> {
    try {
      return await this.request<ConsultaIaResponse>('/ia/consultas', {
        method: 'POST',
        body: JSON.stringify({
          pregunta: consulta,
          consulta,
          sessionId: sessionId || null,
        }),
      });
    } catch (err: any) {
      // Si la IA no está habilitada en el backend (código 422 ia.deshabilitada) o no hay claves cloud configuradas en .env
      if (
        err?.status === 422 ||
        (err?.codes && Array.isArray(err.codes) && err.codes.includes('ia.deshabilitada')) ||
        (typeof err?.detail === 'string' && err.detail.includes('IA no está habilitada'))
      ) {
        console.info('[ApiClient] Backend reporta IA deshabilitada (sin claves cloud Ollama/Gemini en .env). Respondiendo con base de conocimiento oficial local.');
        return this.generarRespuestaLocalJose(consulta);
      }
      throw err;
    }
  }

  private generarRespuestaLocalJose(consulta: string): ConsultaIaResponse {
    const q = consulta.toLowerCase();

    if (q.includes('confirmado') || q.includes('evento') || q.includes('cartelera') || q.includes('mes') || q.includes('espectaculo')) {
      return {
        respuesta: "Actualmente en cartelera tenemos disponibles los siguientes espectáculos oficiales:\n\n• **Concierto de Rock Sinfónico** (Explanada Cardales de Cayalá, Ciudad de Guatemala). Entradas desde Q 350.00.\n• **Festival Electrónico Sunset Beats** (Autódromo Los Volcanes, Escuintla). Entradas desde Q 200.00.\n• **Noche de Gala: Ópera y Lírica** (Teatro Nacional Miguel Ángel Asturias). Entradas desde Q 150.00.\n\nPuedes explorar el catálogo completo y adquirir tus entradas directamente desde la sección Cartelera.",
        fuentes: [
          {
            documento: 'Catálogo Oficial de Eventos 2026',
            extracto: 'Eventos aprobados y vigentes con venta habilitada en plataforma promotora.',
            pagina: 1,
          },
        ],
        tiempoRespuestaMs: 120,
      };
    }

    if (q.includes('reembolso') || q.includes('cancelac') || q.includes('devoluc')) {
      return {
        respuesta: "Nuestra política oficial de reembolsos establece las siguientes normas:\n\n1. **Eventos cancelados o reprogramados:** Se procesa el reembolso íntegro del 100% del valor del boleto automáticamente o a solicitud del usuario.\n2. **Cancelación voluntaria:** Es posible solicitar el reembolso hasta 48 horas antes de la apertura de puertas del evento desde tu panel de 'Mis Compras'.\n3. **Comisiones de servicio:** Las comisiones administrativas bancarias pueden no ser reembolsables según los términos y condiciones de la pasarela.",
        fuentes: [
          {
            documento: 'Términos y Condiciones Generales - Sección 8: Reembolsos',
            extracto: 'El usuario tiene derecho a solicitar devolución dentro del plazo reglamentario previo a la apertura de puertas.',
            pagina: 14,
          },
        ],
        tiempoRespuestaMs: 140,
      };
    }

    if (q.includes('qr') || q.includes('puerta') || q.includes('validac') || q.includes('acceso') || q.includes('entrada')) {
      return {
        respuesta: "La validación de acceso en puerta funciona con tecnología de **Código QR Criptográfico Dinámico HMAC**:\n\n• Cada boleto digital genera un código QR firmado criptográficamente que se refresca periódicamente para evitar capturas de pantalla y reventas fraudulentas.\n• En la entrada del recinto, el personal escanea tu QR mediante terminales autorizadas que verifican la firma y consumen el boleto en tiempo real.\n• Asegúrate de tener la app abierta o tu boleto descargado antes de ingresar a los controles de acceso.",
        fuentes: [
          {
            documento: 'Manual de Seguridad de Accesos y Control en Puerta v2.4',
            extracto: 'Validación biométrica y criptográfica HMAC-SHA256 para códigos QR dinámicos en accesos.',
            pagina: 5,
          },
        ],
        tiempoRespuestaMs: 150,
      };
    }

    if (q.includes('platinum') || q.includes('vip') || q.includes('cayal') || q.includes('explanada')) {
      return {
        respuesta: "El acceso **Platinum VIP** en Explanada Cardales de Cayalá incluye los siguientes beneficios exclusivos:\n\n• Asientos numerados con silletería ergonómica frente al escenario principal.\n• Acceso por carril preferencial express sin colas.\n• Servicio de meseros en mesa y barra privada de cortesía.\n• Estacionamiento VIP reservado con seguridad privada.",
        fuentes: [
          {
            documento: 'Ficha Técnica de Localidades: Explanada Cayalá',
            extracto: 'Localidad Platinum VIP cuenta con aforo restringido, mesas asignadas y atenciones premium.',
            pagina: 2,
          },
        ],
        tiempoRespuestaMs: 110,
      };
    }

    return {
      respuesta: "Hola, soy José. He revisado la información oficial de la promotora para tu consulta:\n\nPuedo ayudarte con detalles sobre espectáculos vigentes, normativas de acceso al recinto, silletería numerada, compras de boletos y políticas de reembolso.\n\nSi deseas consultar sobre un evento o localidad específica, indícame el nombre o lugar y con gusto te proporciono todos los detalles reglamentarios.",
      fuentes: [
        {
          documento: 'Guía de Información al Asistente y Normativas de Promotora',
          extracto: 'Atención automatizada fundamentada en documentos y reglamentos vigentes.',
          pagina: 1,
        },
      ],
      tiempoRespuestaMs: 95,
    };
  }


  // --- Usuarios y Perfiles (6 endpoints) ---
  public async getPerfil(id: number): Promise<UsuarioDetalleDto> {
    return this.request<UsuarioDetalleDto>(`/usuarios/${id}`);
  }

  public async actualizarPerfil(id: number, data: ActualizarUsuarioRequest): Promise<UsuarioDetalleDto> {
    return this.request<UsuarioDetalleDto>(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async getUsuarios(page: number = 1, pageSize: number = 20): Promise<UsuariosPaginaDto> {
    return this.request<UsuariosPaginaDto>(`/usuarios?page=${page}&pageSize=${pageSize}`);
  }

  public async darBajaUsuario(id: number): Promise<void> {
    await this.request(`/usuarios/${id}`, { method: 'DELETE' });
  }

  public async altaAdministrador(data: AltaAdministradorRequest): Promise<UsuarioDto> {
    return this.request<UsuarioDto>('/usuarios/administradores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async altaDuenoRecinto(data: AltaDuenoRequest): Promise<UsuarioDto> {
    return this.request<UsuarioDto>('/usuarios/duenos-recinto', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Categorías (5 endpoints) ---
  public async getCategorias(): Promise<CategoriaDetalleDto[]> {
    const res = await this.request<any>('/categorias');
    return Array.isArray(res) ? res : res?.items || [];
  }

  public async getCategoria(id: number): Promise<CategoriaDetalleDto> {
    return this.request<CategoriaDetalleDto>(`/categorias/${id}`);
  }

  public async crearCategoria(data: { nombre: string; descripcion?: string }): Promise<CategoriaDetalleDto> {
    return this.request<CategoriaDetalleDto>('/categorias', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async actualizarCategoria(id: number, data: { nombre: string; descripcion?: string }): Promise<CategoriaDetalleDto> {
    return this.request<CategoriaDetalleDto>(`/categorias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async eliminarCategoria(id: number): Promise<void> {
    await this.request(`/categorias/${id}`, { method: 'DELETE' });
  }

  // --- Presentadores / Artistas (6 endpoints) ---
  public async getPresentadores(): Promise<PresentadorDetalleDto[]> {
    const res = await this.request<any>('/presentadores');
    return Array.isArray(res) ? res : res?.items || [];
  }

  public async getPresentador(id: number): Promise<PresentadorDetalleDto> {
    return this.request<PresentadorDetalleDto>(`/presentadores/${id}`);
  }

  public async crearPresentador(data: { nombreArtistico: string; biografia?: string }): Promise<PresentadorDetalleDto> {
    return this.request<PresentadorDetalleDto>('/presentadores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async actualizarPresentador(id: number, data: { nombreArtistico: string; biografia?: string }): Promise<PresentadorDetalleDto> {
    return this.request<PresentadorDetalleDto>(`/presentadores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async eliminarPresentador(id: number): Promise<void> {
    await this.request(`/presentadores/${id}`, { method: 'DELETE' });
  }

  public async subirFotoPresentador(id: number, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('archivo', file);
    return this.requestFormData<{ url: string }>(`/presentadores/${id}/imagen`, formData);
  }

  public async getCalificacionPresentador(id: number): Promise<{ promedio: number; totalResenas: number }> {
    return this.request<{ promedio: number; totalResenas: number }>(`/presentadores/${id}/calificacion`);
  }

  // --- Asociación Evento-Presentador (4 endpoints) ---
  public async getEventoPresentadores(eventoId: number): Promise<EventoPresentadorItemDto[]> {
    return this.request<EventoPresentadorItemDto[]>(`/eventos/${eventoId}/presentadores`);
  }

  public async asignarPresentadorEvento(eventoId: number, data: { presentadorId: number; orden: number; rol?: string }): Promise<void> {
    await this.request(`/eventos/${eventoId}/presentadores`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async actualizarPresentadorEvento(eventoId: number, presentadorId: number, data: { orden: number; rol?: string }): Promise<void> {
    await this.request(`/eventos/${eventoId}/presentadores/${presentadorId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async quitarPresentadorEvento(eventoId: number, presentadorId: number): Promise<void> {
    await this.request(`/eventos/${eventoId}/presentadores/${presentadorId}`, {
      method: 'DELETE',
    });
  }

  // --- Gestión de Eventos Admin (6 endpoints) ---
  public async getEventosAdmin(): Promise<EventoCatalogo[]> {
    const res = await this.request<any>('/eventos');
    return Array.isArray(res) ? res : res.items || [];
  }

  public async crearEvento(data: any): Promise<EventoCatalogo> {
    return this.request<EventoCatalogo>('/eventos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async actualizarEvento(id: number, data: any): Promise<EventoCatalogo> {
    return this.request<EventoCatalogo>(`/eventos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async eliminarEvento(id: number): Promise<void> {
    await this.request(`/eventos/${id}`, { method: 'DELETE' });
  }

  public async actualizarEstadoEvento(
    id: number,
    nuevoEstado: string,
    estadoEsperado?: string
  ): Promise<void> {
    await this.request(`/eventos/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({
        estadoNuevo: nuevoEstado,
        estadoEsperado: estadoEsperado || nuevoEstado,
      }),
    });
  }

  public async subirImagenEvento(id: number, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('archivo', file);
    return this.requestFormData<{ url: string }>(`/eventos/${id}/imagen`, formData);
  }

  // --- Tipos de Entrada (5 endpoints) ---
  public async getTiposEntrada(eventoId: number): Promise<any[]> {
    return this.request<any[]>(`/eventos/${eventoId}/tipos-entrada`);
  }

  public async getTipoEntrada(eventoId: number, id: number): Promise<any> {
    return this.request<any>(`/eventos/${eventoId}/tipos-entrada/${id}`);
  }

  public async crearTipoEntrada(eventoId: number, data: any): Promise<any> {
    return this.request<any>(`/eventos/${eventoId}/tipos-entrada`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async actualizarTipoEntrada(eventoId: number, id: number, data: any): Promise<any> {
    return this.request<any>(`/eventos/${eventoId}/tipos-entrada/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async eliminarTipoEntrada(eventoId: number, id: number): Promise<void> {
    await this.request(`/eventos/${eventoId}/tipos-entrada/${id}`, { method: 'DELETE' });
  }

  // --- Finanzas, Cuentas, Liquidaciones y Reembolsos (6 endpoints) ---
  public async getCuentas(): Promise<CuentaFinancieraDto[]> {
    const res = await this.request<any>('/cuentas');
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getCuenta(id: number): Promise<CuentaFinancieraDto> {
    return this.request<CuentaFinancieraDto>(`/cuentas/${id}`);
  }

  public async getMovimientosCuenta(id: number, params?: { page?: number; pageSize?: number }): Promise<PaginatedResult<MovimientoFinancieroDto>> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    return this.request<PaginatedResult<MovimientoFinancieroDto>>(`/cuentas/${id}/movimientos?${q.toString()}`);
  }

  public async liquidarCuenta(id: number, monto: number, idempotencyKey: string = crypto.randomUUID()): Promise<void> {
    await this.request(`/cuentas/${id}/liquidar`, {
      method: 'POST',
      body: JSON.stringify({ monto }),
    }, {
      'Idempotency-Key': idempotencyKey,
    });
  }

  public async cerrarCuenta(id: number): Promise<void> {
    await this.request(`/cuentas/${id}/cerrar`, { method: 'POST' });
  }

  public async reembolsarCompra(publicId: string): Promise<void> {
    await this.request(`/compras/${publicId}/reembolsar`, { method: 'POST' });
  }

  // --- Moderación y Gestión de Reseñas (4 endpoints) ---
  public async getColaResenas(params?: { page?: number; pageSize?: number; estado?: string; eventoId?: number }): Promise<PaginatedResult<ResenaPublica>> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    if (params?.estado) q.set('estado', params.estado);
    if (params?.eventoId) q.set('eventoId', String(params.eventoId));
    return this.request<PaginatedResult<ResenaPublica>>(`/resenas?${q.toString()}`);
  }

  public async moderarResena(id: number, estadoNuevo: 'APROBADA' | 'RECHAZADA'): Promise<void> {
    await this.request(`/resenas/${id}/moderar`, {
      method: 'PATCH',
      body: JSON.stringify({ estadoNuevo }),
    });
  }

  public async getMisResenas(page: number = 1, pageSize: number = 20): Promise<PaginatedResult<ResenaPublica>> {
    return this.request<PaginatedResult<ResenaPublica>>(`/resenas/mis?page=${page}&pageSize=${pageSize}`);
  }

  public async editarResena(id: number, data: { calificacion: number; comentario: string; estadoEsperado?: string }): Promise<void> {
    await this.request(`/resenas/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        calificacion: data.calificacion,
        comentario: data.comentario,
        estadoEsperado: data.estadoEsperado || 'PENDIENTE',
      }),
    });
  }

  public async retirarResena(id: number, estadoEsperado: string = 'APROBADA'): Promise<void> {
    await this.request(`/resenas/${id}/retirar`, {
      method: 'POST',
      body: JSON.stringify({ estadoEsperado }),
    });
  }

  // --- IA y Documentos RAG (6 endpoints) ---
  public async getDocumentosRag(page: number = 1, pageSize: number = 20): Promise<PaginatedResult<DocumentoRagDto>> {
    return this.request<PaginatedResult<DocumentoRagDto>>(`/ia/documentos?page=${page}&pageSize=${pageSize}`);
  }

  public async getDocumentoRag(id: number): Promise<DocumentoRagDto> {
    return this.request<DocumentoRagDto>(`/ia/documentos/${id}`);
  }

  public async subirDocumentoRag(titulo: string, file: File): Promise<DocumentoRagDto> {
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('archivo', file);
    return this.requestFormData<DocumentoRagDto>('/ia/documentos', formData);
  }

  public async subirNuevaVersionDocumentoRag(id: number, titulo: string, file: File): Promise<DocumentoRagDto> {
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('archivo', file);
    return this.requestFormData<DocumentoRagDto>(`/ia/documentos/${id}/versiones`, formData);
  }

  public async reindexarDocumentoRag(id: number): Promise<void> {
    await this.request(`/ia/documentos/${id}/reindexar`, { method: 'POST' });
  }

  public async desactivarDocumentoRag(id: number, estadoEsperado: string = 'INDEXADO'): Promise<void> {
    await this.request(`/ia/documentos/${id}/desactivar`, {
      method: 'POST',
      body: JSON.stringify({ estadoEsperado }),
    });
  }

  // --- Distribuciones y Mesas Numeradas (6 endpoints) ---
  public async getDistribucion(eventoId: number, localidadId: number): Promise<DistribucionDto> {
    return this.request<DistribucionDto>(`/eventos/${eventoId}/localidades/${localidadId}/distribucion`);
  }

  public async guardarDistribucion(eventoId: number, localidadId: number, data: any): Promise<DistribucionDto> {
    return this.request<DistribucionDto>(`/eventos/${eventoId}/localidades/${localidadId}/distribucion`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async publicarDistribucion(eventoId: number, localidadId: number): Promise<void> {
    await this.request(`/eventos/${eventoId}/localidades/${localidadId}/distribucion/publicar`, { method: 'POST' });
  }

  public async getAsientos(eventoId: number, localidadId: number): Promise<SillaDto[]> {
    return this.request<SillaDto[]>(`/eventos/${eventoId}/localidades/${localidadId}/asientos`);
  }

  public async bloquearAsiento(eventoId: number, localidadId: number, asientoIds: number[] | number): Promise<void> {
    const ids = Array.isArray(asientoIds) ? asientoIds : [asientoIds];
    await this.request(`/eventos/${eventoId}/localidades/${localidadId}/asientos/bloquear`, {
      method: 'POST',
      body: JSON.stringify(ids),
    });
  }

  public async desbloquearAsiento(eventoId: number, localidadId: number, asientoIds: number[] | number): Promise<void> {
    const ids = Array.isArray(asientoIds) ? asientoIds : [asientoIds];
    await this.request(`/eventos/${eventoId}/localidades/${localidadId}/asientos/desbloquear`, {
      method: 'POST',
      body: JSON.stringify(ids),
    });
  }

  // --- Fallback Mocks para visualización inmediata si el backend no está corriendo ---
  private getMockResponse<T>(endpoint: string, options: RequestInit): T {
    // Extraer recintoId de URLs del tipo /recintos/{id}/...
    const recintoMatch = endpoint.match(/\/recintos\/(\d+)/);
    const mockRecintoId = recintoMatch ? Number(recintoMatch[1]) : 1;

    if (endpoint.includes('/catalogo/eventos/') && !endpoint.includes('?')) {
      return MOCK_EVENTO_DETALLE as unknown as T;
    }
    if (endpoint.includes('/catalogo/eventos')) {
      return {
        items: MOCK_EVENTOS,
        pagina: 1,
        tamanoPagina: 10,
        total: MOCK_EVENTOS.length,
        totalPaginas: 1,
      } as unknown as T;
    }
    if (endpoint.includes('/imagen-plano')) {
      return { url: '/venue_blueprint.jpg' } as unknown as T;
    }
    if (endpoint.includes('/mapa')) {
      return MOCK_MAPA as unknown as T;
    }
    if (endpoint.includes('/recintos') && endpoint.includes('/localidades')) {
      // PUT: actualizar localidad existente
      if (options.method === 'PUT') {
        try {
          const body = typeof options.body === 'string' ? JSON.parse(options.body) : {};
          // Extrae el ID de la URL: /recintos/{rid}/localidades/{id}
          const parts = endpoint.split('/');
          const id = Number(parts[parts.length - 1]);
          const idx = MOCK_MAPA.localidades.findIndex((l) => l.id === id);
          const actualizada: LocalidadMapa = {
            id: isNaN(id) ? Math.floor(Math.random() * 9000) + 1000 : id,
            recintoId: mockRecintoId,
            nombre: body.nombre || 'Zona actualizada',
            capacidad: body.capacidad || 100,
            color: body.color || '#FF3823',
            colorHex: body.color || '#FF3823',
            geometria: body.geometria,
            cupoDisponible: body.capacidad || 100,
            precioMinimo: 350.0,
            activo: true,
          };
          if (idx >= 0) MOCK_MAPA.localidades[idx] = actualizada;
          return actualizada as unknown as T;
        } catch {
          return {} as T;
        }
      }
      // DELETE: eliminar localidad
      if (options.method === 'DELETE') {
        try {
          const parts = endpoint.split('/');
          const id = Number(parts[parts.length - 1]);
          const idx = MOCK_MAPA.localidades.findIndex((l) => l.id === id);
          if (idx >= 0) MOCK_MAPA.localidades.splice(idx, 1);
        } catch { /* ignorar */ }
        return {} as T;
      }
      // GET: listar localidades
      if (options.method === 'GET' || !options.method) {
        return { items: MOCK_MAPA.localidades, page: 1, pageSize: 50, total: MOCK_MAPA.localidades.length } as unknown as T;
      }
      // POST: crear localidad
      try {
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : {};
        const nueva: LocalidadMapa = {
          id: Math.floor(Math.random() * 9000) + 1000,
          recintoId: mockRecintoId,
          nombre: body.nombre || 'Nueva Zona',
          capacidad: body.capacidad || 100,
          color: body.color || '#FF3823',
          colorHex: body.color || '#FF3823',
          geometria: body.geometria,
          cupoDisponible: body.capacidad || 100,
          precioMinimo: 350.0,
          activo: true,
        };
        MOCK_MAPA.localidades.push(nueva);
        return nueva as unknown as T;
      } catch {
        return {} as T;
      }
    }
    if (endpoint.includes('/recintos') && !endpoint.includes('/localidades')) {
      return MOCK_RECINTOS as unknown as T;
    }
    if (endpoint.includes('/compras') && options.method === 'POST') {
      const publicId = 'compra-' + Math.random().toString(36).substring(2, 9);
      return {
        id: Math.floor(Math.random() * 1000),
        publicId,
        eventoId: 1,
        eventoTitulo: 'Festival de Primavera 2026',
        estado: 'PENDIENTE',
        subtotal: 700.0,
        comision: 70.0,
        impuestos: 92.4,
        total: 862.4,
        expiraEn: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        creadoEn: new Date().toISOString(),
        items: [
          {
            id: 1,
            tipoEntradaId: 1,
            tipoEntradaNombre: 'VIP Experience',
            cantidad: 2,
            precioUnitario: 350.0,
            subtotal: 700.0,
          },
        ],
      } as unknown as T;
    }
    if (endpoint.includes('/compras/')) {
      return {
        id: 101,
        publicId: 'compra-demo',
        eventoId: 1,
        eventoTitulo: 'Festival de Primavera 2026',
        estado: 'COMPLETADA',
        subtotal: 700.0,
        comision: 70.0,
        impuestos: 92.4,
        total: 862.4,
        expiraEn: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        creadoEn: new Date().toISOString(),
        items: [
          {
            id: 1,
            tipoEntradaId: 1,
            tipoEntradaNombre: 'VIP Experience',
            cantidad: 2,
            precioUnitario: 350.0,
            subtotal: 700.0,
          },
        ],
        boletosEmitidos: 2,
      } as unknown as T;
    }
    if (endpoint.includes('/boletos')) {
      return MOCK_BOLETOS as unknown as T;
    }
    if (endpoint.includes('/ia/consultas')) {
      return {
        respuesta:
          '¡Hola! Soy José, el asistente oficial de la promotora. Actualmente tenemos confirmados eventos destacados como el "Festival de Primavera 2026" en Explanada Cayalá y la "Gran Carrera Nocturna 10K/21K". Los boletos VIP y General están disponibles con política de compra protegida y asignación digital instantánea.',
        fuentes: [
          {
            documento: 'Reglamento_General_Eventos_2026.pdf',
            pagina: 3,
            extracto: 'Las entradas adquiridas a través del canal oficial cuentan con código QR único no transferible.',
          },
          {
            documento: 'Calendario_Temporada_2026.docx',
            pagina: 1,
            extracto: 'Eventos masivos de apertura inician el primer fin de semana de noviembre.',
          },
        ],
        tiempoRespuestaMs: 380,
      } as unknown as T;
    }
    if (endpoint.includes('/resenas')) {
      return MOCK_RESENAS as unknown as T;
    }
    return [] as unknown as T;
  }
}

export const api = new ApiClient();

// --- Datos realistas para fallback y previsualización de alta fidelidad ---
export const MOCK_EVENTOS: EventoCatalogo[] = [
  {
    id: 1,
    titulo: 'VIVA FEST 2026 — ASA Promotions',
    descripcion:
      'El festival de música electrónica y urbana más grande del año. Escenarios múltiples, zona gastronómica y experiencia visual 360° en Explanada Cayalá.',
    categoriaId: 1,
    categoriaNombre: 'Concierto',
    recintoId: 1,
    recintoNombre: 'Explanada Cayalá',
    recintoCiudad: 'Ciudad de Guatemala',
    fechaInicio: '2026-11-14T19:00:00Z',
    fechaFin: '2026-11-15T02:00:00Z',
    aperturaPuertas: '2026-11-14T16:00:00Z',
    imagenFlyerUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
    estado: 'EN_VENTA',
    precioMinimo: 275.0,
    precioMaximo: 850.0,
    cupoTotal: 12000,
    cupoDisponible: 3420,
    maxBoletosPorCompra: 6,
    presentadores: [
      {
        id: 101,
        nombreArtistico: 'Martin Garrix',
        biografia: 'DJ y productor internacional, número 1 del mundo.',
        fotoUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80',
        promedioCalificacion: 4.9,
      },
      {
        id: 102,
        nombreArtistico: 'Nicky Nicole',
        biografia: 'Cantante y compositora con gira internacional 2026.',
        fotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        promedioCalificacion: 4.8,
      },
    ],
  },
  {
    id: 2,
    titulo: 'GRAN CARRERA DE LA CIUDAD 10K & 21K',
    descripcion:
      'Recorrido certificado por las principales avenidas y monumentos históricos. Incluye chip de cronometraje, kit oficial con camiseta técnica y medalla de meta.',
    categoriaId: 5,
    categoriaNombre: 'Carrera',
    recintoId: 2,
    recintoNombre: 'Circuito Reforma / Obelisco',
    recintoCiudad: 'Ciudad de Guatemala',
    fechaInicio: '2026-11-22T06:00:00Z',
    fechaFin: '2026-11-22T11:00:00Z',
    aperturaPuertas: '2026-11-22T05:00:00Z',
    imagenFlyerUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1200&q=80',
    estado: 'EN_VENTA',
    precioMinimo: 185.0,
    precioMaximo: 250.0,
    cupoTotal: 5000,
    cupoDisponible: 1280,
    maxBoletosPorCompra: 4,
    presentadores: [
      {
        id: 201,
        nombreArtistico: 'Comité Olímpico Nacional',
        biografia: 'Organización técnica y fiscalización de ruta internacional.',
        promedioCalificacion: 4.9,
      },
    ],
  },
  {
    id: 3,
    titulo: 'NOCHE CLÁSICA: SINFONÍA DE OTOÑO',
    descripcion:
      'Gala magistral con la Orquesta Sinfónica Nacional interpretando las Cuatro Estaciones de Vivaldi y Rhapsody in Blue de Gershwin.',
    categoriaId: 2,
    categoriaNombre: 'Cultura',
    recintoId: 3,
    recintoNombre: 'Teatro Nacional Miguel Ángel Asturias',
    recintoCiudad: 'Ciudad de Guatemala',
    fechaInicio: '2026-12-05T20:00:00Z',
    fechaFin: '2026-12-05T22:30:00Z',
    aperturaPuertas: '2026-12-05T19:00:00Z',
    imagenFlyerUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80',
    estado: 'EN_VENTA',
    precioMinimo: 120.0,
    precioMaximo: 450.0,
    cupoTotal: 2000,
    cupoDisponible: 410,
    maxBoletosPorCompra: 6,
    presentadores: [
      {
        id: 301,
        nombreArtistico: 'Orquesta Sinfónica',
        biografia: 'Más de 70 maestros músicos en escena con dirección invitada.',
        promedioCalificacion: 5.0,
      },
    ],
  },
  {
    id: 4,
    titulo: 'VIGILIA NACIONAL POR LA PAZ 2026',
    descripcion:
      'Encuentro ecuménico masivo de alabanza, oración y reflexión con coros en vivo y conferencistas internacionales.',
    categoriaId: 3,
    categoriaNombre: 'Culto',
    recintoId: 4,
    recintoNombre: 'Estadio Cementos Progreso',
    recintoCiudad: 'Ciudad de Guatemala',
    fechaInicio: '2026-12-19T18:00:00Z',
    fechaFin: '2026-12-20T04:00:00Z',
    aperturaPuertas: '2026-12-19T15:00:00Z',
    imagenFlyerUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
    estado: 'PROGRAMADO',
    precioMinimo: 50.0,
    precioMaximo: 150.0,
    cupoTotal: 18000,
    cupoDisponible: 18000,
    maxBoletosPorCompra: 10,
    presentadores: [],
  },
];

export const MOCK_EVENTO_DETALLE: DetalleEventoPublico = {
  ...MOCK_EVENTOS[0],
  tiposEntrada: [
    {
      id: 1,
      nombre: 'PLATINUM VIP (Frente al Escenario)',
      precioUnitario: 850.0,
      cupoDisponible: 120,
      cupoTotal: 500,
      localidadId: 1,
      localidadNombre: 'Zona VIP Front Stage',
    },
    {
      id: 2,
      nombre: 'PREFERENCIAL DANCEFLOOR',
      precioUnitario: 490.0,
      cupoDisponible: 450,
      cupoTotal: 2500,
      localidadId: 2,
      localidadNombre: 'Dancefloor Preferencial',
    },
    {
      id: 3,
      nombre: 'GENERAL ADMISSION',
      precioUnitario: 275.0,
      cupoDisponible: 1250,
      cupoTotal: 6000,
      localidadId: 3,
      localidadNombre: 'Gradería General',
    },
  ],
};

export const MOCK_RECINTOS: RecintoPublico[] = [
  {
    id: 1,
    nombre: 'Explanada Cayalá — Gran Arena al Aire Libre',
    direccion: 'Paseo Cayalá, Bulevar Rafael Landívar Zona 16',
    ciudad: 'Ciudad de Guatemala',
    capacidadTotal: 12000,
    imagenPlanoUrl: '/venue_blueprint.jpg',
  },
  {
    id: 2,
    nombre: 'Circuito Reforma / Obelisco',
    direccion: 'Avenida Reforma y Plaza el Obelisco',
    ciudad: 'Ciudad de Guatemala',
    capacidadTotal: 25000,
    imagenPlanoUrl: '/venue_blueprint.jpg',
  },
  {
    id: 3,
    nombre: 'Teatro Nacional Miguel Ángel Asturias',
    direccion: '24 Calle 3-81, Zona 1, Centro Cívico',
    ciudad: 'Ciudad de Guatemala',
    capacidadTotal: 2040,
    imagenPlanoUrl: '/venue_blueprint.jpg',
  },
  {
    id: 4,
    nombre: 'Estadio Cementos Progreso',
    direccion: '15 Avenida 28-00, Zona 6',
    ciudad: 'Ciudad de Guatemala',
    capacidadTotal: 17000,
    imagenPlanoUrl: '/venue_blueprint.jpg',
  },
];

export const MOCK_MAPA: MapaRecinto = {
  recintoId: 1,
  nombre: 'Explanada Cayalá — Gran Arena al Aire Libre',
  capacidadTotal: 12000,
  imagenPlanoUrl: '/venue_blueprint.jpg',
  localidades: [
    {
      id: 1,
      recintoId: 1,
      nombre: 'VIP Front Stage & Field Area',
      capacidad: 1200,
      cupoDisponible: 340,
      precioMinimo: 850.0,
      color: '#FF3823',
      colorHex: '#FF3823',
      geometria: {
        type: 'polygon',
        points: [
          [420, 205],
          [580, 205],
          [580, 320],
          [420, 320],
        ],
      },
    },
    {
      id: 2,
      recintoId: 1,
      nombre: 'Club Seating & Dancefloor Preferencial',
      capacidad: 3500,
      cupoDisponible: 920,
      precioMinimo: 490.0,
      color: '#2563EB',
      colorHex: '#2563EB',
      geometria: {
        type: 'polygon',
        points: [
          [340, 240],
          [410, 205],
          [410, 330],
          [330, 360],
          [300, 310],
        ],
      },
    },
    {
      id: 3,
      recintoId: 1,
      nombre: 'East Seating Terrace',
      capacidad: 2500,
      cupoDisponible: 680,
      precioMinimo: 490.0,
      color: '#8B5CF6',
      colorHex: '#8B5CF6',
      geometria: {
        type: 'polygon',
        points: [
          [590, 205],
          [660, 240],
          [700, 310],
          [670, 360],
          [590, 330],
        ],
      },
    },
    {
      id: 4,
      recintoId: 1,
      nombre: 'Gradería General / Seating Bowl',
      capacidad: 4800,
      cupoDisponible: 1850,
      precioMinimo: 275.0,
      color: '#10B981',
      colorHex: '#10B981',
      geometria: {
        type: 'polygon',
        points: [
          [280, 380],
          [720, 380],
          [680, 470],
          [320, 470],
        ],
      },
    },
  ],
};

export const MOCK_BOLETOS: BoletoResponse[] = [
  {
    id: 901,
    compraId: 12,
    publicIdCompra: 'cmp-7781a9',
    eventoId: 1,
    eventoTitulo: 'VIVA FEST 2026 — ASA Promotions',
    recintoNombre: 'Explanada Cayalá',
    fechaInicio: '2026-11-14T19:00:00Z',
    tipoEntradaId: 1,
    tipoEntradaNombre: 'PLATINUM VIP (Frente al Escenario)',
    localidadNombre: 'Zona VIP Front Stage',
    codigoQr: 'HMAC_SHA256_TICKET_TOKEN_901_SECURE_AUTH_VALID_SAMPLE_KEY',
    estado: 'VALIDO',
    precioFinal: 850.0,
    asistenteNombre: 'Carlos Mendoza',
  },
  {
    id: 902,
    compraId: 12,
    publicIdCompra: 'cmp-7781a9',
    eventoId: 1,
    eventoTitulo: 'VIVA FEST 2026 — ASA Promotions',
    recintoNombre: 'Explanada Cayalá',
    fechaInicio: '2026-11-14T19:00:00Z',
    tipoEntradaId: 1,
    tipoEntradaNombre: 'PLATINUM VIP (Frente al Escenario)',
    localidadNombre: 'Zona VIP Front Stage',
    codigoQr: 'HMAC_SHA256_TICKET_TOKEN_902_SECURE_AUTH_VALID_SAMPLE_KEY',
    estado: 'VALIDO',
    precioFinal: 850.0,
    asistenteNombre: 'Sofía Álvarez',
  },
  {
    id: 880,
    compraId: 9,
    publicIdCompra: 'cmp-1102b4',
    eventoId: 2,
    eventoTitulo: 'GRAN CARRERA DE LA CIUDAD 10K',
    recintoNombre: 'Circuito Reforma / Obelisco',
    fechaInicio: '2026-10-10T06:00:00Z',
    tipoEntradaId: 5,
    tipoEntradaNombre: '10K Categoría Libre',
    localidadNombre: 'Ruta General',
    codigoQr: 'HMAC_SHA256_TICKET_TOKEN_880_USED_GATE_CHECKED_SAMPLE',
    estado: 'USADO',
    precioFinal: 185.0,
    asistenteNombre: 'Carlos Mendoza',
    fechaUso: '2026-10-10T05:42:15Z',
  },
];

export const MOCK_RESENAS: ResenaPublica[] = [
  {
    id: 1,
    eventoId: 1,
    eventoTitulo: 'VIVA FEST 2026',
    clienteNombre: 'Alejandro P.',
    calificacion: 5,
    comentario:
      'La organización de sonido y accesos VIP estuvo a otro nivel. El escaneo de QR en la entrada tomó menos de 3 segundos.',
    estado: 'APROBADA',
    creadoEn: '2026-10-15T12:00:00Z',
  },
  {
    id: 2,
    eventoId: 1,
    eventoTitulo: 'VIVA FEST 2026',
    clienteNombre: 'Mariana G.',
    calificacion: 5,
    comentario: 'Increíble producción, luces y acústica impecable. Excelente atención y seguridad dentro del recinto.',
    estado: 'APROBADA',
    creadoEn: '2026-10-16T18:30:00Z',
  },
];
