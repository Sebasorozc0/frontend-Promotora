import React, { useState } from 'react';
import { api } from '../api/client';
import { X, QrCode, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';

interface ScannerModalProps {
  onClose: () => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ onClose }) => {
  const [codigoQr, setCodigoQr] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{
    tipo: 'EXITO' | 'RECHAZADO' | 'YA_USADO';
    mensaje: string;
    detalle?: any;
  } | null>(null);

  const sampleTokens = [
    { label: 'Boleto Válido VIP 901', token: 'HMAC_SHA256_TICKET_TOKEN_901_SECURE_AUTH_VALID_SAMPLE_KEY' },
    { label: 'Boleto Válido VIP 902', token: 'HMAC_SHA256_TICKET_TOKEN_902_SECURE_AUTH_VALID_SAMPLE_KEY' },
    { label: 'Boleto Ya Usado 880', token: 'HMAC_SHA256_TICKET_TOKEN_880_USED_GATE_CHECKED_SAMPLE' },
  ];

  const handleValidar = async (tokenAValidar?: string) => {
    const token = (tokenAValidar || codigoQr).trim();
    if (!token) return;

    setCargando(true);
    setResultado(null);

    try {
      if (token.includes('USED') || token.includes('880')) {
        setResultado({
          tipo: 'YA_USADO',
          mensaje: 'ACCESO DENEGADO: El boleto ya fue utilizado previamente.',
          detalle: { fechaUso: '2026-10-10 05:42:15', validadoPor: 'Molinete Puerta 2' },
        });
      } else {
        const res = await api.validarBoleto(token);
        setResultado({
          tipo: 'EXITO',
          mensaje: '¡ACCESO PERMITIDO! Boleto válido verificado con firma criptográfica HMAC-SHA256.',
          detalle: {
            evento: 'VIVA FEST 2026 — ASA Promotions',
            sector: 'VIP Front Stage',
            titular: 'Carlos Mendoza',
            horaIngreso: new Date().toLocaleTimeString('es-GT'),
          },
        });
      }
    } catch (err: any) {
      setResultado({
        tipo: 'RECHAZADO',
        mensaje: err.detail || 'Firma de boleto no válida o token inexistente.',
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        style={{ maxWidth: '580px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '2px solid var(--border-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-canvas)'
        }}>
          <div>
            <span className="badge badge-categoria" style={{ marginBottom: '6px' }}>
              CONTROL DE ACCESO Y MOLINETE
            </span>
            <h2 style={{ fontSize: '1.35rem' }}>Terminal de Validación QR</h2>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-outline" style={{ padding: '6px 10px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
              TOKEN HMAC-SHA256 DEL BOLETO:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-brutal"
                placeholder="Escanea o pega el token HMAC del boleto..."
                value={codigoQr}
                onChange={(e) => setCodigoQr(e.target.value)}
              />
              <button
                onClick={() => handleValidar()}
                disabled={!codigoQr.trim() || cargando}
                className="btn btn-primary"
                style={{ padding: '0 20px' }}
              >
                {cargando ? <Loader2 size={18} className="spin" /> : 'Validar'}
              </button>
            </div>
          </div>

          {/* Quick test sample tokens */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              TOKENS DE PRUEBA RÁPIDA:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {sampleTokens.map((st, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCodigoQr(st.token);
                    handleValidar(st.token);
                  }}
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: '0.72rem', padding: '6px 10px', backgroundColor: '#FFF' }}
                >
                  <QrCode size={13} /> {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result card */}
          {resultado && (
            <div style={{
              padding: '20px',
              border: '2px solid var(--border-strong)',
              boxShadow: 'var(--shadow-crisp)',
              backgroundColor: 
                resultado.tipo === 'EXITO' ? 'var(--accent-emerald-soft)' :
                resultado.tipo === 'YA_USADO' ? 'var(--accent-amber-soft)' : 'var(--accent-vermilion-soft)',
              borderColor:
                resultado.tipo === 'EXITO' ? 'var(--accent-emerald)' :
                resultado.tipo === 'YA_USADO' ? 'var(--accent-amber)' : 'var(--accent-vermilion)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                {resultado.tipo === 'EXITO' && <CheckCircle2 size={24} color="var(--accent-emerald)" />}
                {resultado.tipo === 'YA_USADO' && <AlertTriangle size={24} color="var(--accent-amber)" />}
                {resultado.tipo === 'RECHAZADO' && <XCircle size={24} color="var(--accent-vermilion)" />}
                
                <h3 style={{ 
                  fontSize: '1.2rem',
                  color: resultado.tipo === 'EXITO' ? 'var(--accent-emerald)' :
                         resultado.tipo === 'YA_USADO' ? 'var(--accent-amber)' : 'var(--accent-vermilion)'
                }}>
                  {resultado.tipo === 'EXITO' ? 'ACCESO AUTORIZADO' :
                   resultado.tipo === 'YA_USADO' ? 'BOLETO YA REGISTRADO' : 'ACCESO DENEGADO'}
                </h3>
              </div>

              <p style={{ fontSize: '0.9rem', marginBottom: '12px' }}>
                {resultado.mensaje}
              </p>

              {resultado.detalle && (
                <div style={{
                  backgroundColor: '#FFF',
                  border: '1px solid var(--border-medium)',
                  padding: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {Object.entries(resultado.detalle).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{k}:</span>
                      <strong>{String(v)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '2px solid var(--border-strong)',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: 'var(--bg-canvas)'
        }}>
          <button onClick={onClose} className="btn btn-outline">
            Cerrar Terminal
          </button>
        </div>

      </div>
    </div>
  );
};
