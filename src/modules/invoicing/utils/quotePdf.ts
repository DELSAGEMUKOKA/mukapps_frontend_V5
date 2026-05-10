import { jsPDF } from 'jspdf';
import type { Quote } from '../api/invoicingApi';

function fmtAmount(val: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}

function fmtDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR').format(new Date(dateStr));
}

const BRAND = '#2563EB';

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function generateQuotePdf(quote: Quote, currencySymbol = 'FCFA'): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const colRight = pageW - margin;
  let y = margin;

  const brand = hexToRgb(BRAND);

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...brand);
  doc.rect(0, 0, pageW, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DEVIS', margin, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(quote.quoteNumber, margin, 20);

  // Status badge on the right
  const statusLabel: Record<string, string> = {
    DRAFT: 'Brouillon', SENT: 'Envoyé', ACCEPTED: 'Accepté',
    REJECTED: 'Rejeté', CONVERTED: 'Converti',
  };
  doc.setFontSize(9);
  doc.text(statusLabel[quote.status] ?? quote.status, colRight, 17, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  y = 36;

  // ── Client + meta block ──────────────────────────────────────────────────────
  // Left: client info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 120, 120);
  doc.text('CLIENT', margin, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  const clientName = quote.client
    ? `${quote.client.firstName} ${quote.client.lastName}`
    : quote.clientId;
  doc.text(clientName, margin, y);
  y += 5;

  if (quote.client?.email) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(quote.client.email, margin, y);
    y += 4;
  }
  if (quote.client?.phone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(quote.client.phone, margin, y);
    y += 4;
  }

  // Right: dates block
  const metaX = pageW / 2 + 10;
  let metaY = 36;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 120, 120);
  doc.text('INFORMATIONS', metaX, metaY);
  metaY += 4;

  const metaRows: [string, string][] = [
    ['Date d\'émission', fmtDate(quote.createdAt)],
    ['Validité', `${quote.validityDays} jours`],
  ];
  if (quote.expiresAt) {
    metaRows.push(['Expire le', fmtDate(quote.expiresAt)]);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const [label, val] of metaRows) {
    doc.setTextColor(100, 100, 100);
    doc.text(label, metaX, metaY);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(val, colRight, metaY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    metaY += 5;
  }

  y = Math.max(y, metaY) + 6;

  // ── Subject ──────────────────────────────────────────────────────────────────
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, pageW - margin * 2, 9, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text(`Objet : ${quote.subject}`, margin + 3, y + 5.5);
  y += 14;

  // ── Line items table ─────────────────────────────────────────────────────────
  const col = {
    desc: margin,
    qty: margin + 95,
    pu: margin + 118,
    total: colRight,
  };

  // Table header
  doc.setFillColor(...brand);
  doc.rect(margin, y, pageW - margin * 2, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Description', col.desc + 2, y + 4.5);
  doc.text('Qté', col.qty, y + 4.5, { align: 'center' });
  doc.text('PU HT', col.pu, y + 4.5, { align: 'right' });
  doc.text('Total HT', col.total, y + 4.5, { align: 'right' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);

  quote.items.forEach((item, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, pageW - margin * 2, 7, 'F');
    }
    const lineTotal = item.quantity * item.unitPrice;
    doc.setTextColor(30, 30, 30);
    const descLines = doc.splitTextToSize(item.description, 85);
    doc.text(descLines[0], col.desc + 2, y + 4.5);
    doc.text(String(item.quantity), col.qty, y + 4.5, { align: 'center' });
    doc.text(fmtAmount(item.unitPrice), col.pu, y + 4.5, { align: 'right' });
    doc.text(fmtAmount(lineTotal), col.total, y + 4.5, { align: 'right' });
    y += 7;
  });

  // Border around table
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.rect(margin, y - quote.items.length * 7 - 7, pageW - margin * 2, quote.items.length * 7 + 7);
  y += 4;

  // ── Totals ───────────────────────────────────────────────────────────────────
  const totalsX = pageW / 2;
  const totalsW = pageW / 2 - margin;

  const totals: [string, string, boolean?][] = [
    [`Total HT`, `${fmtAmount(quote.subtotal)} ${currencySymbol}`],
  ];
  if (quote.taxAmount > 0) {
    totals.push([`TVA`, `${fmtAmount(quote.taxAmount)} ${currencySymbol}`]);
  }
  if (quote.discountPercentage > 0) {
    totals.push([`Réduction (${quote.discountPercentage}%)`, `- ${fmtAmount(quote.discountAmount)} ${currencySymbol}`]);
  }
  totals.push([`TOTAL TTC`, `${fmtAmount(quote.totalAmount)} ${currencySymbol}`, true]);

  for (const [label, value, isBold] of totals) {
    if (isBold) {
      doc.setFillColor(...brand);
      doc.rect(totalsX, y, totalsW, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(label, totalsX + 3, y + 5.5);
      doc.text(value, colRight, y + 5.5, { align: 'right' });
      y += 8;
    } else {
      doc.setFillColor(245, 245, 245);
      doc.rect(totalsX, y, totalsW, 6, 'F');
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(label, totalsX + 3, y + 4);
      doc.text(value, colRight, y + 4, { align: 'right' });
      y += 6;
    }
  }

  y += 6;

  // ── Notes / Terms ─────────────────────────────────────────────────────────────
  if (quote.notes || quote.terms) {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y, colRight, y);
    y += 5;
  }

  if (quote.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('NOTES', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const noteLines = doc.splitTextToSize(quote.notes, pageW - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 3;
  }

  if (quote.terms) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('CONDITIONS', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const termLines = doc.splitTextToSize(quote.terms, pageW - margin * 2);
    doc.text(termLines, margin, y);
    y += termLines.length * 4 + 3;
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFillColor(...brand);
  doc.rect(0, footerY - 4, pageW, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Document généré le ${fmtDate(new Date().toISOString())} — ${quote.quoteNumber}`, pageW / 2, footerY + 2, { align: 'center' });

  doc.save(`devis_${quote.quoteNumber}.pdf`);
}
