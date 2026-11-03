import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User, Phone, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, registro } = useAuth();
  const [esRegistro, setEsRegistro] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Campos de registro
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [dpi, setDpi] = useState('');

  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setErrorMsg(null);

    try {
      if (esRegistro) {
        await registro({ nombre, apellido, email, password, telefono, dpi });
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.detail || err.title || 'Error al autenticar. Verifica tus credenciales.');
    } finally {
      setCargando(false);
    }
  };

  const handleDemoFill = (tipo: 'admin' | 'dueno' | 'cliente') => {
    if (tipo === 'admin') {
      setEmail('admin@promotora.gt');
      setPassword('AdminSeguro2026!');
    } else if (tipo === 'dueno') {
      setEmail('dueno.cayala@promotora.gt');
      setPassword('DuenoCayala2026!');
    } else {
      setEmail('carlos.mendoza@ejemplo.com');
      setPassword('ClientePass2026!');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div 
        className="modal-content"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '2px solid var(--border-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-canvas)'
        }}>
          <div>
            <span className="badge badge-categoria" style={{ marginBottom: '6px' }}>
              SEGURIDAD & AUTENTICACIÓN
            </span>
            <h2 style={{ fontSize: '1.35rem' }}>
              {esRegistro ? 'Crear Cuenta de Cliente' : 'Iniciar Sesión'}
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-outline" style={{ padding: '6px 10px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'var(--accent-vermilion-soft)',
              color: 'var(--accent-vermilion)',
              border: '1.5px solid var(--accent-vermilion)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-xs)',
              marginBottom: '16px',
              fontSize: '0.85rem'
            }}>
              <AlertCircle size={16} />
              <div>{errorMsg}</div>
            </div>
          )}

          {esRegistro && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-brutal"
                    placeholder="Carlos"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-brutal"
                    placeholder="Mendoza"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    DPI *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-brutal"
                    placeholder="2501 99281 0101"
                    value={dpi}
                    onChange={(e) => setDpi(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    className="input-brutal"
                    placeholder="+502 5555 4321"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Correo Electrónico *
            </label>
            <input
              type="email"
              required
              className="input-brutal"
              placeholder="tu.correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Contraseña *
            </label>
            <input
              type="password"
              required
              minLength={8}
              className="input-brutal"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '16px' }}
          >
            {cargando ? <Loader2 size={18} className="spin" /> : esRegistro ? 'Registrarme' : 'Entrar a mi Cuenta'}
          </button>

          {/* Quick Demo Accounts */}
          <div style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '1.5px dashed var(--border-medium)',
            padding: '12px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              CREDENCIALES DE PRUEBA RÁPIDA:
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleDemoFill('cliente')}
                className="btn btn-sm btn-outline"
                style={{ fontSize: '0.68rem', padding: '4px 8px', backgroundColor: '#FFF' }}
              >
                Cliente
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('dueno')}
                className="btn btn-sm btn-outline"
                style={{ fontSize: '0.68rem', padding: '4px 8px', backgroundColor: '#FFF' }}
              >
                Dueño Recinto
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('admin')}
                className="btn btn-sm btn-outline"
                style={{ fontSize: '0.68rem', padding: '4px 8px', backgroundColor: '#FFF' }}
              >
                Admin
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setEsRegistro(!esRegistro);
                setErrorMsg(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: 'var(--accent-cobalt)',
                cursor: 'pointer',
                fontWeight: 700,
                textDecoration: 'underline'
              }}
            >
              {esRegistro ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿Aún no tienes cuenta? Regístrate gratis'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
