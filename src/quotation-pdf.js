import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { categoryLabel, formatMoney, quoteTotals, groupQuoteItems, hasMultipleModels, SINGLE_MODEL_MESSAGE } from './quote-utils.js';

export async function loadQuotationLogos(page) {
  const load = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No fue posible cargar los logos de la orden'));
    image.src = src;
  });
  const [luxcar, client] = await Promise.all([
    load('/Logos/Logo LuxCar.png'),
    load(page.logo)
  ]);
  return { luxcar, client };
}

// The reference template separates tax already included in the displayed price.
export function orderAmounts(items) {
  const amounts = new Map();
  for (const item of items) {
    if (!Number.isFinite(item.unitPrice)) continue;
    const price = item.unitPrice * item.quantity;
    const base = Math.round(price / 1.18);
    const currency = item.currency || 'PEN';
    const total = amounts.get(currency) || { currency, base: 0, tax: 0, price: 0 };
    total.base += base; total.tax += price - base; total.price += price;
    amounts.set(currency, total);
  }
  return [...amounts.values()];
}

export function buildOrderPdf({ items, page, details, reference, advisor, logos, documentType, date = new Date() }) {
  if (hasMultipleModels(items)) throw new Error(SINGLE_MODEL_MESSAGE);
  if (!['purchase', 'services'].includes(documentType)) throw new Error('Tipo de orden inválido');
  const selected = items.filter(item => documentType === 'services' ? item.type === 'services' : item.type !== 'services');
  if (!selected.length) throw new Error('No hay conceptos para esta orden');
  const doc = new jsPDF();
  const title = documentType === 'services' ? 'ORDEN DE SERVICIO' : 'ORDEN DE COMPRA';
  const dateLabel = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Bogota', dateStyle: 'full' }).format(date);
  const red = [222, 0, 0];
  const drawnPages = new Set();
  const header = () => {
    const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
    if (drawnPages.has(pageNumber)) return;
    drawnPages.add(pageNumber);
    doc.setFillColor(0); doc.rect(0, 0, 210, 40, 'F');
    doc.setFillColor(24); doc.triangle(0, 0, 65, 0, 0, 40, 'F'); doc.triangle(210, 12, 210, 40, 105, 40, 'F');
    doc.setFillColor(...red); doc.triangle(90, 0, 100, 8, 110, 0, 'F'); doc.rect(100, 0, 110, 8, 'F');
    doc.rect(0, 34, 104, 8, 'F'); doc.triangle(104, 34, 112, 42, 104, 42, 'F');
    doc.setDrawColor(255); doc.setLineWidth(.7); doc.line(0, 34, 104, 34); doc.line(104, 34, 112, 42);
    if (logos) {
      const add = (image, x, boxWidth) => {
        const scale = Math.min(boxWidth / image.naturalWidth, 16 / image.naturalHeight);
        const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
        doc.addImage(image, 'PNG', x + (boxWidth - w) / 2, 19 - h / 2, w, h);
      };
      add(logos.client, 12, 23); add(logos.luxcar, 39, 30);
      doc.setDrawColor(255); doc.setLineWidth(.3); doc.line(37, 13, 37, 26);
    } else {
      doc.setTextColor(255); doc.setFontSize(14); doc.text(`${page.name} | LUXCAR`, 12, 22);
    }
    doc.setFont('times', 'bold'); doc.setTextColor(255); doc.setFontSize(17);
    const leftWord = 'INC', rightWord = 'MOTORS', symbolWidth = 5;
    const wordStart = 196 - doc.getTextWidth(leftWord) - symbolWidth - doc.getTextWidth(rightWord);
    doc.text(leftWord, wordStart, 18);
    const symbolX = wordStart + doc.getTextWidth(leftWord);
    // Brand lettering: lambda-shaped A, without a crossbar, as in the reference.
    doc.setDrawColor(255); doc.setLineWidth(.5);
    doc.line(symbolX + .5, 18, symbolX + 2.5, 13.8);
    doc.line(symbolX + 2.5, 13.8, symbolX + 4.5, 18);
    doc.setLineWidth(.3); doc.line(symbolX, 18, symbolX + 1.3, 18); doc.line(symbolX + 3.7, 18, symbolX + 5, 18);
    doc.text(rightWord, symbolX + symbolWidth, 18);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150); doc.setFontSize(6.5);
    doc.text(['NOVA AUTOS S.A.C', 'RUC: 20601818672', 'LATERAL 2 MZ2. LOTE. 695 ALTO EL CURAL SECC E', 'AREQUIPA - CERRO COLORADO'], 127, 24);
    doc.setTextColor(30); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(`${title} ${reference}`, 105, 57, { align: 'center' });
    doc.setFillColor(...red); doc.rect(107, 293, 103, 4, 'F'); doc.triangle(107, 293, 104, 297, 107, 297, 'F');
    doc.setFillColor(0); doc.rect(0, 294, 100, 3, 'F'); doc.triangle(100, 294, 98, 297, 100, 297, 'F');
  };
  const options = { margin: { top: 68, bottom: 18, left: 12, right: 12 }, styles: { fontSize: 8, cellPadding: 2.4, overflow: 'linebreak' }, headStyles: { fillColor: red, textColor: 255, halign: 'center' }, didDrawPage: header };
  doc.setFillColor(...red); doc.rect(12, 79, 1.6, 20, 'F'); doc.rect(123, 79, 1.6, 20, 'F');
  autoTable(doc, { ...options, startY: 78, margin: { ...options.margin, left: 18 }, theme: 'plain', styles: { ...options.styles, fontSize: 7, cellPadding: 1 }, body: [
    ['Proveedor: 20616616227 - LUXCAR EQUIPAMIENTO Y SEGURIDAD S.A.C.', `Fecha: ${dateLabel}`],
    ['Contacto: Mz. E Lote 09 - Urb. El Valle II Etapa · +51 938 348 314', 'Estado: En compra'],
    [`Vehículo: ${details.vehicle || selected.map(item => item.model).filter((name,index,list) => list.indexOf(name) === index).join(', ')}`, 'Modalidad: CREDITO'],
    [`Nº de Serie o VIN: ${details.vin || '—'}`, `Requerido por: ${advisor || 'Sin especificar'}`],
    [`Observación: ${details.notes?.trim() || '—'}`, '']
  ], columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 70 } } });
  const nextY = (gap = 8) => {
    const y = doc.lastAutoTable.finalY + gap;
    if (y > 235) { doc.addPage(); return 68; }
    return y;
  };
  let index = 0;
  for (const group of groupQuoteItems(selected)) {
    const totals = orderAmounts(group.items);
    autoTable(doc, { ...options, startY: nextY(14), theme: 'grid', head: [
      [{ content: `Modelo: ${group.model}`, colSpan: 6, styles: { halign: 'left' } }],
      ['N°', 'Producto / Servicio', 'Detalle', 'Valor de compra', 'I.G.V', 'PRECIO']
    ], body: group.items.map(item => {
      const amount = orderAmounts([item])[0];
      return [String(++index), item.name, `${item.quantity} x${item.products?.length ? '\n' + item.products.map(product => `${product.quantity || 1} x ${product.name}`).join('; ') : ''}`,
        amount ? formatMoney(amount.base, amount.currency) : 'Por confirmar', amount ? formatMoney(amount.tax, amount.currency) : 'Por confirmar', amount ? formatMoney(amount.price, amount.currency) : 'Por confirmar'];
    }), foot: totals.map(total => [{ content: `Subtotal ${group.model}`, colSpan: 3 }, formatMoney(total.base, total.currency), formatMoney(total.tax, total.currency), formatMoney(total.price, total.currency)]),
      showFoot: 'lastPage', footStyles: { fillColor: [225, 225, 225], textColor: 25, fontStyle: 'bold' },
      bodyStyles: { fillColor: [238, 236, 236], lineColor: [255, 255, 255], lineWidth: 1 },
      columnStyles: { 0: { cellWidth: 14, halign: 'center' }, 1: { cellWidth: 65 }, 2: { cellWidth: 27 }, 3: { cellWidth: 29, halign: 'right' }, 4: { cellWidth: 24, halign: 'right' }, 5: { cellWidth: 27, halign: 'right' } }
    });
  }
  const totals = orderAmounts(selected);
  autoTable(doc, { ...options, startY: nextY(), margin: { ...options.margin, left: 143 }, theme: 'plain', body: totals.flatMap(total => [
    [`Subtotal (${total.currency}):`, formatMoney(total.base, total.currency)], ['I.G.V (18 %):', formatMoney(total.tax, total.currency)], ['TOTAL GENERAL:', formatMoney(total.price, total.currency)]
  ]).concat(selected.some(item => !Number.isFinite(item.unitPrice)) ? [['Precios pendientes:', 'Por confirmar']] : []),
    styles: { ...options.styles, fillColor: [225, 225, 225] }, columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 25, halign: 'right' } } });
  for (let i = 1; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(110);
    doc.text(`Página ${i} de ${doc.getNumberOfPages()}`, 198, 287, { align: 'right' });
  }
  return doc;
}

