import React from 'react';
import { ArrowRight, Download } from 'lucide-react';
import './client-footer.css';

export function ClientFooter({ page, onNavigate, navigationLabel }) {
  return (
    <footer className={`client-footer client-footer--${page.id}`} style={{ '--footer-accent': page.accent }}>
      <div className="client-footer-content">
        <div className="client-footer-identity">
          <div className="client-footer-logos">
            <img src="/Logos/Logo LuxCar.png" alt="Lux Car" loading="lazy" />
            <span aria-hidden="true" />
            <img className="client-footer-partner" src={page.logo} alt={page.name} loading="lazy" />
          </div>
          <p className="client-footer-eyebrow">Entorno corporativo {page.name}</p>
          <h2>{page.id === 'ford' ? 'Equipamiento para llegar más lejos.' : 'Más posibilidades para tu Chevrolet.'}</h2>
          <p>Accesorios, servicios y soluciones de Lux Car para tu flota {page.name}.</p>
        </div>
        <nav className="client-footer-links" aria-label={`Recursos para ${page.name}`}>
          <span>Estamos contigo</span>
          <a href={page.brochure} download><Download size={17} aria-hidden="true" /> Descargar brochure</a>
          <button type="button" onClick={onNavigate}>{navigationLabel}<ArrowRight size={17} aria-hidden="true" /></button>
        </nav>
      </div>
      <div className="client-footer-bottom">
        <small>© {new Date().getFullYear()} Lux Car Equipamiento. Todos los derechos reservados.</small>
        <span>Portal corporativo · {page.name}</span>
      </div>
    </footer>
  );
}