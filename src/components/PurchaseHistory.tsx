import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CompraResponse, EventoCatalogo } from '../types/api';

const pending = (estado: string) => ['PENDIENTE','PROCESANDO'].includes(estado);
export function PurchaseHistory({ eventos }: { eventos: EventoCatalogo[] }) {
  const { user } = useAuth();
  const current = useRef(user?.id); current.current = user?.id;
  const [data, setData] = useState<{ owner: number; rows: CompraResponse[] } | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows = data && data.owner === user?.id ? data.rows : [];
  const hasPending = rows.some(c => pending(c.estado));
  const refresh = async () => {
    if (!user || user.rol !== 'CLIENTE') return;
    const id = user.id; setBusy(true); setError('');
    try { const result = await api.getMisCompras(); if (current.current === id) setData({ owner: id, rows: result.items }); }
    catch (e: any) { if (current.current === id) setError(e.detail); }
    finally { if (current.current === id) setBusy(false); }
  };
  useEffect(() => { void refresh(); }, [user?.id]);
  useEffect(() => {
    if (!hasPending) return;
    let active = true; let timer: ReturnType<typeof setTimeout>; let attempts = 0;
    const id = user?.id;
    const poll = async () => {
      try { const result = await api.getMisCompras(); if (active && current.current === id && id) setData({ owner:id,rows:result.items }); }
      catch (e: any) { if (active) setError(e.detail); }
      if (active && ++attempts < 20) timer = setTimeout(poll,3000);
    };
    timer = setTimeout(poll,3000);
    return () => { active=false; clearTimeout(timer); };
  }, [hasPending,user?.id]);
  const detail = async (compra: CompraResponse) => {
    if (expanded === compra.publicId) { setExpanded(null); return; }
    const id = user?.id;
    try { const next = await api.getCompra(compra.publicId); if (current.current === id && id) { setData(d => d ? { ...d,rows:d.rows.map(c => c.publicId === next.publicId ? next : c) } : d); setExpanded(next.publicId); } }
    catch (e: any) { setError(e.detail); }
  };
  const cancel = async (compra: CompraResponse) => {
    if (busy || !confirm('¿Cancelar esta compra pendiente y liberar sus entradas reservadas?')) return;
    setBusy(true);
    try { await api.cancelarCompra(compra.publicId); await refresh(); }
    catch (e: any) { setError(e.detail); }
    finally { setBusy(false); }
  };
  return <div className="container wallet-page"><div className="page-heading"><div><span className="eyebrow">MI CUENTA · HISTORIAL</span><h1>Mis compras</h1><p>Consulta el estado de cada reserva, el desglose de tu compra y los boletos emitidos. Las reservas en procesamiento se actualizan durante un minuto; después puedes usar Actualizar.</p></div><button className="btn btn-outline" disabled={busy} onClick={refresh}>Actualizar compras</button></div>
    {error && <p className="notice" role="alert">{error}</p>}{!rows.length && !busy && !error && <div className="empty-state"><h2>Aún no tienes compras</h2><p>Encuentra tu próximo evento y tus reservas aparecerán aquí.</p><NavLink className="btn btn-primary" to="/catalogo">Explorar eventos</NavLink></div>}
    {rows.map(c => <article className="purchase-card" key={c.publicId}><div className="page-heading"><div><span className={'badge badge-' + c.estado.toLowerCase()}>{c.estado}</span><h2>{eventos.find(e => e.id === c.eventoId)?.titulo || c.eventoTitulo || 'Evento #' + c.eventoId}</h2><p>{new Date(c.creadoEn).toLocaleString('es-GT')} · {c.items.reduce((sum,i) => sum + i.cantidad,0)} entradas</p><small className="purchase-reference">Referencia: {c.publicId}</small></div><strong className="purchase-total">Q{c.total.toFixed(2)}</strong></div>
      {c.estado === 'PENDIENTE' && <p className="notice">
        {Date.parse(c.expiraEn) <= Date.now()
          ? 'El plazo de esta reserva ya venció. Sigue pendiente de liberación. Puedes cancelarla desde aquí y volver a comprar si el evento sigue en venta.'
          : 'Tu cupo está reservado mientras se procesa la compra. Puedes cancelarla mientras siga pendiente. Los boletos aparecerán al completarse.'}
      </p>}
      {c.estado === 'PROCESANDO' && <p className="notice">Estamos procesando tu compra. Los boletos aparecerán al completarse.</p>}
      <div className="actions"><button className="btn btn-outline" onClick={() => detail(c)}>{expanded === c.publicId ? 'Ocultar detalle' : 'Ver detalle de compra'}</button>{c.estado === 'COMPLETADA' && <NavLink className="btn btn-primary" to={'/boletos?compra=' + c.publicId}>Ver mis boletos y QR →</NavLink>}{c.estado === 'PENDIENTE' && <button className="btn btn-outline" disabled={busy} onClick={() => cancel(c)}>Cancelar reserva</button>}</div>
      {expanded === c.publicId && <div className="purchase-breakdown"><h3>Detalle confirmado</h3><div className="table-scroll"><table><thead><tr><th>Entrada</th><th>Cantidad</th><th>Precio por persona</th><th>Subtotal</th></tr></thead><tbody>{c.items.map(i => <tr key={i.tipoEntradaId}><td>{i.tipoEntradaNombre}</td><td>{i.cantidad}</td><td>Q{i.precioUnitario.toFixed(2)}</td><td>Q{i.subtotal.toFixed(2)}</td></tr>)}</tbody></table></div><dl className="review-summary"><dt>Subtotal</dt><dd>Q{c.subtotal.toFixed(2)}</dd><dt>Comisión</dt><dd>Q{c.comision.toFixed(2)}</dd><dt>IVA</dt><dd>Q{c.impuestos.toFixed(2)}</dd><dt>Total</dt><dd><strong>Q{c.total.toFixed(2)}</strong></dd></dl></div>}
    </article>)}
  </div>;
}
