import { useMemo, useState } from 'react';
import { DistribucionDto, SillaDto } from '../types/api';
import { detailViewBox, markerRadius } from './seatMapScale';

export function SeatSelector({ plano, selected, onChange, max }: { plano: DistribucionDto; selected: number[]; onChange: (ids: number[]) => void; max: number }) {
  const [tableId, setTableId] = useState<number | null>(null);
  const table = plano.mesas.find(m => m.id === tableId);
  const seats = useMemo(() => plano.asientos.filter(s => table ? s.mesaId === table.id : s.mesaId == null), [plano.asientos, table]);
  const radius = useMemo(() => markerRadius(table ? [table, ...seats] : seats, 12), [table, seats]);
  const tableRadius = useMemo(() => markerRadius(plano.mesas, 16), [plano.mesas]);
  const viewBox = table ? detailViewBox([table, ...seats], radius * 4) : detailViewBox([...plano.mesas, ...seats, ...(!plano.mesas.length && !seats.length ? [{ x: 0, y: 0 }, { x: 1, y: 1 }] : [])], Math.max(radius, tableRadius) * 2);
  const completa = table?.modalidad === 'COMPLETA';
  const mesaSeleccionada = seats.length > 0 && seats.every(s => selected.includes(s.id));
  const mesaDisponible = seats.length > 0 && seats.every(s => s.estado === 'DISPONIBLE');
  const faltan = seats.filter(s => !selected.includes(s.id)).length;
  const toggle = (group: readonly SillaDto[]) => {
    if (!group.length) return;
    const ids = group.map(s => s.id);
    if (ids.every(id => selected.includes(id))) {
      onChange(selected.filter(id => !ids.includes(id)));
      return;
    }
    if (group.some(s => s.estado !== 'DISPONIBLE')) return;
    const next = [...new Set([...selected, ...ids])];
    if (next.length <= max) onChange(next);
  };
  return <section className="seat-selector">
    <p>Elige una mesa para ver sus sillas o selecciona una silla de la fila. Máximo {max} personas; la reserva comienza al confirmar.</p>
    {plano.mesas.length > 0 && <div className="form-grid"><label>Mesa que quieres ver
      <select value={table?.id ?? ''} onChange={e => setTableId(e.target.value ? Number(e.target.value) : null)}>
        <option value="">Vista general de las mesas</option>
        {plano.mesas.map(m => <option key={m.id} value={m.id}>Mesa {m.etiqueta} · {m.modalidad === 'COMPLETA' ? 'mesa completa' : 'por silla'}</option>)}
      </select></label></div>}
    {table && <button type="button" className="btn btn-sm btn-outline" onClick={() => setTableId(null)}>Volver a todas las mesas</button>}
    {completa && <div>
      <p>Esta mesa se vende completa ({seats.length} sillas). El plano muestra dónde están ubicadas.</p>
      <button type="button" className="btn btn-sm btn-primary" disabled={!mesaSeleccionada && (!mesaDisponible || selected.length + faltan > max)} onClick={() => toggle(seats)}>
        {mesaSeleccionada ? 'Quitar mesa completa' : 'Seleccionar mesa completa'}
      </button>
      {!mesaSeleccionada && !mesaDisponible && <p>Mesa no disponible.</p>}
      {!mesaSeleccionada && mesaDisponible && selected.length + faltan > max && <p>La mesa supera el límite restante de tu compra.</p>}
    </div>}
    <svg viewBox={viewBox} role="group" aria-label="Plano de sillas disponibles" className="seat-plan">
      {plano.imagenPlanoUrl && <image href={plano.imagenPlanoUrl} width="1000" height="562" opacity=".3" />}
      {(table ? [table] : plano.mesas).map(m => {
        const size = table ? radius : tableRadius;
        return <g key={m.id} role="button" tabIndex={0} aria-label={`Ver mesa ${m.etiqueta}`} onClick={() => setTableId(m.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTableId(m.id); } }}>
          <title>Mesa {m.etiqueta}</title>
          <circle cx={m.x * 1000} cy={m.y * 562} r={size} fill="#FDE68A" stroke="#121316" strokeWidth={size / 6} />
          <text x={m.x * 1000} y={m.y * 562} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.8}>{m.etiqueta}</text>
        </g>;
      })}
      {seats.map(s => {
        const blocked = s.estado !== 'DISPONIBLE' || (completa && !mesaDisponible);
        return <g key={s.id} role={completa ? 'img' : 'button'} tabIndex={completa || blocked ? undefined : 0} aria-disabled={completa ? undefined : blocked} aria-pressed={completa ? undefined : selected.includes(s.id)} aria-label={`Silla ${s.etiqueta}, ${s.estado}`} onClick={completa || blocked ? undefined : () => toggle([s])} onKeyDown={completa || blocked ? undefined : e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle([s]); } }}>
          <title>{s.etiqueta} · {s.estado}</title><circle cx={s.x * 1000} cy={s.y * 562} r={radius} fill={selected.includes(s.id) ? '#1E40AF' : blocked ? '#9CA3AF' : '#059669'} stroke="#121316" strokeWidth={radius / 6} /><text x={s.x * 1000} y={s.y * 562} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={radius * 0.85}>{table ? s.etiqueta.split('-').at(-1) : s.etiqueta}</text>
        </g>;
      })}
    </svg>
    <p>Verde: disponible · Azul: seleccionada · Gris: ocupada o bloqueada.</p>
    {!completa && <div className="seat-list">{seats.map(s =>
      <button type="button" key={s.id} className={`btn btn-sm ${selected.includes(s.id) ? 'btn-primary' : 'btn-outline'}`} disabled={s.estado !== 'DISPONIBLE' || (!selected.includes(s.id) && selected.length >= max)} aria-pressed={selected.includes(s.id)} onClick={() => toggle([s])}>{s.etiqueta} · {s.estado}{selected.includes(s.id) ? ' ✓' : ''}</button>
    )}</div>}
    <p>{selected.length} sillas seleccionadas.</p>
  </section>;
}
