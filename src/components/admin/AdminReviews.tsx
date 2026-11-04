import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { ResenaPublica } from '../../types/api';
import { Modal } from '../common/Modal';
import { 
  MessageSquare, 
  Check, 
  X, 
  Edit3, 
  Trash2, 
  Star, 
  RotateCcw, 
  Filter, 
  ShieldCheck, 
  User, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

export const AdminReviews: React.FC = () => {
  const [subTab, setSubTab] = useState<'COLA_MODERACION' | 'MIS_RESENAS'>('COLA_MODERACION');
  const [resenasCola, setResenasCola] = useState<ResenaPublica[]>([]);
  const [misResenas, setMisResenas] = useState<ResenaPublica[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<string>('PENDIENTE');

  // Modal para editar reseña propia
  const [editingResena, setEditingResena] = useState<ResenaPublica | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComentario, setEditComentario] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchCola = async () => {
    setLoading(true);
    try {
      const res = await api.getColaResenas({
        estado: filtroEstado === 'TODOS' ? undefined : filtroEstado,
        pageSize: 50
      });
      if (res && res.items) {
        setResenasCola(res.items);
      } else {
        setResenasCola([]);
      }
    } catch {
      setResenasCola([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMisResenas = async () => {
    try {
      const res = await api.getMisResenas(1, 50);
      if (res && res.items) {
        setMisResenas(res.items);
      }
    } catch {
      // Ignorar si no está autenticado como cliente
    }
  };

  useEffect(() => {
    if (subTab === 'COLA_MODERACION') {
      fetchCola();
    } else {
      fetchMisResenas();
    }
  }, [subTab, filtroEstado]);

  const handleModerar = async (id: number, decision: 'APROBADA' | 'RECHAZADA') => {
    try {
      await api.moderarResena(id, decision);
      showFeedback(`Reseña #${id} marcada como ${decision}.`);
      setResenasCola((prev) =>
        prev.map((r) => (r.id === id ? { ...r, estado: decision } : r))
      );
    } catch (err: any) {
      showFeedback(err.detail || 'No se pudo moderar la reseña.', 'error');
    }
  };

  const handleOpenEdit = (resena: ResenaPublica) => {
    setEditingResena(resena);
    setEditRating(resena.calificacion);
    setEditComentario(resena.comentario);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResena) return;
    setGuardando(true);
    try {
      await api.editarResena(editingResena.id, {
        calificacion: editRating,
        comentario: editComentario,
        estadoEsperado: editingResena.estado
      });
      showFeedback('Reseña actualizada y enviada nuevamente a revisión (PENDIENTE).');
      setEditingResena(null);
      fetchMisResenas();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al actualizar reseña.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleRetirarResena = async (resena: ResenaPublica) => {
    if (!confirm('¿Deseas retirar esta reseña pública? Pasará a estado RECHAZADA pero podrás reeditarla luego.')) return;
    try {
      await api.retirarResena(resena.id, resena.estado);
      showFeedback('Reseña retirada exitosamente.');
      fetchMisResenas();
    } catch (err: any) {
      showFeedback(err?.detail || 'No se pudo retirar la reseña.', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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

      {/* Regla de Negocio */}
      <div style={{
        backgroundColor: '#FFF',
        border: '2px solid var(--border-strong)',
        boxShadow: 'var(--shadow-crisp-sm)',
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <ShieldCheck size={28} color="var(--accent-cobalt)" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>
            Regla de Negocio #9: Auditoría Estricta de Opiniones
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
            Solo clientes con boleto <strong>USADO</strong> pueden calificar. Toda reseña nace en estado <strong>PENDIENTE</strong> y requiere aprobación administrativa antes de sumarse a las estrellas del artista y del evento.
          </p>
        </div>
      </div>

      {/* Selector de Subpestaña y Filtro */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSubTab('COLA_MODERACION')}
            className={`btn btn-sm ${subTab === 'COLA_MODERACION' ? 'btn-inverse' : 'btn-outline'}`}
          >
            <ShieldCheck size={14} /> Cola de Moderación Admin
          </button>

        </div>

        {subTab === 'COLA_MODERACION' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="input-base"
              style={{ fontSize: '0.85rem', fontWeight: 600 }}
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="PENDIENTE">PENDIENTE (Por revisar)</option>
              <option value="APROBADA">APROBADA (En catálogo)</option>
              <option value="RECHAZADA">RECHAZADA</option>
            </select>
          </div>
        )}
      </div>

      {/* --- SECCIÓN COLA DE MODERACIÓN --- */}
      {subTab === 'COLA_MODERACION' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              Cargando cola de moderación...
            </div>
          ) : resenasCola.length === 0 ? (
            <div style={{
              backgroundColor: 'var(--bg-canvas)',
              border: '2px dashed var(--border-strong)',
              padding: '40px',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)'
            }}>
              No hay reseñas pendientes bajo el filtro seleccionado.
            </div>
          ) : (
            resenasCola.map((r) => (
              <div
                key={r.id}
                style={{
                  backgroundColor: '#FFF',
                  border: '2px solid var(--border-strong)',
                  boxShadow: 'var(--shadow-crisp-sm)',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span className="badge badge-categoria">{r.eventoTitulo || `Evento #${r.eventoId}`}</span>
                    <span className={`badge ${
                      r.estado === 'APROBADA' ? 'badge-valido' :
                      r.estado === 'PENDIENTE' ? 'badge-pendiente' : 'badge-anulado'
                    }`}>
                      {r.estado}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                      ★ {r.calificacion}.0 / 5.0
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(r.creadoEn).toLocaleDateString('es-GT', { dateStyle: 'medium' })}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1.05rem', marginBottom: '6px' }}>
                    Cliente: {r.clienteNombre || 'Usuario Verificado'}
                  </h4>

                  <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>
                    "{r.comentario}"
                  </p>
                </div>

                {r.estado === 'PENDIENTE' ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleModerar(r.id, 'APROBADA')}
                      className="btn btn-sm btn-primary"
                      style={{ backgroundColor: 'var(--accent-emerald)', borderColor: 'var(--border-strong)' }}
                    >
                      <Check size={16} /> Aprobar
                    </button>
                    <button
                      onClick={() => handleModerar(r.id, 'RECHAZADA')}
                      className="btn btn-sm btn-outline"
                      style={{ color: 'var(--accent-vermilion)' }}
                    >
                      <X size={16} /> Rechazar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span>Solo las reseñas PENDIENTE admiten moderación.</span>
                    {r.estado === 'APROBADA' && (
                      <button
                        onClick={() => handleModerar(r.id, 'RECHAZADA')}
                        className="btn btn-sm btn-outline"
                        style={{ color: 'var(--accent-vermilion)' }}
                      >
                        <X size={14} /> Revocar Aprobación
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* --- SECCIÓN MIS RESEÑAS DE CLIENTE --- */}
      {subTab === 'MIS_RESENAS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {misResenas.length === 0 ? (
            <div style={{
              backgroundColor: 'var(--bg-canvas)',
              border: '2px dashed var(--border-strong)',
              padding: '40px',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)'
            }}>
              No tienes reseñas registradas con tu cuenta de cliente aún. Asiste a un evento con tu boleto para desbloquear el formulario.
            </div>
          ) : (
            misResenas.map((r) => (
              <div
                key={r.id}
                style={{
                  backgroundColor: '#FFF',
                  border: '2px solid var(--border-strong)',
                  boxShadow: 'var(--shadow-crisp-sm)',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span className="badge badge-categoria">{r.eventoTitulo || `Evento #${r.eventoId}`}</span>
                    <span className={`badge ${
                      r.estado === 'APROBADA' ? 'badge-valido' :
                      r.estado === 'PENDIENTE' ? 'badge-pendiente' : 'badge-anulado'
                    }`}>
                      {r.estado}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                      ★ {r.calificacion}.0 / 5.0
                    </span>
                  </div>

                  <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0 }}>
                    "{r.comentario}"
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleOpenEdit(r)}
                    className="btn btn-sm btn-outline"
                  >
                    <Edit3 size={14} /> Editar Opinión
                  </button>
                  {r.estado !== 'RECHAZADA' && (
                    <button
                      onClick={() => handleRetirarResena(r)}
                      className="btn btn-sm btn-outline"
                      style={{ color: 'var(--accent-vermilion)' }}
                    >
                      <Trash2 size={14} /> Retirar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* --- MODAL EDITAR RESEÑA --- */}
      <Modal
        isOpen={!!editingResena}
        onClose={() => setEditingResena(null)}
        title="Editar mi Reseña"
        maxWidth="480px"
      >
        <form onSubmit={handleGuardarEdicion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Al editar tu opinión, volverá al estado <strong>PENDIENTE</strong> para nueva validación por el equipo de control.
          </p>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}>
              Calificación (1 a 5 Estrellas) *
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setEditRating(star)}
                  style={{
                    backgroundColor: editRating >= star ? 'var(--accent-amber)' : 'var(--bg-canvas)',
                    border: '1.5px solid var(--border-strong)',
                    padding: '8px 14px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ★ {star}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Tu Comentario y Experiencia *
            </label>
            <textarea
              rows={4}
              required
              maxLength={500}
              value={editComentario}
              onChange={(e) => setEditComentario(e.target.value)}
              className="input-base"
              placeholder="Cuéntanos sobre el sonido, organización, puntualidad e instalaciones..."
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={() => setEditingResena(null)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn btn-primary" style={{ flex: 1 }}>
              {guardando ? 'Guardando...' : 'Reenviar a Moderación'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
