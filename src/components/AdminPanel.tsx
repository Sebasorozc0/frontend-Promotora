import React, { useState } from 'react';
import { MOCK_RESENAS, MOCK_EVENTOS } from '../api/client';
import { ResenaPublica } from '../types/api';
import { ShieldCheck, Check, X, FileText, Upload, RefreshCw, MapPin, Tag, Calendar, DollarSign, MessageSquare, Brain, Grid, Users } from 'lucide-react';
import { VenueMapEditor } from './VenueMapEditor';
import { AdminCatalog } from './admin/AdminCatalog';
import { AdminEvents } from './admin/AdminEvents';
import { AdminFinance } from './admin/AdminFinance';
import { AdminReviews } from './admin/AdminReviews';

export const AdminPanel: React.FC = () => {
  const [resenas, setResenas] = useState<ResenaPublica[]>([
    {
      id: 101,
      eventoId: 1,
      eventoTitulo: 'VIVA FEST 2026',
      clienteNombre: 'Estuardo R.',
      calificacion: 5,
      comentario: 'La zona VIP y el sonido estuvieron espectaculares. Excelente seguridad en el acceso.',
      estado: 'PENDIENTE',
      creadoEn: new Date().toISOString(),
    },
    {
      id: 102,
      eventoId: 2,
      eventoTitulo: 'GRAN CARRERA 10K',
      clienteNombre: 'Lucía M.',
      calificacion: 4,
      comentario: 'La ruta de Reforma fue muy fluida. Buena hidratación en los kilómetros 5 y 8.',
      estado: 'PENDIENTE',
      creadoEn: new Date().toISOString(),
    },
  ]);

  const [documentos, setDocumentos] = useState([
    { id: 1, nombre: 'Reglamento_General_Eventos_2026.pdf', version: 1, estado: 'INDEXADO', chunks: 24, fecha: '2026-10-18' },
    { id: 2, nombre: 'Calendario_Temporada_2026.docx', version: 1, estado: 'INDEXADO', chunks: 8, fecha: '2026-10-19' },
    { id: 3, nombre: 'Politicas_Reembolso_ASA.pdf', version: 1, estado: 'PENDIENTE', chunks: 0, fecha: '2026-10-21' },
  ]);

  const [tabAdmin, setTabAdmin] = useState<
    'CATALOGO' | 'RECINTOS' | 'MODERACION' | 'RAG' | 'EVENTOS' | 'FINANZAS' | 'DISTRIBUCION' | 'USUARIOS'
  >('CATALOGO');

  const handleModerar = (id: number, decision: 'APROBADA' | 'RECHAZADA') => {
    setResenas((prev) =>
      prev.map((r) => (r.id === id ? { ...r, estado: decision } : r))
    );
  };

  const handleReindexar = (id: number) => {
    setDocumentos((prev) =>
      prev.map((d) => (d.id === id ? { ...d, estado: 'INDEXADO', chunks: 14 } : d))
    );
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
            onClick={() => setTabAdmin('CATALOGO')}
            className={`btn btn-sm ${tabAdmin === 'CATALOGO' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <Tag size={14} />
            Categorías & Artistas
          </button>
          <button
            onClick={() => setTabAdmin('EVENTOS')}
            className={`btn btn-sm ${tabAdmin === 'EVENTOS' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <Calendar size={14} />
            Eventos & Entradas
          </button>
          <button
            onClick={() => setTabAdmin('RECINTOS')}
            className={`btn btn-sm ${tabAdmin === 'RECINTOS' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <MapPin size={14} />
            Recintos & Planos
          </button>
          <button
            onClick={() => setTabAdmin('DISTRIBUCION')}
            className={`btn btn-sm ${tabAdmin === 'DISTRIBUCION' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <Grid size={14} />
            Silletería Numerada
          </button>
          <button
            onClick={() => setTabAdmin('FINANZAS')}
            className={`btn btn-sm ${tabAdmin === 'FINANZAS' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <DollarSign size={14} />
            Cuentas & Liquidación
          </button>
          <button
            onClick={() => setTabAdmin('MODERACION')}
            className={`btn btn-sm ${tabAdmin === 'MODERACION' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <MessageSquare size={14} />
            Moderación ({resenas.filter((r) => r.estado === 'PENDIENTE').length})
          </button>
          <button
            onClick={() => setTabAdmin('RAG')}
            className={`btn btn-sm ${tabAdmin === 'RAG' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <Brain size={14} />
            Documentos RAG José
          </button>
          <button
            onClick={() => setTabAdmin('USUARIOS')}
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

      {/* Tab: Recintos y Mapas de Localidades */}
      {tabAdmin === 'RECINTOS' && <VenueMapEditor />}

      {/* Tab: Moderación de Reseñas */}
      {tabAdmin === 'MODERACION' && <AdminReviews />}

      {/* Tab: Documentos RAG */}
      {tabAdmin === 'RAG' && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div>
              <p style={{ color: 'var(--text-secondary)' }}>
                Regla F9: Carga pública para RAG. La indexación es explícita por POST /ia/documentos/{'{id}'}/reindexar (aprobada por administrador).
              </p>
            </div>
            <button className="btn btn-sm btn-primary">
              <Upload size={16} /> Cargar Nuevo Documento
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {documentos.map((d) => (
              <div
                key={d.id}
                style={{
                  backgroundColor: '#FFF',
                  border: '2px solid var(--border-strong)',
                  boxShadow: 'var(--shadow-crisp-sm)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileText size={28} color="var(--accent-cobalt)" />
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>
                      {d.nombre}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Versión: v{d.version} · Fecha: {d.fecha} · Chunks vectorizados: {d.chunks}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`badge ${d.estado === 'INDEXADO' ? 'badge-valido' : 'badge-pendiente'}`}>
                    {d.estado}
                  </span>
                  {d.estado === 'PENDIENTE' && (
                    <button
                      onClick={() => handleReindexar(d.id)}
                      className="btn btn-sm btn-inverse"
                    >
                      <RefreshCw size={14} /> Indexar Vectores
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Eventos Activos */}
      {tabAdmin === 'EVENTOS' && <AdminEvents />}

      {/* Tab: Finanzas Placeholder */}
      {tabAdmin === 'FINANZAS' && <AdminFinance />}

      {/* Tab: Distribución Placeholder */}
      {tabAdmin === 'DISTRIBUCION' && (
        <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#FFF', border: '2px solid var(--border-strong)' }}>
          <Grid size={40} color="var(--accent-cobalt)" style={{ marginBottom: '10px' }} />
          <h3>Módulo de Silletería y Mesas Numeradas</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Gestione el layout de mesas y sillas por localidad.</p>
        </div>
      )}

      {/* Tab: Usuarios Placeholder */}
      {tabAdmin === 'USUARIOS' && (
        <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#FFF', border: '2px solid var(--border-strong)' }}>
          <Users size={40} color="var(--accent-amber)" style={{ marginBottom: '10px' }} />
          <h3>Módulo de Usuarios & Credenciales ASA</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Administre altas de administradores y dueños de recinto.</p>
        </div>
      )}

    </div>
  );
};
