import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  AppSettings,
  AuditLog,
  Client,
  Credit,
  Installment,
  Payment,
  PaymentMethod,
  ReversionRequest,
  User,
} from '../types';
import {
  AppDatabase,
  loadDatabase,
  saveDatabase,
  recordPaymentTransaction,
  updatePaymentReceipt,
  requestPaymentReversion,
  approvePaymentReversion,
  rejectPaymentReversion,
  archiveClient,
  addClientAndCredit,
  updateAppSettings,
  saveUser,
  resetDatabaseToDemo,
  clearAllDemoData,
  moveClientToTrash,
  restoreClientFromTrash,
  permanentDeleteOrSafePurgeClient,
  assignClientsToCollector,
  reassignSingleClient,
} from '../services/storage';
import { useAuth } from './AuthContext';
import { getElSalvadorDate } from '../utils/dateUtils';
import { refreshInstallmentStatus } from '../utils/financialCalculations';

export type AppView =
  | 'dashboard'
  | 'clients'
  | 'add-credit'
  | 'daily-collections'
  | 'overdue'
  | 'payments'
  | 'reversions'
  | 'reports'
  | 'users'
  | 'settings'
  | 'audit'
  | 'trash'
  | 'popular-credits'
  | 'my-account'
  | 'collector-history';

interface FinancialMetrics {
  totalClients: number;
  totalActiveCredits: number;
  totalMoneyLent: number;
  totalMoneyCollected: number;
  totalBalancePending: number;
  totalCollectedToday: number;
  clientsDueTodayCount: number;
  clientsInOverdueCount: number;
  pendingReversionsCount: number;
  liquidatedCreditsCount: number;
  trashCount: number;
}

