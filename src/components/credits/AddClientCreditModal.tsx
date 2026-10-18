import React, { useState, useMemo } from 'react';
import {
  X,
  UserPlus,
  DollarSign,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Camera,
  Sparkles,
  Calculator,
  ArrowRightLeft,
  Table,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { InterestType, PaymentModality } from '../../types';
import {
  getElSalvadorDate,
  formatDateDisplay,
  addDays,
  calculateDefaultFirstDueDate,
  formatDateWithDayDisplay,
} from '../../utils/dateUtils';
import { LoanCalculator, calculateLoanSchedule, formatCurrency } from '../../utils/financialCalculations';
import { DocumentScannerModal, ExtractedClientCreditData } from '../common/DocumentScannerModal';
import { PopularCreditsModal } from './PopularCreditsModal';
import { FastCreditSimulator, AppliedCreditSettings } from './FastCreditSimulator';
import {
  PopularCreditPlan,
  POPULAR_CREDIT_ROWS,
  POPULAR_CREDIT_WEEKS,
} from '../../data/popularCreditsData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AddClientCreditModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { handleAddClientAndCredit, database, setSelectedClientIdForDossier } = useApp();
  const { usersList, hasPermission } = useAuth();
  const settings = database.settings;

  const canAdd = hasPermission('canAddClientsAndCredits');
  const today = getElSalvadorDate();

  // Client form state
  const [fullName, setFullName] = useState('');
  const [dui, setDui] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [personalReferences, setPersonalReferences] = useState('');
  const [assignedCollectorId, setAssignedCollectorId] = useState(
    usersList.find(u => u.role === 'collector')?.id || usersList[0]?.id || ''
  );
  const [clientNotes, setClientNotes] = useState('');

  // Credit form state
  const [principal, setPrincipal] = useState<number>(300);
  const [interestRate, setInterestRate] = useState<number>(settings.defaultInterestRate || 20);
  const [interestType, setInterestType] = useState<InterestType>('fijo');
  const [modality, setModality] = useState<PaymentModality>(settings.defaultModality || 'diario');
  const [totalInstallments, setTotalInstallments] = useState<number>(24);
  const [startDate, setStartDate] = useState(today);
  const [firstDueDate, setFirstDueDate] = useState(() =>
    calculateDefaultFirstDueDate(today, settings.defaultModality || 'diario')
  );
  const [isAutoFirstDueDate, setIsAutoFirstDueDate] = useState(true);
  const [creditNotes, setCreditNotes] = useState('');
  const [customInstallmentAmount, setCustomInstallmentAmount] = useState<number | undefined>(undefined);

  // Manejo reactivo de fecha de entrega
  const handleStartDateChange = (newDate: string) => {
    setStartDate(newDate);
    if (isAutoFirstDueDate && newDate) {
      setFirstDueDate(calculateDefaultFirstDueDate(newDate, modality));
    }
  };

  // Manejo de fecha personalizada de primera cuota
  const handleFirstDueDateChange = (newDate: string) => {
    setFirstDueDate(newDate);
    setIsAutoFirstDueDate(false);
  };

  // Manejo reactivo de cambio de modalidad
  const handleModalityChange = (newModality: PaymentModality) => {
    setModality(newModality);
    setCustomInstallmentAmount(undefined);
    if (newModality === 'diario' && totalInstallments < 15) {
      setTotalInstallments(24);
    } else if (newModality === 'semanal' && totalInstallments > 24) {
      setTotalInstallments(10);
    }
    if (isAutoFirstDueDate) {
      setFirstDueDate(calculateDefaultFirstDueDate(startDate, newModality));
    }
  };

  // UI state
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showPopularCreditsModal, setShowPopularCreditsModal] = useState(false);

  // Aplicar ajustes desde el Simulador Rápido (Semanal, Diario o Mensual)
  const handleApplySimulatorSettings = (plan: AppliedCreditSettings) => {
    setPrincipal(plan.principal);
    setModality(plan.modality);
    setTotalInstallments(plan.totalInstallments);
    setInterestRate(plan.interestRate);
    if (plan.cuotaSugerida && plan.cuotaSugerida > 0) {
      setCustomInstallmentAmount(plan.cuotaSugerida);
    } else {
      setCustomInstallmentAmount(undefined);
    }
    if (isAutoFirstDueDate) {
      setFirstDueDate(calculateDefaultFirstDueDate(startDate, plan.modality));
    }
    setSuccessMessage(
      `¡Simulación aplicada con éxito! Monto: $${plan.principal.toFixed(2)} | Modalidad: ${plan.modality} | Plazo: ${plan.totalInstallments} ${plan.modality === 'diario' ? 'días' : plan.modality === 'semanal' ? 'semanas' : plan.modality === 'mensual' ? 'meses' : 'cuotas'} | Tasa: ${plan.interestRate}%`
    );
    setTimeout(() => setSuccessMessage(''), 6000);
  };

  // Aplicar un plan seleccionado de la Tabla Oficial de Créditos Populares
  const handleApplyPopularPlan = (plan: PopularCreditPlan) => {
    setPrincipal(plan.monto);
    setModality('semanal');
    setTotalInstallments(plan.plazo_semanas);
    setInterestRate(parseFloat(plan.tasa));
    setCustomInstallmentAmount(plan.cuota);
    if (isAutoFirstDueDate) {
      setFirstDueDate(calculateDefaultFirstDueDate(startDate, 'semanal'));
    }
    setSuccessMessage(
      `¡Plan de Crédito Popular aplicado con éxito! Monto: $${plan.monto} | ${plan.plazo_semanas} semanas | Cuota: $${plan.cuota.toFixed(2)} (Tasa: ${plan.tasa})`
    );
    setTimeout(() => setSuccessMessage(''), 6000);
  };

  const handleApplyScannedData = (data: ExtractedClientCreditData) => {
    if (data.fullName) setFullName(data.fullName);
    if (data.dui) setDui(data.dui);
    if (data.phone) setPhone(data.phone);
    if (data.address) setAddress(data.address);
    if (data.amount && data.amount > 0) {
      setPrincipal(data.amount);
    }
    if (data.personalReferences) setPersonalReferences(data.personalReferences);
    if (data.notes) {
      setClientNotes(prev => (prev ? `${prev} | ${data.notes}` : data.notes || ''));
    }
    setSuccessMessage('¡Datos extraídos con la cámara aplicados exitosamente! Verifique los campos y confirme.');
    setTimeout(() => setSuccessMessage(''), 6000);
  };

  // Centralized calculation engine (LoanCalculator)
  const schedule = useMemo(() => {
    return LoanCalculator.calculate({
      principal: Number(principal) || 0,
      interestRate: Number(interestRate) || 0,
      interestType,
      modality,
      totalInstallments: Number(totalInstallments) || 1,
      firstDueDate,
      customInstallmentAmount: customInstallmentAmount && customInstallmentAmount > 0 ? customInstallmentAmount : undefined,
    });
  }, [principal, interestRate, interestType, modality, totalInstallments, firstDueDate, customInstallmentAmount]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('El nombre completo del cliente es obligatorio.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('El número de teléfono es obligatorio para la gestión de cobro.');
      return;
    }
    if (principal <= 0) {
      setErrorMessage('El capital prestado debe ser mayor a 0.');
      return;
    }
    if (totalInstallments <= 0) {
      setErrorMessage('El número de cuotas debe ser al menos 1.');
      return;
    }

    try {
      setIsSubmitting(true);
      // SSOT: Pass the exact calculated plan so database stores what was reviewed on screen
      const res = await handleAddClientAndCredit({
        clientData: {
          fullName,
          dui,
          phone,
          address,
          personalReferences,
          assignedCollectorId,
          notes: clientNotes,
        },
        creditData: {
          principal: schedule.principal,
          interestRate: schedule.interestRate,
          interestType,
          modality,
          totalInstallments,
          installmentAmount: schedule.installmentAmount,
          customInstallmentAmount: customInstallmentAmount && customInstallmentAmount > 0 ? customInstallmentAmount : schedule.installmentAmount,
          totalAmountToPay: schedule.totalAmountToPay,
          totalInterest: schedule.totalInterest,
          startDate,
          firstDueDate,
          notes: creditNotes,
        },
      });

      setSuccessMessage(`¡Cliente "${res.client.fullName}" y crédito "${res.credit.creditNumber}" registrados con éxito!`);
      setTimeout(() => {
        onClose();
        setSelectedClientIdForDossier(res.client.id);
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al registrar cliente y crédito.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-5 py-4 border-b border-blue-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Añadir Cliente / Registrar Crédito
              </h2>
              <p className="text-xs text-blue-300">
                Registro unificado de cliente y apertura de plan de amortización
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md border border-blue-400/30 transition transform active:scale-95 cursor-pointer"
              title="Escanear documento o tomar foto con la cámara"
            >
              <Camera className="w-4 h-4 text-sky-200" />
              <span className="hidden sm:inline">Escanear con Cámara</span>
              <span className="sm:hidden">Cámara</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('form')}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === 'form'
                ? 'border-blue-500 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Formulario de Registro
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'border-blue-500 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Calendario de {schedule.installments.length} Cuotas</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {!canAdd && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>No tiene permisos para registrar clientes o créditos. Contacte al Administrador.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'form' ? (
            <form id="add-credit-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Bloque 1: Datos del Cliente */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-blue-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    1. Información del Cliente
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowScannerModal(true)}
                    className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Usar Cámara / OCR</span>
                  </button>
                </div>

                {/* Banner de Acceso a Cámara */}
                <div className="p-3 bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900 border border-blue-700/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs mb-3 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 shrink-0">
                      <Camera className="w-4 h-4 text-sky-300" />
                    </div>
                    <div>
                      <span className="font-bold text-white block flex items-center gap-1.5">
                        <span>Llenado Rápido con Cámara</span>
                        <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.2 rounded font-semibold border border-blue-400/30">IA OCR</span>
                      </span>
                      <span className="text-[11px] text-blue-200/80">
                        Toma una foto al DUI, pagaré o comprobante físico para auto-rellenar los datos al instante.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScannerModal(true)}
                    className="w-full sm:w-auto px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shrink-0 flex items-center justify-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Abrir Cámara</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Nombre Completo <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Ej. Juan Antonio Martínez Cruz"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      DUI o Identificación
                    </label>
                    <input
                      type="text"
                      value={dui}
                      onChange={e => setDui(e.target.value)}
                      placeholder="Ej. 04891234-5"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Teléfono de Contacto <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="Ej. +503 7123-4567"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Cobrador Asignado
                    </label>
                    <select
                      value={assignedCollectorId}
                      onChange={e => setAssignedCollectorId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
                    >
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === 'admin' ? 'Admin' : 'Cobrador'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">
                      Dirección de Cobro / Domicilio
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Ej. Mercado Central, Puesto #42, San Salvador"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">
                      Referencias Personales o Familiares
                    </label>
                    <input
                      type="text"
                      value={personalReferences}
                      onChange={e => setPersonalReferences(e.target.value)}
                      placeholder="Ej. Esposa: Rosa (7890-0000), Fiador / Negocio vecino"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bloque 2: Condiciones del Crédito */}
              <div className="pt-2 border-t border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    2. Condiciones Financieras del Crédito
                  </h3>

                  <button
                    type="button"
                    onClick={() => setShowPopularCreditsModal(true)}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-[11px] shadow-md border border-emerald-400/40 transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto active:scale-95"
                    title="Abrir tabla oficial completa con los 216 créditos populares de 4 a 24 semanas"
                  >
                    <Table className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Ver Tabla Oficial Completa</span>
                  </button>
                </div>

                {/* Simulador Rápido de Cuotas: Semanal (Crédito Popular), Diario y Mensual */}
                <FastCreditSimulator
                  onApply={handleApplySimulatorSettings}
                  currencySymbol={settings.currencySymbol}
                  defaultPrincipal={principal}
                />

                {/* Parámetros Financieros Oficiales (Directamente Modificables) */}
                <div className="p-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Condiciones Oficiales del Crédito (Modificables)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Puedes escribir o ajustar cualquier valor</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {/* Monto Oficial */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Monto Oficial ($) <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          step="any"
                          min="1"
                          required
                          value={principal || ''}
                          onChange={e => {
                            setPrincipal(Number(e.target.value) || 0);
                            setCustomInstallmentAmount(undefined);
                          }}
                          placeholder="Monto solicitado"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-white font-black text-sm focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Modalidad de Cobro */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Modalidad de Cobro <span className="text-emerald-400">*</span>
                      </label>
                      <select
                        value={modality}
                        onChange={e => handleModalityChange(e.target.value as PaymentModality)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-hidden focus:border-emerald-500"
                      >
                        <option value="diario">Diario (Lunes a Lunes)</option>
                        <option value="semanal">Semanal</option>
                        <option value="quincenal">Quincenal</option>
                        <option value="mensual">Mensual</option>
                      </select>
                    </div>

                    {/* Plazo / Total de Cuotas */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Plazo ({modality === 'diario' ? 'Días' : modality === 'semanal' ? 'Semanas' : modality === 'mensual' ? 'Meses' : 'Cuotas'}) <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        required
                        value={totalInstallments || ''}
                        onChange={e => {
                          setTotalInstallments(Number(e.target.value) || 1);
                          setCustomInstallmentAmount(undefined);
                        }}
                        placeholder="Total de cuotas"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-black text-sm focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    {/* Tasa de Interés */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Tasa de Interés (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={interestRate || ''}
                          onChange={e => {
                            setInterestRate(Number(e.target.value) || 0);
                            setCustomInstallmentAmount(undefined);
                          }}
                          placeholder="Tasa %"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-7 py-2 text-white font-bold text-sm focus:outline-hidden focus:border-emerald-500"
                        />
                        <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estado del Plan Seleccionado del Simulador */}
                <div className="p-3.5 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border border-emerald-700/70 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-300 shrink-0 shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-sm">
                          Plan de Crédito: ${principal.toFixed(2)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 font-semibold uppercase">
                          {modality}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        <strong className="text-emerald-300 font-bold">{totalInstallments} cuotas</strong> de{' '}
                        <strong className="text-white text-xs">{formatCurrency(schedule.installmentAmount, settings.currencySymbol)}</strong>
                        {schedule.hasPennyAdjustment && (
                          <span className="text-amber-300 text-[10px] ml-1 font-semibold">
                            (última cuota #{totalInstallments}: {formatCurrency(schedule.lastInstallmentAmount, settings.currencySymbol)} por redondeo exacto)
                          </span>
                        )}{' '}
                        • Total a pagar: <strong className="text-white">{formatCurrency(schedule.totalAmountToPay, settings.currencySymbol)}</strong> (Interés: {formatCurrency(schedule.totalInterest, settings.currencySymbol)} al {schedule.interestRate}%)
                      </p>
                    </div>
                  </div>

                  <div className="text-[11px] text-emerald-300 font-semibold bg-emerald-950/80 px-2.5 py-1.5 rounded-lg border border-emerald-700/60 shrink-0 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Listo para guardar</span>
                  </div>
                </div>

                {/* Bloque 3: Fechas del Crédito: Entrega y Primera Cuota */}
                <div className="pt-3 border-t border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-xs uppercase font-extrabold tracking-wider text-sky-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      3. Fechas de Entrega y Primera Cuota
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Calendario oficial de pagos (El Salvador)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Campo 1: Fecha de Entrega del Crédito (Desembolso) */}
                    <div className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl space-y-2.5 transition">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-sky-400" />
                          <span>Fecha de Entrega del Crédito</span>
                          <span className="text-rose-400">*</span>
                        </label>
                        <span className="text-[10px] text-sky-300 font-semibold bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                          Desembolso
                        </span>
                      </div>

                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={e => handleStartDateChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-hidden focus:border-sky-500 transition cursor-pointer"
                      />

                      {/* Visualización legible en español con día de la semana */}
                      <div className="text-[11px] text-sky-200/90 font-medium flex items-center gap-1.5 bg-sky-950/30 px-2 py-1 rounded-lg border border-sky-900/40">
                        <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>Entrega: {formatDateWithDayDisplay(startDate)}</span>
                      </div>

                      {/* Atajos Rápidos para Fecha de Entrega */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                        <span className="text-slate-400 text-[10px]">Atajos:</span>
                        <button
                          type="button"
                          onClick={() => handleStartDateChange(today)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                            startDate === today
                              ? 'bg-sky-600 text-white border-sky-500 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                        >
                          Hoy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartDateChange(addDays(today, -1))}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                            startDate === addDays(today, -1)
                              ? 'bg-sky-600 text-white border-sky-500 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                        >
                          Ayer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartDateChange(addDays(today, 1))}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                            startDate === addDays(today, 1)
                              ? 'bg-sky-600 text-white border-sky-500 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                        >
                          Mañana
                        </button>
                      </div>
                    </div>

                    {/* Campo 2: Fecha de Primera Cuota */}
                    <div className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl space-y-2.5 transition">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-400" />
                          <span>Fecha de Primera Cuota</span>
                          <span className="text-rose-400">*</span>
                        </label>
                        <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                          Primer Cobro
                        </span>
                      </div>

                      <input
                        type="date"
                        required
                        value={firstDueDate}
                        onChange={e => handleFirstDueDateChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-hidden focus:border-emerald-500 transition cursor-pointer"
                      />

                      {/* Visualización legible en español con día de la semana */}
                      <div className="text-[11px] text-emerald-200/90 font-medium flex items-center gap-1.5 bg-emerald-950/30 px-2 py-1 rounded-lg border border-emerald-900/40">
                        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>1ª Cuota: {formatDateWithDayDisplay(firstDueDate)}</span>
                      </div>

                      {/* Atajos Rápidos para Primera Cuota */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                        <span className="text-slate-400 text-[10px]">Atajos:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFirstDueDate(startDate);
                            setIsAutoFirstDueDate(false);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                            firstDueDate === startDate
                              ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                          title="Cobro inicia el mismo día del desembolso"
                        >
                          Mismo Día
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFirstDueDate(addDays(startDate, 1));
                            setIsAutoFirstDueDate(false);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                            firstDueDate === addDays(startDate, 1)
                              ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                          title="Al día siguiente del desembolso (típico diario)"
                        >
                          +1 Día (Diario)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFirstDueDate(addDays(startDate, 7));
                            setIsAutoFirstDueDate(false);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                            firstDueDate === addDays(startDate, 7)
                              ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                          title="En 7 días (típico semanal)"
                        >
                          +7 Días (Semanal)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFirstDueDate(addDays(startDate, 15));
                            setIsAutoFirstDueDate(false);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                            firstDueDate === addDays(startDate, 15)
                              ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                          title="En 15 días (quincenal)"
                        >
                          +15 Días
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFirstDueDate(calculateDefaultFirstDueDate(startDate, 'mensual'));
                            setIsAutoFirstDueDate(false);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                            firstDueDate === calculateDefaultFirstDueDate(startDate, 'mensual')
                              ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                          title="En 1 mes (mensual)"
                        >
                          +1 Mes
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Resumen de Amortización de Fechas */}
                  <div className="p-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-900/40 text-sky-400 flex items-center justify-center font-bold text-xs border border-sky-800/50">
                        1
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Entrega / Desembolso</span>
                        <strong className="text-white text-xs">{formatDateDisplay(startDate)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-900/40 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-800/50">
                        2
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Primera Cuota</span>
                        <strong className="text-emerald-300 text-xs">{formatDateDisplay(firstDueDate)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-900/40 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-800/50">
                        3
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Vencimiento Final</span>
                        <strong className="text-indigo-300 text-xs font-mono">{formatDateDisplay(schedule.finalDueDate)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Observaciones o notas del crédito */}
                  <div>
                    <label className="block text-slate-300 font-medium mb-1 text-xs">
                      Observaciones o Notas del Crédito (Opcional)
                    </label>
                    <input
                      type="text"
                      value={creditNotes}
                      onChange={e => setCreditNotes(e.target.value)}
                      placeholder="Ej. Entregado en efectivo en el local comercial, cliente solicita cobro por las mañanas..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </form>
          ) : (
            /* Tab: Preview Installment Schedule */
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div>
                  <span className="text-slate-400 block text-[11px]">Cliente:</span>
                  <strong className="text-white truncate block">{fullName || 'Sin nombre'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Crédito:</span>
                  <strong className="text-emerald-400 block">
                    {formatCurrency(schedule.totalAmountToPay, settings.currencySymbol)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Entrega → 1ª Cuota:</span>
                  <strong className="text-sky-300 block">
                    {formatDateDisplay(startDate)} → {formatDateDisplay(firstDueDate)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Fin de Crédito:</span>
                  <strong className="text-indigo-300 block font-mono">
                    {formatDateDisplay(schedule.finalDueDate)} ({schedule.installments.length} cuotas)
                  </strong>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[350px] border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 sticky top-0">
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="py-2 px-3 font-semibold"># Cuota</th>
                      <th className="py-2 px-3 font-semibold">Fecha Vencimiento</th>
                      <th className="py-2 px-3 font-semibold text-right">Importe Cuota</th>
                      <th className="py-2 px-3 font-semibold text-center">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {schedule.installments.map(inst => (
                      <tr key={inst.installmentNumber} className={`hover:bg-slate-800/40 ${inst.isLastInstallment && schedule.hasPennyAdjustment ? 'bg-amber-950/20' : ''}`}>
                        <td className="py-2 px-3 font-mono text-slate-300">
                          Cuota #{inst.installmentNumber}
                        </td>
                        <td className="py-2 px-3 text-slate-200">
                          {formatDateDisplay(inst.dueDate)}
                        </td>
                        <td className="py-2 px-3 font-bold text-emerald-400 text-right">
                          {formatCurrency(inst.scheduledAmount, settings.currencySymbol)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {inst.isLastInstallment && schedule.hasPennyAdjustment ? (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">
                              Absorbe redondeo (+{formatCurrency(schedule.pennyDifference, settings.currencySymbol)})
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Regular</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 hidden sm:block">
            * Se generarán {schedule.installments.length} cuotas automáticamente.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
            >
              Cancelar
            </button>

            {activeTab === 'form' ? (
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl text-xs transition"
              >
                Revisar Cuotas
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl text-xs transition"
              >
                Editar Datos
              </button>
            )}

            <button
              type="submit"
              form="add-credit-form"
              disabled={isSubmitting || !canAdd}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar y Guardar Crédito</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Escaneo con Cámara y OCR */}
      <DocumentScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onApplyData={handleApplyScannedData}
      />

      {/* Modal de Tabla Oficial de Créditos Populares */}
      <PopularCreditsModal
        isOpen={showPopularCreditsModal}
        onClose={() => setShowPopularCreditsModal(false)}
        onSelectPlan={handleApplyPopularPlan}
      />
    </div>
  );
};
