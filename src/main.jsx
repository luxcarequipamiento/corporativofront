import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight, CarFront, ChevronDown, ChevronLeft, ChevronRight, Download, Eye, EyeOff,
  LoaderCircle, LogOut, MessageCircle, PackageCheck, RefreshCw, ShieldCheck, ShoppingBag, UserRound, Wrench
} from 'lucide-react';
import { clearSession, getAccessToken, getCatalog, getMe, login } from './api.js';
import { AdminMessaging, ClientMessaging } from './chat.jsx';
import './styles.css';
import { ProgressiveChevroletCatalog } from './chevrolet-catalog.jsx';
import { catalogToPrices } from './catalog.js';
import { Quotation, AddToQuote } from './quotation.jsx';
import { SINGLE_MODEL_MESSAGE } from './quote-utils.js';
import { ClientFooter } from './client-footer.jsx';
import { allyLabel } from './ally-label.js';

const responsiveAsset = (base) => ({
  mobile: `${base}-mobile.jpg`,
  tablet: `${base}-tablet.jpg`,
  desktop: `${base}-desktop.jpg`
});

const loginVisual = responsiveAsset('/images/login-business');
const loginLogo = responsiveAsset('/Logos/luxcar-login');
const luxcarHeaderLogo = responsiveAsset('/Logos/luxcar-header');


const pages = {
  ford: {
    id: 'ford', name: 'Ford', logo: '/Logos/LogoFord.png', accent: '#1677d2',
    headerLogo: '/Logos/LogoFord.png',
    brochure: '/brochures/ford/Chevrolet%20x%20Luxcar_Brochure.pdf',
    banner: '/images/page-adventure.png',
    eyebrow: 'Línea corporativa 4x4',
    title: 'Fuerza que lleva tu negocio más lejos',
    copy: 'Soluciones preparadas para trabajo de campo, seguridad y rutas exigentes.',
    slides: [
      { image: '/images/ford-pickup-carousel.png', alt: 'Pickup corporativa recorriendo una ruta de montaña' },
      { image: '/images/ford-suv-carousel.png', alt: 'SUV corporativa frente a un refugio ejecutivo' }
    ],
    products: ['Pickup Pro', 'SUV Command', 'Trail Max', 'Cargo Elite'],
    prices: {
      kits: [
        { name: 'Kit Operativo Plus', price: '$1,250', includes: ['Barra antivuelco', 'Protector de tolva', 'Lámina de seguridad'] },
        { name: 'Kit Seguridad Campo', price: '$980', includes: ['Faros auxiliares', 'Alarma GPS', 'Botiquín vehicular'] }
      ],
      accessories: [
        { name: 'Rack de techo reforzado', price: '$320' },
        { name: 'Estribos laterales', price: '$260' },
        { name: 'Cubrepiso industrial', price: '$95' }
      ],
      services: [
        { name: 'Instalación certificada', price: '$180' },
        { name: 'Mantenimiento preventivo', price: '$140' },
        { name: 'Entrega corporativa', price: '$90' }
      ]
    }
  },
  chevrolet: {
    id: 'chevrolet', name: 'Chevrolet', logo: '/Logos/Logo Chevrolet.png', accent: '#d8b44c',
    headerLogo: responsiveAsset('/Logos/chevrolet'),
    brochure: '/brochures/chevrolet/Chevrolet%20x%20Luxcar_Brochure.pdf',
    banner: responsiveAsset('/images/chevrolet-banner'),
    eyebrow: 'Experiencia Chevrolet',
    title: 'Equipa tu Chevrolet a tu manera',
    titleLines: ['Equipa tu', 'Chevrolet', 'a tu manera'],
    copy: 'Explora accesorios, servicios y opciones de equipamiento para llevar tu Chevrolet más allá.',
    lineupEyebrow: 'Conoce la gama',
    lineupTitle: 'Tu Chevrolet, Tu Elección',
    lineupCopy: 'Una configuración que potencia su carácter y lleva la experiencia de conducción más allá de fábrica.',
    slides: [
      { image: responsiveAsset('/images/chevrolet-colorado'), alt: 'Chevrolet Colorado corporativa' },
      { image: responsiveAsset('/images/chevrolet-silverado'), alt: 'Chevrolet Silverado corporativa' },
      { image: responsiveAsset('/images/chevrolet-n400'), alt: 'Chevrolet N-400 corporativa' },
      { image: responsiveAsset('/images/chevrolet-groove'), alt: 'Chevrolet Groove corporativa' },
      { image: responsiveAsset('/images/chevrolet-tracker'), alt: 'Chevrolet Tracker corporativa' },
      { image: responsiveAsset('/images/chevrolet-captiva'), alt: 'Chevrolet Captiva corporativa' },
      { image: responsiveAsset('/images/chevrolet-traverse'), alt: 'Chevrolet Traverse corporativa' },
      { image: responsiveAsset('/images/chevrolet-sail'), alt: 'Chevrolet Sail corporativo' },
      { image: responsiveAsset('/images/chevrolet-tahoe'), alt: 'Chevrolet Tahoe corporativa' },
      { image: responsiveAsset('/images/chevrolet-suburban'), alt: 'Chevrolet Suburban corporativa' }
    ],
    products: ['Colorado', 'Silverado', 'N-400', 'Groove', 'Tracker', 'Captiva', 'Traverse', 'Sail', 'Tahoe', 'Suburban']
  }
};

