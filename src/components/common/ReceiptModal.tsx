import React from 'react';
import { X, Printer, Share2, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';
import { Payment } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/financialCalculations';
import { formatDateDisplay } from '../../utils/dateUtils';

interface Props {
  payment: Payment;
  onClose: () => void;
}

export const ReceiptModal: React.FC<Props> = ({ payment, onClose }) => {
  const { database } = useApp();
  const settings = database.settings;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const cuotasInfo =
      payment.appliedBreakdown && payment.appliedBreakdown.length > 1
        ? `Cuotas Cubiertas: ${payment.appliedBreakdown.map(b => `#${b.installmentNumber} (${formatCurrency(b.amount, settings.currencySymbol)})`).join(', ')} (Adelanto de Cuotas)`
        : `Cuota #${payment.installmentNumber}`;

    const text = `*COMPROBANTE OFICIAL DE PAGO*\n` +
      `*${settings.businessName}*\n` +
      `Recibo: ${payment.receiptNumber}\n` +
      `Fecha: ${formatDateDisplay(payment.date)} ${payment.time}\n` +
      `Cliente: ${payment.clientName}\n` +
      `${cuotasInfo}\n` +
      `Monto Recibido: ${formatCurrency(payment.receivedAmount, settings.currencySymbol)}\n` +
      `Método: ${payment.paymentMethod}\n` +
      `Saldo Restante Cuota: ${formatCurrency(payment.installmentRemainingBalance, settings.currencySymbol)}\n` +
      `Saldo Total Crédito: ${formatCurrency(payment.creditRemainingBalance, settings.currencySymbol)}\n` +
      `Cobrador: ${payment.collectorName}\n\n` +
      `_${settings.receiptNotice}_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header modal bar */}
        <div className="bg-blue-900/60 px-5 py-3 border-b border-blue-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Comprobante de Pago Generado</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Area */}
        <div id="printable-receipt" className="p-6 overflow-y-auto bg-white text-slate-900 font-mono text-xs space-y-3">
          <div className="text-center pb-3 border-b border-dashed border-slate-400">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-6 h-6 rounded bg-blue-700 text-white flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
              <h2 className="font-sans font-black text-base tracking-wider text-slate-900">
                {settings.businessName}
              </h2>
            </div>
            <p className="text-[10px] text-slate-600 font-sans">{settings.brandSubtitle}</p>
            <p className="text-[10px] text-slate-600 font-sans">{settings.contactAddress}</p>
            <p className="text-[10px] text-slate-600 font-sans">Tel: {settings.contactPhone}</p>
          </div>

          <div className="text-center py-1 bg-slate-100 rounded border border-slate-200">
            <span className="font-bold text-slate-800 tracking-wider">RECIBO #{payment.receiptNumber}</span>
          </div>

          <div className="space-y-1.5 pt-1 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">FECHA Y HORA:</span>
              <span className="font-semibold">{formatDateDisplay(payment.date)} {payment.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CLIENTE:</span>
              <span className="font-bold text-slate-900 text-right">{payment.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">
                {payment.appliedBreakdown && payment.appliedBreakdown.length > 1
                  ? 'CUOTAS CUBIERTAS:'
                  : 'CUOTA PAGADA:'}
              </span>
              <span className="font-bold text-right text-slate-900">
                {payment.appliedBreakdown && payment.appliedBreakdown.length > 1
                  ? payment.appliedBreakdown.map(b => `#${b.installmentNumber}`).join(', ')
                  : `Cuota #${payment.installmentNumber}`}
              </span>
            </div>

            {payment.appliedBreakdown && payment.appliedBreakdown.length > 1 && (
              <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-[11px] text-emerald-950 space-y-1">
                <span className="font-bold block text-[10px] uppercase text-emerald-800">
                  Adelanto Aplicado ({payment.appliedBreakdown.length} cuotas):
                </span>
                {payment.appliedBreakdown.map(b => (
                  <div key={b.installmentId} className="flex justify-between text-[11px]">
                    <span>Cuota #{b.installmentNumber}:</span>
                    <strong className="font-mono">{formatCurrency(b.amount, settings.currencySymbol)}</strong>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-slate-500">FORMA DE PAGO:</span>
              <span className="font-semibold">{payment.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">COBRADOR:</span>
              <span className="font-semibold text-right">{payment.collectorName}</span>
            </div>
            {payment.notes && (
              <div className="pt-1 border-t border-dotted border-slate-300">
                <span className="text-slate-500">OBSERVACIONES:</span>
                <p className="italic text-slate-600">{payment.notes}</p>
              </div>
            )}
          </div>

          <div className="my-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-blue-900 tracking-wider">MONTO RECIBIDO</span>
            <div className="text-2xl font-black font-sans text-blue-700">
              {formatCurrency(payment.receivedAmount, settings.currencySymbol)}
            </div>
          </div>

          <div className="space-y-1 border-t border-dashed border-slate-400 pt-2 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">SALDO PENDIENTE CUOTA:</span>
              <span className="font-bold">{formatCurrency(payment.installmentRemainingBalance, settings.currencySymbol)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">SALDO TOTAL CRÉDITO:</span>
              <span className="font-bold text-red-700">{formatCurrency(payment.creditRemainingBalance, settings.currencySymbol)}</span>
            </div>
          </div>

          <div className="text-center pt-3 border-t border-dashed border-slate-400">
            <p className="text-[10px] text-slate-500 italic font-sans">{settings.receiptNotice}</p>
            <div className="mt-2 flex items-center justify-center gap-1 text-[9px] text-slate-400 font-sans">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Verificado por FINANCIERA AARON Digital Ledger</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap gap-2 justify-between">
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-3 rounded-xl text-xs transition"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-3 rounded-xl text-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
