import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { BoletoResponse } from '../types/api';
import { Calendar, Download, Loader2, MapPin, User } from 'lucide-react';

interface TicketCardProps {
  boleto: BoletoResponse;
}

const formatoFecha = (value: string, options: Intl.DateTimeFormatOptions) =>
  new Date(value).toLocaleString('es-GT', options).toUpperCase();

const dibujarTextoEnvuelto = (
  context: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  anchoMaximo: number,
  altoLinea: number,
  maxLineas = 2,
) => {
  const palabras = texto.trim().split(/\s+/);
  let linea = '';
  let lineas = 0;

  for (const palabra of palabras) {
    const propuesta = linea ? `${linea} ${palabra}` : palabra;
    if (context.measureText(propuesta).width > anchoMaximo && linea) {
      context.fillText(linea, x, y + lineas * altoLinea);
      lineas += 1;
      linea = palabra;
      if (lineas === maxLineas) break;
    } else {
      linea = propuesta;
    }
  }

  if (linea && lineas < maxLineas) {
    if (lineas === maxLineas - 1 && palabras.length > 1 && context.measureText(`${linea}…`).width > anchoMaximo) {
      linea = `${linea.slice(0, Math.max(1, linea.length - 2))}…`;
    }
    context.fillText(linea, x, y + lineas * altoLinea);
    lineas += 1;
  }

  return y + lineas * altoLinea;
};

