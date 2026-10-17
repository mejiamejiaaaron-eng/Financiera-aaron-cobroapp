import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  FileText,
  RotateCcw,
  PlusCircle,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { PaymentMethod, Payment } from '../../types';
import { formatCurrency } from '../../utils/financialCalculations';
import { formatDateDisplay } from '../../utils/dateUtils';

export const PaymentsView: React.FC = () => {
  const {
    database,
    handleRecordPayment,
    handleRequestReversion,
    setActiveReceiptModalPayment,
  } = useApp();
  const { currentUser, hasPermission, isAdmin } = useAuth();
  const settings = database.settings;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCollector, setFilterCollector] = useState('all');
  const [showNewPaymentForm, setShowNewPaymentForm] = useState(false);

  // Reversion Request Modal state
  const [reversionModalPayment, setReversionModalPayment] = useState<Payment | null>(null);
  const [reversionReason, setReversionReason] = useState('');
  const [reversionError, setReversionError] = useState('');
  const [isSubmittingReversion, setIsSubmittingReversion] = useState(false);

  // New Payment Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedCreditId, setSelectedCreditId] = useState('');
  const [selectedInstallmentId, setSelectedInstallmentId] = useState('');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const canPay = hasPermission('canRegisterPayments');
  const canRequestRev = hasPermission('canRequestReversion');

  // Client credits
  const clientCredits = useMemo(() => {
    if (!selectedClientId) return [];
    return database.credits.filter(
      c => c.clientId === selectedClientId && (c.status === 'active' || c.status === 'overdue')
    );
  }, [database.credits, selectedClientId]);

  // Credit unpaid installments
  const creditInstallments = useMemo(() => {
    if (!selectedCreditId) return [];
    return database.installments
      .filter(i => i.creditId === selectedCreditId && i.balance > 0.001)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
  }, [database.installments, selectedCreditId]);

  const selectedInstallment = useMemo(() => {
    return creditInstallments.find(i => i.id === selectedInstallmentId);
  }, [creditInstallments, selectedInstallmentId]);

  // Update default amount when installment changes
  const handleSelectInstallment = (instId: string) => {
    setSelectedInstallmentId(instId);
    const inst = creditInstallments.find(i => i.id === instId);
    if (inst) {
      setReceivedAmount(inst.balance);
    }
  };

  const handleCreatePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedCreditId || !selectedInstallmentId) {
      setFormError('Debe seleccionar cliente, crédito y la cuota a pagar.');
      return;
    }
    if (receivedAmount <= 0) {
      setFormError('El importe recibido debe ser mayor a 0.');
      return;
    }
    if (selectedInstallment && receivedAmount > selectedInstallment.balance + 0.01) {
      setFormError(`El monto no puede exceder el saldo de la cuota ($${selectedInstallment.balance.toFixed(2)}).`);
      return;
    }

    try {
      setIsSubmittingForm(true);
      await handleRecordPayment({
        creditId: selectedCreditId,
        installmentId: selectedInstallmentId,
        receivedAmount: Number(receivedAmount),
        paymentMethod,
        notes,
      });

      setShowNewPaymentForm(false);
      setSelectedClientId('');
      setSelectedCreditId('');
      setSelectedInstallmentId('');
      setReceivedAmount(0);
      setNotes('');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al registrar pago');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleRequestReversionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversionModalPayment) return;
    setReversionError('');

    try {
      setIsSubmittingReversion(true);
      await handleRequestReversion(reversionModalPayment.id, reversionReason);
      setReversionModalPayment(null);
      setReversionReason('');
    } catch (err: unknown) {
      setReversionError(err instanceof Error ? err.message : 'Error al solicitar reversión');
    } finally {
      setIsSubmittingReversion(false);
    }
  };

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return database.payments.filter(p => {
      if (filterCollector !== 'all' && p.collectorId !== filterCollector) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          p.clientName.toLowerCase().includes(q) ||
          p.receiptNumber.toLowerCase().includes(q) ||
          p.paymentMethod.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [database.payments, filterCollector, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-500" />
            <span>Registro de Pagos y Abonos</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Emisión de comprobantes oficiales, control de recibos y solicitud de reversiones
          </p>
        </div>

        {canPay && (
          <button
            onClick={() => setShowNewPaymentForm(!showNewPaymentForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-md shadow-blue-600/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showNewPaymentForm ? 'Ocultar Formulario' : 'Nuevo Pago / Abono'}</span>
          </button>
        )}
      </div>

      {/* New Payment Collapsible Form (Prompt Section 9) */}
      {showNewPaymentForm && (
        <div className="bg-slate-800 border border-blue-600/50 rounded-2xl p-5 shadow-xl text-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Registrar Cobro de Cuota</span>
            </h3>
            <span className="text-slate-400 text-[11px]">
              Fecha actual: {formatDateDisplay(database.payments[0]?.date)}
            </span>
          </div>

          {formError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreatePaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Select Client */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  1. Seleccionar Cliente <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={selectedClientId}
                  onChange={e => {
                    setSelectedClientId(e.target.value);
                    setSelectedCreditId('');
                    setSelectedInstallmentId('');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500 font-medium"
                >
                  <option value="">-- Elija un cliente --</option>
                  {database.clients
                    .filter(c => !c.isArchived)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.phone})
                      </option>
                    ))}
                </select>
              </div>

              {/* Select Credit */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  2. Crédito Activo <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  disabled={!selectedClientId || clientCredits.length === 0}
                  value={selectedCreditId}
                  onChange={e => {
                    setSelectedCreditId(e.target.value);
                    setSelectedInstallmentId('');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">-- Elija el crédito --</option>
                  {clientCredits.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.creditNumber} (Saldo: ${c.balancePending.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Installment */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  3. Cuota a Pagar <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  disabled={!selectedCreditId || creditInstallments.length === 0}
                  value={selectedInstallmentId}
                  onChange={e => handleSelectInstallment(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">-- Elija la cuota --</option>
                  {creditInstallments.map(i => (
                    <option key={i.id} value={i.id}>
                      Cuota #{i.installmentNumber} (Vence: {formatDateDisplay(i.dueDate)} - Saldo: ${i.balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Installment details preview */}
            {selectedInstallment && (
              <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block">Cuota #</span>
                  <span className="font-bold text-white">{selectedInstallment.installmentNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Vencimiento</span>
                  <span className="font-bold text-slate-200">{formatDateDisplay(selectedInstallment.dueDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Saldo Cuota</span>
                  <span className="font-bold text-amber-400">
                    {formatCurrency(selectedInstallment.balance, settings.currencySymbol)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Estado</span>
                  <span className="font-bold text-blue-300 uppercase text-[10px]">
                    {selectedInstallment.status}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Importe Recibido ($) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={receivedAmount}
                  onChange={e => setReceivedAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Método de Pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Chivo Wallet / Bitcoin">Chivo Wallet / Bitcoin</option>
                  <option value="Tigo Money">Tigo Money</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Observaciones
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ej. Pago puntual recibido"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewPaymentForm(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingForm}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmittingForm ? 'Guardando...' : 'Generar Recibo de Pago'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, recibo o método de pago..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-slate-400 whitespace-nowrap">Cobrador:</label>
          <select
            value={filterCollector}
            onChange={e => setFilterCollector(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500 w-full sm:w-auto"
          >
            <option value="all">Todos los cobradores</option>
            {database.users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Payments History Table */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg">
        {filteredPayments.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-200">No se encontraron pagos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                  <th className="py-3 px-4 font-semibold">Comprobante</th>
                  <th className="py-3 px-4 font-semibold">Cliente</th>
                  <th className="py-3 px-4 font-semibold">Cuota</th>
                  <th className="py-3 px-4 font-semibold">Importe Recibido</th>
                  <th className="py-3 px-4 font-semibold">Fecha / Hora</th>
                  <th className="py-3 px-4 font-semibold">Método</th>
                  <th className="py-3 px-4 font-semibold">Cobrador</th>
                  <th className="py-3 px-4 font-semibold">Saldo Restante Cuota</th>
                  <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-750">
                {filteredPayments.map(p => {
                  const hasPendingReversion = database.reversionRequests.some(
                    r => r.paymentId === p.id && r.status === 'pending'
                  );

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-750/50 transition ${
                        p.isReversed ? 'opacity-40 line-through bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-300">
                        {p.receiptNumber}
                        {p.isReversed && (
                          <span className="ml-1.5 text-[9px] uppercase px-1.5 py-0.2 bg-rose-900/80 text-rose-300 rounded no-underline font-sans">
                            Revertido
                          </span>
                        )}
                        {hasPendingReversion && (
                          <span className="ml-1.5 text-[9px] uppercase px-1.5 py-0.2 bg-amber-900/80 text-amber-300 rounded no-underline font-sans animate-pulse">
                            Reversión en Trámite
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-white max-w-[180px] truncate">
                        {p.clientName}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        Cuota #{p.installmentNumber}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-emerald-400 text-sm">
                        {formatCurrency(p.receivedAmount, settings.currencySymbol)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {formatDateDisplay(p.date)} {p.time}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {p.paymentMethod}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {p.collectorName}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-amber-300">
                        {formatCurrency(p.installmentRemainingBalance, settings.currencySymbol)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveReceiptModalPayment(p)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800/60 px-2 py-1 rounded-lg transition"
                            title="Ver ticket oficial de comprobante"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Ticket</span>
                          </button>

                          {/* Request Reversion Button (Prompt Section 10) */}
                          {!p.isReversed && !hasPendingReversion && canRequestRev && (
                            <button
                              onClick={() => {
                                setReversionModalPayment(p);
                                setReversionReason('');
                                setReversionError('');
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 px-2 py-1 rounded-lg transition"
                              title="Solicitar corrección o reversión por error"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reversión</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Solicitar Reversión de Pago (Prompt Section 10) */}
      {reversionModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-amber-600/70 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <RotateCcw className="w-6 h-6" />
              <div>
                <h3 className="text-base font-bold text-white">Solicitar Reversión de Pago</h3>
                <p className="text-[11px] text-amber-300">
                  Comprobante: {reversionModalPayment.receiptNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Como cobrador, usted no puede anular el pago directamente. Al enviar esta solicitud, el pago permanecerá intacto hasta que el <strong>Administrador General</strong> la apruebe o rechace.
            </p>

            <div className="mt-3 p-3 bg-slate-950 rounded-xl text-xs space-y-1 border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white">{reversionModalPayment.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Importe a revertir:</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(reversionModalPayment.receivedAmount, settings.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fecha del pago:</span>
                <span>{formatDateDisplay(reversionModalPayment.date)} {reversionModalPayment.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Registrado por:</span>
                <span>{reversionModalPayment.collectorName}</span>
              </div>
            </div>

            {reversionError && (
              <div className="mt-3 p-2.5 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reversionError}</span>
              </div>
            )}

            <form onSubmit={handleRequestReversionSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Motivo detallado obligatorio <span className="text-rose-400">*</span>:
                </label>
                <textarea
                  required
                  rows={3}
                  value={reversionReason}
                  onChange={e => setReversionReason(e.target.value)}
                  placeholder="Explique detalladamente por qué se solicita revertir este pago (ej. Error en digitación de importe, billete no recibido, duplicado accidental, etc.)..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReversionModalPayment(null)}
                  disabled={isSubmittingReversion}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReversion}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow-lg transition"
                >
                  {isSubmittingReversion ? 'Enviando...' : 'Enviar Solicitud al Administrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
