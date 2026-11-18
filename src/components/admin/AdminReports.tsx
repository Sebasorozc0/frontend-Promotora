import { useState } from 'react';
import { api } from '../../api/client';
import { rangoFechasUtc } from '../../utils/rangoFechas';

const nombres = ['Ventas por evento','Ventas por categoría','Ventas por recinto','Ventas por fecha y método','Ocupación por localidad','Boletos por evento','Movimientos por dueño','Comisiones de plataforma','Clientes por compras','Compras no completadas','Calificación por presentador','Eventos por estado','Carreras por distancia','Uso del agente IA','Auditoría y notificaciones'];

export function AdminReports() {
  const [numero, setNumero] = useState(1);
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [reporte, setReporte] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const codigo = 'R-' + String(numero).padStart(2, '0');
  const permitidos = ['desde', 'hasta', ...(numero < 14 ? ['eventoId','categoriaId','recintoId','duenoId'] : []), ...(numero < 15 ? ['estado'] : []), ...([1,2,3,4,6,7,8,9,10].includes(numero) ? ['moneda'] : []), ...(numero === 4 ? ['metodo'] : [])];
  const rango = rangoFechasUtc(filtros.desde || '', filtros.hasta || '');
  const rangoInvalido = rango === null;
  const parametros = Object.fromEntries(Object.entries(filtros).filter(([key, value]) => permitidos.includes(key) && value.trim()));
  if (rango?.hasta) parametros.hasta = rango.hasta;
  const ejecutar = async (formato: 'json' | 'xlsx' | 'pdf', pagina = page) => {
    if (rangoInvalido) { setError('Revisa el rango de fechas. La fecha inicial no puede ser posterior a la final.'); return; }
    setBusy(true); setError('');
    try {
      if (formato === 'json') { setReporte(await api.getReporte(codigo, { ...parametros, page: String(pagina), pageSize: '20' })); setPage(pagina); }
      else await api.descargarReporte(codigo, parametros, formato);
    } catch (e: any) { setError(e.detail); } finally { setBusy(false); }
  };
  return <section><h3>Reportes de la promotora</h3><p>Consulta resultados o descarga Excel/PDF. El rango incluye ambos días en UTC y se aplica también a las descargas. Los totales abarcan todas las páginas y se separan por moneda.</p>
    <form onSubmit={e => { e.preventDefault(); void ejecutar('json', 1); }}>
      <label>Reporte<select value={numero} onChange={e => { setNumero(Number(e.target.value)); setReporte(null); setPage(1); setError(''); }}>{nombres.map((nombre, index) => <option value={index + 1} key={nombre}>R-{String(index + 1).padStart(2,'0')} · {nombre}</option>)}</select></label>
      <div className="form-grid">{permitidos.map(field => <label key={field}>{({ desde: 'Desde (UTC, incluido)', hasta: 'Hasta (UTC, incluido)', eventoId: 'ID evento', categoriaId: 'ID categoría', recintoId: 'ID recinto', duenoId: 'ID dueño', estado: 'Estado', moneda: 'Moneda', metodo: 'Método de pago' } as Record<string,string>)[field]}<input type={['desde','hasta'].includes(field) ? 'date' : field.endsWith('Id') ? 'number' : 'text'} min={field.endsWith('Id') ? 1 : field === 'hasta' ? filtros.desde || undefined : undefined} max={field === 'hasta' ? '9999-12-30' : field === 'desde' ? filtros.hasta || '9999-12-30' : undefined} value={filtros[field] || ''} placeholder={field === 'moneda' ? 'GTQ' : 'Todos'} onChange={e => { setFiltros(prev => ({ ...prev, [field]: e.target.value })); setReporte(null); setError(''); }} /></label>)}</div>
      {rangoInvalido && <p className="notice" role="alert">Revisa el rango: la fecha inicial no puede ser posterior a la final y la fecha máxima es 30/12/9999.</p>}
      <div className="actions"><button className="btn btn-primary" disabled={busy || rangoInvalido}>Consultar</button><button type="button" className="btn btn-outline" disabled={busy || rangoInvalido} onClick={() => ejecutar('xlsx')}>Descargar Excel</button><button type="button" className="btn btn-outline" disabled={busy || rangoInvalido} onClick={() => ejecutar('pdf')}>Descargar PDF</button></div>
    </form>
    {busy && <p role="status">Preparando reporte…</p>}{error && <p className="notice" role="alert">{error}</p>}
    {reporte && <><h3>{reporte.titulo}</h3><p>{reporte.nota}</p>{reporte.secciones.map((seccion: any) => <section key={seccion.codigo}><h4>{seccion.codigo} · {seccion.totalFilas} filas</h4><div className="table-scroll"><table><thead><tr>{seccion.columnas.map((c: any) => <th key={c.campo}>{c.titulo}</th>)}</tr></thead><tbody>{seccion.filas.map((fila: any, index: number) => <tr key={index}>{seccion.columnas.map((c: any) => <td key={c.campo}>{fila[c.campo] === null ? '—' : String(fila[c.campo] ?? '')}</td>)}</tr>)}</tbody></table></div>{!seccion.filas.length && <p>No hay resultados para estos filtros.</p>}<h4>Totales del conjunto filtrado</h4><div className="table-scroll"><pre>{JSON.stringify(seccion.totales, null, 2)}</pre></div></section>)}<div className="actions"><button className="btn btn-outline" disabled={busy || page <= 1} onClick={() => ejecutar('json', page - 1)}>Anterior</button><span>Página {page}</span><button className="btn btn-outline" disabled={busy || reporte.secciones.every((s: any) => s.totalFilas <= page * s.pageSize)} onClick={() => ejecutar('json', page + 1)}>Siguiente</button></div></>}
  </section>;
}
