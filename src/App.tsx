import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { ReceiptModal } from './components/common/ReceiptModal';
import { AddClientCreditModal } from './components/credits/AddClientCreditModal';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/dashboard/DashboardView';
import { ClientsView } from './components/clients/ClientsView';
import { DailyCollectionsView } from './components/collections/DailyCollectionsView';
import { OverdueView } from './components/overdue/OverdueView';
import { PaymentsView } from './components/payments/PaymentsView';
import { ReversionRequestsView } from './components/reversions/ReversionRequestsView';
import { ReportsView } from './components/reports/ReportsView';
import { UsersView } from './components/users/UsersView';
import { SettingsView } from './components/settings/SettingsView';
import { AuditView } from './components/audit/AuditView';
import { TrashView } from './components/trash/TrashView';
import { CollectorHistoryView } from './components/collector/CollectorHistoryView';
import { MyAccountView } from './components/collector/MyAccountView';
import { PopularCreditsView } from './components/credits/PopularCreditsView';
import { CollectorBottomNav } from './components/common/CollectorBottomNav';
import { AdminCodeViewerModal } from './components/common/AdminCodeViewerModal';
import { QuickSearchModal } from './components/common/QuickSearchModal';
import { FloatingPaymentButton } from './components/common/FloatingPaymentButton';
import { ClientDossierModal } from './components/clients/ClientDossierModal';
import { LogOut, AlertTriangle, Code2 } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, logout, currentUser, isCollector } = useAuth();
  const {
    currentView,
    setCurrentView,
    activeReceiptModalPayment,
    setActiveReceiptModalPayment,
    isAddCreditModalOpen,
    setIsAddCreditModalOpen,
    isQuickSearchOpen,
    setIsQuickSearchOpen,
    selectedClientIdForDossier,
    setSelectedClientIdForDossier,
  } = useApp();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAdminCodeModalOpen, setIsAdminCodeModalOpen] = useState(false);

  // Atajo de teclado para abrir el buscador (Ctrl+K o Cmd+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsQuickSearchOpen]);

  // If unauthenticated, show secure login screen
  if (!isAuthenticated) {
    return <LoginView />;
  }

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* PWA Install Alert Banner at top */}
      <PWAInstallBanner onOpenDeployGuide={() => setCurrentView('settings')} />

      {/* Top Header */}
      <Header
        onToggleSidebar={() => setIsSidebarOpen(true)}
        onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
        onOpenDeployGuide={() => setCurrentView('settings')}
      />

      {/* Main Layout */}
      <div className="flex-1 flex">
        {/* Navigation Sidebar Drawer */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
          onOpenDeployGuide={() => setCurrentView('settings')}
        />

        {/* View Content Canvas */}
        <main className={`flex-1 lg:pl-72 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-all ${isCollector ? 'pb-24 lg:pb-8' : ''}`}>
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'clients' && <ClientsView />}
          {currentView === 'daily-collections' && <DailyCollectionsView />}
          {currentView === 'overdue' && <OverdueView />}
          {currentView === 'payments' && <PaymentsView />}
          {currentView === 'reversions' && <ReversionRequestsView />}
          {currentView === 'reports' && <ReportsView />}
          {currentView === 'users' && <UsersView />}
          {currentView === 'settings' && <SettingsView />}
          {currentView === 'audit' && <AuditView />}
          {currentView === 'trash' && <TrashView />}
          {currentView === 'popular-credits' && <PopularCreditsView />}
          {currentView === 'collector-history' && <CollectorHistoryView />}
          {currentView === 'my-account' && (
            <MyAccountView onOpenLogoutModal={() => setIsLogoutModalOpen(true)} />
          )}
        </main>
      </div>

      {/* Collector Bottom Navigation Bar (Mobile) */}
      <CollectorBottomNav />

      {/* Unified Add Client / Loan Modal (Prompt Section 4) */}
      <AddClientCreditModal
        isOpen={isAddCreditModalOpen}
        onClose={() => setIsAddCreditModalOpen(false)}
      />

      {/* Modal de Búsqueda Rápida de Clientes y Pagos */}
      <QuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
      />

      {/* Active Thermal Ticket Receipt Modal */}
      {activeReceiptModalPayment && (
        <ReceiptModal
          payment={activeReceiptModalPayment}
          onClose={() => setActiveReceiptModalPayment(null)}
        />
      )}

      {/* Modal Global de Expediente de Cliente Imprimible */}
      {selectedClientIdForDossier && (
        <ClientDossierModal
          clientId={selectedClientIdForDossier}
          onClose={() => setSelectedClientIdForDossier(null)}
          onOpenArchiveModal={() => {
            setSelectedClientIdForDossier(null);
            setCurrentView('clients');
          }}
        />
      )}

      {/* Botón Flotante Movible en Toda la Pantalla con la Opción "Pagar" */}
      <FloatingPaymentButton
        onOpenPaymentSearch={() => setIsQuickSearchOpen(true)}
      />

      {/* Logout Confirmation Modal (Prompt Section 12) */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-slate-100 text-xs space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <LogOut className="w-6 h-6" />
              <div>
                <h3 className="text-base font-bold text-white">Cerrar Sesión</h3>
                <p className="text-[11px] text-slate-400">
                  {currentUser?.name} ({currentUser?.role === 'admin' ? 'Administrador' : 'Cobrador'})
                </p>
              </div>
            </div>

            <p className="text-slate-300 leading-relaxed">
              ¿Está seguro de que desea salir del sistema financiero? Se cerrará la sesión de forma segura y se limpiarán las credenciales temporales.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow transition"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón Secreto de Administrador: Código de la App (admin123) */}
      <div className="fixed bottom-2 right-2 z-40 opacity-70 hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => setIsAdminCodeModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 text-slate-400 hover:text-amber-300 rounded-lg text-[11px] font-mono shadow-lg cursor-pointer transition backdrop-blur-xs group"
          title="Acceso Administrador: Código de la app (admin123)"
        >
          <Code2 className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span>Código de la app</span>
        </button>
      </div>

      {/* Modal Visor/Editor de Código con Contraseña admin123 */}
      <AdminCodeViewerModal
        isOpen={isAdminCodeModalOpen}
        onClose={() => setIsAdminCodeModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </AuthProvider>
  );
}
