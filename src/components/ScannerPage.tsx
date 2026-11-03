import React, { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileImage,
  Loader2,
  QrCode,
  Upload,
  XCircle,
} from 'lucide-react';

type ResultadoEscaneo = {
  tipo: 'EXITO' | 'RECHAZADO';
  mensaje: string;
  publicId?: string;
  fechaUso?: string;
  ubicacion?: string;
};

const TAMANO_MAXIMO_ARCHIVO = 20 * 1024 * 1024;
const MAX_PAGINAS_PDF = 20;

const obtenerMensajeError = (error: unknown) => {
  const problem = error as { status?: number; detail?: string; title?: string };
  if (problem?.status === 409) return 'Boleto ya utilizado, anulado o no habilitado para ingresar.';
  if (problem?.status === 404) return 'No se encontró un boleto válido para este recinto.';
  if (problem?.status === 422) return 'El código QR no tiene una firma válida.';
  if (problem?.detail) return problem.detail;
  if (problem?.title) return problem.title;
  return 'No se pudo validar el boleto. Revisa la conexión e intenta nuevamente.';
};

const esArchivoImagen = (file: File) =>
  ['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif', 'image/tiff'].includes(file.type)
  || /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(file.name);

export const ScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lectorRef = useRef<BrowserQRCodeReader | null>(null);
  const validandoRef = useRef(false);
  const montadoRef = useRef(true);
  const [codigoQr, setCodigoQr] = useState('');
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [leyendoArchivo, setLeyendoArchivo] = useState(false);
  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEscaneo | null>(null);
  const [mensajeArchivo, setMensajeArchivo] = useState<string | null>(null);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  const detenerCamara = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCamaraActiva(false);
  };

  const validarCodigo = async (codigo: string) => {
    const token = codigo.trim();
    if (!token || validandoRef.current) return;

    validandoRef.current = true;
    setValidando(true);
    setResultado(null);
    setCodigoQr(token);

    try {
      const validacion = await api.validarBoleto(token);
      const ubicacion = validacion.ubicacion
        ? [
            validacion.ubicacion.mesa ? `Mesa ${validacion.ubicacion.mesa}` : null,
            validacion.ubicacion.fila ? `Fila ${validacion.ubicacion.fila}` : null,
            `Silla ${validacion.ubicacion.silla}`,
          ].filter(Boolean).join(' · ')
        : undefined;
      setResultado({
        tipo: 'EXITO',
        mensaje: 'Entrada registrada. Este boleto ya no se puede reutilizar.',
        publicId: validacion.publicId,
        fechaUso: validacion.fechaUso,
        ubicacion,
      });
    } catch (error) {
      setResultado({ tipo: 'RECHAZADO', mensaje: obtenerMensajeError(error) });
    } finally {
      validandoRef.current = false;
      setValidando(false);
    }
  };

  const iniciarCamara = async () => {
    setResultado(null);
    setErrorCamara(null);
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setErrorCamara('La cámara requiere permiso del navegador y una conexión HTTPS o localhost.');
      return;
    }

    try {
      const lector = lectorRef.current || new BrowserQRCodeReader();
      lectorRef.current = lector;
      let codigoLeido = false;
      const controls = await lector.decodeFromVideoDevice(undefined, videoRef.current || undefined, (result) => {
        if (!montadoRef.current || !result || validandoRef.current) return;
        codigoLeido = true;
        controlsRef.current?.stop();
        controlsRef.current = null;
        setCamaraActiva(false);
        void validarCodigo(result.getText());
      });
      if (!montadoRef.current) {
        controls.stop();
        return;
      }
      if (codigoLeido) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
      setCamaraActiva(true);
    } catch {
      if (!montadoRef.current) return;
      detenerCamara();
      setErrorCamara('No se pudo iniciar la cámara. Revisa el permiso del navegador o usa una imagen/PDF.');
    }
  };

  const leerImagen = async (file: File, lector: BrowserQRCodeReader) => {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const maxDimension = 2800;
      const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo procesar la imagen.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      try {
        return lector.decodeFromCanvas(canvas).getText();
      } catch {
        throw new Error('No se encontró un código QR en la imagen.');
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const leerPdf = async (file: File, lector: BrowserQRCodeReader) => {
    const [{ GlobalWorkerOptions, getDocument }, { default: pdfWorkerUrl }] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const pdf = await task.promise;
    try {
      const paginasARevisar = Math.min(pdf.numPages, MAX_PAGINAS_PDF);
      for (let pageNumber = 1; pageNumber <= paginasARevisar; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const originalViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(2.5, 2600 / Math.max(originalViewport.width, originalViewport.height));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) continue;

        await page.render({ canvas, canvasContext: context, viewport }).promise;
        try {
          return lector.decodeFromCanvas(canvas).getText();
        } catch {
          // Un QR ausente en esta página es normal; se continúa hasta el límite seguro.
        } finally {
          page.cleanup();
          canvas.width = 0;
          canvas.height = 0;
        }
      }

      if (pdf.numPages > MAX_PAGINAS_PDF) {
        throw new Error(`No se encontró un QR en las primeras ${MAX_PAGINAS_PDF} páginas del PDF.`);
      }
      throw new Error('No se encontró ningún QR en el PDF.');
    } finally {
      await task.destroy();
    }
  };

  const procesarArchivo = async (file?: File) => {
    if (!file) return;
    setResultado(null);
    setMensajeArchivo(null);
    setErrorCamara(null);

    if (file.size > TAMANO_MAXIMO_ARCHIVO) {
      setMensajeArchivo('El archivo supera el máximo de 20 MB.');
      return;
    }
    const esPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!esPdf && !esArchivoImagen(file)) {
      setMensajeArchivo('Sube una imagen PNG, JPG, WEBP o un documento PDF.');
      return;
    }

    detenerCamara();
    setLeyendoArchivo(true);
    try {
      const lector = lectorRef.current || new BrowserQRCodeReader();
      lectorRef.current = lector;
      const codigo = esPdf ? await leerPdf(file, lector) : await leerImagen(file, lector);
      setMensajeArchivo(`QR encontrado en ${file.name}. Registrando entrada…`);
      await validarCodigo(codigo);
    } catch (error) {
      setMensajeArchivo(error instanceof Error ? error.message : 'No se pudo leer el QR del archivo.');
    } finally {
      setLeyendoArchivo(false);
    }
  };

  const handleEnviarCodigo = (event: React.FormEvent) => {
    event.preventDefault();
    detenerCamara();
    void validarCodigo(codigoQr);
  };

  const ocupado = leyendoArchivo || validando;

  return (
    <div className="container" style={{ padding: '42px 24px 80px' }}>
      <button type="button" onClick={() => navigate(-1)} className="btn btn-sm btn-outline" style={{ marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Volver
      </button>

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px', borderBottom: '2px solid var(--border-strong)', paddingBottom: '20px' }}>
          <span className="badge badge-categoria" style={{ marginBottom: '8px' }}>CONTROL DE ACCESO</span>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Validar boleto y registrar entrada
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '720px' }}>
            Escanea el QR con la cámara o carga una imagen/PDF. Cada boleto válido se marca como usado una sola vez.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '24px', alignItems: 'start' }}>
          <section className="card-brutal" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Camera size={22} color="var(--accent-cobalt)" />
              <div>
                <h2 style={{ fontSize: '1.2rem' }}>Escanear con cámara</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Usa la cámara trasera del dispositivo cuando esté disponible.</p>
              </div>
            </div>

            <div style={{ background: '#121316', border: '2px solid var(--border-strong)', minHeight: '240px', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
              <video
                ref={videoRef}
                muted
                playsInline
                aria-label="Vista de la cámara para escanear códigos QR"
                style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', display: camaraActiva ? 'block' : 'none' }}
              />
              {!camaraActiva && (
                <div style={{ color: '#fff', textAlign: 'center', padding: '32px' }}>
                  <QrCode size={46} style={{ marginBottom: '8px', opacity: 0.75 }} />
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>La vista de cámara aparecerá aquí.</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              {!camaraActiva ? (
                <button type="button" onClick={iniciarCamara} disabled={ocupado} className="btn btn-primary" style={{ flex: 1 }}>
                  <Camera size={17} /> Iniciar cámara
                </button>
              ) : (
                <button type="button" onClick={detenerCamara} className="btn btn-outline" style={{ flex: 1 }}>
                  Detener cámara
                </button>
              )}
            </div>
            {errorCamara && <p role="alert" style={{ color: 'var(--accent-vermilion)', fontSize: '0.82rem', marginTop: '10px' }}>{errorCamara}</p>}
          </section>

          <section className="card-brutal" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <FileImage size={22} color="var(--accent-vermilion)" />
              <div>
                <h2 style={{ fontSize: '1.2rem' }}>Cargar imagen o PDF</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>El archivo se procesa en este dispositivo; no se almacena ni se envía al servidor.</p>
              </div>
            </div>

            <label htmlFor="ticket-qr-file" style={{
              minHeight: '240px', padding: '24px', border: '2px dashed var(--border-medium)', background: 'var(--bg-canvas)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', cursor: ocupado ? 'wait' : 'pointer',
            }}>
              {leyendoArchivo ? <Loader2 className="spin" size={44} color="var(--accent-cobalt)" /> : <Upload size={42} color="var(--accent-cobalt)" />}
              <strong style={{ marginTop: '12px' }}>{leyendoArchivo ? 'Buscando código QR…' : 'Elegir archivo'}</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '5px' }}>PNG, JPG, WEBP, BMP, GIF, TIFF o PDF · máximo 20 MB</span>
              <input
                id="ticket-qr-file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/bmp,image/gif,image/tiff,application/pdf,.pdf"
                disabled={ocupado}
                onChange={(event) => {
                  const selected = event.currentTarget.files?.[0];
                  event.currentTarget.value = '';
                  void procesarArchivo(selected);
                }}
                style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
              />
            </label>
            {mensajeArchivo && <p role="status" style={{ color: mensajeArchivo.includes('QR encontrado') ? 'var(--accent-emerald)' : 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '10px' }}>{mensajeArchivo}</p>}
          </section>
        </div>

        <section className="card-brutal" style={{ padding: '24px', marginTop: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Entrada manual</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '12px' }}>Úsala si un lector USB ya escribió el contenido del QR en el campo.</p>
          <form onSubmit={handleEnviarCodigo} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <input
              type="text"
              className="input-brutal"
              aria-label="Código del boleto"
              autoComplete="off"
              placeholder="Código QR del boleto…"
              value={codigoQr}
              onChange={(event) => setCodigoQr(event.target.value)}
              style={{ flex: '1 1 320px' }}
            />
            <button type="submit" disabled={!codigoQr.trim() || ocupado} className="btn btn-inverse">
              {validando ? <Loader2 className="spin" size={17} /> : <QrCode size={17} />}
              Validar boleto
            </button>
          </form>
        </section>

        {ocupado && (
          <div role="status" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 22px', marginTop: '24px', background: 'var(--accent-cobalt-soft)', border: '2px solid var(--accent-cobalt)' }}>
            <Loader2 className="spin" size={20} />
            <span>{leyendoArchivo ? 'Leyendo el código del archivo…' : 'Validando el boleto y registrando la entrada…'}</span>
          </div>
        )}

        {resultado && (
          <div role="status" style={{
            display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '22px', marginTop: '24px',
            border: `2px solid ${resultado.tipo === 'EXITO' ? 'var(--accent-emerald)' : 'var(--accent-vermilion)'}`,
            background: resultado.tipo === 'EXITO' ? 'var(--accent-emerald-soft)' : 'var(--accent-vermilion-soft)',
            boxShadow: 'var(--shadow-crisp)',
          }}>
            {resultado.tipo === 'EXITO'
              ? <CheckCircle2 size={28} color="var(--accent-emerald)" />
              : <XCircle size={28} color="var(--accent-vermilion)" />}
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.25rem', color: resultado.tipo === 'EXITO' ? 'var(--accent-emerald)' : 'var(--accent-vermilion)' }}>
                {resultado.tipo === 'EXITO' ? 'Entrada autorizada' : 'Acceso rechazado'}
              </h2>
              <p style={{ marginTop: '4px' }}>{resultado.mensaje}</p>
              {resultado.tipo === 'EXITO' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', marginTop: '12px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  {resultado.publicId && <span>Boleto: {resultado.publicId.slice(0, 8).toUpperCase()}</span>}
                  {resultado.fechaUso && <span>Ingreso: {new Date(resultado.fechaUso).toLocaleString('es-GT')}</span>}
                  {resultado.ubicacion && <span>{resultado.ubicacion}</span>}
                </div>
              )}
              {resultado.tipo === 'EXITO' && (
                <button type="button" onClick={() => { setCodigoQr(''); setResultado(null); }} className="btn btn-sm btn-outline" style={{ marginTop: '16px' }}>
                  <QrCode size={15} /> Escanear siguiente boleto
                </button>
              )}
            </div>
            {resultado.tipo === 'RECHAZADO' && <AlertTriangle size={20} color="var(--accent-vermilion)" />}
          </div>
        )}
      </div>
    </div>
  );
};
