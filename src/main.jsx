import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight, ChevronLeft, ChevronRight, Download, Eye, EyeOff,
  LogOut, PackageCheck, ShieldCheck, ShoppingBag, UserRound, Wrench
} from 'lucide-react';
import { clearSession, getAccessToken, getCatalog, getMe, login } from './api.js';
import './styles.css';

const BROCHURE_URL = '/Brochure%20LuxCar%20x%20Chevrolet/LUXCAR%20X%20CHEVROLET.ai';

const pages = {
  ford: {
    id: 'ford', name: 'Ford', logo: '/Logos/LogoFord.png', accent: '#1677d2',
    banner: '/images/page-adventure.png',
    eyebrow: 'Linea corporativa 4x4',
    title: 'Fuerza que lleva tu negocio mas lejos',
    copy: 'Soluciones preparadas para trabajo de campo, seguridad y rutas exigentes.',
    slides: [
      { image: '/images/ford-pickup-carousel.png', alt: 'Pickup corporativa recorriendo una ruta de montana' },
      { image: '/images/ford-suv-carousel.png', alt: 'SUV corporativa frente a un refugio ejecutivo' }
    ],
    products: ['Pickup Pro', 'SUV Command', 'Trail Max', 'Cargo Elite'],
    prices: {
      kits: [
        { name: 'Kit Operativo Plus', price: '$1,250', includes: ['Barra antivuelco', 'Protector de tolva', 'Lamina de seguridad'] },
        { name: 'Kit Seguridad Campo', price: '$980', includes: ['Faros auxiliares', 'Alarma GPS', 'Botiquin vehicular'] }
      ],
      accessories: [
        { name: 'Rack de techo reforzado', price: '$320' },
        { name: 'Estribos laterales', price: '$260' },
        { name: 'Cubrepiso industrial', price: '$95' }
      ],
      services: [
        { name: 'Instalacion certificada', price: '$180' },
        { name: 'Mantenimiento preventivo', price: '$140' },
        { name: 'Entrega corporativa', price: '$90' }
      ]
    }
  },
  chevrolet: {
    id: 'chevrolet', name: 'Chevrolet', logo: '/Logos/Logo Chevrolet.png', accent: '#d8b44c',
    banner: '/images/page-executive.png',
    eyebrow: 'Linea ejecutiva urbana',
    title: 'Versatilidad para cada desafio',
    copy: 'Vehiculos preparados para empresas que necesitan imagen, confort y disponibilidad diaria.',
    slides: [
      { image: '/images/chevrolet-sedan-carousel.png', alt: 'Sedan ejecutivo circulando por un distrito corporativo' },
      { image: '/images/chevrolet-fleet-carousel.png', alt: 'Van y crossover corporativos en una plaza urbana' }
    ],
    products: ['Sedan Executive', 'Urban Crossover', 'Passenger Van', 'Fleet Select'],
    prices: {
      kits: [
        { name: 'Kit Ejecutivo Comfort', price: '$1,100', includes: ['Tapizado premium', 'Polarizado UV', 'Organizador de cabina'] },
        { name: 'Kit Flota Inteligente', price: '$890', includes: ['Rastreo GPS', 'Camara dual', 'Sensor de fatiga'] }
      ],
      accessories: [
        { name: 'Cargador multiple USB-C', price: '$75' },
        { name: 'Soporte tablet ejecutivo', price: '$130' },
        { name: 'Maletero modular', price: '$210' }
      ],
      services: [
        { name: 'Lavado premium mensual', price: '$65' },
        { name: 'Asistencia 24/7', price: '$120' },
        { name: 'Gestion documental', price: '$85' }
      ]
    }
  }
};

