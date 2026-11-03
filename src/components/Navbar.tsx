import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  CalendarDays, 
  Ticket, 
  ShoppingBag, 
  QrCode, 
  ShieldCheck, 
  Sparkles, 
  User, 
  LogOut,
  Building2,
  DollarSign,
  Grid
} from 'lucide-react';

interface NavbarProps {
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
  onOpenJose: () => void;
  onOpenScanner: () => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenJose,
  onOpenScanner,
  onOpenAuth,
  onOpenProfile,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isCatalogoActive =
    (location.pathname === '/' ||
    location.pathname.startsWith('/catalogo') ||
    location.pathname.startsWith('/eventos')) &&
    !location.pathname.startsWith('/admin');

  const isBoletosActive = location.pathname.startsWith('/boletos');
  const isComprasActive = location.pathname.startsWith('/compras');

  const isRecintosActive = location.pathname.startsWith('/admin/recintos');
  const isEventosAdminActive = location.pathname.startsWith('/admin/eventos');
  const isAforoActive = location.pathname.startsWith('/admin/aforo') || location.pathname.startsWith('/admin/distribucion');
  const isFinanzasActive = location.pathname.startsWith('/admin/cuentas') || location.pathname.startsWith('/admin/finanzas');
  const isCatalogoAdminActive = location.pathname.startsWith('/admin/catalogo');
  const isAdminActive = location.pathname.startsWith('/admin');

  const rol = (user?.rol || '').toUpperCase();
  const isDueno = rol === 'DUENO_RECINTO';
  const isAdmin = rol === 'ADMINISTRADOR';
  const canManage = isDueno || isAdmin;

