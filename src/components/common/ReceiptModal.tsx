import React, { useState } from 'react';
import {
  X,
  Printer,
  Share2,
  CheckCircle2,
  ShieldCheck,
  DollarSign,
  Edit3,
  Save,
  RotateCcw,
  AlertCircle,
  Calendar,
  Clock,
  User,
  CreditCard,
  FileText,
} from 'lucide-react';
import { Payment, PaymentMethod } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/financialCalculations';
import { formatDateDisplay } from '../../utils/dateUtils';

interface Props {
  payment: Payment;
  onClose: () => void;
}

export const ReceiptModal: React.FC<Props> = ({ payment, onClose }) => {
  const { database, handleUpdatePaymentReceipt } = useApp();
  const { isAdmin } = useAuth();
  const settings = database.settings;

  // Local active payment representation (allows instant update upon editing)
  const [currentPayment, setCurrentPayment] = useState<Payment>(payment);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Editable fields
  const [editReceiptNumber, setEditReceiptNumber] = useState(currentPayment.receiptNumber);
  const [editDate, setEditDate] = useState(currentPayment.date);
  const [editTime, setEditTime] = useState(currentPayment.time);
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>(currentPayment.paymentMethod);
  const [editCollectorName, setEditCollectorName] = useState(currentPayment.collectorName);
  const [editNotes, setEditNotes] = useState(currentPayment.notes || '');

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const cuotasInfo =
      currentPayment.appliedBreakdown && currentPayment.appliedBreakdown.length > 1
        ? `Cuotas Cubiertas: ${currentPayment.appliedBreakdown.map(b => `#${b.installmentNumber} (${formatCurrency(b.amount, settings.currencySymbol)})`).join(', ')} (Adelanto de Cuotas)`
        : `Cuota #${currentPayment.installmentNumber}`;

    const text = `*COMPROBANTE OFICIAL DE PAGO*\n` +
      `*${settings.businessName}*\n` +
      `Recibo: ${currentPayment.receiptNumber}\n` +
      `Fecha: ${formatDateDisplay(currentPayment.date)} ${currentPayment.time}\n` +
      `Cliente: ${currentPayment.clientName}\n` +
      `${cuotasInfo}\n` +
      `Monto Recibido: ${formatCurrency(currentPayment.receivedAmount, settings.currencySymbol)}\n` +
      `Método: ${currentPayment.paymentMethod}\n` +
      `Saldo Restante Cuota: ${formatCurrency(currentPayment.installmentRemainingBalance, settings.currencySymbol)}\n` +
      `Saldo Total Crédito: ${formatCurrency(currentPayment.creditRemainingBalance, settings.currencySymbol)}\n` +
      `Cobrador: ${currentPayment.collectorName}\n\n` +
      `_${settings.receiptNotice}_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleSaveReceiptEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updated = await handleUpdatePaymentReceipt({
        paymentId: currentPayment.id,
        receiptNumber: editReceiptNumber,
        date: editDate,
        time: editTime,
        paymentMethod: editPaymentMethod,
        collectorName: editCollectorName,
        notes: editNotes,
      });

      setCurrentPayment(updated);
      setIsEditing(false);
      setStatusMessage({ type: 'success', text: 'Recibo modificado exitosamente.' });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al modificar el recibo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditReceiptNumber(currentPayment.receiptNumber);
    setEditDate(currentPayment.date);
    setEditTime(currentPayment.time);
    setEditPaymentMethod(currentPayment.paymentMethod);
    setEditCollectorName(currentPayment.collectorName);
    setEditNotes(currentPayment.notes || '');
    setIsEditing(false);
    setStatusMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] text-slate-100">
        {/* Header modal bar */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-5 py-3 border-b border-blue-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{isEditing ? 'Modificar Datos del Recibo' : 'Comprobante de Pago Generado'}</span>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && isAdmin && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer transition"
                title="Modificar fecha, hora, método o datos de este recibo"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modificar Recibo</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status notification */}
        {statusMessage && (
          <div
            className={`px-4 py-2 text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 border-b border-emerald-800 text-emerald-300'
                : 'bg-rose-950/80 border-b border-rose-800 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Content Body: Either Edit Form OR Printable Ticket */}
        {isEditing ? (
          <form onSubmit={handleSaveReceiptEdits} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
            <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl text-amber-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-xs text-amber-300">
                <Edit3 className="w-4 h-4" />
                <span>Edición de Recibo Oficial (Admin)</span>
              </span>
              <p className="text-[11px] text-amber-300/80">
                Puedes ajustar el número de comprobante, la fecha, la hora, el método de pago y las observaciones. Cada cambio queda registrado en la bitácora de auditoría.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Número de Recibo
                </label>
                <input
                  type="text"
                  required
                  value={editReceiptNumber}
                  onChange={e => setEditReceiptNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Método de Pago
                </label>
                <select
                  value={editPaymentMethod}
                  onChange={e => setEditPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Chivo Wallet / Bitcoin">Chivo Wallet / Bitcoin</option>
                  <option value="Tigo Money">Tigo Money</option>
                  <option value="Otro">Otro medio de pago</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Fecha del Recibo (Día)
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Hora del Recibo
                </label>
                <input
                  type="time"
                  required
                  value={editTime.slice(0, 5)}
                  onChange={e => setEditTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">
                  Nombre de Cobrador en Recibo
                </label>
                <input
                  type="text"
                  required
                  value={editCollectorName}
                  onChange={e => setEditCollectorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">
                  Observaciones / Notas del Recibo
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Detalles o aclaraciones sobre el pago..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Cambios en Recibo'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Printable Ticket Area */
          <div id="printable-receipt" className="p-6 overflow-y-auto bg-white text-slate-900 font-mono text-xs space-y-3 flex-1">
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
              <span className="font-bold text-slate-800 tracking-wider">RECIBO #{currentPayment.receiptNumber}</span>
            </div>

            <div className="space-y-1.5 pt-1 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">FECHA Y HORA:</span>
                <span className="font-semibold">{formatDateDisplay(currentPayment.date)} {currentPayment.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CLIENTE:</span>
                <span className="font-bold text-slate-900 text-right">{currentPayment.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">
                  {currentPayment.appliedBreakdown && currentPayment.appliedBreakdown.length > 1
                    ? 'CUOTAS CUBIERTAS:'
                    : 'CUOTA PAGADA:'}
                </span>
                <span className="font-bold text-right text-slate-900">
                  {currentPayment.appliedBreakdown && currentPayment.appliedBreakdown.length > 1
                    ? currentPayment.appliedBreakdown.map(b => `#${b.installmentNumber}`).join(', ')
                    : `Cuota #${currentPayment.installmentNumber}`}
                </span>
              </div>

              {currentPayment.appliedBreakdown && currentPayment.appliedBreakdown.length > 1 && (
                <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-[11px] text-emerald-950 space-y-1">
                  <span className="font-bold block text-[10px] uppercase text-emerald-800">
                    Adelanto Aplicado ({currentPayment.appliedBreakdown.length} cuotas):
                  </span>
                  {currentPayment.appliedBreakdown.map(b => (
                    <div key={b.installmentId} className="flex justify-between text-[11px]">
                      <span>Cuota #{b.installmentNumber}:</span>
                      <strong className="font-mono">{formatCurrency(b.amount, settings.currencySymbol)}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-500">FORMA DE PAGO:</span>
                <span className="font-semibold">{currentPayment.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">COBRADOR:</span>
                <span className="font-semibold text-right">{currentPayment.collectorName}</span>
              </div>
              {currentPayment.notes && (
                <div className="pt-1 border-t border-dotted border-slate-300">
                  <span className="text-slate-500">OBSERVACIONES:</span>
                  <p className="italic text-slate-600">{currentPayment.notes}</p>
                </div>
              )}
            </div>

            <div className="my-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-blue-900 tracking-wider">MONTO RECIBIDO</span>
              <div className="text-2xl font-black font-sans text-blue-700">
                {formatCurrency(currentPayment.receivedAmount, settings.currencySymbol)}
              </div>
            </div>

            <div className="space-y-1 border-t border-dashed border-slate-400 pt-2 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">SALDO PENDIENTE CUOTA:</span>
                <span className="font-bold">{formatCurrency(currentPayment.installmentRemainingBalance, settings.currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SALDO TOTAL CRÉDITO:</span>
                <span className="font-bold text-red-700">{formatCurrency(currentPayment.creditRemainingBalance, settings.currencySymbol)}</span>
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
        )}

        {/* Action Buttons */}
        {!isEditing && (
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap gap-2 justify-between">
            <button
              onClick={handleShareWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-3 rounded-xl text-xs transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-3 rounded-xl text-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ticket</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-center gap-1.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-300 font-medium py-2 px-3 rounded-xl text-xs transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modificar</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
