import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { UsuarioDetalleDto } from '../types/api';
import { Modal } from './common/Modal';
import { User, Mail, Phone, Calendar, Building, FileText, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioId: number;
  onOpenPasswordChange?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  usuarioId,
  onOpenPasswordChange,
}) => {
  const [perfil, setPerfil] = useState<UsuarioDetalleDto | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Form fields
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [nit, setNit] = useState('');

  useEffect(() => {
    if (isOpen && usuarioId) {
      cargarPerfil();
    }
  }, [isOpen, usuarioId]);

  const cargarPerfil = async () => {
    setCargando(true);
    setErrorMsg(null);
    setExitoMsg(null);
    try {
      const data = await api.getPerfil(usuarioId);
      setPerfil(data);
      setNombre(data.usuario.nombre || '');
      setApellido(data.usuario.apellido || '');
      setEmail(data.usuario.email || '');
      setTelefono(data.perfil?.telefono || '');
      setFechaNacimiento(data.perfil?.fechaNacimiento ? data.perfil.fechaNacimiento.split('T')[0] : '');
      setEmpresa(data.perfil?.empresa || '');
      setNit(data.perfil?.nit || '');
    } catch (err: any) {
      setErrorMsg(err.detail || err.title || 'No se pudo cargar la información del perfil.');
    } finally {
      setCargando(false);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setErrorMsg(null);
    setExitoMsg(null);

    try {
      const updated = await api.actualizarPerfil(usuarioId, {
        email,
        nombre,
        apellido,
        telefono: telefono || null,
        fechaNacimiento: fechaNacimiento || null,
        empresa: empresa || null,
        nit: nit || null,
      });
      setPerfil(updated);
      setExitoMsg('Perfil actualizado correctamente.');
    } catch (err: any) {
      setErrorMsg(err.detail || err.title || 'Error al actualizar el perfil.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      badge="IDENTIDAD & PERFIL"
      title="Mi Perfil de Usuario"
      subtitle="Consulta y edita los datos de tu cuenta personal en ASA Promotora"
      maxWidth="580px"
    >
      {cargando ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
          <p className="font-mono" style={{ fontSize: '0.85rem' }}>Cargando expediente de usuario...</p>
        </div>
      ) : (
        <form onSubmit={handleGuardar}>
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
              fontSize: '0.88rem'
            }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {exitoMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'var(--accent-emerald-soft)',
              color: 'var(--accent-emerald)',
              border: '1.5px solid var(--accent-emerald)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-xs)',
              marginBottom: '16px',
              fontSize: '0.88rem'
            }}>
              <CheckCircle2 size={18} />
              <span>{exitoMsg}</span>
            </div>
          )}

          {/* Tarjeta de Resumen Rápido de Estado */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            backgroundColor: 'var(--bg-canvas)',
            border: '2px solid var(--border-strong)',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-crisp-sm)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  ID USUARIO: #{perfil?.usuario.id}
                </span>
                <span className="badge" style={{
                  backgroundColor: perfil?.usuario.estado === 'ACTIVO' ? 'var(--accent-emerald-soft)' : 'var(--accent-vermilion-soft)',
                  color: perfil?.usuario.estado === 'ACTIVO' ? 'var(--accent-emerald)' : 'var(--accent-vermilion)',
                  border: '1px solid currentColor',
                  fontSize: '0.7rem'
                }}>
                  {perfil?.usuario.estado || 'ACTIVO'}
                </span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '2px' }}>
                {perfil?.usuario.nombre} {perfil?.usuario.apellido}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span className="badge badge-categoria" style={{ fontSize: '0.75rem' }}>
                {perfil?.usuario.rol}
              </span>
            </div>
          </div>

          {/* Formulario de Edición */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                NOMBRE
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '38px', width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                APELLIDO
              </label>
              <input
                type="text"
                required
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
              CORREO ELECTRÓNICO (LOGIN)
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                style={{ paddingLeft: '38px', width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                TELÉFONO
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  placeholder="502 1234 5678"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '38px', width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                FECHA NACIMIENTO
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '38px', width: '100%' }}
                />
              </div>
            </div>
          </div>

          {perfil?.usuario.rol === 'DUENO_RECINTO' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  EMPRESA / PROMOTORA
                </label>
                <div style={{ position: 'relative' }}>
                  <Building size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '38px', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  NIT DE FACTURACIÓN
                </label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={nit}
                    onChange={(e) => setNit(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '38px', width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Barra de Acciones */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '2px solid var(--border-subtle)',
            paddingTop: '20px',
            marginTop: '20px'
          }}>
            {onOpenPasswordChange ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPasswordChange();
                }}
                className="btn btn-sm btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <KeyRound size={15} />
                Cambiar Contraseña
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-sm btn-outline"
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-sm btn-primary"
                disabled={guardando}
                style={{ minWidth: '130px' }}
              >
                {guardando ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
