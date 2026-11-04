import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldAlert, Loader2, CheckCircle2, X } from 'lucide-react';

interface PasswordChangeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onClose }) => {
  const { debeCambiarPassword, cambiarPassword, logout } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  const esVisible = debeCambiarPassword || !!isOpen;
  if (!esVisible) return null;

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
    setExitoMsg(null);

    try {
      await cambiarPassword(actual, nueva);
      setExitoMsg('Contraseña actualizada exitosamente.');
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.detail || 'Error al actualizar la contraseña.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(18, 19, 22, 0.72)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '16px',
      }}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '2px solid var(--border-strong)',
          backgroundColor: 'var(--accent-amber-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={22} color="var(--accent-amber)" />
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>
                {debeCambiarPassword ? 'Cambio Obligatorio de Contraseña' : 'Cambiar Contraseña'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {debeCambiarPassword ? 'Primer inicio de sesión detectado' : 'Seguridad de la cuenta'}
              </p>
            </div>
          </div>
          {onClose && !debeCambiarPassword && (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm btn-outline"
              style={{ padding: '4px 8px' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {errorMsg && (
            <div style={{
              backgroundColor: 'var(--accent-vermilion-soft)',
              color: 'var(--accent-vermilion)',
              border: '1px solid var(--accent-vermilion)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-xs)',
              marginBottom: '16px',
              fontSize: '0.85rem'
            }}>
              {errorMsg}
            </div>
          )}

          {exitoMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--accent-emerald-soft)',
              color: 'var(--accent-emerald)',
              border: '1px solid var(--accent-emerald)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-xs)',
              marginBottom: '16px',
              fontSize: '0.85rem'
            }}>
              <CheckCircle2 size={16} />
              {exitoMsg}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
              CONTRASEÑA ACTUAL
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                className="input"
                style={{ paddingLeft: '38px', width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
              NUEVA CONTRASEÑA
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required minLength={8}
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                className="input"
                style={{ paddingLeft: '38px', width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
              CONFIRMAR NUEVA CONTRASEÑA
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required minLength={8}
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                className="input"
                style={{ paddingLeft: '38px', width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {debeCambiarPassword ? (
              <button
                type="button"
                onClick={logout}
                className="btn btn-outline"
                style={{ width: '45%' }}
              >
                Cerrar Sesión
              </button>
            ) : onClose && (
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {cargando ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Actualizando...
                </>
              ) : (
                'Establecer Contraseña'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
