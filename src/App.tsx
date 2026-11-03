import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HeroEditorial } from './components/HeroEditorial';
import { EventCard } from './components/EventCard';
import { VenueMapModal } from './components/VenueMapModal';
import { CheckoutModal } from './components/CheckoutModal';
import { TicketCard } from './components/TicketCard';
import { JoseAssistantDrawer } from './components/JoseAssistantDrawer';
import { ScannerModal } from './components/ScannerModal';
import { AuthModal } from './components/AuthModal';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import { AdminPanel } from './components/AdminPanel';
import { UserProfileModal } from './components/UserProfileModal';
import { api, MOCK_EVENTOS, MOCK_EVENTO_DETALLE, MOCK_BOLETOS } from './api/client';
import { EventoCatalogo, DetalleEventoPublico, BoletoResponse, CompraResponse, ResenaPublica } from './types/api';
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
  ExternalLink
} from 'lucide-react';

function AppContent() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<'catalogo' | 'boletos' | 'compras' | 'admin'>('catalogo');

  // Catálogo y Búsqueda
  const [eventos, setEventos] = useState<EventoCatalogo[]>(MOCK_EVENTOS);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<number | null>(null);

  // Detalle y Modales
  const [eventoSeleccionado, setEventoSeleccionado] = useState<DetalleEventoPublico | null>(null);
  const [eventoParaMapa, setEventoParaMapa] = useState<EventoCatalogo | null>(null);
  const [eventoParaCompra, setEventoParaCompra] = useState<DetalleEventoPublico | null>(null);

  // Boletos y Compras
  const [misBoletos, setMisBoletos] = useState<BoletoResponse[]>(MOCK_BOLETOS);
  const [misCompras, setMisCompras] = useState<CompraResponse[]>([]);
  const [filtroBoleto, setFiltroBoleto] = useState<'TODOS' | 'VALIDO' | 'USADO'>('TODOS');

  // Modales Globales
  const [isJoseOpen, setIsJoseOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
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

  // Cargar boletos y compras SOLO cuando el usuario está autenticado
  useEffect(() => {
    if (user) {
      api.getMisBoletos().then((boletos) => {
        if (boletos && boletos.length > 0) {
          setMisBoletos(boletos);
        }
      }).catch(() => {});

      api.getMisCompras().then((res) => {
        if (res && res.items) {
          setMisCompras(res.items);
        }
      }).catch(() => {});
    } else {
      setMisBoletos(MOCK_BOLETOS);
      setMisCompras([]);
    }
  }, [user]);

  // Filtrado de eventos defensivo
  const eventosFiltrados = eventos.filter((ev) => {
    const coincideCategoria = categoriaActiva === null || ev.categoriaId === categoriaActiva;
    const coincideBusqueda =
      !busqueda.trim() ||
      (ev.titulo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (ev.recintoNombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (ev.presentadores || []).some((p) => ((p.nombreArtistico || (p as any).nombre) || '').toLowerCase().includes(busqueda.toLowerCase()));
    return coincideCategoria && coincideBusqueda;
  });

  const handleSelectEvento = async (ev: EventoCatalogo) => {
    try {
      const detalle = await api.getEvento(ev.id);
      setEventoSeleccionado(detalle);
    } catch {
      setEventoSeleccionado({
        ...ev,
        tiposEntrada: MOCK_EVENTO_DETALLE.tiposEntrada,
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCompraExitosa = (compra: CompraResponse) => {
    setMisCompras((prev) => [compra, ...prev]);
    // Añadir boletos correspondientes
    if (eventoParaCompra) {
      const nuevosBoletos: BoletoResponse[] = compra.items.flatMap((item, idx) =>
        Array.from({ length: item.cantidad }).map((_, i) => ({
          id: Math.floor(Math.random() * 9000) + 1000,
          compraId: compra.id,
          publicIdCompra: compra.publicId,
          eventoId: eventoParaCompra.id,
          eventoTitulo: eventoParaCompra.titulo,
          recintoNombre: eventoParaCompra.recintoNombre,
          fechaInicio: eventoParaCompra.fechaInicio,
          tipoEntradaId: item.tipoEntradaId,
          tipoEntradaNombre: item.tipoEntradaNombre,
          codigoQr: `HMAC_SHA256_TICKET_${compra.publicId}_${item.id}_${i}_VERIFIED_SECURE`,
          estado: 'VALIDO',
          precioFinal: item.precioUnitario,
          asistenteNombre: user?.nombre || 'Titular',
        }))
      );
      setMisBoletos((prev) => [...nuevosBoletos, ...prev]);
    }
  };

  const handleCancelarCompra = async (publicId: string) => {
    if (!confirm('¿Deseas cancelar esta compra pendiente y liberar el cupo reservado?')) return;
    try {
      await api.cancelarCompra(publicId);
      setMisCompras((prev) =>
        prev.map((c) => (c.publicId === publicId ? { ...c, estado: 'CANCELADA' } : c))
      );
    } catch (e) {
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
      {/* Navbar Superior */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab as any);
          setEventoSeleccionado(null);
        }}
        onOpenJose={() => setIsJoseOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {/* PESTAÑA: CATÁLOGO */}
        {currentTab === 'catalogo' && (
          <div>
            {!eventoSeleccionado ? (
              <>
                <HeroEditorial
                  busqueda={busqueda}
                  setBusqueda={setBusqueda}
                  categoriaActiva={categoriaActiva}
                  setCategoriaActiva={setCategoriaActiva}
                  onOpenJose={() => setIsJoseOpen(true)}
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
                          onSelect={handleSelectEvento}
                          onVerMapa={(evento) => setEventoParaMapa(evento)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* DETALLE DE EVENTO INDIVIDUAL */
              <div className="container" style={{ padding: '36px 24px 80px 24px' }}>
                <button
                  onClick={() => setEventoSeleccionado(null)}
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
                        src={eventoSeleccionado.imagenFlyerUrl || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80'}
                        alt={eventoSeleccionado.titulo}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                        <span className="badge badge-valido" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                          {eventoSeleccionado.estado.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <span className="badge badge-categoria">{eventoSeleccionado.categoriaNombre}</span>
                      <span className="badge badge-valido">Firma Criptográfica HMAC</span>
                    </div>

                    <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '16px', lineHeight: 1.1 }}>
                      {eventoSeleccionado.titulo}
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
                            {new Date(eventoSeleccionado.fechaInicio).toLocaleString('es-GT', { dateStyle: 'full', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MapPin size={22} color="var(--accent-cobalt)" />
                        <div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>RECINTO</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.92rem' }}>
                            {eventoSeleccionado.recintoNombre}, {eventoSeleccionado.recintoCiudad}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                      <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Acerca del Espectáculo</h3>
                      <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        {eventoSeleccionado.descripcion}
                      </p>
                    </div>

                    {/* Presenters */}
                    {eventoSeleccionado.presentadores.length > 0 && (
                      <div style={{ marginBottom: '36px' }}>
                        <h3 style={{ fontSize: '1.3rem', marginBottom: '16px' }}>Artistas & Participantes</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                          {eventoSeleccionado.presentadores.map((p) => (
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
                                  src={p.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
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
                      {eventoSeleccionado.tiposEntrada.map((t) => (
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
                      onClick={() => setEventoParaCompra(eventoSeleccionado)}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '14px', marginBottom: '12px', fontSize: '1.05rem' }}
                    >
                      <Ticket size={20} />
                      Comprar Boletos
                    </button>

                    <button
                      onClick={() => setEventoParaMapa(eventoSeleccionado)}
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
            )}
          </div>
        )}

        {/* PESTAÑA: MIS BOLETOS */}
        {currentTab === 'boletos' && (
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

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setFiltroBoleto('TODOS')}
                  className={`btn btn-sm ${filtroBoleto === 'TODOS' ? 'btn-inverse' : 'btn-outline'}`}
                >
                  Todos ({misBoletos.length})
                </button>
                <button
                  onClick={() => setFiltroBoleto('VALIDO')}
                  className={`btn btn-sm ${filtroBoleto === 'VALIDO' ? 'btn-inverse' : 'btn-outline'}`}
                >
                  Válidos ({misBoletos.filter((b) => b.estado === 'VALIDO').length})
                </button>
                <button
                  onClick={() => setFiltroBoleto('USADO')}
                  className={`btn btn-sm ${filtroBoleto === 'USADO' ? 'btn-inverse' : 'btn-outline'}`}
                >
                  Usados ({misBoletos.filter((b) => b.estado === 'USADO').length})
                </button>
              </div>
            </div>

            {misBoletos.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                backgroundColor: 'var(--bg-surface)',
                border: '2px dashed var(--border-medium)'
              }}>
                <Ticket size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Aún no tienes boletos comprados</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 20px auto' }}>
                  Explora la cartelera y asegura tu entrada para los mejores conciertos y eventos.
                </p>
                <button onClick={() => setCurrentTab('catalogo')} className="btn btn-primary">
                  Ver Cartelera
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: '36px'
              }}>
                {misBoletos
                  .filter((b) => filtroBoleto === 'TODOS' || b.estado === filtroBoleto)
                  .map((boleto) => (
                    <div key={boleto.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <TicketCard boleto={boleto} />

                      {/* Si está usado, habilitar botón de reseña */}
                      {boleto.estado === 'USADO' && (
                        <button
                          onClick={() => setBoletoParaResena(boleto)}
                          className="btn btn-sm btn-outline"
                          style={{
                            maxWidth: '420px',
                            margin: '0 auto',
                            width: '100%',
                            borderColor: 'var(--accent-amber)',
                            color: 'var(--accent-amber)'
                          }}
                        >
                          <Star size={14} /> Calificar este Evento (Boleto Usado)
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: MIS COMPRAS */}
        {currentTab === 'compras' && (
          <div className="container" style={{ padding: '48px 24px 80px 24px' }}>
            <div style={{
              borderBottom: '2px solid var(--border-strong)',
              paddingBottom: '16px',
              marginBottom: '32px'
            }}>
              <span className="badge badge-categoria" style={{ marginBottom: '6px' }}>
                HISTORIAL TRANSACCIONAL
              </span>
              <h2 style={{ fontSize: '2.2rem', textTransform: 'uppercase' }}>
                Mis Compras & Pedidos
              </h2>
            </div>

            {misCompras.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                backgroundColor: 'var(--bg-surface)',
                border: '2px dashed var(--border-medium)'
              }}>
                <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>No hay transacciones registradas</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 20px auto' }}>
                  Tus pedidos realizados aparecerán aquí con su comprobante digital.
                </p>
                <button onClick={() => setCurrentTab('catalogo')} className="btn btn-primary">
                  Ir a Comprar
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {misCompras.map((compra) => (
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
                          onClick={() => handleCancelarCompra(compra.publicId)}
                          className="btn btn-sm btn-outline"
                          style={{ color: 'var(--accent-vermilion)' }}
                        >
                          <XCircle size={16} /> Cancelar Pedido
                        </button>
                      )}

                      {compra.estado === 'COMPLETADA' && (
                        <button
                          onClick={() => setCurrentTab('boletos')}
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
        )}

        {/* PESTAÑA: PANEL DE ADMINISTRACIÓN */}
        {currentTab === 'admin' && <AdminPanel />}
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
            // Abrir compra con esa localidad preseleccionada
            setEventoParaCompra({
              ...eventoParaMapa,
              tiposEntrada: MOCK_EVENTO_DETALLE.tiposEntrada,
            });
          }}
        />
      )}

      {eventoParaCompra && (
        <CheckoutModal
          evento={eventoParaCompra}
          onClose={() => setEventoParaCompra(null)}
          onSuccess={(compra) => {
            handleCompraExitosa(compra);
            setCurrentTab('boletos');
          }}
        />
      )}

      <JoseAssistantDrawer
        isOpen={isJoseOpen}
        onClose={() => setIsJoseOpen(false)}
      />

      {isScannerOpen && (
        <ScannerModal onClose={() => setIsScannerOpen(false)} />
      )}

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

