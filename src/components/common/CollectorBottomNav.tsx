import React from 'react';
import {
  Home,
  Users,
  Wallet,
  Receipt,
  User as UserIcon,
} from 'lucide-react';
import { useApp, AppView } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export const CollectorBottomNav: React.FC = () => {
  const { currentView, setCurrentView, metrics, todayInstallments } = useApp();
  const { isCollector, currentUser } = useAuth();

  // Only render for collectors
  if (!isCollector) {
    return null;
  }

  const navButtons: Array<{
    id: AppView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
  }> = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: Home,
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: Users,
      badge: metrics.totalClients > 0 ? metrics.totalClients : null,
    },
    {
      id: 'payments',
      label: 'Cobrar',
      icon: Wallet,
      badge: metrics.clientsDueTodayCount > 0 ? metrics.clientsDueTodayCount : null,
    },
    {
      id: 'collector-history',
      label: 'Historial',
      icon: Receipt,
    },
    {
      id: 'my-account',
      label: 'Mi cuenta',
      icon: UserIcon,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-[env(safe-area-inset-bottom)] shadow-2xl lg:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navButtons.map(item => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-colors ${
                isActive
                  ? 'text-blue-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-blue-400' : ''} transition-transform`} />
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2.5 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-[64px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
