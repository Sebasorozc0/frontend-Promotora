import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Tag, 
  Calendar, 
  DollarSign, 
  MessageSquare, 
  Brain, 
  Grid, 
  Users, 
  MapPin, 
  Building2, 
  ShieldAlert 
} from 'lucide-react';
import { VenueMapEditor } from './VenueMapEditor';
import { AdminCatalog } from './admin/AdminCatalog';
import { AdminEvents } from './admin/AdminEvents';
import { AdminFinance } from './admin/AdminFinance';
import { AdminReviews } from './admin/AdminReviews';
import { AdminRag } from './admin/AdminRag';
import { AdminSeating } from './admin/AdminSeating';
import { AdminUsers } from './admin/AdminUsers';

type AdminTabKey = 'CATALOGO' | 'RECINTOS' | 'MODERACION' | 'RAG' | 'EVENTOS' | 'FINANZAS' | 'DISTRIBUCION' | 'USUARIOS';

const DUENO_ALLOWED_TABS: AdminTabKey[] = ['RECINTOS', 'DISTRIBUCION', 'FINANZAS', 'EVENTOS'];

export const AdminPanel: React.FC = () => {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const { user, isLoading, debeCambiarPassword } = useAuth();

  const rol = (user?.rol || '').toUpperCase();
  const isDueno = rol === 'DUENO_RECINTO';
  const isAdmin = rol === 'ADMINISTRADOR';

  const tabMap: Record<string, AdminTabKey> = {
    catalogo: 'CATALOGO',
    eventos: 'EVENTOS',
    recintos: 'RECINTOS',
    distribucion: 'DISTRIBUCION',
    finanzas: 'FINANZAS',
    moderacion: 'MODERACION',
    rag: 'RAG',
    usuarios: 'USUARIOS',
  };

  const defaultTab: AdminTabKey = isDueno ? 'RECINTOS' : 'CATALOGO';
  const tabAdmin: AdminTabKey = (tab && tabMap[tab.toLowerCase()]) ? tabMap[tab.toLowerCase()] : defaultTab;

  // Redirigir si el dueño intenta acceder a una pestaña restringida de Superadmin
  useEffect(() => {
    if (isDueno && !DUENO_ALLOWED_TABS.includes(tabAdmin)) {
      navigate('/admin/recintos', { replace: true });
    }
  }, [isDueno, tabAdmin, navigate]);

  if (isLoading) return <p role="status" className="container">Cargando sesión…</p>;
  if (debeCambiarPassword) return <p role="status" className="container">Completa el cambio obligatorio de contraseña para continuar.</p>;

  // Si no tiene privilegios administrativos o de recinto, denegar acceso
  if (!isAdmin && !isDueno) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{
          maxWidth: '520px',
          margin: '0 auto',
          padding: '36px',
          border: '2px solid var(--border-strong)',
          backgroundColor: 'var(--bg-canvas)',
          boxShadow: 'var(--shadow-crisp-md)'
        }}>
          <ShieldAlert size={48} style={{ color: 'var(--accent-scarlet)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.75rem', marginBottom: '12px' }}>Acceso Restringido</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
            Este módulo requiere permisos de Administrador o Dueño de Recinto registrado.
          </p>
          <button onClick={() => navigate('/catalogo')} className="btn btn-inverse">
            Volver al Catálogo
          </button>
        </div>
      </div>
    );
  }

  const handleSelectTab = (newTab: AdminTabKey) => {
    navigate(`/admin/${newTab.toLowerCase()}`);
  };

  return (
    <div className="container" style={{ padding: '40px 24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid var(--border-strong)',
        paddingBottom: '20px',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <span 
            className="badge" 
            style={{ 
              marginBottom: '6px',
              backgroundColor: isDueno ? 'var(--accent-amber)' : 'var(--accent-cobalt)',
              color: isDueno ? '#000' : '#FFF',
              border: '1px solid var(--border-strong)'
            }}
          >
            {isDueno ? 'DUEÑO DE RECINTO · GESTIÓN LOCAL' : 'PANEL DE ADMINISTRACIÓN GENERAL'}
          </span>
          <h2 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isDueno && <Building2 size={28} />}
            {isDueno ? 'Portal de Operaciones de Recinto' : 'Centro de Operaciones ASA'}
          </h2>
          {isDueno && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Gestión de recintos, silletería numerada, liquidaciones financieras y eventos asociados.
            </p>
          )}
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Categorías: Solo Admin */}
          {!isDueno && (
            <button
              onClick={() => handleSelectTab('CATALOGO')}
              className={`btn btn-sm ${tabAdmin === 'CATALOGO' ? 'btn-inverse' : 'btn-outline'}`}
              style={{ gap: '6px' }}
            >
              <Tag size={14} />
              Categorías & Artistas
            </button>
          )}

          {/* Recintos & Planos: Ambos */}
          <button
            onClick={() => handleSelectTab('RECINTOS')}
            className={`btn btn-sm ${tabAdmin === 'RECINTOS' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <MapPin size={14} />
            Recintos & Planos
          </button>

          {/* Silletería Numerada: Ambos */}
          <button
            onClick={() => handleSelectTab('DISTRIBUCION')}
            className={`btn btn-sm ${tabAdmin === 'DISTRIBUCION' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <Grid size={14} />
            Silletería Numerada
          </button>

          {/* Finanzas & Liquidación: Ambos */}
          <button
            onClick={() => handleSelectTab('FINANZAS')}
            className={`btn btn-sm ${tabAdmin === 'FINANZAS' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <DollarSign size={14} />
            Cuentas & Liquidación
          </button>

          {/* Eventos: Ambos */}
          <button
            onClick={() => handleSelectTab('EVENTOS')}
            className={`btn btn-sm ${tabAdmin === 'EVENTOS' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <Calendar size={14} />
            Eventos & Entradas
          </button>

          {/* Moderación: Solo Admin */}
          {!isDueno && (
            <button
              onClick={() => handleSelectTab('MODERACION')}
              className={`btn btn-sm ${tabAdmin === 'MODERACION' ? 'btn-inverse' : 'btn-outline'}`}
              style={{ gap: '6px' }}
            >
              <MessageSquare size={14} />
              Moderación Reseñas
            </button>
          )}

          {/* RAG: Solo Admin */}
          {!isDueno && (
            <button
              onClick={() => handleSelectTab('RAG')}
              className={`btn btn-sm ${tabAdmin === 'RAG' ? 'btn-inverse' : 'btn-outline'}`}
              style={{ gap: '6px' }}
            >
              <Brain size={14} />
              Documentos RAG
            </button>
          )}

          {/* Usuarios: Solo Admin */}
          {!isDueno && (
            <button
              onClick={() => handleSelectTab('USUARIOS')}
              className={`btn btn-sm ${tabAdmin === 'USUARIOS' ? 'btn-inverse' : 'btn-outline'}`}
              style={{ gap: '6px' }}
            >
              <Users size={14} />
              Usuarios & Roles
            </button>
          )}
        </div>
      </div>

      {/* Tab: Categorías y Presentadores */}
      {tabAdmin === 'CATALOGO' && !isDueno && <AdminCatalog />}

      {/* Tab: Recintos y Mapas de Localidades */}
      {tabAdmin === 'RECINTOS' && <VenueMapEditor />}

      {/* Tab: Silletería y Distribución Numerada */}
      {tabAdmin === 'DISTRIBUCION' && <AdminSeating />}

      {/* Tab: Finanzas & Liquidación */}
      {tabAdmin === 'FINANZAS' && <AdminFinance />}

      {/* Tab: Eventos Activos */}
      {tabAdmin === 'EVENTOS' && <AdminEvents />}

      {/* Tab: Moderación de Reseñas */}
      {tabAdmin === 'MODERACION' && !isDueno && <AdminReviews />}

      {/* Tab: Documentos RAG */}
      {tabAdmin === 'RAG' && !isDueno && <AdminRag />}

      {/* Tab: Usuarios y Roles */}
      {tabAdmin === 'USUARIOS' && !isDueno && <AdminUsers />}
    </div>
  );
};
