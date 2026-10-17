import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ShieldCheck,
  User,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ReversionRequest } from '../../types';
import { formatCurrency } from '../../utils/financialCalculations';
import { formatDateDisplay, formatDateTimeDisplay } from '../../utils/dateUtils';

export const ReversionRequestsView: React.FC = () => {
  const {
    database,
    handleApproveReversion,
    handleRejectReversion,
    setActiveReceiptModalPayment,
  } = useApp();
  const { currentUser, isAdmin, hasPermission } = useAuth();
  const settings = database.settings;

  const canApprove = isAdmin || hasPermission('canApproveReversion');

  // Modal actions
  const [selectedRequest, setSelectedRequest] = useState<ReversionRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionError, setActionError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filteredRequests = database.reversionRequests.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const handleOpenAction = (req: ReversionRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(req);
    setActionType(type);
    setAdminNotes(type === 'approve' ? 'Reversión autorizada tras validación de auditoría.' : '');
    setActionError('');
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !actionType) return;
    setActionError('');

    try {
      setIsProcessing(true);
      if (actionType === 'approve') {
        await handleApproveReversion(selectedRequest.id, adminNotes);
      } else {
        await handleRejectReversion(selectedRequest.id, adminNotes);
      }
      setSelectedRequest(null);
      setActionType(null);
      setAdminNotes('');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-500" />
            <span>Solicitudes de Reversión de Pagos</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Módulo de control estricto: autorización administrativa para corrección y reversión de cobros
          </p>
        </div>

        {canApprove && (
          <div className="flex items-center gap-2 bg-blue-950/60 border border-blue-800 px-3 py-1.5 rounded-xl text-xs text-blue-300 font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Panel Administrativo Autorizado</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 flex flex-wrap items-center gap-2 text-xs">
        {[
          { id: 'all', label: 'Todas las solicitudes' },
          { id: 'pending', label: 'Pendientes de Aprobación' },
          { id: 'approved', label: 'Aprobadas' },
          { id: 'rejected', label: 'Rechazadas' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id as typeof filterStatus)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              filterStatus === tab.id
                ? 'bg-amber-600 text-slate-950 font-bold shadow'
                : 'bg-slate-900 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Request Cards / Table */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-12 text-center text-slate-400 space-y-2">
            <RotateCcw className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-200">No hay solicitudes de reversión</p>
            <p className="text-xs text-slate-500">
              Cuando un cobrador solicite corregir un pago por error, aparecerá en esta sección para revisión del administrador.
            </p>
          </div>
        ) : (
          filteredRequests.map(req => {
            const originalPayment = database.payments.find(p => p.id === req.paymentId);

            return (
              <div
                key={req.id}
                className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-700/70 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-900">
                      Recibo #{req.receiptNumber}
                    </span>
                    <h3 className="font-bold text-white text-sm">{req.clientName}</h3>
                  </div>

                  <div>
                    {req.status === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-800 px-3 py-1 rounded-full animate-pulse">
                        <Clock className="w-3.5 h-3.5" /> Pendiente de Aprobación
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Reversión Aprobada y Ejecutada
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-300 bg-rose-950/80 border border-rose-800 px-3 py-1 rounded-full">
                        <XCircle className="w-3.5 h-3.5" /> Solicitud Rechazada
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-750">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Importe del Pago:</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {formatCurrency(req.amount, settings.currencySymbol)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Fecha del Pago:</span>
                    <span className="font-semibold text-slate-200">{formatDateDisplay(req.paymentDate)}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Solicitado por:</span>
                    <span className="font-semibold text-slate-200">{req.requestedByName}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Fecha de Solicitud:</span>
                    <span className="font-medium text-slate-300">{formatDateTimeDisplay(req.requestedAt)}</span>
                  </div>
                </div>

                {/* Mandatory Reason Box */}
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-750 text-xs">
                  <span className="text-amber-400 font-bold block mb-1">
                    Motivo Detallado de la Solicitud:
                  </span>
                  <p className="text-slate-300 italic leading-relaxed">{req.reason}</p>
                </div>

                {/* Admin notes if reviewed */}
                {req.adminNotes && (
                  <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-900/60 text-xs">
                    <span className="text-blue-300 font-bold block mb-1">
                      Resolución Administrativa ({req.reviewedByName}):
                    </span>
                    <p className="text-slate-200">{req.adminNotes}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Procesado el: {formatDateTimeDisplay(req.reviewedAt)}
                    </span>
                  </div>
                )}

                {/* Action Buttons for Admin */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  {originalPayment && (
                    <button
                      onClick={() => setActiveReceiptModalPayment(originalPayment)}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver Recibo Original #{req.receiptNumber}</span>
                    </button>
                  )}

                  {canApprove && req.status === 'pending' && (
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => handleOpenAction(req, 'reject')}
                        className="px-4 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs rounded-xl transition"
                      >
                        Rechazar Solicitud
                      </button>
                      <button
                        onClick={() => handleOpenAction(req, 'approve')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
                      >
                        Aprobar y Revertir Pago
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Admin Action Modal (Prompt Section 11) */}
      {selectedRequest && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center gap-3 mb-3">
              {actionType === 'approve' ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              ) : (
                <XCircle className="w-7 h-7 text-rose-400" />
              )}
              <div>
                <h3 className="text-base font-bold text-white">
                  {actionType === 'approve' ? 'Aprobar Reversión de Pago' : 'Rechazar Solicitud'}
                </h3>
                <p className="text-xs text-slate-400">Recibo: {selectedRequest.receiptNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {actionType === 'approve' ? (
                <>
                  Al aprobar, el sistema <strong>recalculará automáticamente</strong> el saldo de la cuota, el saldo del crédito y los cobros del día, conservando el recibo en auditoría con su historial negativo.
                </>
              ) : (
                <>
                  Al rechazar, el pago original continuará válido y se registrará su justificación en la bitácora.
                </>
              )}
            </p>

            {actionError && (
              <div className="mb-3 p-2.5 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteAction} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Observación administrativa obligatoria:
                </label>
                <textarea
                  required
                  rows={3}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder={
                    actionType === 'approve'
                      ? 'Escriba nota de aprobación para la bitácora...'
                      : 'Indique motivo obligatorio por el cual rechaza la reversión...'
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    setActionType(null);
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`px-5 py-2 font-bold rounded-xl shadow-lg transition ${
                    actionType === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  {isProcessing
                    ? 'Procesando...'
                    : actionType === 'approve'
                    ? 'Confirmar y Ejecutar Reversión'
                    : 'Confirmar Rechazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
