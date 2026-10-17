import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Square,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { User, Client } from '../../types';

interface Props {
  collector: User;
  onClose: () => void;
}

export const AssignClientsModal: React.FC<Props> = ({ collector, onClose }) => {
  const { database, handleAssignClientsToCollector } = useApp();
  const { currentUser, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Available operational clients (not in trash, not archived)
  const allOperationalClients = useMemo(() => {
    return database.clients.filter(c => !c.inTrash && !c.isArchived);
  }, [database.clients]);

  // Initially selected client IDs are those currently assigned to this collector
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    return allOperationalClients
      .filter(c => c.assignedCollectorId === collector.id || c.assignedTo === collector.id)
      .map(c => c.id);
  });

  // Filtered by search
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return allOperationalClients;
    const q = searchQuery.toLowerCase().trim();
    return allOperationalClients.filter(
      c =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.dui && c.dui.toLowerCase().includes(q)) ||
        c.assignedCollectorName.toLowerCase().includes(q)
    );
  }, [allOperationalClients, searchQuery]);

  // Detect which clients are being transferred from another collector
  const reassignedClients = useMemo(() => {
    return allOperationalClients.filter(
      c => selectedIds.includes(c.id) && c.assignedCollectorId !== collector.id
    );
  }, [allOperationalClients, selectedIds, collector.id]);

  const handleToggleClient = (clientId: string) => {
    setSelectedIds(prev =>
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredClients.map(c => c.id);
    const allSelected = visibleIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handlePreSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (reassignedClients.length > 0) {
      // Reassignment detected: show explicit warning confirmation
      setShowConfirmModal(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    try {
      setIsSubmitting(true);
      await handleAssignClientsToCollector(collector.id, selectedIds, reassignReason);
      setShowConfirmModal(false);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar la asignación');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-5 py-4 border-b border-blue-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Asignación de Cartera de Clientes
              </h2>
              <p className="text-xs text-blue-300">
                Cobrador: <strong className="text-white">{collector.name}</strong> ({collector.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Collector stats bar */}
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-400">Estado: </span>
              <span className={collector.active ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {collector.active ? 'Activo' : 'Desactivado'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Clientes seleccionados: </span>
              <strong className="text-blue-300 text-sm">{selectedIds.length}</strong> de {allOperationalClients.length}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSelectAllVisible}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
          >
            Seleccionar / Deseleccionar visibles
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre de cliente, teléfono o cobrador actual..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Reassignment optional reason */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Motivo o justificación administrativa de la asignación (opcional):
            </label>
            <input
              type="text"
              value={reassignReason}
              onChange={e => setReassignReason(e.target.value)}
              placeholder="Ej. Reorganización de ruta de cobranza zona centro"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Clients Checkbox List */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-[320px] overflow-y-auto divide-y divide-slate-800 bg-slate-950/40">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No se encontraron clientes con los términos de búsqueda.
              </div>
            ) : (
              filteredClients.map(c => {
                const isSelected = selectedIds.includes(c.id);
                const isCurrentlyAssigned = c.assignedCollectorId === collector.id;
                const isTransfer = isSelected && !isCurrentlyAssigned;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleToggleClient(c.id)}
                    className={`p-3 flex items-center justify-between cursor-pointer transition ${
                      isSelected ? 'bg-blue-950/30' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-blue-400">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{c.fullName}</div>
                        <div className="text-[11px] text-slate-400">
                          {c.phone} • {c.address || 'Sin dirección'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[11px]">
                      <span className="text-slate-400 block">Cobrador actual:</span>
                      <span
                        className={`font-semibold ${
                          isCurrentlyAssigned
                            ? 'text-emerald-400'
                            : isTransfer
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-300'
                        }`}
                      >
                        {c.assignedCollectorName || 'Sin asignar'}
                        {isTransfer && ' (Reasignando)'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 hidden sm:block">
            * Los recibos históricos conservan el cobrador que recibió el dinero.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePreSave}
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Asignación ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Portfolio Reassignment (Prompt Section 2.2) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="bg-slate-900 border border-amber-600/80 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100 text-xs space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-white">Confirmar Reasignación de Cartera</h3>
                <p className="text-[11px] text-amber-300">
                  Se trasladarán {reassignedClients.length} cliente(s) a {collector.name}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 max-h-48 overflow-y-auto">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Clientes que cambiarán de cobrador:
              </span>
              {reassignedClients.map(c => (
                <div key={c.id} className="flex items-center justify-between border-b border-slate-850 pb-1">
                  <span className="font-semibold text-white">{c.fullName}</span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-slate-400">{c.assignedCollectorName}</span>
                    <ArrowRight className="w-3 h-3 text-amber-400" />
                    <span className="text-blue-300 font-bold">{collector.name}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-900/60 text-slate-300 text-[11px] leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-400 inline mr-1 mb-0.5" />
              <strong>Garantía de integridad histórica:</strong> Todo el historial de pagos y recibos emitidos previamente conservará el cobrador original que recibió el dinero. Solo cambiará la ruta operativa vigente.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={executeSave}
                disabled={isSubmitting}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow-lg transition"
              >
                {isSubmitting ? 'Guardando...' : 'Confirmar y Reasignar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
