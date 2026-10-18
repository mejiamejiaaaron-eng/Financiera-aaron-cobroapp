import React, { useState, useMemo } from 'react';
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
  Calendar,
  Clock,
  CalendarDays,
  AlertTriangle,
  CalendarClock,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { Installment, Client, Credit, PaymentMethod } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/financialCalculations';
import { formatDateDisplay, getElSalvadorDate, getElSalvadorTimeString } from '../../utils/dateUtils';

interface Props {
  installment: Installment;
  client: Client;
  credit: Credit;
  mode: 'full' | 'partial';
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

type PaymentOptionType = 'cuota-dia' | 'cuota-atraso' | 'elegir-dia-atraso';

export const PaymentRecordModal: React.FC<Props> = ({
  installment,
  client,
  credit,
  mode,
  onClose,
  onPaymentSuccess,
}) => {
  const { handleRecordPayment, database } = useApp();
  const { currentUser, isAdmin } = useAuth();
  const settings = database.settings;

  const today = getElSalvadorDate();
  const currentTime = getElSalvadorTimeString().slice(0, 5);

  // All installments of this credit ordered by installment number
  const creditInstallments = useMemo(() => {
    return database.installments
      .filter(i => i.creditId === credit.id)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
  }, [database.installments, credit.id]);

  // Overdue installments with balance > 0
  const overdueInstallments = useMemo(() => {
    return creditInstallments.filter(
      i => i.balance > 0.001 && (i.status === 'overdue' || i.dueDate < today)
    );
  }, [creditInstallments, today]);

  // Today's scheduled installment or nearest upcoming unpaid
  const todayInstallment = useMemo(() => {
    const exactToday = creditInstallments.find(i => i.dueDate === today && i.balance > 0.001);
    if (exactToday) return exactToday;
    const upcoming = creditInstallments.find(i => i.dueDate >= today && i.balance > 0.001);
    if (upcoming) return upcoming;
    return creditInstallments.find(i => i.balance > 0.001) || installment;
  }, [creditInstallments, today, installment]);

  // Initial determination of payment target
  const initialOption: PaymentOptionType = useMemo(() => {
    if (installment.status === 'overdue' || installment.dueDate < today) {
      return overdueInstallments.length > 1 ? 'elegir-dia-atraso' : 'cuota-atraso';
    }
    return 'cuota-dia';
  }, [installment, today, overdueInstallments.length]);

  const [paymentOption, setPaymentOption] = useState<PaymentOptionType>(initialOption);
  const [activeInstallment, setActiveInstallment] = useState<Installment>(() => {
    if (initialOption === 'cuota-atraso' && overdueInstallments.length > 0) {
      return overdueInstallments[0];
    }
    if (initialOption === 'cuota-dia' && todayInstallment) {
      return todayInstallment;
    }
    return installment;
  });

  // Selected overdue installment ID when choosing specific overdue day
  const [selectedOverdueId, setSelectedOverdueId] = useState<string>(() => {
    if (overdueInstallments.length > 0) {
      const match = overdueInstallments.find(i => i.id === installment.id);
      return match ? match.id : overdueInstallments[0].id;
    }
    return '';
  });

  // Admin exclusive date and time inputs
  const [customDate, setCustomDate] = useState<string>(today);
  const [customTime, setCustomTime] = useState<string>(currentTime);

  // Payment amounts and fields
  const [receivedAmount, setReceivedAmount] = useState<number | ''>(
    mode === 'full' ? activeInstallment.balance : Math.min(10, activeInstallment.balance)
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Switch payment option handler
  const handleSelectOption = (opt: PaymentOptionType) => {
    setPaymentOption(opt);
    if (opt === 'cuota-dia') {
      const target = todayInstallment || installment;
      setActiveInstallment(target);
      setReceivedAmount(target.balance);
    } else if (opt === 'cuota-atraso') {
      if (overdueInstallments.length > 0) {
        const target = overdueInstallments[0];
        setActiveInstallment(target);
        setSelectedOverdueId(target.id);
        setReceivedAmount(target.balance);
      }
    } else if (opt === 'elegir-dia-atraso') {
      if (overdueInstallments.length > 0) {
        const target = overdueInstallments.find(i => i.id === selectedOverdueId) || overdueInstallments[0];
        setActiveInstallment(target);
        setSelectedOverdueId(target.id);
        setReceivedAmount(target.balance);
      }
    }
  };

  // Switch specific overdue installment
  const handleSelectSpecificOverdue = (id: string) => {
    setSelectedOverdueId(id);
    const target = overdueInstallments.find(i => i.id === id);
    if (target) {
      setActiveInstallment(target);
      setReceivedAmount(target.balance);
    }
  };

  const numReceived = Math.max(0, Number(receivedAmount) || 0);
  const appliedToCurrent = Math.min(numReceived, activeInstallment.balance);
  const remainingCurrentAfterPayment = Math.max(
    0,
    Math.round((activeInstallment.balance - appliedToCurrent) * 100) / 100
  );
  const surplusAmount = Math.max(0, Math.round((numReceived - activeInstallment.balance) * 100) / 100);
  const isSurplus = surplusAmount > 0;
  const newCreditBalance = Math.max(
    0,
    Math.round((credit.balancePending - numReceived) * 100) / 100
  );
  const isTotalLiquidation = numReceived > 0 && newCreditBalance <= 0.001;

  // Shortcuts
  const singleCuota = activeInstallment.balance;
  const doubleCuota = Math.min(
    credit.balancePending,
    Math.round((activeInstallment.balance + activeInstallment.scheduledAmount) * 100) / 100
  );
  const tripleCuota = Math.min(
    credit.balancePending,
    Math.round((activeInstallment.balance + 2 * activeInstallment.scheduledAmount) * 100) / 100
  );

  const handleResetToCurrentTime = () => {
    setCustomDate(getElSalvadorDate());
    setCustomTime(getElSalvadorTimeString().slice(0, 5));
  };

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
        installmentId: activeInstallment.id,
        receivedAmount: numReceived,
        paymentMethod,
        notes: isSurplus
          ? `${notes ? `${notes} | ` : ''}Pago superior con adelanto ($${surplusAmount.toFixed(2)})`
          : notes,
        customDate: isAdmin ? customDate : undefined,
        customTime: isAdmin ? (customTime.length === 5 ? `${customTime}:00` : customTime) : undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-5 py-3.5 border-b border-blue-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Registrar Pago de Cuota</span>
                {isSurplus && (
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-semibold">
                    Adelanto de Cuotas
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-blue-300">
                {credit.creditNumber} • {client.fullName}
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* OPCIONES DE PAGO REQUERIDAS: Cuota del Día, Cuota de Atraso, Elegir Día de Cuota en Atraso */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Modalidad de Cobro: Seleccione qué desea pagar</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Opción 1: Cuota del Día */}
              <button
                type="button"
                onClick={() => handleSelectOption('cuota-dia')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  paymentOption === 'cuota-dia'
                    ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/40 text-white'
                    : 'bg-slate-800/80 hover:bg-slate-750 border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold flex items-center gap-1.5 text-xs text-blue-300">
                    <CalendarDays className="w-4 h-4 text-blue-400" />
                    <span>Cuota del Día</span>
                  </span>
                  {paymentOption === 'cuota-dia' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  Cuota #{todayInstallment?.installmentNumber || installment.installmentNumber}
                </div>
                <div className="font-extrabold text-xs text-white mt-1">
                  {formatCurrency(todayInstallment?.balance || installment.balance, settings.currencySymbol)}
                </div>
              </button>

              {/* Opción 2: Cuota de Atraso */}
              <button
                type="button"
                onClick={() => handleSelectOption('cuota-atraso')}
                disabled={overdueInstallments.length === 0}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  overdueInstallments.length === 0
                    ? 'opacity-40 bg-slate-800/40 border-slate-800 cursor-not-allowed'
                    : paymentOption === 'cuota-atraso'
                    ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/40 text-white cursor-pointer'
                    : 'bg-slate-800/80 hover:bg-slate-750 border-slate-700 text-slate-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold flex items-center gap-1.5 text-xs text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Cuota en Atraso</span>
                  </span>
                  {paymentOption === 'cuota-atraso' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {overdueInstallments.length > 0
                    ? `${overdueInstallments.length} cuota(s) vencida(s)`
                    : 'Sin atrasos'}
                </div>
                <div className="font-extrabold text-xs text-rose-300 mt-1">
                  {overdueInstallments.length > 0
                    ? formatCurrency(overdueInstallments[0].balance, settings.currencySymbol)
                    : '$0.00'}
                </div>
              </button>

              {/* Opción 3: Elegir Día de Cuota en Atraso */}
              <button
                type="button"
                onClick={() => handleSelectOption('elegir-dia-atraso')}
                disabled={overdueInstallments.length === 0}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  overdueInstallments.length === 0
                    ? 'opacity-40 bg-slate-800/40 border-slate-800 cursor-not-allowed'
                    : paymentOption === 'elegir-dia-atraso'
                    ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/40 text-white cursor-pointer'
                    : 'bg-slate-800/80 hover:bg-slate-750 border-slate-700 text-slate-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold flex items-center gap-1.5 text-xs text-amber-300">
                    <CalendarClock className="w-4 h-4 text-amber-400" />
                    <span>Elegir Día Atraso</span>
                  </span>
                  {paymentOption === 'elegir-dia-atraso' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  Seleccionar fecha
                </div>
                <div className="font-semibold text-[11px] text-amber-400 mt-1">
                  {overdueInstallments.length} fechas disponibles
                </div>
              </button>
            </div>
          </div>

          {/* Selector de Fecha Específica de Cuota en Atraso */}
          {paymentOption === 'elegir-dia-atraso' && overdueInstallments.length > 0 && (
            <div className="p-3 bg-amber-950/30 border border-amber-700/60 rounded-xl space-y-2 animate-fadeIn">
              <label className="block text-amber-200 font-bold flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-amber-400" />
                <span>Seleccione el día / cuota en atraso a abonar:</span>
              </label>
              <select
                value={selectedOverdueId}
                onChange={e => handleSelectSpecificOverdue(e.target.value)}
                className="w-full bg-slate-900 border border-amber-600/60 rounded-xl px-3 py-2 text-white font-medium focus:outline-hidden focus:border-amber-400 text-xs"
              >
                {overdueInstallments.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    Cuota #{inst.installmentNumber} — Vencida el {formatDateDisplay(inst.dueDate)} ({inst.daysOverdue || 1} días de atraso) — Saldo: {formatCurrency(inst.balance, settings.currencySymbol)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SECCIÓN EXCLUSIVA DE FECHA Y HORA (SOLO ADMIN PUEDE EDITAR) */}
          <div className="p-3 bg-slate-850 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Fecha y Hora de Ingreso</span>
              </span>
              {isAdmin ? (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span>👑 Exclusivo Admin (Editable)</span>
                </span>
              ) : (
                <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
                  🔒 Fijado en tiempo real
                </span>
              )}
            </div>

            {isAdmin ? (
              /* ADMIN: Selector de Fecha y Hora Habilitado */
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1 font-semibold">
                      Día de ingreso (Fecha):
                    </label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={e => setCustomDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-semibold text-xs focus:outline-hidden transition"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1 font-semibold">
                      Hora de ingreso:
                    </label>
                    <input
                      type="time"
                      value={customTime}
                      onChange={e => setCustomTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-semibold text-xs focus:outline-hidden transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-slate-400">
                    Como Administrador, puedes registrar cobros con fecha/hora anterior o específica.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetToCurrentTime}
                    className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Fijar a hoy y ahora</span>
                  </button>
                </div>
              </div>
            ) : (
              /* COBRADOR: Fecha y Hora Bloqueadas y Automáticas */
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-slate-300 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Hoy, <strong>{formatDateDisplay(today)}</strong> a las <strong>{currentTime}</strong>
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 italic">
                  Solo el Admin puede cambiar fecha y hora
                </span>
              </div>
            )}
          </div>

          {/* Resumen del crédito y de la cuota seleccionada */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Cliente:</span>
              <strong className="text-white text-xs">{client.fullName}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Cuota Seleccionada:</span>
              <span className="text-slate-200 font-semibold">
                Cuota #{activeInstallment.installmentNumber} • Vence: {formatDateDisplay(activeInstallment.dueDate)}
                {activeInstallment.dueDate < today && (
                  <span className="ml-1.5 text-rose-400 text-[10px] font-bold">
                    (Vencida)
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Saldo pendiente de esta cuota:</span>
              <span className="font-extrabold text-amber-400 text-sm">
                {formatCurrency(activeInstallment.balance, settings.currencySymbol)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-700/60">
              <span className="text-slate-400">Deuda total pendiente del crédito:</span>
              <span className="font-extrabold text-rose-400 text-sm">
                {formatCurrency(credit.balancePending, settings.currencySymbol)}
              </span>
            </div>
          </div>

          {/* Input de Importe Recibido */}
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

            {/* Atajos de pago rápido */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-slate-400 text-[10px]">Atajos:</span>
              <button
                type="button"
                onClick={() => setReceivedAmount(singleCuota)}
                className={`px-2.5 py-1 rounded-lg font-semibold border transition cursor-pointer ${
                  numReceived === singleCuota
                    ? 'bg-blue-600 text-white border-blue-500 font-bold shadow'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                }`}
                title="Pagar exactamente la cuota seleccionada"
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
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
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
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
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

          {/* Banner de Pago con Excedente / Adelanto */}
          {isSurplus && (
            <div className="p-3 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/70 border border-emerald-600/70 rounded-xl space-y-1.5 text-xs shadow-md animate-fadeIn">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Sparkles className="w-4 h-4 text-emerald-300" />
                <span>¡Pago mayor a la cuota aceptado!</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                • Cuota #{activeInstallment.installmentNumber}: <strong className="text-emerald-300 font-bold">Quedará 100% Pagada</strong> ({formatCurrency(activeInstallment.balance, settings.currencySymbol)}).
              </p>
              <p className="text-emerald-200 text-[11px] leading-relaxed">
                • Excedente de <strong className="text-white font-bold">{formatCurrency(surplusAmount, settings.currencySymbol)}</strong>: Se aplicará automáticamente en cascada como adelanto a las siguientes cuotas (#{activeInstallment.installmentNumber + 1} en adelante).
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

          {/* Saldo restante normal */}
          {!isSurplus && numReceived > 0 && (
            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/80 flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Saldo restante de esta cuota después del pago:</span>
              <strong className={remainingCurrentAfterPayment === 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {remainingCurrentAfterPayment === 0 ? '✓ Cuota pagada por completo' : formatCurrency(remainingCurrentAfterPayment, settings.currencySymbol)}
              </strong>
            </div>
          )}

          {/* Método de Pago */}
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

          {/* Observaciones */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Observaciones (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej. Pago puntual entregado en mano, o notas adicionales..."
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
