import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  User,
  Phone,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Archive,
  Eye,
  PlusCircle,
  FileText,
  AlertCircle,
  Clock,
  Trash2,
  Camera,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/financialCalculations';
import { formatDateDisplay, getElSalvadorDate } from '../../utils/dateUtils';
import { Client } from '../../types';

export const ClientsView: React.FC = () => {
  const {
    database,
    setSelectedClientIdForDossier,
    selectedClientIdForDossier,
    setIsAddCreditModalOpen,
    handleArchiveClient,
    handleMoveToTrash,
  } = useApp();
  const { currentUser, hasPermission, isAdmin } = useAuth();
  const settings = database.settings;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'up_to_date' | 'pending' | 'overdue' | 'liquidated' | 'archived'
  >('all');

  // Archive modal state
  const [archiveModalClientId, setArchiveModalClientId] = useState<string | null>(null);
  const [archiveConfirmName, setArchiveConfirmName] = useState('');
  const [archiveReason, setArchiveReason] = useState('');
  const [archiveError, setArchiveError] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);

  // Section 1.1: Trash modal state
  const [trashModalClient, setTrashModalClient] = useState<Client | null>(null);
  const [trashReason, setTrashReason] = useState('');
  const [trashError, setTrashError] = useState('');
  const [isTrashing, setIsTrashing] = useState(false);

  const clientToArchive = database.clients.find(c => c.id === archiveModalClientId);

  // Map each client with their credits and installment health
  const clientListWithStats = useMemo(() => {
    const today = getElSalvadorDate();

    return database.clients.map(client => {
      const clientCredits = database.credits.filter(c => c.clientId === client.id);
      const totalPrincipal = clientCredits.reduce((acc, c) => acc + c.principal, 0);
      const totalBalance = clientCredits.reduce((acc, c) => acc + c.balancePending, 0);

      const clientInstallments = database.installments.filter(i => i.clientId === client.id);
      const overdueInstallments = clientInstallments.filter(i => i.status === 'overdue' && i.balance > 0);
      const pendingTodayInstallments = clientInstallments.filter(i => i.dueDate === today && i.balance > 0);

      // Find next upcoming due date
      const upcoming = clientInstallments
        .filter(i => i.balance > 0.001)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

      const hasActiveCredits = clientCredits.some(c => c.status === 'active' || c.status === 'overdue');
      const allLiquidated = clientCredits.length > 0 && clientCredits.every(c => c.status === 'liquidated');
      const hasOverdue = overdueInstallments.length > 0;
      const isUpToDate = hasActiveCredits && !hasOverdue && pendingTodayInstallments.length === 0;

      return {
        client,
        credits: clientCredits,
        primaryCredit: clientCredits[0],
        totalPrincipal,
        totalBalance,
        nextDueDate: upcoming?.dueDate,
        hasOverdue,
        overdueCount: overdueInstallments.length,
        isUpToDate,
        hasActiveCredits,
        allLiquidated,
        isArchived: client.isArchived,
      };
    });
  }, [database]);

  // Filtered list
  const filteredClients = useMemo(() => {
    return clientListWithStats.filter(item => {
      // Search matching
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.client.fullName.toLowerCase().includes(q) ||
        item.client.phone.includes(q) ||
        item.client.dui.toLowerCase().includes(q) ||
        (item.primaryCredit?.creditNumber.toLowerCase().includes(q) ?? false);

      if (!matchSearch) return false;

      // Section 1.2: Never show clients that are in trash in operational views
      if (item.client.inTrash) return false;

      // Section 2.4: Portfolio access restriction for collectors
      if (currentUser?.role === 'collector' && !currentUser?.permissions.canViewAllClients) {
        if (
          item.client.assignedCollectorId !== currentUser.id &&
          item.client.assignedTo !== currentUser.id
        ) {
          return false;
        }
      }

      // Status filters
      if (filterStatus === 'archived') return item.isArchived;
      if (item.isArchived) return false; // Hide archived in regular filters unless requested

      if (filterStatus === 'active') return item.hasActiveCredits;
      if (filterStatus === 'up_to_date') return item.isUpToDate;
      if (filterStatus === 'pending') return item.totalBalance > 0 && !item.hasOverdue;
      if (filterStatus === 'overdue') return item.hasOverdue;
      if (filterStatus === 'liquidated') return item.allLiquidated;

      return true;
    });
  }, [clientListWithStats, searchQuery, filterStatus, currentUser]);

  const handleExecuteTrash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trashModalClient) return;
    setTrashError('');
    setIsTrashing(true);

    try {
      await handleMoveToTrash(trashModalClient.id, trashReason);
      setTrashModalClient(null);
      setTrashReason('');
    } catch (err: unknown) {
      setTrashError(err instanceof Error ? err.message : 'Error al mover a papelera');
    } finally {
      setIsTrashing(false);
    }
  };

  const handleExecuteArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveModalClientId) return;
    setArchiveError('');

    try {
      setIsArchiving(true);
      await handleArchiveClient(archiveModalClientId, archiveConfirmName, archiveReason);
      setArchiveModalClientId(null);
      setArchiveConfirmName('');
      setArchiveReason('');
    } catch (err: unknown) {
      setArchiveError(err instanceof Error ? err.message : 'Error al archivar cliente');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            <span>Directorio de Clientes</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Administración completa de prestatarios, expedientes y saldos de cartera
          </p>
        </div>

        {hasPermission('canAddClientsAndCredits') && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddCreditModalOpen(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-md shadow-blue-600/30 cursor-pointer"
              title="Abrir formulario de nuevo crédito y escanear con cámara"
            >
              <Camera className="w-4 h-4 text-sky-200" />
              <span className="hidden sm:inline">Escanear con Cámara</span>
              <span className="sm:hidden">Cámara</span>
            </button>

            <button
              onClick={() => setIsAddCreditModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-md shadow-blue-600/30 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Añadir Cliente / Crédito</span>
            </button>
          </div>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, teléfono, DUI o número de crédito..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Quick Filter Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtro:</span>
            </span>

            {[
              { id: 'all', label: 'Todos' },
              { id: 'active', label: 'Activos' },
              { id: 'up_to_date', label: 'Al día' },
              { id: 'pending', label: 'Con pendientes' },
              { id: 'overdue', label: 'En mora' },
              { id: 'liquidated', label: 'Liquidados' },
              { id: 'archived', label: 'Archivados' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id as typeof filterStatus)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  filterStatus === f.id
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-900 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Clients Table / Cards */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg">
        {filteredClients.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <User className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No se encontraron clientes</p>
            <p className="text-xs text-slate-500">
              Pruebe cambiando los filtros de búsqueda o registre un nuevo cliente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                  <th className="py-3 px-4 font-semibold">Cliente</th>
                  <th className="py-3 px-4 font-semibold">Teléfono / DUI</th>
                  <th className="py-3 px-4 font-semibold">Crédito(s)</th>
                  <th className="py-3 px-4 font-semibold">Capital</th>
                  <th className="py-3 px-4 font-semibold">Saldo Pendiente</th>
                  <th className="py-3 px-4 font-semibold">Próximo Pago</th>
                  <th className="py-3 px-4 font-semibold">Estado</th>
                  <th className="py-3 px-4 font-semibold">Cobrador</th>
                  <th className="py-3 px-4 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-750">
                {filteredClients.map(item => (
                  <tr
                    key={item.client.id}
                    className="hover:bg-slate-750/50 transition cursor-pointer"
                    onClick={() => setSelectedClientIdForDossier(item.client.id)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm hover:text-blue-400 transition">
                        {item.client.fullName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {item.client.address || 'Sin dirección'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="font-medium text-blue-300">{item.client.phone}</div>
                      <div className="text-[11px] text-slate-400">DUI: {item.client.dui || 'N/A'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.credits.length > 0 ? (
                        <div className="space-y-1">
                          {item.credits.map(c => (
                            <div key={c.id} className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-block font-mono text-[11px] font-semibold text-blue-300 bg-blue-950/60 border border-blue-900 px-1.5 py-0.2 rounded">
                                {c.creditNumber}
                              </span>
                              {c.installmentAmount > 0 && (
                                <span className="text-[11px] text-emerald-400 font-bold">
                                  {formatCurrency(c.installmentAmount, settings.currencySymbol)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Sin créditos</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {formatCurrency(item.totalPrincipal, settings.currencySymbol)}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-rose-300">
                      {formatCurrency(item.totalBalance, settings.currencySymbol)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {formatDateDisplay(item.nextDueDate)}
                    </td>

                    <td className="py-3.5 px-4">
                      {item.isArchived ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-full">
                          <Archive className="w-3 h-3" /> Archivado
                        </span>
                      ) : item.hasOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded-full animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> En Mora ({item.overdueCount})
                        </span>
                      ) : item.allLiquidated ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Liquidado
                        </span>
                      ) : item.isUpToDate ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-950/80 border border-blue-800 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Al Día
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-950/40 border border-amber-900/60 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {item.client.assignedCollectorName}
                    </td>

                    <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedClientIdForDossier(item.client.id)}
                          className="inline-flex items-center gap-1 bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-blue-500/40 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Expediente</span>
                        </button>

                        {/* Section 1.1: Admin option to move client to trash */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setTrashModalClient(item.client);
                              setTrashReason('');
                              setTrashError('');
                            }}
                            className="inline-flex items-center gap-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-white px-2 py-1.5 rounded-lg text-xs font-semibold transition"
                            title="Mover a papelera (Administrador)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Papelera</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>



      {/* Archive / Logical Soft-Delete Modal (Prompt Section 6) */}
      {archiveModalClientId && clientToArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-amber-700/80 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <Archive className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Archivar Cliente</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              El archivado lógico oculta al cliente de los cobros habituales pero <strong>conserva intacto todo el historial de créditos y pagos</strong> para auditoría.
            </p>

            {archiveError && (
              <div className="mt-3 p-2.5 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{archiveError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteArchive} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Para confirmar, escriba el nombre exacto:
                </label>
                <div className="p-2 bg-slate-950 rounded-lg text-amber-300 font-bold mb-1.5 select-all">
                  {clientToArchive.fullName}
                </div>
                <input
                  type="text"
                  required
                  value={archiveConfirmName}
                  onChange={e => setArchiveConfirmName(e.target.value)}
                  placeholder="Escriba el nombre para confirmar"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Motivo obligatorio del archivado:
                </label>
                <textarea
                  required
                  rows={3}
                  value={archiveReason}
                  onChange={e => setArchiveReason(e.target.value)}
                  placeholder="Indique la justificación (ej. Cliente canceló su deuda y cerró negocio; mudanza, etc.)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setArchiveModalClientId(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isArchiving}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow-lg transition"
                >
                  {isArchiving ? 'Archivando...' : 'Confirmar Archivado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section 1.1: Modal Confirmar Mover a Papelera */}
      {trashModalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-rose-700/80 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100 text-xs space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Mover Cliente a la Papelera</h3>
                <p className="text-[11px] text-rose-300">Retiro operativo temporal</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Nombre del cliente:</span>
                <strong className="text-white">{trashModalClient.fullName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Créditos asociados:</span>
                <span className="font-bold text-blue-300">
                  {database.credits.filter(c => c.clientId === trashModalClient.id).length} crédito(s)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cobrador asignado:</span>
                <span className="text-slate-200">{trashModalClient.assignedCollectorName || 'Sin asignar'}</span>
              </div>
            </div>

            <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Advertencia de Papelera:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                El cliente desaparecerá del listado principal y de las rutas de cobro. Se moverá al apartado <strong>Papelera</strong>, donde permanecerá durante <strong>7 días</strong>. Durante este plazo usted podrá restaurarlo en cualquier momento antes de la purga programada.
              </p>
            </div>

            {trashError && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{trashError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteTrash} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Motivo del retiro (opcional):
                </label>
                <input
                  type="text"
                  value={trashReason}
                  onChange={e => setTrashReason(e.target.value)}
                  placeholder="Ej. Ingresado por error; cliente no formalizó préstamo..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTrashModalClient(null)}
                  disabled={isTrashing}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isTrashing}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isTrashing ? 'Moviendo...' : 'Mover a Papelera'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
