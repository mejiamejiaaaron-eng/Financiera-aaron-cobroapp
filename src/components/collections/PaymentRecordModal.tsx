import React, { useState } from 'react';
import {
  X,
  DollarSign,
  Receipt,
  CreditCard,
  User,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Installment, Client, Credit, PaymentMethod } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/financialCalculations';
import { formatDateDisplay } from '../../utils/dateUtils';

interface Props {
  installment: Installment;
  client: Client;
  credit: Credit;
  mode: 'full' | 'partial';
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

export const PaymentRecordModal: React.FC<Props> = ({
  installment,
  client,
  credit,
  mode,
  onClose,
  onPaymentSuccess,
}) => {
  const { handleRecordPayment, database } = useApp();
  const settings = database.settings;

  // Default amount: full remaining balance if full, or half / custom if partial
  const [receivedAmount, setReceivedAmount] = useState<number | ''>(
    mode === 'full' ? installment.balance : Math.min(10, installment.balance)
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const numReceived = Math.max(0, Number(receivedAmount) || 0);
  const appliedToCurrent = Math.min(numReceived, installment.balance);
  const remainingCurrentAfterPayment = Math.max(
    0,
    Math.round((installment.balance - appliedToCurrent) * 100) / 100
  );
  const surplusAmount = Math.max(0, Math.round((numReceived - installment.balance) * 100) / 100);
  const isSurplus = surplusAmount > 0;
  const newCreditBalance = Math.max(
    0,
    Math.round((credit.balancePending - numReceived) * 100) / 100
  );
  const isTotalLiquidation = numReceived > 0 && newCreditBalance <= 0.001;

  // Quick payment shortcut targets
  const singleCuota = installment.balance;
  const doubleCuota = Math.min(
    credit.balancePending,
    Math.round((installment.balance + installment.scheduledAmount) * 100) / 100
  );
  const tripleCuota = Math.min(
    credit.balancePending,
    Math.round((installment.balance + 2 * installment.scheduledAmount) * 100) / 100
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (numReceived <= 0) {
      setErrorMessage('El importe recibido debe ser mayor a 0.');
      return;
    }
    if (numReceived > credit.balancePending + 0.05) {
      setErrorMessage(
        `El importe ($${numReceived.toFixed(2)}) no puede exceder el saldo total pendiente del crédito ($${credit.balancePending.toFixed(2)}).`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await handleRecordPayment({
        creditId: credit.id,
        installmentId: installment.id,
        receivedAmount: numReceived,
        paymentMethod,
        notes: isSurplus
          ? `${notes ? `${notes} | ` : ''}Pago superior con adelanto ($${surplusAmount.toFixed(2)})`
          : notes,
      });

      if (onPaymentSuccess) onPaymentSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al registrar el pago.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-5 py-3.5 border-b border-blue-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Registrar Pago</span>
                {isSurplus && (
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 px-2 py-0.2 rounded-full font-semibold">
                    Adelanto de Cuotas
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-blue-300">
                Cuota #{installment.installmentNumber} • {credit.creditNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Client summary */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Cliente:</span>
              <strong className="text-white text-xs">{client.fullName}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Vencimiento Cuota #{installment.installmentNumber}:</span>
              <span className="text-slate-200">{formatDateDisplay(installment.dueDate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Saldo cuota actual #{installment.installmentNumber}:</span>
              <span className="font-extrabold text-amber-400 text-sm">
                {formatCurrency(installment.balance, settings.currencySymbol)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-700/60">
              <span className="text-slate-400">Deuda total pendiente del crédito:</span>
              <span className="font-extrabold text-rose-400 text-sm">
                {formatCurrency(credit.balancePending, settings.currencySymbol)}
              </span>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-bold flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Importe Recibido ($)</span>
                <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Máximo permitido: <strong className="text-white">{formatCurrency(credit.balancePending, settings.currencySymbol)}</strong>
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={credit.balancePending}
                required
                value={receivedAmount}
                onChange={e => setReceivedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-lg font-black text-white focus:outline-hidden focus:border-emerald-500 transition"
              />
            </div>

            {/* Quick Helper Buttons for payments */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-slate-400 text-[10px]">Atajos:</span>
              <button
                type="button"
                onClick={() => setReceivedAmount(singleCuota)}
                className={`px-2.5 py-1 rounded-lg font-semibold border transition cursor-pointer ${
                  numReceived === singleCuota
                    ? 'bg-blue-600 text-white border-blue-500 font-bold shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Pagar exactamente la cuota actual"
              >
                1 Cuota ({formatCurrency(singleCuota, settings.currencySymbol)})
              </button>

              {doubleCuota > singleCuota && (
                <button
                  type="button"
                  onClick={() => setReceivedAmount(doubleCuota)}
                  className={`px-2.5 py-1 rounded-lg font-semibold border transition cursor-pointer ${
                    numReceived === doubleCuota
                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="Pagar cuota actual + 1 siguiente cuota"
                >
                  2 Cuotas ({formatCurrency(doubleCuota, settings.currencySymbol)})
                </button>
              )}

              {tripleCuota > doubleCuota && (
                <button
                  type="button"
                  onClick={() => setReceivedAmount(tripleCuota)}
                  className={`px-2.5 py-1 rounded-lg font-semibold border transition cursor-pointer ${
                    numReceived === tripleCuota
                      ? 'bg-purple-600 text-white border-purple-500 font-bold shadow'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="Pagar cuota actual + 2 siguientes cuotas"
                >
                  3 Cuotas ({formatCurrency(tripleCuota, settings.currencySymbol)})
                </button>
              )}

              <button
                type="button"
                onClick={() => setReceivedAmount(credit.balancePending)}
                className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                  numReceived === credit.balancePending
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                    : 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border-emerald-800/80'
                }`}
                title="Pagar toda la deuda restante del crédito"
              >
                Liquidar Todo ({formatCurrency(credit.balancePending, settings.currencySymbol)})
              </button>
            </div>
          </div>

          {/* Informative Banner when Payment is Greater than Installment Balance */}
          {isSurplus && (
            <div className="p-3 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/70 border border-emerald-600/70 rounded-xl space-y-1.5 text-xs shadow-md animate-fadeIn">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Sparkles className="w-4 h-4 text-emerald-300" />
                <span>¡Pago mayor a la cuota aceptado!</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                • Cuota actual #{installment.installmentNumber}: <strong className="text-emerald-300 font-bold">Quedará 100% Pagada</strong> ({formatCurrency(installment.balance, settings.currencySymbol)}).
              </p>
              <p className="text-emerald-200 text-[11px] leading-relaxed">
                • Excedente de <strong className="text-white font-bold">{formatCurrency(surplusAmount, settings.currencySymbol)}</strong>: Se aplicará automáticamente en cascada como adelanto a las siguientes cuotas (#{installment.installmentNumber + 1} en adelante).
              </p>
              <div className="pt-1 border-t border-emerald-800/60 flex justify-between items-center text-[11px]">
                <span className="text-slate-300">Nuevo saldo deudor del cliente:</span>
                <strong className={isTotalLiquidation ? 'text-emerald-300 font-extrabold' : 'text-white font-bold'}>
                  {isTotalLiquidation
                    ? '🎉 ¡Crédito Liquidado al 100%!'
                    : formatCurrency(newCreditBalance, settings.currencySymbol)}
                </strong>
              </div>
            </div>
          )}

          {/* Standard remaining balance preview if no surplus */}
          {!isSurplus && numReceived > 0 && (
            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/80 flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Saldo restante de esta cuota después del pago:</span>
              <strong className={remainingCurrentAfterPayment === 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {remainingCurrentAfterPayment === 0 ? '✓ Cuota pagada por completo' : formatCurrency(remainingCurrentAfterPayment, settings.currencySymbol)}
              </strong>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Método de Pago
            </label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-hidden focus:border-blue-500"
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia Bancaria</option>
              <option value="Chivo Wallet / Bitcoin">Chivo Wallet / Bitcoin</option>
              <option value="Tigo Money">Tigo Money</option>
              <option value="Otro">Otro medio de pago</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Observaciones (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej. Cliente entrega billete de $50 y solicita adelantar cuotas..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl cursor-pointer transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Registrando...' : 'Confirmar e Imprimir Recibo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
