export type UserRole = 'admin' | 'collector';

export interface UserPermissions {
  canViewClients: boolean;
  canSearchClients: boolean;
  canViewDossier: boolean;
  canViewDailyCollections: boolean;
  canViewOverdue: boolean;
  canRegisterPayments: boolean;
  canRegisterPartialPayments: boolean;
  canAddClientsAndCredits: boolean;
  canArchiveClients: boolean;
  canDeleteClients: boolean;
  canRequestReversion: boolean;
  canApproveReversion: boolean;
  canViewReports: boolean;
  canViewAllClients: boolean;
  canViewOnlyAssignedClients: boolean;
  canViewFinancialHistory: boolean;
  canManageUsers: boolean;
  canChangeBranding: boolean;
  canAccessSettings: boolean;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  name: string;
  role: UserRole;
  phone?: string;
  password?: string;
  active: boolean;
  permissions: UserPermissions;
  createdAt: string;
  lastLoginAt?: string;
  avatarColor?: string;
}

export type ClientOperationalStatus = 'active' | 'in_trash' | 'archived' | 'liquidated';
export type DeletionStatus = 'in_trash' | 'purged' | 'archived_financial_safety';

export interface Client {
  id: string;
  fullName: string;
  dui: string; // Documento Único de Identidad (El Salvador, formato 00000000-0)
  phone: string;
  address: string;
  personalReferences: string;
  assignedCollectorId: string;
  assignedCollectorName: string;
  // Specific assignment tracking
  assignedTo?: string; // Collector ID
  assignedAt?: string;
  assignedBy?: string; // Admin who assigned
  registerDate: string;
  notes: string;
  isArchived: boolean;
  archivedReason?: string;
  archivedAt?: string;
  archivedBy?: string;
  // Section 1 & 5: Trash (Papelera) & Safe Auto-Purge fields
  status?: ClientOperationalStatus;
  inTrash?: boolean;
  deletedAt?: string; // When moved to trash
  purgeAt?: string; // 7 days after deletedAt
  deletedBy?: string; // Admin ID / name
  deletionReason?: string;
  deletionStatus?: DeletionStatus;
  restoredAt?: string;
  restoredBy?: string;
  updatedAt?: string;
}

export interface AssignmentLog {
  id: string;
  clientId: string;
  clientName: string;
  previousCollectorId: string;
  previousCollectorName: string;
  newCollectorId: string;
  newCollectorName: string;
  assignedById: string;
  assignedByName: string;
  assignedAt: string;
  reason?: string;
}

export type PaymentModality = 'diario' | 'semanal' | 'quincenal' | 'mensual';
export type InterestType = 'fijo' | 'simple' | 'sobre_saldo';
export type CreditStatus = 'active' | 'liquidated' | 'overdue';

export interface Credit {
  id: string;
  creditNumber: string; // e.g., CR-1001
  clientId: string;
  clientName: string;
  clientDui: string;
  clientPhone: string;
  clientAddress: string;
  principal: number; // Capital prestado
  interestRate: number; // Porcentaje, ej. 20%
  interestType: InterestType;
  totalInterest: number;
  totalAmountToPay: number; // Capital + Interés
  modality: PaymentModality;
  totalInstallments: number; // Número de cuotas
  installmentAmount: number; // Importe de cada cuota estándar (SSOT)
  lastInstallmentAmount?: number; // Importe de la última cuota con ajuste estricto de centavos (SSOT)
  startDate: string; // YYYY-MM-DD
  firstDueDate: string; // YYYY-MM-DD
  finalDueDate: string; // YYYY-MM-DD
  status: CreditStatus;
  balancePending: number;
  totalPaid: number;
  notes: string;
  assignedCollectorId: string;
  assignedCollectorName: string;
  createdAt: string;
}

export type InstallmentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export interface Installment {
  id: string;
  creditId: string;
  clientId: string;
  installmentNumber: number;
  dueDate: string; // YYYY-MM-DD
  scheduledAmount: number; // Monto programado para esta cuota (SSOT)
  paidAmount: number;
  balance: number;
  status: InstallmentStatus;
  daysOverdue: number;
  lastPaymentDate?: string;
  isLastInstallment?: boolean; // Indica si es la última cuota que absorbe el redondeo
}

export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Chivo Wallet / Bitcoin' | 'Tigo Money' | 'Otro';

export interface Payment {
  id: string;
  receiptNumber: string; // e.g., REC-2026-0042
  creditId: string;
  clientId: string;
  clientName: string;
  installmentId: string;
  installmentNumber: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  scheduledAmount: number;
  receivedAmount: number;
  installmentRemainingBalance: number;
  creditRemainingBalance: number;
  collectorId: string;
  collectorName: string;
  paymentMethod: PaymentMethod;
  notes: string;
  isReversed: boolean;
  reversionId?: string;
  createdAt: string;
  appliedBreakdown?: { installmentId: string; installmentNumber: number; amount: number }[];
}

export type ReversionStatus = 'pending' | 'approved' | 'rejected';

export interface ReversionRequest {
  id: string;
  paymentId: string;
  receiptNumber: string;
  clientId: string;
  clientName: string;
  creditId: string;
  amount: number;
  paymentDate: string;
  requestedById: string;
  requestedByName: string;
  reason: string; // Obligatorio
  requestedAt: string;
  status: ReversionStatus;
  reviewedById?: string;
  reviewedByName?: string;
  adminNotes?: string;
  reviewedAt?: string;
}

export interface ReversionRecord {
  id: string;
  requestId: string;
  originalPaymentId: string;
  receiptNumber: string;
  clientId: string;
  creditId: string;
  amountReversed: number;
  reason: string;
  requestedByName: string;
  approvedByName: string;
  approvedAt: string;
  adminNotes: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  targetType: 'client' | 'credit' | 'payment' | 'reversion' | 'user' | 'config' | 'auth' | 'trash' | 'assignment';
  targetId: string;
  details: string;
  reason?: string;
}

export interface AssignmentLog {
  id: string;
  clientId: string;
  clientName: string;
  previousCollectorId: string;
  previousCollectorName: string;
  newCollectorId: string;
  newCollectorName: string;
  assignedById: string;
  assignedByName: string;
  assignedAt: string;
  reason?: string;
}

export interface AppSettings {
  businessName: string;
  brandSubtitle: string;
  logoUrl: string;
  currencySymbol: string;
  currencyCode: string;
  timezone: string; // 'America/El_Salvador'
  contactPhone: string;
  contactAddress: string;
  receiptNotice: string;
  defaultInterestRate: number;
  defaultModality: PaymentModality;
}
