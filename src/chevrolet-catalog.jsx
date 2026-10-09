import React, { useEffect, useMemo, useState } from 'react';
import { CarFront, Search, Plus, Check, ArrowRight } from 'lucide-react';
import { formatMoney } from './quote-utils.js';
import { getAccessoryModels, getModelAccessories, getModelServices } from './api.js';
import { catalogToPrices } from './catalog.js';
import './chevrolet-catalog.css';

const modelOrder = ['COLORADO WT', 'SILVERADO', 'N-400', 'GROOVE', 'TRACKER', 'CAPTIVA', 'TRAVERSE', 'SAIL', 'TAHOE', 'SUBURBAN'];
const imageOf = (name) => ({ 'COLORADO WT': 'colorado', 'N-400': 'n400' }[name] || name.toLowerCase());
const titleOf = (name) => name === 'N-400' ? name : name.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()).replace('Wt', 'WT');

export function ProgressiveChevroletCatalog({ onAdd, quoteItems }) {
  const [models, setModels] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [cache, setCache] = useState({});
  const [category, setCategory] = useState('accessories');
  const cacheKey = `${category}:${activeId}`;
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    getAccessoryModels('chevrolet').then(result => {
      if (!active) return;
      const sorted = result.sort((a,b) => modelOrder.indexOf(a.name) - modelOrder.indexOf(b.name));
      setModels(sorted);
      setActiveId(current => current || sorted[0]?.id);
    }).catch(() => { if (active) setError('No fue posible cargar los modelos.'); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => {
    if (!activeId || Object.hasOwn(cache, cacheKey)) return;
    let active = true;
    setError('');
    const loader = category === 'services' ? getModelServices : getModelAccessories;
    loader('chevrolet', activeId).then(products => {
      const prices = catalogToPrices(category === 'services' ? { servicios: products } : { productos: products });
      if (active) setCache(current => ({ ...current, [cacheKey]: prices[category].flatMap(group => group.items) }));
    }).catch(() => { if (active) setError('No fue posible cargar el equipamiento de este modelo.'); });
    return () => { active = false; };
  }, [activeId, category, retry]);
  if (!models) return <div className="catalog-status" role={error ? 'alert' : 'status'}>{error || 'Cargando modelos...'}{error && <button onClick={() => setRetry(value => value + 1)}>Reintentar</button>}</div>;
  return <ChevroletCatalog prices={{ accessories: models.map(model => ({ ...model, items: cache[`${category}:${model.id}`] || [] })) }} category={category} onCategoryChange={type => { setError(''); setCategory(type); }} activeId={activeId} onModelChange={id => { setError(''); setActiveId(id); }} loading={!!activeId && !Object.hasOwn(cache, cacheKey)} error={error} onRetry={() => setRetry(value => value + 1)} onAdd={onAdd} quoteItems={quoteItems} />;
}

export function ChevroletCatalog({ prices, onAdd, quoteItems, activeId: selectedId, onModelChange, category = 'accessories', onCategoryChange, loading = false, error = '', onRetry }) {
  const models = useMemo(() => [...prices.accessories].sort((a,b) => modelOrder.indexOf(a.name) - modelOrder.indexOf(b.name)), [prices]);
  const [activeId, setActiveId] = useState(() => models[0]?.id);
  const [search, setSearch] = useState('');
  const current = models.find((model) => model.id === (selectedId ?? activeId)) || models[0];
  const filtered = current?.items.filter((item) => item.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim())) || [];
  const currency = current?.items[0]?.currency || 'USD';
  const count = models.reduce((total, model) => total + (model.count ?? model.items.length), 0);
  return (
    <section className="chevrolet-catalog" aria-labelledby="chevrolet-catalog-title">
      <div className="chevrolet-catalog-heading"><div><span>Equipamiento Chevrolet</span><h2 id="chevrolet-catalog-title">Tu modelo. Tu mejor versión.</h2><p>Explora las opciones para tu vehículo y agrégalas a tu cotización.</p></div><strong>{count}<small>opciones</small></strong></div>
      <div className="chevrolet-models" role="group" aria-label="Seleccionar modelo Chevrolet">
        {models.map((model) => <button type="button" key={model.id} aria-pressed={current?.id === model.id} className={current?.id === model.id ? 'active' : ''} onClick={() => { setActiveId(model.id); onModelChange?.(model.id); setSearch(''); }}>{titleOf(model.name)}<span>{model.count ?? model.items.length}</span></button>)}
      </div>
      {current && <>
        <div className="chevrolet-model-feature">
          <div><span><CarFront size={16} aria-hidden="true" /> Chevrolet</span><h3>{titleOf(current.name)}</h3><p>{current.count ?? current.items.length} opciones de equipamiento</p></div>
          <img src={`/images/chevrolet-${imageOf(current.name)}-desktop.jpg`} alt={`Chevrolet ${titleOf(current.name)}`} loading="lazy" />
        </div>
        <div className="chevrolet-catalog-toolbar"><label><Search size={18} aria-hidden="true" /><input type="search" aria-label={`Buscar equipamiento para ${current.name}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar accesorio o equipamiento" /></label><span>Precios en {currency === 'USD' ? 'USD · dólares' : currency}</span></div>
        <div className="chevrolet-models" role="tablist" aria-label="Tipo de producto">
          {[['accessories', 'Accesorios'], ['services', 'Servicios']].map(([type, label]) => <button key={type} type="button" role="tab" aria-selected={category === type} className={category === type ? 'active' : ''} onClick={() => { onCategoryChange?.(type); setSearch(''); }}>{label}{current[type] !== undefined && <span>{current[type]}</span>}</button>)}
        </div>
        <p className="chevrolet-results" role="status">{loading ? 'Cargando equipamiento...' : `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'} para ${titleOf(current.name)}`}</p>
        {error && <div className="catalog-status error" role="alert">{error}<button onClick={onRetry}>Reintentar</button></div>}
        <div className="chevrolet-equipment-list">
          {filtered.map((item, index) => {
            const selected = quoteItems.find((entry) => entry.key === `${category}:${current.id}:${item.id}`);
            return <article className={`chevrolet-equipment${selected ? ' selected' : ''}`} key={item.id}>
              <span className="chevrolet-equipment-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="chevrolet-equipment-name"><h4>{item.name}</h4>{selected ? <span><Check size={12} aria-hidden="true" /> {selected.quantity} en tu orden</span> : <span>Compatible con {titleOf(current.name)}</span>}</div>
              <strong>{item.unitPrice === null ? 'Por confirmar' : formatMoney(item.unitPrice, item.currency)}</strong>
              <button type="button" onClick={() => onAdd(item, current, category)} aria-label={`Agregar ${item.name} para ${current.name} a la cotización`}><Plus size={17} aria-hidden="true" /><span>Agregar</span></button>
            </article>;
          })}
          {!loading && !error && !filtered.length && <div className="chevrolet-no-results"><Search size={24} aria-hidden="true" /><p>No encontramos ese equipamiento en este modelo.</p><button type="button" onClick={() => setSearch('')}>Ver todas las opciones <ArrowRight size={16} /></button></div>}
        </div>
      </>}
      {!models.length && <p className="catalog-empty">No hay equipamiento disponible.</p>}
    </section>
  );
}
