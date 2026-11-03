import React from 'react';
import { EventoCatalogo } from '../types/api';
import { Calendar, MapPin, Users, Ticket, ArrowUpRight, Map } from 'lucide-react';

interface EventCardProps {
  evento: EventoCatalogo;
  onSelect: (evento: EventoCatalogo) => void;
  onVerMapa: (evento: EventoCatalogo) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ evento, onSelect, onVerMapa }) => {
  const fecha = new Date(evento.fechaInicio);
  const dia = fecha.toLocaleDateString('es-GT', { day: '2-digit' });
  const mes = fecha.toLocaleDateString('es-GT', { month: 'short' }).toUpperCase();
  const hora = fecha.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });

  const isEnVenta = evento.estado === 'EN_VENTA';

  return (
    <article className="card-brutal" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Flyer Image Container */}
      <div style={{ position: 'relative', height: '220px', overflow: 'hidden', backgroundColor: '#000' }}>
        <img
          src={evento.imagenFlyerUrl || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80'}
          alt={evento.titulo}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        />

        {/* Date Monogram Badge */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          backgroundColor: 'var(--bg-surface)',
          border: '2px solid var(--border-strong)',
          boxShadow: 'var(--shadow-crisp-sm)',
          textAlign: 'center',
          padding: '4px 10px',
          zIndex: 2
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.25rem', lineHeight: 1 }}>
            {dia}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-vermilion)' }}>
            {mes}
          </div>
        </div>

        {/* Status Pill */}
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 2 }}>
          <span className={`badge ${isEnVenta ? 'badge-valido' : 'badge-pendiente'}`}>
            {evento.estado.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge badge-categoria" style={{ fontSize: '0.68rem' }}>
            {evento.categoriaNombre}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {hora} hrs
          </span>
        </div>

        <h3 style={{
          fontSize: '1.35rem',
          marginBottom: '12px',
          color: 'var(--text-primary)',
          flex: 1
        }}>
          {evento.titulo}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '14px' }}>
          <MapPin size={16} style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {evento.recintoNombre}, {evento.recintoCiudad}
          </span>
        </div>

        {/* Presenters Chips */}
        {(evento.presentadores || []).length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', overflow: 'hidden' }}>
            <Users size={14} style={{ color: 'var(--text-muted)' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {(evento.presentadores || []).map((p) => p.nombreArtistico || (p as any).nombre).join(' · ')}
            </div>
          </div>
        )}

        {/* Pricing & Availability Bar */}
        <div style={{
          borderTop: '1.5px dashed var(--border-medium)',
          paddingTop: '14px',
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Desde
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              Q{(evento.precioMinimo ?? 0).toFixed(2)}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Cupo libre
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>
              {(evento.cupoDisponible ?? 0).toLocaleString()} boletos
            </div>
          </div>
        </div>

        {/* Actions Button Group */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
          <button
            onClick={() => onSelect(evento)}
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px 14px' }}
          >
            <Ticket size={16} />
            {isEnVenta ? 'Comprar Boletos' : 'Ver Detalles'}
          </button>
          <button
            onClick={() => onVerMapa(evento)}
            className="btn btn-outline"
            style={{ padding: '10px 12px' }}
            title="Ver mapa interactivo y polígonos de localidades"
          >
            <Map size={18} />
          </button>
        </div>

      </div>
    </article>
  );
};
