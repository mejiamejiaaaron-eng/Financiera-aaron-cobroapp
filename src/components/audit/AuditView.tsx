import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Shield,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDateTimeDisplay } from '../../utils/dateUtils';

export const AuditView: React.FC = () => {
  const { database } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');

  const filteredLogs = database.auditLogs.filter(log => {
    if (targetTypeFilter !== 'all' && log.targetType !== targetTypeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        log.userName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.reason && log.reason.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" />
            <span>Historial y Bitácora de Auditoría</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro cronológico inmutable de todas las operaciones realizadas en la financiera
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-300 font-semibold">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>{database.auditLogs.length} eventos registrados</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por usuario, acción, detalle o motivo..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-slate-400 whitespace-nowrap">Tipo:</label>
          <select
            value={targetTypeFilter}
            onChange={e => setTargetTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500 w-full sm:w-auto"
          >
            <option value="all">Todas las categorías</option>
            <option value="payment">Pagos y Abonos</option>
            <option value="reversion">Reversiones</option>
            <option value="credit">Créditos</option>
            <option value="client">Clientes</option>
            <option value="user">Usuarios y Permisos</option>
            <option value="config">Configuración</option>
            <option value="auth">Autenticación</option>
          </select>
        </div>
      </div>

      {/* Audit Log Timeline Table */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No se encontraron eventos en la bitácora con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                  <th className="py-3 px-4 font-semibold">Fecha y Hora</th>
                  <th className="py-3 px-4 font-semibold">Usuario</th>
                  <th className="py-3 px-4 font-semibold">Acción</th>
                  <th className="py-3 px-4 font-semibold">Detalles de la Operación</th>
                  <th className="py-3 px-4 font-semibold">Motivo / Justificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-750">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-750/50 transition">
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {formatDateTimeDisplay(log.timestamp)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{log.userName}</div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {log.userRole === 'admin' ? 'Admin' : 'Cobrador'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold text-blue-300 bg-blue-950/70 border border-blue-900/80 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-200 leading-relaxed max-w-md">
                      {log.details}
                    </td>

                    <td className="py-3 px-4 text-slate-400 italic">
                      {log.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
