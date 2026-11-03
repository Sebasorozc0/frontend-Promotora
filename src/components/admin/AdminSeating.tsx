import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import {
  DatosDistribucionRequest,
  DetalleEventoPublico,
  DistribucionDto,
  EventoCatalogo,
  LocalidadMapa,
  MapaRecinto,
  MesaDto,
  PoligonoGeo,
  SillaDto,
} from '../../types/api';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, Circle, Grid, Lock, Move, Plus, Save, Send, Trash2, Users, XCircle } from 'lucide-react';
import { fromNormalizedPoint, pointInPolygon, SEAT_MAP_HEIGHT, SEAT_MAP_WIDTH, svgClientPoint, toNormalizedPoint } from '../seating/geometry';

type MesaLayout = Omit<MesaDto, 'id'> & { id?: number; clave: string };
type SillaLayout = Omit<SillaDto, 'id' | 'mesaId' | 'mesaClave'> & {
  id?: number;
  mesaId?: number | null;
  mesaClave: string | null;
};
type Herramienta = 'MOVER' | 'SILLA' | 'FILA' | 'MESA';
type Arrastre = { tipo: 'mesa' | 'silla'; clave: string } | null;

const TAMANO_PAGINA = 100;

function leerPoligono(localidad?: LocalidadMapa | null): PoligonoGeo | null {
  if (localidad?.geometria?.points?.length) return localidad.geometria;
  if (!localidad?.geometriaJson) return null;
  try {
    const parsed: unknown = JSON.parse(localidad.geometriaJson);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const candidato = parsed as { type?: unknown; points?: unknown };
    if (candidato.type !== 'polygon' || !Array.isArray(candidato.points)) return null;

    const points: [number, number][] = [];
    for (const point of candidato.points) {
      if (!Array.isArray(point) || point.length !== 2 ||
        typeof point[0] !== 'number' || !Number.isFinite(point[0]) ||
        typeof point[1] !== 'number' || !Number.isFinite(point[1])) return null;
      points.push([point[0], point[1]]);
    }

    return points.length >= 3 ? { type: 'polygon', points } : null;
  } catch {
    return null;
  }
}

function convertirDistribucion(distribucion: DistribucionDto) {
  const mesas: MesaLayout[] = distribucion.mesas.map((mesa) => ({ ...mesa, clave: `mesa-${mesa.id}` }));
  const claves = new Map(distribucion.mesas.map((mesa) => [mesa.id, `mesa-${mesa.id}`] as const));
  const asientos: SillaLayout[] = distribucion.asientos.map((asiento) => ({
    ...asiento,
    mesaClave: asiento.mesaId ? claves.get(asiento.mesaId) || null : null,
  }));
  return { mesas, asientos };
}

