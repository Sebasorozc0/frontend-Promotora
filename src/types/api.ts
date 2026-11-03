// Tipos del modelo de dominio basados en backend ASP.NET Core (Fases 1-9)

export type RolUsuario = 'CLIENTE' | 'ADMINISTRADOR' | 'DUENO_RECINTO';

export type EstadoEvento = 'BORRADOR' | 'PROGRAMADO' | 'EN_VENTA' | 'AGOTADO' | 'FINALIZADO' | 'CANCELADO';

export type EstadoCompra = 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADA' | 'FALLIDA' | 'EXPIRADA' | 'CANCELADA';

export type EstadoBoleto = 'VALIDO' | 'USADO' | 'ANULADO';

export type EstadoResena = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface UsuarioSesion {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  debeCambiarPassword: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string | null;
  expiraEn: string;
  debeCambiarPassword: boolean;
  usuarioId: number;
  rol: RolUsuario;
  nombre?: string;
  email?: string;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
  code?: string;
}

export interface CategoriaPublica {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface RecintoPublico {
  id: number;
  nombre: string;
  direccion: string;
  ciudad: string;
  capacidadTotal: number;
  imagenPlanoUrl?: string;
}

export interface PresentadorPublico {
  id: number;
  nombreArtistico: string;
  biografia?: string;
  fotoUrl?: string;
  promedioCalificacion?: number;
  totalResenas?: number;
}

export interface TipoEntradaPublico {
  id: number;
  nombre: string;
  precioUnitario: number;
  cupoDisponible: number;
  cupoTotal: number;
  localidadId?: number;
  localidadNombre?: string;
  ventaInicio?: string;
  ventaFin?: string;
  distanciaKm?: number;
}

export interface EventoCatalogo {
  id: number;
  titulo: string;
  descripcion: string;
  categoriaId: number;
  categoriaNombre: string;
  recintoId: number;
  recintoNombre: string;
  recintoCiudad: string;
  fechaInicio: string;
  fechaFin: string;
  aperturaPuertas?: string;
  imagenFlyerUrl?: string;
  estado: EstadoEvento;
  precioMinimo: number;
  precioMaximo: number;
  cupoTotal: number;
  cupoDisponible: number;
  maxBoletosPorCompra: number;
  presentadores: PresentadorPublico[];
}

export interface DetalleEventoPublico extends EventoCatalogo {
  tiposEntrada: TipoEntradaPublico[];
}

export interface PoligonoGeo {
  type: 'polygon';
  points: [number, number][];
}

export interface LocalidadMapa {
  id: number;
  recintoId?: number;
  nombre: string;
  capacidad: number;
  color?: string;
  colorHex?: string;
  geometria?: PoligonoGeo | null;
  geometriaJson?: string;
  cupoDisponible?: number;
  precioMinimo?: number;
  activo?: boolean;
}

export interface DatosLocalidadRequest {
  nombre: string;
  capacidad: number;
  color?: string;
  geometria?: PoligonoGeo | null;
}

export interface MapaRecinto {
  recintoId: number;
  nombre: string;
  capacidadTotal: number;
  imagenPlanoUrl?: string;
  localidades: LocalidadMapa[];
}

export interface AsistenteItem {
  nombreCompleto: string;
  dpi?: string;
  email?: string;
}

export interface ItemCompraRequest {
  tipoEntradaId: number;
  cantidad: number;
  asistentes?: AsistenteItem[];
  asientoIds?: number[];
}

export interface CrearCompraRequest {
  eventoId: number;
  items: ItemCompraRequest[];
}

export interface ItemCompraResponse {
  id: number;
  tipoEntradaId: number;
  tipoEntradaNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface CompraResponse {
  id: number;
  publicId: string;
  eventoId: number;
  eventoTitulo?: string;
  estado: EstadoCompra;
  subtotal: number;
  comision: number;
  impuestos: number;
  total: number;
  expiraEn: string;
  creadoEn: string;
  items: ItemCompraResponse[];
  boletosEmitidos?: number;
  motivoFallo?: string;
}

export interface BoletoResponse {
  id: number | string;
  publicId?: string;
  compraId: number | string;
  publicIdCompra: string;
  eventoId: number;
  eventoTitulo: string;
  recintoNombre: string;
  fechaInicio: string;
  tipoEntradaId: number;
  tipoEntradaNombre: string;
  localidadNombre?: string;
  codigoQr: string;
  estado: EstadoBoleto;
  precioFinal?: number;
  asistenteNombre?: string;
  fechaUso?: string;
  ubicacion?: {
    asientoId: number;
    silla: string;
    fila?: string | null;
    mesaId?: number | null;
    mesa?: string | null;
    localidadId: number;
  } | null;
}

export interface BoletoClienteApiDto {
  publicId: string;
  compraPublicId: string;
  eventoId: number;
  tipoEntradaId: number;
  codigoQr: string;
  estado: EstadoBoleto;
  asistente: {
    nombreAsistente?: string | null;
    documentoIdentidad?: string | null;
    datosExtraJson?: string | null;
  };
  fechaEmision: string;
  fechaUso?: string | null;
  ubicacion?: BoletoResponse['ubicacion'];
  eventoTitulo: string;
  recintoNombre: string;
  fechaInicio: string;
  tipoEntradaNombre: string;
  precioUnitario: number;
}

export interface ApiPaginaDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ResenaPublica {
  id: number;
  eventoId: number;
  eventoTitulo?: string;
  clienteNombre: string;
  calificacion: number;
  comentario: string;
  estado: EstadoResena;
  creadoEn: string;
}

export interface FuenteCitada {
  documento: string;
  pagina?: number;
  extracto: string;
  chunkId?: number;
}

export interface ConsultaIaResponse {
  respuesta: string;
  fuentes: FuenteCitada[];
  tokensUtilizados?: number;
  tiempoRespuestaMs?: number;
  sessionId?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pagina: number;
  tamanoPagina: number;
  total: number;
  totalPaginas: number;
}

// --- Nuevos tipos de Administración y Endpoints de la API ---

export interface UsuarioDto {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  estado: 'ACTIVO' | 'INACTIVO';
  debeCambiarPassword: boolean;
}

export interface PerfilDto {
  fechaNacimiento?: string | null;
  telefono?: string | null;
  empresa?: string | null;
  nit?: string | null;
}

export interface UsuarioDetalleDto {
  usuario: UsuarioDto;
  perfil: PerfilDto;
}

export interface UsuariosPaginaDto {
  items: UsuarioDetalleDto[];
  pagina: number;
  tamanoPagina: number;
  total: number;
  totalPaginas: number;
}

export interface ActualizarUsuarioRequest {
  email: string;
  nombre: string;
  apellido: string;
  fechaNacimiento?: string | null;
  telefono?: string | null;
  empresa?: string | null;
  nit?: string | null;
}

export interface AltaAdministradorRequest {
  email: string;
  password?: string;
  nombre: string;
  apellido: string;
}

export interface AltaDuenoRequest {
  email: string;
  password?: string;
  nombre: string;
  apellido: string;
  empresa: string;
  nit?: string;
}

// Categorías y Presentadores
export interface CategoriaDetalleDto {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
}

export interface PresentadorDetalleDto {
  id: number;
  nombreArtistico: string;
  biografia?: string | null;
  fotoUrl?: string | null;
  promedioCalificacion?: number | null;
  totalResenas?: number;
  activo: boolean;
}

export interface EventoPresentadorItemDto {
  presentadorId: number;
  nombreArtistico: string;
  biografia?: string | null;
  fotoUrl?: string | null;
  orden: number;
  rol?: string | null;
}

// Finanzas y Contabilidad
export type TipoCuenta = 'PLATAFORMA' | 'DUENO' | 'IMPUESTOS';
export type EstadoCuenta = 'ACTIVA' | 'CERRADA';
export type TipoMovimiento = 'VENTA' | 'COMISION' | 'IMPUESTO' | 'LIQUIDACION' | 'REEMBOLSO';

export interface CuentaFinancieraDto {
  id: number;
  tipo: TipoCuenta;
  duenoId?: number | null;
  duenoNombre?: string | null;
  empresa?: string | null;
  moneda: string;
  saldo: number;
  estado: EstadoCuenta;
  fechaCreacion: string;
  fechaCierre?: string | null;
}

export interface MovimientoFinancieroDto {
  id: number;
  cuentaId: number;
  tipo: TipoMovimiento;
  monto: number;
  saldoPosterior: number;
  descripcion: string;
  referencia?: string | null;
  fechaCreacion: string;
}

// Documentos RAG
export type EstadoDocumentoRag = 'PENDIENTE' | 'INDEXADO' | 'ERROR' | 'DESACTIVADO';

export interface DocumentoRagDto {
  id: number;
  serie: string;
  nombreArchivo: string;
  version: number;
  estado: EstadoDocumentoRag;
  chunks: number;
  fechaCreacion: string;
  activo: boolean;
}

// Distribución de Asientos Numerados
export interface MesaDto {
  id: number;
  etiqueta: string;
  modalidad: 'COMPLETA' | 'POR_SILLA';
  tipoEntradaId: number;
  capacidad: number;
  x: number;
  y: number;
  clave?: string;
}

export interface SillaDto {
  id: number;
  mesaId?: number | null;
  etiqueta: string;
  fila?: string | null;
  tipoEntradaId: number;
  x: number;
  y: number;
  estado: 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | 'BLOQUEADO';
  mesaClave?: string | null;
}

export interface DistribucionDto {
  id: number;
  eventoId: number;
  localidadId: number;
  estado: 'BORRADOR' | 'PUBLICADA';
  imagenPlanoUrl?: string | null;
  page: number;
  pageSize: number;
  totalMesas: number;
  totalAsientos: number;
  mesas: MesaDto[];
  asientos: SillaDto[];
}

export interface DatosDistribucionRequest {
  imagenPlanoUrl?: string | null;
  mesas: Array<{
    id?: number | null;
    clave: string;
    etiqueta: string;
    modalidad: 'COMPLETA' | 'POR_SILLA';
    tipoEntradaId: number;
    x: number;
    y: number;
  }>;
  asientos: Array<{
    id?: number | null;
    mesaClave?: string | null;
    etiqueta: string;
    fila?: string | null;
    tipoEntradaId: number;
    x: number;
    y: number;
    bloqueado?: boolean;
  }>;
}
