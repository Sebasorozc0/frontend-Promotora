import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Tag, Calendar, DollarSign, MessageSquare, Brain, Grid, Users, MapPin } from 'lucide-react';
import { VenueMapEditor } from './VenueMapEditor';
import { AdminCatalog } from './admin/AdminCatalog';
import { AdminEvents } from './admin/AdminEvents';
import { AdminFinance } from './admin/AdminFinance';
import { AdminReviews } from './admin/AdminReviews';
import { AdminRag } from './admin/AdminRag';
import { AdminSeating } from './admin/AdminSeating';
import { AdminUsers } from './admin/AdminUsers';

type AdminTabKey = 'CATALOGO' | 'RECINTOS' | 'MODERACION' | 'RAG' | 'EVENTOS' | 'FINANZAS' | 'DISTRIBUCION' | 'USUARIOS';

export const AdminPanel: React.FC = () => {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

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

  const tabAdmin: AdminTabKey = (tab && tabMap[tab.toLowerCase()]) ? tabMap[tab.toLowerCase()] : 'CATALOGO';

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
          <span className="badge badge-categoria" style={{ marginBottom: '6px' }}>
            PANEL DE ADMINISTRACIÓN Y CONTROL
          </span>
          <h2 style={{ fontSize: '2rem' }}>Centro de Operaciones ASA</h2>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleSelectTab('CATALOGO')}
            className={`btn btn-sm ${tabAdmin === 'CATALOGO' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <Tag size={14} />
            Categorías & Artistas
          </button>
          <button
            onClick={() => handleSelectTab('EVENTOS')}
            className={`btn btn-sm ${tabAdmin === 'EVENTOS' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <Calendar size={14} />
            Eventos & Entradas
          </button>
          <button
            onClick={() => handleSelectTab('RECINTOS')}
            className={`btn btn-sm ${tabAdmin === 'RECINTOS' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <MapPin size={14} />
            Recintos & Planos
          </button>
          <button
            onClick={() => handleSelectTab('DISTRIBUCION')}
            className={`btn btn-sm ${tabAdmin === 'DISTRIBUCION' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <Grid size={14} />
            Silletería Numerada
          </button>
          <button
            onClick={() => handleSelectTab('FINANZAS')}
            className={`btn btn-sm ${tabAdmin === 'FINANZAS' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <DollarSign size={14} />
            Cuentas & Liquidación
          </button>
          <button
            onClick={() => handleSelectTab('MODERACION')}
            className={`btn btn-sm ${tabAdmin === 'MODERACION' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <MessageSquare size={14} />
            Moderación de Reseñas
          </button>
          <button
            onClick={() => handleSelectTab('RAG')}
            className={`btn btn-sm ${tabAdmin === 'RAG' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <Brain size={14} />
            Documentos RAG José
          </button>
          <button
            onClick={() => handleSelectTab('USUARIOS')}
            className={`btn btn-sm ${tabAdmin === 'USUARIOS' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <Users size={14} />
            Usuarios & Roles
          </button>
        </div>
      </div>

      {/* Tab: Categorías y Presentadores */}
      {tabAdmin === 'CATALOGO' && <AdminCatalog />}

      {/* Tab: Eventos Activos */}
      {tabAdmin === 'EVENTOS' && <AdminEvents />}

      {/* Tab: Recintos y Mapas de Localidades */}
      {tabAdmin === 'RECINTOS' && <VenueMapEditor />}

      {/* Tab: Silletería y Distribución Numerada */}
      {tabAdmin === 'DISTRIBUCION' && <AdminSeating />}

      {/* Tab: Finanzas & Liquidación */}
      {tabAdmin === 'FINANZAS' && <AdminFinance />}

      {/* Tab: Moderación de Reseñas */}
      {tabAdmin === 'MODERACION' && <AdminReviews />}

      {/* Tab: Documentos RAG */}
      {tabAdmin === 'RAG' && <AdminRag />}

      {/* Tab: Usuarios y Roles */}
      {tabAdmin === 'USUARIOS' && <AdminUsers />}

    </div>
  );
};
