import React, { useState } from 'react';
import {
  X,
  DollarSign,
  Receipt,
  CreditCard,
  User,
  AlertCircle,
  CheckCircle2,
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
  const [receivedAmount, setReceivedAmount] = useState<number>(
    mode === 'full' ? installment.balance : Math.min(10, installment.balance)
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const remainingAfterPayment = Math.max(0, Math.round((installment.balance - (Number(receivedAmount) || 0)) * 100) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (receivedAmount <= 0) {
      setErrorMessage('El importe recibido debe ser mayor a 0.');
      return;
    }
    if (receivedAmount > installment.balance + 0.01) {
      setErrorMessage(`El importe no puede ser superior al saldo pendiente de la cuota ($${installment.balance.toFixed(2)}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      await handleRecordPayment({
        creditId: credit.id,
        installmentId: installment.id,
        receivedAmount: Number(receivedAmount),
        paymentMethod,
        notes,
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
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-5 py-3.5 border-b border-blue-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {mode === 'full' ? 'Registrar Pago Completo' : 'Registrar Abono Parcial'}
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Client summary */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Cliente:</span>
              <strong className="text-white">{client.fullName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Vencimiento:</span>
              <span className="text-slate-200">{formatDateDisplay(installment.dueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Saldo actual cuota:</span>
              <span className="font-bold text-amber-400">
                {formatCurrency(installment.balance, settings.currencySymbol)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Saldo total crédito:</span>
              <span className="font-bold text-rose-400">
                {formatCurrency(credit.balancePending, settings.currencySymbol)}
              </span>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Importe Recibido ($) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={installment.balance}
                required
                value={receivedAmount}
                onChange={e => setReceivedAmount(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-base font-black text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>Saldo restante después de pago:</span>
              <strong className={remainingAfterPayment === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {formatCurrency(remainingAfterPayment, settings.currencySymbol)}
              </strong>
            </div>
          </div>

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
              placeholder="Ej. Recibido por cobrador en local comercial"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Registrando...' : 'Confirmar e Imprimir'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
