import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Users,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/financialCalculations';
import { formatDateDisplay, getElSalvadorDate } from '../../utils/dateUtils';
import { PaymentModality } from '../../types';

export const ReportsView: React.FC = () => {
  const { database } = useApp();
  const settings = database.settings;
  const today = getElSalvadorDate();

  // Filters
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState(today);
  const [collectorFilter, setCollectorFilter] = useState('all');
  const [modalityFilter, setModalityFilter] = useState<string>('all');

  // Filtered Payments within date range & collector
  const filteredPayments = useMemo(() => {
    return database.payments.filter(p => {
      if (p.date < startDate || p.date > endDate) return false;
      if (collectorFilter !== 'all' && p.collectorId !== collectorFilter) return false;
      return true;
    });
  }, [database.payments, startDate, endDate, collectorFilter]);

  // Calculations: real received vs reversed
  const reportStats = useMemo(() => {
    const validPayments = filteredPayments.filter(p => !p.isReversed);
    const reversedPayments = filteredPayments.filter(p => p.isReversed);

    const grossCollected = filteredPayments.reduce((acc, p) => acc + p.receivedAmount, 0);
    const netCollected = validPayments.reduce((acc, p) => acc + p.receivedAmount, 0);
    const totalReversed = reversedPayments.reduce((acc, p) => acc + p.receivedAmount, 0);

    // Filter credits
    const filteredCredits = database.credits.filter(c => {
      if (collectorFilter !== 'all' && c.assignedCollectorId !== collectorFilter) return false;
      if (modalityFilter !== 'all' && c.modality !== modalityFilter) return false;
      return true;
    });

    const totalPrincipal = filteredCredits.reduce((acc, c) => acc + c.principal, 0);
    const totalInterest = filteredCredits.reduce((acc, c) => acc + c.totalInterest, 0);
    const totalBalancePending = filteredCredits.reduce((acc, c) => acc + c.balancePending, 0);

    const activeCount = filteredCredits.filter(c => c.status === 'active' || c.status === 'overdue').length;
    const liquidatedCount = filteredCredits.filter(c => c.status === 'liquidated').length;

    // Breakdown by collector
    const collectorMap = new Map<string, { name: string; totalCollected: number; count: number }>();
    validPayments.forEach(p => {
      const existing = collectorMap.get(p.collectorId) || { name: p.collectorName, totalCollected: 0, count: 0 };
      existing.totalCollected += p.receivedAmount;
      existing.count += 1;
      collectorMap.set(p.collectorId, existing);
    });

    return {
      grossCollected,
      netCollected,
      totalReversed,
      reversedCount: reversedPayments.length,
      validCount: validPayments.length,
      totalPrincipal,
      totalInterest,
      totalBalancePending,
      activeCount,
      liquidatedCount,
      collectorBreakdown: Array.from(collectorMap.values()),
    };
  }, [filteredPayments, database.credits, collectorFilter, modalityFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Recibo',
      'Fecha',
      'Hora',
      'Cliente',
      'Cuota',
      'Importe',
      'Metodo',
      'Cobrador',
      'Estado',
    ];

    const rows = filteredPayments.map(p => [
      p.receiptNumber,
      p.date,
      p.time,
      `"${p.clientName.replace(/"/g, '""')}"`,
      p.installmentNumber,
      p.receivedAmount.toFixed(2),
      p.paymentMethod,
      `"${p.collectorName.replace(/"/g, '""')}"`,
      p.isReversed ? 'REVERTIDO' : 'VALIDO',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_financiero_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <span>Reportes Financieros</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas de recaudación real, cartera de créditos y desglose por cobrador
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-md shadow-emerald-600/30"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Reporte a CSV</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-slate-400 font-semibold mb-1">Fecha Inicial:</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Fecha Final:</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Filtrar Cobrador:</label>
          <select
            value={collectorFilter}
            onChange={e => setCollectorFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
          >
            <option value="all">Todos los cobradores</option>
            {database.users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Modalidad de Pago:</label>
          <select
            value={modalityFilter}
            onChange={e => setModalityFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
          >
            <option value="all">Todas las modalidades</option>
            <option value="diario">Diario</option>
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
          </select>
        </div>
      </div>

      {/* Main KPI Strip with Net vs Reversed Accounting */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dinero Efectivamente Recibido */}
        <div className="bg-slate-800/80 border border-emerald-700/60 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Dinero Efectivo Recibido</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">
            {formatCurrency(reportStats.netCollected, settings.currencySymbol)}
          </div>
          <p className="text-[11px] text-emerald-300/80 mt-1">
            {reportStats.validCount} pagos válidos (deduciendo reversiones)
          </p>
        </div>

        {/* Pagos Revertidos */}
        <div className="bg-slate-800/80 border border-rose-800/60 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Pagos Revertidos</span>
            <RotateCcw className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-400">
            {formatCurrency(reportStats.totalReversed, settings.currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {reportStats.reversedCount} operaciones anuladas por solicitud
          </p>
        </div>

        {/* Capital Prestado Cartera */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Capital Total Prestado</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {formatCurrency(reportStats.totalPrincipal, settings.currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Interés calculado: {formatCurrency(reportStats.totalInterest, settings.currencySymbol)}
          </p>
        </div>

        {/* Saldo Pendiente Actual */}
        <div className="bg-slate-800/80 border border-amber-700/60 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Saldo Pendiente de Cobro</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-400">
            {formatCurrency(reportStats.totalBalancePending, settings.currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {reportStats.activeCount} créditos vigentes / {reportStats.liquidatedCount} liquidados
          </p>
        </div>
      </div>

      {/* Recaudación por Cobrador */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <span>Rendimiento y Recaudación por Cobrador</span>
        </h2>

        {reportStats.collectorBreakdown.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No hay recaudación registrada para el rango de fechas seleccionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reportStats.collectorBreakdown.map((c, i) => (
              <div key={i} className="bg-slate-900/70 border border-slate-750 rounded-xl p-4 text-xs">
                <span className="text-xs font-bold text-white block truncate">{c.name}</span>
                <div className="mt-2 text-lg font-black text-emerald-400">
                  {formatCurrency(c.totalCollected, settings.currencySymbol)}
                </div>
                <div className="mt-1 text-slate-400 text-[11px]">
                  {c.count} cobros registrados con éxito
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
