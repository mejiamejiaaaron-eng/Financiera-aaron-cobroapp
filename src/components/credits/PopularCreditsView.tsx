import React, { useState, useMemo } from 'react';
import {
  Table as TableIcon,
  Search,
  Calculator,
  PlusCircle,
  Copy,
  Check,
  Sparkles,
  DollarSign,
  TrendingUp,
  Download,
} from 'lucide-react';
import {
  POPULAR_CREDIT_ROWS,
  POPULAR_CREDIT_WEEKS,
  PopularCreditPlan,
  getPopularCreditPlan,
  POPULAR_CREDITS_BY_QUOTA,
} from '../../data/popularCreditsData';
import { useApp } from '../../context/AppContext';

export const PopularCreditsView: React.FC = () => {
  const { setIsAddCreditModalOpen } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PopularCreditPlan | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Quick calculator
  const [calcMonto, setCalcMonto] = useState<number>(500);
  const [calcSemanas, setCalcSemanas] = useState<number>(12);

  const currentCalcPlan = useMemo(() => {
    return getPopularCreditPlan(calcMonto, calcSemanas);
  }, [calcMonto, calcSemanas]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return POPULAR_CREDIT_ROWS;

    return POPULAR_CREDIT_ROWS.filter(row => {
      if (String(row.monto).includes(term)) return true;
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

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(POPULAR_CREDITS_BY_QUOTA, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    });
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(POPULAR_CREDITS_BY_QUOTA, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tabla_creditos_populares.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 border border-blue-800/80 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/40">
            <TableIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">
                Tabla de Cuotas para Créditos Populares
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-mono font-bold">
                Oficial 2026
              </span>
            </div>
            <p className="text-xs text-blue-200 mt-0.5">
              Tabulador oficial con 27 montos ($300 - $4,000) y 8 plazos semanales (4 a 24 semanas)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyJson}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl border border-slate-700 transition text-slate-200"
            title="Copiar objeto JSON para Python o sistemas"
          >
            {copiedJson ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">JSON Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copiar JSON</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl border border-slate-700 transition text-slate-200"
            title="Descargar archivo tabla_creditos_populares.json"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Descargar JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddCreditModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuevo Crédito</span>
          </button>
        </div>
      </div>

      {/* Simulator / Calculator Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>Simulador Rápido de Cuotas</span>
          </h3>
          <span className="text-xs text-slate-400">
            Selecciona un monto y plazo para ver el cálculo instantáneo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Monto a Prestar</label>
            <select
              value={calcMonto}
              onChange={e => setCalcMonto(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-hidden focus:border-blue-500"
            >
              {POPULAR_CREDIT_ROWS.map(r => (
                <option key={r.monto} value={r.monto}>
                  ${r.monto}.00 (Tasa {r.tasaHasta10} / {r.tasa12Mas})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Plazo en Semanas</label>
            <select
              value={calcSemanas}
              onChange={e => setCalcSemanas(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-hidden focus:border-blue-500"
            >
              {POPULAR_CREDIT_WEEKS.map(w => (
                <option key={w} value={w}>
                  {w} Semanas {w <= 10 ? '(Hasta 10 sem)' : '(12 sem en adelante)'}
                </option>
              ))}
            </select>
          </div>

          {currentCalcPlan && (
            <>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Cuota Semanal</span>
                  <span className="text-base font-black text-emerald-400">
                    ${currentCalcPlan.cuota.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Interés Total</span>
                  <span className="text-xs font-bold text-amber-400">
                    ${currentCalcPlan.interes.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setIsAddCreditModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 text-xs transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Crear Crédito con este Plan</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Table Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-blue-400" />
              <span>Matriz Completa de Créditos Populares</span>
            </h3>
            <p className="text-xs text-slate-400">
              Haz clic en cualquier celda para ver el detalle y seleccionarla
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar monto (ej. 1000) o cuota (ej. 60.13)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Selected Plan Bar */}
        {selectedPlan && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-600/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">
                  Monto: ${selectedPlan.monto} • Plazo: {selectedPlan.plazo_semanas} Semanas • Cuota: ${selectedPlan.cuota.toFixed(2)}/semana
                </span>
                <span className="text-emerald-300 text-[11px]">
                  Total a pagar: ${(selectedPlan.cuota * selectedPlan.plazo_semanas).toFixed(2)} • Interés: ${selectedPlan.interes.toFixed(2)} • Tasa: {selectedPlan.tasa}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddCreditModalOpen(true)}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition active:scale-95"
            >
              Usar para Nuevo Crédito
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-950 shadow-inner">
          <table className="w-full text-center border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-slate-900 text-slate-200 border-b border-slate-700">
                <th
                  rowSpan={2}
                  className="py-2.5 px-3 border-r border-slate-700 text-slate-400 font-bold bg-slate-900 text-left sticky left-0 z-10"
                >
                  TASAS
                </th>
                <th
                  rowSpan={2}
                  className="py-2.5 px-3 border-r border-slate-700 text-white font-extrabold bg-slate-800 text-right sticky left-16 z-10"
                >
                  MONTO
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
                  className="py-2.5 px-3 text-slate-400 font-bold bg-slate-900"
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
                const isBand65 = row.monto <= 1000;
                const isBand45 = row.monto >= 1200 && row.monto <= 2000;

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
                  <tr key={row.monto} className="hover:bg-slate-800/40 transition group">
                    <td className="py-1 px-2 border-r border-slate-800 sticky left-0 z-10 bg-slate-950 group-hover:bg-slate-900">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tasaLeftBadge}`}>
                        {row.tasaHasta10}
                      </span>
                    </td>

                    <td className="py-1 px-2 border-r border-slate-700 font-extrabold text-white text-right sticky left-16 z-10 bg-slate-950 group-hover:bg-slate-900">
                      ${row.monto}
                    </td>

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
    </div>
  );
};