export const AdminSeating: React.FC = () => {
  const { user } = useAuth();
  const esDueno = user?.rol === 'DUENO_RECINTO';
  const canvasRef = useRef<SVGSVGElement | null>(null);
  const [eventos, setEventos] = useState<EventoCatalogo[]>([]);
  const [eventoId, setEventoId] = useState<number | null>(null);
  const [detalleEvento, setDetalleEvento] = useState<DetalleEventoPublico | null>(null);
  const [mapa, setMapa] = useState<MapaRecinto | null>(null);
  const [localidadId, setLocalidadId] = useState<number | null>(null);
  const [distribucion, setDistribucion] = useState<DistribucionDto | null>(null);
  const [mesas, setMesas] = useState<MesaLayout[]>([]);
  const [asientos, setAsientos] = useState<SillaLayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tool, setTool] = useState<Herramienta>('MOVER');
  const [tipoEntradaId, setTipoEntradaId] = useState<number>(0);
  const [fila, setFila] = useState('A');
  const [cantidadFila, setCantidadFila] = useState(10);
  const [capacidadMesa, setCapacidadMesa] = useState(4);
  const [modalidadMesa, setModalidadMesa] = useState<'COMPLETA' | 'POR_SILLA'>('POR_SILLA');
  const [seleccion, setSeleccion] = useState<{ tipo: 'mesa' | 'silla'; clave: string } | null>(null);
  const [arrastre, setArrastre] = useState<Arrastre>(null);
  const [sillaAccion, setSillaAccion] = useState<SillaLayout | null>(null);
  const [feedback, setFeedback] = useState<{ texto: string; tipo: 'success' | 'error' } | null>(null);

  const localidades = mapa?.localidades || [];
  const localidad = localidades.find((item) => item.id === localidadId) || null;
  const poligono = useMemo(() => leerPoligono(localidad), [localidad]);
  const tiposEntrada = useMemo(
    () => (detalleEvento?.tiposEntrada || []).filter((tipo) => tipo.localidadId === localidadId),
    [detalleEvento, localidadId],
  );
  const publicada = distribucion?.estado === 'PUBLICADA';
  const sillasFueraZona = useMemo(() => asientos.filter((silla) => {
    const [x, y] = fromNormalizedPoint(silla.x, silla.y);
    return !pointInPolygon([x, y], poligono);
  }).length, [asientos, poligono]);
  const asientoSeleccionado = seleccion?.tipo === 'silla' ? asientos.find((item) => String(item.id ?? item.mesaClave + ':' + item.etiqueta) === seleccion.clave) : null;
  const mesaSeleccionada = seleccion?.tipo === 'mesa' ? mesas.find((item) => item.clave === seleccion.clave) : null;

  const avisar = (texto: string, tipo: 'success' | 'error' = 'success') => {
    setFeedback({ texto, tipo });
    window.setTimeout(() => setFeedback(null), 4500);
  };

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        let lista = (await api.getEventos({ pageSize: 50 }))?.items || [];
        if (esDueno) {
          const recintos = await api.getRecintos();
          const propios = new Set((recintos || []).map((recinto) => recinto.id));
          lista = lista.filter((evento) => propios.has(evento.recintoId));
        }
        if (!activo) return;
        setEventos(lista);
        setEventoId((actual) => actual && lista.some((evento) => evento.id === actual) ? actual : lista[0]?.id || null);
      } catch (error: any) {
        if (activo) avisar(error?.detail || 'No se pudieron cargar los eventos.', 'error');
      }
    };
    void cargar();
    return () => { activo = false; };
  }, [esDueno]);

  useEffect(() => {
    if (!eventoId) {
      setDetalleEvento(null);
      setMapa(null);
      setLocalidadId(null);
      return;
    }
    let activo = true;
    const evento = eventos.find((item) => item.id === eventoId);
    if (!evento) return;
    setLoading(true);
    Promise.all([api.getEvento(eventoId), api.getMapaRecinto(evento.recintoId, eventoId)])
      .then(([detalle, mapaEvento]) => {
        if (!activo) return;
        setDetalleEvento(detalle);
        setMapa(mapaEvento);
        setLocalidadId((actual) => mapaEvento.localidades.some((item) => item.id === actual) ? actual : mapaEvento.localidades[0]?.id || null);
      })
      .catch((error: any) => {
        if (activo) avisar(error?.detail || 'No se pudo cargar el plano del recinto y sus tarifas.', 'error');
      })
      .finally(() => { if (activo) setLoading(false); });
    return () => { activo = false; };
  }, [eventoId, eventos]);

  const cargarDistribucion = useCallback(async () => {
    if (!eventoId || !localidadId) return;
    setLoading(true);
    setSeleccion(null);
    try {
      const primera = await api.getDistribucion(eventoId, localidadId, 1, TAMANO_PAGINA);
      const paginas = Math.max(1, Math.ceil(primera.totalMesas / TAMANO_PAGINA), Math.ceil(primera.totalAsientos / TAMANO_PAGINA));
      const restantes = await Promise.all(Array.from({ length: paginas - 1 }, (_, index) =>
        api.getDistribucion(eventoId, localidadId, index + 2, TAMANO_PAGINA),
      ));
      const completa: DistribucionDto = {
        ...primera,
        mesas: [primera, ...restantes].flatMap((pagina) => pagina.mesas),
        asientos: [primera, ...restantes].flatMap((pagina) => pagina.asientos),
      };
      setDistribucion(completa);
      const layout = convertirDistribucion(completa);
      setMesas(layout.mesas);
      setAsientos(layout.asientos);
    } catch (error: any) {
      if (error?.status === 404) {
        setDistribucion(null);
        setMesas([]);
        setAsientos([]);
      } else {
        avisar(error?.detail || 'No se pudo cargar la distribución guardada.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [eventoId, localidadId]);

  useEffect(() => {
    if (eventoId && localidadId) void cargarDistribucion();
    else {
      setDistribucion(null);
      setMesas([]);
      setAsientos([]);
    }
  }, [eventoId, localidadId, cargarDistribucion]);

  useEffect(() => {
    if (tiposEntrada.length && !tiposEntrada.some((tipo) => tipo.id === tipoEntradaId)) setTipoEntradaId(tiposEntrada[0].id);
    if (!tiposEntrada.length) setTipoEntradaId(0);
  }, [tiposEntrada, tipoEntradaId]);

  const agregarEnPunto = (evento: React.MouseEvent<SVGSVGElement>) => {
    if (publicada || !poligono || !tipoEntradaId || !canvasRef.current || tool === 'MOVER') return;
    const puntoSvg = svgClientPoint(canvasRef.current, evento.clientX, evento.clientY);
    if (!pointInPolygon(puntoSvg, poligono)) {
      avisar('Coloca las sillas dentro del polígono de la localidad.', 'error');
      return;
    }
    const [x, y] = toNormalizedPoint(puntoSvg);
    if (tool === 'SILLA' || tool === 'FILA') {
      const cantidad = tool === 'FILA' ? cantidadFila : 1;
      if (asientos.length + cantidad > Math.min(localidad?.capacidad || 2000, 2000)) {
        avisar('La distribución alcanzó la capacidad de esta localidad.', 'error');
        return;
      }
      const existentes = new Set(asientos.map((asiento) => asiento.etiqueta.toLowerCase()));
      const filaActual = (fila.trim() || 'A').toUpperCase();
      const espacio = 28;
      const inicioX = tool === 'FILA' ? puntoSvg[0] - ((cantidad - 1) * espacio) / 2 : puntoSvg[0];
      const puntosFila = Array.from({ length: cantidad }, (_, index): [number, number] => [inicioX + index * espacio, puntoSvg[1]]);
      if (puntosFila.some((punto) => !pointInPolygon(punto, poligono))) {
        avisar('La fila completa debe caber dentro de la localidad. Coloca el centro más adentro o reduce la cantidad.', 'error');
        return;
      }
      let numero = 1;
      const nuevaFila = puntosFila.map((punto) => {
        let etiqueta = `${filaActual}-${String(numero).padStart(2, '0')}`;
        while (existentes.has(etiqueta.toLowerCase())) {
          numero++;
          etiqueta = `${filaActual}-${String(numero).padStart(2, '0')}`;
        }
        existentes.add(etiqueta.toLowerCase());
        numero++;
        const [seatX, seatY] = toNormalizedPoint(punto);
        return {
          mesaId: null,
          mesaClave: null,
          etiqueta,
          fila: filaActual,
          tipoEntradaId,
          x: seatX,
          y: seatY,
          estado: 'DISPONIBLE' as const,
        };
      });
      setAsientos((actuales) => [...actuales, ...nuevaFila]);
      return;
    }

    const etiquetasMesa = new Set(mesas.map((mesa) => mesa.etiqueta.toLowerCase()));
    let numeroMesa = 1;
    while (etiquetasMesa.has(`mesa ${String(numeroMesa).padStart(2, '0')}`.toLowerCase())) numeroMesa++;
    const etiqueta = `Mesa ${String(numeroMesa).padStart(2, '0')}`;
    const clave = `mesa-nueva-${crypto.randomUUID()}`;
    const centro = puntoSvg;
    const radioSillas = 39;
    const sillasMesa: SillaLayout[] = Array.from({ length: capacidadMesa }, (_, index) => {
      const angulo = -Math.PI / 2 + (index * Math.PI * 2) / capacidadMesa;
      const [seatX, seatY] = toNormalizedPoint([centro[0] + Math.cos(angulo) * radioSillas, centro[1] + Math.sin(angulo) * radioSillas]);
      return {
        mesaId: null,
        mesaClave: clave,
        etiqueta: `${etiqueta.replace(' ', '-')}-S${String(index + 1).padStart(2, '0')}`,
        fila: null,
        tipoEntradaId,
        x: seatX,
        y: seatY,
        estado: 'DISPONIBLE',
      };
    });
    const fueraZona = sillasMesa.some((silla) => !pointInPolygon(fromNormalizedPoint(silla.x, silla.y), poligono));
    const etiquetasAsientos = new Set(asientos.map((asiento) => asiento.etiqueta.toLowerCase()));
    const etiquetaRepetida = sillasMesa.some((silla) => etiquetasAsientos.has(silla.etiqueta.toLowerCase()));
    if (fueraZona || etiquetaRepetida || asientos.length + capacidadMesa > Math.min(localidad?.capacidad || 2000, 2000)) {
      avisar(fueraZona ? 'La mesa y sus sillas deben quedar dentro de la localidad.' : etiquetaRepetida ? 'Las etiquetas de esa mesa se repiten con asientos existentes.' : 'La mesa excede la capacidad disponible de la localidad.', 'error');
      return;
    }
    const maximoPorCompra = detalleEvento?.maxBoletosPorCompra || 6;
    if (modalidadMesa === 'COMPLETA' && capacidadMesa > maximoPorCompra) {
      avisar(`La mesa completa excede el máximo de ${maximoPorCompra} boletos por compra del evento.`, 'error');
      return;
    }
    setMesas((actuales) => [...actuales, {
      clave,
      etiqueta,
      modalidad: modalidadMesa,
      tipoEntradaId,
      x,
      y,
      capacidad: capacidadMesa,
    }]);
    setAsientos((actuales) => [...actuales, ...sillasMesa]);
  };

  const iniciarArrastre = (tipo: 'mesa' | 'silla', clave: string, event: React.PointerEvent<SVGGElement>) => {
    event.stopPropagation();
    if (publicada) {
      if (tipo === 'silla') {
        const silla = asientos.find((item) => String(item.id ?? item.mesaClave + ':' + item.etiqueta) === clave);
        if (silla) setSillaAccion(silla);
      }
      return;
    }
    if (tool !== 'MOVER') return;
    event.preventDefault();
    setSeleccion({ tipo, clave });
    setArrastre({ tipo, clave });
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const moverEnCanvas = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!arrastre || !canvasRef.current || !poligono) return;
    const [nx, ny] = toNormalizedPoint(svgClientPoint(canvasRef.current, event.clientX, event.clientY));
    const dx = nx - (arrastre.tipo === 'mesa'
      ? mesas.find((mesa) => mesa.clave === arrastre.clave)?.x || 0
      : asientos.find((asiento) => String(asiento.id ?? asiento.mesaClave + ':' + asiento.etiqueta) === arrastre.clave)?.x || 0);
    const dy = ny - (arrastre.tipo === 'mesa'
      ? mesas.find((mesa) => mesa.clave === arrastre.clave)?.y || 0
      : asientos.find((asiento) => String(asiento.id ?? asiento.mesaClave + ':' + asiento.etiqueta) === arrastre.clave)?.y || 0);

    if (arrastre.tipo === 'mesa') {
      const mesa = mesas.find((item) => item.clave === arrastre.clave);
      if (!mesa) return;
      const relacionadas = asientos.filter((asiento) => asiento.mesaClave === mesa.clave);
      const nuevos = relacionadas.map((asiento) => ({ ...asiento, x: asiento.x + dx, y: asiento.y + dy }));
      const centroDentro = pointInPolygon(fromNormalizedPoint(nx, ny), poligono);
      if (!centroDentro || nuevos.some((silla) => !pointInPolygon(fromNormalizedPoint(silla.x, silla.y), poligono))) return;
      setMesas((actuales) => actuales.map((item) => item.clave === mesa.clave ? { ...item, x: nx, y: ny } : item));
      setAsientos((actuales) => actuales.map((item) => item.mesaClave === mesa.clave ? { ...item, x: item.x + dx, y: item.y + dy } : item));
      return;
    }

    const seat = asientos.find((item) => String(item.id ?? item.mesaClave + ':' + item.etiqueta) === arrastre.clave);
    if (!seat || !pointInPolygon(fromNormalizedPoint(nx, ny), poligono)) return;
    setAsientos((actuales) => actuales.map((item) => String(item.id ?? item.mesaClave + ':' + item.etiqueta) === arrastre.clave ? { ...item, x: nx, y: ny } : item));
  };

  const guardarBorrador = async () => {
    if (!eventoId || !localidadId || !poligono || !tipoEntradaId || !asientos.length) return;
    if (sillasFueraZona > 0) {
      avisar('Hay sillas fuera del polígono; arrástralas dentro antes de guardar.', 'error');
      return;
    }
    const imagenPlanoUrl = mapa?.imagenPlanoUrl;
    const payload: DatosDistribucionRequest = {
      imagenPlanoUrl: imagenPlanoUrl?.startsWith('/api/v1/imagenes/') && !imagenPlanoUrl.includes('..') ? imagenPlanoUrl : null,
      mesas: mesas.map((mesa) => ({
        id: mesa.id ?? null,
        clave: mesa.clave,
        etiqueta: mesa.etiqueta,
        modalidad: mesa.modalidad,
        tipoEntradaId: mesa.tipoEntradaId,
        x: mesa.x,
        y: mesa.y,
      })),
      asientos: asientos.map((asiento) => ({
        id: asiento.id ?? null,
        mesaClave: asiento.mesaClave,
        etiqueta: asiento.etiqueta,
        fila: asiento.fila,
        tipoEntradaId: asiento.tipoEntradaId,
        x: asiento.x,
        y: asiento.y,
        bloqueado: asiento.estado === 'BLOQUEADO',
      })),
    };
    setSaving(true);
    try {
      await api.guardarDistribucion(eventoId, localidadId, payload);
      avisar('Distribución guardada en borrador. Revisa el plano antes de publicarlo.');
      await cargarDistribucion();
    } catch (error: any) {
      avisar(error?.detail || error?.title || 'No se pudo guardar la distribución.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const publicar = async () => {
    if (!eventoId || !localidadId || !distribucion || !asientos.length) return;
    if (!window.confirm('¿Publicar la distribución? Al publicarse ya no se podrán mover ni agregar asientos.')) return;
    setSaving(true);
    try {
      await api.publicarDistribucion(eventoId, localidadId);
      avisar('Plano publicado. Ya se puede vender por asiento.');
      await cargarDistribucion();
    } catch (error: any) {
      avisar(error?.detail || error?.title || 'No se pudo publicar el plano.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const alternarBloqueo = async () => {
    if (!eventoId || !localidadId || !sillaAccion) return;
    const mesa = sillaAccion.mesaClave ? mesas.find((item) => item.clave === sillaAccion.mesaClave) : null;
    const grupo = mesa?.modalidad === 'COMPLETA'
      ? asientos.filter((asiento) => asiento.mesaClave === mesa.clave)
      : [sillaAccion];
    const bloquear = sillaAccion.estado !== 'BLOQUEADO';
    const esperado = bloquear ? 'DISPONIBLE' : 'BLOQUEADO';
    if (grupo.some((asiento) => asiento.estado !== esperado)) {
      avisar('La mesa completa debe estar libre o bloqueada en su totalidad para cambiar su estado.', 'error');
      setSillaAccion(null);
      return;
    }
    try {
      const ids = grupo.map((asiento) => asiento.id).filter((id): id is number => typeof id === 'number');
      if (ids.length !== grupo.length) return;
      if (bloquear) await api.bloquearAsiento(eventoId, localidadId, ids);
      else await api.desbloquearAsiento(eventoId, localidadId, ids);
      avisar(bloquear ? 'Asiento(s) bloqueado(s).' : 'Asiento(s) disponible(s) nuevamente.');
      setSillaAccion(null);
      await cargarDistribucion();
    } catch (error: any) {
      avisar(error?.detail || 'No se pudo actualizar la disponibilidad.', 'error');
      setSillaAccion(null);
    }
  };

  const eliminarSeleccionTemporal = () => {
    if (mesaSeleccionada && mesaSeleccionada.id === undefined) {
      setMesas((actuales) => actuales.filter((item) => item.clave !== mesaSeleccionada.clave));
      setAsientos((actuales) => actuales.filter((item) => item.mesaClave !== mesaSeleccionada.clave));
      setSeleccion(null);
      return;
    }
    if (asientoSeleccionado && asientoSeleccionado.id === undefined) {
      setAsientos((actuales) => actuales.filter((item) => item !== asientoSeleccionado));
      setSeleccion(null);
    }
  };

  const totalDisponibles = asientos.filter((asiento) => asiento.estado === 'DISPONIBLE').length;
  const puedeGuardar = !publicada && !!poligono && !!tipoEntradaId && asientos.length > 0 && sillasFueraZona === 0 && !saving;
  const etiquetaSilla = (asiento: SillaLayout) => asiento.etiqueta;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {feedback && <div role="status" style={{ padding: '12px 16px', border: '1px solid var(--border-strong)', background: feedback.tipo === 'success' ? '#D1FAE5' : '#FEE2E2', color: feedback.tipo === 'success' ? '#065F46' : '#991B1B', display: 'flex', gap: 8, alignItems: 'center' }}>
        {feedback.tipo === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}{feedback.texto}
      </div>}

      <section style={{ background: '#fff', border: '2px solid var(--border-strong)', padding: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Grid size={28} color="var(--accent-cobalt)" />
        <div><strong>Distribución geométrica por localidad</strong><div style={{ color: 'var(--text-secondary)', fontSize: '.88rem' }}>Dibuja los asientos dentro del polígono. Guarda el borrador y publícalo para habilitar la selección y reserva de clientes.</div></div>
      </section>

      <section style={{ background: '#fff', border: '2px solid var(--border-strong)', padding: 18, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={{ display: 'grid', gap: 5, fontSize: '.78rem', fontWeight: 700 }}>Evento
          <select className="input-base" value={eventoId || ''} onChange={(event) => setEventoId(Number(event.target.value) || null)}>
            {!eventos.length && <option value="">No hay eventos disponibles</option>}
            {eventos.map((evento) => <option key={evento.id} value={evento.id}>{evento.titulo}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 5, fontSize: '.78rem', fontWeight: 700 }}>Localidad
          <select className="input-base" value={localidadId || ''} onChange={(event) => setLocalidadId(Number(event.target.value) || null)}>
            {!localidades.length && <option value="">Sin localidades registradas</option>}
            {localidades.map((item) => <option key={item.id} value={item.id}>{item.nombre} · capacidad {item.capacidad}</option>)}
          </select>
        </label>
        {tiposEntrada.length > 0 && <label style={{ display: 'grid', gap: 5, fontSize: '.78rem', fontWeight: 700 }}>Tarifa de esta localidad
          <select className="input-base" value={tipoEntradaId || ''} onChange={(event) => setTipoEntradaId(Number(event.target.value) || 0)}>
            {tiposEntrada.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre} · Q{tipo.precioUnitario.toFixed(2)}</option>)}
          </select>
        </label>}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button className="btn btn-outline" onClick={() => void cargarDistribucion()} disabled={!localidadId || loading}><Circle size={15} /> Recargar</button>
          {!publicada && <button className="btn btn-primary" onClick={() => void guardarBorrador()} disabled={!puedeGuardar}><Save size={15} /> {saving ? 'Guardando…' : 'Guardar borrador'}</button>}
          {distribucion && <button className="btn btn-primary" onClick={() => void publicar()} disabled={!distribucion || publicada || saving} style={{ background: publicada ? '#64748B' : 'var(--accent-emerald)' }}><Send size={15} /> {publicada ? 'Publicado' : 'Publicar para venta'}</button>}
        </div>
      </section>

      {!poligono && <div role="alert" style={{ background: '#FEF3C7', border: '1px solid #F59E0B', padding: 14 }}>Esta localidad aún no tiene un polígono geométrico. Traza su forma en Administración → Recintos y localidades para poder colocar asientos dentro de su área.</div>}
      {!tiposEntrada.length && localidad && <div role="alert" style={{ background: '#FEF3C7', border: '1px solid #F59E0B', padding: 14 }}>No hay tipos de entrada activos asociados a {localidad.nombre}. Configura una tarifa para poder asignar precio a las sillas.</div>}
      {distribucion?.estado === 'BORRADOR' && <div style={{ background: '#EFF6FF', border: '1px solid #60A5FA', padding: 12 }}>Borrador editable. Haz clic en el área para agregar una silla o mesa; usa “Mover” para arrastrar elementos.</div>}
      {publicada && <div style={{ background: '#ECFDF5', border: '1px solid #34D399', padding: 12 }}>Distribución publicada e inmutable. Selecciona una silla para bloquearla o liberarla. Los clientes ya pueden elegir las disponibles.</div>}

      <section style={{ background: '#fff', border: '2px solid var(--border-strong)', padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          {!publicada && <>
            <button type="button" className={`btn btn-sm ${tool === 'MOVER' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTool('MOVER')}><Move size={14} /> Mover</button>
            <button type="button" className={`btn btn-sm ${tool === 'SILLA' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTool('SILLA')} disabled={!poligono || !tipoEntradaId}><Plus size={14} /> Silla individual</button>
            <button type="button" className={`btn btn-sm ${tool === 'FILA' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTool('FILA')} disabled={!poligono || !tipoEntradaId}><Users size={14} /> Dibujar fila</button>
            <button type="button" className={`btn btn-sm ${tool === 'MESA' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTool('MESA')} disabled={!poligono || !tipoEntradaId}><Grid size={14} /> Mesa</button>
            {(tool === 'SILLA' || tool === 'FILA') && <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '.8rem' }}>Fila <input className="input-base" value={fila} maxLength={10} onChange={(event) => setFila(event.target.value)} style={{ width: 80 }} /></label>}
            {tool === 'FILA' && <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '.8rem' }}>Sillas <input className="input-base" type="number" min={2} max={60} value={cantidadFila} onChange={(event) => setCantidadFila(Math.max(2, Math.min(60, Number(event.target.value) || 2)))} style={{ width: 76 }} /></label>}
            {tool === 'MESA' && <>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '.8rem' }}>Sillas <input className="input-base" type="number" min={2} max={12} value={capacidadMesa} onChange={(event) => setCapacidadMesa(Math.max(2, Math.min(12, Number(event.target.value) || 2)))} style={{ width: 76 }} /></label>
              <select className="input-base" value={modalidadMesa} onChange={(event) => setModalidadMesa(event.target.value as 'COMPLETA' | 'POR_SILLA')} aria-label="Modalidad de mesa">
                <option value="POR_SILLA">Venta por silla</option><option value="COMPLETA">Mesa completa</option>
              </select>
            </>}
          </>}
          <span style={{ marginLeft: 'auto', fontSize: '.78rem', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, background: '#10B981', marginRight: 5 }} />Disponible {totalDisponibles}</span>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, background: '#F59E0B', marginRight: 5 }} />Reservado</span>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, background: '#3B82F6', marginRight: 5 }} />Vendido</span>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, background: '#EF4444', marginRight: 5 }} />Bloqueado</span>
          </span>
        </div>

        <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto', border: '2px solid var(--border-strong)', background: '#0A0C10', overflow: 'hidden' }}>
          <svg
            ref={canvasRef}
            viewBox={`0 0 ${SEAT_MAP_WIDTH} ${SEAT_MAP_HEIGHT}`}
            role="application"
            aria-label={`Plano de asientos de ${localidad?.nombre || 'la localidad'}`}
            style={{ width: '100%', display: 'block', touchAction: 'none', cursor: !publicada && tool !== 'MOVER' ? 'crosshair' : 'default' }}
            onClick={agregarEnPunto}
            onPointerMove={moverEnCanvas}
            onPointerUp={() => setArrastre(null)}
            onPointerCancel={() => setArrastre(null)}
          >
            {mapa?.imagenPlanoUrl && <image href={mapa.imagenPlanoUrl} x="0" y="0" width={SEAT_MAP_WIDTH} height={SEAT_MAP_HEIGHT} preserveAspectRatio="xMidYMid slice" opacity=".28" />}
            <defs>
              <pattern id="seat-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1" /></pattern>
            </defs>
            <rect width={SEAT_MAP_WIDTH} height={SEAT_MAP_HEIGHT} fill="url(#seat-grid)" />
            {poligono && <polygon points={poligono.points.map(([x, y]) => `${x},${y}`).join(' ')} fill={localidad?.color || '#2563EB'} fillOpacity=".18" stroke={localidad?.color || '#60A5FA'} strokeWidth="3" />}
            {mesas.map((mesa) => {
              const [x, y] = fromNormalizedPoint(mesa.x, mesa.y);
              const activa = seleccion?.tipo === 'mesa' && seleccion.clave === mesa.clave;
              return <g key={mesa.clave} onPointerDown={(event) => iniciarArrastre('mesa', mesa.clave, event)} onClick={(event) => event.stopPropagation()} style={{ cursor: !publicada && tool === 'MOVER' ? 'grab' : 'default' }}>
                <circle cx={x} cy={y} r={24} fill={activa ? '#FDE68A' : '#E5E7EB'} stroke={activa ? '#D97706' : '#111827'} strokeWidth="3" />
                <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#111827" pointerEvents="none">{mesa.etiqueta}</text>
                <title>{mesa.etiqueta}, {mesa.capacidad} sillas, {mesa.modalidad === 'COMPLETA' ? 'venta completa' : 'venta individual'}</title>
              </g>;
            })}
            {asientos.map((asiento) => {
              const [x, y] = fromNormalizedPoint(asiento.x, asiento.y);
              const key = String(asiento.id ?? asiento.mesaClave + ':' + asiento.etiqueta);
              const color = asiento.estado === 'DISPONIBLE' ? '#10B981' : asiento.estado === 'BLOQUEADO' ? '#EF4444' : asiento.estado === 'RESERVADO' ? '#F59E0B' : '#3B82F6';
              const activa = seleccion?.tipo === 'silla' && seleccion.clave === key;
              return <g key={key} onPointerDown={(event) => iniciarArrastre('silla', key, event)} onClick={(event) => event.stopPropagation()} style={{ cursor: publicada ? 'pointer' : tool === 'MOVER' ? 'grab' : 'default' }}>
                <circle cx={x} cy={y} r={activa ? 14 : 11} fill={color} stroke={activa ? '#111827' : '#fff'} strokeWidth={activa ? 4 : 2} />
                <text x={x} y={y + 3} textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" pointerEvents="none">{asiento.etiqueta.slice(-5)}</text>
                <title>{`${asiento.fila ? `Fila ${asiento.fila}, ` : ''}${etiquetaSilla(asiento)} — ${asiento.estado}`}</title>
              </g>;
            })}
          </svg>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: '.84rem' }}>
          <span><Users size={15} style={{ verticalAlign: 'middle' }} /> {asientos.length} asientos · {mesas.length} mesas</span>
          {sillasFueraZona > 0 && <span style={{ color: '#B91C1C' }}>{sillasFueraZona} silla(s) fuera del área</span>}
          {(mesaSeleccionada || asientoSeleccionado) && !publicada && <>
            <span>Seleccionado: <strong>{mesaSeleccionada?.etiqueta || asientoSeleccionado?.etiqueta}</strong></span>
            {(mesaSeleccionada?.id === undefined || asientoSeleccionado?.id === undefined) && <button className="btn btn-sm btn-outline" onClick={eliminarSeleccionTemporal}><Trash2 size={14} /> Quitar del borrador</button>}
          </>}
        </div>
        {loading && <div style={{ padding: 12, textAlign: 'center' }}>Cargando distribución…</div>}
      </section>

      {sillaAccion && <div className="modal-overlay" onClick={() => setSillaAccion(null)}>
        <div className="modal-content" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 420, padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>{sillaAccion.etiqueta}</h3>
          <p>{sillaAccion.fila ? `Fila ${sillaAccion.fila} · ` : ''}{sillaAccion.estado}{sillaAccion.mesaClave && mesas.find((mesa) => mesa.clave === sillaAccion.mesaClave)?.modalidad === 'COMPLETA' ? ' · mesa completa' : ''}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => setSillaAccion(null)} style={{ flex: 1 }}>Cerrar</button>
            {(sillaAccion.estado === 'DISPONIBLE' || sillaAccion.estado === 'BLOQUEADO') && <button className="btn btn-primary" onClick={() => void alternarBloqueo()} style={{ flex: 1 }}>{sillaAccion.estado === 'BLOQUEADO' ? <><CheckCircle size={15} /> Habilitar</> : <><Lock size={15} /> Bloquear</>}</button>}
          </div>
        </div>
      </div>}
    </div>
  );
};
