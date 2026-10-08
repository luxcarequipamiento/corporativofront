import React, { useState } from 'react';
import { Download, FileText, Plus, Trash2, LoaderCircle } from 'lucide-react';
import { categoryLabel, formatMoney, normalizeQuantity, quoteTotals, groupQuoteItems } from './quote-utils.js';
import './quotation.css';

export function AddToQuote({ onClick, name }) {
  return <button type="button" className="quote-add" onClick={onClick} aria-label={`Agregar ${name} a la cotización`}><Plus size={16} aria-hidden="true" /> Agregar</button>;
}

export function Quotation({ items, setItems, page, nombre, advisor }) {
  const [details, setDetails] = useState({ contact: nombre || '', company: page.name, vehicle: '', notes: '' });
  const [reference, setReference] = useState(() => `COT-${Date.now().toString(36).toUpperCase()}`);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const { totals, pending } = quoteTotals(items);
  const groups = groupQuoteItems(items);
  const updateField = (field, value) => setDetails((current) => ({ ...current, [field]: value }));
  const download = async () => {
    setError('');
    setExporting(true);
    try {
      const { buildQuotationPdf, loadQuotationLogos } = await import('./quotation-pdf.js');
      const logos = await loadQuotationLogos(page);
      const doc = buildQuotationPdf({ items, page, details, reference, advisor, logos });
      doc.save(`${reference}-${page.id}.pdf`);
    } catch {
      setError('No fue posible generar el PDF. Intenta descargarlo nuevamente.');
    } finally { setExporting(false); }
  };
  const clear = () => {
    setItems([]);
    setReference(`COT-${Date.now().toString(36).toUpperCase()}`);
    setError('');
  };
  return (
    <aside className="quote-panel" aria-labelledby="quote-title">
      <div className="quote-heading"><FileText size={22} aria-hidden="true" /><div><span>Cotización {page.name}</span><h2 id="quote-title">Tu orden de servicio</h2></div></div>
      <p className="quote-intro">Elige del catálogo y arma el equipamiento de tu vehículo.</p>
      <div className="quote-fields">
        <label>Asesor responsable<input value={advisor || nombre || 'Sin especificar'} readOnly /></label>
        <label>Contacto<input maxLength={100} value={details.contact} onChange={(e) => updateField('contact', e.target.value)} autoComplete="name" /></label>
        <label>Empresa<input value={page.name} readOnly /></label>
        <label>Vehículo / placa<input maxLength={100} value={details.vehicle} onChange={(e) => updateField('vehicle', e.target.value)} placeholder="Modelo y placa (opcional)" /></label>
      </div>
      <div className="quote-selection" aria-live="polite" aria-atomic="false">
        {!items.length ? <div className="quote-empty"><ShoppingPlaceholder /><p>Tu orden está vacía.</p><span>Usa «Agregar» en un kit, servicio o accesorio.</span></div> : groups.map((group) => (
          <section className="quote-model" key={group.model} aria-label={`Orden para ${group.model}`}>
            <div className="quote-model-heading"><h3>{group.model}</h3><span>{group.items.length} {group.items.length === 1 ? 'concepto' : 'conceptos'}</span></div>
            <div className="quote-table-scroll" tabIndex={0} role="region" aria-label={`Tabla de ${group.model}`}>
              <table className="quote-table">
                <caption className="visually-hidden">Equipamiento y subtotal de {group.model}</caption>
                <colgroup><col className="quote-col-item" /><col className="quote-col-quantity" /><col className="quote-col-price" /><col className="quote-col-price" /><col className="quote-col-remove" /></colgroup>
                <thead><tr><th scope="col">Concepto</th><th scope="col">Cant.</th><th scope="col">P. unitario</th><th scope="col">Importe</th><th scope="col"><span className="visually-hidden">Quitar</span></th></tr></thead>
                <tbody>{group.items.map((item) => (
                  <tr key={item.key}>
                    <th scope="row" className="quote-table-item"><span>{item.name}</span><small>{categoryLabel[item.type]}</small>
                      {item.products?.length > 0 && <details className="quote-includes"><summary>Incluye</summary><ul>{item.products.map((product, index) => <li key={`${product.id}-${index}`}>{product.quantity || 1} × {product.name}</li>)}</ul></details>}
                    </th>
                    <td><input type="number" min="1" max="999" step="1" aria-label={`Cantidad de ${item.name} para ${group.model}`} value={item.quantity} onChange={(e) => { const quantity = normalizeQuantity(e.target.value); setItems((current) => current.map((entry) => entry.key === item.key ? { ...entry, quantity } : entry)); }} /></td>
                    <td className="quote-table-money">{item.unitPrice === null ? 'Por confirmar' : formatMoney(item.unitPrice, item.currency)}</td>
                    <td className="quote-table-money quote-table-amount">{item.unitPrice === null ? 'Por confirmar' : formatMoney(item.unitPrice * item.quantity, item.currency)}</td>
                    <td className="quote-table-action"><button className="quote-remove" type="button" aria-label={`Quitar ${item.name} para ${group.model}`} onClick={() => setItems((current) => current.filter((entry) => entry.key !== item.key))}><Trash2 size={14} /></button></td>
                  </tr>
                ))}</tbody>
                <tfoot>{group.totals.map((total) => <tr key={total.currency}><th scope="row" colSpan={3}>Subtotal{group.pending ? ' confirmado' : ''}</th><td colSpan={2}>{formatMoney(total.amount, total.currency)}</td></tr>)}
                  {group.pending > 0 && <tr className="quote-table-pending"><th scope="row" colSpan={3}>{group.pending} {group.pending === 1 ? 'precio pendiente' : 'precios pendientes'}</th><td colSpan={2}>Por confirmar</td></tr>}
                </tfoot>
              </table>
            </div>
          </section>
        ))}
      </div>
      <label className="quote-notes">Observaciones<textarea maxLength={1200} rows={2} value={details.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Detalles de instalación o requerimientos adicionales" /></label>
      <div className="quote-totals" aria-live="polite"><span>{pending ? 'Total general confirmado' : 'Total general'}</span>{totals.map((total) => <strong key={total.currency}>{formatMoney(total.amount, total.currency)}</strong>)}{!totals.length && <strong>{items.length ? 'Por confirmar' : '—'}</strong>}{pending > 0 && <small>{pending} {pending === 1 ? 'concepto pendiente' : 'conceptos pendientes'} de precio.</small>}</div>
      <p className="quote-disclaimer">Cotización preliminar sujeta a confirmación de Lux Car. La descarga no confirma una orden de trabajo.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="quote-download" type="button" disabled={!items.length || exporting} onClick={download}>{exporting ? <LoaderCircle className="button-spinner" size={18} /> : <Download size={18} />}{exporting ? 'Generando PDF...' : 'Descargar cotización PDF'}</button>
      {items.length > 0 && <button className="quote-clear" type="button" onClick={clear} disabled={exporting}>Vaciar orden</button>}
    </aside>
  );
}
function ShoppingPlaceholder() { return <FileText size={28} aria-hidden="true" />; }