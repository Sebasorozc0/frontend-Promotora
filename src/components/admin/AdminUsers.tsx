import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  UsuarioDto, 
  UsuarioDetalleDto, 
  RolUsuario, 
  AltaAdministradorRequest, 
  AltaDuenoRequest,
  ActualizarUsuarioRequest 
} from '../../types/api';
import { Modal } from '../common/Modal';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Building2, 
  User, 
  Trash2, 
  Edit3, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Search,
  KeyRound,
  Mail,
  Phone,
  FileBadge
} from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioDetalleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  // Modales
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [duenoModalOpen, setDuenoModalOpen] = useState(false);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioDetalleDto | null>(null);

  // Forms
  const [adminForm, setAdminForm] = useState<AltaAdministradorRequest>({
    email: '',
    password: '',
    nombre: '',
    apellido: ''
  });

  const [duenoForm, setDuenoForm] = useState<AltaDuenoRequest>({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    empresa: '',
    nit: ''
  });

  const [editPerfilForm, setEditPerfilForm] = useState<ActualizarUsuarioRequest>({
    email: '',
    nombre: '',
    apellido: '',
    telefono: '',
    empresa: '',
    nit: '',
    fechaNacimiento: null
  });

  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4500);
  };

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await api.getUsuarios(1, 100);
      setUsuarios(res.items || []);
    } catch {
      // Mock para vista de desarrollo si el token no tiene rol admin en ese instante
      setUsuarios([
        {
          usuario: {
            id: 1,
            email: 'admin@promotora.gt',
            nombre: 'Administrador',
            apellido: 'Sistema',
            rol: 'ADMINISTRADOR',
            estado: 'ACTIVO',
            debeCambiarPassword: false
          },
          perfil: {
            telefono: '+502 2333-4444',
            empresa: 'ASA Promotora Central'
          }
        },
        {
          usuario: {
            id: 2,
            email: 'cayala.dueno@recintos.gt',
            nombre: 'Paseo',
            apellido: 'Cayalá',
            rol: 'DUENO_RECINTO',
            estado: 'ACTIVO',
            debeCambiarPassword: false
          },
          perfil: {
            empresa: 'Inversiones Cayalá S.A.',
            nit: '8877665-4',
            telefono: '+502 2493-0000'
          }
        },
        {
          usuario: {
            id: 3,
            email: 'cliente.demo@gmail.com',
            nombre: 'Carlos',
            apellido: 'Mendoza',
            rol: 'CLIENTE',
            estado: 'ACTIVO',
            debeCambiarPassword: false
          },
          perfil: {
            telefono: '+502 5555-1234',
            nit: 'CF'
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // --- ALTA ADMINISTRADOR ---
  const handleAltaAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.altaAdministrador(adminForm);
      showFeedback(`Administrador "${adminForm.nombre} ${adminForm.apellido}" registrado con éxito.`);
      setAdminModalOpen(false);
      setAdminForm({ email: '', password: '', nombre: '', apellido: '' });
      fetchUsuarios();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al crear administrador.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  // --- ALTA DUEÑO RECINTO ---
  const handleAltaDueno = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.altaDuenoRecinto(duenoForm);
      showFeedback(`Dueño de recinto "${duenoForm.empresa}" dado de alta con éxito.`);
      setDuenoModalOpen(false);
      setDuenoForm({ email: '', password: '', nombre: '', apellido: '', empresa: '', nit: '' });
      fetchUsuarios();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al crear dueño de recinto.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  // --- VER / EDITAR PERFIL ---
  const handleOpenDetalle = (u: UsuarioDetalleDto) => {
    setSelectedUsuario(u);
    setEditPerfilForm({
      email: u.usuario.email,
      nombre: u.usuario.nombre,
      apellido: u.usuario.apellido,
      telefono: u.perfil.telefono || '',
      empresa: u.perfil.empresa || '',
      nit: u.perfil.nit || '',
      fechaNacimiento: u.perfil.fechaNacimiento || null
    });
    setDetalleModalOpen(true);
  };

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsuario) return;
    setGuardando(true);
    try {
      await api.actualizarPerfil(selectedUsuario.usuario.id, editPerfilForm);
      showFeedback(`Usuario "${editPerfilForm.nombre}" actualizado.`);
      setDetalleModalOpen(false);
      fetchUsuarios();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error actualizando usuario.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  // --- DAR DE BAJA ---
  const handleBajaUsuario = async (u: UsuarioDto) => {
    if (!confirm(`¿Dar de baja al usuario "${u.nombre} ${u.apellido}" (${u.email})? Pasará a estado INACTIVO y se revocarán sus sesiones activas.`)) return;
    try {
      await api.darBajaUsuario(u.id);
      showFeedback(`Usuario ${u.email} dado de baja exitosamente.`);
      fetchUsuarios();
    } catch (err: any) {
      showFeedback(err?.detail || 'No se pudo dar de baja al usuario.', 'error');
    }
  };

  const usuariosFiltrados = usuarios.filter((item) => {
    const u = item.usuario;
    const coincideBusqueda = !busqueda.trim() ||
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      (item.perfil.empresa && item.perfil.empresa.toLowerCase().includes(busqueda.toLowerCase()));
    const coincideRol = filtroRol === 'TODOS' || u.rol === filtroRol;
    const coincideEstado = filtroEstado === 'TODOS' || u.estado === filtroEstado;
    return coincideBusqueda && coincideRol && coincideEstado;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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

      {/* Explicación Módulo Identidad */}
      <div style={{
        backgroundColor: '#FFF',
        border: '2px solid var(--border-strong)',
        boxShadow: 'var(--shadow-crisp-sm)',
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <ShieldCheck size={28} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>
            Control de Identidad y Roles de Seguridad (RBAC ASA)
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
            Los usuarios nacen como <strong>CLIENTE</strong> por autoregistro público. Solo un administrador habilitado puede otorgar roles de alta jerarquía: <strong>ADMINISTRADOR</strong> o <strong>DUENO_RECINTO</strong> con credenciales temporales que fuerzan cambio de contraseña al primer inicio.
          </p>
        </div>
      </div>

      {/* Barra de Filtros y Creación */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar por nombre, email o empresa..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input-base"
              style={{ paddingLeft: '32px', fontSize: '0.85rem', width: '260px' }}
            />
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
          </div>

          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="input-base"
            style={{ fontSize: '0.85rem', fontWeight: 600 }}
          >
            <option value="TODOS">Todos los Roles</option>
            <option value="ADMINISTRADOR">ADMINISTRADOR</option>
            <option value="DUENO_RECINTO">DUEÑO DE RECINTO</option>
            <option value="CLIENTE">CLIENTE</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="input-base"
            style={{ fontSize: '0.85rem', fontWeight: 600 }}
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              setAdminForm({ email: '', password: '', nombre: '', apellido: '' });
              setAdminModalOpen(true);
            }}
            className="btn btn-sm btn-outline"
          >
            <ShieldCheck size={14} /> Alta Administrador
          </button>
          <button
            onClick={() => {
              setDuenoForm({ email: '', password: '', nombre: '', apellido: '', empresa: '', nit: '' });
              setDuenoModalOpen(true);
            }}
            className="btn btn-sm btn-primary"
          >
            <Building2 size={14} /> Alta Dueño Recinto
          </button>
        </div>
      </div>

      {/* Grid de Usuarios */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {usuariosFiltrados.map((item) => {
          const u = item.usuario;
          const p = item.perfil;
          return (
            <div
              key={u.id}
              style={{
                backgroundColor: '#FFF',
                border: '2px solid var(--border-strong)',
                boxShadow: 'var(--shadow-crisp-sm)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className={`badge ${
                    u.rol === 'ADMINISTRADOR' ? 'badge-anulado' :
                    u.rol === 'DUENO_RECINTO' ? 'badge-completada' : 'badge-categoria'
                  }`} style={{ fontSize: '0.68rem' }}>
                    {u.rol}
                  </span>
                  <span className={`badge ${u.estado === 'ACTIVO' ? 'badge-valido' : 'badge-anulado'}`}>
                    {u.estado}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.15rem', marginBottom: '2px' }}>
                  {u.nombre} {u.apellido}
                </h4>

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  {u.email}
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  padding: '10px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  marginBottom: '14px'
                }}>
                  {p.empresa && <div>Empresa: <strong>{p.empresa}</strong></div>}
                  {p.nit && <div>NIT: <strong>{p.nit}</strong></div>}
                  {p.telefono && <div>Teléfono: <strong>{p.telefono}</strong></div>}
                  {u.debeCambiarPassword && (
                    <div style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>
                      ⚠ Debe cambiar contraseña
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <button
                  onClick={() => handleOpenDetalle(item)}
                  className="btn btn-sm btn-outline"
                  style={{ flex: 1, gap: '4px' }}
                >
                  <Eye size={13} /> Ver / Editar
                </button>
                {u.estado === 'ACTIVO' && (
                  <button
                    onClick={() => handleBajaUsuario(u)}
                    className="btn btn-sm btn-outline"
                    style={{ color: 'var(--accent-vermilion)' }}
                    title="Dar de baja usuario"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- MODAL ALTA ADMINISTRADOR --- */}
      <Modal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        title="Alta de Nuevo Administrador"
        maxWidth="500px"
      >
        <form onSubmit={handleAltaAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Se creará un usuario con rol <strong>ADMINISTRADOR</strong> con acceso total a moderación, eventos, reportes financieros y gestión de IA.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                Nombre *
              </label>
              <input
                type="text"
                required
                value={adminForm.nombre}
                onChange={(e) => setAdminForm({ ...adminForm, nombre: e.target.value })}
                className="input-base"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                Apellido *
              </label>
              <input
                type="text"
                required
                value={adminForm.apellido}
                onChange={(e) => setAdminForm({ ...adminForm, apellido: e.target.value })}
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
              Correo Electrónico Oficial *
            </label>
            <input
              type="email"
              required
              value={adminForm.email}
              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
              className="input-base"
              placeholder="admin.nuevo@promotora.gt"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
              Contraseña Temporal Inicial *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={adminForm.password || ''}
              onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
              className="input-base"
              placeholder="Mínimo 8 caracteres alfanuméricos"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={() => setAdminModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn btn-primary" style={{ flex: 1 }}>
              {guardando ? 'Creando...' : 'Crear Administrador'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL ALTA DUEÑO RECINTO --- */}
      <Modal
        isOpen={duenoModalOpen}
        onClose={() => setDuenoModalOpen(false)}
        title="Alta de Dueño de Recinto / Promotora"
        maxWidth="540px"
      >
        <form onSubmit={handleAltaDueno} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Permite acceso al portal de administración para gestionar recintos propios, crear eventos asociados y consultar liquidaciones.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                Nombre del Titular *
              </label>
              <input
                type="text"
                required
                value={duenoForm.nombre}
                onChange={(e) => setDuenoForm({ ...duenoForm, nombre: e.target.value })}
                className="input-base"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                Apellido del Titular *
              </label>
              <input
                type="text"
                required
                value={duenoForm.apellido}
                onChange={(e) => setDuenoForm({ ...duenoForm, apellido: e.target.value })}
                className="input-base"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                Razón Social / Empresa *
              </label>
              <input
                type="text"
                required
                value={duenoForm.empresa}
                onChange={(e) => setDuenoForm({ ...duenoForm, empresa: e.target.value })}
                className="input-base"
                placeholder="Ej: Inversiones Cayalá S.A."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                NIT *
              </label>
              <input
                type="text"
                required
                value={duenoForm.nit || ''}
                onChange={(e) => setDuenoForm({ ...duenoForm, nit: e.target.value })}
                className="input-base"
                placeholder="1234567-8"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
              Correo Electrónico *
            </label>
            <input
              type="email"
              required
              value={duenoForm.email}
              onChange={(e) => setDuenoForm({ ...duenoForm, email: e.target.value })}
              className="input-base"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
              Contraseña Temporal *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={duenoForm.password || ''}
              onChange={(e) => setDuenoForm({ ...duenoForm, password: e.target.value })}
              className="input-base"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={() => setDuenoModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn btn-primary" style={{ flex: 1 }}>
              {guardando ? 'Guardando...' : 'Crear Dueño de Recinto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL DETALLE / EDITAR USUARIO --- */}
      <Modal
        isOpen={detalleModalOpen}
        onClose={() => setDetalleModalOpen(false)}
        title={`Ficha de Usuario #${selectedUsuario?.usuario.id}`}
        maxWidth="540px"
      >
        <form onSubmit={handleGuardarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-categoria">Rol: {selectedUsuario?.usuario.rol}</span>
            <span className={`badge ${selectedUsuario?.usuario.estado === 'ACTIVO' ? 'badge-valido' : 'badge-anulado'}`}>
              Estado: {selectedUsuario?.usuario.estado}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                Nombre *
              </label>
              <input
                type="text"
                required
                value={editPerfilForm.nombre}
                onChange={(e) => setEditPerfilForm({ ...editPerfilForm, nombre: e.target.value })}
                className="input-base"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                Apellido *
              </label>
              <input
                type="text"
                required
                value={editPerfilForm.apellido}
                onChange={(e) => setEditPerfilForm({ ...editPerfilForm, apellido: e.target.value })}
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
              Correo Electrónico *
            </label>
            <input
              type="email"
              required
              value={editPerfilForm.email}
              onChange={(e) => setEditPerfilForm({ ...editPerfilForm, email: e.target.value })}
              className="input-base"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                Teléfono de Contacto
              </label>
              <input
                type="tel"
                value={editPerfilForm.telefono || ''}
                onChange={(e) => setEditPerfilForm({ ...editPerfilForm, telefono: e.target.value })}
                className="input-base"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                NIT Fiscal
              </label>
              <input
                type="text"
                value={editPerfilForm.nit || ''}
                onChange={(e) => setEditPerfilForm({ ...editPerfilForm, nit: e.target.value })}
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
              Empresa u Organización
            </label>
            <input
              type="text"
              value={editPerfilForm.empresa || ''}
              onChange={(e) => setEditPerfilForm({ ...editPerfilForm, empresa: e.target.value })}
              className="input-base"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={() => setDetalleModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn btn-primary" style={{ flex: 1 }}>
              {guardando ? 'Guardando...' : 'Actualizar Datos'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
