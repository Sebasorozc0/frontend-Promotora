import {
  BoletoResponse,
  CompraResponse,
  ConsultaIaResponse,
  CrearCompraRequest,
  DatosLocalidadRequest,
  DetalleEventoPublico,
  EventoCatalogo,
  LocalidadMapa,
  LoginResponse,
  MapaRecinto,
  PaginatedResult,
  RecintoPublico,
  ResenaPublica,
  UsuarioSesion,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

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
    return this.accessToken;
  }

  public getRefreshToken(): string | null {
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

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
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

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
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
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (res.ok) {
        const data = (await res.json()) as LoginResponse;
        this.setTokens(data.accessToken, data.refreshToken);
        return true;
      }
    } catch {
      // Fallback
    }
    this.setTokens(null, null);
    return false;
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

    return this.request<PaginatedResult<EventoCatalogo>>(`/catalogo/eventos?${q.toString()}`);
  }

  public async getEvento(id: number): Promise<DetalleEventoPublico> {
    return this.request<DetalleEventoPublico>(`/catalogo/eventos/${id}`);
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

  public async getMisResenas(): Promise<ResenaPublica[]> {
    return this.request<ResenaPublica[]>('/resenas/mis');
  }

  // --- IA José ---
  public async consultarIa(consulta: string, sessionId?: string): Promise<ConsultaIaResponse> {
    return this.request<ConsultaIaResponse>('/ia/consultas', {
      method: 'POST',
      body: JSON.stringify({ consulta, sessionId }),
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
