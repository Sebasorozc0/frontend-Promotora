import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { EventoCatalogo, LocalidadMapa, MapaRecinto } from '../types/api';
import { X, MapPin, Users, Ticket, CheckCircle2 } from 'lucide-react';

interface VenueMapModalProps {
  evento: EventoCatalogo;
  onClose: () => void;
  onSelectLocalidad?: (localidad: LocalidadMapa) => void;
}

export const VenueMapModal: React.FC<VenueMapModalProps> = ({
  evento,
  onClose,
  onSelectLocalidad,
}) => {
  const [mapa, setMapa] = useState<MapaRecinto | null>(null);
  const [selectedZone, setSelectedZone] = useState<LocalidadMapa | null>(null);
  const [hoveredZone, setHoveredZone] = useState<LocalidadMapa | null>(null);

  useEffect(() => {
    api.getMapaRecinto(evento.recintoId, evento.id).then((data) => {
      setMapa(data);
      if (data.localidades && data.localidades.length > 0) {
        setSelectedZone(data.localidades[0]);
      }
    });
  }, [evento]);

  const pointsToSvgString = (points: [number, number][]) => {
    return points.map(([x, y]) => `${x},${y}`).join(' ');
  };

  const getPolygonCentroid = (points: [number, number][]): [number, number] => {
    if (points.length === 0) return [0, 0];
    const sum = points.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
    return [Math.round(sum[0] / points.length), Math.round(sum[1] / points.length)];
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '920px' }}
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
              MAPA DE RECINTO Y LOCALIDADES VECTORIALES
            </span>
            <h2 style={{ fontSize: '1.4rem' }}>{evento.recintoNombre}</h2>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Evento: {evento.titulo} · Selecciona tu zona en el plano
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-sm btn-outline"
            style={{ padding: '6px 10px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          {/* Interactive SVG Stage Map with blueprint image and dynamic polygons */}
          <div style={{
            border: '2px solid var(--border-strong)',
            backgroundColor: '#0A0C10',
            borderRadius: 'var(--radius-xs)',
            padding: '16px',
            position: 'relative',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-crisp-sm)'
          }}>
            <svg 
              viewBox="0 0 1000 562" 
              style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }}
            >
              {/* Imagen de fondo del plano o recinto */}
              <image 
                href={mapa?.imagenPlanoUrl || '/venue_blueprint.jpg'} 
                width="1000" 
                height="562" 
                preserveAspectRatio="xMidYMid slice" 
                style={{ opacity: 0.88 }} 
              />

              {/* Cuadrícula técnica sutil */}
              <defs>
                <pattern id="modal-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="1000" height="562" fill="url(#modal-grid)" pointerEvents="none" />

              {/* Renderizado dinámico de localidades vectoriales */}
              {mapa?.localidades && mapa.localidades.map((loc) => {
                const isSelected = selectedZone?.id === loc.id;
                const isHovered = hoveredZone?.id === loc.id;
                const color = loc.color || loc.colorHex || '#2563EB';

                if (loc.geometria?.points && loc.geometria.points.length >= 3) {
                  const centroid = getPolygonCentroid(loc.geometria.points);
                  return (
                    <g 
                      key={loc.id}
                      onClick={() => setSelectedZone(loc)}
                      onMouseEnter={() => setHoveredZone(loc)}
                      onMouseLeave={() => setHoveredZone(null)}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      <polygon 
                        points={pointsToSvgString(loc.geometria.points)}
                        fill={color}
                        fillOpacity={isSelected ? 0.88 : isHovered ? 0.68 : 0.45}
                        stroke={isSelected ? '#FFFFFF' : color}
                        strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.5}
                        strokeLinejoin="round"
                      />

                      {/* Etiqueta identificadora centrada */}
                      <g pointerEvents="none">
                        <rect 
                          x={centroid[0] - 70}
                          y={centroid[1] - 16}
                          width="140"
                          height="32"
                          rx="4"
                          fill="rgba(10, 12, 16, 0.92)"
                          stroke={isSelected ? '#FFFFFF' : color}
                          strokeWidth="1.5"
                        />
                        <text 
                          x={centroid[0]} 
                          y={centroid[1] - 1} 
                          fill="#FFFFFF" 
                          fontSize="10" 
                          fontWeight="800" 
                          fontFamily="Syne, sans-serif" 
                          textAnchor="middle" 
                          letterSpacing="0.5"
                        >
                          {loc.nombre.toUpperCase()}
                        </text>
                        {loc.precioMinimo && (
                          <text 
                            x={centroid[0]} 
                            y={centroid[1] + 11} 
                            fill="#FDE047" 
                            fontSize="9" 
                            fontWeight="700" 
                            fontFamily="JetBrains Mono, monospace" 
                            textAnchor="middle"
                          >
                            Desde Q{loc.precioMinimo.toFixed(2)}
                          </text>
                        )}
                      </g>
                    </g>
                  );
                }
                return null;
              })}
            </svg>

            <div style={{ 
              position: 'absolute', 
              bottom: '16px', 
              right: '20px', 
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.7rem', 
              color: '#9CA3AF',
              backgroundColor: 'rgba(10, 12, 16, 0.85)',
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px solid #374151'
            }}>
              💡 Haz clic en cualquier zona vectorial del plano para inspeccionarla
            </div>
          </div>

          {/* Zone Detail Inspector Card */}
          {selectedZone && (
            <div style={{
              backgroundColor: 'var(--bg-canvas)',
              border: '2px solid var(--border-strong)',
              borderLeft: `8px solid ${selectedZone.color || selectedZone.colorHex || '#2563EB'}`,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-crisp-sm)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <CheckCircle2 size={18} color="var(--accent-emerald)" />
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem' }}>
                    {selectedZone.nombre}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Aforo total de zona: {selectedZone.capacidad.toLocaleString()} personas · Cupo disponible: {selectedZone.cupoDisponible?.toLocaleString() ?? 'Disponible'}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Precio base
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Q{selectedZone.precioMinimo?.toFixed(2) ?? '350.00'}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '2px solid var(--border-strong)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-surface)'
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Vectores cargados desde <code>localidades.geometria</code>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} className="btn btn-outline">
              Cerrar
            </button>
            <button 
              onClick={() => {
                if (selectedZone && onSelectLocalidad) {
                  onSelectLocalidad(selectedZone);
                }
                onClose();
              }} 
              className="btn btn-primary"
            >
              <Ticket size={16} />
              Continuar con esta localidad
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
