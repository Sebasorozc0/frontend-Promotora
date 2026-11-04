interface LoadStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
}

export function LoadState({ loading, error, empty, emptyMessage = 'No hay registros.', onRetry }: LoadStateProps) {
  if (loading) return <p role="status">Cargando…</p>;
  if (error) return <div role="alert" style={{ padding: 16, background: '#FEE2E2', color: '#991B1B' }}>
    <p>{error}</p>
    {onRetry && <button type="button" className="btn btn-sm btn-outline" onClick={onRetry}>Reintentar</button>}
  </div>;
  return empty ? <p role="status">{emptyMessage}</p> : null;
}
