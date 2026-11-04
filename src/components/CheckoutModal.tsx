import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { CompraResponse, DetalleEventoPublico, DistribucionDto } from '../types/api';
import { SeatSelector } from './SeatSelector';

export function CheckoutModal({ evento, localidadId, onClose, onSuccess }: { evento: DetalleEventoPublico; localidadId?: number; onClose: () => void; onSuccess: (compra: CompraResponse) => void }) {
  const tipos = evento.tiposEntrada.filter(t => localidadId === undefined || t.localidadId === localidadId);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [planos, setPlanos] = useState<Record<number, DistribucionDto>>({});
  const [elegidos, setElegidos] = useState<Record<number, number[]>>({});
  const [asistentes, setAsistentes] = useState<Record<string, { nombreAsistente: string; documentoIdentidad: string }>>({});
  const [compra, setCompra] = useState<CompraResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const intento = useRef({ payload: '', key: '' });
  const carrera = /carrera|marat[oó]n/i.test(evento.categoriaNombre);
  const cargar = async () => {
    setLoading(true);
    try {
      const ids = [...new Set(tipos.filter(t => t.numerada && t.localidadId).map(t => t.localidadId!))];
      const results = await Promise.all(ids.map(async id => [id, await api.getAsientos(evento.id, id)] as const));
      const next = Object.fromEntries(results);
      if (results.some(([, plano]) => plano.asientos.some(s => !Number.isSafeInteger(s.id)))) throw { detail: 'El identificador de una silla supera la precisión del navegador. Contacta al administrador.' };
      setPlanos(next);
      setElegidos(prev => Object.fromEntries(Object.entries(prev).map(([id, selected]) => {
        const plano = next[Number(id)];
        let libres = selected.filter(sid => plano?.asientos.some(s => s.id === sid && s.estado === 'DISPONIBLE'));
        for (const mesa of plano?.mesas || []) if (mesa.modalidad === 'COMPLETA') {
          const seats = plano.asientos.filter(s => s.mesaId === mesa.id);
          if (!seats.every(s => libres.includes(s.id))) libres = libres.filter(id => !seats.some(s => s.id === id));
        }
        return [id, libres];
      })));
    } catch (e: any) { setError(e.detail); } finally { setLoading(false); }
  };
  useEffect(() => { void cargar(); }, [evento.id, localidadId]);
  useEffect(() => {
    if (!compra || !['PENDIENTE', 'PROCESANDO'].includes(compra.estado)) return;
    let disposed = false; let timer: ReturnType<typeof setTimeout>; let attempts = 0;
    const poll = async () => {
      try { const next = await api.getCompra(compra.publicId); if (disposed) return; setCompra(next); }
      catch (e: any) { if (!disposed) setError(e.detail + ' Puedes consultar el estado desde Mis compras.'); }
      if (!disposed && ++attempts < 30) timer = setTimeout(poll, 2000);
    };
    timer = setTimeout(poll, 2000);
    return () => { disposed = true; clearTimeout(timer); };
  }, [compra?.publicId, compra?.estado]);
  const items = tipos.map(t => {
    const ids = (elegidos[t.localidadId || 0] || []).filter(id => planos[t.localidadId || 0]?.asientos.some(s => s.id === id && s.tipoEntradaId === t.id));
    return { tipoEntradaId: t.id, cantidad: t.numerada ? ids.length : cantidades[t.id] || 0, asientoIds: t.numerada ? ids : undefined };
  }).filter(i => i.cantidad > 0);
  const cantidad = items.reduce((sum, i) => sum + i.cantidad, 0);
  const subtotal = items.reduce((sum, i) => sum + i.cantidad * tipos.find(t => t.id === i.tipoEntradaId)!.precioUnitario, 0);
  const enviar = async () => {
    if (busy || compra) return;
    if (!cantidad || cantidad > evento.maxBoletosPorCompra) { setError('Selecciona entre 1 y ' + evento.maxBoletosPorCompra + ' entradas.'); return; }
    const payload = { eventoId: evento.id, items: items.map(i => ({ ...i, asistentes: carrera ? Array.from({ length: i.cantidad }, (_, index) => asistentes[i.tipoEntradaId + ':' + index]) : undefined })) };
    if (carrera && payload.items.some(i => i.asistentes?.some(a => !a?.nombreAsistente?.trim() || !a?.documentoIdentidad?.trim()))) { setError('Completa nombre y documento de cada participante.'); return; }
    const signature = JSON.stringify(payload);
    if (intento.current.payload !== signature) intento.current = { payload: signature, key: crypto.randomUUID() };
    setBusy(true); setError('');
    try { setCompra(await api.crearCompra(payload as any, intento.current.key)); }
    catch (e: any) { setError(e.detail); if (e.status === 409) { await cargar(); intento.current = { payload: '', key: '' }; } }
    finally { setBusy(false); }
  };
  return <div className="modal-overlay"><div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="checkout-title" style={{ maxWidth: 850 }}>
    <header className="panel-heading"><div><span className="badge badge-categoria">RESERVA DE ENTRADAS</span><h2 id="checkout-title">{evento.titulo}</h2></div><button className="btn btn-outline" onClick={onClose} aria-label="Cerrar">×</button></header>
    <div className="panel-body">
      {error && <p className="notice" role="alert">{error}</p>}
      {!compra ? <>
        <p>Máximo {evento.maxBoletosPorCompra} personas por compra. Pago de demostración: no se solicita tarjeta ni se realiza un cobro bancario.</p>
        {loading ? <p>Cargando disponibilidad…</p> : tipos.filter(t => !t.numerada).map(t => <div className="selection-row" key={t.id}><div><strong>{t.nombre}</strong><p>Q{t.precioUnitario.toFixed(2)} · {t.cupoDisponible} disponibles</p></div><label>Cantidad<input aria-label={'Cantidad ' + t.nombre} type="number" min="0" max={Math.min(t.cupoDisponible, evento.maxBoletosPorCompra)} value={cantidades[t.id] || 0} onChange={e => setCantidades(prev => ({ ...prev, [t.id]: Math.max(0, Math.min(Number(e.target.value), t.cupoDisponible, evento.maxBoletosPorCompra)) }))} /></label></div>)}
        {Object.entries(planos).map(([id, plano]) => <div key={id}><h3>Localidad #{id}</h3><p>{tipos.filter(t => t.localidadId === Number(id)).map(t => t.nombre + ": Q" + t.precioUnitario.toFixed(2) + " por silla").join(" · ")}</p><SeatSelector plano={plano} selected={elegidos[Number(id)] || []} max={Math.max(0, evento.maxBoletosPorCompra - cantidad + (elegidos[Number(id)] || []).length)} onChange={ids => setElegidos(prev => ({ ...prev, [Number(id)]: ids }))} /></div>)}
        {carrera && items.map(i => <section key={i.tipoEntradaId}><h3>{tipos.find(t => t.id === i.tipoEntradaId)?.nombre}: participantes</h3>{Array.from({ length: i.cantidad }, (_, index) => { const key = i.tipoEntradaId + ':' + index; return <div className="form-grid" key={key}>{['nombreAsistente', 'documentoIdentidad'].map(field => <label key={field}>{field === 'nombreAsistente' ? 'Nombre completo' : 'Documento'} #{index + 1}<input required value={(asistentes[key] as any)?.[field] || ''} onChange={e => setAsistentes(prev => ({ ...prev, [key]: { ...prev[key], [field]: e.target.value } }))} /></label>)}</div>; })}</section>)}
        <p className="notice">Subtotal seleccionado: Q{subtotal.toFixed(2)} ({cantidad} personas). Comisión e IVA se calculan en el servidor y se muestran en la reserva confirmada.</p>
        <div className="actions"><button className="btn btn-outline" disabled={busy} onClick={cargar}>Actualizar disponibilidad</button><button className="btn btn-primary" disabled={busy || loading || !cantidad || cantidad > evento.maxBoletosPorCompra || evento.estado !== 'EN_VENTA'} onClick={enviar}>{busy ? 'Reservando…' : 'Crear compra'}</button></div>
      </> : <>
        <h3>Compra {compra.publicId}</h3><p role="status">Estado: {compra.estado}</p>
        <dl><dt>Subtotal</dt><dd>Q{compra.subtotal.toFixed(2)}</dd><dt>Comisión</dt><dd>Q{compra.comision.toFixed(2)}</dd><dt>IVA</dt><dd>Q{compra.impuestos.toFixed(2)}</dd><dt>Total confirmado</dt><dd>Q{compra.total.toFixed(2)}</dd></dl>
        {['PENDIENTE', 'PROCESANDO'].includes(compra.estado) && <p>Tu reserva está en procesamiento. Puedes cerrar y seguir su estado en Mis compras; no repitas el pedido.</p>}
        {['FALLIDA', 'EXPIRADA', 'CANCELADA'].includes(compra.estado) && <p>Esta compra no se completó. Consulta el historial antes de iniciar otra.</p>}
        <div className="actions"><button className="btn btn-outline" onClick={async () => { try { setCompra(await api.getCompra(compra.publicId)); } catch (e: any) { setError(e.detail); } }}>Actualizar estado</button>{compra.estado === 'COMPLETADA' && <button className="btn btn-primary" onClick={() => { onSuccess(compra); onClose(); }}>Ver boletos reales</button>}</div>
      </>}
    </div>
  </div></div>;
}