function App() {
  const [activeBrand, setActiveBrand] = useState(null);
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
        const slug = profile.cliente?.slug;
        if (!pages[slug] || profile.rol !== 'CLIENTE') throw new Error('Cliente no autorizado');
        setActiveBrand(slug);
        window.history.replaceState({}, '', `/${slug}`);
      } catch {
        clearSession();
        window.history.replaceState({}, '', '/');
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  async function authenticate(email, password) {
    const result = await login(email, password);
    const slug = result.cliente?.slug;
    if (!pages[slug] || result.rol !== 'CLIENTE') {
      clearSession();
      throw new Error('Este usuario no tiene un cliente corporativo autorizado.');
    }
    window.history.pushState({}, '', `/${slug}`);
    setActiveBrand(slug);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function logout() {
    clearSession();
    window.history.pushState({}, '', '/');
    setActiveBrand(null);
  }

  if (loading) return <main className="loading-screen"><span>Cargando acceso corporativo...</span></main>;

  return activeBrand
    ? <CorporatePage page={pages[activeBrand]} onLogout={logout} />
    : <Login onLogin={authenticate} />;
}

function Login({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get('username')).trim().toLowerCase();
    const password = String(formData.get('password')).trim();
    if (!username || !password) return setError('Ingresa tu usuario y contrasena.');
    if (!/^[a-z0-9._-]+$/.test(username)) return setError('Ingresa solo el usuario, sin @ ni dominio.');
    const email = `${username}@luxcarequipamiento.pe`;
    try {
      await onLogin(email, password);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="Acceso corporativo">
        <img className="login-logo" src="/Logos/Logo LuxCar.png" alt="Lux Car" />
        <div className="login-copy">
          <p>Plataforma corporativa</p>
          <h1>Acceso exclusivo para nuestros clientes</h1>
          <span>Gestiona equipamiento, accesorios y servicios para tu flota.</span>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Usuario</label>
          <div className="input-wrap">
            <UserRound size={19} aria-hidden="true" />
            <input id="username" name="username" type="text" placeholder="empresaford" autoComplete="username" inputMode="text" />
          </div>
          <label htmlFor="password">Contrasena</label>
          <div className="input-wrap">
            <ShieldCheck size={19} aria-hidden="true" />
            <input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Ingresa tu contrasena" autoComplete="current-password" />
            <button className="icon-button password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'} title={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}>
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit">Iniciar sesion <ArrowRight size={19} /></button>
        </form>
      </section>
      <section className="login-visual" aria-label="Negocio automotriz corporativo">
        <img src="/images/login-business.png" alt="Ejecutivos cerrando un negocio junto a un vehiculo corporativo" />
        <div className="visual-caption"><span>Soluciones corporativas</span><strong>Equipamiento que impulsa tu negocio</strong></div>
      </section>
    </main>
  );
}

function CorporatePage({ page, onLogout }) {
  const [showPrices, setShowPrices] = useState(false);
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    getCatalog(page.id).then(setCatalog).catch((error) => setCatalogError(error.message));
  }, [page.id]);

  const prices = catalog ? catalogToPrices(catalog) : null;
  return (
    <main className="app-shell" style={{ '--brand-accent': page.accent }}>
      <header className="topbar">
        <div className="brand-group">
          <img className="lux-logo" src="/Logos/Logo LuxCar.png" alt="Lux Car" />
          <span className="brand-divider" aria-hidden="true" />
          <img className={`partner-logo ${page.id}`} src={page.logo} alt={page.name} />
        </div>
        <div className="account-area">
          <span><UserRound size={18} /> Usuario {page.name}</span>
          <button className="icon-button logout-button" onClick={onLogout} aria-label="Cerrar sesion" title="Cerrar sesion"><LogOut size={20} /></button>
        </div>
      </header>
      <HeroBanner page={page} />
      <section className="action-row" aria-label="Acciones principales">
        <a className="action-button" href={BROCHURE_URL} download>
          <span className="action-icon"><Download size={22} /></span>
          <span><small>Documento corporativo</small>Descargar brochure</span>
          <ArrowRight size={20} />
        </a>
        <button className="action-button" type="button" onClick={() => setShowPrices((value) => !value)} aria-expanded={showPrices}>
          <span className="action-icon"><ShoppingBag size={22} /></span>
          <span><small>Catalogo actualizado</small>{showPrices ? 'Ocultar lista de precios' : 'Ver lista de precios'}</span>
          <ArrowRight size={20} />
        </button>
      </section>
      {showPrices && !prices && !catalogError && <div className="catalog-status">Cargando lista de precios...</div>}
      {showPrices && catalogError && <div className="catalog-status error">{catalogError}</div>}
      {showPrices && prices && <PriceList prices={prices} />}
      <LineupCarousel page={page} />
    </main>
  );
}

