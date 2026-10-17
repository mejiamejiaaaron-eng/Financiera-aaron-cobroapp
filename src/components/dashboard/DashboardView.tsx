import React from 'react';
import {
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  AlertOctagon,
  RotateCcw,
  CheckCircle,
  CalendarCheck,
  ArrowUpRight,
  UserPlus,
  Receipt,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/financialCalculations';
import { formatDateDisplay } from '../../utils/dateUtils';

export const DashboardView: React.FC = () => {
  const {
    metrics,
    recentPayments,
    setCurrentView,
    setIsAddCreditModalOpen,
    setActiveReceiptModalPayment,
    database,
  } = useApp();
  const { hasPermission } = useAuth();
  const settings = database.settings;

  const canAddCredit = hasPermission('canAddClientsAndCredits');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-5 md:p-6 text-white shadow-xl border border-blue-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Sistema Financiero en Línea</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight">
            {settings.businessName}
          </h1>
          <p className="text-xs md:text-sm text-blue-100/80 mt-1 max-w-xl">
            Control de cobros diarios, microcréditos, cartera en mora y arqueo de cobradores en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {canAddCredit && (
            <button
              onClick={() => setIsAddCreditModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-blue-500/30"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Crédito</span>
            </button>
          )}

          <button
            onClick={() => setCurrentView('daily-collections')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900/80 hover:bg-slate-900 text-blue-200 border border-blue-400/30 font-semibold px-4 py-2.5 rounded-xl text-xs transition"
          >
            <CalendarCheck className="w-4 h-4 text-blue-400" />
            <span>Cobros de Hoy</span>
          </button>
        </div>
      </div>

      {/* Main Financial KPI Grid (Prompt Section 3) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Dinero Prestado */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-md hover:border-blue-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Prestado</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-black text-white">
            {formatCurrency(metrics.totalMoneyLent, settings.currencySymbol)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            En {metrics.totalActiveCredits + metrics.liquidatedCreditsCount} créditos registrados
          </div>
        </div>

        {/* Total Dinero Cobrado */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-md hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Cobrado</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-black text-emerald-400">
            {formatCurrency(metrics.totalMoneyCollected, settings.currencySymbol)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-400/80">
            Efectivamente recaudado
          </div>
        </div>

        {/* Saldo Total Pendiente */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-md hover:border-amber-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Saldo Pendiente</span>
            <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-black text-amber-400">
            {formatCurrency(metrics.totalBalancePending, settings.currencySymbol)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Cartera activa por recuperar
          </div>
        </div>

        {/* Total Cobrado Hoy */}
        <div className="bg-gradient-to-br from-blue-900/60 to-indigo-950/60 border border-blue-500/50 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-200">Cobrado Hoy</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold shadow">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-black text-white">
            {formatCurrency(metrics.totalCollectedToday, settings.currencySymbol)}
          </div>
          <div className="mt-1 text-[11px] text-blue-300">
            Recaudación de la fecha
          </div>
        </div>
      </div>

      {/* Secondary Operational Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Clientes */}
        <button
          onClick={() => setCurrentView('clients')}
          className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 rounded-xl p-3 text-left transition"
        >
          <div className="flex items-center justify-between text-slate-400">
            <Users className="w-4 h-4 text-blue-400" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-lg font-bold text-white">{metrics.totalClients}</div>
          <div className="text-[10px] text-slate-400">Clientes activos</div>
        </button>

        {/* Créditos Activos */}
        <button
          onClick={() => setCurrentView('clients')}
          className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 rounded-xl p-3 text-left transition"
        >
          <div className="flex items-center justify-between text-slate-400">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-lg font-bold text-white">{metrics.totalActiveCredits}</div>
          <div className="text-[10px] text-slate-400">Créditos vigentes</div>
        </button>

        {/* Clientes a cobrar hoy */}
        <button
          onClick={() => setCurrentView('daily-collections')}
          className="bg-slate-800/60 hover:bg-slate-800 border border-blue-700/50 rounded-xl p-3 text-left transition"
        >
          <div className="flex items-center justify-between text-blue-400">
            <CalendarCheck className="w-4 h-4 text-sky-400" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-lg font-bold text-sky-300">{metrics.clientsDueTodayCount}</div>
          <div className="text-[10px] text-slate-400">Deben pagar hoy</div>
        </button>

        {/* Clientes en mora */}
        <button
          onClick={() => setCurrentView('overdue')}
          className="bg-slate-800/60 hover:bg-slate-800 border border-rose-800/50 rounded-xl p-3 text-left transition"
        >
          <div className="flex items-center justify-between text-rose-400">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-lg font-bold text-rose-400">{metrics.clientsInOverdueCount}</div>
          <div className="text-[10px] text-slate-400">Clientes en mora</div>
        </button>

        {/* Solicitudes de reversión */}
        <button
          onClick={() => setCurrentView('reversions')}
          className="bg-slate-800/60 hover:bg-slate-800 border border-amber-800/50 rounded-xl p-3 text-left transition"
        >
          <div className="flex items-center justify-between text-amber-400">
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-lg font-bold text-amber-400">{metrics.pendingReversionsCount}</div>
          <div className="text-[10px] text-slate-400">Reversiones pendientes</div>
        </button>

        {/* Créditos Liquidados */}
        <button
          onClick={() => setCurrentView('clients')}
          className="bg-slate-800/60 hover:bg-slate-800 border border-emerald-800/50 rounded-xl p-3 text-left transition"
        >
          <div className="flex items-center justify-between text-emerald-400">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-lg font-bold text-emerald-300">{metrics.liquidatedCreditsCount}</div>
          <div className="text-[10px] text-slate-400">Créditos liquidados</div>
        </button>
      </div>

      {/* Recent Payments Section (Prompt Section 3) */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-white text-base">Últimos Pagos Registrados</h2>
          </div>
          <button
            onClick={() => setCurrentView('payments')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition"
          >
            <span>Ver todos los pagos</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No hay pagos registrados aún en el sistema.
          </div>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700/60 pb-2">
                  <th className="py-2.5 px-3 font-semibold">Recibo</th>
                  <th className="py-2.5 px-3 font-semibold">Cliente</th>
                  <th className="py-2.5 px-3 font-semibold">Cuota</th>
                  <th className="py-2.5 px-3 font-semibold">Importe</th>
                  <th className="py-2.5 px-3 font-semibold">Fecha / Hora</th>
                  <th className="py-2.5 px-3 font-semibold">Cobrador</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {recentPayments.map(p => (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-700/30 transition ${
                      p.isReversed ? 'opacity-50 line-through' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-medium text-blue-300">
                      {p.receiptNumber}
                      {p.isReversed && (
                        <span className="ml-1.5 inline-block text-[9px] uppercase px-1.5 py-0.2 bg-rose-900/80 text-rose-300 rounded no-underline">
                          Revertido
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium text-white max-w-[180px] truncate">
                      {p.clientName}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      Cuota #{p.installmentNumber}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      {formatCurrency(p.receivedAmount, settings.currencySymbol)}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {formatDateDisplay(p.date)} {p.time}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {p.collectorName}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setActiveReceiptModalPayment(p)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800/60 px-2 py-1 rounded-lg transition"
                        title="Ver ticket de comprobante"
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
  );
};
