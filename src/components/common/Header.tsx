import React, { useState } from 'react';
import {
  Menu,
  Shield,
  UserCheck,
  LogOut,
  PlusCircle,
  WifiOff,
  ChevronDown,
  Sparkles,
  KeyRound,
  Table,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { ChangePasswordModal } from './ChangePasswordModal';

interface Props {
  onToggleSidebar: () => void;
  onOpenLogoutModal: () => void;
  onOpenDeployGuide: () => void;
}

export const Header: React.FC<Props> = ({ onToggleSidebar, onOpenLogoutModal, onOpenDeployGuide }) => {
  const { currentUser, isAdmin, switchUserSimulated, usersList, hasPermission } = useAuth();
  const { database, setIsAddCreditModalOpen, currentView, setCurrentView, setIsQuickSearchOpen } = useApp();
  const isOnline = useOnlineStatus();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const canAddCredit = hasPermission('canAddClientsAndCredits');

  const viewTitles: Record<string, string> = {
    dashboard: 'Panel Principal',
    clients: 'Directorio de Clientes',
    'daily-collections': 'Cobros del Día',
    overdue: 'Clientes en Mora',
    payments: 'Registro de Pagos y Abonos',
    reversions: 'Solicitudes de Reversión',
    reports: 'Reportes Financieros',
    users: 'Usuarios y Permisos',
    settings: 'Configuración y Publicación',
    audit: 'Auditoría del Sistema',
    'popular-credits': 'Tabla de Créditos Populares',
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Mobile menu button & brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 p-0.5 shadow-md shadow-blue-900/40 flex items-center justify-center shrink-0">
              {database.settings.logoUrl && database.settings.logoUrl.startsWith('data:image') ? (
                <img
                  src={database.settings.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-cover rounded-[10px]"
                />
              ) : (
                <img
                  src="/icon.svg"
                  alt="Logo"
                  className="w-7 h-7 object-contain"
                />
              )}
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm tracking-wide">
                  {database.settings.businessName}
                </span>
                <span className="text-[10px] uppercase font-bold bg-blue-950 text-blue-300 border border-blue-800/80 px-1.5 py-0.2 rounded">
                  CobrosApp
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {viewTitles[currentView] || 'Sistema Financiero'}
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Offline warning badge if offline */}
          {!isOnline && (
            <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-medium animate-pulse">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Modo Sin Conexión (Offline)</span>
            </div>
          )}

          {/* Quick Add Client / Loan Button */}
          {canAddCredit && (
            <button
              onClick={() => setIsAddCreditModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3 py-2 rounded-xl transition shadow-sm shadow-blue-600/30"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden md:inline">Añadir cliente / Registrar crédito</span>
              <span className="md:hidden">Nuevo Crédito</span>
            </button>
          )}

          {/* Tabla de Créditos Populares Button */}
          <button
            onClick={() => setCurrentView('popular-credits')}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-xl transition ${
              currentView === 'popular-credits'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-800/60'
            }`}
            title="Ver Tabla Oficial de Créditos Populares"
          >
            <Table className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Tabla Oficial</span>
          </button>

          {/* Quick Client Search Button */}
          <button
            onClick={() => setIsQuickSearchOpen(true)}
            className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs group"
            title="Buscar cliente por nombre (Abrir barra de búsqueda)"
          >
            <Search className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Buscar</span>
          </button>

          {/* Quick Deploy / Independent App Button */}
          <button
            onClick={onOpenDeployGuide}
            className="hidden sm:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-800/60 text-xs px-2.5 py-2 rounded-xl transition"
            title="Guía para tener tu propia URL y PWA independiente"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Publicar PWA</span>
          </button>

          {/* User selector & Profile menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-left transition"
            >
              <div
                className={`w-7 h-7 rounded-lg ${
                  currentUser?.avatarColor || 'bg-blue-600'
                } flex items-center justify-center text-white font-bold text-xs shrink-0 shadow`}
              >
                {currentUser?.name.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block leading-tight pr-1">
                <div className="text-xs font-semibold text-white truncate max-w-[130px]">
                  {currentUser?.name}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  {isAdmin ? (
                    <span className="text-amber-400 font-medium flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" /> Administrador
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                      <UserCheck className="w-2.5 h-2.5" /> Cobrador
                    </span>
                  )}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Dropdown for role switching & logout */}
            {showUserDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-xs text-slate-200">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="font-semibold text-white">{currentUser?.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser?.email}</p>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300 border border-blue-800/60 font-semibold uppercase">
                      Rol: {currentUser?.role === 'admin' ? 'Administrador Principal' : 'Cobrador Autorizado'}
                    </span>
                  </div>

                  {/* Switch user selector for testing permissions */}
                  <div className="py-2 px-1 border-b border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                      Probar rol en vivo:
                    </p>
                    <div className="space-y-1">
                      {usersList.map(u => (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchUserSimulated(u.id);
                            setShowUserDropdown(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition ${
                            u.id === currentUser?.id
                              ? 'bg-blue-600/30 text-blue-200 font-semibold'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="truncate">{u.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0 capitalize">
                            {u.role === 'admin' ? 'Admin' : 'Cobrador'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-1 space-y-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        setIsChangePasswordOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-blue-300 hover:bg-blue-500/10 rounded-xl transition font-medium text-left cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-blue-400" />
                      <span>Actualizar Mi Contraseña</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenLogoutModal();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition font-medium cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal para actualizar la propia contraseña */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </header>
  );
};
