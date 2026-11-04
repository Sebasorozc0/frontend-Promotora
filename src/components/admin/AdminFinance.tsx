import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoadState } from '../common/LoadState';
import { api } from '../../api/client';
import { CuentaFinancieraDto, MovimientoFinancieroDto, TipoCuenta, EstadoCuenta, TipoMovimiento } from '../../types/api';
import { Modal } from '../common/Modal';
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RotateCcw, 
  Lock, 
  TrendingUp, 
  Building2, 
  Search,
  Filter
} from 'lucide-react';

export const AdminFinance: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMINISTRADOR';
  const [loadError, setLoadError] = useState<string | null>(null);
  const [liquidationKey, setLiquidationKey] = useState('');
  const [cuentas, setCuentas] = useState<CuentaFinancieraDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  // Modal Movimientos
  const [selectedCuentaParaMovimientos, setSelectedCuentaParaMovimientos] = useState<CuentaFinancieraDto | null>(null);
  const [movimientosError, setMovimientosError] = useState<string | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoFinancieroDto[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [filtroTipoMovimiento, setFiltroTipoMovimiento] = useState<string>('TODOS');

  // Modal Liquidar
  const [selectedCuentaParaLiquidar, setSelectedCuentaParaLiquidar] = useState<CuentaFinancieraDto | null>(null);
  const [montoLiquidar, setMontoLiquidar] = useState<number>(100);
  const [liquidando, setLiquidando] = useState(false);

  // Modal Reembolso
  const [reembolsoModalOpen, setReembolsoModalOpen] = useState(false);
  const [publicIdReembolso, setPublicIdReembolso] = useState('');
  const [reembolsando, setReembolsando] = useState(false);

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4500);
  };

  const fetchCuentas = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.getCuentas();
      setCuentas(isAdmin ? res : res.filter(c => c.duenoId === user?.id));
    } catch (e: any) {
      setCuentas([]);
      setLoadError(e?.detail || 'No se pudieron cargar las cuentas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCuentas();
  }, []);

  const handleOpenMovimientos = async (cuenta: CuentaFinancieraDto) => {
    setSelectedCuentaParaMovimientos(cuenta);
    setLoadingMovimientos(true);
    setMovimientos([]); setMovimientosError(null);
    try {
      setMovimientos(await api.getTodosMovimientos(cuenta.id));
    } catch (e: any) {
      setMovimientos([]);
      setMovimientosError(e?.detail || 'No se pudieron cargar los movimientos.');
    } finally {
      setLoadingMovimientos(false);
    }
  };

  const handleLiquidar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedCuentaParaLiquidar || liquidando) return;
    if (montoLiquidar <= 0 || montoLiquidar > selectedCuentaParaLiquidar.saldo) {
      alert('El monto debe ser positivo y no exceder el saldo disponible.');
      return;
    }

    setLiquidando(true);
    try {
      await api.liquidarCuenta(selectedCuentaParaLiquidar.id, montoLiquidar, liquidationKey);
      showFeedback(`Liquidación por ${formatMoney(montoLiquidar, selectedCuentaParaLiquidar.moneda)} procesada exitosamente con Idempotency-Key.`);
      setSelectedCuentaParaLiquidar(null);
      fetchCuentas();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al procesar liquidación.', 'error');
    } finally {
      setLiquidando(false);
    }
  };

  const handleCerrarCuenta = async (cuenta: CuentaFinancieraDto) => {
    if (!isAdmin) return;
    if (cuenta.saldo !== 0) {
      alert(`No se puede cerrar una cuenta con saldo activo (Saldo actual: Q${cuenta.saldo.toFixed(2)}). Debe liquidarse a cero primero.`);
      return;
    }
    if (!confirm(`¿Estás seguro de cerrar la cuenta ID #${cuenta.id}? Esta acción es definitiva.`)) return;

    try {
      await api.cerrarCuenta(cuenta.id);
      showFeedback(`Cuenta ID #${cuenta.id} cerrada exitosamente.`);
      fetchCuentas();
    } catch (err: any) {
      showFeedback(err?.detail || 'No se pudo cerrar la cuenta.', 'error');
    }
  };

  const handleReembolsarCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !publicIdReembolso.trim() || reembolsando) return;

    setReembolsando(true);
    try {
      await api.reembolsarCompra(publicIdReembolso.trim());
      showFeedback(`Compra ${publicIdReembolso} reembolsada exitosamente. Operación confirmada por el servidor.`);
      setReembolsoModalOpen(false);
      setPublicIdReembolso('');
      fetchCuentas();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al emitir el reembolso.', 'error');
    } finally {
      setReembolsando(false);
    }
  };

  const formatMoney = (amount: number, moneda: string) => `${moneda} ${amount.toFixed(2)}`;
  const saldoPorTipo = (tipo: string) => {
    const totales = new Map<string, number>();
    cuentas.filter(c => c.tipo === tipo).forEach(c => totales.set(c.moneda, (totales.get(c.moneda) || 0) + c.saldo));
    return [...totales].map(([moneda, saldo]) => formatMoney(saldo, moneda)).join(' · ') || 'Sin cuentas';
  };
  const saldoPlataforma = saldoPorTipo('PLATAFORMA');
  const saldoDuenos = saldoPorTipo('DUENO');
  const saldoImpuestos = saldoPorTipo('IMPUESTOS');

  const cuentasFiltradas = cuentas.filter((c) => {
    const coincideTipo = filtroTipo === 'TODOS' || c.tipo === filtroTipo;
    const coincideEstado = filtroEstado === 'TODOS' || c.estado === filtroEstado;
    return coincideTipo && coincideEstado;
  });

  const movimientosFiltrados = movimientos.filter((m) =>
    filtroTipoMovimiento === 'TODOS' || m.tipo === filtroTipoMovimiento
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <LoadState loading={loading} error={loadError} empty={!cuentas.length} onRetry={fetchCuentas} />
      {/* Toast Feedback */}
      {feedback && (
        <div style={{
          padding: '12px 18px',
          border: '2px solid var(--border-strong)',
          backgroundColor: feedback.type === 'success' ? '#D1FAE5' : '#FEE2E2',
          color: feedback.type === 'success' ? '#065F46' : '#991B1B',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {(isAdmin ? [
          { label: 'COMISIONES PLATAFORMA', value: saldoPlataforma },
          { label: 'FONDOS POR LIQUIDAR A DUEÑOS', value: saldoDuenos },
          { label: 'RESERVA DE IMPUESTOS', value: saldoImpuestos },
        ] : [{ label: 'SALDO DE MIS RECINTOS', value: saldoDuenos }]).map(item =>
          <div key={item.label} style={{ background: '#FFF', border: '2px solid var(--border-strong)', padding: 20 }}>
            <div style={{ fontWeight: 700 }}>{item.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem' }}>{item.value}</div>
          </div>
        )}
      </div>

      {/* Barra de Filtros y Acción de Reembolso */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700 }}>
            Filtrar:
          </label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="input-base"
            style={{ fontSize: '0.85rem' }}
          >
            <option value="TODOS">Todos los Tipos</option>
            <option value="DUENO">DUEÑO DE RECINTO</option>
            <option value="PLATAFORMA">PLATAFORMA ASA</option>
            <option value="IMPUESTOS">IMPUESTOS</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="input-base"
            style={{ fontSize: '0.85rem' }}
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="ACTIVA">ACTIVA</option>
            <option value="CERRADA">CERRADA</option>
          </select>
        </div>

        {isAdmin && <button
          onClick={() => setReembolsoModalOpen(true)}
          className="btn btn-sm btn-outline"
          style={{ color: 'var(--accent-vermilion)', borderColor: 'var(--accent-vermilion)' }}
        >
          <RotateCcw size={15} /> Reembolsar Compra de Cliente
        </button>}
      </div>

      {/* Grid de Cuentas Financieras */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {cuentasFiltradas.map((c) => (
          <div
            key={c.id}
            style={{
              backgroundColor: '#FFF',
              border: '2px solid var(--border-strong)',
              boxShadow: 'var(--shadow-crisp-sm)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className="badge badge-categoria" style={{ fontSize: '0.7rem' }}>
                  CUENTA #{c.id} · {c.tipo}
                </span>
                <span className={`badge ${c.estado === 'ACTIVA' ? 'badge-valido' : 'badge-anulado'}`}>
                  {c.estado}
                </span>
              </div>

              <h4 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>
                {c.empresa || c.duenoNombre || `Cuenta Oficial ${c.tipo}`}
              </h4>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Moneda: <strong>{c.moneda}</strong> · Creada: {new Date(c.fechaCreacion).toLocaleDateString('es-GT')}
              </div>

              <div style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '1.5px solid var(--border-subtle)',
                padding: '12px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline'
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Saldo Actual
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: c.saldo > 0 ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                  {formatMoney(c.saldo, c.moneda)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <button
                onClick={() => handleOpenMovimientos(c)}
                className="btn btn-sm btn-outline"
                style={{ flex: 1, gap: '4px' }}
              >
                <FileText size={14} /> Extracto
              </button>

              {isAdmin && c.tipo === 'DUENO' && c.estado === 'ACTIVA' && (
                <button
                  onClick={() => {
                    setSelectedCuentaParaLiquidar(c);
                    setLiquidationKey(crypto.randomUUID());
                    setMontoLiquidar(c.saldo);
                  }}
                  disabled={c.saldo <= 0}
                  className="btn btn-sm btn-primary"
                  style={{ gap: '4px' }}
                  title="Liquidar saldo al dueño"
                >
                  <ArrowDownLeft size={14} /> Liquidar
                </button>
              )}

              {isAdmin && c.estado === 'ACTIVA' && c.tipo === 'DUENO' && (
                <button
                  onClick={() => handleCerrarCuenta(c)}
                  className="btn btn-sm btn-outline"
                  style={{ color: 'var(--text-muted)' }}
                  title="Cerrar cuenta contable"
                >
                  <Lock size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL MOVIMIENTOS / EXTRACTO BANCARIO --- */}
      <Modal
        isOpen={!!selectedCuentaParaMovimientos}
        onClose={() => setSelectedCuentaParaMovimientos(null)}
        title={`Extracto de Movimientos: Cuenta #${selectedCuentaParaMovimientos?.id}`}
        maxWidth="740px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-canvas)',
            padding: '12px 16px',
            border: '1.5px solid var(--border-strong)'
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Titular / Empresa: <strong>{selectedCuentaParaMovimientos?.empresa || selectedCuentaParaMovimientos?.duenoNombre || selectedCuentaParaMovimientos?.tipo}</strong>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Saldo Conciliado: <strong style={{ color: 'var(--accent-emerald)' }}>{selectedCuentaParaMovimientos && formatMoney(selectedCuentaParaMovimientos.saldo, selectedCuentaParaMovimientos.moneda)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={14} />
              <select
                value={filtroTipoMovimiento}
                onChange={(e) => setFiltroTipoMovimiento(e.target.value)}
                className="input-base"
                style={{ fontSize: '0.78rem' }}
              >
                <option value="TODOS">Todos los Tipos</option>
                <option value="VENTA">VENTA</option>
                <option value="COMISION">COMISION</option>
                <option value="IMPUESTO">IMPUESTO</option>
                <option value="LIQUIDACION">LIQUIDACION</option>
                <option value="REEMBOLSO">REEMBOLSO</option>
              </select>
            </div>
          </div>

          <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {movimientosError ? <LoadState error={movimientosError} onRetry={() => selectedCuentaParaMovimientos && handleOpenMovimientos(selectedCuentaParaMovimientos)} /> : loadingMovimientos ? (
              <div style={{ padding: '30px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                Cargando extracto de transacciones...
              </div>
            ) : movimientosFiltrados.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                No se registraron movimientos en este período.
              </div>
            ) : (
              movimientosFiltrados.map((m) => (
                <div
                  key={m.id}
                  style={{
                    backgroundColor: '#FFF',
                    border: '1.5px solid var(--border-subtle)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className={`badge ${
                        m.tipo === 'VENTA' ? 'badge-valido' :
                        m.tipo === 'COMISION' ? 'badge-categoria' :
                        m.tipo === 'LIQUIDACION' ? 'badge-completada' : 'badge-anulado'
                      }`} style={{ fontSize: '0.65rem' }}>
                        {m.tipo}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        ID #{m.id} · {new Date(m.fechaCreacion).toLocaleString('es-GT')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.88rem' }}>
                      {m.descripcion || `Movimiento de ${m.tipo}`}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: m.monto >= 0 ? 'var(--accent-emerald)' : 'var(--accent-vermilion)'
                    }}>
                      {m.monto >= 0 ? '+' : '-'}{formatMoney(Math.abs(m.monto), selectedCuentaParaMovimientos?.moneda || '')}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Saldo: {formatMoney(m.saldoPosterior, selectedCuentaParaMovimientos?.moneda || '')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <button onClick={() => setSelectedCuentaParaMovimientos(null)} className="btn btn-sm btn-outline">
              Cerrar Extracto
            </button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL LIQUIDAR CUENTA --- */}
      <Modal
        isOpen={!!selectedCuentaParaLiquidar}
        onClose={() => setSelectedCuentaParaLiquidar(null)}
        title="Registrar Liquidación al Dueño"
        maxWidth="460px"
      >
        <form onSubmit={handleLiquidar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Se emitirá un débito contable con clave idempotente hacia el promotor:{' '}
            <strong>{selectedCuentaParaLiquidar?.empresa || selectedCuentaParaLiquidar?.duenoNombre}</strong>.
          </p>

          <div style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '1.5px solid var(--border-strong)',
            padding: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem'
          }}>
            Saldo Disponible para Liquidación: <strong>{selectedCuentaParaLiquidar && formatMoney(selectedCuentaParaLiquidar.saldo, selectedCuentaParaLiquidar.moneda)}</strong>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Monto a Liquidar ({selectedCuentaParaLiquidar?.moneda}) *
            </label>
            <input
              type="number"
              step="0.01"
              min={0.01}
              max={selectedCuentaParaLiquidar?.saldo || 0}
              required
              value={montoLiquidar}
              onChange={(e) => setMontoLiquidar(Number(e.target.value))}
              className="input-base"
              style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', fontWeight: 800 }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={() => setSelectedCuentaParaLiquidar(null)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={liquidando} className="btn btn-primary" style={{ flex: 1 }}>
              {liquidando ? 'Liquidando...' : 'Confirmar Liquidación'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL REEMBOLSAR COMPRA --- */}
      <Modal
        isOpen={reembolsoModalOpen}
        onClose={() => setReembolsoModalOpen(false)}
        title="Reembolso Total de Pedido"
        maxWidth="480px"
      >
        <form onSubmit={handleReembolsarCompra} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Revierte atómicamente los movimientos contables originales, devuelve el cupo a la localidad y anula los boletos en estado VÁLIDO.
          </p>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Public ID o Referencia de Compra (UUID) *
            </label>
            <input
              type="text"
              required
              value={publicIdReembolso}
              onChange={(e) => setPublicIdReembolso(e.target.value)}
              className="input-base"
              placeholder="Ej: e7dc4e06-b6d3-44d2-9ace-8d797cf26f62"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={() => setReembolsoModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={reembolsando || !publicIdReembolso.trim()} className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--accent-vermilion)' }}>
              {reembolsando ? 'Procesando...' : 'Ejecutar Reembolso'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
