import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  CheckCircle,
  Clock,
  AlertTriangle,
  Receipt,
  Phone,
  Eye,
  DollarSign,
  Filter,
  Search,
  MessageCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/financialCalculations';
import { formatDateDisplay, getElSalvadorDate } from '../../utils/dateUtils';
import { Installment, Client, Credit } from '../../types';
import { PaymentRecordModal } from './PaymentRecordModal';

export const DailyCollectionsView: React.FC = () => {
  const {
    todayInstallments,
    setSelectedClientIdForDossier,
    database,
  } = useApp();
  const { hasPermission, currentUser, isAdmin } = useAuth();
  const settings = database.settings;

  const today = getElSalvadorDate();
  const canPay = hasPermission('canRegisterPayments');

  // Filter state
  const [collectorFilter, setCollectorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Payment modal state
  const [activePaymentTarget, setActivePaymentTarget] = useState<{
    installment: Installment;
    client: Client;
    credit: Credit;
    mode: 'full' | 'partial';
  } | null>(null);

  // Filter items
  const filteredInstallments = useMemo(() => {
    return todayInstallments.filter(({ installment, client, credit }) => {
      // Collector filter
      if (collectorFilter !== 'all' && credit.assignedCollectorId !== collectorFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && installment.status !== 'pending') return false;
        if (statusFilter === 'partial' && installment.status !== 'partial') return false;
        if (statusFilter === 'paid' && installment.status !== 'paid') return false;
        if (statusFilter === 'overdue' && installment.status !== 'overdue') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          client.fullName.toLowerCase().includes(q) ||
          client.phone.includes(q) ||
          credit.creditNumber.toLowerCase().includes(q) ||
          client.address.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [todayInstallments, collectorFilter, statusFilter, searchQuery]);

  // Totals for today
  const totals = useMemo(() => {
    const totalScheduled = todayInstallments.reduce((acc, i) => acc + i.installment.scheduledAmount, 0);
    const totalCollected = todayInstallments.reduce((acc, i) => acc + i.installment.paidAmount, 0);
    const totalPending = todayInstallments.reduce((acc, i) => acc + i.installment.balance, 0);
    const paidCount = todayInstallments.filter(i => i.installment.status === 'paid').length;

    return {
      totalScheduled,
      totalCollected,
      totalPending,
      paidCount,
      totalCount: todayInstallments.length,
    };
  }, [todayInstallments]);

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-500" />
            <span>Cobros del Día</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Ruta diaria de cobranza para la fecha: <strong className="text-blue-300">{formatDateDisplay(today)}</strong> (Hora El Salvador)
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-300">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>Avance de hoy: <strong className="text-white">{totals.paidCount} de {totals.totalCount}</strong> cuotas</span>
        </div>
      </div>

      {/* Summary Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Total Programado Hoy</span>
            <div className="text-lg font-black text-white mt-0.5">
              {formatCurrency(totals.totalScheduled, settings.currencySymbol)}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Cobrado Hoy</span>
            <div className="text-lg font-black text-emerald-400 mt-0.5">
              {formatCurrency(totals.totalCollected, settings.currencySymbol)}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Pendiente de Cobro Hoy</span>
            <div className="text-lg font-black text-amber-400 mt-0.5">
              {formatCurrency(totals.totalPending, settings.currencySymbol)}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3 text-xs">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, teléfono o dirección..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Collector filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <label className="text-slate-400 whitespace-nowrap">Cobrador:</label>
            <select
              value={collectorFilter}
              onChange={e => setCollectorFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500 w-full md:w-auto"
            >
              <option value="all">Todos los cobradores</option>
              {database.users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status buttons */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Por pagar' },
              { id: 'partial', label: 'Abono parcial' },
              { id: 'paid', label: 'Pagado' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition ${
                  statusFilter === s.id
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-900 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Today's List */}
      <div className="space-y-3">
        {filteredInstallments.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-12 text-center text-slate-400 space-y-2">
            <CalendarDays className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">
              No hay cobros pendientes para hoy con los filtros seleccionados
            </p>
            <p className="text-xs text-slate-500">
              Las cuotas programadas para hoy se actualizan automáticamente según la zona horaria de El Salvador.
            </p>
          </div>
        ) : (
          filteredInstallments.map(({ installment, client, credit }) => (
            <div
              key={installment.id}
              className={`bg-slate-800/80 border rounded-2xl p-4 transition shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                installment.status === 'paid'
                  ? 'border-emerald-800/60 bg-emerald-950/15'
                  : installment.status === 'partial'
                  ? 'border-amber-700/60 bg-amber-950/15'
                  : 'border-slate-700 hover:border-blue-600/60'
              }`}
            >
              {/* Left: Client info & credit */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-white text-sm hover:text-blue-400 cursor-pointer" onClick={() => setSelectedClientIdForDossier(client.id)}>
                    {client.fullName}
                  </span>
                  <span className="font-mono text-xs text-blue-300 bg-blue-950/80 border border-blue-900 px-2 py-0.2 rounded font-semibold">
                    {credit.creditNumber} • Cuota #{installment.installmentNumber}
                  </span>

                  {/* Status Badge */}
                  {installment.status === 'paid' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Pagado
                    </span>
                  )}
                  {installment.status === 'partial' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" /> Abono Parcial
                    </span>
                  )}
                  {installment.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-300 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-full">
                      Por pagar
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                  <div className="flex items-center gap-1.5 text-blue-300 font-medium">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <a href={`tel:${client.phone}`} className="hover:underline">
                      {client.phone}
                    </a>
                  </div>
                  <div className="text-slate-400 truncate max-w-sm">
                    {client.address || 'Sin dirección'}
                  </div>
                  <div className="text-slate-400">
                    Cobrador: <strong className="text-slate-200">{credit.assignedCollectorName}</strong>
                  </div>
                </div>
              </div>

              {/* Middle: Financial amounts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-750 text-center text-xs shrink-0 w-full md:w-auto">
                <div>
                  <span className="text-[10px] text-slate-400 block">Cuota Programada</span>
                  <span className="font-bold text-white">
                    {formatCurrency(installment.scheduledAmount, settings.currencySymbol)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Abonado</span>
                  <span className="font-bold text-emerald-400">
                    {formatCurrency(installment.paidAmount, settings.currencySymbol)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Saldo Cuota</span>
                  <span className={`font-black ${installment.balance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {formatCurrency(installment.balance, settings.currencySymbol)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Saldo Total Crédito</span>
                  <span className="font-black text-rose-300">
                    {formatCurrency(credit.balancePending, settings.currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                {canPay && installment.balance > 0.001 && (
                  <>
                    <button
                      onClick={() =>
                        setActivePaymentTarget({
                          installment,
                          client,
                          credit,
                          mode: 'full',
                        })
                      }
                      className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition shadow-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Pagar (${installment.balance.toFixed(2)})</span>
                    </button>

                    <button
                      onClick={() =>
                        setActivePaymentTarget({
                          installment,
                          client,
                          credit,
                          mode: 'partial',
                        })
                      }
                      className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Abono</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setSelectedClientIdForDossier(client.id)}
                  className="p-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs transition"
                  title="Ver expediente del cliente"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {client.phone && (
                  <a
                    href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text=Estimado(a)%20${encodeURIComponent(client.fullName)},%20le%20saludamos%20de%20FINANCIERA%20AARON%20para%20coordinar%20el%20cobro%20de%20su%20cuota%20de%20hoy.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-400 rounded-xl text-xs transition"
                    title="Enviar WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Record Modal */}
      {activePaymentTarget && (
        <PaymentRecordModal
          installment={activePaymentTarget.installment}
          client={activePaymentTarget.client}
          credit={activePaymentTarget.credit}
          mode={activePaymentTarget.mode}
          onClose={() => setActivePaymentTarget(null)}
        />
      )}
    </div>
  );
};
