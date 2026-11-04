import { useEffect, useState } from 'react';
import { Check, X, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import { ResenaPublica } from '../../types/api';
import { LoadState } from '../common/LoadState';

export function AdminReviews() {
  const [resenas, setResenas] = useState<ResenaPublica[]>([]);
  const [estado, setEstado] = useState('PENDIENTE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState<number | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setResenas([]);
    api.getTodasResenas(estado === 'TODOS' ? undefined : estado).then(items => {
      if (active) setResenas(items);
    }).catch(err => {
      if (active) setError(err?.detail || 'No se pudieron cargar las reseñas.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [estado, reload]);

  async function moderar(id: number, decision: 'APROBADA' | 'RECHAZADA') {
    if (processing !== null) return;
    setProcessing(id); setFeedback('');
    try {
      await api.moderarResena(id, decision);
      setResenas(prev => prev.map(r => r.id === id ? { ...r, estado: decision } : r));
      setFeedback(`Reseña #${id} marcada como ${decision}.`);
    } catch (err: any) {
      setError(err?.detail || 'No se pudo moderar la reseña.');
    } finally { setProcessing(null); }
  }

  const visibles = resenas.filter(r => estado === 'TODOS' || r.estado === estado);
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <h3><ShieldCheck size={22} /> Moderación de reseñas</h3>
    <p>Solo las reseñas pendientes pueden aprobarse o rechazarse.</p>
    <label>Estado de las reseñas{' '}
      <select className="input-base" value={estado} onChange={e => { setEstado(e.target.value); setFeedback(''); }}>
        <option value="TODOS">Todos los estados</option>
        <option value="PENDIENTE">PENDIENTE</option>
        <option value="APROBADA">APROBADA</option>
        <option value="RECHAZADA">RECHAZADA</option>
      </select>
    </label>
    <LoadState loading={loading} error={error} empty={!visibles.length} emptyMessage="No hay reseñas bajo el filtro seleccionado." onRetry={() => setReload(n => n + 1)} />
    {feedback && <p role="status" style={{ background: '#D1FAE5', padding: 12 }}>{feedback}</p>}
    {visibles.map(r => <article key={r.id} style={{ background: '#FFF', border: '2px solid var(--border-strong)', padding: 20 }}>
      <span className="badge badge-categoria">{r.eventoTitulo || `Evento #${r.eventoId}`}</span>{' '}
      <span className="badge">{r.estado}</span>
      <p>★ {r.calificacion} / 5 · {new Date(r.creadoEn).toLocaleDateString('es-GT')} · {r.clienteNombre}</p>
      <p>{r.comentario}</p>
      {r.estado === 'PENDIENTE' && <div style={{ display: 'flex', gap: 10 }}>
        <button disabled={processing !== null} className="btn btn-sm btn-primary" onClick={() => moderar(r.id, 'APROBADA')}><Check size={16} /> Aprobar</button>
        <button disabled={processing !== null} className="btn btn-sm btn-outline" onClick={() => moderar(r.id, 'RECHAZADA')}><X size={16} /> Rechazar</button>
      </div>}
    </article>)}
  </div>;
}
