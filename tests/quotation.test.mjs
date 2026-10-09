import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogToPrices } from '../src/catalog.js';
import { quoteTotals, normalizeQuantity } from '../src/quote-utils.js';
import { buildQuotationPdf, buildOrderPdf, orderAmounts } from '../src/quotation-pdf.js';

test('purchase and service orders separate items, totals and vehicle details', () => {
  const options = { items: [
    { name: 'Protector de tolva', type: 'accessories', model: 'Colorado', unitPrice: 47348, quantity: 1, currency: 'USD' },
    { name: 'Polarizado nanoceramico', type: 'services', model: 'Colorado', unitPrice: 45455, quantity: 1, currency: 'USD' }
  ], page: { id: 'chevrolet', name: 'Chevrolet' }, details: { vehicle: 'Colorado WT', vin: 'VIN-123456', notes: 'PLACA T5V-892', contact: 'Cliente' }, reference: '26-010020', advisor: 'Juan Perez' };
  const purchase = buildOrderPdf({ ...options, documentType: 'purchase' }).output();
  const services = buildOrderPdf({ ...options, documentType: 'services' }).output();
  assert.ok(purchase.includes('ORDEN DE COMPRA'));
  assert.ok(purchase.includes('Protector de tolva'));
  assert.ok(!purchase.includes('Polarizado nanoceramico'));
  assert.ok(services.includes('ORDEN DE SERVICIO'));
  assert.ok(services.includes('Polarizado nanoceramico'));
  assert.ok(!services.includes('Protector de tolva'));
  for (const output of [purchase, services]) {
    assert.ok(output.includes('VIN-123456')); assert.ok(output.includes('PLACA T5V-892')); assert.ok(output.includes('Juan Perez'));
    assert.ok(!output.includes('Contacto del cliente'));
  }
  assert.deepEqual(orderAmounts([options.items[0]]), [{ currency: 'USD', base: 40125, tax: 7223, price: 47348 }]);
  assert.deepEqual(orderAmounts([options.items[1]]), [{ currency: 'USD', base: 38521, tax: 6934, price: 45455 }]);
  assert.throws(() => buildOrderPdf({ ...options, items: [options.items[0]], documentType: 'services' }), /No hay conceptos/);
});

test('order template supports many pages and pending prices for one model', () => {
  const doc = buildOrderPdf({ items: Array.from({ length: 100 }, (_, i) => ({ name: `Servicio ${i}`, type: 'services', model: 'Colorado', unitPrice: i ? 11800 : null, quantity: 2, currency: i % 3 ? 'USD' : 'PEN' })),
    page: { name: 'Chevrolet' }, details: { notes: 'Instalar en taller' }, reference: 'TEST', advisor: 'Asesor', documentType: 'services' });
  assert.ok(doc.getNumberOfPages() > 1);
  assert.ok(doc.output().includes('Por confirmar'));
  assert.ok(doc.output().includes('Modelo: Colorado'));
});

test('both order exports reject mixed models including across product types', () => {
  const options = { items: [
    { name: 'Accesorio', type: 'accessories', model: 'Colorado', unitPrice: 1000, quantity: 1, currency: 'USD' },
    { name: 'Tapizado', type: 'services', model: 'Silverado', unitPrice: 1000, quantity: 1, currency: 'USD' }
  ], page: { name: 'Chevrolet' }, details: { notes: '' }, reference: 'TEST' };
  for (const documentType of ['purchase', 'services']) {
    assert.throws(() => buildOrderPdf({ ...options, documentType }), /único modelo/);
  }
});

const model = { id_modelo: 3, nombre_modelo: 'Colorado' };
const product = (id, price, currency = 'PEN') => ({ id_producto: id, nombre: `Accesorio ${id}`, precio_venta: price, moneda: currency, modelo: model, tipo_producto: { codigo: 'ACC' } });

test('classified service products retain model, currency and price in the order', () => {
  const prices = catalogToPrices({ servicios: [{ ...product(7, '125.50', 'USD'), nombre: 'Tapizado de Asientos', tipo_producto: { codigo: 'SER' } }] });
  assert.equal(prices.services[0].name, 'Colorado');
  assert.equal(prices.services[0].items[0].unitPrice, 12550);
  assert.equal(prices.services[0].items[0].currency, 'USD');
  assert.equal(prices.services[0].items[0].id, 'product-7');
  assert.deepEqual(prices.accessories, []);
  const doc = buildQuotationPdf({ items: [{ ...prices.services[0].items[0], model: 'Colorado', type: 'services', quantity: 2 }],
    page: { id: 'chevrolet', name: 'Chevrolet', accent: '#d8b44c' },
    details: { contact: 'Cliente', vehicle: '', notes: '' }, reference: 'COT-SERVICIOS' });
  assert.ok(doc.output().includes('Servicio: Tapizado de Asientos'));
  assert.ok(doc.output().includes('251.00'));
});

test('catalog preserves numeric prices, zero, missing prices and standalone services', () => {
  const prices = catalogToPrices({ productos: [product(1, '19.90'), product(2, null), product(3, ''), product(4, 0), product(5, -3), product(6, 'no disponible')], servicios_paquetes: [{ id: 9, nombre: 'Instalacion', modelo: model, precio_venta: '50.25', moneda: 'USD' }] });
  assert.deepEqual(prices.accessories[0].items.map((item) => item.unitPrice), [1990, null, null, 0, null, null]);
  assert.equal(prices.services[0].items[0].unitPrice, 5025);
  assert.equal(prices.services[0].items[0].currency, 'USD');
  assert.deepEqual(prices.services[0].items[0].products, []);
});

