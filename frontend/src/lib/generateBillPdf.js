import { jsPDF } from 'jspdf';

/**
 * Generates and downloads a clean, strictly SINGLE-PAGE 80mm THERMAL RECEIPT TICKET PDF.
 * Formatted exactly like an authentic restaurant POS thermal bill/ticket.
 * Includes complete statutory GST details (CGST 2.5%, SGST 2.5%, SAC 996331, GSTIN, State Code).
 */
export function downloadSinglePageBillPdf({
  order = {},
  restaurantSettings = {},
  customerName = '',
  customerPhone = '',
  currentTable = ''
}) {
  try {
    const restName = (restaurantSettings?.restaurantName || 'ATMIYA DOSA HUB').toUpperCase();
    const tagline = restaurantSettings?.tagline || 'Pure Veg Authentic Taste • Petlad';
    const address = restaurantSettings?.address || 'Station Road, Opp. Atmiya Complex, Petlad - 388450';
    const phone = restaurantSettings?.phone || '+91 63530 59221';
    const gstin = restaurantSettings?.gstin || '24AAACA1234A1Z5';
    const fssai = restaurantSettings?.fssai || '20723031000123';
    const stateName = 'Gujarat';
    const stateCode = '24';
    const sacCode = '996331'; // Restaurant Services under GST

    const orderId = order.id || order.order_id || 'ORD-001';
    const tableNo = order.table_number || currentTable || '01';
    const guestName = customerName || order.customer_name || 'Valued Guest';
    const guestPhone = customerPhone || order.customer_phone || '';
    const orderTime = order.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const orderDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const items = Array.isArray(order.items) ? order.items : [];
    const paymentMode = order.payment_mode || 'Cash on Delivery';
    const paymentStatus = order.payment_status || (order.status === 'Completed' || order.status === 'served' ? 'Paid' : 'Payment Due');
    const collector = order.paid_collected_by || 'Cashier / Floor Staff';

    // Comprehensive GST & Amount Normalization
    const rawTotal = Number(order.total || order.total_amount || 0);
    let rawSubtotal = Number(order.subtotal || 0);
    const rawDiscount = Number(order.discount || 0);
    const rawTax = Number(order.tax || 0);

    // If subtotal is not set or 0, calculate from items
    if (rawSubtotal <= 0 && items.length > 0) {
      rawSubtotal = items.reduce((sum, it) => sum + (Number(it.price || it.unit_price || 0) * Number(it.qty || it.quantity || 1)), 0);
    }

    // If subtotal is still 0, reverse calculate from total (assuming 5% GST inclusive)
    if (rawSubtotal <= 0 && rawTotal > 0) {
      rawSubtotal = Math.round((rawTotal / 1.05) * 100) / 100;
    }

    // Compute taxable amount
    const taxableAmount = Math.max(0, Math.round((rawSubtotal - rawDiscount) * 100) / 100);

    // If rawTax is 0 or missing, calculate 5% GST on taxable amount
    let totalTax = rawTax;
    if (totalTax <= 0 && taxableAmount > 0) {
      totalTax = Math.round(taxableAmount * 0.05 * 100) / 100;
    }

    // Exact 50-50 CGST and SGST split
    const cgstRate = 2.5;
    const sgstRate = 2.5;
    const cgstAmount = Math.round((totalTax / 2) * 100) / 100;
    const sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;

    // Final grand total
    const grandTotal = rawTotal > 0 ? rawTotal : Math.round((taxableAmount + totalTax) * 100) / 100;

    // Calculate Dynamic Ticket Height (in mm) for 80mm Roll Width
    // 80mm width standard thermal ticket geometry
    const pageWidth = 80;
    const margin = 4;
    const contentWidth = pageWidth - (margin * 2); // 72mm

    // Measure exact height needed so it fits on 1 page
    const estimatedHeight = 150 + (items.length * 5.8) + (rawDiscount > 0 ? 5 : 0);
    const pageHeight = Math.max(165, Math.ceil(estimatedHeight));

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidth, pageHeight],
      compress: true
    });

    let y = 6;

    // Helper: Draw Dashed Divider
    const drawDashedDivider = (yPos) => {
      try {
        doc.setLineDashPattern([1.2, 0.8], 0);
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.setLineWidth(0.2);
        doc.line(margin, yPos, margin + contentWidth, yPos);
        doc.setLineDashPattern([], 0);
      } catch {
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.2);
        doc.line(margin, yPos, margin + contentWidth, yPos);
      }
    };

    // Helper: Draw Double Solid Divider
    const drawDoubleDivider = (yPos) => {
      doc.setDrawColor(30, 41, 59); // slate-800
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, margin + contentWidth, yPos);
      doc.line(margin, yPos + 0.6, margin + contentWidth, yPos + 0.6);
    };

    // 1. TOP PERFORATED TEAR-OFF LINE
    drawDashedDivider(y);
    y += 4;

    // 2. RESTAURANT LOGO & STATUTORY HEADER (Centered Ticket Style)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(restName, pageWidth / 2, y, { align: 'center' });
    y += 4.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(tagline, pageWidth / 2, y, { align: 'center' });
    y += 3.5;

    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139); // slate-500
    // Split address if long
    const splitAddress = doc.splitTextToSize(address, contentWidth);
    doc.text(splitAddress, pageWidth / 2, y, { align: 'center' });
    y += (splitAddress.length * 3);

    doc.text(`Ph: ${phone}`, pageWidth / 2, y, { align: 'center' });
    y += 3.2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`GSTIN: ${gstin}  |  State: ${stateName} (${stateCode})`, pageWidth / 2, y, { align: 'center' });
    y += 3.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`FSSAI Lic No: ${fssai}`, pageWidth / 2, y, { align: 'center' });
    y += 4;

    // 3. TICKET TITLE BAR (Black Filled or Bordered Ticket Pill)
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(margin, y, contentWidth, 5.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('*** TAX INVOICE & DINING BILL ***', pageWidth / 2, y + 3.8, { align: 'center' });
    y += 8;

    // 4. ORDER & TABLE METADATA (Compact Ticket Format)
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);

    // Row 1: Bill No & Date
    doc.setFont('helvetica', 'bold');
    doc.text('BILL NO:', margin, y);
    doc.setTextColor(15, 23, 42);
    doc.text(`#${orderId}`, margin + 14, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('DATE:', margin + 42, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(orderDate, margin + 51, y);
    y += 3.8;

    // Row 2: Table & Time
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('TABLE:', margin, y);
    doc.setTextColor(234, 88, 12); // Orange
    doc.text(`TABLE ${tableNo}`, margin + 14, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('TIME:', margin + 42, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(orderTime, margin + 51, y);
    y += 3.8;

    // Row 3: Guest & Status
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('GUEST:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const cleanGuest = guestName.length > 18 ? guestName.substring(0, 18) + '...' : guestName;
    doc.text(`${cleanGuest}${guestPhone ? ` (${guestPhone})` : ''}`, margin + 14, y);
    y += 4.5;

    // 5. ITEMIZED DISHES TABLE HEADER
    drawDashedDivider(y);
    y += 3.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text('ITEM', margin, y);
    doc.text('QTY', margin + 44, y, { align: 'center' });
    doc.text('RATE', margin + 57, y, { align: 'right' });
    doc.text('AMOUNT', margin + contentWidth, y, { align: 'right' });
    y += 1.8;

    drawDashedDivider(y);
    y += 3.8;

    // 6. DISHES TABLE ROWS
    doc.setFontSize(6.8);
    items.forEach((item, idx) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);

      const itemName = (item.name || 'Dish').replace(/[^\x20-\x7E]/g, '').trim();
      const shortName = itemName.length > 22 ? itemName.substring(0, 22) + '..' : itemName;
      doc.text(`${idx + 1}. ${shortName}`, margin, y);

      const qty = item.qty || item.quantity || 1;
      doc.text(`${qty}x`, margin + 44, y, { align: 'center' });

      const price = Number(item.price || item.unit_price || 0).toFixed(2);
      doc.text(price, margin + 57, y, { align: 'right' });

      const itemTotal = (Number(item.price || item.unit_price || 0) * qty).toFixed(2);
      doc.setFont('helvetica', 'bold');
      doc.text(itemTotal, margin + contentWidth, y, { align: 'right' });

      y += 4.5;
    });

    drawDashedDivider(y);
    y += 3.8;

    // 7. SUBTOTAL & DISCOUNT
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Items Subtotal:', margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${rawSubtotal.toFixed(2)}`, margin + contentWidth, y, { align: 'right' });
    y += 4;

    if (rawDiscount > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(22, 101, 52); // green-800
      doc.text('Discount Applied:', margin, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`-Rs. ${rawDiscount.toFixed(2)}`, margin + contentWidth, y, { align: 'right' });
      y += 4;
    }

    drawDashedDivider(y);
    y += 3.5;

    // 8. STATUTORY GST COMPLIANCE BREAKDOWN (Requested by User)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, y, contentWidth, 23, 1, 1, 'FD');

    const gstY = y + 3.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(`GST TAX INVOICE DETAILS (SAC: ${sacCode})`, margin + 2, gstY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Taxable Value of Supply:', margin + 2, gstY + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${taxableAmount.toFixed(2)}`, margin + contentWidth - 2, gstY + 4.2, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Central GST (CGST @ ${cgstRate}%):`, margin + 2, gstY + 8.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${cgstAmount.toFixed(2)}`, margin + contentWidth - 2, gstY + 8.2, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`State GST (SGST @ ${sgstRate}%):`, margin + 2, gstY + 12.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${sgstAmount.toFixed(2)}`, margin + contentWidth - 2, gstY + 12.2, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Total GST Tax (5.0%):', margin + 2, gstY + 16.5);
    doc.text(`Rs. ${totalTax.toFixed(2)}`, margin + contentWidth - 2, gstY + 16.5, { align: 'right' });

    y += 26;

    // 9. GRAND TOTAL SPOTLIGHT (Double Line & Prominent Highlight)
    drawDoubleDivider(y);
    y += 3.5;

    doc.setFillColor(240, 253, 244); // emerald-50
    doc.setDrawColor(34, 197, 94); // emerald-500
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(21, 128, 61); // emerald-700
    doc.text('NET AMOUNT PAID:', margin + 2.5, y + 5.5);
    doc.text(`Rs. ${grandTotal.toFixed(2)}`, margin + contentWidth - 2.5, y + 5.5, { align: 'right' });
    y += 11;

    drawDoubleDivider(y);
    y += 3.5;

    // 10. PAYMENT VERIFICATION STAMP
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('PAYMENT MODE:', margin, y);
    doc.setTextColor(15, 23, 42);
    doc.text(`${paymentMode} (${paymentStatus.toUpperCase()})`, margin + 24, y);
    y += 3.8;

    doc.setTextColor(71, 85, 105);
    doc.text('COLLECTED BY:', margin, y);
    doc.setTextColor(15, 23, 42);
    doc.text(collector, margin + 24, y);
    y += 4.5;

    drawDashedDivider(y);
    y += 3.5;

    // 11. TICKET FOOTER & GUEST NOTE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('*** THANK YOU! PLEASE VISIT AGAIN ***', pageWidth / 2, y, { align: 'center' });
    y += 3.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('100% Pure Veg • Authentic Gujarat & Live Tawa Taste', pageWidth / 2, y, { align: 'center' });
    y += 3;
    doc.text('Official Computer Generated Receipt • No Signature Required', pageWidth / 2, y, { align: 'center' });
    y += 3.5;

    // Bottom Tear Line
    drawDashedDivider(y);

    // Safety: ensure only single page is emitted
    while (doc.getNumberOfPages() > 1) {
      doc.deletePage(doc.getNumberOfPages());
    }

    const cleanFileId = String(orderId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Atmiya_Bill_Ticket_${cleanFileId}.pdf`;
    doc.save(filename);

    return { success: true, filename };
  } catch (err) {
    console.error('[PDF GENERATION ERROR]', err);
    return { success: false, error: err.message };
  }
}

/**
 * Clean Single-Page Printing via an isolated, hidden iframe.
 * Pre-formatted specifically for 80mm POS Thermal Receipt Printers.
 * Includes complete statutory GST details (CGST, SGST, SAC 996331, GSTIN).
 */
export function printSinglePageReceipt({
  order = {},
  restaurantSettings = {},
  customerName = '',
  customerPhone = '',
  currentTable = ''
}) {
  try {
    const restName = (restaurantSettings?.restaurantName || 'ATMIYA DOSA HUB').toUpperCase();
    const tagline = restaurantSettings?.tagline || 'Pure Veg Authentic Taste • Petlad';
    const address = restaurantSettings?.address || 'Station Road, Opp. Atmiya Complex, Petlad - 388450';
    const phone = restaurantSettings?.phone || '+91 63530 59221';
    const gstin = restaurantSettings?.gstin || '24AAACA1234A1Z5';
    const fssai = restaurantSettings?.fssai || '20723031000123';
    const stateName = 'Gujarat';
    const stateCode = '24';
    const sacCode = '996331';

    const orderId = order.id || order.order_id || 'ORD-001';
    const tableNo = order.table_number || currentTable || '01';
    const guestName = customerName || order.customer_name || 'Valued Guest';
    const guestPhone = customerPhone || order.customer_phone || '';
    const orderTime = order.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const orderDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const items = Array.isArray(order.items) ? order.items : [];
    const paymentMode = order.payment_mode || 'Cash on Delivery';
    const paymentStatus = order.payment_status || (order.status === 'Completed' || order.status === 'served' ? 'Paid' : 'Payment Due');
    const collector = order.paid_collected_by || 'Cashier / Floor Staff';

    // Comprehensive GST & Amount Normalization
    const rawTotal = Number(order.total || order.total_amount || 0);
    let rawSubtotal = Number(order.subtotal || 0);
    const rawDiscount = Number(order.discount || 0);
    const rawTax = Number(order.tax || 0);

    if (rawSubtotal <= 0 && items.length > 0) {
      rawSubtotal = items.reduce((sum, it) => sum + (Number(it.price || it.unit_price || 0) * Number(it.qty || it.quantity || 1)), 0);
    }

    if (rawSubtotal <= 0 && rawTotal > 0) {
      rawSubtotal = Math.round((rawTotal / 1.05) * 100) / 100;
    }

    const taxableAmount = Math.max(0, Math.round((rawSubtotal - rawDiscount) * 100) / 100);

    let totalTax = rawTax;
    if (totalTax <= 0 && taxableAmount > 0) {
      totalTax = Math.round(taxableAmount * 0.05 * 100) / 100;
    }

    const cgstRate = 2.5;
    const sgstRate = 2.5;
    const cgstAmount = Math.round((totalTax / 2) * 100) / 100;
    const sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;
    const grandTotal = rawTotal > 0 ? rawTotal : Math.round((taxableAmount + totalTax) * 100) / 100;

    const itemsRowsHtml = items.map((it, idx) => `
      <tr style="border-bottom: 1px dashed #cbd5e1;">
        <td style="padding: 4px 2px; text-align: left; font-size: 11px;">${idx + 1}. ${escapeHtml(it.name)}</td>
        <td style="padding: 4px 2px; text-align: center; font-size: 11px;">${it.qty || it.quantity || 1}x</td>
        <td style="padding: 4px 2px; text-align: right; font-size: 11px;">₹${Number(it.price || it.unit_price || 0).toFixed(2)}</td>
        <td style="padding: 4px 2px; text-align: right; font-weight: bold; font-size: 11px;">₹${(Number(it.price || it.unit_price || 0) * (it.qty || it.quantity || 1)).toFixed(2)}</td>
      </tr>
    `).join('');

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt_${escapeHtml(orderId)}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 3mm;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
              font-size: 11px;
              line-height: 1.35;
            }
            .no-print { display: none !important; }
          }
          body {
            margin: 0 auto;
            padding: 8px 6px;
            background: #fff;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
            font-size: 11px;
            max-width: 320px;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .mono { font-family: monospace; }
          .divider-dashed { border-top: 1px dashed #94a3b8; margin: 6px 0; }
          .divider-solid { border-top: 1.5px solid #0f172a; margin: 6px 0; }
          .divider-double { border-top: 3px double #0f172a; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; margin: 5px 0; font-size: 11px; }
          th { border-bottom: 1.5px solid #0f172a; padding: 4px 2px; font-size: 10.5px; }
          .gst-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; margin: 6px 0; font-size: 10.5px; }
          .total-box { background: #f0fdf4; border: 1.5px solid #22c55e; border-radius: 6px; padding: 6px; margin: 6px 0; }
        </style>
      </head>
      <body>
        <div class="divider-dashed"></div>

        <div class="text-center">
          <div style="font-size: 15px; font-weight: 900; letter-spacing: 0.5px;">${escapeHtml(restName)}</div>
          <div style="font-size: 10px; color: #475569;">${escapeHtml(tagline)}</div>
          <div style="font-size: 9px; color: #64748b;">${escapeHtml(address)}</div>
          <div style="font-size: 9px; color: #64748b;">Ph: ${escapeHtml(phone)}</div>
          <div style="font-size: 9.5px; font-weight: bold; color: #0f172a; margin-top: 2px;">
            GSTIN: ${escapeHtml(gstin)} | State: ${escapeHtml(stateName)} (${escapeHtml(stateCode)})
          </div>
          <div style="font-size: 9px; color: #64748b;">FSSAI Lic: ${escapeHtml(fssai)}</div>
        </div>

        <div class="divider-solid"></div>

        <div class="text-center bold" style="font-size: 10.5px; background: #1e293b; color: #fff; padding: 3px 0; border-radius: 4px;">
          *** TAX INVOICE & DINING BILL ***
        </div>

        <div style="margin-top: 6px; font-size: 10.5px; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between;">
            <span><strong>BILL NO:</strong> #${escapeHtml(orderId)}</span>
            <span><strong>DATE:</strong> ${escapeHtml(orderDate)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span><strong>TABLE:</strong> <span style="color: #ea580c; font-weight: bold;">Table ${escapeHtml(tableNo)}</span></span>
            <span><strong>TIME:</strong> ${escapeHtml(orderTime)}</span>
          </div>
          <div>
            <strong>GUEST:</strong> ${escapeHtml(guestName)} ${guestPhone ? `(+91 ${escapeHtml(guestPhone)})` : ''}
          </div>
        </div>

        <div class="divider-dashed"></div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left;">Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>

        <div class="divider-dashed"></div>

        <div style="font-size: 11px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Items Subtotal:</span>
            <span class="mono bold">₹${rawSubtotal.toFixed(2)}</span>
          </div>
          ${rawDiscount > 0 ? `
            <div style="display: flex; justify-content: space-between; color: #15803d; margin-bottom: 2px;">
              <span>Discount Applied:</span>
              <span class="mono bold">-₹${rawDiscount.toFixed(2)}</span>
            </div>
          ` : ''}
        </div>

        <!-- STATUTORY GST COMPLIANCE BOX -->
        <div class="gst-box">
          <div style="font-weight: bold; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; margin-bottom: 4px; font-size: 10px;">
            GST TAX INVOICE DETAILS (SAC: ${escapeHtml(sacCode)})
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span style="color: #475569;">Taxable Value of Supply:</span>
            <span class="mono bold">₹${taxableAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span style="color: #475569;">Central GST (CGST @ ${cgstRate}%):</span>
            <span class="mono bold">₹${cgstAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span style="color: #475569;">State GST (SGST @ ${sgstRate}%):</span>
            <span class="mono bold">₹${sgstAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px dashed #cbd5e1; padding-top: 3px; margin-top: 2px;">
            <span>Total GST Tax (5%):</span>
            <span class="mono">₹${totalTax.toFixed(2)}</span>
          </div>
        </div>

        <div class="divider-double"></div>

        <div class="total-box" style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 900;">
          <span style="color: #15803d;">NET AMOUNT PAID:</span>
          <span class="mono" style="color: #15803d; font-size: 15px;">₹${grandTotal.toFixed(2)}</span>
        </div>

        <div class="divider-double"></div>

        <div style="font-size: 10px; color: #334155; line-height: 1.4; margin-top: 4px;">
          <div style="display: flex; justify-content: space-between;">
            <strong>Payment Mode:</strong>
            <span>${escapeHtml(paymentMode)} (${escapeHtml(paymentStatus.toUpperCase())} ✓)</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <strong>Collected By:</strong>
            <span>${escapeHtml(collector)}</span>
          </div>
        </div>

        <div class="divider-dashed"></div>

        <div class="text-center" style="font-size: 9.5px; color: #475569; margin-top: 4px;">
          <div class="bold">*** THANK YOU! PLEASE VISIT AGAIN ***</div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">100% Pure Veg • FSSAI Approved • Live Tawa Taste</div>
          <div style="font-size: 8px; color: #94a3b8; margin-top: 2px;">Computer Generated Tax Invoice • Single-Page Ticket</div>
        </div>

        <div class="divider-dashed" style="margin-top: 6px;"></div>
      </body>
      </html>
    `;

    // Remove any existing print iframe
    const oldIframe = document.getElementById('atmiya-print-frame');
    if (oldIframe) oldIframe.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'atmiya-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(invoiceHtml);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => iframe.remove(), 2000);
      }, 250);
    };

    return { success: true };
  } catch (err) {
    console.error('[IFRAME PRINT ERROR]', err);
    window.print();
    return { success: false, error: err.message };
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Downloads a comprehensive, official A4 Day-End Z-Audit & GST Tax Reconciliation PDF.
 * Eliminates browser print dialog and blank-page issues completely.
 */
export function downloadZReportPdf({
  restaurantSettings = {},
  dateFilterLabel = 'All-Time Records',
  grossSales = 0,
  netSales = 0,
  totalTax = 0,
  cgst = 0,
  sgst = 0,
  totalDiscount = 0,
  totalVolumePlates = 0,
  validOrders = [],
  cancelledOrders = [],
  cancelledTotal = 0,
  upiSales = 0,
  upiOrders = [],
  cardSales = 0,
  cardOrders = [],
  cashSales = 0,
  cashOrders = []
}) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const restName = (restaurantSettings?.restaurantName || 'ATMIYA DOSA HUB').toUpperCase();
    const address = restaurantSettings?.address || 'Station Road, Opp. Atmiya Complex, Petlad - 388450';
    const phone = restaurantSettings?.phone || '+91 63530 59221';
    const gstin = restaurantSettings?.gstin || '24AAACA1234A1Z5';
    const fssai = restaurantSettings?.fssai || '20723031000123';

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2); // 182mm

    let y = 12;

    // Top Brand Accent Line
    doc.setFillColor(234, 88, 12); // Orange-600
    doc.rect(margin, y, contentWidth, 3, 'F');
    y += 8;

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(restName, margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`GSTIN: ${gstin}  |  FSSAI: ${fssai}`, pageWidth - margin, y, { align: 'right' });
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(234, 88, 12); // Orange
    doc.text('GST TAX REGISTER & DAY-END Z-AUDIT RECONCILIATION', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - margin, y, { align: 'right' });
    y += 4.5;

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${address} • Ph: ${phone}`, margin, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`AUDIT SCOPE: ${dateFilterLabel.toUpperCase()}`, pageWidth - margin, y, { align: 'right' });
    y += 6;

    // Horizontal Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;

    // 1. EXECUTIVE SUMMARY METRICS BOXES (4 tiles)
    const boxW = (contentWidth - 9) / 4;
    const boxH = 18;

    const metrics = [
      { label: 'GROSS TOTAL SALES', val: `Rs. ${grossSales.toFixed(2)}`, sub: `${validOrders.length} Valid Tickets`, color: [15, 23, 42] },
      { label: 'NET FOOD REVENUE', val: `Rs. ${netSales.toFixed(2)}`, sub: 'Base Revenue Excl. Tax', color: [16, 185, 129] },
      { label: '5% GST COLLECTED', val: `Rs. ${totalTax.toFixed(2)}`, sub: `CGST: ${cgst.toFixed(2)} | SGST: ${sgst.toFixed(2)}`, color: [234, 88, 12] },
      { label: 'VOLUME TRACKED', val: `${totalVolumePlates} Plates`, sub: `Discounts: Rs. ${totalDiscount.toFixed(2)}`, color: [37, 99, 235] }
    ];

    metrics.forEach((m, idx) => {
      const bx = margin + (idx * (boxW + 3));
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(bx, y, boxW, boxH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(m.label, bx + 2.5, y + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(m.color[0], m.color[1], m.color[2]);
      doc.text(m.val, bx + 2.5, y + 10.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text(m.sub, bx + 2.5, y + 15);
    });
    y += boxH + 7;

    // 2. PAYMENT TENDER RECONCILIATION TABLE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('PAYMENT TENDER SETTLEMENT & CASH DRAWER RECONCILIATION', margin, y);
    y += 4.5;

    // Table Header
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('TENDER CHANNEL', margin + 3, y + 3.8);
    doc.text('TRANSACTION METHOD', margin + 50, y + 3.8);
    doc.text('TICKETS', margin + 105, y + 3.8, { align: 'center' });
    doc.text('SHARE %', margin + 130, y + 3.8, { align: 'center' });
    doc.text('SETTLED AMOUNT', margin + contentWidth - 3, y + 3.8, { align: 'right' });
    y += 5.5;

    const tenderRows = [
      { channel: 'UPI Dynamic QR Intent', method: 'PhonePe / GPay / Paytm', count: `${upiOrders.length} orders`, share: `${grossSales > 0 ? Math.round((upiSales/grossSales)*100) : 0}%`, amt: `Rs. ${upiSales.toFixed(2)}` },
      { channel: 'Cash Register In-Hand', method: 'Counter & Floor Cashier', count: `${cashOrders.length} orders`, share: `${grossSales > 0 ? Math.round((cashSales/grossSales)*100) : 0}%`, amt: `Rs. ${cashSales.toFixed(2)}` },
      { channel: 'Credit & Debit Cards', method: 'EDC Terminal / PineLabs', count: `${cardOrders.length} orders`, share: `${grossSales > 0 ? Math.round((cardSales/grossSales)*100) : 0}%`, amt: `Rs. ${cardSales.toFixed(2)}` },
    ];

    tenderRows.forEach(r => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(r.channel, margin + 3, y + 4);
      doc.setTextColor(100, 116, 139);
      doc.text(r.method, margin + 50, y + 4);
      doc.setTextColor(15, 23, 42);
      doc.text(r.count, margin + 105, y + 4, { align: 'center' });
      doc.text(r.share, margin + 130, y + 4, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(r.amt, margin + contentWidth - 3, y + 4, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 5.5, margin + contentWidth, y + 5.5);
      y += 5.5;
    });

    // Total Row
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL RECONCILED REGISTER (100% BALANCED)', margin + 3, y + 4);
    doc.text(`${validOrders.length} tickets`, margin + 105, y + 4, { align: 'center' });
    doc.text('100%', margin + 130, y + 4, { align: 'center' });
    doc.setTextColor(234, 88, 12);
    doc.text(`Rs. ${grossSales.toFixed(2)}`, margin + contentWidth - 3, y + 4, { align: 'right' });
    y += 9;

    // Void / Cancelled Audit Strip
    if (cancelledOrders.length > 0) {
      doc.setFillColor(254, 242, 242); // rose-50
      doc.setDrawColor(254, 205, 211);
      doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(225, 29, 72); // rose-600
      doc.text(`[VOID AUDIT] ${cancelledOrders.length} Cancelled Order(s) totaling Rs. ${cancelledTotal.toFixed(2)} -- 100% Excluded from Gross Sales & Cash Register`, margin + 3, y + 4.2);
      y += 9;
    }

    // 3. ITEMIZED ORDER TAX INVOICE AUDIT LEDGER (Paginated Table)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('ITEMIZED ORDER TAX INVOICES AUDIT LOG', margin, y);
    y += 4.5;

    // Ledger Table Header
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);
    doc.text('INVOICE #', margin + 3, y + 3.8);
    doc.text('TABLE', margin + 32, y + 3.8);
    doc.text('TIME', margin + 50, y + 3.8);
    doc.text('CUSTOMER', margin + 72, y + 3.8);
    doc.text('MODE', margin + 115, y + 3.8);
    doc.text('TAX (5%)', margin + 148, y + 3.8, { align: 'right' });
    doc.text('TOTAL (Rs.)', margin + contentWidth - 3, y + 3.8, { align: 'right' });
    y += 5.5;

    validOrders.forEach((o, oIdx) => {
      // Check page break
      if (y > pageHeight - 25) {
        doc.addPage();
        y = 14;

        // Re-draw table header on new page
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, y, contentWidth, 5.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(255, 255, 255);
        doc.text('INVOICE #', margin + 3, y + 3.8);
        doc.text('TABLE', margin + 32, y + 3.8);
        doc.text('TIME', margin + 50, y + 3.8);
        doc.text('CUSTOMER', margin + 72, y + 3.8);
        doc.text('MODE', margin + 115, y + 3.8);
        doc.text('TAX (5%)', margin + 148, y + 3.8, { align: 'right' });
        doc.text('TOTAL (Rs.)', margin + contentWidth - 3, y + 3.8, { align: 'right' });
        y += 5.5;
      }

      if (oIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 5, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      const invNum = String(o.order_number || o.id || '').replace('#', '');
      doc.text(`#${invNum}`, margin + 3, y + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.text(String(o.table_number || 'T01'), margin + 32, y + 3.5);

      const oTime = o.time || (o.placed_at ? new Date(o.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-');
      doc.text(oTime, margin + 50, y + 3.5);

      const custName = String(o.customer_name || 'Walk-in Guest').substring(0, 16);
      doc.text(custName, margin + 72, y + 3.5);

      const modeStr = String(o.payment_mode || o.payment_method || 'Cash').toUpperCase();
      doc.text(modeStr.includes('UPI') ? 'UPI' : 'Cash', margin + 115, y + 3.5);

      const oTax = Number(o.tax || o.tax_amount || 0).toFixed(2);
      doc.text(oTax, margin + 148, y + 3.5, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      const oTot = Number(o.total || o.total_amount || 0).toFixed(2);
      doc.text(oTot, margin + contentWidth - 3, y + 3.5, { align: 'right' });

      y += 5;
    });

    // 4. STATUTORY AUDIT SIGN-OFF BOX
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 14;
    }
    y += 5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Computer Generated Statutory Z-Audit Report under Section 9(1) of Central Goods and Services Tax (CGST) Act, 2017.', margin, y);
    doc.text('Certified by Atmiya Cloud POS v2.5. Tamper-Proof Audit Chain Active.', margin, y + 3.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Authorized Store Signatory / Registered Auditor', pageWidth - margin, y + 3.5, { align: 'right' });

    const cleanScope = dateFilterLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Atmiya_Z_Audit_Report_${cleanScope}_${Date.now()}.pdf`;
    doc.save(fileName);
    return { success: true, fileName };
  } catch (err) {
    console.error('[Z-REPORT PDF EXPORT ERROR]', err);
    return { success: false, error: err.message };
  }
}

/**
 * Downloads a single-page 80mm thermal receipt slip PDF matching the on-screen thermal preview.
 */
export function downloadThermalZReportPdf({
  restaurantSettings = {},
  dateFilterLabel = 'All-Time Records',
  grossSales = 0,
  netSales = 0,
  totalTax = 0,
  cgst = 0,
  sgst = 0,
  totalDiscount = 0,
  totalVolumePlates = 0,
  validOrders = [],
  cancelledOrders = [],
  cancelledTotal = 0,
  upiSales = 0,
  upiOrders = [],
  cashSales = 0,
  cashOrders = []
}) {
  try {
    const pageWidth = 80;
    const margin = 4;
    const contentWidth = pageWidth - (margin * 2);
    const pageHeight = 150 + (cancelledOrders.length > 0 ? 10 : 0);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidth, pageHeight],
      compress: true
    });

    let y = 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('ATMIYA DOSA & RESTAURANT', pageWidth / 2, y, { align: 'center' });
    y += 4.2;

    doc.setFontSize(7.5);
    doc.text('DAILY Z-AUDIT REGISTER REPORT', pageWidth / 2, y, { align: 'center' });
    y += 3.8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(new Date().toLocaleString('en-IN'), pageWidth / 2, y, { align: 'center' });
    y += 3.2;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(234, 88, 12);
    doc.text(`SCOPE: ${dateFilterLabel.toUpperCase()}`, pageWidth / 2, y, { align: 'center' });
    y += 4;

    doc.setLineDashPattern([1.2, 0.8], 0);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + contentWidth, y);
    doc.setLineDashPattern([], 0);
    y += 4;

    const summaryLines = [
      { label: 'Gross Sales:', val: `Rs. ${grossSales.toFixed(2)}`, bold: true },
      { label: 'Net Food:', val: `Rs. ${netSales.toFixed(2)}`, bold: true },
      { label: 'CGST (2.5%):', val: `Rs. ${cgst.toFixed(2)}`, bold: true },
      { label: 'SGST (2.5%):', val: `Rs. ${sgst.toFixed(2)}`, bold: true },
      { label: 'Discounts:', val: `-Rs. ${totalDiscount.toFixed(2)}`, bold: true },
    ];

    doc.setFontSize(7);
    summaryLines.forEach(l => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(l.label, margin, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(l.val, margin + contentWidth, y, { align: 'right' });
      y += 4;
    });

    doc.setLineDashPattern([1.2, 0.8], 0);
    doc.line(margin, y, margin + contentWidth, y);
    doc.setLineDashPattern([], 0);
    y += 4;

    const tenderLines = [
      { label: 'Total Volume:', val: `${totalVolumePlates} Plates (${validOrders.length} tickets)` },
      { label: 'UPI Settlement:', val: `Rs. ${upiSales.toFixed(2)} (${upiOrders.length})` },
      { label: 'Cash Register:', val: `Rs. ${cashSales.toFixed(2)} (${cashOrders.length})` },
    ];

    tenderLines.forEach(l => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(l.label, margin, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(l.val, margin + contentWidth, y, { align: 'right' });
      y += 4;
    });

    if (cancelledOrders.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(225, 29, 72);
      doc.text(`Void Tickets (${cancelledOrders.length}):`, margin, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`Rs. ${cancelledTotal.toFixed(2)} (Void)`, margin + contentWidth, y, { align: 'right' });
      y += 4;
    }

    doc.setLineDashPattern([1.2, 0.8], 0);
    doc.line(margin, y, margin + contentWidth, y);
    doc.setLineDashPattern([], 0);
    y += 4.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('REGISTER TOTAL:', margin, y);
    doc.setTextColor(234, 88, 12);
    doc.text(`Rs. ${grossSales.toFixed(2)}`, margin + contentWidth, y, { align: 'right' });
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('=== END OF AUDIT RECORD ===', pageWidth / 2, y, { align: 'center' });

    const cleanScope = dateFilterLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Atmiya_Thermal_Z_Report_${cleanScope}_${Date.now()}.pdf`;
    doc.save(fileName);
    return { success: true, fileName };
  } catch (err) {
    console.error('[THERMAL Z-REPORT PDF ERROR]', err);
    return { success: false, error: err.message };
  }
}

