// Adaptación explícita de los DTO publicados en Swagger al modelo visual existente.
export function normalize(endpoint: string, value: any): any {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => normalize(endpoint, item));
  if (Array.isArray(value.items) && typeof value.page === 'number' && typeof value.total === 'number') return { ...value, items: normalize(endpoint, value.items), pagina: value.page, tamanoPagina: value.pageSize, totalPaginas: Math.ceil(value.total / value.pageSize) };
  const path = endpoint.split('?')[0];
  if (path.includes('/usuarios') && value.rol) return value;
  if (path.includes('/compras') && value.publicId) return { ...value, id: value.publicId, creadoEn: value.fechaCompra, comision: value.comisionPlataforma, items: value.items.map((i: any) => ({ ...i, id: i.tipoEntradaId, tipoEntradaNombre: `Tipo #${i.tipoEntradaId}` })) };
  if (path === '/boletos') return { ...value, id: value.publicId, publicIdCompra: value.compraPublicId, precioFinal: value.precioUnitario, asistenteNombre: value.asistente?.nombreAsistente, localidadNombre: value.ubicacion ? [value.ubicacion.mesa && `Mesa ${value.ubicacion.mesa}`, value.ubicacion.fila && `Fila ${value.ubicacion.fila}`, `Silla ${value.ubicacion.silla}`].filter(Boolean).join(' · ') : undefined };
  if (path.includes('/resenas')) return { ...value, creadoEn: value.fechaCreacion, clienteNombre: 'Asistente verificado' };
  if (path.includes('/ia/documentos')) {
    if (value.documento) return { ...normalize(path, value.documento), contenidoExtraido: value.contenido, versiones: normalize(path, value.versiones) };
    return { ...value, nombreArchivo: value.titulo, fechaCreacion: value.fechaCarga, activo: value.estado !== 'DESACTIVADO', serie: `Documento #${value.id}` };
  }
  if (/\/presentadores$/.test(path) || /^\/presentadores\/\d+$/.test(path)) return { ...value, nombreArtistico: value.nombre, fotoUrl: value.imagenUrl };
  if (/\/presentadores\/\d+\/calificacion$/.test(path)) return { ...value, totalResenas: value.cantidad };
  if (/\/eventos\/\d+\/presentadores/.test(path)) return { ...value, nombreArtistico: value.nombre };
  if (/\/movimientos$/.test(path)) return { ...value, fechaCreacion: value.fecha };
  if (/\/mapa$/.test(path)) return { ...value, recintoId: value.id, localidades: value.localidades.map((l: any) => ({ ...l, precioMinimo: l.tiposEntrada?.length ? Math.min(...l.tiposEntrada.map((t: any) => t.precio)) : undefined })) };
  return value;
}