const descargarBoletoComoImagen = async (boleto: BoletoResponse) => {
  const qrDataUrl = await QRCode.toDataURL(boleto.codigoQr, {
    width: 440,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#121316', light: '#FFFFFF' },
  });
  const qrImage = new Image();
  qrImage.src = qrDataUrl;
  await qrImage.decode();

  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1380;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la descarga del boleto.');

  const width = canvas.width;
  context.fillStyle = '#f5f4f0';
  context.fillRect(0, 0, width, canvas.height);
  context.fillStyle = '#ffffff';
  context.fillRect(38, 38, width - 76, canvas.height - 76);
  context.strokeStyle = '#121316';
  context.lineWidth = 5;
  context.strokeRect(38, 38, width - 76, canvas.height - 76);

  context.fillStyle = '#121316';
  context.fillRect(40, 40, width - 80, 126);
  context.fillStyle = '#ffffff';
  context.font = '800 38px Arial, sans-serif';
  context.fillText('ASA PROMOTORA', 82, 94);
  context.font = '600 21px Arial, sans-serif';
  context.fillStyle = '#d7d7d7';
  context.fillText('BOLETO DIGITAL OFICIAL', 84, 130);

  const estado = boleto.estado === 'VALIDO' ? 'VÁLIDO' : boleto.estado;
  const estadoColor = boleto.estado === 'VALIDO' ? '#a7f3d0' : '#e5e7eb';
  context.textAlign = 'right';
  context.fillStyle = estadoColor;
  context.font = '800 24px Arial, sans-serif';
  context.fillText(estado, width - 82, 106);
  context.textAlign = 'left';

  const margen = 84;
  const ancho = width - margen * 2;
  let y = 228;
  context.fillStyle = '#767b86';
  context.font = '700 19px Arial, sans-serif';
  context.fillText('EVENTO', margen, y);
  y += 49;
  context.fillStyle = '#121316';
  context.font = '800 40px Arial, sans-serif';
  y = dibujarTextoEnvuelto(context, boleto.eventoTitulo || 'Evento', margen, y, ancho, 48, 3) + 20;

  const dibujarCampo = (titulo: string, valor: string, valorColor = '#121316') => {
    context.fillStyle = '#767b86';
    context.font = '700 17px Arial, sans-serif';
    context.fillText(titulo.toUpperCase(), margen, y);
    y += 32;
    context.fillStyle = valorColor;
    context.font = '700 25px Arial, sans-serif';
    y = dibujarTextoEnvuelto(context, valor, margen, y, ancho, 31, 2) + 20;
  };

  dibujarCampo('Fecha y hora', formatoFecha(boleto.fechaInicio, {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }));
  dibujarCampo('Recinto', boleto.recintoNombre || 'Recinto');
  dibujarCampo('Tipo de entrada', boleto.tipoEntradaNombre || 'Entrada');
  if (boleto.asistenteNombre) dibujarCampo('Titular', boleto.asistenteNombre);

  if (boleto.ubicacion) {
    const asiento = [
      boleto.ubicacion.mesa ? `Mesa ${boleto.ubicacion.mesa}` : null,
      boleto.ubicacion.fila ? `Fila ${boleto.ubicacion.fila}` : null,
      `Silla ${boleto.ubicacion.silla}`,
    ].filter(Boolean).join(' · ');
    dibujarCampo('Ubicación', asiento);
  }

  if (boleto.precioFinal !== undefined) {
    dibujarCampo('Precio del boleto', `Q${boleto.precioFinal.toFixed(2)}`);
  }

  context.strokeStyle = '#d0ccc2';
  context.lineWidth = 3;
  context.setLineDash([10, 10]);
  context.beginPath();
  context.moveTo(margen, y);
  context.lineTo(width - margen, y);
  context.stroke();
  context.setLineDash([]);

  const qrSize = 330;
  const qrX = (width - qrSize) / 2;
  const qrY = Math.min(y + 32, canvas.height - qrSize - 130);
  context.fillStyle = '#ffffff';
  context.fillRect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30);
  context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
  context.fillStyle = '#585d6b';
  context.textAlign = 'center';
  context.font = '600 18px Arial, sans-serif';
  context.fillText('Presenta este código QR en el acceso.', width / 2, canvas.height - 82);
  context.textAlign = 'left';

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo crear la imagen del boleto.')), 'image/png');
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const identificador = String(boleto.publicId || boleto.id).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 16);
  link.href = url;
  link.download = `boleto-${identificador || 'digital'}.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

export const TicketCard: React.FC<TicketCardProps> = ({ boleto }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, boleto.codigoQr, {
        width: 180,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#121316', light: '#FFFFFF' },
      }).catch(() => setErrorDescarga('No se pudo generar el QR de este boleto.'));
    }
  }, [boleto.codigoQr]);

  const handleDescargar = async () => {
    setDescargando(true);
    setErrorDescarga(null);
    try {
      await descargarBoletoComoImagen(boleto);
    } catch {
      setErrorDescarga('No se pudo preparar la descarga. Intenta nuevamente.');
    } finally {
      setDescargando(false);
    }
  };

  const fecha = new Date(boleto.fechaInicio);
  const fechaStr = fecha.toLocaleDateString('es-GT', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();
  const horaStr = fecha.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  const isValido = boleto.estado === 'VALIDO';
  const isUsado = boleto.estado === 'USADO';
  const ubicacion = boleto.ubicacion
    ? [boleto.ubicacion.mesa ? `Mesa ${boleto.ubicacion.mesa}` : null,
      boleto.ubicacion.fila ? `Fila ${boleto.ubicacion.fila}` : null,
      `Silla ${boleto.ubicacion.silla}`].filter(Boolean).join(' · ')
    : null;

  return (
    <div className="ticket-wrapper" style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'var(--bg-inverse)', color: 'var(--text-inverse)', padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border-strong)',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
          ASA BOLETO DIGITAL
        </div>
        <span className={`badge ${isValido ? 'badge-valido' : isUsado ? 'badge-usado' : 'badge-anulado'}`}>
          {boleto.estado}
        </span>
      </div>

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
          {ubicacion && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{ubicacion}</div>}
        </div>

        <div style={{
          backgroundColor: 'var(--bg-canvas)', border: '1.5px solid var(--border-strong)', padding: '8px 12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
        }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>TIPO DE ENTRADA</div>
            <div style={{ fontWeight: 700 }}>{boleto.tipoEntradaNombre}</div>
          </div>
          {boleto.precioFinal !== undefined && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>PRECIO</div>
              <div style={{ fontWeight: 700, color: 'var(--accent-vermilion)' }}>Q{boleto.precioFinal.toFixed(2)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="ticket-divider">
        <div className="ticket-notch-left" />
        <div className="ticket-perforation" />
        <div className="ticket-notch-right" />
      </div>

      <div style={{
        padding: '20px', backgroundColor: '#FAF9F5', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ padding: '8px', backgroundColor: '#FFF', border: '2px solid var(--border-strong)', boxShadow: 'var(--shadow-crisp-sm)', marginBottom: '10px' }}>
          <canvas ref={canvasRef} aria-label={`Código QR del boleto ${boleto.publicId || boleto.id}`} />
        </div>

        {isUsado && (
          <div style={{
            marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-surface-alt)', padding: '4px 8px', border: '1px solid var(--border-medium)',
          }}>
            Ingresado el {new Date(boleto.fechaUso || '').toLocaleString('es-GT')}
          </div>
        )}

        <button type="button" onClick={handleDescargar} disabled={descargando} className="btn btn-sm btn-inverse" style={{ marginTop: '14px', width: '100%' }}>
          {descargando ? <Loader2 className="spin" size={16} /> : <Download size={16} />}
          {descargando ? 'Preparando boleto…' : 'Descargar boleto PNG'}
        </button>
        {errorDescarga && <p role="alert" style={{ color: 'var(--accent-vermilion)', fontSize: '0.75rem', marginTop: '8px' }}>{errorDescarga}</p>}
      </div>
    </div>
  );
};