  return (
    <header style={{ 
      borderBottom: '2px solid var(--border-strong)',
      backgroundColor: 'var(--bg-canvas)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-crisp-sm)'
    }}>
      {/* Top Banner Ticker */}
      <div style={{
        backgroundColor: 'var(--bg-inverse)',
        color: 'var(--text-inverse)',
        fontSize: '0.72rem',
        fontFamily: 'var(--font-mono)',
        padding: '4px 0',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        borderBottom: '1px solid var(--border-strong)',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }}>
        <div className="ticker-text" style={{ display: 'inline-block', paddingLeft: '100%', animation: 'tickerScroll 24s linear infinite' }}>
          ★ ASA PROMOTIONS & EVENTOS 2026 ★ BOLETERÍA CON FIRMA CRIPTOGRÁFICA HMAC ★ AGENTE PÚBLICO RAG JOSÉ DISPONIBLE 24/7 ★ SISTEMA ANTI-SOBREVENTA CON RESERVA ATÓMICA ★ COLA ASÍNCRONA RABBITMQ ★
        </div>
      </div>

      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '76px', gap: '16px' }}>
        {/* Brand Logo - Brutalist Editorial Typography */}
        <div 
          onClick={() => navigate('/catalogo')} 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flexShrink: 0 }}
        >
          <div style={{
            backgroundColor: 'var(--bg-inverse)',
            color: 'var(--text-inverse)',
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            padding: '6px 12px',
            border: '2px solid var(--border-strong)',
            boxShadow: 'var(--shadow-crisp-sm)',
            transform: 'rotate(-1deg)'
          }}>
            ASA
          </div>
          <div>
            <div style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: '1.5rem', 
              letterSpacing: '-0.03em',
              lineHeight: 1 
            }}>
              PROMOTORA
            </div>
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.62rem', 
              color: 'var(--text-secondary)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase'
            }}>
              Eventos · Deportes · Festivales
            </div>
          </div>
        </div>

        {/* Navigation links según Rol */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/catalogo')}
            className={`btn btn-sm ${isCatalogoActive ? 'btn-inverse' : 'btn-outline'}`}
          >
            <CalendarDays size={16} />
            Catálogo
          </button>

          {/* Menú de Clientes (o visitantes) */}
          {!canManage && (
            <>
              <button
                onClick={() => navigate('/boletos')}
                className={`btn btn-sm ${isBoletosActive ? 'btn-inverse' : 'btn-outline'}`}
              >
                <Ticket size={16} />
                Mis Boletos
              </button>

              <button
                onClick={() => navigate('/compras')}
                className={`btn btn-sm ${isComprasActive ? 'btn-inverse' : 'btn-outline'}`}
              >
                <ShoppingBag size={16} />
                Mis Compras
              </button>
            </>
          )}

          {/* Menú de Dueño de Recinto */}
          {isDueno && (
            <>
              <button
                onClick={() => navigate('/admin/recintos')}
                className={`btn btn-sm ${isRecintosActive ? 'btn-inverse' : 'btn-outline'}`}
                style={{ 
                  borderColor: 'var(--accent-amber)', 
                  color: isRecintosActive ? '#FFF' : 'var(--text-primary)',
                  backgroundColor: isRecintosActive ? 'var(--bg-inverse)' : 'transparent'
                }}
                title="Gestión de recintos, planos arquitectónicos y trazado de localidades"
              >
                <Building2 size={16} color="var(--accent-amber)" />
                Mis Recintos
              </button>

              <button
                onClick={() => navigate('/admin/eventos')}
                className={`btn btn-sm ${isEventosAdminActive ? 'btn-inverse' : 'btn-outline'}`}
                title="Eventos asignados a mis recintos y tipos de entrada"
              >
                <CalendarDays size={16} />
                Mis Eventos
              </button>

              <button
                onClick={() => navigate('/admin/aforo')}
                className={`btn btn-sm ${isAforoActive ? 'btn-inverse' : 'btn-outline'}`}
                title="Gestión de silletería numerada y aforo por localidad"
              >
                <Grid size={16} />
                Aforo & Zonas
              </button>

              <button
                onClick={() => navigate('/admin/cuentas')}
                className={`btn btn-sm ${isFinanzasActive ? 'btn-inverse' : 'btn-outline'}`}
                title="Cuentas financieras y liquidaciones de mis recintos"
              >
                <DollarSign size={16} />
                Finanzas
              </button>
            </>
          )}

          {/* Menú de Administrador General */}
          {isAdmin && (
            <>
              <button
                onClick={() => navigate('/admin/catalogo')}
                className={`btn btn-sm ${isCatalogoAdminActive ? 'btn-inverse' : 'btn-outline'}`}
                style={{ borderColor: 'var(--accent-cobalt)', color: isCatalogoAdminActive ? '#FFF' : 'var(--text-primary)' }}
                title="Panel de Administración General"
              >
                <ShieldCheck size={16} color="var(--accent-cobalt)" />
                Panel Admin
              </button>

              <button
                onClick={() => navigate('/admin/eventos')}
                className={`btn btn-sm ${isEventosAdminActive ? 'btn-inverse' : 'btn-outline'}`}
                title="Gestión global de eventos y entradas"
              >
                <CalendarDays size={16} />
                Eventos
              </button>

              <button
                onClick={() => navigate('/admin/recintos')}
                className={`btn btn-sm ${isRecintosActive ? 'btn-inverse' : 'btn-outline'}`}
                title="Gestión de recintos y planos"
              >
                <Building2 size={16} />
                Recintos
              </button>

              <button
                onClick={() => navigate('/admin/cuentas')}
                className={`btn btn-sm ${isFinanzasActive ? 'btn-inverse' : 'btn-outline'}`}
                title="Cuentas del sistema y liquidaciones"
              >
                <DollarSign size={16} />
                Finanzas
              </button>
            </>
          )}

          {/* Botón común para administradores y dueños de recinto: Escáner QR de Ingreso */}
          {canManage && (
            <button
              onClick={onOpenScanner}
              className="btn btn-sm btn-outline"
              style={{ 
                borderColor: 'var(--accent-emerald)', 
                color: 'var(--accent-emerald)',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                fontWeight: 700
              }}
              title="Escáner de Boletos para Control de Ingreso"
            >
              <QrCode size={16} />
              Control de Acceso
            </button>
          )}
        </nav>

        {/* Actions & Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Asistente IA Botón */}
          <button
            onClick={onOpenJose}
            className="btn btn-sm btn-primary"
            style={{ 
              background: 'linear-gradient(135deg, #FF3B20 0%, #2142E8 100%)',
              color: '#FFFFFF',
              boxShadow: 'var(--shadow-crisp-sm)',
              position: 'relative'
            }}
          >
            <Sparkles size={16} />
            Preguntar a José
            <span style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#10B981',
              borderRadius: '50%',
              display: 'inline-block',
              marginLeft: '4px',
              boxShadow: '0 0 6px #10B981'
            }} />
          </button>

          {/* Auth Button / User Profile */}
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={onOpenProfile}
                className="btn btn-sm btn-outline"
                title="Ver y editar mi perfil de usuario"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--bg-canvas)'
                }}
              >
                <User size={14} />
                <span>{user.nombre?.trim() || user.email?.split('@')[0] || 'Mi Perfil'}</span>
                {isDueno && (
                  <span 
                    className="badge" 
                    style={{ 
                      fontSize: '0.62rem', 
                      padding: '2px 6px', 
                      backgroundColor: 'var(--accent-amber)', 
                      color: '#000',
                      border: '1px solid var(--border-strong)',
                      marginLeft: '2px',
                      fontWeight: 800
                    }}
                  >
                    RECINTO
                  </span>
                )}
                {isAdmin && (
                  <span 
                    className="badge" 
                    style={{ 
                      fontSize: '0.62rem', 
                      padding: '2px 6px', 
                      backgroundColor: 'var(--accent-scarlet)', 
                      color: '#FFF',
                      border: '1px solid var(--border-strong)',
                      marginLeft: '2px',
                      fontWeight: 800
                    }}
                  >
                    ADMIN
                  </span>
                )}
              </button>
              <button
                onClick={logout}
                className="btn btn-sm btn-outline"
                style={{ padding: '6px 8px' }}
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={onOpenAuth} className="btn btn-sm btn-inverse">
              <User size={16} />
              Iniciar Sesión
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
