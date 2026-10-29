import React, { useState } from 'react';
import { MOCK_RESENAS, MOCK_EVENTOS } from '../api/client';
import { ResenaPublica } from '../types/api';
import { ShieldCheck, Check, X, FileText, Upload, RefreshCw, MapPin } from 'lucide-react';
import { VenueMapEditor } from './VenueMapEditor';

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

  const [tabAdmin, setTabAdmin] = useState<'RECINTOS' | 'MODERACION' | 'RAG' | 'EVENTOS'>('RECINTOS');

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
        marginBottom: '32px'
      }}>
        <div>
          <span className="badge badge-categoria" style={{ marginBottom: '6px' }}>
            PANEL DE ADMINISTRACIÓN Y CONTROL
          </span>
          <h2 style={{ fontSize: '2rem' }}>Centro de Operaciones ASA</h2>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setTabAdmin('RECINTOS')}
            className={`btn btn-sm ${tabAdmin === 'RECINTOS' ? 'btn-inverse' : 'btn-outline'}`}
            style={{ gap: '6px' }}
          >
            <MapPin size={14} />
            Recintos y Mapas de Localidades
          </button>
          <button
            onClick={() => setTabAdmin('MODERACION')}
            className={`btn btn-sm ${tabAdmin === 'MODERACION' ? 'btn-inverse' : 'btn-outline'}`}
          >
            Moderación de Reseñas ({resenas.filter((r) => r.estado === 'PENDIENTE').length})
          </button>
          <button
            onClick={() => setTabAdmin('RAG')}
            className={`btn btn-sm ${tabAdmin === 'RAG' ? 'btn-inverse' : 'btn-outline'}`}
          >
            Documentos RAG José
          </button>
          <button
            onClick={() => setTabAdmin('EVENTOS')}
            className={`btn btn-sm ${tabAdmin === 'EVENTOS' ? 'btn-inverse' : 'btn-outline'}`}
          >
            Eventos Activos
          </button>
        </div>
      </div>

      {/* Tab: Recintos y Mapas de Localidades */}
      {tabAdmin === 'RECINTOS' && <VenueMapEditor />}

      {/* Tab: Moderación de Reseñas */}
      {tabAdmin === 'MODERACION' && (
        <div>
          <div style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
            Regla de Negocio #9: Solo clientes con boleto <strong>USADO</strong> pueden opinar. Las reseñas nacen PENDIENTE y las modera un administrador antes de mostrarse en el catálogo.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {resenas.map((r) => (
              <div
                key={r.id}
                style={{
                  backgroundColor: '#FFF',
                  border: '2px solid var(--border-strong)',
                  boxShadow: 'var(--shadow-crisp-sm)',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span className="badge badge-categoria">{r.eventoTitulo}</span>
                    <span className="badge badge-pendiente">{r.estado}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                      ★ {r.calificacion}.0 / 5.0
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>
                    Cliente: {r.clienteNombre}
                  </h4>
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                    "{r.comentario}"
                  </p>
                </div>

                {r.estado === 'PENDIENTE' ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleModerar(r.id, 'APROBADA')}
                      className="btn btn-sm btn-primary"
                      style={{ backgroundColor: 'var(--accent-emerald)', borderColor: 'var(--border-strong)' }}
                    >
                      <Check size={16} /> Aprobar
                    </button>
                    <button
                      onClick={() => handleModerar(r.id, 'RECHAZADA')}
                      className="btn btn-sm btn-outline"
                      style={{ color: 'var(--accent-vermilion)' }}
                    >
                      <X size={16} /> Rechazar
                    </button>
                  </div>
                ) : (
                  <span className={`badge ${r.estado === 'APROBADA' ? 'badge-valido' : 'badge-anulado'}`}>
                    {r.estado}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
      {tabAdmin === 'EVENTOS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {MOCK_EVENTOS.map((ev) => (
            <div
              key={ev.id}
              style={{
                backgroundColor: '#FFF',
                border: '2px solid var(--border-strong)',
                boxShadow: 'var(--shadow-crisp-sm)',
                padding: '18px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-categoria">{ev.categoriaNombre}</span>
                <span className="badge badge-valido">{ev.estado}</span>
              </div>
              <h4 style={{ fontSize: '1.15rem', marginBottom: '8px' }}>{ev.titulo}</h4>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Recinto: {ev.recintoNombre} <br />
                Cupo libre: {ev.cupoDisponible} / {ev.cupoTotal}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-sm btn-outline" style={{ width: '100%' }}>
                  Editar Fechas
                </button>
                <button className="btn btn-sm btn-inverse" style={{ width: '100%' }}>
                  Ver Tipos Entrada
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
