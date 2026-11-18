function fechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > '9999-12-30' || fecha < '0001-01-01') return false;
  const dia = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(dia.getTime()) && dia.toISOString().slice(0, 10) === fecha;
}

export function rangoFechasUtc(desde: string, hasta: string): { desde?: string; hasta?: string } | null {
  if ((desde && !fechaValida(desde)) || (hasta && !fechaValida(hasta)) || (desde && hasta && desde > hasta)) return null;
  const resultado: { desde?: string; hasta?: string } = {};
  if (desde) resultado.desde = desde;
  if (hasta) {
    const dia = new Date(`${hasta}T00:00:00Z`);
    dia.setUTCDate(dia.getUTCDate() + 1);
    resultado.hasta = dia.toISOString().slice(0, 10);
  }
  return resultado;
}
