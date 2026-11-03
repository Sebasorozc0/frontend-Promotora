import React, { useState, useEffect } from 'react';
import { api, MOCK_EVENTOS } from '../../api/client';
import { EventoCatalogo, LocalidadMapa, DistribucionDto, MesaDto, SillaDto } from '../../types/api';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { 
  Grid, 
  Plus, 
  Lock, 
  Unlock, 
  CheckCircle, 
  XCircle, 
  Sparkles, 
  AlertTriangle, 
  Layers, 
  Save, 
  Send,
  Eye
} from 'lucide-react';

export const AdminSeating: React.FC = () => {
  const { user } = useAuth();
  const isDueno = user?.rol === 'DUENO_RECINTO';
  const [eventos, setEventos] = useState<EventoCatalogo[]>([]);
  const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);
  const [localidades, setLocalidades] = useState<LocalidadMapa[]>([]);
  const [selectedLocalidadId, setSelectedLocalidadId] = useState<number | null>(null);

  // Estado de Distribución
  const [distribucion, setDistribucion] = useState<DistribucionDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSilla, setSelectedSilla] = useState<SillaDto | null>(null);

  // Modal Generador Rápido
  const [generadorModalOpen, setGeneradorModalOpen] = useState(false);
  const [tipoLayout, setTipoLayout] = useState<'MESAS' | 'FILAS'>('MESAS');
  const [cantidadMesas, setCantidadMesas] = useState(10);
  const [sillasPorMesa, setSillasPorMesa] = useState(4);
  const [cantidadFilas, setCantidadFilas] = useState(5);
  const [sillasPorFila, setSillasPorFila] = useState(10);

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Carga inicial
  useEffect(() => {
    const init = async () => {
      try {
        let recintosIds: number[] = [];
        if (isDueno) {
          try {
            const recs = await api.getRecintos();
            recintosIds = (recs || []).map((r: any) => r.id);
          } catch {
            recintosIds = [];
          }
        }

        const res = await api.getEventos({ pageSize: 50 });
        let items = res?.items && res.items.length > 0 ? res.items : MOCK_EVENTOS;
        if (isDueno && recintosIds.length > 0) {
          const propios = items.filter((e) => recintosIds.includes(e.recintoId));
          if (propios.length > 0) items = propios;
        }

        setEventos(items);
        if (items.length > 0) {
          setSelectedEventoId(items[0].id);
        }
      } catch {
        setEventos(MOCK_EVENTOS);
        setSelectedEventoId(MOCK_EVENTOS[0].id);
      }
    };
    init();
  }, [isDueno]);

  // Cargar localidades cuando cambia el evento
  useEffect(() => {
    if (!selectedEventoId) return;
    const ev = eventos.find((e) => e.id === selectedEventoId);
    if (!ev) return;

    api.getLocalidades(ev.recintoId).then((locs) => {
      setLocalidades(locs || []);
      if (locs && locs.length > 0) {
        setSelectedLocalidadId(locs[0].id);
      } else {
        setSelectedLocalidadId(null);
        setDistribucion(null);
      }
    }).catch(() => {
      setLocalidades([]);
      setSelectedLocalidadId(null);
    });
  }, [selectedEventoId, eventos]);

  // Cargar distribución cuando cambia evento o localidad
  const fetchDistribucion = async () => {
    if (!selectedEventoId || !selectedLocalidadId) return;
    setLoading(true);
    try {
      const dist = await api.getDistribucion(selectedEventoId, selectedLocalidadId);
      setDistribucion(dist);
    } catch {
      // Distribución mock de demostración si aún no se ha persistido en backend
      const mockMesas: MesaDto[] = [
        { id: 1, numero: 1, capacidad: 4, x: 120, y: 100, radio: 35 },
        { id: 2, numero: 2, capacidad: 4, x: 280, y: 100, radio: 35 },
        { id: 3, numero: 3, capacidad: 4, x: 440, y: 100, radio: 35 },
        { id: 4, numero: 4, capacidad: 4, x: 120, y: 240, radio: 35 },
        { id: 5, numero: 5, capacidad: 4, x: 280, y: 240, radio: 35 },
        { id: 6, numero: 6, capacidad: 4, x: 440, y: 240, radio: 35 },
      ];

      const mockSillas: SillaDto[] = [];
      let sId = 1;
      mockMesas.forEach((m) => {
        for (let i = 1; i <= m.capacidad; i++) {
          const angle = ((i - 1) * (360 / m.capacidad) * Math.PI) / 180;
          mockSillas.push({
            id: sId++,
            mesaId: m.id,
            numero: i,
            x: m.x + Math.cos(angle) * (m.radio + 16),
            y: m.y + Math.sin(angle) * (m.radio + 16),
            estado: sId === 3 || sId === 8 ? 'BLOQUEADO' : 'DISPONIBLE'
          });
        }
      });

      setDistribucion({
        eventoId: selectedEventoId,
        localidadId: selectedLocalidadId,
        publicado: false,
        mesas: mockMesas,
        sillas: mockSillas
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventoId && selectedLocalidadId) {
      fetchDistribucion();
    }
  }, [selectedEventoId, selectedLocalidadId]);

  // --- ACCIONES ---
  const handleToggleBloqueo = async (silla: SillaDto) => {
    if (!selectedEventoId || !selectedLocalidadId) return;
    try {
      if (silla.estado === 'BLOQUEADO') {
        await api.desbloquearAsiento(selectedEventoId, selectedLocalidadId, [silla.id]);
        showFeedback(`Silla #${silla.numero} desbloqueada.`);
      } else {
        await api.bloquearAsiento(selectedEventoId, selectedLocalidadId, [silla.id]);
        showFeedback(`Silla #${silla.numero} bloqueada para reserva.`);
      }
      setDistribucion((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sillas: prev.sillas.map((s) =>
            s.id === silla.id
              ? { ...s, estado: s.estado === 'BLOQUEADO' ? 'DISPONIBLE' : 'BLOQUEADO' }
              : s
          )
        };
      });
      setSelectedSilla(null);
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al alternar bloqueo de asiento.', 'error');
    }
  };

  const handlePublicarDistribucion = async () => {
    if (!selectedEventoId || !selectedLocalidadId) return;
    if (!confirm('¿Deseas publicar y congelar esta distribución? Esta acción concilia cupos atómicamente y no admite reversión si hay compras activas.')) return;

    try {
      await api.publicarDistribucion(selectedEventoId, selectedLocalidadId);
      showFeedback('¡Distribución publicada exitosamente! Silletería disponible para venta.');
      setDistribucion((prev) => prev ? { ...prev, publicado: true } : prev);
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al publicar distribución.', 'error');
    }
  };

  const handleGenerarLayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventoId || !selectedLocalidadId) return;

    const nuevasMesas: MesaDto[] = [];
    const nuevasSillas: SillaDto[] = [];

    if (tipoLayout === 'MESAS') {
      const columnas = 4;
      for (let m = 0; m < cantidadMesas; m++) {
        const col = m % columnas;
        const row = Math.floor(m / columnas);
        const mesaId = m + 1;
        const cx = 100 + col * 140;
        const cy = 90 + row * 140;
        const radio = 32;

        nuevasMesas.push({
          id: mesaId,
          numero: mesaId,
          capacidad: sillasPorMesa,
          x: cx,
          y: cy,
          radio
        });

        for (let s = 1; s <= sillasPorMesa; s++) {
          const angle = ((s - 1) * (360 / sillasPorMesa) * Math.PI) / 180;
          nuevasSillas.push({
            id: m * 100 + s,
            mesaId,
            numero: s,
            x: cx + Math.cos(angle) * (radio + 16),
            y: cy + Math.sin(angle) * (radio + 16),
            estado: 'DISPONIBLE'
          });
        }
      }
    } else {
      // Filas de platea
      for (let f = 0; f < cantidadFilas; f++) {
        const filaNombre = String.fromCharCode(65 + f);
        for (let s = 1; s <= sillasPorFila; s++) {
          nuevasSillas.push({
            id: f * 100 + s,
            mesaId: null,
            numero: s,
            fila: filaNombre,
            x: 70 + (s - 1) * 45,
            y: 80 + f * 50,
            estado: 'DISPONIBLE'
          });
        }
      }
    }

    const payload: DistribucionDto = {
      eventoId: selectedEventoId,
      localidadId: selectedLocalidadId,
      publicado: false,
      mesas: nuevasMesas,
      sillas: nuevasSillas
    };

    try {
      await api.guardarDistribucion(selectedEventoId, selectedLocalidadId, payload);
      showFeedback('Nuevo layout generado y guardado en borrador.');
    } catch {
      showFeedback('Layout generado (modo local ilustrativo).');
    }

    setDistribucion(payload);
    setGeneradorModalOpen(false);
  };

  const totalSillas = distribucion?.sillas.length || 0;
  const disponibles = distribucion?.sillas.filter((s) => s.estado === 'DISPONIBLE').length || 0;
  const bloqueadas = distribucion?.sillas.filter((s) => s.estado === 'BLOQUEADO').length || 0;
  const vendidas = distribucion?.sillas.filter((s) => s.estado === 'VENDIDO' || s.estado === 'RESERVADO').length || 0;

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

      {/* Regla F11: Silletería Numerada */}
      <div style={{
        backgroundColor: '#FFF',
        border: '2px solid var(--border-strong)',
        boxShadow: 'var(--shadow-crisp-sm)',
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <Grid size={28} color="var(--accent-cobalt)" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>
            Regla de Negocio F11: Distribución Atómica de Asientos y Mesas Numeradas
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
            Configuración geométrica por localidad: mesas y sillas con coordenadas precisas. Los administradores pueden bloquear/desbloquear posiciones antes o durante la venta. La publicación congela la plantilla y concilia el cupo general.
          </p>
        </div>
      </div>

      {/* Selector de Evento y Localidad */}
      <div style={{
        backgroundColor: '#FFF',
        border: '2px solid var(--border-strong)',
        padding: '18px',
        boxShadow: 'var(--shadow-crisp-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
              Evento:
            </label>
            <select
              value={selectedEventoId || ''}
              onChange={(e) => setSelectedEventoId(Number(e.target.value))}
              className="input-base"
              style={{ minWidth: '240px', fontWeight: 600 }}
            >
              {eventos.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.titulo}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
              Localidad del Recinto:
            </label>
            <select
              value={selectedLocalidadId || ''}
              onChange={(e) => setSelectedLocalidadId(Number(e.target.value))}
              className="input-base"
              style={{ minWidth: '220px', fontWeight: 600 }}
            >
              {localidades.length === 0 && <option value="">Sin localidades registradas</option>}
              {localidades.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.nombre} (Cap: {loc.capacidad})</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setGeneradorModalOpen(true)}
            className="btn btn-sm btn-outline"
          >
            <Sparkles size={14} /> Generador de Layout
          </button>
          <button
            onClick={handlePublicarDistribucion}
            disabled={distribucion?.publicado}
            className="btn btn-sm btn-primary"
            style={{ backgroundColor: distribucion?.publicado ? 'var(--text-muted)' : 'var(--accent-emerald)' }}
          >
            <Send size={14} /> {distribucion?.publicado ? 'Distribución Publicada' : 'Publicar y Congelar'}
          </button>
        </div>
      </div>

      {/* Métricas del Plano */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ backgroundColor: '#FFF', border: '1.5px solid var(--border-strong)', padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
          Total Sillas: <strong>{totalSillas}</strong>
        </div>
        <div style={{ backgroundColor: '#FFF', border: '1.5px solid var(--border-strong)', padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent-emerald)' }}>
          Disponibles: <strong>{disponibles}</strong>
        </div>
        <div style={{ backgroundColor: '#FFF', border: '1.5px solid var(--border-strong)', padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent-vermilion)' }}>
          Bloqueadas: <strong>{bloqueadas}</strong>
        </div>
        <div style={{ backgroundColor: '#FFF', border: '1.5px solid var(--border-strong)', padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent-cobalt)' }}>
          Vendidas / Reservadas: <strong>{vendidas}</strong>
        </div>
      </div>

      {/* Lienzo Visual Interactivo SVG */}
      <div style={{
        backgroundColor: '#FFF',
        border: '2.5px solid var(--border-strong)',
        boxShadow: 'var(--shadow-crisp-sm)',
        padding: '24px',
        overflowX: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Haz clic sobre cualquier silla para bloquearla o liberarla.
          </span>
          <div style={{ display: 'flex', gap: '14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#10B981', display: 'inline-block', border: '1px solid #000' }} /> Disponible
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#EF4444', display: 'inline-block', border: '1px solid #000' }} /> Bloqueado
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#3B82F6', display: 'inline-block', border: '1px solid #000' }} /> Vendido
            </span>
          </div>
        </div>

        {/* SVG Matrix */}
        <div style={{
          width: '640px',
          height: '420px',
          backgroundColor: 'var(--bg-canvas)',
          border: '2px solid var(--border-strong)',
          position: 'relative'
        }}>
          {/* Escenario Superior */}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '120px',
            right: '120px',
            height: '28px',
            backgroundColor: 'var(--bg-inverse)',
            color: 'var(--text-inverse)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.1em'
          }}>
            ESCENARIO PRINCIPAL / TARIMA
          </div>

          <svg width="640" height="420" style={{ width: '100%', height: '100%' }}>
            {/* Renderizar Mesas */}
            {distribucion?.mesas.map((m) => (
              <g key={`mesa-${m.id}`}>
                <circle
                  cx={m.x}
                  cy={m.y}
                  r={m.radio}
                  fill="#E5E7EB"
                  stroke="var(--border-strong)"
                  strokeWidth="2"
                />
                <text
                  x={m.x}
                  y={m.y + 4}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize="12"
                  fontWeight="bold"
                  fill="var(--text-primary)"
                >
                  M#{m.numero}
                </text>
              </g>
            ))}

            {/* Renderizar Sillas */}
            {distribucion?.sillas.map((s) => {
              const fillColor =
                s.estado === 'DISPONIBLE' ? '#10B981' :
                s.estado === 'BLOQUEADO' ? '#EF4444' : '#3B82F6';

              return (
                <g
                  key={`silla-${s.id}`}
                  onClick={() => setSelectedSilla(s)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={9}
                    fill={fillColor}
                    stroke="var(--border-strong)"
                    strokeWidth="1.5"
                  />
                  <text
                    x={s.x}
                    y={s.y + 3}
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                    fontSize="7"
                    fontWeight="bold"
                    fill="#FFF"
                    pointerEvents="none"
                  >
                    {s.fila ? `${s.fila}${s.numero}` : s.numero}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* --- MODAL ACCIÓN SILLA INDIVIDUAL --- */}
      <Modal
        isOpen={!!selectedSilla}
        onClose={() => setSelectedSilla(null)}
        title={`Detalle de Silla #${selectedSilla?.numero}`}
        maxWidth="420px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            Mesa: <strong>{selectedSilla?.mesaId ? `Mesa #${selectedSilla.mesaId}` : selectedSilla?.fila ? `Fila ${selectedSilla.fila}` : 'Platea'}</strong><br />
            Estado Actual: <span className="badge badge-categoria">{selectedSilla?.estado}</span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {selectedSilla?.estado === 'BLOQUEADO'
              ? 'Esta posición se encuentra bloqueada. Al desbloquearla volverá a estar disponible para el público.'
              : selectedSilla?.estado === 'DISPONIBLE'
              ? 'Puedes bloquear esta silla para cortesías, producción o control técnico.'
              : 'Esta posición ya ha sido vendida o reservada por un comprador.'}
          </p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button onClick={() => setSelectedSilla(null)} className="btn btn-outline" style={{ flex: 1 }}>
              Cerrar
            </button>
            {selectedSilla && selectedSilla.estado !== 'VENDIDO' && selectedSilla.estado !== 'RESERVADO' && (
              <button
                onClick={() => handleToggleBloqueo(selectedSilla)}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  backgroundColor: selectedSilla.estado === 'BLOQUEADO' ? 'var(--accent-emerald)' : 'var(--accent-vermilion)'
                }}
              >
                {selectedSilla.estado === 'BLOQUEADO' ? 'Desbloquear Silla' : 'Bloquear Silla'}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* --- MODAL GENERADOR DE LAYOUT --- */}
      <Modal
        isOpen={generadorModalOpen}
        onClose={() => setGeneradorModalOpen(false)}
        title="Generador Rápido de Silletería"
        maxWidth="500px"
      >
        <form onSubmit={handleGenerarLayout} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Tipo de Distribución *
            </label>
            <select
              value={tipoLayout}
              onChange={(e) => setTipoLayout(e.target.value as any)}
              className="input-base"
            >
              <option value="MESAS">Mesas Redondas con Sillas (VIP / Lounge)</option>
              <option value="FILAS">Filas de Platea Numeradas (Teatro / Gradería)</option>
            </select>
          </div>

          {tipoLayout === 'MESAS' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Cantidad de Mesas
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={cantidadMesas}
                  onChange={(e) => setCantidadMesas(Number(e.target.value))}
                  className="input-base"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Sillas por Mesa
                </label>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={sillasPorMesa}
                  onChange={(e) => setSillasPorMesa(Number(e.target.value))}
                  className="input-base"
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Cantidad de Filas
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={cantidadFilas}
                  onChange={(e) => setCantidadFilas(Number(e.target.value))}
                  className="input-base"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Sillas por Fila
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={sillasPorFila}
                  onChange={(e) => setSillasPorFila(Number(e.target.value))}
                  className="input-base"
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={() => setGeneradorModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Generar y Guardar Borrador
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
