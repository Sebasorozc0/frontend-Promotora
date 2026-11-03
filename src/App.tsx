import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HeroEditorial } from './components/HeroEditorial';
import { EventCard } from './components/EventCard';
import { VenueMapModal } from './components/VenueMapModal';
import { CheckoutModal } from './components/CheckoutModal';
import { TicketCard } from './components/TicketCard';
import { JoseAssistantDrawer } from './components/JoseAssistantDrawer';
import { AuthModal } from './components/AuthModal';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import { AdminPanel } from './components/AdminPanel';
import { UserProfileModal } from './components/UserProfileModal';
import { api, MOCK_EVENTOS, MOCK_EVENTO_DETALLE } from './api/client';
import { EventoCatalogo, DetalleEventoPublico, BoletoResponse, CompraResponse, LocalidadMapa } from './types/api';
import { 
  Ticket, 
  ShoppingBag, 
  Calendar, 
  MapPin, 
  Users, 
  Star, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  Map,
  XCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

const ScannerPage = React.lazy(() => import('./components/ScannerPage').then((module) => ({ default: module.ScannerPage })));

// --- VISTA: DETALLE DE EVENTO INDIVIDUAL ---
function EventoDetalleView({
  onComprar,
  onVerMapa
}: {
  onComprar: (ev: DetalleEventoPublico) => void;
  onVerMapa: (ev: EventoCatalogo) => void;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detalle, setDetalle] = useState<DetalleEventoPublico | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getEvento(Number(id)).then((data) => {
      setDetalle(data);
    }).catch(() => {
      const mock = MOCK_EVENTOS.find(e => e.id === Number(id)) || MOCK_EVENTOS[0];
      setDetalle({
        ...mock,
        tiposEntrada: MOCK_EVENTO_DETALLE.tiposEntrada,
      });
    }).finally(() => {
      setLoading(false);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        Cargando detalles del espectáculo...
      </div>
    );
  }

  if (!detalle) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h3>Evento no encontrado</h3>
        <button onClick={() => navigate('/catalogo')} className="btn btn-outline" style={{ marginTop: '16px' }}>
          Volver a la Cartelera
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '36px 24px 80px 24px' }}>
      <button
        onClick={() => navigate('/catalogo')}
        className="btn btn-sm btn-outline"
        style={{ marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Volver a la Cartelera
      </button>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: '40px',
        alignItems: 'start'
      }}>
        {/* Left Column: Event details */}
        <div>
          <div style={{
            height: '380px',
            borderRadius: 'var(--radius-xs)',
            overflow: 'hidden',
            border: '2px solid var(--border-strong)',
            boxShadow: 'var(--shadow-crisp)',
            marginBottom: '28px',
            position: 'relative'
          }}>
            <img
              src={detalle.imagenFlyerUrl || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80'}
              alt={detalle.titulo}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
              <span className="badge badge-valido" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                {detalle.estado.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <span className="badge badge-categoria">{detalle.categoriaNombre}</span>
            <span className="badge badge-valido">Firma Criptográfica HMAC</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '16px', lineHeight: 1.1 }}>
            {detalle.titulo}
          </h1>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            padding: '16px 20px',
            backgroundColor: 'var(--bg-surface)',
            border: '2px solid var(--border-strong)',
            boxShadow: 'var(--shadow-crisp-sm)',
            marginBottom: '28px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={22} color="var(--accent-vermilion)" />
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>FECHA Y HORA</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.92rem' }}>
                  {new Date(detalle.fechaInicio).toLocaleString('es-GT', { dateStyle: 'full', timeStyle: 'short' })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={22} color="var(--accent-cobalt)" />
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>RECINTO</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.92rem' }}>
                  {detalle.recintoNombre}, {detalle.recintoCiudad}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Acerca del Espectáculo</h3>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {detalle.descripcion}
            </p>
          </div>

          {/* Presenters */}
          {detalle.presentadores && detalle.presentadores.length > 0 && (
            <div style={{ marginBottom: '36px' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '16px' }}>Artistas & Participantes</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {detalle.presentadores.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1.5px solid var(--border-strong)',
                      boxShadow: 'var(--shadow-crisp-sm)'
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-xs)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-strong)',
                      flexShrink: 0
                    }}>
                      <img
                        src={(p as any).fotoPerfilUrl || (p as any).fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                        alt={p.nombreArtistico}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>
                        {p.nombreArtistico}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                        ★ {p.promedioCalificacion?.toFixed(1) || '5.0'} / 5.0
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Ticket Box */}
        <div style={{
          position: 'sticky',
          top: '100px',
          backgroundColor: 'var(--bg-surface)',
          border: '2px solid var(--border-strong)',
          boxShadow: 'var(--shadow-crisp-lg)',
          padding: '24px'
        }}>
          <div style={{
            borderBottom: '2px dashed var(--border-medium)',
            paddingBottom: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              LOCALIDADES DISPONIBLES
            </div>
            <h3 style={{ fontSize: '1.4rem' }}>Adquiere tus Entradas</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {detalle.tiposEntrada.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: '12px 14px',
                  border: '1.5px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-canvas)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>
                    {t.nombre}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Cupo: {t.cupoDisponible.toLocaleString()} boletos
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-vermilion)' }}>
                  Q{t.precioUnitario.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onComprar(detalle)}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', marginBottom: '12px', fontSize: '1.05rem' }}
          >
            <Ticket size={20} />
            Comprar Boletos
          </button>

          <button
            onClick={() => onVerMapa(detalle)}
            className="btn btn-outline"
            style={{ width: '100%', padding: '12px' }}
          >
            <Map size={18} />
            Ver Mapa Interactivo de Gradería
          </button>

          <div style={{
            marginTop: '20px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--text-secondary)'
          }}>
            <ShieldCheck size={16} color="var(--accent-emerald)" />
            <span>Reserva atómica en BD. Cero riesgo de sobreventa.</span>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- VISTA: CATÁLOGO DE EVENTOS ---
function CatalogoView({
  eventos,
  onVerMapa,
  onOpenJose
}: {
  eventos: EventoCatalogo[];
  onVerMapa: (ev: EventoCatalogo) => void;
  onOpenJose: () => void;
}) {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<number | null>(null);

  const eventosFiltrados = eventos.filter((ev) => {
    const coincideCategoria = categoriaActiva === null || ev.categoriaId === categoriaActiva;
    const coincideBusqueda =
      !busqueda.trim() ||
      (ev.titulo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (ev.recintoNombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (ev.presentadores || []).some((p) => ((p.nombreArtistico || (p as any).nombre) || '').toLowerCase().includes(busqueda.toLowerCase()));
    return coincideCategoria && coincideBusqueda;
  });

  return (
    <div>
      <HeroEditorial
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        categoriaActiva={categoriaActiva}
        setCategoriaActiva={setCategoriaActiva}
        onOpenJose={onOpenJose}
      />

      <div className="container" style={{ padding: '48px 24px 80px 24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '32px',
          borderBottom: '2px solid var(--border-strong)',
          paddingBottom: '16px'
        }}>
          <div>
            <h2 style={{ fontSize: '2rem', textTransform: 'uppercase' }}>
              Cartelera de Temporada
            </h2>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {eventosFiltrados.length} espectáculos con venta oficial disponible
            </div>
          </div>
        </div>

        {eventosFiltrados.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            backgroundColor: 'var(--bg-surface)',
            border: '2px dashed var(--border-medium)'
          }}>
            <Calendar size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>No se encontraron eventos</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 16px auto' }}>
              Prueba ajustando el término de búsqueda o seleccionando otra categoría.
            </p>
            <button
              onClick={() => { setBusqueda(''); setCategoriaActiva(null); }}
              className="btn btn-sm btn-outline"
            >
              Ver todos los eventos
            </button>
          </div>
        ) : (
          <div className="grid-events">
            {eventosFiltrados.map((ev) => (
              <EventCard
                key={ev.id}
                evento={ev}
                onSelect={(selected) => navigate(`/eventos/${selected.id}`)}
                onVerMapa={(selected) => onVerMapa(selected)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- VISTA: MIS BOLETOS ---
function BoletosView({
  boletos,
  onCalificar,
  cargando,
  error,
  onActualizar,
}: {
  boletos: BoletoResponse[];
  onCalificar: (boleto: BoletoResponse) => void;
  cargando: boolean;
  error: string | null;
  onActualizar: () => void;
}) {
  const [filtroBoleto, setFiltroBoleto] = useState<'TODOS' | 'VALIDO' | 'USADO' | 'ANULADO'>('TODOS');

  const boletosFiltrados = boletos.filter((b) => {
    if (filtroBoleto === 'TODOS') return true;
    return b.estado === filtroBoleto;
  });

  return (
    <div className="container" style={{ padding: '48px 24px 80px 24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: '32px',
        borderBottom: '2px solid var(--border-strong)',
        paddingBottom: '16px'
      }}>
        <div>
          <span className="badge badge-categoria" style={{ marginBottom: '6px' }}>
            BILLETERA DIGITAL OFICIAL
          </span>
          <h2 style={{ fontSize: '2.2rem', textTransform: 'uppercase' }}>
            Mis Boletos Digitales
          </h2>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Presenta el código QR en la entrada del recinto. La validación es atómica y de un solo uso.
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onActualizar} disabled={cargando} className="btn btn-sm btn-outline" title="Actualizar boletos">
            <RefreshCw size={15} className={cargando ? 'spin' : undefined} />
          </button>
          <button
            onClick={() => setFiltroBoleto('TODOS')}
            className={`btn btn-sm ${filtroBoleto === 'TODOS' ? 'btn-inverse' : 'btn-outline'}`}
          >
            Todos ({boletos.length})
          </button>
          <button
            onClick={() => setFiltroBoleto('VALIDO')}
            className={`btn btn-sm ${filtroBoleto === 'VALIDO' ? 'btn-inverse' : 'btn-outline'}`}
          >
            Válidos ({boletos.filter((b) => b.estado === 'VALIDO').length})
          </button>
          <button
            onClick={() => setFiltroBoleto('USADO')}
            className={`btn btn-sm ${filtroBoleto === 'USADO' ? 'btn-inverse' : 'btn-outline'}`}
          >
            Usados ({boletos.filter((b) => b.estado === 'USADO').length})
          </button>
          <button
            onClick={() => setFiltroBoleto('ANULADO')}
            className={`btn btn-sm ${filtroBoleto === 'ANULADO' ? 'btn-inverse' : 'btn-outline'}`}
          >
            Anulados ({boletos.filter((b) => b.estado === 'ANULADO').length})
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ padding: '16px 20px', marginBottom: '18px', border: '2px solid var(--accent-vermilion)', background: 'var(--accent-vermilion-soft)', color: 'var(--accent-vermilion)' }}>
          {error}
        </div>
      )}

      {cargando ? (
        <div role="status" style={{ textAlign: 'center', padding: '64px 20px', backgroundColor: 'var(--bg-surface)', border: '2px dashed var(--border-medium)' }}>
          <RefreshCw size={32} className="spin" style={{ color: 'var(--accent-cobalt)', marginBottom: '12px' }} />
          <h3>Cargando tus boletos…</h3>
        </div>
      ) : boletosFiltrados.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          backgroundColor: 'var(--bg-surface)',
          border: '2px dashed var(--border-medium)'
        }}>
          <Ticket size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>{error ? 'No se pudieron cargar los boletos' : 'No hay boletos en esta sección'}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {error ? 'Verifica tu conexión e intenta actualizar de nuevo.' : 'Adquiere tus entradas en la cartelera principal.'}
          </p>
          {error && <button type="button" onClick={onActualizar} className="btn btn-sm btn-outline" style={{ marginTop: '14px' }}>Reintentar</button>}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '24px'
        }}>
          {boletosFiltrados.map((b) => (
            <div key={b.id}>
              <TicketCard boleto={b} />
              {b.estado === 'USADO' && (
                <button
                  onClick={() => onCalificar(b)}
                  className="btn btn-sm btn-outline"
                  style={{ width: '100%', marginTop: '8px', gap: '6px' }}
                >
                  <Star size={14} color="var(--accent-amber)" /> Calificar este Evento
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- VISTA: MIS COMPRAS ---
function ComprasView({
  compras,
  onCancelarCompra,
  onVerBoletos
}: {
  compras: CompraResponse[];
  onCancelarCompra: (publicId: string) => void;
  onVerBoletos: () => void;
}) {
  return (
    <div className="container" style={{ padding: '48px 24px 80px 24px' }}>
      <div style={{
        marginBottom: '32px',
        borderBottom: '2px solid var(--border-strong)',
        paddingBottom: '16px'
      }}>
        <span className="badge badge-categoria" style={{ marginBottom: '6px' }}>
          REGISTRO TRANSACCIONAL
        </span>
        <h2 style={{ fontSize: '2.2rem', textTransform: 'uppercase' }}>
          Historial de Compras y Pedidos
        </h2>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Tus órdenes de compra procesadas en alta disponibilidad con RabbitMQ y PostgreSQL.
        </div>
      </div>

      {compras.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          backgroundColor: 'var(--bg-surface)',
          border: '2px dashed var(--border-medium)'
        }}>
          <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>No tienes compras registradas</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Tus compras completadas aparecerán aquí con sus recibos e información de pago.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {compras.map((compra) => (
            <div
              key={compra.id || compra.publicId}
              style={{
                backgroundColor: '#FFF',
                border: '2px solid var(--border-strong)',
                boxShadow: 'var(--shadow-crisp-sm)',
                padding: '24px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '20px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span className={`badge ${
                    compra.estado === 'COMPLETADA' ? 'badge-completada' :
                    compra.estado === 'PENDIENTE' ? 'badge-pendiente' : 'badge-cancelada'
                  }`}>
                    {compra.estado}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Ref: <strong>{compra.publicId}</strong>
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>
                  {compra.eventoTitulo || 'VIVA FEST 2026'}
                </h3>

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Fecha: {new Date(compra.creadoEn).toLocaleString('es-GT')}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Subtotal: Q{compra.subtotal?.toFixed(2)} + IVA & Comisión
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-vermilion)' }}>
                    Q{compra.total.toFixed(2)}
                  </div>
                </div>

                {compra.estado === 'PENDIENTE' && (
                  <button
                    onClick={() => onCancelarCompra(compra.publicId)}
                    className="btn btn-sm btn-outline"
                    style={{ color: 'var(--accent-vermilion)' }}
                  >
                    <XCircle size={16} /> Cancelar Pedido
                  </button>
                )}

                {compra.estado === 'COMPLETADA' && (
                  <button
                    onClick={onVerBoletos}
                    className="btn btn-sm btn-inverse"
                  >
                    <Ticket size={16} /> Ver Boletos
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE PRINCIPAL CON RUTAS ---
function AppContent() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Catálogo y Búsqueda
  const [eventos, setEventos] = useState<EventoCatalogo[]>(MOCK_EVENTOS);

  // Modales
  const [eventoParaMapa, setEventoParaMapa] = useState<EventoCatalogo | null>(null);
  const [eventoParaCompra, setEventoParaCompra] = useState<DetalleEventoPublico | null>(null);
  const [localidadParaCompra, setLocalidadParaCompra] = useState<LocalidadMapa | null>(null);

  // Boletos y Compras
  const [misBoletos, setMisBoletos] = useState<BoletoResponse[]>([]);
  const [cargandoBoletos, setCargandoBoletos] = useState(false);
  const [errorBoletos, setErrorBoletos] = useState<string | null>(null);
  const [misCompras, setMisCompras] = useState<CompraResponse[]>([]);

  // Modales Globales
  const [isJoseOpen, setIsJoseOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isManualPasswordChangeOpen, setIsManualPasswordChangeOpen] = useState(false);

  // Reseña modal para boleto usado
  const [boletoParaResena, setBoletoParaResena] = useState<BoletoResponse | null>(null);
  const [ratingResena, setRatingResena] = useState(5);
  const [comentarioResena, setComentarioResena] = useState('');

  // Cargar catálogo público al iniciar
  useEffect(() => {
    api.getEventos().then((res) => {
      if (res && res.items && res.items.length > 0) {
        setEventos(res.items);
      }
    }).catch(() => {
      // Usar mocks
    });
  }, []);

  const cargarBoletos = useCallback(async () => {
    if (user?.rol !== 'CLIENTE') {
      setMisBoletos([]);
      setErrorBoletos(null);
      setCargandoBoletos(false);
      return;
    }

    setCargandoBoletos(true);
    setErrorBoletos(null);
    try {
      setMisBoletos(await api.getMisBoletos());
    } catch {
      setMisBoletos([]);
      setErrorBoletos('No se pudieron cargar tus boletos. Intenta nuevamente.');
    } finally {
      setCargandoBoletos(false);
    }
  }, [user?.rol]);

  // Cargar boletos y compras SOLO cuando el usuario es CLIENTE.
  useEffect(() => {
    if (user && user.rol === 'CLIENTE') {
      void cargarBoletos();
      api.getMisCompras().then((res) => {
        if (res && res.items) setMisCompras(res.items);
      }).catch(() => {});
    } else {
      void cargarBoletos();
      setMisCompras([]);
    }
  }, [user, cargarBoletos]);

  const handleCompraExitosa = (compra: CompraResponse) => {
    setMisCompras((prev) => [compra, ...prev.filter((item) => item.publicId !== compra.publicId)]);
    void cargarBoletos();
  };

  const handleCompraPendiente = (compra: CompraResponse) => {
    setMisCompras((prev) => [compra, ...prev.filter((item) => item.publicId !== compra.publicId)]);
  };

  const handleCancelarCompra = async (publicId: string) => {
    if (!confirm('¿Deseas cancelar esta compra pendiente y liberar el cupo reservado?')) return;
    try {
      await api.cancelarCompra(publicId);
      setMisCompras((prev) =>
        prev.map((c) => (c.publicId === publicId ? { ...c, estado: 'CANCELADA' } : c))
      );
    } catch {
      alert('No se pudo cancelar la compra.');
    }
  };

  const handleEnviarResena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boletoParaResena) return;
    try {
      await api.crearResena({
        eventoId: boletoParaResena.eventoId,
        calificacion: ratingResena,
        comentario: comentarioResena,
      });
      alert('¡Reseña enviada con éxito! Queda en estado PENDIENTE hasta moderación por el administrador.');
      setBoletoParaResena(null);
      setComentarioResena('');
    } catch (err: any) {
      alert(err.detail || 'Error al enviar reseña.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar Superior con Navegación por URL */}
      <Navbar
        onOpenJose={() => setIsJoseOpen(true)}
        onOpenScanner={() => navigate('/control-acceso')}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Content Area con Router */}
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/catalogo" replace />} />
          <Route
            path="/catalogo"
            element={
              <CatalogoView
                eventos={eventos}
                onVerMapa={(ev) => setEventoParaMapa(ev)}
                onOpenJose={() => setIsJoseOpen(true)}
              />
            }
          />
          <Route
            path="/eventos/:id"
            element={
              <EventoDetalleView
                onComprar={(ev) => { setEventoParaCompra(null); setLocalidadParaCompra(null); setEventoParaMapa(ev); }}
                onVerMapa={(ev) => setEventoParaMapa(ev)}
              />
            }
          />
          <Route
            path="/boletos"
            element={
              <BoletosView
                boletos={misBoletos}
                onCalificar={(boleto) => setBoletoParaResena(boleto)}
                cargando={cargandoBoletos}
                error={errorBoletos}
                onActualizar={() => void cargarBoletos()}
              />
            }
          />
          <Route
            path="/control-acceso"
            element={authLoading
              ? <div className="container" role="status" style={{ padding: '80px 24px' }}>Verificando sesión…</div>
              : user && (user.rol === 'ADMINISTRADOR' || user.rol === 'DUENO_RECINTO')
                ? <React.Suspense fallback={<div className="container" role="status" style={{ padding: '80px 24px' }}>Cargando control de acceso…</div>}><ScannerPage /></React.Suspense>
                : <Navigate to="/catalogo" replace />}
          />
          <Route
            path="/compras"
            element={
              <ComprasView
                compras={misCompras}
                onCancelarCompra={handleCancelarCompra}
                onVerBoletos={() => navigate('/boletos')}
              />
            }
          />
          <Route path="/admin" element={<Navigate to={user?.rol === 'DUENO_RECINTO' ? '/admin/recintos' : '/admin/catalogo'} replace />} />
          <Route path="/admin/:tab" element={<AdminPanel />} />
          <Route path="*" element={<Navigate to="/catalogo" replace />} />
        </Routes>
      </main>

      {/* Footer Editorial */}
      <footer style={{
        backgroundColor: 'var(--bg-inverse)',
        color: 'var(--text-inverse)',
        borderTop: '2px solid var(--border-strong)',
        padding: '50px 0 30px 0'
      }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '40px', marginBottom: '40px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', marginBottom: '12px' }}>
                ASA PROMOTORA
              </div>
              <p style={{ fontSize: '0.88rem', color: '#9CA3AF', lineHeight: 1.6 }}>
                Líder en producción y comercialización de eventos masivos en Guatemala. Conciertos, festivales y maratones oficiales con arquitectura de alta disponibilidad.
              </p>
            </div>

            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.08em' }}>
                SOPORTE & SEGURIDAD
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#9CA3AF' }}>
                <li>· Firma criptográfica HMAC en cada boleto</li>
                <li>· Prevención atómica de sobreventa en BD</li>
                <li>· Pasarela de pago y ledger inmutable</li>
                <li>· Asistente público José con RAG</li>
              </ul>
            </div>

            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.08em' }}>
                ASISTENTE OFICIAL
              </div>
              <p style={{ fontSize: '0.85rem', color: '#9CA3AF', marginBottom: '12px' }}>
                José responde todas tus dudas con citación directa de los reglamentos de la promotora.
              </p>
              <button onClick={() => setIsJoseOpen(true)} className="btn btn-sm btn-primary">
                <Sparkles size={14} /> Chatear con José
              </button>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid #2A2D35',
            paddingTop: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-mono)',
            color: '#6B7280'
          }}>
            <div>© 2026 ASA Promotions & Promotora de Eventos. Todos los derechos reservados.</div>
            <div>Clean Architecture · .NET 10 + React Vite · RabbitMQ · pgvector</div>
          </div>
        </div>
      </footer>

      {/* MODALES GLOBALES */}
      {eventoParaMapa && (
        <VenueMapModal
          evento={eventoParaMapa}
          onClose={() => setEventoParaMapa(null)}
          onSelectLocalidad={(localidad) => {
            setLocalidadParaCompra(localidad);
            void api.getEvento(eventoParaMapa.id).then(setEventoParaCompra).catch((error: any) => {
              setLocalidadParaCompra(null);
              alert(error?.detail || 'No se pudieron cargar las tarifas reales de esta localidad. Intenta nuevamente.');
            });
          }}
        />
      )}

      {eventoParaCompra && (
        <CheckoutModal
          evento={eventoParaCompra}
          localidadSeleccionada={localidadParaCompra}
          onClose={() => { setEventoParaCompra(null); setLocalidadParaCompra(null); }}
          onPending={handleCompraPendiente}
          onSuccess={(compra) => {
            handleCompraExitosa(compra);
            navigate('/boletos');
          }}
        />
      )}

      <JoseAssistantDrawer
        isOpen={isJoseOpen}
        onClose={() => setIsJoseOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <PasswordChangeModal isOpen={isManualPasswordChangeOpen} onClose={() => setIsManualPasswordChangeOpen(false)} />
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} usuarioId={user?.id || 1} onOpenPasswordChange={() => setIsManualPasswordChangeOpen(true)} />

      {/* Modal para Crear Reseña con Boleto USADO */}
      {boletoParaResena && (
        <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '2px solid var(--border-strong)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-canvas)'
            }}>
              <div>
                <span className="badge badge-categoria" style={{ marginBottom: '4px' }}>
                  RESEÑA VERIFICADA (BOLETO #{boletoParaResena.id})
                </span>
                <h3 style={{ fontSize: '1.25rem' }}>Calificar {boletoParaResena.eventoTitulo}</h3>
              </div>
              <button onClick={() => setBoletoParaResena(null)} className="btn btn-sm btn-outline">
                ✕
              </button>
            </div>

            <form onSubmit={handleEnviarResena} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  Calificación (1 a 5 estrellas):
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRatingResena(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.6rem',
                        color: star <= ratingResena ? 'var(--accent-amber)' : 'var(--border-medium)',
                        transition: 'transform 0.1s'
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  Comentario sobre tu experiencia:
                </label>
                <textarea
                  rows={4}
                  required
                  className="input-brutal"
                  placeholder="Cuéntanos cómo estuvo la acústica, el ingreso y la organización..."
                  value={comentarioResena}
                  onChange={(e) => setComentarioResena(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setBoletoParaResena(null)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  Enviar Reseña para Moderación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
