import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  User,
  DollarSign,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  FileText,
  ArrowLeft,
  Banknote,
  Receipt,
  Phone,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/financialCalculations';
import { PaymentRecordModal } from '../collections/PaymentRecordModal';
import { Installment, Client, Credit, PaymentMethod } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Componente para resaltar las coincidencias en el nombre completo sin truncarlo
const HighlightText: React.FC<{ text: string; search: string }> = ({ text, search }) => {
  if (!search.trim()) {
    return <span className="break-words">{text}</span>;
  }

  const normText = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const normSearch = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const index = normText.indexOf(normSearch);
  if (index === -1) {
    return <span className="break-words">{text}</span>;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + normSearch.length);
  const after = text.slice(index + normSearch.length);

  return (
    <span className="break-words">
      {before}
      <span className="bg-sky-500/30 text-sky-200 font-black rounded-xs px-0.5 underline decoration-sky-400 decoration-2">
        {match}
      </span>
      {after}
    </span>
  );
};

export const QuickSearchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    database,
    setSelectedClientIdForDossier,
    handleRecordPayment,
    setActiveReceiptModalPayment,
  } = useApp();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Cliente seleccionado para el panel de cobro/detalle
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Estados para el panel de pago rápido
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Efectivo');
  const [payNotes, setPayNotes] = useState<string>('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);
  const [payFeedback, setPayFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Modal alternativo de pago completo si se desea el desglose tradicional
  const [fullPaymentTarget, setFullPaymentTarget] = useState<{
    installment: Installment;
    client: Client;
    credit: Credit;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedClient(null);
      setPayFeedback(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
    }
  }, [isOpen]);

  // Normalizador de texto para ignorar mayúsculas, minúsculas y tildes/acentos
  const normalize = (text: string) => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  };

  const activeClients = useMemo(() => {
    return database.clients.filter(c => !c.inTrash && !c.isArchived);
  }, [database.clients]);

  // Búsqueda en tiempo real letra por letra sin distinguir mayúsculas ni acentos
  const searchResults = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];

    return activeClients.filter(c => {
      const name = normalize(c.fullName);
      const dui = normalize(c.dui || '');
      const phone = normalize(c.phone || '');
      return name.includes(q) || dui.includes(q) || phone.includes(q);
    });
  }, [query, activeClients]);

  if (!isOpen) return null;

  // Al hacer clic en un cliente, seleccionarlo para mostrar su panel de detalle y pago
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setPayFeedback(null);

    const credit = database.credits.find(
      c => c.clientId === client.id && (c.status === 'active' || c.status === 'overdue')
    );

    if (credit) {
      // Pre-llenar con el valor de la cuota
      setPayAmount(String(credit.installmentAmount || ''));
    } else {
      setPayAmount('');
    }
  };

  const handleOpenClientDossier = (clientId: string) => {
    setSelectedClientIdForDossier(clientId);
    onClose();
  };

  // Crédito activo del cliente seleccionado
  const selectedCredit = selectedClient
    ? database.credits.find(
        c => c.clientId === selectedClient.id && (c.status === 'active' || c.status === 'overdue')
      )
    : null;

  // Primera cuota pendiente del crédito activo
  const firstUnpaidInstallment = selectedCredit
    ? database.installments
        .filter(i => i.creditId === selectedCredit.id && i.balance > 0.001)
        .sort((a, b) => a.installmentNumber - b.installmentNumber)[0]
    : null;

  // Validación y cálculo dinámico de pago (menor, igual o mayor)
  const amountNumber = parseFloat(payAmount) || 0;
  const cuotaAmount = selectedCredit?.installmentAmount || 0;
  const balancePending = selectedCredit?.balancePending || 0;

  let paymentAnalysisMessage = '';
  let paymentAnalysisClass = 'text-slate-400';

  if (selectedCredit && amountNumber > 0) {
    if (amountNumber < cuotaAmount) {
      const restante = Math.max(0, cuotaAmount - amountNumber);
      paymentAnalysisMessage = `Pago parcial aceptado. Saldo restante de la cuota: ${formatCurrency(restante, database.settings.currencySymbol)}`;
      paymentAnalysisClass = 'text-amber-400 font-semibold';
    } else if (amountNumber === cuotaAmount) {
      paymentAnalysisMessage = `Pago completo aceptado. Saldo de cuota: ${formatCurrency(0, database.settings.currencySymbol)}`;
      paymentAnalysisClass = 'text-emerald-400 font-semibold';
    } else {
      const excedente = amountNumber - cuotaAmount;
      paymentAnalysisMessage = `Pago aceptado con excedente a favor de ${formatCurrency(excedente, database.settings.currencySymbol)} (se aplica a saldo y próximas cuotas).`;
      paymentAnalysisClass = 'text-sky-300 font-semibold';
    }
  }

  // Ejecución directa del pago
  const handleConfirmDirectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayFeedback(null);

    if (!selectedClient || !selectedCredit || !firstUnpaidInstallment) {
      setPayFeedback({
        type: 'error',
        message: 'El cliente no tiene cuotas pendientes activas para registrar pago.',
      });
      return;
    }

    if (isNaN(amountNumber) || amountNumber <= 0) {
      setPayFeedback({
        type: 'error',
        message: 'Por favor ingrese un monto válido mayor a 0.',
      });
      return;
    }

    try {
      setIsSubmittingPay(true);
      const paymentRecorded = await handleRecordPayment({
        creditId: selectedCredit.id,
        installmentId: firstUnpaidInstallment.id,
        receivedAmount: amountNumber,
        paymentMethod: payMethod,
        notes: payNotes.trim() || `Pago rápido registrado desde buscador para ${selectedClient.fullName}`,
      });

      setPayFeedback({
        type: 'success',
        message: `¡Pago de ${formatCurrency(amountNumber, database.settings.currencySymbol)} registrado con éxito! Recibo #${paymentRecorded.receiptNumber} generado.`,
      });

      // Abrir recibo automáticamente
      setActiveReceiptModalPayment(paymentRecorded);

      // Limpiar campos después de 1 segundo
      setTimeout(() => {
        setPayAmount('');
        setPayNotes('');
      }, 1000);
    } catch (err: unknown) {
      setPayFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al registrar el pago.',
      });
    } finally {
      setIsSubmittingPay(false);
    }
  };

  return (
    <>
      {/* Contenedor Centrado (NO pegado arriba para que se vean todas las opciones completas) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-hidden">
        <div className="bg-slate-900 border border-slate-700/90 w-full max-w-xl max-h-[85vh] sm:max-h-[88vh] rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col my-auto animate-fadeIn">
          {/* Header con Barra de Búsqueda fija */}
          <div className="p-3 sm:p-4 bg-slate-950/95 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 shrink-0">
                <Search className="w-4 h-4 text-sky-400" />
              </div>

              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    if (selectedClient) setSelectedClient(null);
                  }}
                  placeholder="Buscar cliente por nombre..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl px-4 py-2 text-white placeholder-slate-400 text-sm font-semibold focus:outline-hidden transition shadow-inner"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setSelectedClient(null);
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full text-xs"
                    title="Borrar texto"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 transition cursor-pointer shrink-0"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subtítulo informativo */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
              <span>Búsqueda en vivo (coincidencia parcial sin mayúsculas/acentos)</span>
              <span>{activeClients.length} clientes registrados</span>
            </div>
          </div>

          {/* CUERPO DEL MODAL (Con scroll interno contenido, todas las opciones visibles) */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0 overscroll-contain">
            {/* VISTA 1: Panel de Detalle y Pago de un Cliente Seleccionado */}
            {selectedClient ? (
              <div className="space-y-4">
                {/* Botón para regresar a los resultados */}
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a la lista de coincidencias</span>
                </button>

                {/* Tarjeta de Información Completa del Cliente */}
                <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-2xl space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Nombre Completo del Cliente:
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white leading-snug break-words">
                      {selectedClient.fullName}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-700/80">
                    <div>
                      <span className="text-slate-400 text-[10px] block">DUI / Identificación:</span>
                      <strong className="text-slate-200">{selectedClient.dui || 'No registrado'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Teléfono:</span>
                      <strong className="text-slate-200">{selectedClient.phone || 'No registrado'}</strong>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-slate-400 text-[10px] block">Cobrador:</span>
                      <strong className="text-slate-200 truncate block">
                        {selectedClient.assignedCollectorName || 'Sin asignar'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Información del Crédito y Saldo */}
                {selectedCredit ? (
                  <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Estado del Crédito:
                        </span>
                        {selectedCredit.status === 'overdue' && (
                          <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-bold">
                            En Mora
                          </span>
                        )}
                        {selectedCredit.status === 'active' && (
                          <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-semibold">
                            Activo
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-slate-400 capitalize">
                        Modalidad: {selectedCredit.modality}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700/60">
                      <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Cuota Programada:
                        </span>
                        <span className="text-base sm:text-lg font-black text-emerald-400">
                          {formatCurrency(selectedCredit.installmentAmount, database.settings.currencySymbol)}
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Saldo Pendiente Total:
                        </span>
                        <span className="text-base sm:text-lg font-black text-amber-400">
                          {formatCurrency(selectedCredit.balancePending, database.settings.currencySymbol)}
                        </span>
                      </div>
                    </div>

                    {/* Formulario de Pago Inmediato */}
                    <form onSubmit={handleConfirmDirectPayment} className="space-y-3 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-white mb-1.5">
                          Monto a Pagar (Acepta cualquier monto mayor a 0):
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                            {database.settings.currencySymbol}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={payAmount}
                            onChange={e => setPayAmount(e.target.value)}
                            placeholder="Ingrese el monto recibido"
                            className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 rounded-xl pl-8 pr-4 py-2.5 text-white text-base font-black focus:outline-hidden transition"
                          />
                        </div>
                      </div>

                      {/* Explicación en vivo del pago: parcial, completo o con excedente */}
                      {paymentAnalysisMessage && (
                        <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                          <p className={paymentAnalysisClass}>{paymentAnalysisMessage}</p>
                        </div>
                      )}

                      {/* Método de Pago */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPayMethod('Efectivo')}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            payMethod === 'Efectivo'
                              ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-bold'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Efectivo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPayMethod('Transferencia')}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            payMethod === 'Transferencia'
                              ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-bold'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Transferencia</span>
                        </button>
                      </div>

                      {/* Feedback de error o éxito */}
                      {payFeedback && (
                        <div
                          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                            payFeedback.type === 'success'
                              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                              : 'bg-rose-950/80 border border-rose-800 text-rose-300'
                          }`}
                        >
                          {payFeedback.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                          )}
                          <span>{payFeedback.message}</span>
                        </div>
                      )}

                      {/* Botones de acción del panel de detalle */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={isSubmittingPay}
                          className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>{isSubmittingPay ? 'Procesando Pago...' : 'Pagar Ahora'}</span>
                        </button>

                        {firstUnpaidInstallment && (
                          <button
                            type="button"
                            onClick={() => setFullPaymentTarget({
                              installment: firstUnpaidInstallment,
                              client: selectedClient,
                              credit: selectedCredit,
                            })}
                            className="py-3 px-3 bg-blue-900/60 hover:bg-blue-800/80 border border-blue-700/80 text-blue-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Ver opciones de cuota del día, cuota de atraso o elegir fecha"
                          >
                            <Receipt className="w-4 h-4 text-blue-400" />
                            <span>Opciones Cuota / Atraso</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenClientDossier(selectedClient.id)}
                          className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Expediente</span>
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl text-center space-y-3">
                    <p className="text-slate-300 text-xs">
                      Este cliente no tiene créditos activos actualmente.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenClientDossier(selectedClient.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition"
                    >
                      Ver Historial en Expediente
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* VISTA 2: Lista de Resultados de la Búsqueda */
              <div>
                {query.trim().length === 0 ? (
                  <div className="py-10 text-center text-slate-400 space-y-2">
                    <Search className="w-9 h-9 mx-auto text-slate-500 opacity-60" />
                    <p className="font-bold text-slate-200 text-sm">
                      Escribe el nombre de cualquier cliente
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Las coincidencias aparecerán en tiempo real mostrando el nombre completo, cuota y saldo disponible para cobrar.
                    </p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <AlertCircle className="w-9 h-9 mx-auto text-amber-500 opacity-70" />
                    <p className="font-black text-slate-200 text-sm">Sin resultados</p>
                    <p className="text-xs text-slate-400">
                      No se encontró ningún cliente que coincida con "{query}".
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                      <span>Coincidencias encontradas ({searchResults.length})</span>
                      <span className="text-[10px] text-sky-400 lowercase">toca un cliente para pagar</span>
                    </div>

                    {searchResults.map(client => {
                      const credit = database.credits.find(
                        c => c.clientId === client.id && (c.status === 'active' || c.status === 'overdue')
                      );
                      const isLiquidated =
                        !credit &&
                        database.credits.some(c => c.clientId === client.id && c.status === 'liquidated');

                      return (
                        <div
                          key={client.id}
                          onClick={() => handleSelectClient(client)}
                          className="p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/50 rounded-2xl transition cursor-pointer group shadow-sm space-y-2.5"
                        >
                          {/* Fila 1: NOMBRE COMPLETO SIN TRUNCAR + Badges de Estado */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm sm:text-base font-black text-white group-hover:text-sky-300 transition-colors leading-tight break-words">
                                <HighlightText text={client.fullName} search={query} />
                              </h4>
                              <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                                {client.dui && (
                                  <span>
                                    DUI: <HighlightText text={client.dui} search={query} />
                                  </span>
                                )}
                                {client.phone && (
                                  <span>
                                    Tel: <HighlightText text={client.phone} search={query} />
                                  </span>
                                )}
                                {client.assignedCollectorName && (
                                  <span className="text-slate-400">
                                    Cobrador: <strong className="text-slate-300">{client.assignedCollectorName}</strong>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Badge de estado del cliente/crédito */}
                            <div className="shrink-0">
                              {credit?.status === 'overdue' && (
                                <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-bold">
                                  En Mora
                                </span>
                              )}
                              {credit?.status === 'active' && (
                                <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-semibold">
                                  Activo
                                </span>
                              )}
                              {isLiquidated && (
                                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-semibold">
                                  Al Día
                                </span>
                              )}
                              {!credit && !isLiquidated && (
                                <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded">
                                  Sin Créditos
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Fila 2: Cuota, Saldo y Botones de Acción (Completamente accesibles en pantalla) */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/60">
                            {credit ? (
                              <div className="flex items-center gap-3 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                                    Cuota:
                                  </span>
                                  <span className="font-extrabold text-emerald-400 text-xs sm:text-sm">
                                    {formatCurrency(credit.installmentAmount, database.settings.currencySymbol)}
                                  </span>
                                </div>
                                <div className="border-l border-slate-700 pl-3">
                                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                                    Saldo:
                                  </span>
                                  <span className="font-black text-amber-400 text-xs sm:text-sm">
                                    {formatCurrency(credit.balancePending, database.settings.currencySymbol)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Sin deuda activa</span>
                            )}

                            <div className="flex items-center gap-2 ml-auto">
                              {credit && (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleSelectClient(client);
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-md transition flex items-center gap-1 cursor-pointer"
                                  title="Pagar cuota de este cliente"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span>Pagar</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleOpenClientDossier(client.id);
                                }}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                                title="Ver expediente"
                              >
                                Expediente
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Fijo del Modal */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between shrink-0">
            <span>Presiona Esc para salir</span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white font-semibold text-xs px-2 py-1 rounded-lg hover:bg-slate-800 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal alternativo de pago completo tradicional si se invoca */}
      {fullPaymentTarget && (
        <PaymentRecordModal
          installment={fullPaymentTarget.installment}
          client={fullPaymentTarget.client}
          credit={fullPaymentTarget.credit}
          mode="full"
          onClose={() => {
            setFullPaymentTarget(null);
            onClose();
          }}
        />
      )}
    </>
  );
};
