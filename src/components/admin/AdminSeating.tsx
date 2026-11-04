import { detailViewBox, markerRadius } from '../seatMapScale';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { DistribucionDto, EventoCatalogo, LocalidadMapa } from '../../types/api';
import { DraftLayout, generateLayout, inside, layoutProblems, normalizedPolygon, Point } from './seatingLayout';

const empty = (): DraftLayout => ({ imagenPlanoUrl: null, mesas: [], asientos: [] });
interface Props { fixedEventoId?: number; initialLocalidadId?: number; onPublished?: (localidadId: number) => void; }
export function AdminSeating({ fixedEventoId, initialLocalidadId, onPublished }: Props) {
  const { user } = useAuth(); const navigate = useNavigate(); const [params] = useSearchParams();
  const base = user?.rol === 'DUENO_RECINTO' ? '/dueno' : '/gestion';
  const [eventos, setEventos] = useState<EventoCatalogo[]>([]);
  const [eventoId, setEventoId] = useState(fixedEventoId || Number(params.get('evento')) || 0);
  const [localidadId, setLocalidadId] = useState(initialLocalidadId || Number(params.get('localidad')) || 0);
  const [context, setContext] = useState<{ event: number; localidades: LocalidadMapa[]; tipos: any[]; imagen: string | null }>({ event: 0, localidades: [], tipos: [], imagen: null });
  const [datos, setDatos] = useState<DraftLayout>(empty);
  const [persistido, setPersistido] = useState<DistribucionDto | null>(null);
  const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false); const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'MESAS' | 'FILAS'>('MESAS');
  const [groups, setGroups] = useState(6); const [perGroup, setPerGroup] = useState(4);
  const [modalidad, setModalidad] = useState<'COMPLETA' | 'POR_SILLA'>('POR_SILLA');
  const [tarifaId, setTarifaId] = useState(0);
  const [selection, setSelection] = useState<{ kind: 'mesa' | 'silla'; index: number } | null>(null);
  const [focus, setFocus] = useState<{ key: string; viewBox: string } | null>(null);
  const request = useRef(0); const skipClick = useRef(false); const [fullMap, setFullMap] = useState(false); const pointer = useRef<{ point: Point; original: DraftLayout; moved: boolean } | null>(null);
  const publicado = persistido?.estado === 'PUBLICADA';
  const localidad = context.localidades.find(l => l.id === localidadId);
  const tarifas = context.tipos.filter(t => t.localidadId === localidadId && t.activo !== false);
  let polygon: Point[] = []; let geometryError = '';
  try { if (localidad) polygon = normalizedPolygon(localidad.geometria?.points); } catch (e: any) { geometryError = e.message; }
  const load = async () => {
    if (!eventoId || !localidadId || context.event !== eventoId) return;
    const ticket = ++request.current; setBusy(true); setReady(false); setError(''); setSelection(null); setFocus(null);
    try {
      const dist = await api.getDistribucion(eventoId, localidadId);
      if (ticket !== request.current) return;
      if (dist.asientos.some(s => !Number.isSafeInteger(s.id)) || dist.mesas.some(m => !Number.isSafeInteger(m.id))) throw { detail: 'Los IDs de este plano requieren una representación que el navegador no puede manejar con precisión.' };
      setPersistido(dist);
      setDatos({ imagenPlanoUrl: dist.imagenPlanoUrl || context.imagen, mesas: dist.mesas.map(m => ({ ...m, clave: 'mesa-' + m.id })), asientos: dist.asientos.map(s => ({ ...s, fila: s.fila ?? null, mesaClave: s.mesaId ? 'mesa-' + s.mesaId : null, bloqueado: s.estado === 'BLOQUEADO' })) });
      setDirty(false); setReady(true);
    } catch (e: any) {
      if (ticket !== request.current) return;
      setPersistido(null); setDatos({ ...empty(), imagenPlanoUrl: context.imagen });
      if (e.status === 404) { setReady(true); setDirty(false); } else setError(e.detail || e.message);
    } finally { if (ticket === request.current) setBusy(false); }
  };
  useEffect(() => {
    let active = true;
    api.getEventosAdmin().then(rows => { if (active) setEventos(rows); }).catch(e => { if (active) setError(e.detail); });
    return () => { active = false; request.current++; };
  }, []);
  useEffect(() => {
    if (fixedEventoId) setEventoId(fixedEventoId);
  }, [fixedEventoId]);
  useEffect(() => {
    request.current++; setReady(false); setPersistido(null); setDatos(empty()); setContext({ event: 0, localidades: [], tipos: [], imagen: null });
    if (!eventoId) return;
    let active = true; setBusy(true);
    (async () => {
      try {
        const evento = await api.getEventoAdmin(eventoId);
        const [localidades, tipos, recinto] = await Promise.all([api.getLocalidades(evento.recintoId), api.getTiposEntrada(eventoId), api.getRecinto(evento.recintoId)]);
        if (!active) return;
        setContext({ event: eventoId, localidades: localidades.filter(l => l.activo !== false), tipos, imagen: recinto.imagenPlanoUrl || null });
        const preferred = initialLocalidadId || Number(params.get('localidad'));
        setLocalidadId(localidades.some(l => l.id === preferred) ? preferred : 0);
      } catch (e: any) { if (active) setError(e.detail); } finally { if (active) setBusy(false); }
    })();
    return () => { active = false; };
  }, [eventoId]);
  useEffect(() => { setTarifaId(tarifas[0]?.id || 0); if (context.event === eventoId && localidadId) void load(); }, [localidadId, context.event]);
  const discard = () => !dirty || confirm('Tienes cambios sin guardar en el plano. ¿Quieres descartarlos?');
  const generar = () => {
    setError(''); setMessage('');
    if (datos.asientos.some(s => s.id !== null)) { setError('Este plano ya tiene posiciones guardadas. Puedes moverlas o editar sus etiquetas antes de publicar, sin eliminar su historial.'); return; }
    if (datos.asientos.length && !confirm('¿Reemplazar la vista previa que todavía no has guardado?')) return;
    try {
      if (!tarifaId || !polygon.length) throw new Error(geometryError || 'Selecciona una tarifa para esta localidad.');
      if (groups * perGroup > (localidad?.capacidad || 0)) throw new Error('La cantidad de personas supera la capacidad de la localidad.');
      const next = generateLayout({ polygon, mode, groups, seatsPerGroup: perGroup, tipoEntradaId: tarifaId, modalidad });
      setDatos({ ...next, imagenPlanoUrl: context.imagen }); setDirty(true); setSelection(null); setFocus(null);
      setMessage('Vista previa creada dentro de la localidad. Puedes mover una mesa con todas sus sillas antes de guardar.');
    } catch (e: any) { setError(e.message); }
  };
  const save = async (publish: boolean) => {
    if (!ready || busy || publicado) return; setError(''); setMessage('');
    const problems = polygon.length ? layoutProblems(datos, polygon, localidad?.capacidad || 0) : [geometryError || 'Falta el polígono de la localidad.'];
    const max = eventos.find(e => e.id === eventoId)?.maxBoletosPorCompra;
    if (max && datos.mesas.some(m => m.modalidad === 'COMPLETA' && datos.asientos.filter(s => s.mesaClave === m.clave).length > max)) problems.push('Una mesa completa tiene más personas que el máximo de boletos del evento. Ajusta ese límite antes de publicar.');
    if (problems.length) { setError(problems.join(' ')); return; }
    if (publish && !confirm('¿Guardar y publicar esta distribución? Después podrás bloquear sillas, pero ya no cambiar mesas, etiquetas ni posiciones.')) return;
    setBusy(true);
    try {
      const payload = {
        imagenPlanoUrl: datos.imagenPlanoUrl,
        mesas: datos.mesas.map(({ id, clave, etiqueta, modalidad, tipoEntradaId, x, y }) => ({ id, clave, etiqueta, modalidad, tipoEntradaId, x, y })),
        asientos: datos.asientos.map(({ id, mesaClave, etiqueta, fila, tipoEntradaId, x, y, bloqueado }) => ({ id, mesaClave, etiqueta, fila, tipoEntradaId, x, y, bloqueado })),
      };
      await api.guardarDistribucion(eventoId, localidadId, payload);
      if (publish) await api.publicarDistribucion(eventoId, localidadId);
      await load(); setMessage(publish ? 'Distribución publicada. Ya puedes continuar con la revisión del evento.' : 'Borrador guardado. Puedes continuar editándolo.');
      if (publish) onPublished?.(localidadId);
    } catch (e: any) { setError(e.detail || e.message); } finally { setBusy(false); }
  };
  const coordinate = (e: React.PointerEvent<SVGSVGElement>): Point | null => {
    const p = e.currentTarget.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const matrix = e.currentTarget.getScreenCTM(); if (!matrix) return null;
    const local = p.matrixTransform(matrix.inverse()); return [local.x / 1000, local.y / 562];
  };
  const move = (x: number, y: number, original = datos) => {
    if (!selection || publicado || !polygon.length) return;
    const target = selection.kind === 'mesa' ? original.mesas[selection.index] : original.asientos[selection.index];
    if (!target) return;
    const dx = x - target.x, dy = y - target.y;
    const point = <T extends { x: number; y: number },>(p: T): T => ({ ...p, x: Number((p.x + dx).toFixed(6)), y: Number((p.y + dy).toFixed(6)) });
    const next: DraftLayout = { ...original, mesas: original.mesas.map((m,i) => selection.kind === 'mesa' && i === selection.index ? point(m) : m), asientos: original.asientos.map((s,i) => (selection.kind === 'silla' && i === selection.index) || (selection.kind === 'mesa' && s.mesaClave === original.mesas[selection.index].clave) ? point(s) : s) };
    if (next.asientos.every(s => inside([s.x,s.y], polygon)) && next.mesas.every(m => inside([m.x,m.y], polygon))) { setDatos(next); setDirty(true); setError(''); }
    else setError('La mesa y todas sus sillas deben permanecer dentro de la localidad.');
  };
  const editSelection = (field: string, value: string) => {
    if (!selection || publicado) return;
    setDatos(d => ({ ...d, [selection.kind === 'mesa' ? 'mesas' : 'asientos']: (selection.kind === 'mesa' ? d.mesas : d.asientos).map((row,i) => i === selection.index ? { ...row, [field]: value } : row) })); setDirty(true);
  };
  const bounds = polygon.length ? { minX: Math.max(0, Math.min(...polygon.map(p => p[0]))*1000-30), minY: Math.max(0,Math.min(...polygon.map(p => p[1]))*562-30), width: (Math.max(...polygon.map(p => p[0]))-Math.min(...polygon.map(p => p[0])))*1000+60, height: (Math.max(...polygon.map(p => p[1]))-Math.min(...polygon.map(p => p[1])))*562+60 } : null;
  const overview = !fullMap && bounds ? [bounds.minX,bounds.minY,bounds.width,bounds.height].join(' ') : '0 0 1000 562';
  const focusedMesa = datos.mesas.find(m => m.clave === focus?.key);
  const visibleSeats = useMemo(() => datos.asientos.filter(s => focusedMesa ? s.mesaClave === focusedMesa.clave : !s.mesaClave), [datos.asientos, focusedMesa]);
  const seatRadius = useMemo(() => markerRadius(focusedMesa ? [focusedMesa, ...visibleSeats] : visibleSeats, 8), [visibleSeats, focusedMesa]);
  const tableRadius = useMemo(() => markerRadius(datos.mesas, 16), [datos.mesas]);
  const viewBox = focusedMesa ? focus!.viewBox : overview;
  const inspectTable = (index: number) => {
    const mesa = datos.mesas[index];
    if (!mesa) { setFocus(null); setSelection(null); return; }
    const chairs = datos.asientos.filter(s => s.mesaClave === mesa.clave);
    const radius = markerRadius([mesa, ...chairs], 8);
    setFocus({ key: mesa.clave, viewBox: detailViewBox([mesa, ...chairs], radius * 4) });
    setSelection({ kind: 'mesa', index });
  };
  const selected: any = selection ? (selection.kind === 'mesa' ? datos.mesas[selection.index] : datos.asientos[selection.index]) : null;
  return <section className="seating-editor"><div className="section-intro"><span className="eyebrow">DISTRIBUCIÓN VISUAL</span><h2>Sillas y mesas en su lugar</h2><p>Elige la localidad del mapa, indica cuántas mesas o filas necesitas y genera el plano. Cada silla tendrá su número y su propio boleto.</p></div>
    <div className="form-grid">{!fixedEventoId && <label>1. Evento<select disabled={busy} value={eventoId} onChange={e => { if (discard()) { setEventoId(Number(e.target.value)); setLocalidadId(0); } }}><option value="0">Seleccionar evento</option>{eventos.map(e => <option key={e.id} value={e.id}>{e.titulo} · {e.estado}</option>)}</select></label>}<label>2. Localidad del recinto<select disabled={busy || !context.event} value={localidadId} onChange={e => { if (discard()) setLocalidadId(Number(e.target.value)); }}><option value="0">Seleccionar una zona del mapa</option>{context.localidades.map(l => <option key={l.id} value={l.id}>{l.nombre} · hasta {l.capacidad} personas</option>)}</select></label></div>
    {busy && <p role="status">Cargando o guardando el plano…</p>}{error && <p className="notice" role="alert">{error}</p>}{message && <p className="success-notice" role="status">{message}</p>}
    {!localidadId && <div className="empty-state"><h3>El plano comienza con una localidad</h3><p>Selecciona una zona que ya hayas dibujado en el recinto.</p><button className="btn btn-outline" onClick={() => { if (discard()) navigate(base + '/recintos'); }}>Ir a recintos y localidades</button></div>}
    {!!localidadId && <>
      {geometryError && <p className="notice">{geometryError} <button className="btn btn-sm btn-outline" onClick={() => navigate(base + '/recintos')}>Dibujar localidad</button></p>}
      {!publicado && ready && <div className="generator-panel"><h3>3. ¿Cómo se sentará el público?</h3><p className="helper-text">Aforo de la localidad: {localidad?.capacidad} personas. Cada distribución admite hasta {Math.min(localidad?.capacidad ?? 2000, 2000)} sillas y 500 mesas. El total de sillas se calcula multiplicando las dos cantidades.</p><div className="choice-grid"><button className={'choice-card ' + (mode === 'MESAS' ? 'chosen' : '')} onClick={() => setMode('MESAS')}><strong>Mesas con sillas</strong><span>Ejemplo: 6 mesas de 4 personas.</span></button><button className={'choice-card ' + (mode === 'FILAS' ? 'chosen' : '')} onClick={() => setMode('FILAS')}><strong>Sillas en filas</strong><span>Ejemplo: 5 filas de 10 sillas.</span></button></div>
        <div className="form-grid"><label>{mode === 'MESAS' ? 'Número de mesas' : 'Número de filas'}<input type="number" min="1" max={mode === 'MESAS' ? 500 : 2000} value={groups} onChange={e => setGroups(Number(e.target.value))} /></label><label>{mode === 'MESAS' ? 'Sillas por mesa' : 'Sillas por fila'}<input type="number" min="1" max="2000" value={perGroup} onChange={e => setPerGroup(Number(e.target.value))} /></label><label>Precio de cada silla<select value={tarifaId} onChange={e => setTarifaId(Number(e.target.value))}><option value="0">Selecciona una tarifa</option>{tarifas.map(t => <option key={t.id} value={t.id}>{t.nombre} · Q{t.precio.toFixed(2)}</option>)}</select></label>{mode === 'MESAS' && <label>Forma de vender la mesa<select value={modalidad} onChange={e => setModalidad(e.target.value as 'COMPLETA' | 'POR_SILLA')}><option value="COMPLETA">Mesa completa: todas sus sillas juntas</option><option value="POR_SILLA">Por silla: cada persona elige su lugar</option></select></label>}</div>
        <div className="selection-row"><p><strong>{groups * perGroup} personas</strong> en esta localidad{mode === 'MESAS' && modalidad === 'COMPLETA' && tarifas.find(t => t.id === tarifaId) ? ' · Subtotal por mesa: Q' + (perGroup * tarifas.find(t => t.id === tarifaId).precio).toFixed(2) : ''}</p><button className="btn btn-primary" disabled={busy || !polygon.length || !tarifaId || datos.asientos.some(s => s.id !== null)} onClick={generar}>Generar dentro de la localidad</button></div>
        {!tarifas.length && <p className="notice">Primero añade una entrada para esta localidad. <button className="btn btn-sm btn-outline" onClick={() => navigate(base + '/eventos')}>Configurar entradas</button></p>}
      </div>}
      <div className="plan-heading"><div><h3>{localidad?.nombre}</h3><p>{datos.mesas.length} mesas · {datos.asientos.length} sillas · {publicado ? 'Publicado' : dirty ? 'Cambios sin guardar' : 'Borrador'}</p></div><button className="btn btn-sm btn-outline" disabled={busy} onClick={() => { if (discard()) void load(); }}>Recargar guardado</button></div>
      <p className="helper-text">{publicado ? 'Selecciona una silla para consultar su estado y bloquearla o desbloquearla.' : 'Selecciona y arrastra una mesa para mover también sus sillas. Puedes mover una silla individual o seleccionar un lugar y tocar su nueva posición.'}</p>
      <button className="btn btn-sm btn-outline" onClick={() => { setFocus(null); setFullMap(v => !v); }}>{fullMap ? "Acercar a esta localidad" : "Ver el recinto completo"}</button>
      {datos.mesas.length > 0 && <div className="form-grid"><label>Ver sillas de una mesa
        <select value={focusedMesa?.clave ?? ''} onChange={e => inspectTable(datos.mesas.findIndex(m => m.clave === e.target.value))}>
          <option value="">Vista general de las mesas</option>
          {datos.mesas.map(m => <option key={m.clave} value={m.clave}>Mesa {m.etiqueta}</option>)}
        </select></label></div>}
      {focusedMesa && <button className="btn btn-sm btn-outline" onClick={() => inspectTable(-1)}>Volver a todas las mesas</button>}
      {datos.mesas.length > 0 && !focusedMesa && <p className="helper-text">Selecciona una mesa y pulsa Ver sus sillas para acercarte.</p>}
      <svg className="seat-plan editable-plan" viewBox={viewBox} aria-label={'Plano de ' + localidad?.nombre} onPointerDown={e => { const p = coordinate(e); if (p && selection && !publicado) pointer.current = { point: p, original: datos, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { const state = pointer.current, p = coordinate(e); if (!state || !selection || !p) return; if (Math.hypot(p[0] - state.point[0], p[1] - state.point[1]) < .004 && !state.moved) return; state.moved = true; const target = selection.kind === 'mesa' ? state.original.mesas[selection.index] : state.original.asientos[selection.index]; if (target) move(target.x + p[0] - state.point[0], target.y + p[1] - state.point[1], state.original); }} onPointerUp={e => { const state = pointer.current; pointer.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); if (state?.moved) { skipClick.current = true; return; } }} onPointerCancel={() => { pointer.current = null; }} onClick={e => { if (skipClick.current) { skipClick.current = false; return; } if (e.target !== e.currentTarget && (e.target as SVGElement).tagName !== 'polygon' && (e.target as SVGElement).tagName !== 'image') return; if (selection && !publicado) { const p = e.currentTarget.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const matrix = e.currentTarget.getScreenCTM(); if (matrix) { const local = p.matrixTransform(matrix.inverse()); move(local.x / 1000,local.y / 562); } } }}>
        {datos.imagenPlanoUrl && <image href={datos.imagenPlanoUrl} width="1000" height="562" opacity=".35" />}
        {polygon.length > 0 && <polygon points={polygon.map(([x,y]) => x * 1000 + ',' + y * 562).join(' ')} fill="#DBEAFE" fillOpacity=".7" stroke="#1E40AF" strokeWidth="3" />}
        {datos.mesas.map((m,index) => (!focusedMesa || m.clave === focusedMesa.clave) && <g key={m.clave} role="button" tabIndex={0} aria-label={'Mesa ' + m.etiqueta} onPointerDown={e => { e.stopPropagation(); setSelection({ kind: 'mesa', index }); const svg = e.currentTarget.ownerSVGElement; if (svg) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const matrix = svg.getScreenCTM(); if (matrix && !publicado) { const local = p.matrixTransform(matrix.inverse()); pointer.current = { point: [local.x/1000,local.y/562], original: datos, moved: false }; svg.setPointerCapture(e.pointerId); } } }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelection({ kind: 'mesa', index }); } }}><circle cx={m.x*1000} cy={m.y*562} r={focusedMesa ? seatRadius : tableRadius} strokeWidth={(focusedMesa ? seatRadius : tableRadius) / 6} fill={selection?.kind === 'mesa' && selection.index === index ? '#FF3B20' : '#FDE68A'} stroke="#121316" /><text x={m.x*1000} y={m.y*562} dominantBaseline="central" fontSize={(focusedMesa ? seatRadius : tableRadius) * 0.8} textAnchor="middle" pointerEvents="none">{m.etiqueta}</text></g>)}
        {datos.asientos.map((s,index) => (focusedMesa ? s.mesaClave === focusedMesa.clave : !s.mesaClave) && <g key={s.id || s.etiqueta} role="button" tabIndex={0} aria-label={'Silla ' + s.etiqueta} onPointerDown={e => { e.stopPropagation(); setSelection({ kind: 'silla', index }); const svg = e.currentTarget.ownerSVGElement; if (svg && !publicado) { const p = svg.createSVGPoint(); p.x=e.clientX; p.y=e.clientY; const matrix=svg.getScreenCTM(); if (matrix) { const local=p.matrixTransform(matrix.inverse()); pointer.current={point:[local.x/1000,local.y/562],original:datos,moved:false}; svg.setPointerCapture(e.pointerId); } } }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelection({ kind: 'silla', index }); } }}><circle cx={s.x*1000} cy={s.y*562} r={seatRadius} strokeWidth={seatRadius / 6} fill={selection?.kind === 'silla' && selection.index === index ? '#FF3B20' : s.bloqueado ? '#9CA3AF' : '#059669'} stroke="#121316" /><title>{s.etiqueta}</title><text x={s.x*1000} y={s.y*562} dominantBaseline="central" textAnchor="middle" fill="white" fontSize={seatRadius * 0.85} pointerEvents="none">{s.etiqueta.split("-").at(-1)}</text></g>)}
      </svg>
      {selection?.kind === 'mesa' && !focusedMesa && <button className="btn btn-primary" onClick={() => inspectTable(selection.index)}>Ver sus sillas</button>}
      {selected && <div className="selected-position"><h4>{selection?.kind === 'mesa' ? 'Mesa' : 'Silla'} {selected.etiqueta}</h4>{!publicado ? <><div className="form-grid"><label>Etiqueta visible<input value={selected.etiqueta} onChange={e => editSelection('etiqueta',e.target.value)} /></label>{selection?.kind === 'mesa' && <label>Venta<select value={selected.modalidad} onChange={e => editSelection('modalidad',e.target.value)}><option value="COMPLETA">Mesa completa</option><option value="POR_SILLA">Por silla</option></select></label>}</div><div className="actions">{[[0,-.01,'↑'],[-.01,0,'←'],[.01,0,'→'],[0,.01,'↓']].map(([dx,dy,label]) => <button key={label} className="btn btn-sm btn-outline" onClick={() => move(selected.x + Number(dx),selected.y + Number(dy))} aria-label={'Mover ' + label}>{label}</button>)}</div></> : selection?.kind === 'silla' && <><p>Estado: {persistido?.asientos.find(s => s.id === selected.id)?.estado}</p><button className="btn btn-outline" disabled={busy || !['DISPONIBLE','BLOQUEADO'].includes(persistido?.asientos.find(s => s.id === selected.id)?.estado || '')} onClick={async () => { setBusy(true); try { if (selected.bloqueado) await api.desbloquearAsiento(eventoId,localidadId,selected.id); else await api.bloquearAsiento(eventoId,localidadId,selected.id); await load(); } catch (e: any) { setError(e.detail); } finally { setBusy(false); } }}>{selected.bloqueado ? 'Volver a ofrecer esta silla' : 'Bloquear esta silla'}</button></>}</div>}
      {publicado && selection?.kind === 'mesa' && selected && <div className="selected-position"><p>Gestiona las sillas de {selected.etiqueta}. Las mesas completas se bloquean o desbloquean juntas.</p><div className="actions">{[true,false].map(block => {
        const seats = persistido?.asientos.filter(s => s.mesaId === selected.id && s.estado === (block ? 'DISPONIBLE' : 'BLOQUEADO')) || [];
        return <button className="btn btn-outline" key={String(block)} disabled={busy || !seats.length} onClick={async () => { setBusy(true); try { if (block) await api.bloquearAsiento(eventoId,localidadId,seats.map(s => s.id)); else await api.desbloquearAsiento(eventoId,localidadId,seats.map(s => s.id)); await load(); } catch (e: any) { setError(e.detail); } finally { setBusy(false); } }}>{block ? 'Bloquear sillas libres' : 'Desbloquear sillas'} ({seats.length})</button>;
      })}</div></div>}
      {!publicado && <div className="sticky-actions"><span>{dirty ? 'Tienes cambios por guardar' : 'Guarda y revisa antes de publicar'}</span><button className="btn btn-outline" disabled={busy || !ready || !datos.asientos.length} onClick={() => save(false)}>Guardar borrador</button><button className="btn btn-primary" disabled={busy || !ready || !datos.asientos.length} onClick={() => save(true)}>Guardar y publicar distribución</button></div>}
      {publicado && <p className="success-notice">Esta localidad está preparada para vender asientos numerados. Cada compra respetará la disponibilidad real.</p>}
    </>}
  </section>;
}
