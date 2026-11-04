import React, { useState, useRef, useEffect } from 'react';
import { LoadState } from './common/LoadState';
import { api } from '../api/client';
import { RecintoPublico, LocalidadMapa, DatosLocalidadRequest, PoligonoGeo } from '../types/api';
import { 
  Upload, 
  PenTool, 
  Check, 
  Trash2, 
  Undo, 
  X, 
  Layers, 
  Info, 
  Eye, 
  Sparkles, 
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Plus,
  Building2,
  Loader2
} from 'lucide-react';

const COLOR_PALETTE = [
  { name: 'Cyber Red', hex: '#FF3823' },
  { name: 'Electric Blue', hex: '#2563EB' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Royal Purple', hex: '#8B5CF6' },
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Neon Pink', hex: '#EC4899' },
  { name: 'Cyan Glow', hex: '#06B6D4' },
];

export const VenueMapEditor: React.FC = () => {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recintos, setRecintos] = useState<RecintoPublico[]>([]);
  const [selectedRecintoId, setSelectedRecintoId] = useState<number>(0);
  const [localidades, setLocalidades] = useState<LocalidadMapa[]>([]);
  const [imagenPlano, setImagenPlano] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modal para crear nuevo recinto
  const [isCrearRecintoModalOpen, setIsCrearRecintoModalOpen] = useState<boolean>(false);
  const [nuevoRecintoNombre, setNuevoRecintoNombre] = useState<string>('');
  const [nuevoRecintoCiudad, setNuevoRecintoCiudad] = useState<string>('Ciudad de Guatemala');
  const [nuevoRecintoDireccion, setNuevoRecintoDireccion] = useState<string>('');
  const [nuevoRecintoCapacidad, setNuevoRecintoCapacidad] = useState<number>(15000);
  const [isGuardandoRecinto, setIsGuardandoRecinto] = useState<boolean>(false);

  // Estados del Modo Dibujo de Vectores
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);
  const [cursorPos, setCursorPos] = useState<[number, number] | null>(null);
  const [selectedLocalidad, setSelectedLocalidad] = useState<LocalidadMapa | null>(null);
  const [hoveredLocalidadId, setHoveredLocalidadId] = useState<number | null>(null);

  // Formulario de Localidad (al cerrar polígono o editar)
  const [nombreLocalidad, setNombreLocalidad] = useState<string>('');
  const [capacidadLocalidad, setCapacidadLocalidad] = useState<number>(500);
  const [colorLocalidad, setColorLocalidad] = useState<string>('#FF3823');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cargar recintos reales del usuario autenticado
  const cargarRecintos = async () => {
    setLoadError(null);
    setIsLoading(true);
    try {
      const res = await api.getRecintos();
      const lista: RecintoPublico[] = Array.isArray(res) ? res : (res as any)?.items || [];
      if (lista.length > 0) {
        setRecintos(lista);
        setSelectedRecintoId((prev) => {
          if (prev && lista.some((r) => r.id === prev)) return prev;
          return lista[0].id;
        });
      } else {
        setRecintos([]);
        setSelectedRecintoId(0);
      }
    } catch (err: any) {
      setRecintos([]); setSelectedRecintoId(0);
      setLoadError(err?.detail || 'No se pudieron cargar los recintos.');
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    cargarRecintos();
  }, []);

  useEffect(() => {
    let active = true;
    setLocalidades([]); setImagenPlano('');
    setSelectedLocalidad(null); setIsFormOpen(false); setIsDrawing(false); setCurrentPoints([]);
    if (!selectedRecintoId) return;
    setIsLoading(true); setLoadError(null);
    api.getMapaRecinto(selectedRecintoId).then(mapa => {
      if (active) { setLocalidades(mapa.localidades || []); setImagenPlano(mapa.imagenPlanoUrl || ''); }
    }).catch((err: any) => {
      if (active) setLoadError(err?.detail || 'No se pudo cargar el plano del recinto.');
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [selectedRecintoId]);

  const handleCrearRecinto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoRecintoNombre.trim()) {
      alert('Por favor ingresa el nombre del recinto.');
      return;
    }
    setIsGuardandoRecinto(true);
    try {
      const creado = await api.crearRecinto({
        nombre: nuevoRecintoNombre.trim(),
        ciudad: nuevoRecintoCiudad.trim() || undefined,
        direccion: nuevoRecintoDireccion.trim() || undefined,
        capacidadTotal: Number(nuevoRecintoCapacidad) || 15000,
      });
      mostrarFeedback(`¡Recinto "${creado.nombre}" registrado con éxito!`, 'success');
      setIsCrearRecintoModalOpen(false);
      setNuevoRecintoNombre('');
      setNuevoRecintoDireccion('');
      await cargarRecintos();
      if (creado.id) {
        setSelectedRecintoId(creado.id);
      }
    } catch (err: any) {
      console.error('[VenueMapEditor] Error al crear recinto:', err);
      const msg = err?.detail || err?.title || 'No se pudo crear el recinto.';
      alert(`Error al registrar el recinto:\n${msg}`);
    } finally {
      setIsGuardandoRecinto(false);
    }
  };

  const recintoActual: RecintoPublico = recintos.find((r) => r.id === selectedRecintoId) || recintos[0] || {
    id: 0,
    duenoId: 0,
    nombre: 'Sin recintos registrados',
    ciudad: '',
    capacidadTotal: 0,
    activo: true,
  };
  const capacidadAsignada = localidades.reduce((acc, l) => acc + (l.capacidad || 0), 0);
  const capacidadExcedida = (recintoActual.capacidadTotal || 0) > 0 ? capacidadAsignada > (recintoActual.capacidadTotal || 0) : false;

  // Manejo de coordenadas del cursor en el sistema SVG (1000 x 562)
  const getSvgCoordinates = (e: React.MouseEvent<SVGSVGElement>): [number, number] => {
    if (!svgRef.current) return [0, 0];
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1000;
    const y = ((e.clientY - rect.top) / rect.height) * 562;
    return [Math.round(x), Math.round(y)];
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getSvgCoordinates(e);
    setCursorPos(coords);
  };

  const handleSvgMouseLeave = () => {
    setCursorPos(null);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    const [x, y] = getSvgCoordinates(e);

    // Si ya tiene al menos 3 puntos y hace clic cerca del primer punto, cerramos automáticamente
    if (currentPoints.length >= 3) {
      const [firstX, firstY] = currentPoints[0];
      const dist = Math.hypot(x - firstX, y - firstY);
      if (dist < 20) {
        finalizarTrazo();
        return;
      }
    }

    setCurrentPoints((prev) => [...prev, [x, y]]);
  };

  const handleUndoPoint = () => {
    setCurrentPoints((prev) => prev.slice(0, -1));
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setCurrentPoints([]);
    setCursorPos(null);
  };

  const finalizarTrazo = () => {
    if (currentPoints.length < 3) {
      alert('Un polígono válido requiere al menos 3 vértices distintos.');
      return;
    }
    setIsDrawing(false);
    setNombreLocalidad(`Zona ${localidades.length + 1}`);
    setCapacidadLocalidad(250);
    setColorLocalidad(COLOR_PALETTE[localidades.length % COLOR_PALETTE.length].hex);
    setSelectedLocalidad(null);
    setIsFormOpen(true);
  };

  const handleGuardarLocalidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecintoId || loadError || isLoading) return;
    if (!nombreLocalidad.trim()) {
      alert('Ingresa un nombre para la localidad.');
      return;
    }
    if (capacidadLocalidad <= 0) {
      alert('La capacidad debe ser un número mayor a cero.');
      return;
    }

    const poligonoFinal: PoligonoGeo | null = selectedLocalidad?.geometria
      ? selectedLocalidad.geometria
      : currentPoints.length >= 3
        ? { type: 'polygon', points: currentPoints }
        : null;

    if (!poligonoFinal || poligonoFinal.points.length < 3) {
      alert('Debes trazar al menos 3 vértices para definir la localidad antes de guardar.');
      return;
    }


    const payload: DatosLocalidadRequest = {
      nombre: nombreLocalidad.trim(),
      capacidad: capacidadLocalidad,
      color: colorLocalidad.toUpperCase(),
      geometria: poligonoFinal,
    };

    try {
      if (selectedLocalidad) {
        // Actualizar existente
        await api.actualizarLocalidad(selectedRecintoId, selectedLocalidad.id, payload);
        setLocalidades((prev) =>
          prev.map((loc) =>
            loc.id === selectedLocalidad.id
              ? { ...loc, ...payload, colorHex: payload.color || '#FF3823' }
              : loc
          )
        );
        mostrarFeedback('Localidad actualizada con éxito en la base de datos.', 'success');
      } else {
        // Crear nueva
        const creada = await api.crearLocalidad(selectedRecintoId, payload);
        if (!creada?.id) throw { detail: 'El servidor no confirmó la localidad creada.' };
        const nuevaLoc: LocalidadMapa = {
          id: creada.id,
          recintoId: selectedRecintoId,
          nombre: payload.nombre,
          capacidad: payload.capacidad,
          color: payload.color,
          colorHex: payload.color,
          geometria: payload.geometria,
          cupoDisponible: payload.capacidad,
          precioMinimo: 350.0,
          activo: true,
        };
        setLocalidades((prev) => [...prev, nuevaLoc]);
        mostrarFeedback('¡Nueva localidad y vector guardados con éxito!', 'success');
      }

      setIsFormOpen(false);
      setCurrentPoints([]);
      setSelectedLocalidad(null);
    } catch (err: any) {
      console.error('[VenueMapEditor] Error al guardar localidad:', err);
      const mensaje =
        err?.detail ||
        err?.title ||
        (err instanceof Error ? err.message : null) ||
        JSON.stringify(err) ||
        'Error desconocido al guardar la localidad.';
      alert(`Error al guardar la localidad:\n${mensaje}`);
    }
  };

  const handleEliminarLocalidad = async (id: number) => {
    if (!confirm('¿Deseas eliminar esta localidad del plano?')) return;
    try {
      await api.eliminarLocalidad(selectedRecintoId, id);
      setLocalidades((prev) => prev.filter((loc) => loc.id !== id));
      if (selectedLocalidad?.id === id) {
        setSelectedLocalidad(null);
        setIsFormOpen(false);
      }
      mostrarFeedback('Localidad eliminada.', 'info');
    } catch (err: any) {
      console.error('[VenueMapEditor] Error al eliminar localidad:', err);
      const mensaje =
        err?.detail ||
        err?.title ||
        (err instanceof Error ? err.message : null) ||
        'Error al eliminar la localidad.';
      alert(`Error al eliminar la localidad:\n${mensaje}`);
    }
  };

  // Subir imagen de plano
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRecintoId || loadError) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      alert('Formato no admitido. Sube una imagen PNG, JPG o WEBP.');
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      alert('La imagen no debe superar los 6 MB.');
      return;
    }

    // Previsualización local inmediata
    const localUrl = URL.createObjectURL(file);
    const anterior = imagenPlano;
    setImagenPlano(localUrl);

    try {
      setIsLoading(true);
      const res = await api.subirPlanoRecinto(selectedRecintoId, file);
      if (!res?.url) throw { detail: 'El servidor no confirmó la imagen guardada.' };
      setImagenPlano(res.url);
      mostrarFeedback('¡Foto del plano del recinto subida con éxito al servidor!', 'success');
    } catch (err: any) {
      setImagenPlano(anterior);
      mostrarFeedback(err?.detail || 'No se pudo guardar el plano.', 'error');
    } finally {
      URL.revokeObjectURL(localUrl);
      setIsLoading(false);
    }
  };

  const mostrarFeedback = (text: string, type: 'success' | 'error' | 'info') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  const pointsToSvgString = (points: [number, number][]) => {
    return points.map(([x, y]) => `${x},${y}`).join(' ');
  };

  const getPolygonCentroid = (points: [number, number][]): [number, number] => {
    if (points.length === 0) return [0, 0];
    const sum = points.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
    return [Math.round(sum[0] / points.length), Math.round(sum[1] / points.length)];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <LoadState loading={isLoading} error={loadError} empty={!recintos.length} emptyMessage="No hay recintos registrados." onRetry={cargarRecintos} />
      {/* Barra de Notificaciones Feedback */}
      {feedbackMsg && (
        <div style={{
          backgroundColor: feedbackMsg.type === 'success' ? '#064E3B' : feedbackMsg.type === 'error' ? '#7F1D1D' : '#1E3A8A',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: 'var(--radius-xs)',
          border: '2px solid var(--border-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          boxShadow: 'var(--shadow-crisp-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} />
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Control Bar & Toolbar */}
      <div style={{
        backgroundColor: 'var(--bg-canvas)',
        border: '2px solid var(--border-strong)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-crisp-sm)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        {/* Selector de Recinto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              RECINTO EN EDICIÓN
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
              disabled={isLoading}
                value={selectedRecintoId}
                onChange={(e) => setSelectedRecintoId(Number(e.target.value))}
                className="input"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  minWidth: '260px',
                  padding: '8px 12px'
                }}
              >
                {recintos.length === 0 ? (
                  <option value={0}>Sin recintos registrados</option>
                ) : (
                  recintos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} ({r.ciudad || 'Guatemala'})
                    </option>
                  ))
                )}
              </select>

              <button
                type="button"
                onClick={() => setIsCrearRecintoModalOpen(true)}
                className="btn btn-outline"
                style={{ gap: '6px', whiteSpace: 'nowrap' }}
                title="Registrar un nuevo recinto"
              >
                <Plus size={16} />
                Nuevo Recinto
              </button>
            </div>
          </div>

          <div style={{ borderLeft: '2px solid var(--border-subtle)', paddingLeft: '16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              CAPACIDAD AUTORIZADA
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 800 }}>
              {capacidadAsignada.toLocaleString()} / {(recintoActual.capacidadTotal || 0).toLocaleString()} pax
            </div>
            {capacidadExcedida && (
              <div style={{ color: 'var(--accent-coral)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={12} /> Suma excede capacidad del recinto
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Subir Foto / Plano Input oculto */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            style={{ display: 'none' }}
          />

          <button
            disabled={!selectedRecintoId || isLoading || !!loadError}
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-outline"
            style={{ gap: '8px' }}
            title="Subir imagen aérea o plano arquitectónico del recinto"
          >
            <Upload size={16} />
            Subir Foto / Plano
          </button>



          {!isDrawing ? (
            <button
              disabled={!selectedRecintoId || isLoading || !!loadError}
              onClick={() => {
                if (!selectedRecintoId || isLoading || loadError) return;
                setIsDrawing(true);
                setCurrentPoints([]);
                setSelectedLocalidad(null);
                setIsFormOpen(false);
              }}
              className="btn btn-primary"
              style={{ gap: '8px' }}
            >
              <PenTool size={16} />
              Trazar Nueva Localidad
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleUndoPoint}
                disabled={currentPoints.length === 0}
                className="btn btn-sm btn-outline"
                style={{ gap: '6px' }}
              >
                <Undo size={14} />
                Deshacer ({currentPoints.length})
              </button>

              <button
                onClick={finalizarTrazo}
                disabled={currentPoints.length < 3}
                className="btn btn-sm btn-primary"
                style={{ gap: '6px', backgroundColor: '#059669' }}
              >
                <Check size={14} />
                Cerrar Polígono
              </button>

              <button
                onClick={handleCancelDrawing}
                className="btn btn-sm btn-outline"
                style={{ color: 'var(--accent-coral)' }}
              >
                <X size={14} />
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isFormOpen ? '1fr 360px' : '1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Canvas Card */}
        <div style={{
          backgroundColor: '#0A0C10',
          border: '2px solid var(--border-strong)',
          borderRadius: 'var(--radius-xs)',
          padding: '16px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-crisp-md)'
        }}>
          {/* Canvas HUD Overlay */}
          <div style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            zIndex: 10,
            display: 'flex',
            gap: '12px'
          }}>
            <div style={{
              backgroundColor: 'rgba(10, 12, 16, 0.85)',
              border: '1px solid #374151',
              padding: '6px 12px',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backdropFilter: 'blur(4px)'
            }}>
              <Layers size={14} color="#60A5FA" />
              <span>{localidades.length} Zonas trazadas</span>
              {cursorPos && (
                <span style={{ borderLeft: '1px solid #4B5563', paddingLeft: '8px', color: '#F3F4F6' }}>
                  X: {cursorPos[0]} · Y: {cursorPos[1]}
                </span>
              )}
            </div>

            {isDrawing && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                color: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'pulse 2s infinite'
              }}>
                <PenTool size={14} />
                <span>
                  {currentPoints.length === 0
                    ? 'Haz clic en el plano para iniciar el polígono'
                    : `${currentPoints.length} vértices colocados (clic en el primero para cerrar)`}
                </span>
              </div>
            )}
          </div>

          {/* SVG Vector Canvas */}
          <div style={{ position: 'relative', width: '100%', height: 'auto' }}>
            <svg
              ref={svgRef}
              viewBox="0 0 1000 562"
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={handleSvgMouseLeave}
              onClick={handleSvgClick}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                cursor: isDrawing ? 'crosshair' : 'default',
                borderRadius: '4px',
                userSelect: 'none'
              }}
            >
              {/* Imagen de fondo del plano o recinto */}
              <image
                href={imagenPlano}
                width="1000"
                height="562"
                preserveAspectRatio="xMidYMid slice"
                style={{ opacity: 0.88 }}
              />

              {/* Cuadrícula sutil de referencia */}
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="1000" height="562" fill="url(#grid)" pointerEvents="none" />

              {/* Polígonos de Localidades ya guardadas */}
              {localidades.map((loc) => {
                if (!loc.geometria?.points || loc.geometria.points.length < 3) return null;
                const isSelected = selectedLocalidad?.id === loc.id;
                const isHovered = hoveredLocalidadId === loc.id;
                const color = loc.color || loc.colorHex || '#2563EB';
                const centroid = getPolygonCentroid(loc.geometria.points);

                return (
                  <g
                    key={loc.id}
                    onClick={(e) => {
                      if (!isDrawing) {
                        e.stopPropagation();
                        setSelectedLocalidad(loc);
                        setNombreLocalidad(loc.nombre);
                        setCapacidadLocalidad(loc.capacidad);
                        setColorLocalidad(color);
                        setIsFormOpen(true);
                      }
                    }}
                    onMouseEnter={() => setHoveredLocalidadId(loc.id)}
                    onMouseLeave={() => setHoveredLocalidadId(null)}
                    style={{ cursor: isDrawing ? 'crosshair' : 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <polygon
                      points={pointsToSvgString(loc.geometria.points)}
                      fill={color}
                      fillOpacity={isSelected ? 0.85 : isHovered ? 0.65 : 0.42}
                      stroke={isSelected ? '#FFFFFF' : color}
                      strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.5}
                      strokeLinejoin="round"
                    />

                    {/* Vértices destacados al seleccionar */}
                    {isSelected && loc.geometria.points.map(([px, py], idx) => (
                      <circle
                        key={idx}
                        cx={px}
                        cy={py}
                        r="4.5"
                        fill="#FFFFFF"
                        stroke={color}
                        strokeWidth="2"
                      />
                    ))}

                    {/* Etiqueta centrada en la localidad */}
                    <g pointerEvents="none">
                      <rect
                        x={centroid[0] - 65}
                        y={centroid[1] - 14}
                        width="130"
                        height="26"
                        rx="4"
                        fill="rgba(10, 12, 16, 0.88)"
                        stroke={isSelected ? '#FFFFFF' : color}
                        strokeWidth="1"
                      />
                      <text
                        x={centroid[0]}
                        y={centroid[1] + 3}
                        fill="#FFFFFF"
                        fontSize="11"
                        fontWeight="800"
                        fontFamily="Syne, sans-serif"
                        textAnchor="middle"
                        letterSpacing="0.5"
                      >
                        {loc.nombre.toUpperCase()}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Trazado interactivo en progreso (Modo Dibujo) */}
              {isDrawing && currentPoints.length > 0 && (
                <g pointerEvents="none">
                  {/* Polígono preliminar transparente */}
                  {currentPoints.length >= 3 && (
                    <polygon
                      points={pointsToSvgString(currentPoints)}
                      fill={colorLocalidad}
                      fillOpacity="0.25"
                      stroke="none"
                    />
                  )}

                  {/* Líneas entre los puntos ya marcados */}
                  <polyline
                    points={pointsToSvgString(currentPoints)}
                    fill="none"
                    stroke="#FF3823"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                  />

                  {/* Línea elástica (rubber-band) hacia el cursor */}
                  {cursorPos && (
                    <line
                      x1={currentPoints[currentPoints.length - 1][0]}
                      y1={currentPoints[currentPoints.length - 1][1]}
                      x2={cursorPos[0]}
                      y2={cursorPos[1]}
                      stroke="#FF3823"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      opacity="0.85"
                    />
                  )}

                  {/* Círculos en cada vértice colocado */}
                  {currentPoints.map(([px, py], index) => {
                    const isFirst = index === 0;
                    return (
                      <g key={index}>
                        <circle
                          cx={px}
                          cy={py}
                          r={isFirst ? 8 : 6}
                          fill={isFirst ? '#10B981' : '#FF3823'}
                          stroke="#FFFFFF"
                          strokeWidth="2"
                        />
                        <text
                          x={px}
                          y={py - 10}
                          fill="#FFFFFF"
                          fontSize="10"
                          fontWeight="700"
                          fontFamily="var(--font-mono)"
                          textAnchor="middle"
                        >
                          P{index + 1}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}
            </svg>
          </div>

          {/* Canvas Footer Bar */}
          <div style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: '#9CA3AF'
          }}>
            <div>
              💡 <strong>Instrucciones:</strong> Clic sobre el plano para agregar vértices de la localidad. Al marcar ≥3 puntos, haz clic en el punto verde P1 o pulsa "Cerrar Polígono".
            </div>
            <div>
              Resolución base: 1000 × 562 px
            </div>
          </div>
        </div>

        {/* Panel Lateral: Formulario de la Localidad y Visor de Geometría JSONB */}
        {isFormOpen && (
          <div style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '2px solid var(--border-strong)',
            padding: '24px',
            boxShadow: 'var(--shadow-crisp-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border-strong)', paddingBottom: '12px' }}>
              <div>
                <span className="badge badge-categoria" style={{ marginBottom: '4px' }}>
                  {selectedLocalidad ? 'EDITAR LOCALIDAD' : 'NUEVA LOCALIDAD'}
                </span>
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Propiedades del Vector</h3>
              </div>
              <button
                onClick={() => {
                  setIsFormOpen(false);
                  setSelectedLocalidad(null);
                  setCurrentPoints([]);
                }}
                className="btn btn-sm btn-outline"
                style={{ padding: '4px 8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGuardarLocalidad} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Nombre de la Zona / Localidad</label>
                <input
                  type="text"
                  value={nombreLocalidad}
                  onChange={(e) => setNombreLocalidad(e.target.value)}
                  placeholder="Ej. VIP Front Stage, Platea Baja..."
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Capacidad Máxima (Aforo)</label>
                <input
                  type="number"
                  min="1"
                  value={capacidadLocalidad}
                  onChange={(e) => setCapacidadLocalidad(Number(e.target.value))}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Color de Zona en el Mapa</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColorLocalidad(c.hex)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '4px',
                        backgroundColor: c.hex,
                        border: colorLocalidad.toUpperCase() === c.hex ? '3px solid #000' : '1px solid rgba(0,0,0,0.2)',
                        cursor: 'pointer',
                        transform: colorLocalidad.toUpperCase() === c.hex ? 'scale(1.15)' : 'scale(1)'
                      }}
                      title={c.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={colorLocalidad}
                    onChange={(e) => setColorLocalidad(e.target.value)}
                    style={{
                      width: '32px',
                      height: '28px',
                      padding: 0,
                      border: '1px solid var(--border-strong)',
                      cursor: 'pointer'
                    }}
                    title="Color personalizado"
                  />
                </div>
              </div>

              {/* Visor Técnico de la Columna Geometría (JSONB) */}
              <div style={{
                backgroundColor: '#0F1117',
                border: '1px solid #374151',
                padding: '12px',
                borderRadius: '4px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  color: '#9CA3AF'
                }}>
                  <span>BD: localidades.geometria (JSONB)</span>
                  <button
                    type="button"
                    onClick={() => {
                      const geo = selectedLocalidad?.geometria || { type: 'polygon', points: currentPoints };
                      navigator.clipboard.writeText(JSON.stringify(geo, null, 2));
                      setCopiedJson(true);
                      setTimeout(() => setCopiedJson(false), 2000);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedJson ? '#10B981' : '#60A5FA',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Copy size={12} />
                    {copiedJson ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <pre style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  color: '#34D399',
                  margin: 0,
                  maxHeight: '110px',
                  overflowY: 'auto'
                }}>
                  {JSON.stringify(
                    selectedLocalidad?.geometria || {
                      type: 'polygon',
                      points: currentPoints,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>

              {/* Botones de Acción */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <Check size={16} />
                  {selectedLocalidad ? 'Actualizar' : 'Guardar Localidad'}
                </button>

                {selectedLocalidad && (
                  <button
                    type="button"
                    onClick={() => handleEliminarLocalidad(selectedLocalidad.id)}
                    className="btn btn-outline"
                    style={{ color: 'var(--accent-coral)' }}
                    title="Eliminar esta zona"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Lista Resumen de Localidades Actuales del Recinto */}
      <div style={{
        backgroundColor: 'var(--bg-canvas)',
        border: '2px solid var(--border-strong)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-crisp-sm)'
      }}>
        <h4 style={{ fontSize: '1.1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} />
          Inventario de Zonas Configuradas ({localidades.length})
        </h4>

        {localidades.length === 0 ? (
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No hay localidades creadas aún en este recinto. Pulsa "Trazar Nueva Localidad" para comenzar a dibujar vectores sobre la foto.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '12px'
          }}>
            {localidades.map((loc) => {
              const color = loc.color || loc.colorHex || '#2563EB';
              const verticesCount = loc.geometria?.points?.length || 0;

              return (
                <div
                  key={loc.id}
                  onClick={() => {
                    setSelectedLocalidad(loc);
                    setNombreLocalidad(loc.nombre);
                    setCapacidadLocalidad(loc.capacidad);
                    setColorLocalidad(color);
                    setIsFormOpen(true);
                  }}
                  style={{
                    border: '2px solid var(--border-strong)',
                    borderLeft: `8px solid ${color}`,
                    padding: '12px 14px',
                    backgroundColor: 'var(--bg-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{loc.nombre}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Capacidad: {loc.capacidad.toLocaleString()} pax · {verticesCount} vértices
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEliminarLocalidad(loc.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    title="Eliminar zona"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Registrar Nuevo Recinto */}
      {isCrearRecintoModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCrearRecintoModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '2px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-canvas)'
            }}>
              <div>
                <span className="badge badge-categoria" style={{ marginBottom: '4px' }}>
                  INFRAESTRUCTURA & RECINTOS
                </span>
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Registrar Nuevo Recinto</h3>
              </div>
              <button 
                onClick={() => setIsCrearRecintoModalOpen(false)} 
                className="btn btn-sm btn-outline"
                style={{ padding: '4px 8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCrearRecinto} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Nombre del Recinto *</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Ej. Explanada Cardales de Cayalá"
                  value={nuevoRecintoNombre}
                  onChange={(e) => setNuevoRecintoNombre(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Ciudad *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="Guatemala"
                    value={nuevoRecintoCiudad}
                    onChange={(e) => setNuevoRecintoCiudad(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Capacidad Total *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="input"
                    placeholder="15000"
                    value={nuevoRecintoCapacidad}
                    onChange={(e) => setNuevoRecintoCapacidad(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Dirección</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej. Boulevard Rafael Landívar 10-05, Zona 16"
                  value={nuevoRecintoDireccion}
                  onChange={(e) => setNuevoRecintoDireccion(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsCrearRecintoModalOpen(false)}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isGuardandoRecinto}
                  className="btn btn-primary"
                  style={{ gap: '6px' }}
                >
                  {isGuardandoRecinto ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={16} />}
                  Crear Recinto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
