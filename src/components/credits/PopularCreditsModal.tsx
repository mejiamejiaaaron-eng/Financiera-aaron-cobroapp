import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Table as TableIcon,
  CheckCircle2,
  Copy,
  Check,
  Calculator,
  ArrowRight,
  Sparkles,
  DollarSign,
  Calendar,
  Percent,
} from 'lucide-react';
import {
  POPULAR_CREDIT_ROWS,
  POPULAR_CREDIT_WEEKS,
  PopularCreditPlan,
  getPopularCreditPlan,
  POPULAR_CREDITS_BY_QUOTA,
} from '../../data/popularCreditsData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (plan: PopularCreditPlan) => void;
}

export const PopularCreditsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectPlan,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PopularCreditPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'calculator'>('table');
  const [copiedJson, setCopiedJson] = useState(false);

  // Calculator tab state
  const [calcMonto, setCalcMonto] = useState<number>(500);
  const [calcSemanas, setCalcSemanas] = useState<number>(12);

  const currentCalcPlan = useMemo(() => {
    return getPopularCreditPlan(calcMonto, calcSemanas);
  }, [calcMonto, calcSemanas]);

  // Filtered rows for the table view
  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return POPULAR_CREDIT_ROWS;

    return POPULAR_CREDIT_ROWS.filter(row => {
      // Check monto
      if (String(row.monto).includes(term)) return true;
      // Check cuotas
      for (const sem of POPULAR_CREDIT_WEEKS) {
        const c = row.cuotas[sem];
        if (c && String(c).includes(term)) return true;
      }
      return false;
    });
  }, [searchTerm]);

  const handleCellClick = (monto: number, semanas: number) => {
    const plan = getPopularCreditPlan(monto, semanas);
    if (plan) {
      setSelectedPlan(plan);
    }
  };

  const handleApply = () => {
    if (selectedPlan && onSelectPlan) {
      onSelectPlan(selectedPlan);
      onClose();
    }
  };

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(POPULAR_CREDITS_BY_QUOTA, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-blue-600/60 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 px-5 py-3.5 border-b border-blue-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/40">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Tabla de Cuotas para Créditos Populares</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-mono">
                  Oficial 2026
                </span>
              </h3>
              <p className="text-xs text-blue-300">
                27 montos ($300 a $4,000) • 8 plazos (4 a 24 semanas) • Tasas del 65% al 36%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyJson}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 transition text-slate-300 hover:text-white"
              title="Copiar toda la tabla como objeto JSON"
            >
              {copiedJson ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">JSON Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar JSON</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              title="Cerrar tabla"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Tabs */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'table'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabla Completa</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'calculator'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Simulador / Selector</span>
            </button>
          </div>

          {activeTab === 'table' && (
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar monto (ej. 500) o cuota (ej. 51.50)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {activeTab === 'table' ? (
            <div className="space-y-3">
              {/* Instructions banner */}
              <div className="p-2.5 bg-blue-950/40 border border-blue-800/60 rounded-xl text-xs text-blue-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Pulsa sobre cualquier <strong>cuota</strong> en la tabla para seleccionarla y aplicarla al crédito automáticamente.
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 hidden md:inline">
                  {filteredRows.length} montos mostrados
                </span>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-950 shadow-inner">
                <table className="w-full text-center border-collapse text-xs font-mono">
                  {/* Top Header Grouping */}
                  <thead>
                    <tr className="bg-slate-900 text-slate-200 border-b border-slate-700">
                      <th
                        rowSpan={2}
                        className="py-2.5 px-3 border-r border-slate-700 text-slate-400 font-bold bg-slate-900/90 text-left sticky left-0 z-10"
                      >
                        TASAS
                      </th>
                      <th
                        rowSpan={2}
                        className="py-2.5 px-3 border-r border-slate-700 text-white font-extrabold bg-slate-800 text-right sticky left-16 z-10"
                      >
                        MONTO ($)
                      </th>
                      <th
                        colSpan={4}
                        className="py-1.5 px-2 border-r border-slate-700 bg-indigo-950/80 text-sky-200 font-extrabold tracking-wide"
                      >
                        PLAZO HASTA 10 SEMANAS
                      </th>
                      <th
                        colSpan={4}
                        className="py-1.5 px-2 border-r border-slate-700 bg-emerald-950/80 text-emerald-200 font-extrabold tracking-wide"
                      >
                        12 SEMANAS EN ADELANTE
                      </th>
                      <th
                        rowSpan={2}
                        className="py-2.5 px-3 text-slate-400 font-bold bg-slate-900/90"
                      >
                        TASA
                      </th>
                    </tr>
                    <tr className="bg-slate-900/80 text-slate-300 border-b border-slate-700 text-[11px]">
                      {POPULAR_CREDIT_WEEKS.map((sem, idx) => (
                        <th
                          key={sem}
                          className={`py-1.5 px-2 font-bold ${
                            idx === 3
                              ? 'border-r-2 border-slate-600 bg-indigo-950/50'
                              : idx < 4
                              ? 'border-r border-slate-800 bg-indigo-950/30'
                              : idx === 7
                              ? 'border-r border-slate-700 bg-emerald-950/50'
                              : 'border-r border-slate-800 bg-emerald-950/30'
                          }`}
                        >
                          {sem} SEM.
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredRows.map(row => {
                      // Determine band coloring
                      const isBand65 = row.monto <= 1000;
                      const isBand45 = row.monto >= 1200 && row.monto <= 2000;
                      const isBand36 = row.monto >= 2300;

                      const tasaLeftBadge = isBand65
                        ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60'
                        : isBand45
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                        : 'bg-slate-800 text-slate-300 border border-slate-700';

                      const tasaRightBadge = isBand65
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                        : isBand45
                        ? 'bg-yellow-950/60 text-yellow-300 border border-yellow-800/60'
                        : 'bg-slate-800 text-slate-300 border border-slate-700';

                      return (
                        <tr
                          key={row.monto}
                          className="hover:bg-slate-800/40 transition group"
                        >
                          {/* Tasa Izquierda */}
                          <td className="py-1 px-2 border-r border-slate-800 sticky left-0 z-10 bg-slate-950 group-hover:bg-slate-900">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tasaLeftBadge}`}>
                              {row.tasaHasta10}
                            </span>
                          </td>

                          {/* Monto */}
                          <td className="py-1 px-2 border-r border-slate-700 font-extrabold text-white text-right sticky left-16 z-10 bg-slate-950 group-hover:bg-slate-900">
                            ${row.monto}
                          </td>

                          {/* Cuotas 4, 6, 8, 10, 12, 16, 20, 24 */}
                          {POPULAR_CREDIT_WEEKS.map((sem, idx) => {
                            const cuota = row.cuotas[sem];
                            const isSelected =
                              selectedPlan?.monto === row.monto &&
                              selectedPlan?.plazo_semanas === sem;

                            return (
                              <td
                                key={sem}
                                onClick={() => handleCellClick(row.monto, sem)}
                                className={`py-1 px-1 cursor-pointer transition select-none ${
                                  idx === 3
                                    ? 'border-r-2 border-slate-700'
                                    : 'border-r border-slate-800/60'
                                } ${
                                  isSelected
                                    ? 'bg-emerald-500 text-slate-950 font-black scale-105 rounded-sm shadow-md'
                                    : idx < 4
                                    ? 'text-sky-100 hover:bg-blue-600/30 hover:text-white'
                                    : 'text-emerald-100 hover:bg-emerald-600/30 hover:text-white'
                                }`}
                                title={`Monto: $${row.monto} | ${sem} semanas | Cuota: $${cuota?.toFixed(2)}`}
                              >
                                {cuota !== undefined ? cuota.toFixed(2) : '-'}
                              </td>
                            );
                          })}

                          {/* Tasa Derecha */}
                          <td className="py-1 px-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tasaRightBadge}`}>
                              {row.tasa12Mas}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Simulator / Calculator Tab */
            <div className="space-y-4 max-w-2xl mx-auto py-2">
              <div className="p-4 bg-slate-950 rounded-2xl border border-blue-800/70 space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-400" />
                  <span>Simulador de Crédito Popular</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Monto a Prestar ($)
                    </label>
                    <select
                      value={calcMonto}
                      onChange={e => setCalcMonto(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-hidden focus:border-blue-500"
                    >
                      {POPULAR_CREDIT_ROWS.map(r => (
                        <option key={r.monto} value={r.monto}>
                          ${r.monto}.00 (Tasa {r.tasaHasta10} / {r.tasa12Mas})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Plazo en Semanas
                    </label>
                    <select
                      value={calcSemanas}
                      onChange={e => setCalcSemanas(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-hidden focus:border-blue-500"
                    >
                      {POPULAR_CREDIT_WEEKS.map(w => (
                        <option key={w} value={w}>
                          {w} Semanas {w <= 10 ? '(Hasta 10 semanas)' : '(12 en adelante)'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {currentCalcPlan && (
                  <div className="p-4 bg-gradient-to-r from-blue-950/80 via-indigo-950/60 to-slate-900 rounded-xl border border-blue-600/80 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-medium block">Monto Solicitado</span>
                        <span className="text-sm font-bold text-white">
                          ${currentCalcPlan.monto.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-medium block">Interés Total</span>
                        <span className="text-sm font-bold text-amber-400">
                          ${currentCalcPlan.interes.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-2.5 bg-emerald-950/70 rounded-xl border border-emerald-600">
                        <span className="text-[10px] text-emerald-300 font-bold block">
                          Cuota Semanal
                        </span>
                        <span className="text-base font-black text-emerald-300">
                          ${currentCalcPlan.cuota.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-medium block">Tasa Aplicada</span>
                        <span className="text-sm font-bold text-blue-300">
                          {currentCalcPlan.tasa}
                        </span>
                      </div>
                    </div>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlan(currentCalcPlan);
                          if (onSelectPlan) {
                            onSelectPlan(currentCalcPlan);
                            onClose();
                          }
                        }}
                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition text-xs inline-flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Usar este Plan para Nuevo Crédito</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected Plan Bar / Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {selectedPlan ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="text-white font-bold block">
                  Plan Seleccionado: Monto ${selectedPlan.monto} • {selectedPlan.plazo_semanas} Semanas
                </span>
                <span className="text-emerald-400 font-semibold text-[11px]">
                  Cuota: ${selectedPlan.cuota.toFixed(2)} / semana • Interés: ${selectedPlan.interes.toFixed(2)} • Tasa: {selectedPlan.tasa}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-xs">
              💡 Haz clic en cualquier cuota de la tabla para seleccionarla.
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition"
            >
              Cerrar
            </button>

            {onSelectPlan && selectedPlan && (
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Aplicar a Crédito</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
