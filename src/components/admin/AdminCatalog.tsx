import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { CategoriaDetalleDto, PresentadorDetalleDto, EventoCatalogo, EventoPresentadorItemDto } from '../../types/api';
import { Modal } from '../common/Modal';
import { 
  Tag, 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  Star, 
  Link as LinkIcon, 
  Search, 
  CheckCircle,
  XCircle
} from 'lucide-react';

export const AdminCatalog: React.FC = () => {
  const [subTab, setSubTab] = useState<'CATEGORIAS' | 'PRESENTADORES' | 'EVENTOS_PRESENTADORES'>('CATEGORIAS');

  // --- CATEGORÍAS STATE ---
  const [categorias, setCategorias] = useState<CategoriaDetalleDto[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<CategoriaDetalleDto | null>(null);
  const [categoriaForm, setCategoriaForm] = useState({
    nombre: '',
    descripcion: '',
    activo: true
  });

  // --- PRESENTADORES STATE ---
  const [presentadores, setPresentadores] = useState<PresentadorDetalleDto[]>([]);
  const [busquedaPresentador, setBusquedaPresentador] = useState('');
  const [loadingPresentadores, setLoadingPresentadores] = useState(false);
  const [presentadorModalOpen, setPresentadorModalOpen] = useState(false);
  const [editingPresentador, setEditingPresentador] = useState<PresentadorDetalleDto | null>(null);
  const [presentadorForm, setPresentadorForm] = useState({
    nombreArtistico: '',
    biografia: ''
  });
  const [selectedPresentadorForImage, setSelectedPresentadorForImage] = useState<PresentadorDetalleDto | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // --- EVENTOS & ASOCIACIONES STATE ---
  const [eventos, setEventos] = useState<EventoCatalogo[]>([]);
  const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);
  const [eventoPresentadores, setEventoPresentadores] = useState<EventoPresentadorItemDto[]>([]);
  const [asociarModalOpen, setAsociarModalOpen] = useState(false);
  const [asociarForm, setAsociarForm] = useState({
    presentadorId: 0,
    rol: 'PRINCIPAL',
    orden: 1
  });

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // --- CARGA INICIAL ---
  const fetchCategorias = async () => {
    setLoadingCategorias(true);
    try {
      const data = await api.getCategorias();
      setCategorias(data || []);
    } catch (e: any) {
      showFeedback('Error cargando categorías: ' + (e?.detail || e.message), 'error');
    } finally {
      setLoadingCategorias(false);
    }
  };

  const fetchPresentadores = async () => {
    setLoadingPresentadores(true);
    try {
      const res = await api.getPresentadores();
      setPresentadores(res || []);
    } catch (e: any) {
      showFeedback('Error cargando presentadores: ' + (e?.detail || e.message), 'error');
    } finally {
      setLoadingPresentadores(false);
    }
  };

  const fetchEventos = async () => {
    try {
      const res = await api.getEventos({ pageSize: 50 });
      setEventos(res.items || []);
      if (res.items?.length > 0 && !selectedEventoId) {
        setSelectedEventoId(res.items[0].id);
      }
    } catch (e) {
      console.warn('Error cargando eventos:', e);
    }
  };

  const fetchEventoPresentadores = async (eventoId: number) => {
    try {
      const data = await api.getEventoPresentadores(eventoId);
      setEventoPresentadores(data || []);
    } catch (e: any) {
      setEventoPresentadores([]);
    }
  };

  useEffect(() => {
    fetchCategorias();
    fetchPresentadores();
    fetchEventos();
  }, []);

  useEffect(() => {
    if (selectedEventoId) {
      fetchEventoPresentadores(selectedEventoId);
    }
  }, [selectedEventoId]);

  // --- ACCIONES CATEGORÍAS ---
  const handleOpenCategoriaCreate = () => {
    setEditingCategoria(null);
    setCategoriaForm({ nombre: '', descripcion: '', activo: true });
    setCategoriaModalOpen(true);
  };

  const handleOpenCategoriaEdit = (cat: CategoriaDetalleDto) => {
    setEditingCategoria(cat);
    setCategoriaForm({
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      activo: cat.activo
    });
    setCategoriaModalOpen(true);
  };

  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategoria) {
        await api.actualizarCategoria(editingCategoria.id, categoriaForm);
        showFeedback(`Categoría "${categoriaForm.nombre}" actualizada con éxito.`);
      } else {
        await api.crearCategoria(categoriaForm);
        showFeedback(`Categoría "${categoriaForm.nombre}" creada con éxito.`);
      }
      setCategoriaModalOpen(false);
      fetchCategorias();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error guardando categoría', 'error');
    }
  };

  const handleDeleteCategoria = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${nombre}"?`)) return;
    try {
      await api.eliminarCategoria(id);
      showFeedback(`Categoría "${nombre}" eliminada correctamente.`);
      fetchCategorias();
    } catch (err: any) {
      showFeedback(err?.detail || 'No se pudo eliminar la categoría.', 'error');
    }
  };

  // --- ACCIONES PRESENTADORES ---
  const handleOpenPresentadorCreate = () => {
    setEditingPresentador(null);
    setPresentadorForm({
      nombreArtistico: '',
      biografia: ''
    });
    setPresentadorModalOpen(true);
  };

  const handleOpenPresentadorEdit = (p: PresentadorDetalleDto) => {
    setEditingPresentador(p);
    setPresentadorForm({
      nombreArtistico: p.nombreArtistico,
      biografia: p.biografia || ''
    });
    setPresentadorModalOpen(true);
  };

  const handleSavePresentador = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPresentador) {
        await api.actualizarPresentador(editingPresentador.id, presentadorForm);
        showFeedback(`Presentador "${presentadorForm.nombreArtistico}" actualizado.`);
      } else {
        await api.crearPresentador(presentadorForm);
        showFeedback(`Presentador "${presentadorForm.nombreArtistico}" registrado.`);
      }
      setPresentadorModalOpen(false);
      fetchPresentadores();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error guardando presentador', 'error');
    }
  };

  const handleDeletePresentador = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar presentador "${nombre}"?`)) return;
    try {
      await api.eliminarPresentador(id);
      showFeedback(`Presentador "${nombre}" eliminado.`);
      fetchPresentadores();
    } catch (err: any) {
      showFeedback(err?.detail || 'No se pudo eliminar el presentador.', 'error');
    }
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPresentadorForImage || !imageFile) return;
    setUploadingImage(true);
    try {
      await api.subirFotoPresentador(selectedPresentadorForImage.id, imageFile);
      showFeedback(`Foto actualizada para "${selectedPresentadorForImage.nombreArtistico}".`);
      setSelectedPresentadorForImage(null);
      setImageFile(null);
      fetchPresentadores();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al subir imagen', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // --- ACCIONES ASOCIACIÓN EVENTO-PRESENTADOR ---
  const handleAsociar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventoId || !asociarForm.presentadorId) return;
    try {
      await api.asignarPresentadorEvento(selectedEventoId, {
        presentadorId: asociarForm.presentadorId,
        rol: asociarForm.rol,
        orden: asociarForm.orden
      });
      showFeedback('Presentador asociado al evento correctamente.');
      setAsociarModalOpen(false);
      fetchEventoPresentadores(selectedEventoId);
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al asociar presentador', 'error');
    }
  };

  const handleDesasociar = async (presentadorId: number, nombre: string) => {
    if (!selectedEventoId) return;
    if (!confirm(`¿Remover a "${nombre}" de este evento?`)) return;
    try {
      await api.quitarPresentadorEvento(selectedEventoId, presentadorId);
      showFeedback(`Presentador removido del evento.`);
      fetchEventoPresentadores(selectedEventoId);
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al remover presentador', 'error');
    }
  };

  const presentadoresFiltrados = presentadores.filter((p) =>
    !busquedaPresentador.trim() ||
    p.nombreArtistico.toLowerCase().includes(busquedaPresentador.toLowerCase()) ||
    (p.biografia && p.biografia.toLowerCase().includes(busquedaPresentador.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Notificación Toast */}
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

      {/* Subnavegador de Catálogo */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSubTab('CATEGORIAS')}
          className={`btn btn-sm ${subTab === 'CATEGORIAS' ? 'btn-inverse' : 'btn-outline'}`}
        >
          <Tag size={15} /> Categorías de Eventos ({categorias.length})
        </button>
        <button
          onClick={() => setSubTab('PRESENTADORES')}
          className={`btn btn-sm ${subTab === 'PRESENTADORES' ? 'btn-inverse' : 'btn-outline'}`}
        >
          <Users size={15} /> Artistas & Presentadores ({presentadores.length})
        </button>
        <button
          onClick={() => setSubTab('EVENTOS_PRESENTADORES')}
          className={`btn btn-sm ${subTab === 'EVENTOS_PRESENTADORES' ? 'btn-inverse' : 'btn-outline'}`}
        >
          <LinkIcon size={15} /> Line-up por Evento
        </button>
      </div>

      {/* --- SECCIÓN CATEGORÍAS --- */}
      {subTab === 'CATEGORIAS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.4rem' }}>Gestión de Categorías</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Clasificación de eventos (Música, Deportes, Cultura, etc.).
              </p>
            </div>
            <button onClick={handleOpenCategoriaCreate} className="btn btn-primary btn-sm">
              <Plus size={16} /> Nueva Categoría
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {categorias.map((cat) => (
              <div
                key={cat.id}
                style={{
                  backgroundColor: '#FFF',
                  border: '2px solid var(--border-strong)',
                  boxShadow: 'var(--shadow-crisp-sm)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge badge-categoria" style={{ textTransform: 'uppercase' }}>
                      ID #{cat.id}
                    </span>
                    <span className={`badge ${cat.activo ? 'badge-valido' : 'badge-anulado'}`}>
                      {cat.activo ? 'ACTIVA' : 'INACTIVA'}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{cat.nombre}</h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    {cat.descripcion || 'Sin descripción adicional.'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <button
                    onClick={() => handleOpenCategoriaEdit(cat)}
                    className="btn btn-sm btn-outline"
                    style={{ flex: 1 }}
                  >
                    <Edit2 size={14} /> Editar
                  </button>
                  <button
                    onClick={() => handleDeleteCategoria(cat.id, cat.nombre)}
                    className="btn btn-sm btn-outline"
                    style={{ color: 'var(--accent-vermilion)' }}
                    title="Eliminar categoría"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SECCIÓN PRESENTADORES --- */}
      {subTab === 'PRESENTADORES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.4rem' }}>Artistas, Bandas & Presentadores</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Catálogo global de talento participante en producciones.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Buscar talento..."
                  value={busquedaPresentador}
                  onChange={(e) => setBusquedaPresentador(e.target.value)}
                  className="input-base"
                  style={{ paddingLeft: '32px', fontSize: '0.85rem', width: '220px' }}
                />
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
              </div>
              <button onClick={handleOpenPresentadorCreate} className="btn btn-primary btn-sm">
                <Plus size={16} /> Nuevo Talento
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px'
          }}>
            {presentadoresFiltrados.map((p) => (
              <div
                key={p.id}
                style={{
                  backgroundColor: '#FFF',
                  border: '2px solid var(--border-strong)',
                  boxShadow: 'var(--shadow-crisp-sm)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '14px', marginBottom: '12px' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1.5px solid var(--border-strong)',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {p.fotoUrl ? (
                        <img src={p.fotoUrl} alt={p.nombreArtistico} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Users size={24} color="var(--text-muted)" />
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="badge badge-categoria" style={{ fontSize: '0.65rem' }}>TALENTO</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                          ★ {(p.promedioCalificacion || 5.0).toFixed(1)}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '1.15rem', marginTop: '4px' }}>{p.nombreArtistico}</h4>
                    </div>
                  </div>

                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                    marginBottom: '14px',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {p.biografia || 'Sin biografía disponible.'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <button
                    onClick={() => handleOpenPresentadorEdit(p)}
                    className="btn btn-sm btn-outline"
                    style={{ flex: 1 }}
                  >
                    <Edit2 size={13} /> Editar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPresentadorForImage(p);
                      setImageFile(null);
                    }}
                    className="btn btn-sm btn-outline"
                    title="Subir fotografía"
                  >
                    <Upload size={13} /> Foto
                  </button>
                  <button
                    onClick={() => handleDeletePresentador(p.id, p.nombreArtistico)}
                    className="btn btn-sm btn-outline"
                    style={{ color: 'var(--accent-vermilion)' }}
                    title="Eliminar talento"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SECCIÓN EVENTOS Y LINE-UP --- */}
      {subTab === 'EVENTOS_PRESENTADORES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.4rem' }}>Line-up y Presentadores por Evento</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Vincula los artistas o bandas que conformarán el cartel oficial de cada fecha.
            </p>
          </div>

          <div style={{
            backgroundColor: '#FFF',
            border: '2px solid var(--border-strong)',
            padding: '16px',
            boxShadow: 'var(--shadow-crisp-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>
              Seleccionar Evento:
            </label>
            <select
              value={selectedEventoId || ''}
              onChange={(e) => setSelectedEventoId(Number(e.target.value))}
              className="input-base"
              style={{ minWidth: '300px', fontWeight: 600 }}
            >
              {eventos.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.titulo} ({ev.recintoNombre})
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setAsociarForm({
                  presentadorId: presentadores[0]?.id || 0,
                  rol: 'PRINCIPAL',
                  orden: eventoPresentadores.length + 1
                });
                setAsociarModalOpen(true);
              }}
              className="btn btn-sm btn-primary"
            >
              <Plus size={16} /> Asociar Artista al Cartel
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {eventoPresentadores.length === 0 ? (
              <div style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '2px dashed var(--border-strong)',
                padding: '32px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)'
              }}>
                No hay artistas asociados en el cartel de este evento aún.
              </div>
            ) : (
              eventoPresentadores.map((item) => (
                <div
                  key={item.presentadorId}
                  style={{
                    backgroundColor: '#FFF',
                    border: '2px solid var(--border-strong)',
                    boxShadow: 'var(--shadow-crisp-sm)',
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span className="badge badge-categoria" style={{ fontFamily: 'var(--font-mono)' }}>
                      Orden #{item.orden}
                    </span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>
                        {item.nombreArtistico}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Rol: <strong>{item.rol || 'PRINCIPAL'}</strong> · ID Presentador: {item.presentadorId}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDesasociar(item.presentadorId, item.nombreArtistico)}
                    className="btn btn-sm btn-outline"
                    style={{ color: 'var(--accent-vermilion)' }}
                  >
                    <Trash2 size={15} /> Remover
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- MODAL CATEGORÍA (CREAR / EDITAR) --- */}
      <Modal
        isOpen={categoriaModalOpen}
        onClose={() => setCategoriaModalOpen(false)}
        title={editingCategoria ? 'Editar Categoría' : 'Nueva Categoría de Evento'}
        maxWidth="480px"
      >
        <form onSubmit={handleSaveCategoria} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Nombre de la Categoría *
            </label>
            <input
              type="text"
              required
              value={categoriaForm.nombre}
              onChange={(e) => setCategoriaForm({ ...categoriaForm, nombre: e.target.value })}
              className="input-base"
              placeholder="Ej: Conciertos & Festivales"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Descripción
            </label>
            <textarea
              rows={3}
              value={categoriaForm.descripcion}
              onChange={(e) => setCategoriaForm({ ...categoriaForm, descripcion: e.target.value })}
              className="input-base"
              placeholder="Breve reseña sobre el tipo de espectáculos que abarca."
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="cat-activo"
              checked={categoriaForm.activo}
              onChange={(e) => setCategoriaForm({ ...categoriaForm, activo: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="cat-activo" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              Categoría Activa (Visible en filtros de búsqueda del catálogo)
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={() => setCategoriaModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Guardar Categoría
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL PRESENTADOR (CREAR / EDITAR) --- */}
      <Modal
        isOpen={presentadorModalOpen}
        onClose={() => setPresentadorModalOpen(false)}
        title={editingPresentador ? 'Editar Presentador / Artista' : 'Registrar Nuevo Artista o Talento'}
        maxWidth="560px"
      >
        <form onSubmit={handleSavePresentador} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Nombre Artístico *
            </label>
            <input
              type="text"
              required
              value={presentadorForm.nombreArtistico}
              onChange={(e) => setPresentadorForm({ ...presentadorForm, nombreArtistico: e.target.value })}
              className="input-base"
              placeholder="Ej: Banda El Recodo"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Biografía / Perfil Artístico
            </label>
            <textarea
              rows={4}
              value={presentadorForm.biografia}
              onChange={(e) => setPresentadorForm({ ...presentadorForm, biografia: e.target.value })}
              className="input-base"
              placeholder="Trayectoria, reconocimientos, premios y descripción para el público."
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={() => setPresentadorModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Guardar Talento
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL SUBIR FOTO TALENTO --- */}
      <Modal
        isOpen={!!selectedPresentadorForImage}
        onClose={() => setSelectedPresentadorForImage(null)}
        title={`Fotografía de ${selectedPresentadorForImage?.nombreArtistico}`}
        maxWidth="440px"
      >
        <form onSubmit={handleUploadImage} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Sube un archivo de imagen (PNG, JPG o WEBP) de alta resolución para la cartelera y banner del artista.
          </p>

          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="input-base"
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={() => setSelectedPresentadorForImage(null)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={uploadingImage || !imageFile} className="btn btn-primary" style={{ flex: 1 }}>
              {uploadingImage ? 'Cargando...' : 'Subir Imagen'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL ASOCIAR AL EVENTO --- */}
      <Modal
        isOpen={asociarModalOpen}
        onClose={() => setAsociarModalOpen(false)}
        title="Asociar Talento al Evento"
        maxWidth="460px"
      >
        <form onSubmit={handleAsociar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Seleccionar Artista / Presentador *
            </label>
            <select
              value={asociarForm.presentadorId}
              onChange={(e) => setAsociarForm({ ...asociarForm, presentadorId: Number(e.target.value) })}
              className="input-base"
              required
            >
              <option value="">-- Selecciona --</option>
              {presentadores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombreArtistico}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                Rol en Cartel
              </label>
              <input
                type="text"
                value={asociarForm.rol}
                onChange={(e) => setAsociarForm({ ...asociarForm, rol: e.target.value })}
                className="input-base"
                placeholder="Ej: HEADLINER"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                Orden de Aparición
              </label>
              <input
                type="number"
                min={1}
                value={asociarForm.orden}
                onChange={(e) => setAsociarForm({ ...asociarForm, orden: Number(e.target.value) })}
                className="input-base"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={() => setAsociarModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Confirmar Asociación
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
