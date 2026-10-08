import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { categoryLabel, formatMoney, quoteTotals, groupQuoteItems } from './quote-utils.js';

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
    ['Cliente', page.name], ['Asesor responsable', advisor || 'Sin especificar'], ['Contacto', details.contact || '—'], ['Empresa', page.name], ['Vehículo / placa', details.vehicle || 'Sin especificar']
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