export function buildQuotationPdf({ items, page, details, reference, advisor, logos, date = new Date() }) {
  if (!items.length) throw new Error('La cotización está vacía');
  const doc = new jsPDF();
  const accent = page.accent;
  const dateLabel = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', dateStyle: 'long' }).format(date);
  const drawHeader = () => {
    doc.setFillColor(accent);
    doc.rect(0, 0, 210, 4, 'F');
    doc.setFillColor(0);
    doc.rect(0, 4, 210, 30, 'F');
    if (logos) {
      const addLogo = (image, x, boxWidth) => {
        const scale = Math.min(boxWidth / image.naturalWidth, 18 / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        doc.addImage(image, 'PNG', x + (boxWidth - width) / 2, 19 - height / 2, width, height);
      };
      addLogo(logos.luxcar, 14, 65);
      addLogo(logos.client, 156, 40);
    } else {
      doc.setTextColor(255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.text(`LUX CAR | ${page.name}`, 14, 22);
    }
    doc.setTextColor(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('COTIZACIÓN / ORDEN DE SERVICIO', 14, 44);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${reference} | ${dateLabel}`, 14, 51);
  };
  const options = { margin: { top: 59, bottom: 24, left: 14, right: 14 }, styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' }, headStyles: { fillColor: accent, textColor: page.id === 'chevrolet' ? 20 : 255 }, didDrawPage: drawHeader };
  autoTable(doc, { ...options, startY: 59, theme: 'plain', body: [
    ['Cliente', page.name], ['Asesor responsable', advisor || 'Sin especificar'], ['Empresa', page.name], ['Vehículo / placa', details.vehicle || 'Sin especificar']
  ], columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' } } });
  const models = groupQuoteItems(items);
  const nextSectionY = (gap = 7) => {
    const y = doc.lastAutoTable.finalY + gap;
    if (y > doc.internal.pageSize.getHeight() - 75) {
      doc.addPage();
      return 59;
    }
    return y;
  };
  const summaries = [];
  for (const { model, items: modelItems, totals, pending } of models) {
    autoTable(doc, { ...options, startY: nextSectionY(),
      head: [
        [{ content: `Modelo: ${model}`, colSpan: 4, styles: { fontSize: 11, halign: 'left' } }],
        ['Accesorio / servicio', 'Cant.', 'Precio unitario', 'Importe']
      ],
      body: modelItems.map((item) => [
        `${categoryLabel[item.type]}: ${item.name}${item.products?.length ? '\nIncluye: ' + item.products.map((product) => `${product.quantity || 1} x ${product.name}`).join('; ') : ''}`,
        String(item.quantity), item.unitPrice === null ? 'Por confirmar' : formatMoney(item.unitPrice, item.currency), item.unitPrice === null ? 'Por confirmar' : formatMoney(item.unitPrice * item.quantity, item.currency)
      ]),
      foot: [
        ...totals.map((total) => [
          { content: pending ? `Subtotal ${model} (confirmado)` : `Subtotal ${model}`, colSpan: 3 },
          { content: formatMoney(total.amount, total.currency), styles: { halign: 'right' } }
        ]),
        ...(pending ? [[{ content: `${pending} concepto(s) con precio por confirmar`, colSpan: 3 }, 'Por confirmar']] : [])
      ],
      showFoot: 'lastPage',
      footStyles: { fillColor: [238, 240, 243], textColor: 25, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 15, halign: 'center' }, 2: { cellWidth: 38, halign: 'right' }, 3: { cellWidth: 39, halign: 'right' } }
    });
    summaries.push(...totals.map((total) => [model, formatMoney(total.amount, total.currency)]));
    if (pending) summaries.push([`${model} · ${pending} concepto(s) pendiente(s)`, 'Por confirmar']);
  }
  const { totals, pending } = quoteTotals(items);
  autoTable(doc, { ...options, startY: nextSectionY(),
    head: [['Resumen por modelo', 'Subtotal']],
    body: summaries,
    foot: totals.length
      ? totals.map((total) => [pending ? 'Total general con precio confirmado' : 'TOTAL GENERAL', formatMoney(total.amount, total.currency)])
      : [['TOTAL GENERAL', 'Por confirmar']],
    showFoot: 'lastPage',
    footStyles: { ...options.headStyles, fontStyle: 'bold', fontSize: 11 },
    columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } }
  });
  autoTable(doc, { ...options, startY: nextSectionY(6), theme: 'plain', body: [
    ...(pending ? [['Precio pendiente', `${pending} concepto(s) por confirmar`]] : []),
    ...(details.notes.trim() ? [['Observaciones', details.notes.trim()]] : []),
    ['Estado', 'Cotización preliminar sujeta a confirmación de Lux Car. Este documento no confirma una orden de trabajo.']
  ], columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' } } });
  const count = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= count; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Lux Car Equipamiento | Entorno corporativo', 14, 285);
    doc.text(`Página ${pageNumber} de ${count}`, 196, 285, { align: 'right' });
  }
  return doc;
}
