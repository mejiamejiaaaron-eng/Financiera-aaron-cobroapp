import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Receipt,
  FileText,
  Archive,
  CheckCircle,
  AlertTriangle,
  Clock,
  Printer,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { LoanCalculator, formatCurrency } from '../../utils/financialCalculations';
import { formatDateDisplay, getElSalvadorDate } from '../../utils/dateUtils';
import { Credit } from '../../types';

interface Props {
  clientId: string;
  onClose: () => void;
  onOpenArchiveModal: (clientId: string) => void;
}

export const ClientDossierModal: React.FC<Props> = ({
  clientId,
  onClose,
  onOpenArchiveModal,
}) => {
  const { database, setActiveReceiptModalPayment } = useApp();
  const { hasPermission, isAdmin } = useAuth();
  const settings = database.settings;

  const client = database.clients.find(c => c.id === clientId);
  const clientCredits = database.credits.filter(c => c.clientId === clientId);

  const [selectedCreditId, setSelectedCreditId] = useState<string>(
    clientCredits[0]?.id || ''
  );

  const currentCredit = clientCredits.find(c => c.id === selectedCreditId) || clientCredits[0];

  const creditInstallments = database.installments
    .filter(i => i.creditId === currentCredit?.id)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  const creditPayments = database.payments
    .filter(p => p.creditId === currentCredit?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!client) return null;

  const today = getElSalvadorDate();

  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Expediente de {client.fullName}
                </h2>
                {client.isArchived && (
                  <span className="text-[10px] uppercase font-bold bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded">
                    Archivado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                DUI: {client.dui || 'No registrado'} | Registrado: {formatDateDisplay(client.registerDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintDossier}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
              title="Imprimir expediente oficial del cliente"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Expediente</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 no-print">
          {/* Client Personal Info Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <span className="text-slate-400 block mb-0.5">Teléfono:</span>
              <div className="flex items-center gap-1.5 font-bold text-blue-300">
                <Phone className="w-3.5 h-3.5" />
                <a href={`tel:${client.phone}`} className="hover:underline">
                  {client.phone}
                </a>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Cobrador Asignado:</span>
              <span className="font-semibold text-white">{client.assignedCollectorName}</span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-slate-400 block mb-0.5">Dirección de Cobro:</span>
              <div className="flex items-start gap-1.5 font-medium text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{client.address || 'Sin dirección registrada'}</span>
              </div>
            </div>

            {client.personalReferences && (
              <div className="sm:col-span-4 pt-2 border-t border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Referencias Personales:</span>
                <span className="text-slate-300 italic">{client.personalReferences}</span>
              </div>
            )}
          </div>

          {/* Credits Selector Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Créditos del Cliente ({clientCredits.length})
              </h3>
              {(isAdmin || hasPermission('canArchiveClients')) && !client.isArchived && (
                <button
                  onClick={() => onOpenArchiveModal(client.id)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded-lg transition"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archivar Cliente</span>
                </button>
              )}
            </div>

            {clientCredits.length === 0 ? (
              <div className="p-4 bg-slate-800/40 rounded-xl text-center text-slate-400 text-xs">
                Este cliente no tiene créditos registrados.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {clientCredits.map(c => {
                  const isSelected = c.id === currentCredit?.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCreditId(c.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{c.creditNumber}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          c.status === 'liquidated'
                            ? 'bg-emerald-950 text-emerald-300'
                            : c.status === 'overdue'
                            ? 'bg-rose-950 text-rose-300'
                            : 'bg-blue-950 text-blue-300'
                        }`}
                      >
                        {c.status === 'liquidated' ? 'Liquidado' : c.status === 'overdue' ? 'En Mora' : 'Activo'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Current Credit Details & Summary */}
          {currentCredit && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-slate-800 to-slate-850 border border-slate-700 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Capital</span>
                  <span className="text-sm font-bold text-white">
                    {formatCurrency(currentCredit.principal, settings.currencySymbol)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Total a Pagar</span>
                  <span className="text-sm font-bold text-white">
                    {formatCurrency(currentCredit.totalAmountToPay, settings.currencySymbol)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Pagado</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatCurrency(currentCredit.totalPaid, settings.currencySymbol)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Saldo Pendiente</span>
                  <span className="text-sm font-black text-rose-400">
                    {formatCurrency(currentCredit.balancePending, settings.currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Stored Credit Plan Summary */}
              <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Monto de Cuota (Guardado en BD):</span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-emerald-400">
                        {formatCurrency(LoanCalculator.getInstallmentAmount(currentCredit), settings.currencySymbol)}
                      </span>
                      {currentCredit.lastInstallmentAmount && currentCredit.lastInstallmentAmount !== currentCredit.installmentAmount && (
                        <span className="text-[10px] text-amber-300 font-semibold bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
                          Última cuota #{currentCredit.totalInstallments}: {formatCurrency(currentCredit.lastInstallmentAmount, settings.currencySymbol)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-slate-300 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Plan Guardado:</span>
                    <strong className="text-white capitalize">{LoanCalculator.formatSummary(currentCredit, settings.currencySymbol)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tasa de Interés:</span>
                    <strong className="text-white">{currentCredit.interestRate}% ({formatCurrency(currentCredit.totalInterest, settings.currencySymbol)})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Fecha Entrega:</span>
                    <strong className="text-white">{formatDateDisplay(currentCredit.startDate)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Primera Cuota:</span>
                    <strong className="text-emerald-300">{formatDateDisplay(currentCredit.firstDueDate)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Vencimiento Final:</span>
                    <strong className="text-blue-300">{formatDateDisplay(currentCredit.finalDueDate)}</strong>
                  </div>
                </div>
              </div>

              {/* Installments Table */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>Cronograma de Cuotas Guardado ({creditInstallments.length})</span>
                  </h4>
                  <span className="text-xs text-slate-400">
                    Modalidad: <strong className="text-white capitalize">{currentCredit.modality}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[280px] mt-2">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700/60 pb-1">
                        <th className="py-2 px-2 font-semibold"># Cuota</th>
                        <th className="py-2 px-2 font-semibold">Vencimiento</th>
                        <th className="py-2 px-2 font-semibold">Programado</th>
                        <th className="py-2 px-2 font-semibold">Pagado</th>
                        <th className="py-2 px-2 font-semibold">Saldo</th>
                        <th className="py-2 px-2 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-750">
                      {creditInstallments.map(inst => (
                        <tr key={inst.id} className="hover:bg-slate-700/20">
                          <td className="py-2 px-2 font-mono text-slate-300">
                            Cuota #{inst.installmentNumber}
                            {inst.isLastInstallment && currentCredit.lastInstallmentAmount && currentCredit.lastInstallmentAmount !== currentCredit.installmentAmount && (
                              <span className="ml-1 text-[9px] text-amber-300 font-sans font-bold bg-amber-950/80 border border-amber-800/80 px-1 py-0.2 rounded">
                                [Redondeo]
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-slate-200">
                            {formatDateDisplay(inst.dueDate)}
                          </td>
                          <td className="py-2 px-2 font-semibold text-white">
                            {formatCurrency(LoanCalculator.getInstallmentScheduledAmount(inst), settings.currencySymbol)}
                          </td>
                          <td className="py-2 px-2 text-emerald-400 font-semibold">
                            {formatCurrency(inst.paidAmount, settings.currencySymbol)}
                          </td>
                          <td className="py-2 px-2 font-bold text-rose-300">
                            {formatCurrency(inst.balance, settings.currencySymbol)}
                          </td>
                          <td className="py-2 px-2">
                            {inst.status === 'paid' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Pagado
                              </span>
                            )}
                            {inst.status === 'partial' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> Abono parcial
                              </span>
                            )}
                            {inst.status === 'overdue' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" /> En Mora ({inst.daysOverdue}d)
                              </span>
                            )}
                            {inst.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                                Pendiente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments & Receipts */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Historial de Pagos y Comprobantes ({creditPayments.length})</span>
                  </h4>
                </div>

                {creditPayments.length === 0 ? (
                  <div className="py-4 text-center text-slate-400 text-xs">
                    No hay recibos emitidos todavía para este crédito.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[220px] mt-2">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700/60 pb-1">
                          <th className="py-2 px-2 font-semibold">Recibo</th>
                          <th className="py-2 px-2 font-semibold">Fecha / Hora</th>
                          <th className="py-2 px-2 font-semibold">Cuota</th>
                          <th className="py-2 px-2 font-semibold">Monto</th>
                          <th className="py-2 px-2 font-semibold">Método</th>
                          <th className="py-2 px-2 font-semibold">Cobrador</th>
                          <th className="py-2 px-2 font-semibold text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-750">
                        {creditPayments.map(p => (
                          <tr
                            key={p.id}
                            className={`hover:bg-slate-700/20 ${
                              p.isReversed ? 'opacity-50 line-through' : ''
                            }`}
                          >
                            <td className="py-2 px-2 font-mono text-blue-300">
                              {p.receiptNumber}
                              {p.isReversed && (
                                <span className="ml-1 text-[9px] text-rose-400 no-underline font-sans font-bold">
                                  [Revertido]
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-slate-300">
                              {formatDateDisplay(p.date)} {p.time}
                            </td>
                            <td className="py-2 px-2 text-slate-200">
                              Cuota #{p.installmentNumber}
                            </td>
                            <td className="py-2 px-2 font-bold text-emerald-400">
                              {formatCurrency(p.receivedAmount, settings.currencySymbol)}
                            </td>
                            <td className="py-2 px-2 text-slate-300">{p.paymentMethod}</td>
                            <td className="py-2 px-2 text-slate-300">{p.collectorName}</td>
                            <td className="py-2 px-2 text-right">
                              <button
                                onClick={() => setActiveReceiptModalPayment(p)}
                                className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded border border-blue-800/60 transition cursor-pointer"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Ticket</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            PRINTABLE DOSSIER (Rendered and isolated during window.print())
           ========================================================================= */}
        <div id="printable-client-dossier" className="hidden print:block font-sans text-black text-xs space-y-4">
          {/* Header Oficial de Financiera */}
          <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black tracking-wider uppercase text-slate-900">
                {settings.businessName}
              </h1>
              <p className="text-xs text-slate-700 font-semibold">{settings.brandSubtitle}</p>
              <p className="text-[11px] text-slate-600">{settings.contactAddress}</p>
              <p className="text-[11px] text-slate-600">Tel: {settings.contactPhone}</p>
            </div>
            <div className="text-right">
              <span className="inline-block border border-slate-900 bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider">
                EXPEDIENTE DE CLIENTE
              </span>
              <p className="text-[10px] text-slate-500 mt-1">
                Fecha Emisión: {formatDateDisplay(today)}
              </p>
            </div>
          </div>

          {/* Sección 1: Datos Personales del Cliente */}
          <div className="border border-slate-300 rounded p-3 space-y-1.5 bg-slate-50">
            <h3 className="font-bold uppercase text-[11px] text-slate-800 border-b border-slate-200 pb-1">
              1. Datos Generales del Cliente
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">NOMBRE COMPLETO:</span>
                <strong className="text-slate-900 text-sm">{client.fullName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">DUI (DOCUMENTO DE IDENTIDAD):</span>
                <strong className="font-mono text-slate-900">{client.dui || 'No registrado'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">TELÉFONO DE CONTACTO:</span>
                <strong className="text-slate-900">{client.phone}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">COBRADOR / ASESOR ASIGNADO:</span>
                <strong className="text-slate-900">{client.assignedCollectorName}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block text-[10px]">DIRECCIÓN RESIDENCIAL / COMERCIAL:</span>
                <span className="text-slate-800">{client.address || 'Sin dirección registrada'}</span>
              </div>
              {client.personalReferences && (
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px]">REFERENCIAS PERSONALES:</span>
                  <span className="text-slate-700 italic">{client.personalReferences}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sección 2: Resumen del Crédito */}
          {currentCredit && (
            <div className="border border-slate-300 rounded p-3 space-y-2">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                <h3 className="font-bold uppercase text-[11px] text-slate-800">
                  2. Condiciones Financieras ({currentCredit.creditNumber})
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 border border-slate-800 rounded">
                  {currentCredit.status === 'liquidated' ? 'CRÉDITO LIQUIDADO' : currentCredit.status === 'overdue' ? 'CRÉDITO EN MORA' : 'CRÉDITO ACTIVO'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs py-1 bg-slate-100 rounded">
                <div>
                  <span className="text-[10px] text-slate-500 block">CAPITAL</span>
                  <strong className="text-slate-900 text-sm">{formatCurrency(currentCredit.principal, settings.currencySymbol)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">TOTAL A PAGAR</span>
                  <strong className="text-slate-900 text-sm">{formatCurrency(currentCredit.totalAmountToPay, settings.currencySymbol)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">TOTAL PAGADO</span>
                  <strong className="text-emerald-800 text-sm">{formatCurrency(currentCredit.totalPaid, settings.currencySymbol)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">SALDO PENDIENTE</span>
                  <strong className="text-rose-800 text-sm">{formatCurrency(currentCredit.balancePending, settings.currencySymbol)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-500 block text-[10px]">CUOTA ESTÁNDAR:</span>
                  <strong className="text-slate-900">{formatCurrency(LoanCalculator.getInstallmentAmount(currentCredit), settings.currencySymbol)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">MODALIDAD Y PLAZO:</span>
                  <span className="capitalize">{currentCredit.modality} ({currentCredit.totalInstallments} cuotas)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TASA DE INTERÉS:</span>
                  <span>{currentCredit.interestRate}% ({formatCurrency(currentCredit.totalInterest, settings.currencySymbol)})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">FECHA DE DESEMBOLSO:</span>
                  <span>{formatDateDisplay(currentCredit.startDate)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">PRIMERA CUOTA:</span>
                  <span>{formatDateDisplay(currentCredit.firstDueDate)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">FECHA DE VENCIMIENTO FINAL:</span>
                  <span>{formatDateDisplay(currentCredit.finalDueDate)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Sección 3: Cronograma de Cuotas (Tabla Impresa) */}
          {creditInstallments.length > 0 && (
            <div className="border border-slate-300 rounded p-3 space-y-1.5">
              <h3 className="font-bold uppercase text-[11px] text-slate-800 border-b border-slate-200 pb-1">
                3. Cronograma de Cuotas y Pagos
              </h3>
              <table className="w-full text-[10px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-400 bg-slate-100">
                    <th className="py-1 px-1 font-bold"># Cuota</th>
                    <th className="py-1 px-1 font-bold">Vencimiento</th>
                    <th className="py-1 px-1 font-bold">Monto Cuota</th>
                    <th className="py-1 px-1 font-bold">Total Abonado</th>
                    <th className="py-1 px-1 font-bold">Saldo Pendiente</th>
                    <th className="py-1 px-1 font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {creditInstallments.map(inst => (
                    <tr key={inst.id}>
                      <td className="py-1 px-1 font-mono">Cuota #{inst.installmentNumber}</td>
                      <td className="py-1 px-1">{formatDateDisplay(inst.dueDate)}</td>
                      <td className="py-1 px-1 font-semibold">{formatCurrency(inst.scheduledAmount, settings.currencySymbol)}</td>
                      <td className="py-1 px-1 text-emerald-800">{formatCurrency(inst.paidAmount, settings.currencySymbol)}</td>
                      <td className="py-1 px-1 font-bold text-rose-800">{formatCurrency(inst.balance, settings.currencySymbol)}</td>
                      <td className="py-1 px-1 uppercase font-semibold text-[9px]">
                        {inst.status === 'paid' ? 'Pagada' : inst.status === 'overdue' ? `Mora (${inst.daysOverdue}d)` : inst.status === 'partial' ? 'Abono Parcial' : 'Pendiente'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sección 4: Historial de Comprobantes Emitidos */}
          {creditPayments.length > 0 && (
            <div className="border border-slate-300 rounded p-3 space-y-1.5">
              <h3 className="font-bold uppercase text-[11px] text-slate-800 border-b border-slate-200 pb-1">
                4. Historial Oficial de Comprobantes de Pago ({creditPayments.length})
              </h3>
              <table className="w-full text-[10px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-400 bg-slate-100">
                    <th className="py-1 px-1 font-bold">N° Recibo</th>
                    <th className="py-1 px-1 font-bold">Fecha / Hora</th>
                    <th className="py-1 px-1 font-bold">Cuota</th>
                    <th className="py-1 px-1 font-bold">Importe Recibido</th>
                    <th className="py-1 px-1 font-bold">Forma de Pago</th>
                    <th className="py-1 px-1 font-bold">Cobrador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {creditPayments.map(p => (
                    <tr key={p.id}>
                      <td className="py-1 px-1 font-mono">{p.receiptNumber} {p.isReversed ? '(REVERTIDO)' : ''}</td>
                      <td className="py-1 px-1">{formatDateDisplay(p.date)} {p.time}</td>
                      <td className="py-1 px-1">Cuota #{p.installmentNumber}</td>
                      <td className="py-1 px-1 font-bold">{formatCurrency(p.receivedAmount, settings.currencySymbol)}</td>
                      <td className="py-1 px-1">{p.paymentMethod}</td>
                      <td className="py-1 px-1">{p.collectorName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sección 5: Firmas de Conformidad */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t border-slate-800 pt-2">
              <p className="font-bold uppercase text-slate-900">{client.fullName}</p>
              <p className="text-[10px] text-slate-600 font-mono">DUI: {client.dui || '__________________'}</p>
              <p className="text-[10px] text-slate-500 italic mt-0.5">Firma de Conformidad del Titular</p>
            </div>
            <div className="border-t border-slate-800 pt-2">
              <p className="font-bold uppercase text-slate-900">{settings.businessName}</p>
              <p className="text-[10px] text-slate-600">Cobrador: {client.assignedCollectorName}</p>
              <p className="text-[10px] text-slate-500 italic mt-0.5">Firma y Sello de Autorización</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center no-print">
          <button
            type="button"
            onClick={handlePrintDossier}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Expediente Completo</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            Cerrar Expediente
          </button>
        </div>
      </div>
    </div>
  );
};
