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
  id: number;
  compraId: number;
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
  precioFinal: number;
  asistenteNombre?: string;
  fechaUso?: string;
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
