import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle,
  Eye,
  Search,
  Calendar,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Client } from '../../types';
import { formatDateDisplay, formatDateTimeDisplay } from '../../utils/dateUtils';
import { ClientDossierModal } from '../clients/ClientDossierModal';

export const TrashView: React.FC = () => {
  const {
    database,
    handleRestoreFromTrash,
    handlePermanentDeleteOrSafePurge,
    setSelectedClientIdForDossier,
    selectedClientIdForDossier,
  } = useApp();
  const { isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    client: Client;
    action: 'restore' | 'purge';
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState('');

  // Trash clients
  const trashClients = database.clients.filter(c => c.inTrash);

  const filteredTrash = trashClients.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.dui && c.dui.toLowerCase().includes(q)) ||
      (c.deletionReason && c.deletionReason.toLowerCase().includes(q))
    );
  });

  const getDaysRemaining = (purgeAtStr?: string) => {
    if (!purgeAtStr) return '0 días';
    const now = Date.now();
    const purgeTime = new Date(purgeAtStr).getTime();
    const diff = purgeTime - now;
    if (diff <= 0) return 'Listo para purga';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h restantes`;
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    setActionError('');
    setIsProcessing(true);

    try {
      if (confirmModal.action === 'restore') {
        await handleRestoreFromTrash(confirmModal.client.id);
      } else {
        await handlePermanentDeleteOrSafePurge(confirmModal.client.id);
      }
      setConfirmModal(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error al procesar la acción');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-400">
        <ShieldAlert className="w-12 h-12 mx-auto text-rose-500 mb-2" />
        <h2 className="text-base font-bold text-white">Acceso Denegado</h2>
        <p className="text-xs text-slate-400 mt-1">
          La papelera de reciclaje es exclusiva del Administrador Principal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-500" />
            <span>Papelera de Clientes</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Apartado exclusivo de administración: gestión de retiros temporales, restauración y purga programada a 7 días
          </p>
        </div>

        <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-800 px-3 py-1.5 rounded-xl text-xs text-rose-300 font-semibold">
          <Clock className="w-3.5 h-3.5 text-rose-400" />
          <span>{trashClients.length} cliente(s) en papelera</span>
        </div>
      </div>

      {/* Info Notice about 7-Day Purge Rule & Financial Ledger Protection */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 text-blue-300 font-bold">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Políticas de Seguridad y Retiro (Sección 1):</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          • Los clientes en papelera están <strong>bloqueados para nuevos cobros</strong> y no aparecen en las rutas de los cobradores.<br />
          • Permanecen aquí durante <strong>7 días calendario</strong>. Mientras no venza el plazo, el administrador puede <strong>restaurarlos</strong>.<br />
          • <strong>Protección financiera obligatoria:</strong> Si el cliente tiene préstamos, cuotas o pagos históricos registrados, el borrado definitivo conserva intacto el historial contable y se archiva de forma segura sin eliminar deudas.
        </p>
      </div>

      {/* Search Toolbar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar cliente en papelera por nombre, ID o motivo..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
          />
        </div>
      </div>

      {/* Trash Clients Table */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg">
        {filteredTrash.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Trash2 className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-200">La papelera está vacía</p>
            <p className="text-xs text-slate-500">
              No hay clientes retirados del sistema en este momento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                  <th className="py-3 px-4 font-semibold">Cliente</th>
                  <th className="py-3 px-4 font-semibold">ID / DUI</th>
                  <th className="py-3 px-4 font-semibold">Fecha Retiro</th>
                  <th className="py-3 px-4 font-semibold">Retirado Por</th>
                  <th className="py-3 px-4 font-semibold">Motivo</th>
                  <th className="py-3 px-4 font-semibold">Purga Programada</th>
                  <th className="py-3 px-4 font-semibold">Plazo Restante</th>
                  <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-750">
                {filteredTrash.map(c => {
                  const associatedCredits = database.credits.filter(cr => cr.clientId === c.id);
                  const hasFinances = associatedCredits.length > 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-750/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{c.fullName}</div>
                        <div className="text-[11px] text-slate-400">
                          {c.phone} • {associatedCredits.length} crédito(s)
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <div>{c.id}</div>
                        <div className="text-[10px] text-slate-400">DUI: {c.dui || 'N/A'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {formatDateTimeDisplay(c.deletedAt)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-200 font-medium">
                        {c.deletedBy || 'Administrador'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate italic">
                        {c.deletionReason || 'Sin motivo especificado'}
                      </td>

                      <td className="py-3.5 px-4 text-rose-300 font-mono">
                        {formatDateTimeDisplay(c.purgeAt)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" />
                          <span>{getDaysRemaining(c.purgeAt)}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedClientIdForDossier(c.id)}
                            className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs transition"
                            title="Ver detalles / expediente"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setConfirmModal({ client: c, action: 'restore' })}
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1.5 rounded-lg text-xs transition"
                            title="Restaurar al listado principal"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restaurar</span>
                          </button>

                          <button
                            onClick={() => setConfirmModal({ client: c, action: 'purge' })}
                            className="inline-flex items-center gap-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition"
                            title="Eliminar definitivamente o archivar seguro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
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

      {/* Client Dossier Modal if opened */}
      {selectedClientIdForDossier && (
        <ClientDossierModal
          clientId={selectedClientIdForDossier}
          onClose={() => setSelectedClientIdForDossier(null)}
          onOpenArchiveModal={() => {}}
        />
      )}

      {/* Confirmation Modal for Restore or Purge */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100 text-xs space-y-4">
            <div className="flex items-center gap-3">
              {confirmModal.action === 'restore' ? (
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                  <RotateCcw className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-white">
                  {confirmModal.action === 'restore'
                    ? 'Restaurar Cliente'
                    : 'Confirmar Eliminación Definitiva'}
                </h3>
                <p className="text-[11px] text-slate-400">{confirmModal.client.fullName}</p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="space-y-2 text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              {confirmModal.action === 'restore' ? (
                <p>
                  El cliente será reactivado en el listado operativo y en la cartera de su cobrador asignado. Se cancelará la purga automática programada.
                </p>
              ) : (
                <>
                  <p>
                    <strong>Advertencia de integridad financiera:</strong> Si este cliente tiene créditos o pagos asociados, el sistema aplicará automáticamente la <strong>política de protección contable</strong> (se archiva de forma definitiva y segura sin destruir recibos ni hacer desaparecer saldos adeudados).
                  </p>
                  {database.credits.some(c => c.clientId === confirmModal.client.id) && (
                    <div className="p-2 bg-amber-950/60 border border-amber-800/80 rounded-lg text-amber-300 text-[11px] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Este cliente tiene créditos registrados. Su historial se preservará intacto.</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isProcessing}
                className={`px-5 py-2 font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 ${
                  confirmModal.action === 'restore'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {isProcessing ? (
                  <span>Procesando...</span>
                ) : confirmModal.action === 'restore' ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirmar Restauración</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmar Purga Definitiva</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
