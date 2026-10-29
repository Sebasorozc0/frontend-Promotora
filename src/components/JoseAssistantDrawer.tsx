import React, { useState } from 'react';
import { api } from '../api/client';
import { ConsultaIaResponse, FuenteCitada } from '../types/api';
import { 
  X, 
  Send, 
  Sparkles, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  ShieldCheck, 
  Bot,
  User
} from 'lucide-react';

interface JoseAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MensajeChat {
  id: string;
  remitente: 'usuario' | 'jose';
  texto: string;
  fuentes?: FuenteCitada[];
  tiempoMs?: number;
}

export const JoseAssistantDrawer: React.FC<JoseAssistantDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      id: 'bienvenida',
      remitente: 'jose',
      texto:
        '¡Hola! Soy José, el asistente oficial de la promotora. Puedo responder tus consultas sobre eventos en venta, reglamentos de acceso, recintos, horarios y políticas públicas con respaldo en documentos oficiales.',
    },
  ]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [fuentesAbiertas, setFuentesAbiertas] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleEnviar = async (textoAEnviar?: string) => {
    const consulta = (textoAEnviar || input).trim();
    if (!consulta || cargando) return;

    const idUsuario = 'msg-' + Date.now();
    const nuevoMensajeUsuario: MensajeChat = {
      id: idUsuario,
      remitente: 'usuario',
      texto: consulta,
    };

    setMensajes((prev) => [...prev, nuevoMensajeUsuario]);
    setInput('');
    setCargando(true);

    try {
      const res = await api.consultarIa(consulta);
      const idJose = 'jose-' + Date.now();
      const nuevoMensajeJose: MensajeChat = {
        id: idJose,
        remitente: 'jose',
        texto: res.respuesta,
        fuentes: res.fuentes,
        tiempoMs: res.tiempoRespuestaMs,
      };
      setMensajes((prev) => [...prev, nuevoMensajeJose]);
    } catch (err: any) {
      setMensajes((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          remitente: 'jose',
          texto: 'Lo siento, no pude conectar con el servicio de IA en este momento. Por favor intenta de nuevo.',
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const toggleFuentes = (msgId: string) => {
    setFuentesAbiertas((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const sugerencias = [
    '¿Qué eventos están confirmados este mes?',
    '¿Cuáles son las políticas de reembolso y cancelación?',
    '¿Cómo funciona la validación del código QR en puerta?',
    '¿Qué incluye el acceso Platinum VIP en Explanada Cayalá?',
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ padding: 0 }}>
      <div 
        className="drawer-aside"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '2px solid var(--border-strong)',
          backgroundColor: 'var(--bg-canvas)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              backgroundColor: 'var(--bg-inverse)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--border-strong)',
              boxShadow: 'var(--shadow-crisp-sm)'
            }}>
              <Sparkles size={20} color="#FF3B20" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '1.15rem' }}>José · Asistente IA</h3>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%' }} />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                RAG Oficial · Respuestas con Citación
              </div>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-sm btn-outline" style={{ padding: '6px 8px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Message Thread */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: '#FAF9F5'
        }}>
          {mensajes.map((m) => {
            const isUser = m.remitente === 'usuario';
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                }}
              >
                <div style={{
                  padding: '14px 16px',
                  backgroundColor: isUser ? 'var(--bg-inverse)' : '#FFF',
                  color: isUser ? 'var(--text-inverse)' : 'var(--text-primary)',
                  border: '2px solid var(--border-strong)',
                  boxShadow: 'var(--shadow-crisp-sm)',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-line'
                }}>
                  {m.texto}
                </div>

                {/* Citaciones RAG */}
                {m.fuentes && m.fuentes.length > 0 && (
                  <div style={{ marginTop: '6px' }}>
                    <button
                      onClick={() => toggleFuentes(m.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'none',
                        border: 'none',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.72rem',
                        color: 'var(--accent-cobalt)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '2px 4px'
                      }}
                    >
                      <BookOpen size={13} />
                      {fuentesAbiertas[m.id] ? 'Ocultar fuentes' : `Ver fuentes citadas (${m.fuentes.length})`}
                      {fuentesAbiertas[m.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {fuentesAbiertas[m.id] && (
                      <div style={{
                        marginTop: '4px',
                        backgroundColor: '#FFF',
                        border: '1.5px solid var(--border-strong)',
                        padding: '10px',
                        fontSize: '0.78rem',
                        fontFamily: 'var(--font-mono)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {m.fuentes.map((f, i) => (
                          <div key={i} style={{ borderBottom: i < m.fuentes!.length - 1 ? '1px dashed var(--border-medium)' : 'none', paddingBottom: '6px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              📄 {f.documento} {f.pagina ? `(Pág. ${f.pagina})` : ''}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>
                              "{f.extracto}"
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {cargando && (
            <div style={{
              alignSelf: 'flex-start',
              padding: '12px 16px',
              backgroundColor: '#FFF',
              border: '2px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem'
            }}>
              <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              Consultando documentos RAG indexados...
            </div>
          )}
        </div>

        {/* Quick Suggestion Pills */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1.5px dashed var(--border-medium)',
          backgroundColor: 'var(--bg-canvas)',
          display: 'flex',
          overflowX: 'auto',
          gap: '6px',
          whiteSpace: 'nowrap'
        }}>
          {sugerencias.map((sug, i) => (
            <button
              key={i}
              onClick={() => handleEnviar(sug)}
              className="btn btn-sm btn-outline"
              style={{ fontSize: '0.7rem', padding: '4px 10px', backgroundColor: '#FFF' }}
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div style={{
          padding: '16px',
          borderTop: '2px solid var(--border-strong)',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          gap: '8px'
        }}>
          <input
            type="text"
            className="input-brutal"
            placeholder="Pregunta a José sobre eventos o reglamentos..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEnviar()}
            disabled={cargando}
          />
          <button
            onClick={() => handleEnviar()}
            disabled={!input.trim() || cargando}
            className="btn btn-primary"
            style={{ padding: '0 18px' }}
          >
            <Send size={18} />
          </button>
        </div>

      </div>
    </div>
  );
};
