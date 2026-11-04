import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ResenaPublica } from '../types/api';
import { useAuth } from '../context/AuthContext';

export function MyReviews() {
  const { user } = useAuth();
  const [items, setItems] = useState<ResenaPublica[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<ResenaPublica | null>(null);
  const load = async () => { try { setItems(await api.all('/resenas/mis')); } catch (e: any) { setError(e.detail); } };
  useEffect(() => { if (user?.rol === 'CLIENTE') void load(); else setItems([]); }, [user?.id]);
  const save = async () => {
    if (!edit) return; setBusy(true); setError('');
    try { await api.editarResena(edit.id, { calificacion: edit.calificacion, comentario: edit.comentario || '', estadoEsperado: edit.estado }); setEdit(null); await load(); }
    catch (e: any) { setError(e.detail); } finally { setBusy(false); }
  };
  if (user?.rol !== 'CLIENTE') return <div className="container notice">Inicia sesión como cliente para ver tus reseñas.</div>;
  return <div className="container panel-body"><h2>Mis reseñas</h2><p>Para crear una reseña, ve a Mis boletos y califica un evento al que hayas ingresado con un boleto USADO. Las ediciones vuelven a revisión.</p>{error && <p className="notice" role="alert">{error}</p>}<button className="btn btn-outline" onClick={load}>Actualizar</button>{!items.length && <p>Aún no has enviado reseñas.</p>}{items.map(r => <article className="card-brutal panel-body" key={r.id}><h3>Evento #{r.eventoId} · {r.calificacion}/5</h3><p>{r.estado} · {new Date(r.creadoEn).toLocaleDateString('es-GT')}</p><p>{r.comentario || 'Sin comentario'}</p><div className="actions"><button className="btn btn-outline" onClick={() => setEdit({ ...r })}>Editar</button><button className="btn btn-outline" disabled={busy || r.estado === 'RECHAZADA'} onClick={async () => { if (!confirm('¿Retirar esta reseña?')) return; setBusy(true); try { await api.retirarResena(r.id, r.estado); await load(); } catch (e: any) { setError(e.detail); } finally { setBusy(false); } }}>Retirar</button></div></article>)}{edit && <form className="card-brutal panel-body" onSubmit={e => { e.preventDefault(); void save(); }}><h3>Editar reseña #{edit.id}</h3><label>Calificación<select value={edit.calificacion} onChange={e => setEdit({ ...edit, calificacion: Number(e.target.value) })}>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label><label>Comentario, máximo 510 caracteres<textarea className="input-brutal" maxLength={510} value={edit.comentario || ''} onChange={e => setEdit({ ...edit, comentario: e.target.value })} /></label><div className="actions"><button className="btn btn-primary" disabled={busy}>Enviar a revisión</button><button className="btn btn-outline" type="button" onClick={() => setEdit(null)}>Cancelar</button></div></form>}</div>;
}

export function PublicFeedback({ eventoId, presentadores }: { eventoId: number; presentadores: { id: number; nombreArtistico: string }[] }) {
  const [resenas, setResenas] = useState<ResenaPublica[]>([]);
  const [ratings, setRatings] = useState<Record<number, { promedio: number | null; totalResenas: number }>>({});
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.getResenasEvento(eventoId).then(rows => { if (active) setResenas(rows); }).catch(e => { if (active) setError(e.detail); });
    Promise.all(presentadores.filter(p => Number.isInteger(p.id)).map(async p => [p.id, await api.getCalificacionPresentador(p.id)] as const)).then(rows => { if (active) setRatings(Object.fromEntries(rows)); }).catch(e => { if (active) setError(e.detail); });
    return () => { active = false; };
  }, [eventoId]);
  return <section className="panel-body"><h3>Opiniones verificadas</h3>{error && <p role="alert">{error}</p>}{presentadores.map(p => <p key={p.id || p.nombreArtistico}>{p.nombreArtistico}: {ratings[p.id]?.totalResenas ? `${ratings[p.id].promedio?.toFixed(1)}/5 (${ratings[p.id].totalResenas} reseñas)` : 'Sin calificaciones publicadas'}</p>)}{!resenas.length && <p>Este evento todavía no tiene reseñas aprobadas.</p>}{resenas.map(r => <blockquote className="notice" key={r.id}><strong>{r.calificacion}/5</strong><p>{r.comentario || 'Sin comentario'}</p></blockquote>)}</section>;
}
