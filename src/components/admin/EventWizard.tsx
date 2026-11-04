import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AdminSeating } from './AdminSeating';

const dateInput = (s?: string) => { if (!s) return ''; const d = new Date(s); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); };
export function EventWizard() {
  const { user } = useAuth(); const navigate = useNavigate(); const [params, setParams] = useSearchParams();
  const base = user?.rol === 'DUENO_RECINTO' ? '/dueno' : '/gestion';
  const [step, setStep] = useState(0); const [eventId, setEventId] = useState(Number(params.get('evento')) || 0);
  const [estado, setEstado] = useState('BORRADOR'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [recintos, setRecintos] = useState<any[]>([]); const [categorias, setCategorias] = useState<any[]>([]); const [localidades, setLocalidades] = useState<any[]>([]);
  const [form, setForm] = useState({ nombre: '', recintoId: 0, categoriaId: 0, descripcion: '', fechaInicio: '', fechaFin: '', fechaInicioVenta: '', fechaFinVenta: '', maxBoletosPorCompra: 10, imagenUrl: '' });
  const [flyer, setFlyer] = useState<File | null>(null); const [tipos, setTipos] = useState<any[]>([]);
  const [entrada, setEntrada] = useState({ nombre: '', precio: '', cupoTotal: '', localidadId: '', mode: 'GENERAL' });
  const [numeradas, setNumeradas] = useState<number[]>([]); const [published, setPublished] = useState<number[]>([]);
  const [editing, setEditing] = useState(false); const [datosDirty, setDatosDirty] = useState(false);
  const changeForm = (next: typeof form) => { setForm(next); setDatosDirty(true); };
  useEffect(() => {
    let active = true;
    Promise.all([api.getRecintos(),api.getCategorias()]).then(([rs,cs]) => { if (active) { setRecintos(rs.filter((r: any) => r.activo !== false)); setCategorias(cs.filter((c: any) => c.activo)); } }).catch(e => { if (active) setError(e.detail); });
    const initial = Number(params.get('evento'));
    if (initial) {
      setBusy(true);
      Promise.all([api.getEventoAdmin(initial),api.getTiposEntrada(initial)]).then(async ([e,ts]) => {
        if (!active) return;
        setForm({ nombre: e.titulo, recintoId: e.recintoId, categoriaId: e.categoriaId, descripcion: e.descripcion, fechaInicio: dateInput(e.fechaInicio), fechaFin: dateInput(e.fechaFin), fechaInicioVenta: dateInput(e.fechaInicioVenta), fechaFinVenta: dateInput(e.fechaFinVenta), maxBoletosPorCompra: e.maxBoletosPorCompra, imagenUrl: e.imagenFlyerUrl || '' });
        setDatosDirty(false); setEventId(e.id); setEstado(e.estado); setTipos(ts); setStep(ts.length ? 2 : 1);
        const ids = [...new Set<number>(ts.filter(t => t.localidadId).map(t => t.localidadId))];
        const layouts = await Promise.all(ids.map(async id => { try { return [id,await api.getDistribucion(initial,id)] as const; } catch (error: any) { if (error.status === 404) return null; throw error; } }));
        if (active) { setNumeradas(layouts.filter(Boolean).map(row => row![0])); setPublished(layouts.filter(row => row?.[1].estado === 'PUBLICADA').map(row => row![0])); }
      }).catch(e => { if (active) setError(e.detail); }).finally(() => { if (active) setBusy(false); });
    }
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true; setLocalidades([]);
    if (form.recintoId) api.getLocalidades(form.recintoId).then(rows => { if (active) setLocalidades(rows.filter(l => l.activo !== false)); }).catch(e => { if (active) setError(e.detail); });
    return () => { active = false; };
  }, [form.recintoId]);
  const editable = ['BORRADOR','PROGRAMADO'].includes(estado);
  const datos = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      const payload = { ...form, fechaInicio: new Date(form.fechaInicio).toISOString(), fechaFin: form.fechaFin ? new Date(form.fechaFin).toISOString() : null, fechaInicioVenta: form.fechaInicioVenta ? new Date(form.fechaInicioVenta).toISOString() : null, fechaFinVenta: form.fechaFinVenta ? new Date(form.fechaFinVenta).toISOString() : null, imagenUrl: form.imagenUrl || null };
      let id = eventId;
      if (id) await api.actualizarEvento(id,payload); else { const e = await api.crearEvento(payload); id=e.id; setEventId(id); setParams({ evento: String(id) },{ replace:true }); }
      if (flyer) { const image = await api.subirImagenEvento(id,flyer); setForm(f => ({ ...f,imagenUrl:image.url })); setFlyer(null); }
      setDatosDirty(false); setStep(1);
    } catch (e: any) { setError(e.detail || e.message); } finally { setBusy(false); }
  };
  const agregar = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      if (entrada.mode !== 'GENERAL' && !entrada.localidadId) throw { detail:'Para numerar sillas o mesas, elige una localidad dibujada en el mapa.' };
      const creada = await api.crearTipoEntrada(eventId,{ nombre:entrada.nombre,precio:Number(entrada.precio),cupoTotal:Number(entrada.cupoTotal),localidadId:entrada.localidadId ? Number(entrada.localidadId) : null });
      setTipos(anteriores => [...anteriores.filter(tipo => tipo.id !== creada.id), creada]);
      if (entrada.mode !== 'GENERAL') setNumeradas(ids => [...new Set([...ids,Number(entrada.localidadId)])]);
      setEntrada({ nombre:'',precio:'',cupoTotal:'',localidadId:'',mode:'GENERAL' }); setEditing(false);
    } catch (e: any) { setError(e.detail || e.message); } finally { setBusy(false); }
  };
  const preparar = async (sell: boolean) => {
    if (busy) return; setError('');
    if (!tipos.length) { setError('Añade al menos una entrada antes de publicar.'); return; }
    if (numeradas.some(id => !published.includes(id))) { setError('Publica las distribuciones numeradas antes de poner el evento en venta.'); setStep(2); return; }
    if (!confirm(sell ? '¿Poner este evento en venta con sus entradas y distribución actuales?' : '¿Programar el evento? La venta seguirá cerrada hasta que la actives.')) return;
    setBusy(true);
    try {
      const actual = await api.getEventoAdmin(eventId); let current: string = actual.estado;
      setEstado(actual.estado);
      if (current === 'EN_VENTA' && sell) { navigate(base + '/eventos'); return; }
      if (current !== 'BORRADOR' && current !== 'PROGRAMADO') {
        setError(`El evento está ${current}. Revisa sus opciones desde Mis eventos.`);
        return;
      }
      if (sell && (!actual.fechaInicioVenta || !actual.fechaFinVenta || Date.now() < Date.parse(actual.fechaInicioVenta) || Date.now() >= Date.parse(actual.fechaFinVenta))) {
        setError('Para abrir la venta, ajusta las fechas del período de venta y guarda los datos del evento. Si la venta es futura, puedes programarlo ahora.');
        return;
      }
      if (current === 'BORRADOR') { await api.actualizarEstadoEvento(eventId,'PROGRAMADO','BORRADOR'); current='PROGRAMADO'; setEstado('PROGRAMADO'); }
      if (sell && current === 'PROGRAMADO') { await api.actualizarEstadoEvento(eventId,'EN_VENTA','PROGRAMADO'); setEstado('EN_VENTA'); }
      navigate(base + '/eventos');
    } catch (e: any) { setError(e.detail || e.message); } finally { setBusy(false); }
  };
  return <section className="event-wizard"><div className="section-intro"><span className="eyebrow">CREACIÓN GUIADA</span><h1>{eventId ? 'Prepara tu evento' : 'Vamos a crear tu evento'}</h1><p>Avanza a tu ritmo. Cada paso se guarda en el servidor y el evento comienza como borrador.</p></div>
    <ol className="wizard-steps">{['Datos del evento','Entradas y precios','Sillas y mesas','Revisar y publicar'].map((text,index) => <li key={text} className={step === index ? 'active' : step > index ? 'done' : ''}><button disabled={busy || (index > 0 && !eventId) || (index > 1 && !tipos.length)} onClick={() => { if (step === 0 && index > 0 && datosDirty) { setError('Guarda los datos del evento antes de continuar.'); return; } setError(''); setStep(index); }}><span>{index + 1}</span>{text}</button></li>)}</ol>
    {error && <p className="notice" role="alert">{error}</p>}{busy && <p role="status">Guardando o cargando información…</p>}
    {!editable && <p className="notice">Este evento está {estado}. Para proteger sus ventas, la edición puede estar limitada. <NavLink to={base + '/eventos'}>Volver a mis eventos</NavLink></p>}
    {step === 0 && <form onSubmit={datos} className="wizard-card"><h2>1. ¿Qué vas a organizar?</h2><div className="form-grid"><label>Nombre del evento<input required maxLength={200} value={form.nombre} onChange={e => changeForm({ ...form,nombre:e.target.value })} placeholder="Ejemplo: Noche de música en vivo" /></label><label>Categoría<select required value={form.categoriaId || ''} onChange={e => setForm({ ...form,categoriaId:Number(e.target.value) })}><option value="">Selecciona una categoría</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label><label>¿En qué recinto será?<select required disabled={tipos.length > 0} value={form.recintoId || ''} onChange={e => setForm({ ...form,recintoId:Number(e.target.value) })}><option value="">Selecciona un recinto</option>{recintos.map(r => <option key={r.id} value={r.id}>{r.nombre} · {r.ciudad}</option>)}</select></label><label>Máximo de entradas por compra<input required type="number" min="1" max="100" value={form.maxBoletosPorCompra} onChange={e => setForm({ ...form,maxBoletosPorCompra:Number(e.target.value) })} /><small>Debe alcanzar para comprar una mesa completa.</small></label></div>
      {!recintos.length && <p className="notice">Necesitas un recinto primero. <NavLink to={base + '/recintos'}>Crear recinto y dibujar sus localidades →</NavLink></p>}
      <label>Cuéntale al público de qué trata<textarea className="input-brutal" rows={4} value={form.descripcion} onChange={e => setForm({ ...form,descripcion:e.target.value })} /></label><div className="form-grid">{(['fechaInicio','fechaFin','fechaInicioVenta','fechaFinVenta'] as const).map((key,index) => <label key={key}>{['Inicio del evento','Fin del evento (opcional)','Apertura de venta (opcional)','Cierre de venta (opcional)'][index]}<input required={key === 'fechaInicio'} type="datetime-local" value={form[key]} onChange={e => setForm({ ...form,[key]:e.target.value })} /></label>)}<label>Imagen del evento (opcional)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setFlyer(e.target.files?.[0] || null)} /></label></div><p className="helper-text">Las fechas se introducen en tu hora local. La aplicación las envía en UTC automáticamente.</p><button className="btn btn-primary" disabled={busy || !editable}>Guardar y configurar entradas →</button></form>}
    {step === 1 && <div className="wizard-card"><h2>2. ¿Qué entradas venderás?</h2><p>Añade las localidades y sus precios. Para mesas, el precio es por silla; la mesa completa cuesta la suma de sus sillas. IVA y comisión se calculan en la compra.</p>
      {tipos.map(t => <div className="selection-row" key={t.id}><div><strong>{t.nombre}</strong><p>Q{t.precio.toFixed(2)} por persona · Cupo {t.cupoTotal} · {localidades.find(l => l.id === t.localidadId)?.nombre || 'Entrada general'}</p></div>{t.localidadId && <label><input type="checkbox" disabled={published.includes(t.localidadId)} checked={numeradas.includes(t.localidadId)} onChange={e => setNumeradas(ids => e.target.checked ? [...new Set([...ids,t.localidadId])] : ids.filter(id => id !== t.localidadId))} /> Elegir silla o mesa en esta localidad</label>}</div>)}
      {(!tipos.length || editing) ? <form onSubmit={agregar} className="entry-form"><div className="form-grid"><label>Nombre de la entrada<input required value={entrada.nombre} onChange={e => setEntrada({ ...entrada,nombre:e.target.value })} placeholder="Ejemplo: Mesas VIP / General" /></label><label>¿Cómo se venderá?<select value={entrada.mode} onChange={e => setEntrada({ ...entrada,mode:e.target.value })}><option value="GENERAL">Entrada general, sin silla asignada</option><option value="SILLAS">Sillas numeradas</option><option value="MESAS">Mesas con sillas numeradas</option></select></label><label>Localidad del mapa<select required={entrada.mode !== 'GENERAL'} value={entrada.localidadId} onChange={e => setEntrada({ ...entrada,localidadId:e.target.value })}><option value="">Sin localidad: entrada general</option>{localidades.map(l => <option key={l.id} value={l.id}>{l.nombre} · {l.capacidad} personas</option>)}</select></label><label>Precio por persona, sin IVA (Q)<input required type="number" min="0" step="0.01" value={entrada.precio} onChange={e => setEntrada({ ...entrada,precio:e.target.value })} /></label><label>Cupo inicial de personas<input required type="number" min="1" max="2000000" value={entrada.cupoTotal} onChange={e => setEntrada({ ...entrada,cupoTotal:e.target.value })} /><small>En localidades numeradas, el cupo definitivo se ajusta al publicar las sillas.</small></label></div><button className="btn btn-outline" disabled={busy || !editable}>Guardar esta entrada</button></form> : <button className="btn btn-outline" disabled={!editable} onClick={() => setEditing(true)}>+ Añadir otra entrada</button>}
      <div className="actions"><button className="btn btn-outline" onClick={() => setStep(0)}>← Datos del evento</button><button className="btn btn-primary" disabled={!tipos.length || busy} onClick={() => { setStep(numeradas.length ? 2 : 3); setError(''); }}>{numeradas.length ? 'Distribuir sillas y mesas →' : 'Revisar evento →'}</button></div>
    </div>}
    {step === 2 && <div className="wizard-card">{numeradas.length ? <><p className="notice">Configura y publica cada localidad marcada como numerada: {numeradas.map(id => localidades.find(l => l.id === id)?.nombre || id).join(', ')}.</p><AdminSeating fixedEventoId={eventId} initialLocalidadId={numeradas[0]} onPublished={id => setPublished(ids => [...new Set([...ids,id])])} /></> : <div className="empty-state"><h2>Este evento vende entradas generales</h2><p>No necesita un plano de sillas. Si deseas numerarlas, vuelve al paso Entradas y precios y marca la localidad.</p></div>}<div className="actions"><button className="btn btn-outline" onClick={() => setStep(1)}>← Entradas y precios</button><button className="btn btn-primary" onClick={() => setStep(3)}>Revisar evento →</button></div></div>}
    {step === 3 && <div className="wizard-card"><h2>4. Revisa antes de abrir la venta</h2><h3>{form.nombre}</h3><dl className="review-summary"><dt>Recinto</dt><dd>{recintos.find(r => r.id === form.recintoId)?.nombre}</dd><dt>Fecha</dt><dd>{form.fechaInicio ? new Date(form.fechaInicio).toLocaleString('es-GT') : 'Pendiente'}</dd><dt>Estado actual</dt><dd>{estado}</dd><dt>Entradas</dt><dd>{tipos.map(t => t.nombre + ' · Q' + t.precio.toFixed(2)).join(' / ')}</dd><dt>Localidades numeradas</dt><dd>{numeradas.length ? numeradas.map(id => (localidades.find(l => l.id === id)?.nombre || id) + (published.includes(id) ? ' · lista' : ' · falta publicar')).join(' / ') : 'Sin asientos asignados'}</dd></dl><p>Programar deja el evento preparado. Poner en venta permite que el público compre según la ventana de venta configurada. El servidor vuelve a comprobar cupos, permisos y distribución.</p><div className="actions"><button className="btn btn-outline" onClick={() => setStep(1)}>← Revisar entradas</button><button className="btn btn-outline" disabled={busy || !editable} onClick={() => preparar(false)}>Solo programar</button><button className="btn btn-primary" disabled={busy || !editable || numeradas.some(id => !published.includes(id))} onClick={() => preparar(true)}>Confirmar y poner en venta</button></div></div>}
    {!!eventId && <p className="helper-text">Tu evento está guardado. Puedes continuar después desde <NavLink to={base + '/eventos'}>Mis eventos</NavLink>.</p>}
  </section>;
}
