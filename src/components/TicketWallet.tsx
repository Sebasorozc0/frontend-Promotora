import { useEffect, useRef, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { BoletoResponse } from '../types/api';
import { TicketCard } from './TicketCard';
import { Modal } from './common/Modal';
import { useAuth } from '../context/AuthContext';

export function TicketWallet({ onCalificar }: { onCalificar: (boleto: BoletoResponse) => void }) {
  const { user } = useAuth();
  const currentUser = useRef(user?.id); currentUser.current = user?.id;
  const [ownerId, setOwnerId] = useState(user?.id);
  const [params, setParams] = useSearchParams();
  const [boletos, setBoletos] = useState<BoletoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('TODOS');
  const [search, setSearch] = useState('');
  const load = async () => {
    if (user?.rol !== 'CLIENTE') return;
    setLoading(true); setError('');
    try { const id = user.id; const rows = await api.getMisBoletos(); if (currentUser.current === id) { setBoletos(rows); setOwnerId(id); } }
    catch (e: any) { setError(e.detail); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let active = true;
    setBoletos([]);
    if (user?.rol !== 'CLIENTE') { setLoading(false); return; }
    const refresh = async () => {
      setError('');
      try { const rows = await api.getMisBoletos(); if (active) { setBoletos(rows); setOwnerId(user.id); } }
      catch (e: any) { if (active) setError(e.detail); }
      finally { if (active) setLoading(false); }
    };
    void refresh();
    const focus = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    return () => { active = false; window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); };
  }, [user?.id]);
  const own = ownerId === user?.id ? boletos : [];
  const selected = own.find(b => String(b.id) === params.get('boleto'));
  const compraId = params.get('compra');
  const rows = own.filter(b => (!compraId || b.publicIdCompra === compraId) && (filter === 'TODOS' || b.estado === filter) && (b.eventoTitulo + ' ' + b.tipoEntradaNombre + ' ' + (b.localidadNombre || '')).toLowerCase().includes(search.toLowerCase()));
  if (user?.rol !== 'CLIENTE') return <div className="container empty-state"><h2>Tu espacio de entradas</h2><p>Inicia sesión con una cuenta de cliente para consultar tus boletos. Administradores y dueños tienen su propio panel de gestión.</p><NavLink className="btn btn-outline" to="/catalogo">Volver a eventos</NavLink></div>;
  return <div className="container wallet-page"><div className="page-heading"><div><span className="eyebrow">MI CUENTA · MIS EXPERIENCIAS</span><h1>Tus boletos, siempre aquí.</h1><p>Las entradas de tus compras completadas se guardan en tu cuenta. Abre un boleto para consultar sus detalles y presentar el QR al ingresar.</p></div><button className="btn btn-outline" disabled={loading} onClick={load}>Actualizar entradas</button></div>
    {compraId && <p className="notice">Mostrando los boletos de la compra seleccionada. <button className="btn btn-sm btn-outline" onClick={() => setParams({})}>Ver todos mis boletos</button></p>}
    <div className="wallet-toolbar"><label>Buscar una entrada<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Evento, localidad o tipo de entrada" /></label><label>Estado<select value={filter} onChange={e => setFilter(e.target.value)}><option value="TODOS">Todos mis boletos</option><option value="VALIDO">Listos para ingresar</option><option value="USADO">Ya utilizados</option><option value="ANULADO">Anulados</option></select></label></div>
    {error && <p className="notice" role="alert">{error}</p>}{loading && <p role="status">Buscando tus entradas guardadas…</p>}
    {!loading && !own.length && !error && <div className="empty-state"><h2>Tu próxima experiencia te espera</h2><p>Cuando una compra termine de procesarse, sus boletos y códigos QR aparecerán aquí. Si acabas de reservar, revisa el estado en Mis compras.</p><div className="actions"><NavLink className="btn btn-primary" to="/catalogo">Explorar eventos</NavLink><NavLink className="btn btn-outline" to="/compras">Ver mis compras</NavLink></div></div>}
    <div className="wallet-grid">{rows.map(b => <article className="wallet-ticket" key={String(b.id)}><div className="wallet-ticket-top"><span className={'badge badge-' + (b.estado === 'VALIDO' ? 'valido' : b.estado === 'USADO' ? 'usado' : 'anulado')}>{b.estado === 'VALIDO' ? 'LISTO PARA INGRESAR' : b.estado === 'USADO' ? 'ENTRADA UTILIZADA' : 'BOLETO ANULADO'}</span><small>Entrada individual</small></div><h2>{b.eventoTitulo}</h2><p>{new Date(b.fechaInicio).toLocaleString('es-GT', { dateStyle: 'long', timeStyle: 'short' })}</p><p>{b.recintoNombre}</p><div className="wallet-seat"><strong>{b.tipoEntradaNombre}</strong><span>{b.localidadNombre || 'Entrada general · sin silla asignada'}</span></div><p className="helper-text">{b.asistenteNombre ? 'Asistente: ' + b.asistenteNombre : 'A nombre del titular de la compra'}</p><button className="btn btn-primary" onClick={() => setParams({ ...(compraId ? { compra: compraId } : {}), boleto: String(b.id) })}>Ver detalles y QR de entrada →</button>{b.estado === 'USADO' && <button className="btn btn-sm btn-outline" onClick={() => onCalificar(b)}>Calificar mi experiencia</button>}</article>)}</div>
    {!loading && own.length > 0 && rows.length === 0 && <p className="notice">No hay entradas que coincidan con estos filtros.</p>}
    <Modal isOpen={!!selected} onClose={() => setParams(compraId ? { compra: compraId } : {})} title="Tu boleto de entrada" subtitle="Datos de la entrada y código QR personal" maxWidth="580px">{selected && <><p className="helper-text">Compra: {selected.publicIdCompra}</p><TicketCard boleto={selected} /></>}</Modal>
  </div>;
}