function catalogToPrices(catalog) {
  const products = catalog.productos || [];
  const formatPrice = (value, currency) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return String(value ?? '');
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: currency || 'PEN' }).format(amount);
  };
  const mapProduct = (item) => ({ name: item.nombre, price: formatPrice(item.precio_venta, item.moneda) });
  return {
    kits: (catalog.kits || []).map((kit) => ({
      name: kit.nombre,
      price: formatPrice(kit.precio_venta, kit.moneda),
      includes: (kit.productos || []).map((item) => item.cantidad > 1 ? `${item.nombre} x${item.cantidad}` : item.nombre)
    })),
    accessories: products.filter((item) => (item.tipo_producto || item.tipo)?.codigo === 'ACC').map(mapProduct),
    services: products.filter((item) => (item.tipo_producto || item.tipo)?.codigo === 'SER').map(mapProduct)
  };
}

function HeroBanner({ page }) {
  return (
    <section className="hero" aria-label={`Linea ${page.name}`}>
      <img className="active" src={page.banner} alt={`Vehiculos corporativos ${page.name}`} />
      <div className="hero-overlay"><p>{page.eyebrow}</p><h1>{page.title}</h1><span>{page.copy}</span></div>
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
    <section className="lineup" aria-roledescription="carrusel" aria-label={`Nuestra linea ${page.name}`}>
      <div className="section-heading"><span>Flota corporativa</span><h2>Nuestra linea {page.name}</h2></div>
      <article className="lineup-slide">
        <img src={image.image} alt={image.alt} key={`${image.image}-${activeSlide}`} />
        <div className="lineup-caption">
          <span>0{activeSlide + 1} / 0{page.products.length}</span>
          <h3>{page.products[activeSlide]}</h3>
          <p>Configuracion corporativa preparada para las necesidades de tu operacion.</p>
        </div>
        <div className="lineup-controls">
          <button className="icon-button" onClick={() => moveSlide(-1)} aria-label="Vehiculo anterior" title="Vehiculo anterior"><ChevronLeft /></button>
          <div className="carousel-dots" aria-label="Seleccionar vehiculo">
            {page.products.map((product, index) => <button className={index === activeSlide ? 'active' : ''} onClick={() => setActiveSlide(index)} aria-label={`Mostrar ${product}`} key={product} />)}
          </div>
          <button className="icon-button" onClick={() => moveSlide(1)} aria-label="Vehiculo siguiente" title="Vehiculo siguiente"><ChevronRight /></button>
        </div>
      </article>
    </section>
  );
}

function PriceList({ prices }) {
  return (
    <section className="price-list" aria-label="Lista de precios">
      <PriceCard number="01" title="Kits" icon={<PackageCheck size={21} />}>
        {prices.kits.map((kit) => <div className="price-block" key={kit.name}><div className="price-row strong"><span>{kit.name}</span><b>{kit.price}</b></div><p>Incluye:</p><ul>{kit.includes.map((item) => <li key={item}>{item}</li>)}</ul></div>)}
      </PriceCard>
      <PriceCard number="02" title="Accesorios" icon={<ShoppingBag size={21} />}>
        {prices.accessories.map((item) => <div className="price-row" key={item.name}><span>{item.name}</span><b>{item.price}</b></div>)}
      </PriceCard>
      <PriceCard number="03" title="Servicios" icon={<Wrench size={21} />}>
        {prices.services.map((item) => <div className="price-row" key={item.name}><span>{item.name}</span><b>{item.price}</b></div>)}
      </PriceCard>
    </section>
  );
}

function PriceCard({ number, title, icon, children }) {
  return <article className="price-card"><div className="price-title"><span>{icon}</span><h3>{title}</h3><small>{number}</small></div>{children}</article>;
}

createRoot(document.getElementById('root')).render(<App />);
