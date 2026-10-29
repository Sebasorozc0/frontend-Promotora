import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';

export const PasswordChangeModal: React.FC = () => {
  const { debeCambiarPassword, cambiarPassword, logout } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!debeCambiarPassword) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nueva !== confirmacion) {
      setErrorMsg('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (nueva.length < 8) {
      setErrorMsg('La contraseña nueva debe tener al menos 8 caracteres.');
      return;
    }

    setCargando(true);
    setErrorMsg(null);

    try {
      await cambiarPassword(actual, nueva);
    } catch (err: any) {
      setErrorMsg(err.detail || 'Error al actualizar la contraseña obligatoria.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '2px solid var(--border-strong)',
          backgroundColor: 'var(--accent-amber-soft)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <ShieldAlert size={22} color="var(--accent-amber)" />
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-amber)' }}>Cambio de Contraseña Obligatorio</h3>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
              Requisito de seguridad en el primer acceso
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Por políticas de protección criptográfica del sistema, debes actualizar tu contraseña antes de continuar operando.
          </p>

          {errorMsg && (
            <div style={{
              backgroundColor: 'var(--accent-vermilion-soft)',
              color: 'var(--accent-vermilion)',
              border: '1.5px solid var(--accent-vermilion)',
              padding: '10px',
              fontSize: '0.85rem',
              marginBottom: '14px'
            }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Contraseña Temporal Actual *
            </label>
            <input
              type="password"
              required
              className="input-brutal"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Nueva Contraseña Segura *
            </label>
            <input
              type="password"
              required
              className="input-brutal"
              placeholder="Mínimo 8 caracteres"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Confirmar Nueva Contraseña *
            </label>
            <input
              type="password"
              required
              className="input-brutal"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={logout}
              className="btn btn-outline"
              style={{ flex: 1 }}
            >
              Cerrar Sesión
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="btn btn-primary"
              style={{ flex: 2 }}
            >
              {cargando ? <Loader2 size={18} className="spin" /> : 'Actualizar y Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
