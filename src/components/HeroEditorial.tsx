import React from 'react';
import { Search, Sparkles, Shield, Zap, Ticket } from 'lucide-react';

interface HeroEditorialProps {
  busqueda: string;
  setBusqueda: (val: string) => void;
  categoriaActiva: number | null;
  setCategoriaActiva: (catId: number | null) => void;
  onOpenJose: () => void;
}

export const HeroEditorial: React.FC<HeroEditorialProps> = ({
  busqueda,
  setBusqueda,
  categoriaActiva,
  setCategoriaActiva,
  onOpenJose,
}) => {
  const categorias = [
    { id: null, nombre: 'TODOS LOS EVENTOS' },
    { id: 1, nombre: 'CONCIERTOS' },
    { id: 5, nombre: 'CARRERAS 10K/21K' },
    { id: 2, nombre: 'CULTURA & TEATRO' },
    { id: 3, nombre: 'CULTOS & VIGILIAS' },
  ];

  return (
    <section style={{
      position: 'relative',
      backgroundColor: 'var(--bg-canvas)',
      borderBottom: '2px solid var(--border-strong)',
      padding: '60px 0 40px 0',
      overflow: 'hidden'
    }}>
      {/* Monogramas de Fondo tipo Afiche Brutalista / Editorial (Inspirado en la imagen de referencia RS / VP) */}
      <div 
        className="poster-monogram" 
        style={{ 
          position: 'absolute', 
          top: '10px', 
          left: '20px', 
          color: 'var(--border-subtle)',
          lineHeight: 0.8
        }}
      >
        ASA
      </div>
      <div 
        className="poster-monogram" 
        style={{ 
          position: 'absolute', 
          bottom: '10px', 
          right: '20px', 
          color: 'var(--border-subtle)',
          lineHeight: 0.8
        }}
      >
        2026
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '880px', margin: '0 auto', textAlign: 'center' }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span className="badge badge-categoria" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
              <Zap size={14} /> PLATAFORMA OFICIAL DE BOLETERÍA
            </span>
            <span className="badge badge-valido" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
              <Shield size={14} /> INVENTARIO CONCURRENTE PROTEGIDO
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.4rem, 5.5vw, 4.4rem)',
            textTransform: 'uppercase',
            marginBottom: '20px',
            color: 'var(--text-primary)'
          }}>
            VIVE LA EMOCIÓN <br />
            <span style={{ 
              backgroundColor: 'var(--bg-inverse)', 
              color: 'var(--text-inverse)', 
              padding: '2px 14px',
              display: 'inline-block',
              transform: 'rotate(-0.5deg)',
              marginTop: '6px'
            }}>
              EN PRIMERA FILA.
            </span>
          </h1>

          <p style={{
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            maxWidth: '650px',
            margin: '0 auto 36px auto',
            lineHeight: 1.6
          }}>
            Conciertos de talla mundial, festivales masivos y maratones oficiales. Adquiere entradas oficiales con asignación atómica y código QR criptográfico directo a tu dispositivo.
          </p>

          {/* Barra de Búsqueda de Alto Impacto */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface)',
            border: '2px solid var(--border-strong)',
            boxShadow: 'var(--shadow-crisp)',
            padding: '6px 10px',
            maxWidth: '620px',
            margin: '0 auto 28px auto'
          }}>
            <Search size={22} style={{ color: 'var(--text-secondary)', marginLeft: '8px' }} />
            <input
              type="text"
              placeholder="Buscar por artista, evento o recinto (ej. Martin Garrix, Cayalá, 10K)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '1rem',
                fontFamily: 'var(--font-body)',
                width: '100%',
                padding: '10px 14px',
                background: 'transparent'
              }}
            />
            {busqueda && (
              <button 
                onClick={() => setBusqueda('')} 
                className="btn btn-sm btn-outline"
                style={{ padding: '4px 8px', border: 'none', boxShadow: 'none' }}
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Filtros de Categoría */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
            {categorias.map((cat) => {
              const active = categoriaActiva === cat.id;
              return (
                <button
                  key={String(cat.id)}
                  onClick={() => setCategoriaActiva(cat.id)}
                  className={`btn btn-sm ${active ? 'btn-inverse' : 'btn-outline'}`}
                  style={{
                    backgroundColor: active ? 'var(--bg-inverse)' : 'var(--bg-surface)',
                    fontSize: '0.78rem'
                  }}
                >
                  {cat.nombre}
                </button>
              );
            })}
          </div>

          {/* Quick AI Trigger Banner */}
          <div 
            onClick={onOpenJose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'var(--bg-surface)',
              border: '1.5px solid var(--border-strong)',
              boxShadow: 'var(--shadow-crisp-sm)',
              padding: '8px 18px',
              cursor: 'pointer',
              transition: 'transform 0.15s ease'
            }}
          >
            <Sparkles size={16} color="var(--accent-vermilion)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600 }}>
              ¿Tienes dudas sobre reglamentos o accesos? <strong>Consulta a José (RAG oficial)</strong>
            </span>
          </div>

        </div>
      </div>
    </section>
  );
};