test('totals use cents, keep currencies separate and count pending prices', () => {
  const result = quoteTotals([{ unitPrice: 1990, quantity: 3, currency: 'PEN' }, { unitPrice: 10, quantity: 3, currency: 'PEN' }, { unitPrice: 2500, quantity: 2, currency: 'USD' }, { unitPrice: null, quantity: 4, currency: 'PEN' }]);
  assert.deepEqual(result, { totals: [{ currency: 'PEN', amount: 6000 }, { currency: 'USD', amount: 5000 }], pending: 1 });
  assert.deepEqual(quoteTotals([]), { totals: [], pending: 0 });
});

test('quantities stay within positive integer limits', () => {
  assert.deepEqual([0, -2, '', 'wrong', 1.8, 2000].map(normalizeQuantity), [1, 1, 1, 1, 1, 999]);
});

test('kit components remain included without being added to the kit price', () => {
  const result = catalogToPrices({ kits: [{ id: 1, nombre: 'Kit', precio_venta: 100, productos: [{ ...product(2, 50), cantidad: 2 }] }] });
  const kit = result.kits[0].items[0];
  assert.equal(kit.products[0].quantity, 2);
  assert.deepEqual(quoteTotals([{ ...kit, quantity: 3 }]).totals, [{ currency: 'PEN', amount: 30000 }]);
});

test('PDF exports long orders across pages with totals, pending prices and notes', () => {
  const items = Array.from({ length: 80 }, (_, index) => ({ key: String(index), name: `Producto ${index}`, model: 'Colorado', type: 'kits', unitPrice: index === 0 ? null : 1990, quantity: 2, currency: 'PEN', products: [{ name: 'Componente incluido', quantity: 1 }] }));
  const doc = buildQuotationPdf({ items, page: { id: 'chevrolet', name: 'Chevrolet', accent: '#d8b44c' }, details: { contact: 'Cliente', company: 'Empresa', vehicle: 'ABC-123', notes: 'Instalar en taller' }, reference: 'COT-TEST', date: new Date('2026-10-07T14:00:00Z') });
  assert.ok(doc.getNumberOfPages() > 1);
  const output = doc.output();
  assert.ok(output.startsWith('%PDF-'));
  assert.ok(output.includes('COT-TEST'));
  assert.ok(output.includes('Por confirmar'));
  assert.ok(output.includes('Instalar en taller'));
  assert.ok(output.includes('3,144.20'));
});

test('empty orders cannot generate a PDF', () => {
  assert.throws(() => buildQuotationPdf({ items: [] }), /vac/);
});
test('the PDF includes the signed-in advisor without the client contact', () => {
  const doc = buildQuotationPdf({
    items: [{ name: 'Accesorio', model: 'Colorado', type: 'accessories', unitPrice: 1990, quantity: 1, currency: 'USD' }],
    page: { id: 'chevrolet', name: 'Chevrolet', accent: '#d8b44c' },
    details: { contact: 'Cliente comprador', company: 'Empresa', vehicle: '', notes: '' },
    reference: 'COT-ASESOR', advisor: 'Juan Carlos Perez Gomez'
  });
  const output = doc.output();
  assert.ok(output.includes('Juan Carlos Perez Gomez'));
  assert.ok(!output.includes('Cliente comprador'));
  assert.ok(output.includes('Asesor responsable'));
});

test('the PDF uses the signed-in brand as the company for Chevrolet and Ford', () => {
  for (const brand of ['Chevrolet', 'Ford']) {
    const doc = buildQuotationPdf({
      items: [{ name: 'Accesorio', model: 'Modelo', type: 'accessories', unitPrice: 1990, quantity: 1, currency: 'USD' }],
      page: { id: brand.toLowerCase(), name: brand, accent: '#d8b44c' },
      details: { contact: 'Comprador', company: 'Empresa incorrecta', vehicle: '', notes: '' },
      reference: 'COT-EMPRESA', advisor: 'Juan Perez'
    });
    assert.ok(doc.output().includes(brand));
    assert.ok(!doc.output().includes('Empresa incorrecta'));
  }
});

test('PDF groups interleaved selections by model, with model subtotals and a grand total', () => {
  const item = (name, model, unitPrice, quantity = 1) => ({ name, model, unitPrice, quantity, type: 'accessories', currency: 'USD' });
  const doc = buildQuotationPdf({
    items: [item('Accesorio A', 'Colorado', 1000, 2), item('Accesorio B', 'Silverado', 3000, 2), item('Accesorio C', 'Colorado', 2000)],
    page: { id: 'chevrolet', name: 'Chevrolet', accent: '#d8b44c' },
    details: { contact: 'Comprador', vehicle: '', notes: '' }, reference: 'COT-MODELOS', advisor: 'Juan Perez'
  });
  const output = doc.output();
  assert.ok(output.indexOf('Modelo: Colorado') < output.indexOf('Accesorio A'));
  assert.ok(output.indexOf('Accesorio A') < output.indexOf('Accesorio C'));
  assert.ok(output.indexOf('Accesorio C') < output.indexOf('Subtotal Colorado'));
  assert.ok(output.indexOf('Subtotal Colorado') < output.indexOf('Modelo: Silverado'));
  assert.ok(output.indexOf('Modelo: Silverado') < output.indexOf('Accesorio B'));
  assert.ok(output.indexOf('Accesorio B') < output.indexOf('Subtotal Silverado'));
  assert.ok(output.includes('40.00'));
  assert.ok(output.includes('60.00'));
  assert.ok(output.includes('100.00'));
  assert.ok(output.indexOf('TOTAL GENERAL') > output.indexOf('Subtotal Silverado'));
});
