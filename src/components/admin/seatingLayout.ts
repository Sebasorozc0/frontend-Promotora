export type Point = [number, number];
export interface DraftMesa { id: number | null; clave: string; etiqueta: string; modalidad: string; tipoEntradaId: number; x: number; y: number; }
export interface DraftSeat { id: number | null; mesaClave: string | null; etiqueta: string; fila: string | null; tipoEntradaId: number; x: number; y: number; bloqueado: boolean; }
export interface DraftLayout { imagenPlanoUrl: string | null; mesas: DraftMesa[]; asientos: DraftSeat[]; }

export function inside(point: Point, polygon: Point[]): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i], [bx, by] = polygon[j];
    const cross = (point[0] - ax) * (by - ay) - (point[1] - ay) * (bx - ax);
    if (Math.abs(cross) < 1e-8 && point[0] >= Math.min(ax,bx) && point[0] <= Math.max(ax,bx) && point[1] >= Math.min(ay,by) && point[1] <= Math.max(ay,by)) return true;
    if ((ay > point[1]) !== (by > point[1]) && point[0] < (bx - ax) * (point[1] - ay) / (by - ay) + ax) result = !result;
  }
  return result;
}

// La geometría existente del recinto utiliza el lienzo de 1000 × 562.
export function normalizedPolygon(points?: Point[]): Point[] {
  if (!points || points.length < 3) throw new Error('Esta localidad necesita una zona dibujada en el mapa. Ve a Recintos y localidades para trazarla primero.');
  const normalized = points.every(([x,y]) => x >= 0 && y >= 0 && x <= 1 && y <= 1);
  const polygon = points.map(([x,y]) => normalized ? [x,y] as Point : [x / 1000, y / 562] as Point);
  if (polygon.some(([x,y]) => !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > 1 || y > 1)) throw new Error('El polígono debe estar dentro del plano del recinto. Ajusta la localidad antes de distribuir las mesas.');
  const area = Math.abs(polygon.reduce((sum, [x,y], i) => { const next = polygon[(i + 1) % polygon.length]; return sum + x * next[1] - next[0] * y; }, 0)) / 2;
  if (area < 0.00001) throw new Error('La zona dibujada no tiene superficie suficiente. Corrige el polígono de la localidad.');
  return polygon;
}

