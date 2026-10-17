import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  FileText,
  RotateCcw,
  Calendar,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/financialCalculations';
import { formatDateDisplay } from '../../utils/dateUtils';
import { Payment } from '../../types';

export const CollectorHistoryView: React.FC = () => {
  const {
    database,
    setActiveReceiptModalPayment,
    handleRequestReversion,
  } = useApp();
  const { currentUser } = useAuth();
  const settings = database.settings;

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Reversion modal
  const [reversionTarget, setReversionTarget] = useState<Payment | null>(null);
  const [reversionReason, setReversionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filter ONLY current collector's payments
  const myPayments = useMemo(() => {
    return database.payments.filter(p => p.collectorId === currentUser?.id);
  }, [database.payments, currentUser?.id]);

  const filtered = useMemo(() => {
    return myPayments.filter(p => {
      if (methodFilter !== 'all' && p.paymentMethod !== methodFilter) return false;
      if (dateFilter && p.date !== dateFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          p.clientName.toLowerCase().includes(q) ||
          p.receiptNumber.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [myPayments, methodFilter, dateFilter, searchQuery]);

  const totals = useMemo(() => {
    const valid = filtered.filter(p => !p.isReversed);
    const sum = valid.reduce((acc, p) => acc + p.receivedAmount, 0);
    return {
      sum,
      count: valid.length,
    };
  }, [filtered]);

  const handleSendReversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversionTarget) return;
    setErrorMessage('');

    try {
      setIsSubmitting(true);
      await handleRequestReversion(reversionTarget.id, reversionReason);
      setReversionTarget(null);
      setReversionReason('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al enviar solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-500" />
            <span>Mi Historial de Cobros</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro de cobros realizados por {currentUser?.name}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-xl text-xs text-emerald-300 font-bold">
          <TrendingUp className="w-4 h-4" />
          <span>Total: {formatCurrency(totals.sum, settings.currencySymbol)} ({totals.count} cobros)</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente o recibo..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div>
          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
          >
            <option value="all">Todos los métodos de pago</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Chivo Wallet / Bitcoin">Chivo Wallet / Bitcoin</option>
            <option value="Tigo Money">Tigo Money</option>
          </select>
        </div>

        <div>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-200">No hay cobros registrados</p>
            <p className="text-xs text-slate-500">
              Utilice el botón &quot;Cobrar&quot; del menú inferior para asentar sus cobros diarios.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                  <th className="py-3 px-4 font-semibold">Recibo</th>
                  <th className="py-3 px-4 font-semibold">Cliente</th>
                  <th className="py-3 px-4 font-semibold">Cuota</th>
                  <th className="py-3 px-4 font-semibold">Importe</th>
                  <th className="py-3 px-4 font-semibold">Fecha / Hora</th>
                  <th className="py-3 px-4 font-semibold">Método</th>
                  <th className="py-3 px-4 font-semibold text-right">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-750">
                {filtered.map(p => {
                  const hasPendingReversion = database.reversionRequests.some(
                    r => r.paymentId === p.id && r.status === 'pending'
                  );

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-750/50 transition ${
                        p.isReversed ? 'opacity-40 line-through' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-300">
                        {p.receiptNumber}
                        {p.isReversed && (
                          <span className="ml-1 text-[9px] uppercase bg-rose-950 text-rose-300 px-1.5 py-0.2 rounded no-underline">
                            Revertido
                          </span>
                        )}
                        {hasPendingReversion && (
                          <span className="ml-1 text-[9px] uppercase bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded no-underline">
                            En trámite
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-white">{p.clientName}</td>
                      <td className="py-3 px-4 text-slate-300">Cuota #{p.installmentNumber}</td>
                      <td className="py-3 px-4 font-bold text-emerald-400 text-sm">
                        {formatCurrency(p.receivedAmount, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {formatDateDisplay(p.date)} {p.time}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{p.paymentMethod}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveReceiptModalPayment(p)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-900/30 px-2 py-1 rounded-lg border border-blue-800/60"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Ticket</span>
                          </button>

                          {!p.isReversed && !hasPendingReversion && (
                            <button
                              onClick={() => {
                                setReversionTarget(p);
                                setReversionReason('');
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-800/60"
                              title="Solicitar reversión por error"
                            >
                              <RotateCcw className="w-3 h-3" />
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

      {/* Modal: Solicitar reversión */}
      {reversionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-amber-700 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100 text-xs space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <RotateCcw className="w-6 h-6" />
              <div>
                <h3 className="text-base font-bold text-white">Solicitar Corrección de Cobro</h3>
                <p className="text-[11px] text-amber-300">Recibo: {reversionTarget.receiptNumber}</p>
              </div>
            </div>

            <p className="text-slate-300 leading-relaxed">
              El cobro por <strong>{formatCurrency(reversionTarget.receivedAmount, settings.currencySymbol)}</strong> a nombre de <strong>{reversionTarget.clientName}</strong> se enviará para aprobación del Administrador.
            </p>

            <form onSubmit={handleSendReversion} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Motivo obligatorio de la solicitud:
                </label>
                <textarea
                  required
                  rows={3}
                  value={reversionReason}
                  onChange={e => setReversionReason(e.target.value)}
                  placeholder="Detalle el motivo de la corrección..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReversionTarget(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar al Administrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
