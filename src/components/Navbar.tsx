import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Ticket, 
  ShoppingBag, 
  QrCode, 
  ShieldCheck, 
  LogOut, 
  User, 
  CalendarDays,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
  onOpenJose: () => void;
  onOpenScanner: () => void;
  onOpenAuth: () => void;
  onOpenProfile?: () => void;
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
    location.pathname === '/' ||
    location.pathname.startsWith('/catalogo') ||
    location.pathname.startsWith('/eventos');
  const isBoletosActive = location.pathname.startsWith('/boletos');
  const isComprasActive = location.pathname.startsWith('/compras');
  const isAdminActive = location.pathname.startsWith('/admin');

  return (
    <header style={{ 
      backgroundColor: 'var(--bg-surface)', 
      borderBottom: '2px solid var(--border-strong)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Ticker banner superior */}
      <div className="ticker-wrap">
        <div className="ticker-content">
          ★ ASA PROMOTIONS & EVENTOS 2026 ★ BOLETERÍA CON FIRMA CRIPTOGRÁFICA HMAC ★ AGENTE PÚBLICO RAG JOSÉ DISPONIBLE 24/7 ★ SISTEMA ANTI-SOBREVENTA CON RESERVA ATÓMICA ★ COLA ASÍNCRONA RABBITMQ ★
        </div>
      </div>

      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '76px' }}>
        {/* Brand Logo - Brutalist Editorial Typography */}
        <div 
          onClick={() => navigate('/catalogo')} 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div style={{
            backgroundColor: 'var(--bg-inverse)',
            color: 'var(--text-inverse)',
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '1.4rem',
            padding: '4px 10px',
            border: '2px solid var(--border-strong)',
            boxShadow: 'var(--shadow-crisp-sm)',
            letterSpacing: '-0.04em'
          }}>
            ASA
          </div>
          <div>
            <div style={{ 
              fontFamily: 'var(--font-display)', 
              fontWeight: 800, 
              fontSize: '1.25rem', 
              letterSpacing: '-0.02em',
              lineHeight: 1
            }}>
              PROMOTORA
            </div>
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.65rem', 
              color: 'var(--text-secondary)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              Eventos · Deportes · Festivales
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate('/catalogo')}
            className={`btn btn-sm ${isCatalogoActive ? 'btn-inverse' : 'btn-outline'}`}
          >
            <CalendarDays size={16} />
            Catálogo
          </button>

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

          {(user?.rol === 'ADMINISTRADOR' || user?.rol === 'DUENO_RECINTO') && (
            <button
              onClick={onOpenScanner}
              className="btn btn-sm btn-outline"
              style={{ borderColor: 'var(--accent-emerald)', color: 'var(--accent-emerald)' }}
              title="Escáner de Boletos para Control de Ingreso"
            >
              <QrCode size={16} />
              Validar Acceso
            </button>
          )}

          {(user?.rol === 'ADMINISTRADOR' || user?.rol === 'DUENO_RECINTO') && (
            <button
              onClick={() => navigate('/admin/catalogo')}
              className={`btn btn-sm ${isAdminActive ? 'btn-inverse' : 'btn-outline'}`}
              style={{ borderColor: 'var(--accent-cobalt)', color: isAdminActive ? '#FFF' : 'var(--accent-cobalt)' }}
            >
              <ShieldCheck size={16} />
              Admin
            </button>
          )}
        </nav>

        {/* Actions & Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
