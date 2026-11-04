import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { BoletoResponse } from '../types/api';
import { Calendar, MapPin, CheckCircle, ShieldAlert, Clock, User, QrCode as QrIcon } from 'lucide-react';

interface TicketCardProps {
  boleto: BoletoResponse;
}

export const TicketCard: React.FC<TicketCardProps> = ({ boleto }) => {
  const [qrError, setQrError] = React.useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setQrError(false);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, boleto.codigoQr, {
        width: 220,
        margin: 4,
        color: {
          dark: '#121316',
          light: '#FFFFFF',
        },
      }).catch(() => setQrError(true));
    }
  }, [boleto.codigoQr]);

  const fecha = new Date(boleto.fechaInicio);
  const fechaStr = fecha.toLocaleDateString('es-GT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
  const horaStr = fecha.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });

  const isValido = boleto.estado === 'VALIDO';
  const isUsado = boleto.estado === 'USADO';

  return (
    <div className="ticket-wrapper" style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
      {/* Top Header of Ticket */}
      <div style={{
        backgroundColor: 'var(--bg-inverse)',
        color: 'var(--text-inverse)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid var(--border-strong)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
            ASA BOLETO DIGITAL
          </div>
        </div>
        <span className={`badge ${isValido ? 'badge-valido' : isUsado ? 'badge-usado' : 'badge-anulado'}`}>
          {boleto.estado}
        </span>
      </div>

      {/* Main Ticket Body */}
      <div style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.3rem', marginBottom: '10px', color: 'var(--text-primary)' }}>
          {boleto.eventoTitulo}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} style={{ color: 'var(--accent-vermilion)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fechaStr} · {horaStr} hrs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={15} />
            <span>{boleto.recintoNombre}</span>
          </div>
          {boleto.asistenteNombre && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} />
              <span>Titular: <strong>{boleto.asistenteNombre}</strong></span>
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: 'var(--bg-canvas)',
          border: '1.5px solid var(--border-strong)',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.82rem'
        }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>TIPO DE ENTRADA</div>
            {boleto.localidadNombre && <p>{boleto.localidadNombre}</p>}
            <div style={{ fontWeight: 700 }}>{boleto.tipoEntradaNombre}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>PRECIO</div>
            <div style={{ fontWeight: 700, color: 'var(--accent-vermilion)' }}>Q{boleto.precioFinal.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Perforation line with round cutout notches */}
      <div className="ticket-divider">
        <div className="ticket-notch-left" />
        <div className="ticket-perforation" />
        <div className="ticket-notch-right" />
      </div>

<p className="helper-text" style={{ padding: "0 20px" }}>Este boleto está guardado en tu cuenta. No compartas su código fuera del personal autorizado.</p>
      {/* Bottom QR Section */}
      <div style={{
        padding: '20px',
        backgroundColor: '#FAF9F5',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          padding: '8px',
          backgroundColor: '#FFF',
          border: '2px solid var(--border-strong)',
          boxShadow: 'var(--shadow-crisp-sm)',
          marginBottom: '10px'
        }}>
          <canvas ref={canvasRef} aria-label="Código QR de esta entrada" />
          {qrError && <p role="alert">No se pudo dibujar el QR. Usa Copiar código de acceso o vuelve a abrir el boleto.</p>}
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', maxWidth: '280px', wordBreak: 'break-all' }}>
          Presenta este QR al ingresar. Cada boleto permite un solo acceso.
        </div>

        <div className="actions"><button className="btn btn-sm btn-outline" onClick={async () => { try { await navigator.clipboard.writeText(boleto.codigoQr); alert('Código copiado para validar. Compártelo solo con el personal de acceso.'); } catch { alert('No se pudo copiar. Puedes utilizar el QR del boleto.'); } }}>Copiar código de acceso</button><button className="btn btn-sm btn-outline" onClick={() => { const canvas = canvasRef.current; if (!canvas) return; const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = 'boleto-' + boleto.id + '.png'; link.click(); }}>Descargar QR</button></div>
        {isUsado && (
          <div style={{
            marginTop: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-surface-alt)',
            padding: '4px 8px',
            border: '1px solid var(--border-medium)'
          }}>
            Ingresado el {new Date(boleto.fechaUso || '').toLocaleString('es-GT')}
          </div>
        )}
      </div>

    </div>
  );
};