function ResponsiveImage({ sources, alt, ...imageProps }) {
  if (typeof sources === 'string') return <img src={sources} alt={alt} {...imageProps} />;
  return (
    <picture className="responsive-picture">
      <source media="(max-width: 767px)" srcSet={sources.mobile} />
      <source media="(max-width: 1023px)" srcSet={sources.tablet} />
      <img src={sources.desktop} alt={alt} {...imageProps} />
    </picture>
  );
}

function App() {
  const [sessionView, setSessionView] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      if (!getAccessToken()) {
        window.history.replaceState({}, '', '/');
        setLoading(false);
        return;
      }
      try {
        const profile = await getMe();
        if (profile.rol === 'ADMIN') {
          setSessionView({ role: 'ADMIN', profile: profile.usuario });
          window.history.replaceState({}, '', '/admin/mensajes');
          return;
        }
        const slug = profile.cliente?.slug;
        if (!pages[slug] || profile.rol !== 'CLIENTE') throw new Error('Cliente no autorizado');
        const section = window.location.pathname.endsWith('/mensajes') ? 'messages' : 'portal';
        setSessionView({ role: 'CLIENTE', brand: slug, section, nombre: profile.usuario?.nombre, nombreCompleto: profile.usuario?.nombre_completo || profile.usuario?.nombre });
        window.history.replaceState({}, '', section === 'messages' ? `/${slug}/mensajes` : `/${slug}`);
      } catch {
        clearSession();
        window.history.replaceState({}, '', '/');
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  useEffect(() => {
    const syncClientRoute = () => {
      setSessionView((current) => {
        if (current?.role !== 'CLIENTE') return current;
        return { ...current, section: window.location.pathname.endsWith('/mensajes') ? 'messages' : 'portal' };
      });
    };
    window.addEventListener('popstate', syncClientRoute);
    return () => window.removeEventListener('popstate', syncClientRoute);
  }, []);

  async function authenticate(email, password) {
    const result = await login(email, password);
    if (result.rol === 'ADMIN') {
      window.history.pushState({}, '', '/admin/mensajes');
      setSessionView({ role: 'ADMIN', profile: result.usuario });
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    const slug = result.cliente?.slug;
    if (!pages[slug] || result.rol !== 'CLIENTE') {
      clearSession();
      throw new Error('Este usuario no tiene un cliente corporativo autorizado.');
    }
    window.history.pushState({}, '', `/${slug}`);
    setSessionView({ role: 'CLIENTE', brand: slug, section: 'portal', nombre: result.usuario?.nombre, nombreCompleto: result.usuario?.nombre_completo || result.usuario?.nombre });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function logout() {
    clearSession();
    window.history.pushState({}, '', '/');
    setSessionView(null);
  }

  if (loading) return <main className="loading-screen"><span>Cargando acceso corporativo...</span></main>;

  if (sessionView?.role === 'ADMIN') return <AdminMessaging profile={sessionView.profile} onLogout={logout} />;
  if (sessionView?.role === 'CLIENTE' && sessionView.section === 'messages') {
    const page = pages[sessionView.brand];
    const closeMessages = () => {
      window.history.pushState({}, '', `/${page.id}`);
      setSessionView((current) => ({ ...current, section: 'portal' }));
    };
    return <><ClientMessaging page={page} nombre={sessionView.nombre} onBack={closeMessages} onLogout={logout} /><ClientFooter page={page} onNavigate={closeMessages} navigationLabel="Volver al portal" /></>;
  }
  if (sessionView?.role === 'CLIENTE') {
    const page = pages[sessionView.brand];
    const openMessages = () => {
      window.history.pushState({}, '', `/${page.id}/mensajes`);
      setSessionView((current) => ({ ...current, section: 'messages' }));
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    return <><CorporatePage page={page} nombre={sessionView.nombre} nombreCompleto={sessionView.nombreCompleto} onLogout={logout} onOpenChat={openMessages} /><ClientFooter page={page} onNavigate={openMessages} navigationLabel="Conversa con nosotros" /></>;
  }
  return <Login onLogin={authenticate} />;
}

function Login({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get('username')).trim().toLowerCase();
    const password = String(formData.get('password')).trim();
    if (!username || !password) return setError('Ingresa tu usuario y contraseña.');
    if (!/^[a-z0-9._-]+$/.test(username)) return setError('Ingresa solo el usuario, sin @ ni dominio.');
    const email = `${username}@luxcarequipamiento.pe`;
    setIsSubmitting(true);
    try {
      await onLogin(email, password);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="Acceso corporativo">
        <ResponsiveImage className="login-logo" sources={loginLogo} alt="Lux Car" />
        <div className="login-copy">
          <p>Plataforma corporativa</p>
          <h1>ACCESO A NUESTRO ENTORNO CORPORATIVO</h1>
          <span>Equipa, convierte y transforma tu vehículo.</span>
        </div>
        <form className="login-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <label htmlFor="username">Usuario</label>
          <div className="input-wrap">
            <UserRound size={19} aria-hidden="true" />
            <input id="username" name="username" type="text" placeholder="Ingresa tu usuario" autoComplete="username" inputMode="text" disabled={isSubmitting} />
          </div>
          <label htmlFor="password">Contraseña</label>
          <div className="input-wrap">
            <ShieldCheck size={19} aria-hidden="true" />
            <input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Ingresa tu clave" autoComplete="current-password" disabled={isSubmitting} />
            <button className="icon-button password-toggle" type="button" disabled={isSubmitting} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <><LoaderCircle className="button-spinner" size={20} /> Ingresando...</> : <>Iniciar sesión <ArrowRight size={19} /></>}
          </button>
        </form>
      </section>
      <section className="login-visual" aria-label="Negocio automotriz corporativo">
        <ResponsiveImage sources={loginVisual} alt="Ejecutivos junto a un vehículo corporativo Lux Car" />
        <div className="visual-caption"><span>Soluciones corporativas</span><strong>Equipamiento que impulsa tu negocio</strong></div>
      </section>
    </main>
  );
}

function CorporatePage({ page, nombre, nombreCompleto, onLogout, onOpenChat }) {
  const [showPrices, setShowPrices] = useState(false);
  const [catalogStarted, setCatalogStarted] = useState(false);
  const [quoteItems, setQuoteItems] = useState([]);
  const [modelNotice, setModelNotice] = useState('');
  const addToQuote = (item, group, type) => {
    if (quoteItems.some(entry => entry.model !== group.name)) {
      setModelNotice(`${SINGLE_MODEL_MESSAGE} Modelo de tu cotización: ${quoteItems[0].model}.`);
      return;
    }
    setModelNotice('');
    const key = `${type}:${group.id}:${item.id}`;
    setQuoteItems((current) => current.some((entry) => entry.key === key)
      ? current.map((entry) => entry.key === key ? { ...entry, quantity: Math.min(999, entry.quantity + 1) } : entry)
      : [...current, { ...item, key, model: group.name, type, quantity: 1 }]);
  };
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState('');
  const [catalogRetry, setCatalogRetry] = useState('');
  const [catalogReload, setCatalogReload] = useState(0);
  const [catalogSection, setCatalogSection] = useState('kits');
  const sectionKey = { kits: 'kits', accessories: 'productos', services: 'servicios_paquetes' }[catalogSection];
  const sectionLoaded = !!catalog && Object.hasOwn(catalog, sectionKey);

  useEffect(() => {
    if (page.id === 'chevrolet' || !showPrices || sectionLoaded) return undefined;
    let active = true;
    setCatalogError('');
    setCatalogRetry('');
    getCatalog(page.id, {
      section: catalogSection,
      onRetry: ({ section }) => { if (active) setCatalogRetry(section); }
    })
      .then((result) => { if (active) setCatalog(current => ({ ...current, ...result })); })
      .catch(() => { if (active) setCatalogError('No fue posible cargar el catálogo.'); })
      .finally(() => { if (active) setCatalogRetry(''); });
    return () => { active = false; };
  }, [page.id, showPrices, catalogReload, catalogSection]);

  const retryCatalog = () => {
    setCatalogError('');
    setCatalogReload((value) => value + 1);
  };

  const prices = catalogToPrices(catalog || {});
  return (
    <main className={`app-shell app-shell--${page.id}`} style={{ '--brand-accent': page.accent }}>
      <header className="topbar">
        <div className="brand-group">
          <ResponsiveImage className="lux-logo" sources={luxcarHeaderLogo} alt="Lux Car" />
          <span className="brand-divider" aria-hidden="true" />
          <ResponsiveImage className={`partner-logo ${page.id}`} sources={page.headerLogo} alt={page.name} />
        </div>
        <div className="account-area">
          <span><UserRound size={18} /> {allyLabel(nombre)} {nombre}</span>
          <button className="icon-button logout-button" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={20} /></button>
        </div>
      </header>
      <HeroBanner page={page} />
      <section className="action-row" aria-label="Acciones principales">
        <a className="action-button" href={page.brochure} download>
          <span className="action-icon"><Download size={22} /></span>
          <span><small>Documento corporativo</small>Descarga Brochure</span>
          <ArrowRight size={20} />
        </a>
        <button className="action-button" type="button" onClick={() => { setCatalogStarted(true); setShowPrices((value) => !value); }} aria-expanded={showPrices}>
          <span className="action-icon"><ShoppingBag size={22} /></span>
          <span><small>Catálogo y cotizador</small>{showPrices ? 'Ocultar catálogo' : 'Arma cotización'}</span>
          <ArrowRight size={20} />
        </button>
        <button className="action-button" type="button" onClick={onOpenChat}>
          <span className="action-icon"><MessageCircle size={22} /></span>
          <span><small>Atención personalizada</small>Conversa con nosotros</span>
          <ArrowRight size={20} />
        </button>
      </section>
      {catalogStarted && <div className="quotation-layout" hidden={!showPrices}>
        {page.id === 'chevrolet' ? <ProgressiveChevroletCatalog onAdd={addToQuote} quoteItems={quoteItems} /> : <PriceList prices={prices} onAdd={addToQuote} activeSection={catalogSection} onSectionChange={section => { setCatalogError(''); setCatalogRetry(''); setCatalogSection(section); }} loading={!sectionLoaded} loaded={catalog} error={catalogError} retryLabel={catalogRetry} onRetry={retryCatalog} />}
        <Quotation items={quoteItems} setItems={update => { setModelNotice(''); setQuoteItems(update); }} modelNotice={modelNotice} page={page} nombre={nombre} advisor={nombreCompleto} />
      </div>}
      <LineupCarousel page={page} />
    </main>
  );
}


function HeroBanner({ page }) {
  return (
    <section className="hero" aria-label={`Línea ${page.name}`}>
      <ResponsiveImage className="active" sources={page.banner} alt={`Vehículos corporativos ${page.name}`} />
      <div className="hero-overlay"><p>{page.eyebrow}</p><h1>{page.titleLines ? page.titleLines.map((line) => <span key={line}>{line}</span>) : page.title}</h1><span>{page.copy}</span></div>
    </section>
  );
}

function LineupCarousel({ page }) {
  const [activeSlide, setActiveSlide] = useState(0);
  useEffect(() => {
    setActiveSlide(0);
    const interval = window.setInterval(() => setActiveSlide((current) => (current + 1) % page.products.length), 4500);
    return () => window.clearInterval(interval);
  }, [page]);

  const moveSlide = (direction) => setActiveSlide((current) => (current + direction + page.products.length) % page.products.length);
  const image = page.slides[activeSlide % page.slides.length];

  return (
    <section className="lineup" aria-roledescription="carrusel" aria-label={`Nuestra línea ${page.name}`}>
      <div className="section-heading"><span>{page.lineupEyebrow || 'Flota corporativa'}</span><h2>{page.lineupTitle || `Nuestra línea ${page.name}`}</h2></div>
      <article className="lineup-slide">
        <ResponsiveImage sources={image.image} alt={image.alt} key={`${page.id}-${activeSlide}`} />
        <div className="lineup-caption">
          <span>{page.id === 'chevrolet' ? `${String(activeSlide + 1).padStart(2, '0')} / ${page.products.length}` : `0${activeSlide + 1} / 0${page.products.length}`}</span>
          <h3>{page.products[activeSlide]}</h3>
          <p>{page.lineupCopy || 'Configuración corporativa preparada para las necesidades de tu operación.'}</p>
        </div>
        <div className="lineup-controls">
          <button className="icon-button" onClick={() => moveSlide(-1)} aria-label="Vehículo anterior" title="Vehículo anterior"><ChevronLeft /></button>
          <div className="carousel-dots" aria-label="Seleccionar vehículo">
            {page.products.map((product, index) => <button className={index === activeSlide ? 'active' : ''} onClick={() => setActiveSlide(index)} aria-label={`Mostrar ${product}`} key={product} />)}
          </div>
          <button className="icon-button" onClick={() => moveSlide(1)} aria-label="Vehículo siguiente" title="Vehículo siguiente"><ChevronRight /></button>
        </div>
      </article>
    </section>
  );
}

function PriceList({ prices, onAdd, activeSection, onSectionChange, loading, loaded, error, retryLabel, onRetry }) {
  const sections = [
    { id: 'kits', title: 'Kits', icon: PackageCheck, groups: prices.kits },
    { id: 'services', title: 'Servicios', icon: Wrench, groups: prices.services },
    { id: 'accessories', title: 'Accesorios', icon: ShoppingBag, groups: prices.accessories }
  ].map((section) => ({
    ...section,
    count: section.groups.reduce((total, group) => total + group.items.length, 0)
  }));
  const selected = sections.find((section) => section.id === activeSection) || sections[0];

  return (
    <section className="catalog-panel" aria-label="Catálogo y precios">
      <div className="catalog-heading">
        <div><span>Catálogo actualizado</span><h2>Elige tu equipamiento</h2></div>
        <strong>{selected.count} {selected.count === 1 ? 'opción' : 'opciones'}</strong>
      </div>
      <div className="catalog-tabs" role="tablist" aria-label="Categorías del catálogo">
        {sections.map((section) => {
          const Icon = section.icon;
          const active = section.id === selected.id;
          const key = { kits: 'kits', services: 'servicios_paquetes', accessories: 'productos' }[section.id];
          return <button key={section.id} type="button" role="tab" aria-selected={active} className={active ? 'active' : ''} onClick={() => onSectionChange(section.id)}><Icon size={19} /><span>{section.title}</span><small>{loaded && Object.hasOwn(loaded, key) ? section.count : '—'}</small></button>;
        })}
      </div>
      <div className="catalog-content" role="tabpanel">{error ? <div className="catalog-status error" role="alert">{error}<button onClick={onRetry}>Reintentar</button></div> : loading ? <div className="catalog-status" role="status"><LoaderCircle className="button-spinner" size={21} />{retryLabel ? 'Reconectando...' : 'Cargando equipamiento...'}</div> : <ModelGroups groups={selected.groups} type={selected.id} onAdd={onAdd} />}</div>
    </section>
  );
}

function ModelGroups({ groups, type, onAdd }) {
  if (!groups.length) return <div className="catalog-empty">No hay opciones disponibles en esta categoría.</div>;
  return (
    <div className="model-groups">
      {groups.map((group) => (
        <details className="model-group" key={group.id}>
          <summary>
            <span className="model-icon"><CarFront size={20} /></span>
            <strong className="model-name">{group.name}</strong>
            <span className="model-count">{group.items.length}</span>
            <ChevronDown className="disclosure-icon" size={20} />
          </summary>
          <div className="model-content">
            {type === 'accessories'
              ? <ItemCards items={group.items} onAdd={(item) => onAdd(item, group, type)} />
              : <><div className="catalog-entry-heading" aria-hidden="true"><span>{type === 'services' ? 'Servicio / paquete' : 'Kit de equipamiento'}</span><span>Precio total</span><span /></div>{group.items.map((item) => <ExpandableItem key={item.id} item={item} showItemPrices={type === 'services'} onAdd={() => onAdd(item, group, type)} />)}</>}
          </div>
        </details>
      ))}
    </div>
  );
}

function ItemCards({ items, showPrices = true, onAdd }) {
  return (
    <>
      <div className="component-heading"><span>Incluye</span><strong>{items.length} {items.length === 1 ? 'elemento' : 'elementos'}</strong></div>
      {items.length ? <div className="catalog-table-wrap"><table className="catalog-table">
        <caption className="visually-hidden">Productos incluidos{showPrices ? ' y precios' : ''}</caption>
        <thead><tr><th scope="col">N.º</th><th scope="col">Producto / accesorio</th><th scope="col">Cantidad</th>{showPrices && <th scope="col">Precio</th>}{onAdd && <th scope="col">Cotizar</th>}</tr></thead>
        <tbody>{items.map((item, index) => <CatalogItem key={item.id} item={item} index={index} showPrice={showPrices} onAdd={onAdd} />)}</tbody>
      </table></div> : <span className="component-empty">Sin productos asociados.</span>}
    </>
  );
}

function CatalogItem({ item, index, showPrice, onAdd }) {
  return (
    <tr>
      <td className="catalog-number">{String(index + 1).padStart(2, '0')}</td>
      <th scope="row" className="catalog-product">{item.name}</th>
      <td className="catalog-quantity"><span>{item.quantity || 1}</span></td>
      {showPrice && <td className="catalog-price">{item.price || 'Por confirmar'}</td>}
      {onAdd && <td><AddToQuote onClick={() => onAdd(item)} name={item.name} /></td>}
    </tr>
  );
}

function ExpandableItem({ item, showItemPrices, onAdd }) {
  const description = item.description?.trim();
  const showDescription = description && description.localeCompare(item.name.trim(), 'es', { sensitivity: 'base' }) !== 0;
  return (
    <details className="catalog-entry">
      <summary>
        <strong className="entry-name">{item.name}</strong>
        <b className="catalog-total">{item.price || '—'}</b>
        <ChevronDown className="disclosure-icon" size={18} />
      </summary>
      <div className="entry-content">
        {showDescription && <p>{description}</p>}
        <ItemCards items={item.products} showPrices={showItemPrices} />
        <AddToQuote onClick={onAdd} name={item.name} />
      </div>
    </details>
  );
}

createRoot(document.getElementById('root')).render(<App />);
