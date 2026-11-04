import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { EventoCatalogo, CategoriaDetalleDto, RecintoPublico, LocalidadMapa } from '../../types/api';
import { useAuth } from '../../context/AuthContext';
import { toLocalDateTime, toApiDateTime } from '../../utils/dates';
import { LoadState } from '../common/LoadState';
import { Modal } from '../common/Modal';
import { 
  Calendar, 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  Tag, 
  MapPin, 
  Ticket, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  ArrowRight
} from 'lucide-react';

export const AdminEvents: React.FC = () => {
  const { user } = useAuth();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [eventos, setEventos] = useState<EventoCatalogo[]>([]);
  const [recintos, setRecintos] = useState<RecintoPublico[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDetalleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  // Modales
  const [eventoModalOpen, setEventoModalOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<Awaited<ReturnType<typeof api.getEventoAdmin>> | null>(null);
  const [estadoModalOpen, setEstadoModalOpen] = useState(false);
  const [selectedEventoParaEstado, setSelectedEventoParaEstado] = useState<EventoCatalogo | null>(null);
  const [nuevoEstadoSeleccionado, setNuevoEstadoSeleccionado] = useState<string>('PROGRAMADO');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedEventoParaImagen, setSelectedEventoParaImagen] = useState<EventoCatalogo | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Tipos de entrada
  const [tiposEntradaModalOpen, setTiposEntradaModalOpen] = useState(false);
  const [selectedEventoParaEntradas, setSelectedEventoParaEntradas] = useState<EventoCatalogo | null>(null);
  const [tiposEntrada, setTiposEntrada] = useState<any[]>([]);
  const [localidadesRecinto, setLocalidadesRecinto] = useState<LocalidadMapa[]>([]);
  const [editingTipoEntrada, setEditingTipoEntrada] = useState<any | null>(null);
  const [tipoEntradaFormOpen, setTipoEntradaFormOpen] = useState(false);
  const [tipoEntradaForm, setTipoEntradaForm] = useState({
    nombre: '',
    precio: 100,
    cupoTotal: 100,
    localidadId: undefined as number | undefined
  });

  // Formulario Evento
  const [eventoForm, setEventoForm] = useState({
    recintoId: 0,
    categoriaId: 0,
    nombre: '',
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    fechaInicioVenta: '',
    fechaFinVenta: '',
    maxBoletosPorCompra: 6,
    imagenUrl: ''
  });

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchCatalogos = async () => {
    try {
      const [recs, cats] = await Promise.all([
        api.getRecintos(),
        api.getCategorias()
      ]);
      const listaRecs = Array.isArray(recs) ? recs : (recs as any)?.items || [];
      const listaCats = Array.isArray(cats) ? cats : (cats as any)?.items || [];
      setRecintos(listaRecs);
      setCategorias(listaCats);
      if (listaRecs.length > 0 && !eventoForm.recintoId) {
        setEventoForm((prev) => ({ ...prev, recintoId: listaRecs[0].id }));
      }
      if (listaCats.length > 0 && !eventoForm.categoriaId) {
        setEventoForm((prev) => ({ ...prev, categoriaId: listaCats[0].id }));
      }
    } catch (e) {
      showFeedback((e as any)?.detail || 'No se pudieron cargar los catálogos auxiliares.', 'error');
      setRecintos([]);
      setCategorias([]);
    }
  };

  const fetchEventos = async () => {
    setLoading(true);
    try {
      setLoadError(null);
      const items = await api.getEventosAdmin();
      if (user?.rol === 'DUENO_RECINTO') {
        const propios = new Set((await api.getRecintos()).map(r => r.id));
        setEventos(items.filter(ev => propios.has(ev.recintoId)));
      } else setEventos(items);
    } catch (err: any) {
      setEventos([]);
      setLoadError(err?.detail || 'No se pudieron cargar los eventos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogos();
    fetchEventos();
  }, []);

  // --- CRUD EVENTOS ---
  const handleOpenCreateEvento = () => {
    setEditingEvento(null);
    setEventoForm({
      recintoId: recintos[0]?.id || 0,
      categoriaId: categorias[0]?.id || 0,
      nombre: '',
      descripcion: '',
      fechaInicio: '',
      fechaFin: '',
      fechaInicioVenta: '',
      fechaFinVenta: '',
      maxBoletosPorCompra: 6,
      imagenUrl: ''
    });
    setEventoModalOpen(true);
  };

  const handleOpenEditEvento = async (ev: EventoCatalogo) => {
    try {
      const detalle = await api.getEventoAdmin(ev.id);
      setEditingEvento(detalle);
      setEventoForm({
        recintoId: detalle.recintoId, categoriaId: detalle.categoriaId,
        nombre: detalle.titulo, descripcion: detalle.descripcion,
        fechaInicio: toLocalDateTime(detalle.fechaInicio), fechaFin: toLocalDateTime(detalle.fechaFin),
        fechaInicioVenta: toLocalDateTime(detalle.fechaInicioVenta), fechaFinVenta: toLocalDateTime(detalle.fechaFinVenta),
        maxBoletosPorCompra: detalle.maxBoletosPorCompra, imagenUrl: detalle.imagenFlyerUrl || '',
      });
      setEventoModalOpen(true);
    } catch (err: any) { showFeedback(err?.detail || 'No se pudo cargar el evento para editarlo.', 'error'); }
  };

  const handleSaveEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const inicio = new Date(eventoForm.fechaInicio).getTime();
    if (!Number.isFinite(inicio) || !eventoForm.recintoId || !eventoForm.categoriaId ||
        (eventoForm.fechaFin && new Date(eventoForm.fechaFin).getTime() <= inicio) ||
        (eventoForm.fechaInicioVenta && eventoForm.fechaFinVenta && new Date(eventoForm.fechaInicioVenta) >= new Date(eventoForm.fechaFinVenta))) {
      showFeedback('Revisa el recinto, la categoría y el orden de las fechas.', 'error'); return;
    }
    setSaving(true);
    try {
      const payload: any = {
        recintoId: Number(eventoForm.recintoId),
        categoriaId: Number(eventoForm.categoriaId),
        nombre: eventoForm.nombre,
        descripcion: eventoForm.descripcion,
        fechaInicio: toApiDateTime(eventoForm.fechaInicio, editingEvento?.fechaInicio),
        fechaFin: toApiDateTime(eventoForm.fechaFin, editingEvento?.fechaFin),
        fechaInicioVenta: editingEvento && editingEvento.fechaInicioVenta === undefined && !eventoForm.fechaInicioVenta ? undefined : toApiDateTime(eventoForm.fechaInicioVenta, editingEvento?.fechaInicioVenta),
        fechaFinVenta: editingEvento && editingEvento.fechaFinVenta === undefined && !eventoForm.fechaFinVenta ? undefined : toApiDateTime(eventoForm.fechaFinVenta, editingEvento?.fechaFinVenta),
        maxBoletosPorCompra: Number(eventoForm.maxBoletosPorCompra),
        imagenUrl: eventoForm.imagenUrl || null
      };

      if (editingEvento) {
        await api.actualizarEvento(editingEvento.id, payload);
        showFeedback(`Evento "${eventoForm.nombre}" actualizado.`);
      } else {
        await api.crearEvento(payload);
        showFeedback(`Evento "${eventoForm.nombre}" creado en estado BORRADOR.`);
      }
      setEventoModalOpen(false);
      fetchEventos();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al guardar el evento', 'error');
    } finally { setSaving(false); }
  };

  const handleDeleteEvento = async (id: number, titulo: string) => {
    if (!confirm(`¿Eliminar o cancelar el evento "${titulo}"? Solo se permite si no registra ventas.`)) return;
    try {
      await api.eliminarEvento(id);
      showFeedback(`Evento "${titulo}" cancelado/eliminado.`);
      fetchEventos();
    } catch (err: any) {
      showFeedback(err?.detail || 'No se pudo eliminar el evento.', 'error');
    }
  };

  // --- TRANSICIÓN DE ESTADO ---
  const handleOpenEstado = (ev: EventoCatalogo) => {
    setSelectedEventoParaEstado(ev);
    setNuevoEstadoSeleccionado((ev.estado as string) === 'BORRADOR' ? 'PROGRAMADO' : (ev.estado as string) === 'PROGRAMADO' ? 'EN_VENTA' : 'FINALIZADO');
    setEstadoModalOpen(true);
  };

  const handleCambiarEstado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventoParaEstado) return;
    try {
      await api.actualizarEstadoEvento(
        selectedEventoParaEstado.id, 
        nuevoEstadoSeleccionado,
        selectedEventoParaEstado.estado
      );
      showFeedback(`Estado del evento cambiado a "${nuevoEstadoSeleccionado}".`);
      setEstadoModalOpen(false);
      fetchEventos();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error en la transición de estado.', 'error');
    }
  };

  // --- SUBIR IMAGEN FLYER ---
  const handleUploadFlyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventoParaImagen || !imageFile) return;
    setUploadingImage(true);
    try {
      await api.subirImagenEvento(selectedEventoParaImagen.id, imageFile);
      showFeedback(`Flyer cargado con éxito para "${selectedEventoParaImagen.titulo}".`);
      setImageModalOpen(false);
      setImageFile(null);
      fetchEventos();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al subir flyer.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // --- TIPOS DE ENTRADA ---
  const handleOpenTiposEntrada = async (ev: EventoCatalogo) => {
    setSelectedEventoParaEntradas(ev);
    setTiposEntradaModalOpen(true);
    try {
      const [entradas, locs] = await Promise.all([
        api.getTiposEntrada(ev.id),
        api.getLocalidades(ev.recintoId)
      ]);
      setTiposEntrada(entradas || []);
      setLocalidadesRecinto(locs || []);
    } catch (err: any) {
      setTiposEntrada([]);
      setLocalidadesRecinto([]);
      showFeedback(err?.detail || 'No se pudieron cargar las entradas y localidades.', 'error');
    }
  };

  const handleSaveTipoEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventoParaEntradas) return;
    try {
      const payload: any = {
        nombre: tipoEntradaForm.nombre,
        precio: Number(tipoEntradaForm.precio),
        cupoTotal: Number(tipoEntradaForm.cupoTotal),
        localidadId: tipoEntradaForm.localidadId ? Number(tipoEntradaForm.localidadId) : null
      };

      if (editingTipoEntrada) {
        await api.actualizarTipoEntrada(selectedEventoParaEntradas.id, editingTipoEntrada.id, payload);
        showFeedback(`Tipo de entrada "${tipoEntradaForm.nombre}" actualizado.`);
      } else {
        await api.crearTipoEntrada(selectedEventoParaEntradas.id, payload);
        showFeedback(`Tipo de entrada "${tipoEntradaForm.nombre}" creado.`);
      }
      setTipoEntradaFormOpen(false);
      const updated = await api.getTiposEntrada(selectedEventoParaEntradas.id);
      setTiposEntrada(updated || []);
    } catch (err: any) {
      showFeedback(err?.detail || 'Error guardando tipo de entrada.', 'error');
    }
  };

  const handleDeleteTipoEntrada = async (id: number, nombre: string) => {
    if (!selectedEventoParaEntradas) return;
    if (!confirm(`¿Dar de baja el tipo de entrada "${nombre}"?`)) return;
    try {
      await api.eliminarTipoEntrada(selectedEventoParaEntradas.id, id);
      showFeedback(`Tipo de entrada dado de baja.`);
      const updated = await api.getTiposEntrada(selectedEventoParaEntradas.id);
      setTiposEntrada(updated || []);
    } catch (err: any) {
      showFeedback(err?.detail || 'No se pudo eliminar el tipo de entrada.', 'error');
    }
  };

  const eventosFiltrados = eventos.filter((ev) => {
    const coincideBusqueda = !busqueda.trim() ||
      ev.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      ev.recintoNombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = filtroEstado === 'TODOS' || ev.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <LoadState loading={loading} error={loadError} empty={!eventos.length} onRetry={fetchEventos} />
      {/* Toast Feedback */}
      {feedback && (
        <div style={{
          padding: '12px 18px',
          border: '2px solid var(--border-strong)',
          backgroundColor: feedback.type === 'success' ? '#D1FAE5' : '#FEE2E2',
          color: feedback.type === 'success' ? '#065F46' : '#991B1B',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header y Filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.4rem' }}>Gestión Integral de Eventos</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Ciclo de vida del espectáculo: BORRADOR → PROGRAMADO → EN_VENTA → FINALIZADO.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar por título o recinto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input-base"
              style={{ paddingLeft: '32px', fontSize: '0.85rem', width: '240px' }}
            />
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="input-base"
            style={{ fontSize: '0.85rem', fontWeight: 600 }}
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="BORRADOR">BORRADOR</option>
            <option value="PROGRAMADO">PROGRAMADO</option>
            <option value="AGOTADO">AGOTADO</option>
            <option value="EN_VENTA">EN VENTA</option>
            <option value="FINALIZADO">FINALIZADO</option>
            <option value="CANCELADO">CANCELADO</option>
          </select>

          <button onClick={handleOpenCreateEvento} className="btn btn-primary btn-sm">
            <Plus size={16} /> Crear Evento
          </button>
        </div>
      </div>

      {/* Grid de Eventos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '20px'
      }}>
        {eventosFiltrados.map((ev) => (
          <div
            key={ev.id}
            style={{
              backgroundColor: '#FFF',
              border: '2px solid var(--border-strong)',
              boxShadow: 'var(--shadow-crisp-sm)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Cabecera / Banner */}
            <div style={{
              height: '140px',
              backgroundColor: 'var(--bg-canvas)',
              position: 'relative',
              borderBottom: '2px solid var(--border-strong)'
            }}>
              {ev.imagenFlyerUrl ? (
                <img src={ev.imagenFlyerUrl} alt={ev.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <Calendar size={36} />
                </div>
              )}
              <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                <span className={`badge ${
                  ev.estado === 'EN_VENTA' ? 'badge-valido' :
                  (ev.estado as string) === 'PROGRAMADO' ? 'badge-completada' : (ev.estado as string) === 'PUBLICADO' ? 'badge-completada' :
                  ev.estado === 'BORRADOR' ? 'badge-pendiente' : 'badge-anulado'
                }`}>
                  {ev.estado}
                </span>
              </div>
              <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
                <span className="badge badge-categoria" style={{ fontSize: '0.7rem' }}>
                  {ev.categoriaNombre || 'General'}
                </span>
              </div>
            </div>

            {/* Contenido */}
            <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{ev.titulo}</h4>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} /> {ev.recintoNombre}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} /> {new Date(ev.fechaInicio).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Ticket size={14} /> Cupo: <strong>{ev.cupoDisponible}</strong> / {ev.cupoTotal} disponibles
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleOpenTiposEntrada(ev)}
                    className="btn btn-sm btn-inverse"
                    style={{ flex: 1, gap: '4px' }}
                  >
                    <Ticket size={14} /> Entradas / Precios
                  </button>
                  <button
                    onClick={() => handleOpenEstado(ev)}
                    className="btn btn-sm btn-outline"
                    title="Cambiar estado del ciclo de vida"
                  >
                    <ArrowRight size={14} /> Estado
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleOpenEditEvento(ev)}
                    className="btn btn-sm btn-outline"
                    style={{ flex: 1 }}
                  >
                    <Edit2 size={13} /> Editar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedEventoParaImagen(ev);
                      setImageFile(null);
                      setImageModalOpen(true);
                    }}
                    className="btn btn-sm btn-outline"
                    title="Subir flyer oficial"
                  >
                    <Upload size={13} /> Flyer
                  </button>
                  <button
                    onClick={() => handleDeleteEvento(ev.id, ev.titulo)}
                    className="btn btn-sm btn-outline"
                    style={{ color: 'var(--accent-vermilion)' }}
                    title="Cancelar o dar de baja"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL CREAR / EDITAR EVENTO --- */}
      <Modal
        isOpen={eventoModalOpen}
        onClose={() => setEventoModalOpen(false)}
        title={editingEvento ? 'Editar Evento' : 'Crear Nuevo Evento (Borrador)'}
        maxWidth="620px"
      >
        <form onSubmit={handleSaveEvento} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Título o Nombre del Evento *
            </label>
            <input
              type="text"
              required
              value={eventoForm.nombre}
              onChange={(e) => setEventoForm({ ...eventoForm, nombre: e.target.value })}
              className="input-base"
              placeholder="Ej: Festival Internacional de Jazz de Guatemala 2026"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                Recinto Sede *
              </label>
              <select
                disabled={!!editingEvento}
                value={eventoForm.recintoId}
                onChange={(e) => setEventoForm({ ...eventoForm, recintoId: Number(e.target.value) })}
                className="input-base"
                required
              >
                {(Array.isArray(recintos) ? recintos : []).map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                Categoría *
              </label>
              <select
                value={eventoForm.categoriaId}
                onChange={(e) => setEventoForm({ ...eventoForm, categoriaId: Number(e.target.value) })}
                className="input-base"
                required
              >
                {(Array.isArray(categorias) ? categorias : []).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                Fecha y Hora de Inicio *
              </label>
              <input
                type="datetime-local"
                required
                value={eventoForm.fechaInicio}
                onChange={(e) => setEventoForm({ ...eventoForm, fechaInicio: e.target.value })}
                className="input-base"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                Fecha y Hora de Conclusión
              </label>
              <input
                type="datetime-local"
                value={eventoForm.fechaFin}
                onChange={(e) => setEventoForm({ ...eventoForm, fechaFin: e.target.value })}
                className="input-base"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                Apertura de Venta
              </label>
              <input
                type="datetime-local"
                value={eventoForm.fechaInicioVenta}
                onChange={(e) => setEventoForm({ ...eventoForm, fechaInicioVenta: e.target.value })}
                className="input-base"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                Cierre de Venta
              </label>
              <input
                type="datetime-local"
                value={eventoForm.fechaFinVenta}
                onChange={(e) => setEventoForm({ ...eventoForm, fechaFinVenta: e.target.value })}
                className="input-base"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                Máx Boletos / Compra
              </label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={eventoForm.maxBoletosPorCompra}
                onChange={(e) => setEventoForm({ ...eventoForm, maxBoletosPorCompra: Number(e.target.value) })}
                className="input-base"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                URL Imagen Flyer (Opcional)
              </label>
              <input
                type="url"
                value={eventoForm.imagenUrl}
                onChange={(e) => setEventoForm({ ...eventoForm, imagenUrl: e.target.value })}
                className="input-base"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Sinopsis y Descripción del Evento
            </label>
            <textarea
              rows={3}
              value={eventoForm.descripcion}
              onChange={(e) => setEventoForm({ ...eventoForm, descripcion: e.target.value })}
              className="input-base"
              placeholder="Detalles sobre el repertorio, normas de acceso, horarios y amenidades."
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={() => setEventoModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
              {saving ? 'Guardando…' : 'Guardar Evento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL TRANSICIÓN DE ESTADO --- */}
      <Modal
        isOpen={estadoModalOpen}
        onClose={() => setEstadoModalOpen(false)}
        title="Cambiar Estado del Evento"
        maxWidth="460px"
      >
        <form onSubmit={handleCambiarEstado} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: '8px' }}>
              Evento: <strong>{selectedEventoParaEstado?.titulo}</strong>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Estado Actual: <span className="badge badge-categoria">{selectedEventoParaEstado?.estado}</span>
            </div>

            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Nuevo Estado Destino *
            </label>
            <select
              value={nuevoEstadoSeleccionado}
              onChange={(e) => setNuevoEstadoSeleccionado(e.target.value)}
              className="input-base"
              style={{ fontWeight: 700 }}
            >
              <option value="BORRADOR">BORRADOR (En diseño, no visible)</option>
              <option value="PROGRAMADO">PROGRAMADO (Visible en cartelera)</option>
              <option value="EN_VENTA">EN VENTA (Permite compras y reservas)</option>
              <option value="FINALIZADO">FINALIZADO (Evento concluido)</option>
              <option value="CANCELADO">CANCELADO (Cancelación oficial)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={() => setEstadoModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Confirmar Transición
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL SUBIR FLYER --- */}
      <Modal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title={`Cargar Flyer Oficial: ${selectedEventoParaImagen?.titulo}`}
        maxWidth="440px"
      >
        <form onSubmit={handleUploadFlyer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Selecciona una imagen en alta definición para la portada de cartelera y banners publicitarios.
          </p>

          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="input-base"
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={() => setImageModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={uploadingImage || !imageFile} className="btn btn-primary" style={{ flex: 1 }}>
              {uploadingImage ? 'Subiendo...' : 'Subir Imagen'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL GESTIÓN TIPOS DE ENTRADA --- */}
      <Modal
        isOpen={tiposEntradaModalOpen}
        onClose={() => setTiposEntradaModalOpen(false)}
        title={`Tipos de Entrada: ${selectedEventoParaEntradas?.titulo}`}
        maxWidth="680px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Configura los precios, cupos y vinculación a localidades del recinto.
            </p>
            {!tipoEntradaFormOpen && (
              <button
                onClick={() => {
                  setEditingTipoEntrada(null);
                  setTipoEntradaForm({
                    nombre: '',
                    precio: 150,
                    cupoTotal: 100,
                    localidadId: localidadesRecinto[0]?.id
                  });
                  setTipoEntradaFormOpen(true);
                }}
                className="btn btn-sm btn-primary"
              >
                <Plus size={14} /> Nueva Entrada
              </button>
            )}
          </div>

          {/* Formulario Crear/Editar Entrada */}
          {tipoEntradaFormOpen && (
            <form
              onSubmit={handleSaveTipoEntrada}
              style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '2px solid var(--border-strong)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>
                {editingTipoEntrada ? 'Editar Tipo de Entrada' : 'Nuevo Tipo de Entrada'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                    Nombre Entrada *
                  </label>
                  <input
                    type="text"
                    required
                    value={tipoEntradaForm.nombre}
                    onChange={(e) => setTipoEntradaForm({ ...tipoEntradaForm, nombre: e.target.value })}
                    className="input-base"
                    placeholder="Ej: VIP Golden"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                    Precio (Q) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={tipoEntradaForm.precio}
                    onChange={(e) => setTipoEntradaForm({ ...tipoEntradaForm, precio: Number(e.target.value) })}
                    className="input-base"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                    Cupo Total *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={tipoEntradaForm.cupoTotal}
                    onChange={(e) => setTipoEntradaForm({ ...tipoEntradaForm, cupoTotal: Number(e.target.value) })}
                    className="input-base"
                  />
                </div>
              </div>

              {!editingTipoEntrada && (
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                    Localidad del Recinto (Opcional si es Entrada General)
                  </label>
                  <select
                    value={tipoEntradaForm.localidadId || ''}
                    onChange={(e) => setTipoEntradaForm({ ...tipoEntradaForm, localidadId: e.target.value ? Number(e.target.value) : undefined })}
                    className="input-base"
                  >
                    <option value="">-- Sin Localidad Fija (General) --</option>
                    {localidadesRecinto.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.nombre} (Capacidad: {loc.capacidad})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setTipoEntradaFormOpen(false)}
                  className="btn btn-sm btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  style={{ flex: 1 }}
                >
                  Guardar Tipo de Entrada
                </button>
              </div>
            </form>
          )}

          {/* Lista de Tipos de Entrada */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tiposEntrada.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                No hay tipos de entrada definidos para este evento.
              </div>
            ) : (
              tiposEntrada.map((t) => (
                <div
                  key={t.id}
                  style={{
                    backgroundColor: '#FFF',
                    border: '1.5px solid var(--border-strong)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>
                      {t.nombre}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Cupo: <strong>{t.cupoDisponible ?? t.cupoTotal}</strong> / {t.cupoTotal} boletos
                      {t.localidadNombre && ` · Localidad: ${t.localidadNombre}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-vermilion)' }}>
                      Q{(t.precioUnitario ?? t.precio ?? 0).toFixed(2)}
                    </div>
                    <button
                      onClick={() => {
                        setEditingTipoEntrada(t);
                        setTipoEntradaForm({
                          nombre: t.nombre,
                          precio: t.precioUnitario ?? t.precio ?? 0,
                          cupoTotal: t.cupoTotal,
                          localidadId: t.localidadId
                        });
                        setTipoEntradaFormOpen(true);
                      }}
                      className="btn btn-sm btn-outline"
                      title="Editar entrada"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteTipoEntrada(t.id, t.nombre)}
                      className="btn btn-sm btn-outline"
                      style={{ color: 'var(--accent-vermilion)' }}
                      title="Dar de baja entrada"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <button onClick={() => setTiposEntradaModalOpen(false)} className="btn btn-sm btn-outline">
              Cerrar
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
