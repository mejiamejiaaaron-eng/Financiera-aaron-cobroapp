import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarDays,
  AlertTriangle,
  Receipt,
  RotateCcw,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
  X,
  History,
  Smartphone,
  Trash2,
  KeyRound,
  Table,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp, AppView } from '../../context/AppContext';
import { ChangePasswordModal } from './ChangePasswordModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogoutModal: () => void;
  onOpenDeployGuide: () => void;
}

export const Sidebar: React.FC<Props> = ({
  isOpen,
  onClose,
  onOpenLogoutModal,
  onOpenDeployGuide,
}) => {
  const { currentUser, isAdmin, hasPermission } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const {
    currentView,
    setCurrentView,
    metrics,
    setIsAddCreditModalOpen,
    setIsQuickSearchOpen,
    database,
  } = useApp();

  const handleSelectView = (view: AppView) => {
    setCurrentView(view);
    onClose();
  };

  const navItems = [
    {
      id: 'dashboard',
      label: '1. Inicio',
      icon: LayoutDashboard,
      allowed: true,
      badge: null,
    },
    {
      id: 'clients',
      label: '2. Clientes',
      icon: Users,
      allowed: hasPermission('canViewClients'),
      badge: metrics.totalClients,
    },
    {
      id: 'add-credit-action',
      label: '3. Añadir cliente / Registrar crédito',
      icon: UserPlus,
      allowed: hasPermission('canAddClientsAndCredits'),
      isAction: true,
      highlight: true,
    },
    {
      id: 'daily-collections',
      label: '4. Cobros del día',
      icon: CalendarDays,
      allowed: hasPermission('canViewDailyCollections'),
      badge: metrics.clientsDueTodayCount > 0 ? metrics.clientsDueTodayCount : null,
      badgeColor: 'bg-blue-600',
    },
    {
      id: 'overdue',
      label: '5. Clientes en mora',
      icon: AlertTriangle,
      allowed: hasPermission('canViewOverdue'),
      badge: metrics.clientsInOverdueCount > 0 ? metrics.clientsInOverdueCount : null,
      badgeColor: 'bg-rose-600',
    },
    {
      id: 'payments',
      label: '6. Pagos y abonos',
      icon: Receipt,
      allowed: hasPermission('canRegisterPayments'),
      badge: null,
    },
    {
      id: 'reversions',
      label: '7. Solicitudes de reversión',
      icon: RotateCcw,
      allowed: isAdmin || hasPermission('canApproveReversion') || hasPermission('canRequestReversion'),
      badge: metrics.pendingReversionsCount > 0 ? metrics.pendingReversionsCount : null,
      badgeColor: 'bg-amber-600 animate-pulse',
    },
    {
      id: 'reports',
      label: '8. Reportes',
      icon: BarChart3,
      allowed: isAdmin || hasPermission('canViewReports'),
      badge: null,
    },
    {
      id: 'users',
      label: '9. Usuarios y permisos',
      icon: ShieldCheck,
      allowed: isAdmin || hasPermission('canManageUsers'),
      badge: null,
    },
    {
      id: 'settings',
      label: '10. Configuración',
      icon: Settings,
      allowed: isAdmin || hasPermission('canAccessSettings'),
      badge: null,
    },
    {
      id: 'audit',
      label: 'Historial y Auditoría',
      icon: History,
      allowed: isAdmin || hasPermission('canViewFinancialHistory'),
      badge: null,
    },
    {
      id: 'trash',
      label: 'Papelera de Clientes',
      icon: Trash2,
      allowed: isAdmin,
      badge: database.clients.filter(c => c.inTrash).length > 0 ? database.clients.filter(c => c.inTrash).length : null,
      badgeColor: 'bg-rose-600',
    },
    {
      id: 'popular-credits',
      label: 'Tabla Créditos Populares',
      icon: Table,
      allowed: true,
      badge: 'Tabla Oficial',
      badgeColor: 'bg-emerald-600 text-white',
    },
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 p-0.5 shadow-lg shadow-blue-900/50 flex items-center justify-center shrink-0">
              <img
                src="/icon.svg"
                alt="Logo"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-wide">
                {database.settings.businessName}
              </h1>
              <p className="text-[11px] text-blue-400 font-medium">
                CobrosApp v2.4 (PWA)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl ${
              currentUser?.avatarColor || 'bg-blue-600'
            } flex items-center justify-center text-white font-bold text-sm shadow`}
          >
            {currentUser?.name.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {currentUser?.name}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {currentUser?.email}
            </p>
            <span className="inline-block mt-0.5 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
              {currentUser?.role === 'admin' ? 'Administrador' : 'Cobrador'}
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {/* Botón de Búsqueda Rápida de Clientes */}
          <div className="pb-2">
            <button
              type="button"
              onClick={() => {
                setIsQuickSearchOpen(true);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/50 rounded-xl text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer shadow-xs group"
              title="Buscar cliente por nombre..."
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                <span>Buscar cliente...</span>
              </div>
              <kbd className="text-[10px] bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {navItems.map(item => {
            if (!item.allowed) return null;

            if (item.isAction) {
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setIsAddCreditModalOpen(true);
                    onClose();
                  }}
                  className="w-full mt-2 mb-2 flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-900/40 transition group"
                >
                  <item.icon className="w-4 h-4 text-white group-hover:scale-110 transition-transform shrink-0" />
                  <span className="truncate text-left">{item.label}</span>
                </button>
              );
            }

            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectView(item.id as AppView)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <item.icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate text-left">{item.label}</span>
                </div>

                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ml-2 ${
                      item.badgeColor || 'bg-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick link to Android deployment guide */}
          <div className="pt-3 pb-1">
            <button
              onClick={() => {
                onOpenDeployGuide();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/60 transition"
            >
              <Smartphone className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="truncate text-left">Instalar App Android (PWA)</span>
            </button>
          </div>
        </nav>

        {/* Section 11: Acciones de Cuenta y Cerrar Sesión */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-1.5">
          <button
            onClick={() => {
              onClose();
              setIsChangePasswordOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-300 hover:text-white hover:bg-blue-600/20 border border-blue-900/40 transition cursor-pointer"
          >
            <KeyRound className="w-4 h-4 shrink-0 text-blue-400" />
            <span>Actualizar mi contraseña</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenLogoutModal();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-900/30 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Modal para actualizar la contraseña propia */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </>
  );
};