/**
 * Downloads a complete RFC4180 CSV export of the Z-Audit register with BOM for Microsoft Excel.
 */
export function downloadZReportCsv({
  restaurantSettings = {},
  dateFilterLabel = 'All-Time Records',
  grossSales = 0,
  netSales = 0,
  totalTax = 0,
  cgst = 0,
  sgst = 0,
  totalDiscount = 0,
  totalVolumePlates = 0,
  validOrders = [],
  cancelledOrders = [],
  cancelledTotal = 0,
  upiSales = 0,
  cashSales = 0
}) {
  try {
    const restName = restaurantSettings?.restaurantName || 'Atmiya Dosa Hub';
    const gstin = restaurantSettings?.gstin || '24AAACA1234A1Z5';
    
    let csv = '\uFEFF'; // UTF-8 BOM for Excel
    csv += `"${restName} - Z-Audit & GST Reconciliation Report"\n`;
    csv += `"Report Scope","${dateFilterLabel}","Generated At","${new Date().toLocaleString('en-IN')}"\n`;
    csv += `"GSTIN","${gstin}","Statutory Tax Rate","5% GST (2.5% CGST + 2.5% SGST)"\n\n`;
    
    csv += `"FINANCIAL SUMMARY"\n`;
    csv += `"Gross Total Sales","${grossSales.toFixed(2)}"\n`;
    csv += `"Net Food Revenue","${netSales.toFixed(2)}"\n`;
    csv += `"Total 5% GST Collected","${totalTax.toFixed(2)}"\n`;
    csv += `"CGST (2.5%)","${cgst.toFixed(2)}"\n`;
    csv += `"SGST (2.5%)","${sgst.toFixed(2)}"\n`;
    csv += `"Discounts Absorbed","${totalDiscount.toFixed(2)}"\n`;
    csv += `"Volume (Plates Sold)","${totalVolumePlates}"\n`;
    csv += `"UPI Settlements","${upiSales.toFixed(2)}"\n`;
    csv += `"Cash in Hand","${cashSales.toFixed(2)}"\n`;
    csv += `"Void / Cancelled Value","${cancelledTotal.toFixed(2)}"\n\n`;
    
    csv += `"ITEMIZED TAX INVOICE AUDIT LEDGER"\n`;
    csv += `"Invoice Number","Table","Time","Customer Name","Phone","Payment Mode","Status","Subtotal (Rs.)","Tax (Rs.)","Discount (Rs.)","Total (Rs.)"\n`;
    
    validOrders.forEach(o => {
      const invNo = String(o.order_number || o.id || '').replace('#', '');
      const tbl = o.table_number || '';
      const time = o.time || (o.placed_at ? new Date(o.placed_at).toLocaleTimeString() : '');
      const cust = String(o.customer_name || 'Guest').replace(/"/g, '""');
      const phone = o.customer_phone || '';
      const mode = String(o.payment_mode || o.payment_method || 'Cash').toUpperCase().includes('UPI') ? 'UPI' : 'Cash';
      const status = o.status || 'Completed';
      const sub = Number(o.subtotal || 0).toFixed(2);
      const tax = Number(o.tax || o.tax_amount || 0).toFixed(2);
      const disc = Number(o.discount || o.discount_amount || 0).toFixed(2);
      const tot = Number(o.total || o.total_amount || 0).toFixed(2);
      csv += `"#${invNo}","${tbl}","${time}","${cust}","${phone}","${mode}","${status}","${sub}","${tax}","${disc}","${tot}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const cleanScope = dateFilterLabel.replace(/[^a-zA-Z0-9]/g, '_');
    a.href = url;
    a.download = `Atmiya_Z_Audit_Ledger_${cleanScope}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (err) {
    console.error('[Z-REPORT CSV EXPORT ERROR]', err);
    return { success: false, error: err.message };
  }
}