interface AppContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  database: AppDatabase;
  metrics: FinancialMetrics;
  recentPayments: Payment[];
  todayInstallments: Array<{ installment: Installment; client: Client; credit: Credit }>;
  overdueInstallments: Array<{ installment: Installment; client: Client; credit: Credit }>;
  activeReceiptModalPayment: Payment | null;
  setActiveReceiptModalPayment: (payment: Payment | null) => void;
  isAddCreditModalOpen: boolean;
  setIsAddCreditModalOpen: (open: boolean) => void;
  selectedClientIdForDossier: string | null;
  setSelectedClientIdForDossier: (clientId: string | null) => void;
  isQuickSearchOpen: boolean;
  setIsQuickSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  syncStatus: 'synced' | 'saving' | 'offline' | 'pending';
  // Actions
  handleRecordPayment: (params: {
    creditId: string;
    installmentId: string;
    receivedAmount: number;
    paymentMethod: PaymentMethod;
    notes: string;
    customDate?: string;
    customTime?: string;
  }) => Promise<Payment>;
  handleUpdatePaymentReceipt: (params: {
    paymentId: string;
    receiptNumber?: string;
    date?: string;
    time?: string;
    paymentMethod?: PaymentMethod;
    notes?: string;
    collectorName?: string;
  }) => Promise<Payment>;
  handleRequestReversion: (paymentId: string, reason: string) => Promise<void>;
  handleApproveReversion: (requestId: string, adminNotes: string) => Promise<void>;
  handleRejectReversion: (requestId: string, adminNotes: string) => Promise<void>;
  handleArchiveClient: (clientId: string, confirmName: string, reason: string) => Promise<void>;
  handleAddClientAndCredit: (params: {
    clientData: {
      fullName: string;
      dui: string;
      phone: string;
      address: string;
      personalReferences: string;
      assignedCollectorId: string;
      notes: string;
    };
    creditData: {
      principal: number;
      interestRate: number;
      interestType?: 'fijo' | 'simple' | 'sobre_saldo';
      modality: 'diario' | 'semanal' | 'quincenal' | 'mensual';
      totalInstallments: number;
      installmentAmount?: number;
      customInstallmentAmount?: number;
      totalAmountToPay?: number;
      totalInterest?: number;
      startDate: string;
      firstDueDate: string;
      notes: string;
    };
  }) => Promise<{ client: Client; credit: Credit }>;
  handleUpdateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  handleSaveUser: (userData: Partial<User> & { name: string; email: string; role: 'admin' | 'collector'; password?: string; username?: string }) => Promise<void>;
  handleResetDemo: () => void;
  handleClearToCleanState: () => void;
  exportDatabaseJson: () => void;
  importDatabaseJson: (jsonString: string) => void;
  // Section 1: Papelera Handlers
  handleMoveToTrash: (clientId: string, reason?: string) => Promise<void>;
  handleRestoreFromTrash: (clientId: string) => Promise<void>;
  handlePermanentDeleteOrSafePurge: (clientId: string) => Promise<void>;
  // Section 2: Asignación y Reasignación de Clientes
  handleAssignClientsToCollector: (collectorId: string, clientIds: string[], reason?: string) => Promise<void>;
  handleReassignSingleClient: (clientId: string, newCollectorId: string, reason?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, reloadUsers } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [database, setDatabase] = useState<AppDatabase>(() => loadDatabase());
  const [activeReceiptModalPayment, setActiveReceiptModalPayment] = useState<Payment | null>(null);
  const [isAddCreditModalOpen, setIsAddCreditModalOpen] = useState(false);
  const [selectedClientIdForDossier, setSelectedClientIdForDossier] = useState<string | null>(null);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline' | 'pending'>('synced');

  // Real-time synchronization across browser tabs and devices (Section 4)
  useEffect(() => {
    const handleSync = () => {
      const refreshed = loadDatabase();
      setDatabase(refreshed);
      setSyncStatus('synced');
    };

    window.addEventListener('cobrosapp_database_updated', handleSync);
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('cobrosapp_')) {
        handleSync();
      }
    });

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('cobrosapp_realtime_sync');
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'DB_SYNC') {
          handleSync();
        }
      };
    } catch {
      // Optional fallback
    }

    return () => {
      window.removeEventListener('cobrosapp_database_updated', handleSync);
      if (bc) bc.close();
    };
  }, []);

  const today = getElSalvadorDate();

  // Role portfolio restriction filter helper (Section 2.4):
  // If user is a collector, restrict to assigned portfolio only unless admin.
  const isCollectorRestricted = currentUser?.role === 'collector' && !currentUser?.permissions.canViewAllClients;

  // Filtered operational clients (excluding trash and archived from main routes)
  const operationalClients = useMemo(() => {
    return database.clients.filter(c => {
      if (c.inTrash) return false;
      if (c.isArchived) return false;
      if (isCollectorRestricted && currentUser) {
        return c.assignedCollectorId === currentUser.id || c.assignedTo === currentUser.id;
      }
      return true;
    });
  }, [database.clients, isCollectorRestricted, currentUser]);

  // Today's installments in El Salvador
  const todayInstallments = useMemo(() => {
    const clientsMap = new Map(database.clients.map(c => [c.id, c]));
    const creditsMap = new Map(database.credits.map(c => [c.id, c]));

    return database.installments
      .filter(inst => inst.dueDate === today)
      .map(inst => {
        const client = clientsMap.get(inst.clientId);
        const credit = creditsMap.get(inst.creditId);
        return { installment: inst, client: client!, credit: credit! };
      })
      .filter(item => {
        if (!item.client || !item.credit) return false;
        if (item.client.isArchived || item.client.inTrash) return false;
        if (isCollectorRestricted && currentUser) {
          return item.client.assignedCollectorId === currentUser.id || item.credit.assignedCollectorId === currentUser.id;
        }
        return true;
      });
  }, [database, today, isCollectorRestricted, currentUser]);

  // Overdue installments
  const overdueInstallments = useMemo(() => {
    const clientsMap = new Map(database.clients.map(c => [c.id, c]));
    const creditsMap = new Map(database.credits.map(c => [c.id, c]));

    return database.installments
      .filter(inst => inst.status === 'overdue' && inst.balance > 0.001)
      .map(inst => {
        const client = clientsMap.get(inst.clientId);
        const credit = creditsMap.get(inst.creditId);
        return { installment: inst, client: client!, credit: credit! };
      })
      .filter(item => {
        if (!item.client || !item.credit) return false;
        if (item.client.isArchived || item.client.inTrash) return false;
        if (isCollectorRestricted && currentUser) {
          return item.client.assignedCollectorId === currentUser.id || item.credit.assignedCollectorId === currentUser.id;
        }
        return true;
      });
  }, [database, isCollectorRestricted, currentUser]);

  // Real financial metrics
  const metrics = useMemo<FinancialMetrics>(() => {
    const nonArchivedClients = database.clients.filter(c => {
      if (c.inTrash || c.isArchived) return false;
      if (isCollectorRestricted && currentUser) {
        return c.assignedCollectorId === currentUser.id || c.assignedTo === currentUser.id;
      }
      return true;
    });

    const activeCredits = database.credits.filter(c => {
      if (c.status !== 'active' && c.status !== 'overdue') return false;
      if (isCollectorRestricted && currentUser) {
        return c.assignedCollectorId === currentUser.id;
      }
      return true;
    });

    const liquidatedCredits = database.credits.filter(c => {
      if (c.status !== 'liquidated') return false;
      if (isCollectorRestricted && currentUser) {
        return c.assignedCollectorId === currentUser.id;
      }
      return true;
    });

    const totalMoneyLent = database.credits
      .filter(c => !isCollectorRestricted || c.assignedCollectorId === currentUser?.id)
      .reduce((acc, c) => acc + c.principal, 0);

    // Sum of valid (non-reversed) payments for the relevant portfolio
    const totalMoneyCollected = database.payments
      .filter(p => !p.isReversed && (!isCollectorRestricted || p.collectorId === currentUser?.id))
      .reduce((acc, p) => acc + p.receivedAmount, 0);

    const totalBalancePending = activeCredits.reduce((acc, c) => acc + c.balancePending, 0);

    // Money collected today in El Salvador
    const totalCollectedToday = database.payments
      .filter(p => p.date === today && !p.isReversed && (!isCollectorRestricted || p.collectorId === currentUser?.id))
      .reduce((acc, p) => acc + p.receivedAmount, 0);

    // Clients due today (unique clients having pending installments today)
    const dueTodayClientIds = new Set(
      todayInstallments.filter(i => i.installment.balance > 0.001).map(i => i.client.id)
    );

    // Clients with overdue installments
    const overdueClientIds = new Set(
      overdueInstallments.map(i => i.client.id)
    );

    const pendingReversionsCount = database.reversionRequests.filter(r => r.status === 'pending').length;
    const trashCount = database.clients.filter(c => c.inTrash).length;

    return {
      totalClients: nonArchivedClients.length,
      totalActiveCredits: activeCredits.length,
      totalMoneyLent,
      totalMoneyCollected,
      totalBalancePending,
      totalCollectedToday,
      clientsDueTodayCount: dueTodayClientIds.size,
      clientsInOverdueCount: overdueClientIds.size,
      pendingReversionsCount,
      liquidatedCreditsCount: liquidatedCredits.length,
      trashCount,
    };
  }, [database, today, isCollectorRestricted, currentUser, todayInstallments, overdueInstallments]);

  // Recent payments
  const recentPayments = useMemo(() => {
    const list = isCollectorRestricted && currentUser
      ? database.payments.filter(p => p.collectorId === currentUser.id)
      : database.payments;
    return list.slice(0, 10);
  }, [database.payments, isCollectorRestricted, currentUser]);

  // Actions
  const handleRecordPayment = useCallback(
    async (params: {
      creditId: string;
      installmentId: string;
      receivedAmount: number;
      paymentMethod: PaymentMethod;
      notes: string;
      customDate?: string;
      customTime?: string;
    }) => {
      if (!currentUser) throw new Error('Usuario no autenticado.');
      setSyncStatus('saving');
      try {
        const result = recordPaymentTransaction(database, {
          ...params,
          currentUser,
        });
        setDatabase(result.db);
        setActiveReceiptModalPayment(result.payment);
        setSyncStatus('synced');
        return result.payment;
      } catch (err) {
        setSyncStatus('synced');
        throw err;
      }
    },
    [currentUser, database]
  );

  const handleUpdatePaymentReceipt = useCallback(
    async (params: {
      paymentId: string;
      receiptNumber?: string;
      date?: string;
      time?: string;
      paymentMethod?: PaymentMethod;
      notes?: string;
      collectorName?: string;
    }) => {
      if (!currentUser) throw new Error('Usuario no autenticado.');
      setSyncStatus('saving');
      try {
        const result = updatePaymentReceipt(database, {
          ...params,
          currentUser,
        });
        setDatabase(result.db);
        setActiveReceiptModalPayment(result.payment);
        setSyncStatus('synced');
        return result.payment;
      } catch (err) {
        setSyncStatus('synced');
        throw err;
      }
    },
    [currentUser, database]
  );

  const handleRequestReversion = useCallback(
    async (paymentId: string, reason: string) => {
      if (!currentUser) throw new Error('Usuario no autenticado.');
      setSyncStatus('saving');
      try {
        const updated = requestPaymentReversion(database, {
          paymentId,
          reason,
          currentUser,
        });
        setDatabase(updated);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('synced');
        throw err;
      }
    },
    [currentUser, database]
  );

  const handleApproveReversion = useCallback(
    async (requestId: string, adminNotes: string) => {
      if (!currentUser) throw new Error('Usuario no autenticado.');
      setSyncStatus('saving');
      try {
        const updated = approvePaymentReversion(database, {
          requestId,
          adminNotes,
          currentUser,
        });
        setDatabase(updated);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('synced');
        throw err;
      }
    },
    [currentUser, database]
  );

  const handleRejectReversion = useCallback(
    async (requestId: string, adminNotes: string) => {
      if (!currentUser) throw new Error('Usuario no autenticado.');
      setSyncStatus('saving');
      try {
        const updated = rejectPaymentReversion(database, {
          requestId,
          adminNotes,
          currentUser,
        });
        setDatabase(updated);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('synced');
        throw err;
      }
    },
    [currentUser, database]
  );

  const handleArchiveClient = useCallback(
    async (clientId: string, confirmName: string, reason: string) => {
      if (!currentUser) throw new Error('Usuario no autenticado.');
      setSyncStatus('saving');
      try {
        const updated = archiveClient(database, {
          clientId,
          confirmName,
          reason,
          currentUser,
        });
        setDatabase(updated);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('synced');
        throw err;
      }
    },
    [currentUser, database]
  );

  const handleAddClientAndCredit = useCallback(
    async (params: {
      clientData: {
        fullName: string;
        dui: string;
        phone: string;
        address: string;
        personalReferences: string;
        assignedCollectorId: string;
        notes: string;
      };
      creditData: {
        principal: number;
        interestRate: number;
        interestType?: 'fijo' | 'simple' | 'sobre_saldo';
        modality: 'diario' | 'semanal' | 'quincenal' | 'mensual';
        totalInstallments: number;
        installmentAmount?: number;
        customInstallmentAmount?: number;
        totalAmountToPay?: number;
        totalInterest?: number;
        startDate: string;
        firstDueDate: string;
        notes: string;
      };
    }) => {
      if (!currentUser) throw new Error('Usuario no autenticado.');
      setSyncStatus('saving');
      try {
        const result = addClientAndCredit(database, {
          ...params,
          currentUser,
        });
        setDatabase(result.db);
        setSyncStatus('synced');
        return { client: result.client, credit: result.credit };
      } catch (err) {
        setSyncStatus('synced');
        throw err;
      }
    },
    [currentUser, database]
  );

  const handleUpdateSettings = useCallback(
    async (settings: Partial<AppSettings>) => {
      if (!currentUser) throw new Error('Usuario no autenticado.');
      setSyncStatus('saving');
      try {
        const updated = updateAppSettings(database, settings, currentUser);
        setDatabase(updated);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('synced');
        throw err;
      }
    },
    [currentUser, database]
  );

  const handleSaveUser = useCallback(
    async (userData: Partial<User> & { name: string; email: string; role: 'admin' | 'collector'; password?: string; username?: string }) => {
      if (!currentUser) throw new Error('Usuario no autenticado.');
      setSyncStatus('saving');
      try {
        const updated = saveUser(database, userData, currentUser);
        setDatabase(updated);
        reloadUsers();
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('synced');
        throw err;
      }
    },
    [currentUser, database, reloadUsers]
  );

  const handleResetDemo = useCallback(() => {
    if (!currentUser) return;
    const reset = resetDatabaseToDemo(currentUser);
    setDatabase(reset);
    reloadUsers();
    setSyncStatus('synced');
  }, [currentUser, reloadUsers]);

  const handleClearToCleanState = useCallback(() => {
    if (!currentUser) return;
    const clean = clearAllDemoData(database, currentUser);
    setDatabase(clean);
    setSyncStatus('synced');
  }, [currentUser, database]);

  // Section 1: Papelera Handlers
  const handleMoveToTrash = useCallback(
    async (clientId: string, reason?: string) => {
      if (!currentUser) throw new Error('Usuario no autenticado.');
      setSyncStatus('saving');
      try {
        const updated = moveClientToTrash(database, {
          clientId,
          reason,
          currentUser,
        });
        setDatabase(updated);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('synced');
        throw err;
      }
    },
    [currentUser, database]
  );

  const handleRestoreFromTrash = useCallback(
    async (clientId: string) => {
      if (!currentUser) throw new Error('Usuario no autenticado.');
      setSyncStatus('saving');
      try {
        const updated = restoreClientFromTrash(database, {
          clientId,
          currentUser,
        });
        setDatabase(updated);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('synced');
        throw err;
      }
    },
    [currentUser, database]
  );

  const handlePermanentDeleteOrSafePurge = useCallback(
    async (clientId: string) => {
      if (!currentUser) throw new Error('Usuario no autenticado.');
      setSyncStatus('saving');
      try {
        const updated = permanentDeleteOrSafePurgeClient(database, {
          clientId,
          currentUser,
        });
        setDatabase(updated);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('synced');
        throw err;
      }
    },
    [currentUser, database]
  );

  // Section 2: Asignación y Reasignación de Clientes
  const handleAssignClientsToCollector = useCallback(
    async (collectorId: string, clientIds: string[], reason?: string) => {
      if (!currentUser) throw new Error('Usuario no autenticado.');
      setSyncStatus('saving');
      try {
        const updated = assignClientsToCollector(database, {
          collectorId,
          clientIds,
          currentUser,
          reason,
        });
        setDatabase(updated);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('synced');
        throw err;
      }
    },
    [currentUser, database]
  );

  const handleReassignSingleClient = useCallback(
    async (clientId: string, newCollectorId: string, reason?: string) => {
      if (!currentUser) throw new Error('Usuario no autenticado.');
      setSyncStatus('saving');
      try {
        const updated = reassignSingleClient(database, {
          clientId,
          newCollectorId,
          currentUser,
          reason,
        });
        setDatabase(updated);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('synced');
        throw err;
      }
    },
    [currentUser, database]
  );

  const exportDatabaseJson = useCallback(() => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(database, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `financiera_aaron_backup_${getElSalvadorDate()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [database]);

  const importDatabaseJson = useCallback(
    (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString) as AppDatabase;
        if (!parsed.clients || !parsed.credits || !parsed.installments) {
          throw new Error('Formato de copia de seguridad inválido.');
        }
        saveDatabase(parsed);
        setDatabase(parsed);
        reloadUsers();
        alert('Copia de seguridad restaurada con éxito.');
      } catch (err: unknown) {
        alert('Error al importar la copia: ' + (err instanceof Error ? err.message : String(err)));
      }
    },
    [reloadUsers]
  );

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        database,
        metrics,
        recentPayments,
        todayInstallments,
        overdueInstallments,
        activeReceiptModalPayment,
        setActiveReceiptModalPayment,
        isAddCreditModalOpen,
        setIsAddCreditModalOpen,
        selectedClientIdForDossier,
        setSelectedClientIdForDossier,
        isQuickSearchOpen,
        setIsQuickSearchOpen,
        syncStatus,
        handleRecordPayment,
        handleUpdatePaymentReceipt,
        handleRequestReversion,
        handleApproveReversion,
        handleRejectReversion,
        handleArchiveClient,
        handleAddClientAndCredit,
        handleUpdateSettings,
        handleSaveUser,
        handleResetDemo,
        handleClearToCleanState,
        exportDatabaseJson,
        importDatabaseJson,
        handleMoveToTrash,
        handleRestoreFromTrash,
        handlePermanentDeleteOrSafePurge,
        handleAssignClientsToCollector,
        handleReassignSingleClient,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
