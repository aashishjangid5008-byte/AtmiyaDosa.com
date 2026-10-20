import React from 'react';
import { BarChart3, Printer, FileText, CheckCircle2, IndianRupee, PieChart, ShieldCheck } from 'lucide-react';

export default function ReportsAnalytics({ orders = [] }) {
  const grossSales = orders.reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);
  const totalTax = orders.reduce((sum, o) => sum + (o.tax || 0), 0);
  const totalDiscount = orders.reduce((sum, o) => sum + (o.discount || 0), 0);
  const netSales = grossSales - totalTax;

  const cgst = totalTax / 2;
  const sgst = totalTax / 2;

  // Real Tender Mode Distribution
  const upiOrders = orders.filter(o => {
    const m = (o.payment_mode || o.payment_method || '').toUpperCase();
    return m.includes('UPI') || m.includes('ONLINE');
  });
  const cardOrders = orders.filter(o => {
    const m = (o.payment_mode || o.payment_method || '').toUpperCase();
    return m.includes('CARD');
  });
  const cashOrders = orders.filter(o => {
    const m = (o.payment_mode || o.payment_method || '').toUpperCase();
    return m.includes('CASH') || m.includes('COD') || (!m.includes('UPI') && !m.includes('CARD') && !m.includes('ONLINE'));
  });

  const upiSales = upiOrders.reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);
  const cardSales = cardOrders.reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);
  const cashSales = cashOrders.reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);

  const upiPercent = grossSales > 0 ? Math.round((upiSales / grossSales) * 100) : 0;
  const cardPercent = grossSales > 0 ? Math.round((cardSales / grossSales) * 100) : 0;
  const cashPercent = grossSales > 0 ? Math.max(0, 100 - upiPercent - cardPercent) : 0;

  const handlePrintZReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-black text-slate-950 font-heading">
              GST Reports & Day-End Z-Audit Reconciliation
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Compliant 5% GST tax audit ledger, register settlement, and tender distribution for accounting.
          </p>
        </div>

        <button
          onClick={handlePrintZReport}
          className="px-5 py-2.5 rounded-xl bg-slate-950 text-white font-black text-xs hover:bg-slate-900 shadow-md transition flex items-center space-x-2"
        >
          <Printer className="w-4 h-4 text-orange-400" />
          <span>Print Daily Z-Report</span>
        </button>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Gross Total Sales</span>
          <div className="text-2xl font-black text-slate-950 mt-2 font-heading">₹{grossSales.toFixed(2)}</div>
          <span className="text-xs text-slate-500 font-bold mt-1 inline-block">Includes tax & service fees</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Net Food Revenue</span>
          <div className="text-2xl font-black text-slate-950 mt-2 font-heading">₹{netSales.toFixed(2)}</div>
          <span className="text-xs text-emerald-600 font-bold mt-1 inline-block">Excluding tax liabilities</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Total 5% GST Collected</span>
          <div className="text-2xl font-black text-orange-600 mt-2 font-heading">₹{totalTax.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 font-mono mt-1 font-bold">
            CGST: ₹{cgst.toFixed(2)} | SGST: ₹{sgst.toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Discounts Absorbed</span>
          <div className="text-2xl font-black text-rose-600 mt-2 font-heading">₹{totalDiscount.toFixed(2)}</div>
          <span className="text-xs text-slate-500 font-bold mt-1 inline-block">Festive & Weekend coupons</span>
        </div>

      </div>

      {/* Payment Tender Distribution & Thermal Receipt Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Payment Methods */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-black text-sm text-slate-950 uppercase tracking-wider font-heading flex items-center space-x-2">
            <PieChart className="w-4 h-4 text-orange-600" />
            <span>Tender Mode Settlement Breakdown</span>
          </h3>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-800">UPI / QR Dynamic Intent (PhonePe, GPay, Paytm)</span>
                <span className="font-mono text-slate-950 font-black">{upiPercent}% (₹{upiSales.toFixed(2)})</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${upiPercent}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-800">Credit & Debit Cards (PineLabs / EDC)</span>
                <span className="font-mono text-slate-950 font-black">{cardPercent}% (₹{cardSales.toFixed(2)})</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-amber-500 h-3 rounded-full transition-all duration-500" style={{ width: `${cardPercent}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-800">Cash Register In-Hand (COD / Counter)</span>
                <span className="font-mono text-slate-950 font-black">{cashPercent}% (₹{cashSales.toFixed(2)})</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: `${cashPercent}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Thermal Print Preview Container */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 font-mono text-xs printable-area">
          <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
            <div className="font-black text-sm text-slate-950">ATMIYA DOSA & RESTAURANT</div>
            <div className="text-[10px] text-slate-600">DAILY Z-AUDIT REGISTER REPORT</div>
            <div className="text-[10px] text-slate-500">{new Date().toLocaleString()}</div>
          </div>

          <div className="space-y-1.5 py-2 border-b border-dashed border-slate-300 text-[11px]">
            <div className="flex justify-between">
              <span>Gross Sales:</span>
              <span className="font-bold">₹{grossSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Net Food:</span>
              <span className="font-bold">₹{netSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>CGST (2.5%):</span>
              <span className="font-bold">₹{cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST (2.5%):</span>
              <span className="font-bold">₹{sgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discounts:</span>
              <span className="font-bold">-₹{totalDiscount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between text-xs font-black pt-1">
            <span>REGISTER TOTAL:</span>
            <span className="text-orange-700">₹{grossSales.toFixed(2)}</span>
          </div>

          <div className="text-center text-[10px] text-slate-500 pt-3">
            === END OF AUDIT RECORD ===
          </div>
        </div>

      </div>

      {/* Tax Audit Invoices Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-black text-sm text-slate-950 uppercase tracking-wider font-heading">
            Live Order Tax Invoices Audit Log
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Invoice / Order</th>
                <th className="p-4">Table</th>
                <th className="p-4">Guest</th>
                <th className="p-4">Subtotal</th>
                <th className="p-4">CGST (2.5%)</th>
                <th className="p-4">SGST (2.5%)</th>
                <th className="p-4">Total GST</th>
                <th className="p-4 text-right">Gross Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {orders.map(order => {
                const tax = order.tax || 0;
                const total = order.total || order.total_amount || 0;
                const subtotal = order.subtotal || (total - tax);
                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-mono font-bold text-orange-700">
                      {order.id}
                    </td>
                    <td className="p-4 font-black text-slate-950">
                      {order.table_number}
                    </td>
                    <td className="p-4 text-slate-700 font-semibold">
                      {order.customer_name || 'Walk-in Guest'}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-900">
                      ₹{Number(subtotal).toFixed(2)}
                    </td>
                    <td className="p-4 font-mono text-slate-600">
                      ₹{(tax / 2).toFixed(2)}
                    </td>
                    <td className="p-4 font-mono text-slate-600">
                      ₹{(tax / 2).toFixed(2)}
                    </td>
                    <td className="p-4 font-mono font-black text-orange-800">
                      ₹{Number(tax).toFixed(2)}
                    </td>
                    <td className="p-4 font-mono font-black text-slate-950 text-right">
                      ₹{Number(total).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
