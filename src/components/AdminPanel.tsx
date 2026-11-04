import { NavLink, Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { VenueMapEditor } from './VenueMapEditor';
import { AdminCatalog } from './admin/AdminCatalog';
import { AdminEvents } from './admin/AdminEvents';
import { AdminFinance } from './admin/AdminFinance';
import { AdminReviews } from './admin/AdminReviews';
import { AdminRag } from './admin/AdminRag';
import { AdminSeating } from './admin/AdminSeating';
import { AdminUsers } from './admin/AdminUsers';
import { AdminReports } from './admin/AdminReports';
import { EventWizard } from './admin/EventWizard';

export function AdminPanel() {
  const { tab = 'inicio' } = useParams(); const { user } = useAuth(); const location = useLocation();
  const owner = user?.rol === 'DUENO_RECINTO';
  if (!user || !['ADMINISTRADOR','DUENO_RECINTO'].includes(user.rol)) return <div className="container notice"><h2>Área de gestión</h2><p>Esta área es exclusiva de administradores y dueños de recinto. Utiliza tu cuenta para ingresar.</p><NavLink className="btn btn-outline" to="/catalogo">Volver a eventos</NavLink></div>;
  const base = owner ? '/dueno' : '/gestion';
  if (!location.pathname.startsWith(base)) return <Navigate replace to={base + '/' + tab} />;
  const common = [['inicio','Inicio'],['eventos','Mis eventos'],['recintos','Recintos y localidades'],['distribucion','Sillas y mesas'],['catalogo',owner ? 'Artistas del evento' : 'Categorías y artistas'],['finanzas',owner ? 'Mis cuentas' : 'Cuentas y reembolsos']];
  const entries = owner ? common : [...common,['moderacion','Moderar reseñas'],['rag','Documentos de José'],['reportes','Reportes'],['usuarios','Usuarios y roles']];
  if (tab !== 'nuevo-evento' && !entries.some(([key]) => key === tab)) return <Navigate replace to={base} />;
  const render = () => {
    switch (tab) {
      case 'nuevo-evento': return <EventWizard />;
      case 'eventos': return <AdminEvents />;
      case 'recintos': return <VenueMapEditor />;
      case 'distribucion': return <AdminSeating />;
      case 'catalogo': return <AdminCatalog />;
      case 'finanzas': return <AdminFinance />;
      case 'moderacion': return <AdminReviews />;
      case 'rag': return <AdminRag />;
      case 'reportes': return <AdminReports />;
      case 'usuarios': return <AdminUsers />;
      default: return <><div className="welcome-panel"><span className="eyebrow">{owner ? 'TU ESPACIO DE TRABAJO' : 'CENTRO DE OPERACIONES'}</span><h1>{owner ? 'Organiza tu recinto, prepara tus eventos.' : 'Todo listo para tu próximo evento.'}</h1><p>Crea el evento paso a paso. Primero define dónde y cuándo será; después configura entradas, sillas y mesas y revisa antes de ponerlo en venta.</p><NavLink to={base + '/nuevo-evento'} className="btn btn-primary">+ Crear un evento paso a paso</NavLink></div><div className="workflow-cards">{[['01','Prepara el recinto','Crea el lugar, sube el plano y define sus localidades.','recintos'],['02','Crea el evento','Fecha, imagen, precios y cupos en un solo recorrido.','nuevo-evento'],['03','Ordena sillas y mesas','Genera filas o mesas con sus sillas automáticamente.','distribucion'],['04','Gestiona las ventas','Consulta tus cuentas y movimientos reales.','finanzas']].map(([number,title,text,route]) => <NavLink to={base + '/' + route} className="workflow-card" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p><strong>Comenzar →</strong></NavLink>)}</div></>;
    }
  };
  return <div className={'management-layout ' + (owner ? 'owner-portal' : 'admin-portal')}><aside className="management-sidebar"><span className="eyebrow">{owner ? 'DUEÑO DE RECINTO' : 'ADMINISTRADOR'}</span><h2>{owner ? 'Mi espacio' : 'Gestión ASA'}</h2><NavLink className="btn btn-primary" to={base + '/nuevo-evento'}>+ Crear evento</NavLink><nav aria-label="Secciones de gestión">{entries.map(([key,label]) => <NavLink key={key} to={base + (key === 'inicio' ? '' : '/' + key)} end className={tab === key ? 'selected' : ''}>{label}</NavLink>)}</nav><p>{owner ? 'Solo gestionas tus recintos, eventos y cuentas.' : 'Gestiona la operación general de la promotora.'}</p></aside><div className="management-content"><div className="management-breadcrumb">{owner ? 'Mi recinto' : 'Administración'} / {tab === 'nuevo-evento' ? 'Crear evento' : entries.find(([key]) => key === tab)?.[1]}</div>{render()}</div></div>;
}
