import React, { useMemo, useState } from 'react';
import { CarFront, Search, Plus, Check, ArrowRight } from 'lucide-react';
import { formatMoney } from './quote-utils.js';
import './chevrolet-catalog.css';

const modelOrder = ['COLORADO WT', 'SILVERADO', 'N-400', 'GROOVE', 'TRACKER', 'CAPTIVA', 'TRAVERSE', 'SAIL', 'TAHOE', 'SUBURBAN'];
const imageOf = (name) => ({ 'COLORADO WT': 'colorado', 'N-400': 'n400' }[name] || name.toLowerCase());
const titleOf = (name) => name === 'N-400' ? name : name.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()).replace('Wt', 'WT');

export function ChevroletCatalog({ prices, onAdd, quoteItems }) {
  const models = useMemo(() => [...prices.accessories].sort((a,b) => modelOrder.indexOf(a.name) - modelOrder.indexOf(b.name)), [prices]);
  const [activeId, setActiveId] = useState(() => models[0]?.id);
  const [search, setSearch] = useState('');
  const current = models.find((model) => model.id === activeId) || models[0];
  const filtered = current?.items.filter((item) => item.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim())) || [];
  const currency = current?.items[0]?.currency || 'USD';
  const count = models.reduce((total, model) => total + model.items.length, 0);
  return (
    <section className="chevrolet-catalog" aria-labelledby="chevrolet-catalog-title">
      <div className="chevrolet-catalog-heading"><div><span>Equipamiento Chevrolet</span><h2 id="chevrolet-catalog-title">Tu modelo. Tu configuración.</h2><p>Explora las opciones para tu vehículo y agrégalas a tu cotización.</p></div><strong>{count}<small>opciones</small></strong></div>
      <div className="chevrolet-models" role="group" aria-label="Seleccionar modelo Chevrolet">
        {models.map((model) => <button type="button" key={model.id} aria-pressed={current?.id === model.id} className={current?.id === model.id ? 'active' : ''} onClick={() => { setActiveId(model.id); setSearch(''); }}>{titleOf(model.name)}<span>{model.items.length}</span></button>)}
      </div>
      {current && <>
        <div className="chevrolet-model-feature">
          <div><span><CarFront size={16} aria-hidden="true" /> Chevrolet</span><h3>{titleOf(current.name)}</h3><p>{current.items.length} opciones de equipamiento</p></div>
          <img src={`/images/chevrolet-${imageOf(current.name)}-desktop.jpg`} alt={`Chevrolet ${titleOf(current.name)}`} loading="lazy" />
        </div>
        <div className="chevrolet-catalog-toolbar"><label><Search size={18} aria-hidden="true" /><input type="search" aria-label={`Buscar equipamiento para ${current.name}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar accesorio o equipamiento" /></label><span>Precios en {currency === 'USD' ? 'USD · dólares' : currency}</span></div>
        <p className="chevrolet-results" role="status">{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'} para {titleOf(current.name)}</p>
        <div className="chevrolet-equipment-list">
          {filtered.map((item, index) => {
            const selected = quoteItems.find((entry) => entry.key === `accessories:${current.id}:${item.id}`);
            return <article className={`chevrolet-equipment${selected ? ' selected' : ''}`} key={item.id}>
              <span className="chevrolet-equipment-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="chevrolet-equipment-name"><h4>{item.name}</h4>{selected ? <span><Check size={12} aria-hidden="true" /> {selected.quantity} en tu orden</span> : <span>Compatible con {titleOf(current.name)}</span>}</div>
              <strong>{item.unitPrice === null ? 'Por confirmar' : formatMoney(item.unitPrice, item.currency)}</strong>
              <button type="button" onClick={() => onAdd(item, current, 'accessories')} aria-label={`Agregar ${item.name} para ${current.name} a la cotización`}><Plus size={17} aria-hidden="true" /><span>Agregar</span></button>
            </article>;
          })}
          {!filtered.length && <div className="chevrolet-no-results"><Search size={24} aria-hidden="true" /><p>No encontramos ese equipamiento en este modelo.</p><button type="button" onClick={() => setSearch('')}>Ver todas las opciones <ArrowRight size={16} /></button></div>}
        </div>
      </>}
      {!models.length && <p className="catalog-empty">No hay equipamiento disponible.</p>}
    </section>
  );
}