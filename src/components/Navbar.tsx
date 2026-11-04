import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, Ticket, ShoppingBag, Sparkles, User, LogOut, LayoutDashboard, QrCode } from 'lucide-react';

interface NavbarProps { onOpenJose: () => void; onOpenScanner: () => void; onOpenAuth: () => void; onOpenProfile: () => void; }
export function Navbar({ onOpenJose, onOpenScanner, onOpenAuth, onOpenProfile }: NavbarProps) {
  const { user, logout } = useAuth();
  const location = useLocation(); const navigate = useNavigate();
  const manager = user?.rol === 'ADMINISTRADOR' || user?.rol === 'DUENO_RECINTO';
  const portal = user?.rol === 'DUENO_RECINTO' ? '/dueno' : '/gestion';
  const managing = /^\/(gestion|dueno|admin)(\/|$)/.test(location.pathname);
  const link = ({ isActive }: { isActive: boolean }) => 'btn btn-sm ' + (isActive ? 'btn-inverse' : 'btn-outline');
  return <header className={'site-header ' + (managing ? 'management-header' : '')}>
    <div className="site-topline">{managing ? user?.rol === 'DUENO_RECINTO' ? 'PORTAL DEL DUEÑO · TUS RECINTOS Y EVENTOS' : 'ADMINISTRACIÓN · GESTIÓN DE LA PROMOTORA' : 'ASA PROMOTORA · EXPERIENCIAS QUE SE VIVEN'}</div>
    <div className="container site-nav">
      <NavLink to={managing ? portal : '/catalogo'} className="brand"><span>ASA</span><div>PROMOTORA<small>{managing ? 'Centro de gestión' : 'Encuentra tu próximo evento'}</small></div></NavLink>
      <nav aria-label="Navegación principal" className="primary-nav">
        {!managing && <><NavLink to="/catalogo" className={link}><CalendarDays size={16} /> Eventos</NavLink>{user?.rol === 'CLIENTE' && <><NavLink to="/boletos" className={link}><Ticket size={16} /> Mis boletos</NavLink><NavLink to="/compras" className={link}><ShoppingBag size={16} /> Mis compras</NavLink><NavLink to="/resenas" className={link}>Mis reseñas</NavLink></>}</>}
        {manager && <><NavLink to={portal} className={link}><LayoutDashboard size={16} /> {user?.rol === 'DUENO_RECINTO' ? 'Mi recinto' : 'Administración'}</NavLink>{managing && <button className="btn btn-sm btn-outline" onClick={() => navigate('/catalogo')}>Ver cartelera pública ↗</button>}</>}
      </nav>
      <div className="nav-actions">{managing ? <button className="btn btn-sm btn-outline" onClick={onOpenScanner}><QrCode size={16} /> Validar entradas</button> : <button className="btn btn-sm btn-primary" onClick={onOpenJose}><Sparkles size={16} /> José</button>}
        {user ? <><button className="btn btn-sm btn-outline profile-button" onClick={onOpenProfile}><User size={16} /><span>{user.nombre}</span></button><button className="btn btn-sm btn-outline" title="Cerrar sesión" onClick={async () => { await logout(); navigate('/catalogo'); }}><LogOut size={16} /></button></> : <button className="btn btn-sm btn-inverse" onClick={onOpenAuth}>Ingresar / Registrarme</button>}
      </div>
    </div>
  </header>;
}
