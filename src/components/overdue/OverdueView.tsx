import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  Phone,
  MessageCircle,
  Eye,
  CheckCircle,
  Receipt,
  Search,
  Filter,
  DollarSign,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/financialCalculations';
import { formatDateDisplay } from '../../utils/dateUtils';
import { Installment, Client, Credit } from '../../types';
import { PaymentRecordModal } from '../collections/PaymentRecordModal';

export const OverdueView: React.FC = () => {
  const {
    overdueInstallments,
    setSelectedClientIdForDossier,
    database,
  } = useApp();
  const { hasPermission } = useAuth();
  const settings = database.settings;

  const canPay = hasPermission('canRegisterPayments');
  const [searchQuery, setSearchQuery] = useState('');
  const [collectorFilter, setCollectorFilter] = useState('all');

  const [activePaymentTarget, setActivePaymentTarget] = useState<{
    installment: Installment;
    client: Client;
    credit: Credit;
    mode: 'full' | 'partial';
  } | null>(null);

  const filtered = useMemo(() => {
    return overdueInstallments.filter(({ installment, client, credit }) => {
      if (collectorFilter !== 'all' && credit.assignedCollectorId !== collectorFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          client.fullName.toLowerCase().includes(q) ||
          client.phone.includes(q) ||
          credit.creditNumber.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [overdueInstallments, collectorFilter, searchQuery]);

  // Overdue total summary
  const summary = useMemo(() => {
    const totalOverdueBalance = overdueInstallments.reduce((acc, i) => acc + i.installment.balance, 0);
    const affectedClientsCount = new Set(overdueInstallments.map(i => i.client.id)).size;
    const maxDaysOverdue = overdueInstallments.reduce(
      (max, i) => Math.max(max, i.installment.daysOverdue),
      0
    );

    return {
      totalOverdueBalance,
      affectedClientsCount,
      maxDaysOverdue,
    };
  }, [overdueInstallments]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <span>Clientes en Mora</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Seguimiento de cuotas vencidas y cálculo de días de atraso
          </p>
        </div>

        <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-800/80 px-3 py-1.5 rounded-xl text-xs text-rose-300 font-semibold">
          <Clock className="w-3.5 h-3.5 text-rose-400" />
          <span>{summary.affectedClientsCount} clientes con cuotas en mora</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-800/80 border border-rose-900/40 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Total Capital en Mora</span>
            <div className="text-lg font-black text-rose-400 mt-0.5">
              {formatCurrency(summary.totalOverdueBalance, settings.currencySymbol)}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center font-bold">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Cuotas Vencidas Totales</span>
            <div className="text-lg font-black text-white mt-0.5">
              {overdueInstallments.length} cuotas
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-700 text-slate-300 flex items-center justify-center font-bold">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Atraso Máximo Registrado</span>
            <div className="text-lg font-black text-amber-400 mt-0.5">
              {summary.maxDaysOverdue} días
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar en mora por cliente, teléfono o crédito..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-slate-400 whitespace-nowrap">Cobrador:</label>
          <select
            value={collectorFilter}
            onChange={e => setCollectorFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-rose-500 w-full sm:w-auto"
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

      {/* Overdue Table */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
            <p className="text-sm font-semibold text-slate-200">¡Excelente! No hay cuotas en mora</p>
            <p className="text-xs text-slate-500">
              Todos los clientes están al día con sus cuotas vencidas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                  <th className="py-3 px-4 font-semibold">Cliente</th>
                  <th className="py-3 px-4 font-semibold">Teléfono / Dirección</th>
                  <th className="py-3 px-4 font-semibold">Vencimiento</th>
                  <th className="py-3 px-4 font-semibold">Días Atraso</th>
                  <th className="py-3 px-4 font-semibold">Vencido</th>
                  <th className="py-3 px-4 font-semibold">Abonado</th>
                  <th className="py-3 px-4 font-semibold">Saldo Cuota</th>
                  <th className="py-3 px-4 font-semibold">Saldo Total Crédito</th>
                  <th className="py-3 px-4 font-semibold">Cobrador</th>
                  <th className="py-3 px-4 font-semibold text-right">Cobro Rápido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-750">
                {filtered.map(({ installment, client, credit }) => (
                  <tr key={installment.id} className="hover:bg-slate-750/50 transition">
                    <td className="py-3 px-4">
                      <div
                        className="font-bold text-white hover:text-blue-400 cursor-pointer text-sm"
                        onClick={() => setSelectedClientIdForDossier(client.id)}
                      >
                        {client.fullName}
                      </div>
                      <span className="font-mono text-[11px] text-blue-300">
                        {credit.creditNumber} • Cuota #{installment.installmentNumber}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      <div className="font-medium text-blue-300 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <a href={`tel:${client.phone}`} className="hover:underline">
                          {client.phone}
                        </a>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {client.address || 'Sin dirección'}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-200">
                      {formatDateDisplay(installment.dueDate)}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black text-rose-300 bg-rose-950/80 border border-rose-800 text-[11px]">
                        {installment.daysOverdue} días
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {formatCurrency(installment.scheduledAmount, settings.currencySymbol)}
                    </td>

                    <td className="py-3 px-4 font-semibold text-emerald-400">
                      {formatCurrency(installment.paidAmount, settings.currencySymbol)}
                    </td>

                    <td className="py-3 px-4 font-bold text-rose-400 text-sm">
                      {formatCurrency(installment.balance, settings.currencySymbol)}
                    </td>

                    <td className="py-3 px-4 font-bold text-rose-300">
                      {formatCurrency(credit.balancePending, settings.currencySymbol)}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {credit.assignedCollectorName}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canPay && (
                          <button
                            onClick={() =>
                              setActivePaymentTarget({
                                installment,
                                client,
                                credit,
                                mode: 'full',
                              })
                            }
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs transition"
                          >
                            Cobrar
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedClientIdForDossier(client.id)}
                          className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs transition"
                          title="Ver expediente"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {client.phone && (
                          <a
                            href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text=Estimado(a)%20${encodeURIComponent(client.fullName)},%20le%20escribimos%20de%20FINANCIERA%20AARON%20para%20recordarle%20su%20cuota%20con%20${installment.daysOverdue}%20d%C3%ADas%20de%20atraso%20por%20un%20monto%20de%20$${installment.balance.toFixed(2)}.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 rounded-lg text-xs transition"
                            title="Cobrar por WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
