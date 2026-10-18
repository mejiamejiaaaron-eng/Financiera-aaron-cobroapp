import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Calendar,
  DollarSign,
  Percent,
  Check,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Table as TableIcon,
  RefreshCw,
  Sun,
  Clock,
} from 'lucide-react';
import {
  POPULAR_CREDIT_ROWS,
  POPULAR_CREDIT_WEEKS,
  PopularCreditPlan,
  getPopularCreditPlan,
} from '../../data/popularCreditsData';
import { PaymentModality } from '../../types';
import { LoanCalculator, formatCurrency } from '../../utils/financialCalculations';

export interface AppliedCreditSettings {
  principal: number;
  modality: PaymentModality;
  totalInstallments: number;
  interestRate: number;
  cuotaSugerida?: number;
}

interface Props {
  onApply: (data: AppliedCreditSettings) => void;
  currencySymbol?: string;
  defaultPrincipal?: number;
}

export const FastCreditSimulator: React.FC<Props> = ({
  onApply,
  currencySymbol = '$',
  defaultPrincipal = 300,
}) => {
  const [activeTab, setActiveTab] = useState<'semanal' | 'diario' | 'mensual'>('semanal');
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // ==========================================
  // 1. SEMANAL (CRÉDITO POPULAR OFICIAL)
  // ==========================================
  const [semanalMonto, setSemanalMonto] = useState<number>(defaultPrincipal || 700);
  const [semanalSemanas, setSemanalSemanas] = useState<number>(10);
  const [semanalMode, setSemanalMode] = useState<'auto' | 'manual'>('auto');
  const [inputCuotaAuto, setInputCuotaAuto] = useState<string>('82.32');
  const [autoSearchError, setAutoSearchError] = useState<string | null>(null);
  const [autoSearchResult, setAutoSearchResult] = useState<PopularCreditPlan | null>(() => {
    return getPopularCreditPlan(700, 10);
  });

  const handleBuscarCreditoPorCuota = (customVal?: string) => {
    setAutoSearchError(null);
    const rawVal = customVal !== undefined ? customVal : inputCuotaAuto;
    const num = parseFloat(rawVal);
    if (isNaN(num) || num <= 0) {
      setAutoSearchError('Por favor ingrese un número de cuota válido mayor a 0.');
      setAutoSearchResult(null);
      return;
    }

    // Búsqueda inversa en la base de datos de créditos populares
    let foundPlan: PopularCreditPlan | null = null;
    for (const row of POPULAR_CREDIT_ROWS) {
      for (const w of POPULAR_CREDIT_WEEKS) {
        const c = row.cuotas[w];
        if (c !== undefined && Math.abs(c - num) < 0.02) {
          foundPlan = getPopularCreditPlan(row.monto, w);
          break;
        }
      }
      if (foundPlan) break;
    }

    if (foundPlan) {
      setAutoSearchResult(foundPlan);
      setAutoSearchError(null);
      setSemanalMonto(foundPlan.monto);
      setSemanalSemanas(foundPlan.plazo_semanas);
    } else {
      setAutoSearchResult(null);
      setAutoSearchError(`No se encontró ningún crédito que coincida exactamente con la cuota de $${num.toFixed(2)}.`);
    }
  };

  // Fila más cercana o exacta de la tabla popular para la tabla comparativa
  const popularRow = useMemo(() => {
    const found = POPULAR_CREDIT_ROWS.find(r => r.monto === Number(semanalMonto));
    if (found) return found;
    return (
      POPULAR_CREDIT_ROWS.reduce((prev, curr) =>
        Math.abs(curr.monto - Number(semanalMonto)) < Math.abs(prev.monto - Number(semanalMonto)) ? curr : prev
      ) || POPULAR_CREDIT_ROWS[0]
    );
  }, [semanalMonto]);

  // Cálculo reactivo para Crédito Semanal (Permite Monto Oficial y Plazo totalmente modificables)
  const customOrPopularSemanal = useMemo(() => {
    const monto = Number(semanalMonto) || 0;
    const semanas = Number(semanalSemanas) || 0;
    if (monto <= 0 || semanas <= 0) return null;

    // 1. Si existe coincidencia exacta en la Tabla Oficial de Créditos Populares:
    const official = getPopularCreditPlan(monto, semanas);
    if (official) {
      return {
        monto: official.monto,
        plazo_semanas: official.plazo_semanas,
        cuota: official.cuota,
        interes: official.interes,
        tasa: official.tasa,
        isOfficialTable: true,
      };
    }

    // 2. Si es un monto o plazo modificado/personalizado: calcular con los tramos oficiales
    let rateNum = 60;
    if (monto <= 1000) {
      rateNum = semanas <= 10 ? 65 : 60;
    } else if (monto <= 2000) {
      rateNum = semanas <= 10 ? 45 : 40;
    } else {
      rateNum = 36;
    }

    const totalInteres = Math.round(monto * (rateNum / 100) * 100) / 100;
    const totalAmount = monto + totalInteres;
    const cuota = Math.round((totalAmount / semanas) * 100) / 100;

    return {
      monto,
      plazo_semanas: semanas,
      cuota,
      interes: totalInteres,
      tasa: `${rateNum}%`,
      isOfficialTable: false,
    };
  }, [semanalMonto, semanalSemanas]);

  // ==========================================
  // 2. DIARIO (SIMULADOR ABIERTO - INICIA EN 0)
  // ==========================================
  const [diarioMonto, setDiarioMonto] = useState<number | ''>(0);
  const [diarioPlazo, setDiarioPlazo] = useState<number | ''>(0);
  const [diarioTasa, setDiarioTasa] = useState<number | ''>(0);
  const [diarioCuota, setDiarioCuota] = useState<number | ''>(0);
  const [diarioLastEdited, setDiarioLastEdited] = useState<'standard' | 'cuota'>('standard');

  // Cálculos reactivos diario
  const diarioCalc = useMemo(() => {
    const p = Number(diarioMonto) || 0;
    const n = Number(diarioPlazo) || 0;
    const r = Number(diarioTasa) || 0;
    const q = Number(diarioCuota) || 0;

    if (diarioLastEdited === 'cuota' && q > 0 && n > 0 && p > 0) {
      // Si el usuario editó la cuota directamente
      const total = q * n;
      const interes = total - p;
      const tasaCalculada = p > 0 ? (interes / p) * 100 : 0;
      return {
        cuota: q,
        total,
        interes: Math.max(0, interes),
        tasaEfectiva: Math.max(0, tasaCalculada),
      };
    }

    // Flujo estándar: Monto, Plazo y Tasa
    const interes = p * (r / 100);
    const total = p + interes;
    const cuotaCalculada = n > 0 ? total / n : 0;

    return {
      cuota: cuotaCalculada,
      total,
      interes,
      tasaEfectiva: r,
    };
  }, [diarioMonto, diarioPlazo, diarioTasa, diarioCuota, diarioLastEdited]);

  const handleDiarioMontoChange = (val: number | '') => {
    setDiarioMonto(val);
    setDiarioLastEdited('standard');
    if (val !== '' && Number(diarioPlazo) > 0) {
      const p = Number(val);
      const n = Number(diarioPlazo);
      const r = Number(diarioTasa) || 0;
      const c = (p * (1 + r / 100)) / n;
      setDiarioCuota(Math.round(c * 100) / 100);
    }
  };

  const handleDiarioPlazoChange = (val: number | '') => {
    setDiarioPlazo(val);
    setDiarioLastEdited('standard');
    if (val !== '' && Number(diarioMonto) > 0) {
      const p = Number(diarioMonto);
      const n = Number(val);
      const r = Number(diarioTasa) || 0;
      if (n > 0) {
        const c = (p * (1 + r / 100)) / n;
        setDiarioCuota(Math.round(c * 100) / 100);
      }
    }
  };

  const handleDiarioTasaChange = (val: number | '') => {
    setDiarioTasa(val);
    setDiarioLastEdited('standard');
    if (Number(diarioMonto) > 0 && Number(diarioPlazo) > 0) {
      const p = Number(diarioMonto);
      const n = Number(diarioPlazo);
      const r = Number(val) || 0;
      const c = (p * (1 + r / 100)) / n;
      setDiarioCuota(Math.round(c * 100) / 100);
    }
  };

  const handleDiarioCuotaChange = (val: number | '') => {
    setDiarioCuota(val);
    setDiarioLastEdited('cuota');
    if (val !== '' && Number(diarioMonto) > 0 && Number(diarioPlazo) > 0) {
      const p = Number(diarioMonto);
      const n = Number(diarioPlazo);
      const q = Number(val);
      const total = q * n;
      const tasa = ((total - p) / p) * 100;
      setDiarioTasa(Math.max(0, Math.round(tasa * 10) / 10));
    }
  };

  // ==========================================
  // 3. MENSUAL (SIMULADOR ABIERTO - INICIA EN 0)
  // ==========================================
  const [mensualMonto, setMensualMonto] = useState<number | ''>(0);
  const [mensualPlazo, setMensualPlazo] = useState<number | ''>(0);
  const [mensualTasa, setMensualTasa] = useState<number | ''>(0);
  const [mensualCuota, setMensualCuota] = useState<number | ''>(0);
  const [mensualLastEdited, setMensualLastEdited] = useState<'standard' | 'cuota'>('standard');

  const mensualCalc = useMemo(() => {
    const p = Number(mensualMonto) || 0;
    const n = Number(mensualPlazo) || 0;
    const r = Number(mensualTasa) || 0;
    const q = Number(mensualCuota) || 0;

    if (mensualLastEdited === 'cuota' && q > 0 && n > 0 && p > 0) {
      const total = q * n;
      const interes = total - p;
      const tasaCalculada = p > 0 ? (interes / p) * 100 : 0;
      return {
        cuota: q,
        total,
        interes: Math.max(0, interes),
        tasaEfectiva: Math.max(0, tasaCalculada),
      };
    }

    const interes = p * (r / 100);
    const total = p + interes;
    const cuotaCalculada = n > 0 ? total / n : 0;

    return {
      cuota: cuotaCalculada,
      total,
      interes,
      tasaEfectiva: r,
    };
  }, [mensualMonto, mensualPlazo, mensualTasa, mensualCuota, mensualLastEdited]);

  const handleMensualMontoChange = (val: number | '') => {
    setMensualMonto(val);
    setMensualLastEdited('standard');
    if (val !== '' && Number(mensualPlazo) > 0) {
      const p = Number(val);
      const n = Number(mensualPlazo);
      const r = Number(mensualTasa) || 0;
      const c = (p * (1 + r / 100)) / n;
      setMensualCuota(Math.round(c * 100) / 100);
    }
  };

  const handleMensualPlazoChange = (val: number | '') => {
    setMensualPlazo(val);
    setMensualLastEdited('standard');
    if (val !== '' && Number(mensualMonto) > 0) {
      const p = Number(mensualMonto);
      const n = Number(val);
      const r = Number(mensualTasa) || 0;
      if (n > 0) {
        const c = (p * (1 + r / 100)) / n;
        setMensualCuota(Math.round(c * 100) / 100);
      }
    }
  };

  const handleMensualTasaChange = (val: number | '') => {
    setMensualTasa(val);
    setMensualLastEdited('standard');
    if (Number(mensualMonto) > 0 && Number(mensualPlazo) > 0) {
      const p = Number(mensualMonto);
      const n = Number(mensualPlazo);
      const r = Number(val) || 0;
      const c = (p * (1 + r / 100)) / n;
      setMensualCuota(Math.round(c * 100) / 100);
    }
  };

  const handleMensualCuotaChange = (val: number | '') => {
    setMensualCuota(val);
    setMensualLastEdited('cuota');
    if (val !== '' && Number(mensualMonto) > 0 && Number(mensualPlazo) > 0) {
      const p = Number(mensualMonto);
      const n = Number(mensualPlazo);
      const q = Number(val);
      const total = q * n;
      const tasa = ((total - p) / p) * 100;
      setMensualTasa(Math.max(0, Math.round(tasa * 10) / 10));
    }
  };

  const applySemanal = (plan?: { monto: number; plazo_semanas: number; tasa: string; cuota: number; interes: number } | null) => {
    const target = plan || customOrPopularSemanal;
    if (!target || target.monto <= 0 || target.plazo_semanas <= 0) return;
    onApply({
      principal: target.monto,
      modality: 'semanal',
      totalInstallments: target.plazo_semanas,
      interestRate: parseFloat(target.tasa),
      cuotaSugerida: target.cuota,
    });
    setAppliedFeedback('semanal');
    setTimeout(() => setAppliedFeedback(null), 2500);
  };

  const applyDiario = (customPlazo?: number) => {
    const p = Number(diarioMonto) || 0;
    const n = customPlazo !== undefined ? customPlazo : Number(diarioPlazo) || 1;
    const r = Number(diarioCalc.tasaEfectiva) || 0;

    // Use centralized LoanCalculator for exact installment amount
    const calc = LoanCalculator.calculate({
      principal: p,
      interestRate: r,
      totalInstallments: n,
      modality: 'diario',
      customInstallmentAmount: diarioLastEdited === 'cuota' && Number(diarioCuota) > 0 ? Number(diarioCuota) : undefined,
    });

    onApply({
      principal: p,
      modality: 'diario',
      totalInstallments: n,
      interestRate: calc.interestRate,
      cuotaSugerida: calc.installmentAmount,
    });
    setAppliedFeedback('diario');
    setTimeout(() => setAppliedFeedback(null), 2500);
  };

  const applyMensual = (customPlazo?: number) => {
    const p = Number(mensualMonto) || 0;
    const n = customPlazo !== undefined ? customPlazo : Number(mensualPlazo) || 1;
    const r = Number(mensualCalc.tasaEfectiva) || 0;

    // Use centralized LoanCalculator for exact installment amount
    const calc = LoanCalculator.calculate({
      principal: p,
      interestRate: r,
      totalInstallments: n,
      modality: 'mensual',
      customInstallmentAmount: mensualLastEdited === 'cuota' && Number(mensualCuota) > 0 ? Number(mensualCuota) : undefined,
    });

    onApply({
      principal: p,
      modality: 'mensual',
      totalInstallments: n,
      interestRate: calc.interestRate,
      cuotaSugerida: calc.installmentAmount,
    });
    setAppliedFeedback('mensual');
    setTimeout(() => setAppliedFeedback(null), 2500);
  };

  return (
    <div className="bg-slate-950/90 border border-emerald-900/50 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Encabezado y Selector de Simulador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <span>Simulador Rápido de Cuotas</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.2 rounded-full font-mono">
                Multimodalidad
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Selecciona tu modalidad para proyectar cuotas y aplicarlas con un solo clic
            </p>
          </div>
        </div>

        {/* Pestañas: Semanal (Crédito Popular) | Diario | Mensual */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('semanal')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'semanal'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5 text-emerald-300" />
            <span>Semanal (Crédito Popular)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diario')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'diario'
                ? 'bg-amber-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-300" />
            <span>Diario (Libre)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mensual')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'mensual'
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-300" />
            <span>Mensual (Libre)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: SEMANAL (TABLA OFICIAL CRÉDITO POPULAR) */}
      {/* ========================================================================= */}
      {activeTab === 'semanal' && (
        <div className="space-y-4 text-xs">
          {/* SELECTOR TOGGLE: MODO AUTOMÁTICO vs MODO MANUAL */}
          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <span>Modo de Operación Semanal:</span>
                <span className={`font-mono uppercase px-2 py-0.5 rounded text-[10px] font-bold border ${
                  semanalMode === 'auto'
                    ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800/80'
                    : 'text-blue-400 bg-blue-950/80 border-blue-800/80'
                }`}>
                  {semanalMode === 'auto' ? '⚡ Modo Automático (Búsqueda Inversa)' : '🛠️ Modo Manual (Dropdowns)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {semanalMode === 'auto'
                  ? 'Ingresa la cuota deseada y el sistema deducirá el monto oficial y plazo exacto.'
                  : 'Selecciona el monto oficial y el plazo en semanas para calcular la cuota.'}
              </p>
            </div>

            {/* BOTONES DE TOGGLE */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setSemanalMode('auto')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  semanalMode === 'auto'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ Modo Automático
              </button>
              <button
                type="button"
                onClick={() => setSemanalMode('manual')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  semanalMode === 'manual'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🛠️ Modo Manual
              </button>
            </div>
          </div>

          {/* 1.A: MODO AUTOMÁTICO (BÚSQUEDA INVERSA) */}
          {semanalMode === 'auto' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/60 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="inputCuotaAutoFast" className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <TableIcon className="w-4 h-4 text-emerald-400" />
                    <span>Ingresa el Valor de la Cuota Semanal ($)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Presiona Enter o "Buscar Crédito"</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                    <input
                      id="inputCuotaAutoFast"
                      type="number"
                      step="any"
                      value={inputCuotaAuto}
                      onChange={e => setInputCuotaAuto(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleBuscarCreditoPorCuota();
                        }
                      }}
                      placeholder="Ej. 82.32, 116.40, 38.03..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-white font-mono font-bold text-sm focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuscarCreditoPorCuota()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 text-xs transition"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Buscar Crédito</span>
                  </button>
                </div>

                {/* Atajos rápidos de la tabla */}
                <div className="flex flex-wrap items-center gap-1 text-[11px] pt-1">
                  <span className="text-slate-400">Ejemplos:</span>
                  {[82.32, 38.03, 116.40, 142.88, 99.02, 60.18].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setInputCuotaAuto(val.toFixed(2));
                        handleBuscarCreditoPorCuota(val.toFixed(2));
                      }}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-emerald-950 border border-slate-700 text-emerald-300 font-mono transition cursor-pointer"
                    >
                      ${val.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mensaje de Error en Búsqueda Inversa */}
              {autoSearchError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <span>⚠️ {autoSearchError}</span>
                </div>
              )}

              {/* Resultado de la Búsqueda Inversa Automática */}
              {autoSearchResult && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/40 border border-emerald-600/70 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-900/50">
                    <span className="text-xs font-black uppercase text-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Crédito Oficial Encontrado
                    </span>
                    <button
                      type="button"
                      onClick={() => applySemanal(autoSearchResult)}
                      className={`px-3 py-1 font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                        appliedFeedback === 'semanal'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                      }`}
                    >
                      {appliedFeedback === 'semanal' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>✓ ¡Aplicado al Crédito!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>⚡ Aplicar al Crédito Semanal</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase">Monto</span>
                      <span className="text-base font-black text-white">${autoSearchResult.monto.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase">Plazo</span>
                      <span className="text-base font-black text-white">{autoSearchResult.plazo_semanas} semanas</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase">Cuota</span>
                      <span className="text-base font-black text-emerald-400">${autoSearchResult.cuota.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase">Tasa / Interés</span>
                      <span className="text-xs font-bold text-amber-300 block mt-1">
                        {autoSearchResult.tasa} (${autoSearchResult.interes.toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 1.B: MODO MANUAL: MONTO OFICIAL Y PLAZO TOTALMENTE MODIFICABLES */}
          {semanalMode === 'manual' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Campo 1: Monto Oficial ($) TOTALMENTE MODIFICABLE */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-200 font-bold text-xs flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Monto Oficial ($)</span>
                      <span className="text-emerald-400 font-normal text-[10px]">(Editable)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Escribe o elige</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={semanalMonto || ''}
                      onChange={e => setSemanalMonto(Number(e.target.value) || 0)}
                      placeholder="Ej. 700, 750, 1000..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-white font-black text-sm focus:outline-hidden focus:border-emerald-500 shadow-inner"
                    />
                  </div>
                  {/* Atajos Rápidos de Montos Oficiales Populares */}
                  <div className="flex flex-wrap items-center gap-1 text-[10px] pt-0.5">
                    {[300, 400, 500, 600, 700, 800, 1000, 1200, 1500, 2000].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSemanalMonto(m)}
                        className={`px-1.5 py-0.5 rounded transition cursor-pointer font-mono ${
                          semanalMonto === m
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        ${m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campo 2: Plazo en Semanas TOTALMENTE MODIFICABLE */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-200 font-bold text-xs flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Plazo (Semanas)</span>
                      <span className="text-emerald-400 font-normal text-[10px]">(Editable)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Escribe o elige</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="104"
                      value={semanalSemanas || ''}
                      onChange={e => setSemanalSemanas(Number(e.target.value) || 0)}
                      placeholder="Ej. 10, 12, 16..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-black text-sm focus:outline-hidden focus:border-emerald-500 shadow-inner"
                    />
                  </div>
                  {/* Atajos Rápidos de Plazos Populares */}
                  <div className="flex flex-wrap items-center gap-1 text-[10px] pt-0.5">
                    {[4, 6, 8, 10, 12, 14, 16, 20, 24].map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setSemanalSemanas(w)}
                        className={`px-1.5 py-0.5 rounded transition cursor-pointer font-mono ${
                          semanalSemanas === w
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {w}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botón Verde: Aplicar al Crédito Semanal */}
                <div className="flex flex-col justify-end sm:col-span-2 lg:col-span-1">
                  <button
                    type="button"
                    onClick={() => applySemanal()}
                    disabled={!customOrPopularSemanal || customOrPopularSemanal.monto <= 0}
                    className={`w-full py-2.5 px-3 font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-xs ${
                      appliedFeedback === 'semanal'
                        ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {appliedFeedback === 'semanal' ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>✓ ¡Plan Semanal Aplicado!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-200" />
                        <span>⚡ Aplicar al Crédito Semanal</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Tarjeta de Resumen Semanal Calculado */}
              {customOrPopularSemanal && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border border-emerald-800/80 rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Monto Oficial</span>
                    <span className="text-sm font-black text-white">${customOrPopularSemanal.monto.toFixed(2)}</span>
                    <span className="text-[9px] text-emerald-400 block">
                      {customOrPopularSemanal.isOfficialTable ? 'Tabla Oficial' : 'Personalizado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Plazo</span>
                    <span className="text-sm font-black text-white">{customOrPopularSemanal.plazo_semanas} sem.</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Tasa</span>
                    <span className="text-sm font-black text-emerald-400">{customOrPopularSemanal.tasa}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Interés Total</span>
                    <span className="text-sm font-black text-amber-400">${customOrPopularSemanal.interes.toFixed(2)}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 bg-emerald-900/70 p-2 rounded-lg border border-emerald-700/70 flex flex-col justify-center">
                    <span className="text-[10px] text-emerald-200 block font-bold">Cuota Semanal</span>
                    <span className="text-base font-black text-emerald-300">
                      ${customOrPopularSemanal.cuota.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabla rápida de todas las semanas para este monto */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-1.5 px-2.5">Plazo</th>
                  <th className="py-1.5 px-2.5">Cuota Semanal</th>
                  <th className="py-1.5 px-2.5">Tasa Oficial</th>
                  <th className="py-1.5 px-2.5">Interés</th>
                  <th className="py-1.5 px-2.5">Total a Pagar</th>
                  <th className="py-1.5 px-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {POPULAR_CREDIT_WEEKS.map(w => {
                  const plan = getPopularCreditPlan(popularRow.monto, w);
                  if (!plan) return null;
                  const isSelected = semanalSemanas === w;
                  return (
                    <tr
                      key={w}
                      className={`hover:bg-slate-800/40 transition ${
                        isSelected ? 'bg-emerald-950/50 font-bold' : ''
                      }`}
                    >
                      <td className="py-1.5 px-2.5 text-white">
                        {w} Semanas ({Math.round(w / 4)} {w <= 4 ? 'mes' : 'meses'})
                      </td>
                      <td className="py-1.5 px-2.5 text-emerald-300 font-bold">
                        ${plan.cuota.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-300">{plan.tasa}</td>
                      <td className="py-1.5 px-2.5 text-amber-400">${plan.interes.toFixed(2)}</td>
                      <td className="py-1.5 px-2.5 text-white">${(plan.monto + plan.interes).toFixed(2)}</td>
                      <td className="py-1.5 px-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSemanalSemanas(w);
                            applySemanal(plan);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-800 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-800/60'
                          }`}
                        >
                          {isSelected ? '✓ Aplicado' : 'Elegir'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: DIARIO (TABLA Y SIMULADOR LIBRE - VALORES EN 0) */}
      {/* ========================================================================= */}
      {activeTab === 'diario' && (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Monto ($) */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Monto ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={diarioMonto === '' ? '' : diarioMonto}
                  onChange={e =>
                    handleDiarioMontoChange(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-white font-bold focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            {/* Plazo (Días) */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Plazo (Días)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={diarioPlazo === '' ? '' : diarioPlazo}
                onChange={e =>
                  handleDiarioPlazoChange(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="0"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-hidden focus:border-amber-500"
              />
            </div>

            {/* Interés % (Tasa) */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Interés (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={diarioTasa === '' ? '' : diarioTasa}
                  onChange={e =>
                    handleDiarioTasaChange(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="0%"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-hidden focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-slate-400">%</span>
              </div>
            </div>

            {/* Cuota Diaria ($) */}
            <div>
              <label className="block text-amber-300 font-semibold mb-1 flex items-center justify-between">
                <span>Cuota ($)</span>
                <span className="text-[10px] text-amber-400">Editable</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-amber-400 font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={diarioCuota === '' ? '' : diarioCuota}
                  onChange={e =>
                    handleDiarioCuotaChange(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-amber-600/70 rounded-xl pl-7 pr-3 py-2 text-white font-extrabold focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Tarjeta de Resumen Diario */}
          <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <div>
              <span className="text-[10px] text-slate-400 block">Monto Capital</span>
              <span className="text-sm font-black text-white">${Number(diarioMonto || 0).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Días / Plazo</span>
              <span className="text-sm font-black text-white">{Number(diarioPlazo || 0)} días</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Interés Total</span>
              <span className="text-sm font-black text-amber-400">${diarioCalc.interes.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Total a Pagar</span>
              <span className="text-sm font-black text-white">${diarioCalc.total.toFixed(2)}</span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-amber-900/60 p-1.5 rounded-lg border border-amber-700/60">
              <span className="text-[10px] text-amber-200 block font-semibold">Cuota Diaria</span>
              <span className="text-base font-black text-amber-300">
                ${diarioCalc.cuota.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Tabla de proyección para plazos diarios comunes */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-1.5 px-2.5">Plazo (Días)</th>
                  <th className="py-1.5 px-2.5">Cuota Diaria</th>
                  <th className="py-1.5 px-2.5">Interés ({Number(diarioTasa || 0)}%)</th>
                  <th className="py-1.5 px-2.5">Total a Pagar</th>
                  <th className="py-1.5 px-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[15, 20, 24, 30, 45, 60].map(d => {
                  const p = Number(diarioMonto) || 0;
                  const r = Number(diarioTasa) || 0;
                  const interes = p * (r / 100);
                  const total = p + interes;
                  const cuota = d > 0 ? total / d : 0;
                  const isCurrent = Number(diarioPlazo) === d;

                  return (
                    <tr
                      key={d}
                      className={`hover:bg-slate-800/40 transition ${
                        isCurrent ? 'bg-amber-950/40 font-bold' : ''
                      }`}
                    >
                      <td className="py-1.5 px-2.5 text-white">{d} Días</td>
                      <td className="py-1.5 px-2.5 text-amber-300 font-bold">
                        ${cuota.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-300">${interes.toFixed(2)}</td>
                      <td className="py-1.5 px-2.5 text-white">${total.toFixed(2)}</td>
                      <td className="py-1.5 px-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setDiarioPlazo(d);
                            applyDiario(d);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-700/50 transition cursor-pointer"
                        >
                          Aplicar {d}d
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => applyDiario()}
            className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Sun className="w-4 h-4 text-amber-200" />
            <span>⚡ Aplicar al Crédito Diario (Monto: ${Number(diarioMonto || 0).toFixed(2)}, Plazo: {diarioPlazo || 0} días)</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: MENSUAL (TABLA Y SIMULADOR LIBRE - VALORES EN 0) */}
      {/* ========================================================================= */}
      {activeTab === 'mensual' && (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Monto ($) */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Monto ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={mensualMonto === '' ? '' : mensualMonto}
                  onChange={e =>
                    handleMensualMontoChange(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-white font-bold focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* Plazo (Meses) */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Plazo (Meses)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={mensualPlazo === '' ? '' : mensualPlazo}
                onChange={e =>
                  handleMensualPlazoChange(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="0"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Interés % (Tasa) */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Interés (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={mensualTasa === '' ? '' : mensualTasa}
                  onChange={e =>
                    handleMensualTasaChange(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="0%"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-hidden focus:border-blue-500"
                />
                <span className="absolute right-3 top-2 text-slate-400">%</span>
              </div>
            </div>

            {/* Cuota Mensual ($) */}
            <div>
              <label className="block text-blue-300 font-semibold mb-1 flex items-center justify-between">
                <span>Cuota ($)</span>
                <span className="text-[10px] text-blue-400">Editable</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-blue-400 font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={mensualCuota === '' ? '' : mensualCuota}
                  onChange={e =>
                    handleMensualCuotaChange(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-blue-600/70 rounded-xl pl-7 pr-3 py-2 text-white font-extrabold focus:outline-hidden focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Tarjeta de Resumen Mensual */}
          <div className="p-3 bg-blue-950/30 border border-blue-800/60 rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <div>
              <span className="text-[10px] text-slate-400 block">Monto Capital</span>
              <span className="text-sm font-black text-white">${Number(mensualMonto || 0).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Meses / Plazo</span>
              <span className="text-sm font-black text-white">{Number(mensualPlazo || 0)} meses</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Interés Total</span>
              <span className="text-sm font-black text-amber-400">${mensualCalc.interes.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Total a Pagar</span>
              <span className="text-sm font-black text-white">${mensualCalc.total.toFixed(2)}</span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-blue-900/60 p-1.5 rounded-lg border border-blue-700/60">
              <span className="text-[10px] text-blue-200 block font-semibold">Cuota Mensual</span>
              <span className="text-base font-black text-blue-300">
                ${mensualCalc.cuota.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Tabla de proyección para plazos mensuales comunes */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-1.5 px-2.5">Plazo (Meses)</th>
                  <th className="py-1.5 px-2.5">Cuota Mensual</th>
                  <th className="py-1.5 px-2.5">Interés ({Number(mensualTasa || 0)}%)</th>
                  <th className="py-1.5 px-2.5">Total a Pagar</th>
                  <th className="py-1.5 px-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[1, 2, 3, 4, 6, 12, 18, 24].map(m => {
                  const p = Number(mensualMonto) || 0;
                  const r = Number(mensualTasa) || 0;
                  const interes = p * (r / 100);
                  const total = p + interes;
                  const cuota = m > 0 ? total / m : 0;
                  const isCurrent = Number(mensualPlazo) === m;

                  return (
                    <tr
                      key={m}
                      className={`hover:bg-slate-800/40 transition ${
                        isCurrent ? 'bg-blue-950/40 font-bold' : ''
                      }`}
                    >
                      <td className="py-1.5 px-2.5 text-white">{m} {m === 1 ? 'Mes' : 'Meses'}</td>
                      <td className="py-1.5 px-2.5 text-blue-300 font-bold">
                        ${cuota.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-300">${interes.toFixed(2)}</td>
                      <td className="py-1.5 px-2.5 text-white">${total.toFixed(2)}</td>
                      <td className="py-1.5 px-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setMensualPlazo(m);
                            applyMensual(m);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-700/50 transition cursor-pointer"
                        >
                          Aplicar {m}m
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => applyMensual()}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Calendar className="w-4 h-4 text-blue-200" />
            <span>⚡ Aplicar al Crédito Mensual (Monto: ${Number(mensualMonto || 0).toFixed(2)}, Plazo: {mensualPlazo || 0} meses)</span>
          </button>
        </div>
      )}
    </div>
  );
};
