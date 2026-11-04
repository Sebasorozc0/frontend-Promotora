import { normalize } from './normalize';
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

  private async response(endpoint: string, options: RequestInit = {}, customHeaders: Record<string, string> = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    Object.entries(customHeaders).forEach(([key, value]) => headers.set(key, value));
    const isAuth = ['/auth/login', '/auth/registro', '/auth/refresh'].includes(endpoint);
    if (!isAuth && this.getAccessToken()) headers.set('Authorization', 'Bearer ' + this.getAccessToken());
    let response: Response;
    try {
      response = await fetch(API_BASE + endpoint, { ...options, headers });
      if (!isAuth && endpoint !== '/auth/logout' && response.status === 401 && this.getRefreshToken() && await this.tryRefreshToken()) {
        headers.set('Authorization', 'Bearer ' + this.getAccessToken());
        response = await fetch(API_BASE + endpoint, { ...options, headers });
      }
    } catch {
      throw { detail: 'No se pudo conectar al backend. Comprueba que esté encendido y vuelve a intentar.', status: 0 };
    }
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      const validation = Object.values(problem.errors || {}).flat().join(' ');
      throw { ...problem, status: response.status, detail: validation || problem.detail || problem.title || 'Error HTTP ' + response.status, retryAfter: response.headers.get('Retry-After') };
    }
    return response;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, customHeaders: Record<string, string> = {}): Promise<T> {
    const response = await this.response(endpoint, options, customHeaders);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? normalize(endpoint, JSON.parse(text)) : undefined) as T;
  }

  private async requestFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: formData });
  }

  public async all<T>(endpoint: string): Promise<T[]> {
    const items: T[] = [];
    for (let page = 1; page <= 100000; page++) {
      const separator = endpoint.includes('?') ? '&' : '?';
      const result = await this.request<any>(endpoint + separator + 'page=' + page + '&pageSize=100');
      if (Array.isArray(result)) return result;
      items.push(...result.items);
      if (items.length >= result.total || !result.items.length) return items;
    }
    throw { detail: 'El listado supera el límite de paginación.' };
  }

  public async descargarReporte(codigo: string, filtros: Record<string, string>, formato: 'xlsx' | 'pdf'): Promise<void> {
    const query = new URLSearchParams({ ...filtros, formato });
    const response = await this.response('/reportes/' + codigo + '?' + query);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a'); link.href = url; link.download = codigo + '.' + formato;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  public getReporte(codigo: string, filtros: Record<string, string>): Promise<any> {
    return this.request('/reportes/' + codigo + '?' + new URLSearchParams({ ...filtros, formato: 'json' }));
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
      body: JSON.stringify({ passwordActual, passwordNuevo: passwordNueva }),
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
      id: p.id || p.presentadorId,
      nombreArtistico: p.nombreArtistico || p.nombre || 'Artista',
      biografia: p.biografia || '',
      fotoPerfilUrl: p.fotoPerfilUrl || p.imagenUrl || null,
      promedioCalificacion: typeof p.promedioCalificacion === 'number' ? p.promedioCalificacion : undefined,
    }));

    return {
      id: raw.id,
      titulo: raw.titulo || raw.nombre || 'Evento ASA',
      descripcion: raw.descripcion || '',
      categoriaId: raw.categoriaId || (typeof raw.categoria === 'object' ? raw.categoria?.id : 0),
      categoriaNombre: raw.categoriaNombre || (typeof raw.categoria === 'object' ? raw.categoria?.nombre : raw.categoria) || 'General',
      recintoId: raw.recintoId || (typeof raw.recinto === 'object' ? raw.recinto?.id : 0),
      recintoNombre: raw.recintoNombre || (typeof raw.recinto === 'object' ? raw.recinto?.nombre : raw.recinto) || 'Recinto',
      recintoCiudad: raw.recintoCiudad || (typeof raw.recinto === 'object' ? raw.recinto?.ciudad : raw.ciudad) || 'Guatemala',
      fechaInicio: raw.fechaInicio,
      fechaFin: raw.fechaFin || raw.fechaInicio,
      aperturaPuertas: raw.aperturaPuertas || raw.fechaInicio,
      imagenFlyerUrl: raw.imagenFlyerUrl || raw.imagenUrl || undefined,
      estado: raw.estado || 'EN_VENTA',
      precioMinimo: typeof raw.precioMinimo === 'number' ? raw.precioMinimo : 0,
      precioMaximo: typeof raw.precioMaximo === 'number' ? raw.precioMaximo : 0,
      cupoTotal: typeof raw.cupoTotal === 'number' ? raw.cupoTotal : 0,
      cupoDisponible: typeof raw.cupoDisponible === 'number' ? raw.cupoDisponible : 0,
      maxBoletosPorCompra: raw.maxBoletosPorCompra,
      fechaInicioVenta: raw.fechaInicioVenta, fechaFinVenta: raw.fechaFinVenta,
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
      cupoTotal: t.cupoTotal,
      cupoDisponible: typeof t.cupoDisponible === 'number' ? t.cupoDisponible : 0,
      numerada: t.numerada,
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
    if (params?.busqueda) q.set('texto', params.busqueda);

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
    return this.all<ResenaPublica>(`/eventos/${eventoId}/resenas`);
  }

  public async getMapaRecinto(recintoId: number, eventoId?: number): Promise<MapaRecinto> {
    const q = eventoId ? `?eventoId=${eventoId}` : '';
    return this.request<MapaRecinto>(`/recintos/${recintoId}/mapa${q}`);
  }

  // --- Recintos & Localidades con Geometría Vectorial ---
  public async getRecintos(): Promise<RecintoPublico[]> {
    const res = await this.all<any>('/recintos');
    return res;
  }

  public async getRecinto(id: number): Promise<RecintoPublico> {
    return this.request<RecintoPublico>(`/recintos/${id}`);
  }

  public async crearRecinto(datos: {
    nombre: string;
    direccion?: string;
    ciudad?: string;
    capacidadTotal?: number;
    imagenPlanoUrl?: string;
    duenoId?: number;
  }): Promise<RecintoPublico> {
    return this.request<RecintoPublico>('/recintos', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  }

  public async actualizarRecinto(id: number, datos: {
    nombre: string;
    direccion?: string;
    ciudad?: string;
    capacidadTotal?: number;
    imagenPlanoUrl?: string;
  }): Promise<RecintoPublico> {
    return this.request<RecintoPublico>(`/recintos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    });
  }

  public async eliminarRecinto(id: number): Promise<void> {
    await this.request(`/recintos/${id}`, {
      method: 'DELETE',
    });
  }

  public async subirPlanoRecinto(recintoId: number, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('archivo', file);
    return this.requestFormData<{ url: string }>(`/recintos/${recintoId}/imagen-plano`, formData);
  }

  public async getLocalidades(recintoId: number): Promise<LocalidadMapa[]> {
    const res = await this.all<any>(`/recintos/${recintoId}/localidades`);
    return res;
  }

  public getLocalidad(recintoId: number, id: number): Promise<LocalidadMapa> { return this.request('/recintos/' + recintoId + '/localidades/' + id); }

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
    const items = await this.all<CompraResponse>('/compras');
    return { items, total: items.length, pagina: 1, tamanoPagina: items.length, totalPaginas: 1 };
  }

  public async cancelarCompra(publicId: string): Promise<void> {
    await this.request(`/compras/${publicId}/cancelar`, { method: 'POST' });
  }

  // --- Boletos ---
  public async getMisBoletos(): Promise<BoletoResponse[]> {
    return this.all<BoletoResponse>('/boletos');
  }

  public async validarBoleto(codigoQr: string): Promise<{
    publicId: string; estado: string; fechaUso: string; ubicacion?: { silla: string; fila?: string | null; mesa?: string | null } | null;
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
  public async consultarIa(pregunta: string, sessionId?: string): Promise<ConsultaIaResponse> {
    return this.request('/ia/consultas', { method: 'POST', body: JSON.stringify({ pregunta, sessionId: sessionId || null }) });
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
    const rows = await this.all<UsuarioDto>('/usuarios');
    return { items: rows.map(usuario => ({ usuario, perfil: {} })), total: rows.length, pagina: 1, tamanoPagina: rows.length, totalPaginas: 1 };
  }

  public async darBajaUsuario(id: number): Promise<void> {
    await this.request(`/usuarios/${id}`, { method: 'DELETE' });
  }

  public async altaValidador(data: AltaAdministradorRequest): Promise<UsuarioDto> {
    return this.request<UsuarioDto>('/usuarios/validadores-boletos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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
    const res = await this.all<any>('/categorias');
    return res;
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
    const res = await this.all<any>('/presentadores');
    return res;
  }

  public async getPresentador(id: number): Promise<PresentadorDetalleDto> {
    return this.request<PresentadorDetalleDto>(`/presentadores/${id}`);
  }

  public async crearPresentador(data: { nombreArtistico: string; biografia?: string }): Promise<PresentadorDetalleDto> {
    return this.request<PresentadorDetalleDto>('/presentadores', {
      method: 'POST',
      body: JSON.stringify({ nombre: data.nombreArtistico, tipo: (data as any).tipo || 'ARTISTA', biografia: data.biografia }),
    });
  }

  public async actualizarPresentador(id: number, data: { nombreArtistico: string; biografia?: string }): Promise<PresentadorDetalleDto> {
    return this.request<PresentadorDetalleDto>(`/presentadores/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nombre: data.nombreArtistico, tipo: (data as any).tipo || 'ARTISTA', biografia: data.biografia }),
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
    return this.all<EventoPresentadorItemDto>(`/eventos/${eventoId}/presentadores`);
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

  public async getEventoAdmin(id: number): Promise<EventoCatalogo> { return this.normalizarEventoCatalogo(await this.request('/eventos/' + id)); }

  // --- Gestión de Eventos Admin (6 endpoints) ---
  public async getEventosAdmin(): Promise<EventoCatalogo[]> {
    const res = await this.all<any>('/eventos');
    return res.map((e: any) => this.normalizarEventoCatalogo(e));
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
    return this.all<any>(`/eventos/${eventoId}/tipos-entrada`);
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
    const res = await this.all<any>('/cuentas');
    return res;
  }

  public async getCuenta(id: number): Promise<CuentaFinancieraDto> {
    return this.request<CuentaFinancieraDto>(`/cuentas/${id}`);
  }

  public async getMovimientosCuenta(id: number, params?: { page?: number; pageSize?: number }): Promise<PaginatedResult<MovimientoFinancieroDto>> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    const items = await this.all<MovimientoFinancieroDto>('/cuentas/' + id + '/movimientos');
    return { items, total: items.length, pagina: 1, tamanoPagina: items.length, totalPaginas: 1 };
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
    q.delete('page'); q.delete('pageSize');
    const items = await this.all<ResenaPublica>('/resenas?' + q);
    return { items, total: items.length, pagina: 1, tamanoPagina: items.length, totalPaginas: 1 };
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
    const items = await this.all<DocumentoRagDto>('/ia/documentos');
    return { items, total: items.length, pagina: 1, tamanoPagina: items.length, totalPaginas: 1 };
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
  private async planoCompleto(endpoint: string): Promise<DistribucionDto> {
    const first = await this.request<DistribucionDto>(endpoint + '?page=1&pageSize=100');
    const pages = Math.ceil(Math.max(first.totalMesas, first.totalAsientos) / 100);
    for (let page = 2; page <= pages; page++) {
      const next = await this.request<DistribucionDto>(endpoint + '?page=' + page + '&pageSize=100');
      first.mesas.push(...next.mesas); first.asientos.push(...next.asientos);
    }
    return first;
  }
  public getDistribucion(eventoId: number, localidadId: number): Promise<DistribucionDto> {
    return this.planoCompleto('/eventos/' + eventoId + '/localidades/' + localidadId + '/distribucion');
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

  public getAsientos(eventoId: number, localidadId: number): Promise<DistribucionDto> {
    return this.planoCompleto('/eventos/' + eventoId + '/localidades/' + localidadId + '/asientos');
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

}

export const api = new ApiClient();
