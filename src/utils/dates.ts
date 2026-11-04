/** datetime-local contains local wall time, while API instants include an offset. */
export function toLocalDateTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toApiDateTime(value: string, original?: string | null): string | null {
  if (original && toLocalDateTime(original) === value) return original;
  return value ? new Date(value).toISOString() : null;
}
