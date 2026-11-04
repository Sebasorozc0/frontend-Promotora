import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { Modal } from './common/Modal';

export function TicketScanner({ allowManual = true }: { allowManual?: boolean }) {
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; time?: string; seat?: string } | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const inFlight = useRef(false);

  async function validate(value: string) {
    const token = value.trim();
    if (!token || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setCamera(false);
    setCode('');
    setResult(null);
    try {
      const ticket = await api.validarBoleto(token);
      const seat = ticket.ubicacion;
      setResult({
        ok: true, message: 'Entrada registrada.', time: ticket.fechaUso,
        seat: seat ? [seat.mesa && `Mesa ${seat.mesa}`, seat.fila && `Fila ${seat.fila}`, `Silla ${seat.silla}`].filter(Boolean).join(' · ') : undefined,
      });
    } catch (error) {
      const problem = error as { detail?: string; status?: number };
      setResult({ ok: false, message: problem.detail || 'No se pudo confirmar la entrada. Comprueba la conexión.' });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!camera) return;
    let active = true;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const preview = video.current;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const scan = (decode: typeof import('jsqr').default) => {
      if (!active || !preview || !context) return;
      if (preview.readyState >= 2 && preview.videoWidth > 0) {
        const scale = Math.min(1, 960 / preview.videoWidth);
        const width = Math.round(preview.videoWidth * scale);
        const height = Math.round(preview.videoHeight * scale);
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        context.drawImage(preview, 0, 0, width, height);
        const frame = context.getImageData(0, 0, width, height);
        const qr = decode(frame.data, width, height, { inversionAttempts: 'dontInvert' });
        if (qr?.data.trim()) { void validate(qr.data); return; }
      }
      timer = setTimeout(() => scan(decode), 150);
    };
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !preview || !context) {
          throw new Error('La cámara requiere HTTPS o localhost y un navegador compatible.');
        }
        const opened = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
        if (!active) { opened.getTracks().forEach(track => track.stop()); return; }
        stream = opened;
        preview.srcObject = opened;
        await preview.play();
        const { default: decode } = await import('jsqr');
        scan(decode);
      } catch (error) {
        if (!active) return;
        setCameraError(error instanceof DOMException ? 'No se pudo abrir la cámara. Revisa el permiso del navegador y que la cámara esté disponible.' : (error as Error).message);
        setCamera(false);
      }
    };
    void start();
    return () => {
      active = false;
      clearTimeout(timer);
      stream?.getTracks().forEach(track => track.stop());
      if (preview) preview.srcObject = null;
    };
  }, [camera]);

  return <section aria-label="Escáner de boletos">
    <p>Apunta la cámara al código QR del boleto. El servidor confirmará si permite el ingreso.</p>
    <div className="actions">
      <button className="btn btn-primary" disabled={busy} onClick={() => {
        setCameraError('');
        if (!camera) setResult(null);
        setCamera(!camera);
      }}>{camera ? 'Apagar cámara' : result ? 'Escanear otro boleto' : 'Activar cámara'}</button>
    </div>
    {camera && <video ref={video} playsInline muted aria-label="Vista de la cámara" style={{ width: '100%', maxHeight: 380, background: '#121316' }} />}
    {cameraError && <p className="notice" role="alert">{cameraError}</p>}
    {allowManual && <form onSubmit={event => { event.preventDefault(); void validate(code); }}>
      <label>Código del boleto<input value={code} onChange={event => setCode(event.target.value)} autoComplete="off" /></label>
      <button className="btn btn-outline" disabled={busy || !code.trim()}>Validar código</button>
    </form>}
    {busy && <p role="status">Confirmando entrada…</p>}
    {result && <div className={result.ok ? 'success-notice' : 'notice'} role="status">
      <strong>{result.ok ? 'Acceso autorizado' : 'Acceso sin confirmar'}</strong>
      <p>{result.message}</p>
      {result.seat && <p>{result.seat}</p>}
      {result.time && <p>{new Date(result.time).toLocaleString('es-GT')}</p>}
    </div>}
  </section>;
}

export function ScannerModal({ onClose }: { onClose: () => void }) {
  return <Modal isOpen onClose={onClose} title="Validar entrada"><TicketScanner /></Modal>;
}
