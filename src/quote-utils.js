export const categoryLabel = { kits: 'Kit', accessories: 'Accesorio', services: 'Servicio' };
export const SINGLE_MODEL_MESSAGE = 'Cada orden de compra o de servicio debe corresponder a un único modelo de vehículo. Para cotizar otro modelo, vacía la cotización actual y crea una nueva.';
export const hasMultipleModels = (items) => new Set(items.map(item => item.model)).size > 1;
export const formatMoney = (cents, currency = 'PEN') => new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(cents / 100);
export function quoteTotals(items) {
  const totals = new Map();
  let pending = 0;
  for (const item of items) {
    if (item.unitPrice === null || !Number.isFinite(item.unitPrice)) { pending += 1; continue; }
    totals.set(item.currency, (totals.get(item.currency) || 0) + item.unitPrice * item.quantity);
  }
  return { totals: [...totals].map(([currency, amount]) => ({ currency, amount })), pending };
}
export function normalizeQuantity(value) {
  return Math.max(1, Math.min(999, Math.trunc(Number(value) || 1)));
}
export function groupQuoteItems(items) {
  const groups = new Map();
  for (const item of items) {
    const model = item.model || 'Sin modelo asignado';
    if (!groups.has(model)) groups.set(model, []);
    groups.get(model).push(item);
  }
  return [...groups].map(([model, entries]) => ({ model, items: entries, ...quoteTotals(entries) }));
}