export function generateLayout(options: { polygon: Point[]; mode: 'MESAS' | 'FILAS'; groups: number; seatsPerGroup: number; tipoEntradaId: number; modalidad: 'COMPLETA' | 'POR_SILLA'; prefix?: string }): DraftLayout {
  const { polygon, mode, groups, seatsPerGroup, tipoEntradaId, modalidad } = options;
  if (!Number.isInteger(groups) || !Number.isInteger(seatsPerGroup) || groups < 1 || seatsPerGroup < 1) {
    throw new Error('Indica cantidades enteras mayores que cero.');
  }
  if (mode === 'MESAS' && groups > 500) throw new Error(`Pediste ${groups} mesas. El máximo por distribución es 500.`);
  if (groups * seatsPerGroup > 2000) throw new Error(`Pediste ${groups * seatsPerGroup} sillas. El máximo por distribución es 2000.`);
  const xs = polygon.map(p => p[0]), ys = polygon.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = maxX - minX, height = maxY - minY;
  const round = (n: number) => Number(n.toFixed(6));
  const total = groups * seatsPerGroup;
  const mesas: DraftMesa[] = [], asientos: DraftSeat[] = [];
  const prefix = options.prefix?.trim() || (mode === 'MESAS' ? 'M' : 'F');
  if (mode === 'FILAS') {
    // Primero se intenta la cuadrícula solicitada; si el polígono la recorta,
    // se buscan filas más densas sin colocar sillas fuera de la zona.
    for (let density = 1; density <= 6; density++) {
      const candidates: Point[] = [];
      const rows = groups * density, cols = seatsPerGroup * density;
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const point: Point = [round(minX + width * (col + .5) / cols), round(minY + height * (row + .5) / rows)];
        if (inside(point, polygon)) candidates.push(point);
      }
      if (candidates.length < total) continue;
      const chosen = Array.from({ length: total }, (_, i) => candidates[Math.floor(i * candidates.length / total)]);
      chosen.forEach(([x,y], i) => asientos.push({ id: null, mesaClave: null, etiqueta: `${prefix}${Math.floor(i / seatsPerGroup) + 1}-${i % seatsPerGroup + 1}`, fila: `${prefix}${Math.floor(i / seatsPerGroup) + 1}`, tipoEntradaId, x, y, bloqueado: false }));
      return { imagenPlanoUrl: null, mesas, asientos };
    }
  } else {
    for (let density = 1; density <= 10; density++) {
      const columns = Math.max(1, Math.ceil(Math.sqrt(groups * width / Math.max(height, .001)))) * density;
      const rows = Math.max(1, Math.ceil(groups / (columns / density))) * density;
      const radius = Math.min(width / columns, height / rows) * .27;
      if (radius < .00001) break;
      const candidates: { center: Point; chairs: Point[] }[] = [];
      for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
        const center: Point = [round(minX + width * (col + .5) / columns), round(minY + height * (row + .5) / rows)];
        const chairs = Array.from({ length: seatsPerGroup }, (_, i) => { const angle = i * Math.PI * 2 / seatsPerGroup; return [round(center[0] + Math.cos(angle) * radius), round(center[1] + Math.sin(angle) * radius)] as Point; });
        if (inside(center, polygon) && chairs.every(p => inside(p, polygon))) candidates.push({ center, chairs });
      }
      if (candidates.length < groups) continue;
      for (let i = 0; i < groups; i++) {
        const { center, chairs } = candidates[Math.floor(i * candidates.length / groups)];
        const clave = `mesa-${i + 1}`;
        mesas.push({ id: null, clave, etiqueta: `${prefix}${i + 1}`, modalidad, tipoEntradaId, x: center[0], y: center[1] });
        chairs.forEach(([x,y], j) => asientos.push({ id: null, mesaClave: clave, etiqueta: `${prefix}${i + 1}-S${j + 1}`, fila: null, tipoEntradaId, x, y, bloqueado: false }));
      }
      return { imagenPlanoUrl: null, mesas, asientos };
    }
  }
  throw new Error('La distribución no cabe en la forma de esta localidad. Reduce las cantidades o ajusta el polígono.');
}

export function layoutProblems(layout: DraftLayout, polygon: Point[], capacidad: number): string[] {
  const errors: string[] = [];
  if (!layout.asientos.length) errors.push('Genera al menos una silla.');
  if (layout.asientos.length > capacidad) errors.push(`La localidad admite ${capacidad} personas; la distribución tiene ${layout.asientos.length}.`);
  if (layout.asientos.some(s => !inside([s.x,s.y], polygon)) || layout.mesas.some(m => !inside([m.x,m.y], polygon))) errors.push('Hay mesas o sillas fuera de la zona de la localidad.');
  if (new Set(layout.asientos.map(s => s.etiqueta.trim())).size !== layout.asientos.length || layout.asientos.some(s => !s.etiqueta.trim())) errors.push('Cada silla necesita una etiqueta única.');
  if (new Set(layout.mesas.map(m => m.etiqueta.trim())).size !== layout.mesas.length || layout.mesas.some(m => !m.etiqueta.trim())) errors.push('Cada mesa necesita una etiqueta única.');
  if (new Set(layout.asientos.map(s => `${s.x.toFixed(6)}:${s.y.toFixed(6)}`)).size !== layout.asientos.length) errors.push('Hay sillas en la misma posición. Sepáralas en el plano antes de guardar.');
  for (const mesa of layout.mesas) {
    const seats = layout.asientos.filter(s => s.mesaClave === mesa.clave);
    if (!seats.length || seats.some(s => s.tipoEntradaId !== mesa.tipoEntradaId)) errors.push(`La mesa ${mesa.etiqueta} necesita sillas con la misma tarifa.`);
  }
  return [...new Set(errors)];
}
