import React, { useState, useEffect } from 'react';
import { LoadState } from '../common/LoadState';
import { api } from '../../api/client';
import { DocumentoRagDto } from '../../types/api';
import { Modal } from '../common/Modal';
import { 
  Brain, 
  Upload, 
  RefreshCw, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Layers, 
  Lock, 
  Search,
  Eye,
  Clock,
  Sparkles
} from 'lucide-react';

export const AdminRag: React.FC = () => {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoRagDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Modal Subir Nuevo Documento
  const [nuevoModalOpen, setNuevoModalOpen] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoArchivo, setNuevoArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  // Modal Nueva Versión
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [selectedDocParaVersion, setSelectedDocParaVersion] = useState<DocumentoRagDto | null>(null);
  const [versionTitulo, setVersionTitulo] = useState('');
  const [versionArchivo, setVersionArchivo] = useState<File | null>(null);

  // Modal Ver Detalle / Texto Extraído
  const [selectedDocParaDetalle, setSelectedDocParaDetalle] = useState<any | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4500);
  };

  const fetchDocumentos = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setDocumentos(await api.getTodosDocumentosRag());
    } catch (err: any) {
      setDocumentos([]);
      setLoadError(err?.detail || 'No se pudieron cargar los documentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentos();
  }, []);

  const handleSubirNuevo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoArchivo || !nuevoTitulo.trim()) return;
    setSubiendo(true);
    try {
      await api.subirDocumentoRag(nuevoTitulo.trim(), nuevoArchivo);
      showFeedback(`Documento "${nuevoTitulo}" subido en estado PENDIENTE. Procede a indexarlo.`);
      setNuevoModalOpen(false);
      setNuevoTitulo('');
      setNuevoArchivo(null);
      fetchDocumentos();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al subir documento.', 'error');
    } finally {
      setSubiendo(false);
    }
  };

  const handleSubirVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocParaVersion || !versionArchivo || !versionTitulo.trim()) return;
    setSubiendo(true);
    try {
      await api.subirNuevaVersionDocumentoRag(selectedDocParaVersion.id, versionTitulo.trim(), versionArchivo);
      showFeedback(`Nueva versión v${selectedDocParaVersion.version + 1} cargada para la serie.`);
      setVersionModalOpen(false);
      setVersionArchivo(null);
      setSelectedDocParaVersion(null);
      fetchDocumentos();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al subir nueva versión.', 'error');
    } finally {
      setSubiendo(false);
    }
  };

  const handleReindexar = async (doc: DocumentoRagDto) => {
    try {
      showFeedback(`Iniciando indexación vectorial para "${doc.nombreArchivo}"...`);
      await api.reindexarDocumentoRag(doc.id);
      showFeedback(`¡Documento indexado con éxito! Los vectores están activos en el asistente José.`);
      fetchDocumentos();
    } catch (err: any) {
      showFeedback(err?.detail || 'No se pudo indexar el documento.', 'error');
    }
  };

  const handleDesactivar = async (doc: DocumentoRagDto) => {
    if (!confirm(`¿Desactivar la versión v${doc.version} de "${doc.nombreArchivo}"? Dejará de responder consultas en el asistente José.`)) return;
    try {
      await api.desactivarDocumentoRag(doc.id, doc.estado);
      showFeedback(`Documento desactivado.`);
      fetchDocumentos();
    } catch (err: any) {
      showFeedback(err?.detail || 'Error al desactivar documento.', 'error');
    }
  };

  const handleVerDetalle = async (id: number) => {
    setLoadingDetalle(true);
    try {
      const data = await api.getDocumentoRag(id);
      setSelectedDocParaDetalle(data);
    } catch (err: any) {
      setSelectedDocParaDetalle(null);
      showFeedback(err?.detail || 'No se pudo cargar el detalle del documento.', 'error');
    } finally {
      setLoadingDetalle(false);
    }
  };

  const documentosFiltrados = documentos.filter((d) =>
    !busqueda.trim() ||
    d.nombreArchivo.toLowerCase().includes(busqueda.toLowerCase()) ||
    d.serie.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <LoadState loading={loading} error={loadError} empty={!documentos.length} onRetry={fetchDocumentos} />
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

      {/* Explicación Regla F9 */}
      <div style={{
        backgroundColor: '#FFF',
        border: '2px solid var(--border-strong)',
        boxShadow: 'var(--shadow-crisp-sm)',
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <Brain size={28} color="var(--accent-cobalt)" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>
            Regla de Negocio F9: Ingesta y Vectorización RAG José
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
            Carga administrativa de políticas, manuales y reglamentos. La carga inicia en estado <strong>PENDIENTE</strong>. La indexación vectorial se realiza de forma explícita mediante <code>POST /ia/documentos/{'{id}'}/reindexar</code>, generando chunks y embeddings que alimentan la memoria del asistente José.
          </p>
        </div>
      </div>

      {/* Header y Acciones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Buscar por serie o nombre de archivo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="input-base"
            style={{ paddingLeft: '32px', fontSize: '0.85rem', width: '280px' }}
          />
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
        </div>

        <button
          onClick={() => {
            setNuevoTitulo('');
            setNuevoArchivo(null);
            setNuevoModalOpen(true);
          }}
          className="btn btn-sm btn-primary"
        >
          <Upload size={16} /> Cargar Nuevo Documento
        </button>
      </div>

      {/* Lista de Documentos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            Cargando documentos normativos RAG...
          </div>
        ) : documentosFiltrados.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '2px dashed var(--border-strong)',
            padding: '36px',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)'
          }}>
            No hay documentos registrados para la memoria del asistente.
          </div>
        ) : (
          documentosFiltrados.map((d) => (
            <div
              key={d.id}
              style={{
                backgroundColor: '#FFF',
                border: '2px solid var(--border-strong)',
                boxShadow: 'var(--shadow-crisp-sm)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '260px' }}>
                <FileText size={32} color="var(--accent-cobalt)" />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>
                    {d.nombreArchivo}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Serie: <strong>{d.serie}</strong> · Versión: <strong>v{d.version}</strong> · Chunks: <strong>{d.chunks}</strong>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Fecha: {new Date(d.fechaCreacion).toLocaleDateString('es-GT', { dateStyle: 'medium' })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span className={`badge ${
                  d.estado === 'INDEXADO' ? 'badge-valido' :
                  d.estado === 'PENDIENTE' ? 'badge-pendiente' : 'badge-anulado'
                }`}>
                  {d.estado}
                </span>

                <button
                  onClick={() => handleVerDetalle(d.id)}
                  className="btn btn-sm btn-outline"
                  title="Ver texto extraído"
                >
                  <Eye size={13} /> Ver Detalle
                </button>

                <button
                  onClick={() => {
                    setSelectedDocParaVersion(d);
                    setVersionTitulo(d.nombreArchivo);
                    setVersionArchivo(null);
                    setVersionModalOpen(true);
                  }}
                  className="btn btn-sm btn-outline"
                  title="Cargar nueva versión de esta serie"
                >
                  <Layers size={13} /> Nueva Versión
                </button>

                {d.estado === 'PENDIENTE' && (
                  <button
                    onClick={() => handleReindexar(d)}
                    className="btn btn-sm btn-inverse"
                    style={{ gap: '6px' }}
                  >
                    <RefreshCw size={13} /> Indexar Vectores
                  </button>
                )}

                {d.estado === 'INDEXADO' && (
                  <>
                    <button
                      onClick={() => handleReindexar(d)}
                      className="btn btn-sm btn-outline"
                      title="Re-ejecutar embeddings cloud"
                    >
                      <RefreshCw size={13} /> Reindexar
                    </button>
                    <button
                      onClick={() => handleDesactivar(d)}
                      className="btn btn-sm btn-outline"
                      style={{ color: 'var(--accent-vermilion)' }}
                      title="Desactivar versión"
                    >
                      <Lock size={13} /> Desactivar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- MODAL SUBIR NUEVO DOCUMENTO --- */}
      <Modal
        isOpen={nuevoModalOpen}
        onClose={() => setNuevoModalOpen(false)}
        title="Cargar Documento para IA RAG"
        maxWidth="500px"
      >
        <form onSubmit={handleSubirNuevo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Formatos admitidos: PDF (con texto seleccionable, hasta 200 pág), DOCX, TXT o Markdown (UTF-8). Máximo 5 MiB.
          </p>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Título o Identificador del Documento *
            </label>
            <input
              type="text"
              required
              value={nuevoTitulo}
              onChange={(e) => setNuevoTitulo(e.target.value)}
              className="input-base"
              placeholder="Ej: Reglamento Oficial de Boletería y Reembolsos 2026"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Archivo a Ingestar *
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              required
              onChange={(e) => setNuevoArchivo(e.target.files?.[0] || null)}
              className="input-base"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={() => setNuevoModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={subiendo || !nuevoArchivo} className="btn btn-primary" style={{ flex: 1 }}>
              {subiendo ? 'Subiendo...' : 'Cargar Documento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL NUEVA VERSIÓN --- */}
      <Modal
        isOpen={versionModalOpen}
        onClose={() => setVersionModalOpen(false)}
        title={`Cargar Nueva Versión para Serie: ${selectedDocParaVersion?.serie}`}
        maxWidth="500px"
      >
        <form onSubmit={handleSubirVersion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Se creará la versión <strong>v{(selectedDocParaVersion?.version || 1) + 1}</strong>. La versión anterior se conservará intacta hasta que esta nueva versión sea indexada y publicada.
          </p>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Título Actualizado *
            </label>
            <input
              type="text"
              required
              value={versionTitulo}
              onChange={(e) => setVersionTitulo(e.target.value)}
              className="input-base"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Nuevo Archivo (PDF, DOCX, TXT, MD) *
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              required
              onChange={(e) => setVersionArchivo(e.target.files?.[0] || null)}
              className="input-base"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={() => setVersionModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={subiendo || !versionArchivo} className="btn btn-primary" style={{ flex: 1 }}>
              {subiendo ? 'Subiendo...' : 'Publicar Nueva Versión'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL DETALLE DOCUMENTO --- */}
      <Modal
        isOpen={!!selectedDocParaDetalle}
        onClose={() => setSelectedDocParaDetalle(null)}
        title={`Detalle RAG: ${selectedDocParaDetalle?.nombreArchivo}`}
        maxWidth="680px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            backgroundColor: 'var(--bg-canvas)',
            padding: '12px 16px',
            border: '1.5px solid var(--border-strong)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem'
          }}>
            <div>Serie: <strong>{selectedDocParaDetalle?.serie}</strong></div>
            <div>Versión: <strong>v{selectedDocParaDetalle?.version}</strong></div>
            <div>Estado: <strong>{selectedDocParaDetalle?.estado}</strong></div>
            <div>Chunks Vectoriales: <strong>{selectedDocParaDetalle?.chunks}</strong></div>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Texto Extraído para Embeddings Cloud
            </label>
            <textarea
              readOnly
              rows={8}
              value={selectedDocParaDetalle?.contenidoExtraido || 'Texto indexado para recuperación semántica por similitud coseno.'}
              className="input-base"
              style={{ backgroundColor: '#FFF', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <button onClick={() => setSelectedDocParaDetalle(null)} className="btn btn-sm btn-outline">
              Cerrar
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
