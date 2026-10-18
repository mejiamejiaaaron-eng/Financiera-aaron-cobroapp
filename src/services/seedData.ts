import { AppSettings, AuditLog, Client, Credit, Installment, Payment, ReversionRequest, User, UserPermissions } from '../types';
import { getElSalvadorDate, getElSalvadorTimeString } from '../utils/dateUtils';
import { LoanCalculator, calculateLoanSchedule } from '../utils/financialCalculations';

export const ADMIN_PERMISSIONS: UserPermissions = {
  canViewClients: true,
  canSearchClients: true,
  canViewDossier: true,
  canViewDailyCollections: true,
  canViewOverdue: true,
  canRegisterPayments: true,
  canRegisterPartialPayments: true,
  canAddClientsAndCredits: true,
  canArchiveClients: true,
  canDeleteClients: true,
  canRequestReversion: true,
  canApproveReversion: true,
  canViewReports: true,
  canViewAllClients: true,
  canViewOnlyAssignedClients: false,
  canViewFinancialHistory: true,
  canManageUsers: true,
  canChangeBranding: true,
  canAccessSettings: true,
};

export const COLLECTOR_PERMISSIONS: UserPermissions = {
  canViewClients: true,
  canSearchClients: true,
  canViewDossier: true,
  canViewDailyCollections: true,
  canViewOverdue: true,
  canRegisterPayments: true,
  canRegisterPartialPayments: true,
  canAddClientsAndCredits: false,
  canArchiveClients: false,
  canDeleteClients: false,
  canRequestReversion: true,
  canApproveReversion: false,
  canViewReports: false,
  canViewAllClients: false,
  canViewOnlyAssignedClients: true,
  canViewFinancialHistory: false,
  canManageUsers: false,
  canChangeBranding: false,
  canAccessSettings: false,
};

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-1',
    email: 'am0360136@gmail.com',
    username: 'aaron',
    name: 'Aarón Pérez (Admin General)',
    role: 'admin',
    phone: '+503 7234-5678',
    active: true,
    permissions: ADMIN_PERMISSIONS,
    createdAt: '2026-01-10T08:00:00Z',
    avatarColor: 'bg-blue-600',
  },
  {
    id: 'user-collector-1',
    email: 'carlos.cobrador@financieraaaron.com',
    username: 'carlos',
    name: 'Carlos Mendoza (Cobrador Zona Centro)',
    role: 'collector',
    phone: '+503 7112-9843',
    active: true,
    permissions: COLLECTOR_PERMISSIONS,
    createdAt: '2026-02-01T09:00:00Z',
    avatarColor: 'bg-emerald-600',
  },
  {
    id: 'user-collector-2',
    email: 'luis.cobrador@financieraaaron.com',
    username: 'luis',
    name: 'Luis Henríquez (Cobrador Zona Norte)',
    role: 'collector',
    phone: '+503 7890-1234',
    active: true,
    permissions: COLLECTOR_PERMISSIONS,
    createdAt: '2026-02-15T09:00:00Z',
    avatarColor: 'bg-purple-600',
  },
];

export const INITIAL_SETTINGS: AppSettings = {
  businessName: 'FINANCIERA AARON',
  brandSubtitle: 'CobrosApp — Sistema Profesional de Créditos',
  logoUrl: '/icon.svg',
  currencySymbol: '$',
  currencyCode: 'USD',
  timezone: 'America/El_Salvador',
  contactPhone: '+503 2222-3333',
  contactAddress: 'San Salvador, El Salvador, C.A.',
  receiptNotice: 'Gracias por su puntualidad. Este recibo es su comprobante oficial de pago.',
  defaultInterestRate: 20,
  defaultModality: 'diario',
};

export function generateInitialData(): {
  clients: Client[];
  credits: Credit[];
  installments: Installment[];
  payments: Payment[];
  reversionRequests: ReversionRequest[];
  auditLogs: AuditLog[];
} {
  const today = getElSalvadorDate();
  const time = getElSalvadorTimeString();

  const clients: Client[] = [
    {
      id: 'cli-001',
      fullName: 'María Elena Rivas de Campos',
      dui: '02456781-3',
      phone: '+503 7345-6789',
      address: 'Col. Escalón, Pasaje 3 #45, San Salvador',
      personalReferences: 'Hna. Gloria Rivas (7890-1122), Tienda La Bendición',
      assignedCollectorId: 'user-collector-1',
      assignedCollectorName: 'Carlos Mendoza',
      registerDate: '2026-03-01',
      notes: 'Cliente puntual, negocio de venta de abarrotes.',
      isArchived: false,
    },
    {
      id: 'cli-002',
      fullName: 'José Mauricio Hernández Gómez',
      dui: '03891244-9',
      phone: '+503 7122-8899',
      address: 'Barrio El Centro, 4a Av. Sur #12, Soyapango',
      personalReferences: 'Esposa: Ana Vilma (7234-9988), Taller de Calzado',
      assignedCollectorId: 'user-collector-1',
      assignedCollectorName: 'Carlos Mendoza',
      registerDate: '2026-03-10',
      notes: 'Crédito diario de $500 para compra de cuero.',
      isArchived: false,
    },
    {
      id: 'cli-003',
      fullName: 'Rosa Cándida Flores Ortiz',
      dui: '01948572-1',
      phone: '+503 7566-3322',
      address: 'Residencial Santa Teresa, Senda 2 #18, Santa Tecla',
      personalReferences: 'Comadre: Julia Morales (7901-4455)',
      assignedCollectorId: 'user-collector-2',
      assignedCollectorName: 'Luis Henríquez',
      registerDate: '2026-02-20',
      notes: 'Negocio de pupusería en Mercado Central.',
      isArchived: false,
    },
    {
      id: 'cli-004',
      fullName: 'Nelson Edgardo Portillo',
      dui: '04561239-0',
      phone: '+503 7844-5511',
      address: 'Calle Principal #89, Apopa',
      personalReferences: 'Primo: Jorge Portillo (7123-0000)',
      assignedCollectorId: 'user-collector-1',
      assignedCollectorName: 'Carlos Mendoza',
      registerDate: '2026-03-15',
      notes: 'Peluquería y barbería.',
      isArchived: false,
    },
    {
      id: 'cli-005',
      fullName: 'Gladys Marisol Cornejo',
      dui: '02874156-5',
      phone: '+503 7622-4411',
      address: 'Av. Roosevelt Sur #102, San Miguel',
      personalReferences: 'Tía: Carmen Cornejo (7888-2233)',
      assignedCollectorId: 'user-collector-2',
      assignedCollectorName: 'Luis Henríquez',
      registerDate: '2026-01-15',
      notes: 'Excelente historial. Crédito ya cancelado al 100%.',
      isArchived: false,
    },
  ];

  // Credit 1: María Elena Rivas - $300 at 20%, 24 daily payments
  const schedule1 = calculateLoanSchedule({
    principal: 300,
    interestRate: 20,
    interestType: 'fijo',
    modality: 'diario',
    totalInstallments: 24,
    firstDueDate: today,
  });

  const credit1: Credit = {
    id: 'cred-1001',
    creditNumber: 'CR-1001',
    clientId: 'cli-001',
    clientName: 'María Elena Rivas de Campos',
    clientDui: '02456781-3',
    clientPhone: '+503 7345-6789',
    clientAddress: 'Col. Escalón, Pasaje 3 #45, San Salvador',
    principal: 300,
    interestRate: 20,
    interestType: 'fijo',
    totalInterest: 60,
    totalAmountToPay: 360,
    modality: 'diario',
    totalInstallments: 24,
    installmentAmount: 15,
    lastInstallmentAmount: 15,
    startDate: today,
    firstDueDate: today,
    finalDueDate: schedule1.finalDueDate,
    status: 'active',
    balancePending: 345,
    totalPaid: 15,
    notes: 'Primer crédito cancelando puntual.',
    assignedCollectorId: 'user-collector-1',
    assignedCollectorName: 'Carlos Mendoza',
    createdAt: '2026-03-01T09:00:00Z',
  };

  // Credit 2: José Mauricio Hernández - $500 at 20%, 25 daily payments, first due today (pending)
  const schedule2 = calculateLoanSchedule({
    principal: 500,
    interestRate: 20,
    interestType: 'fijo',
    modality: 'diario',
    totalInstallments: 25,
    firstDueDate: today,
  });

  const credit2: Credit = {
    id: 'cred-1002',
    creditNumber: 'CR-1002',
    clientId: 'cli-002',
    clientName: 'José Mauricio Hernández Gómez',
    clientDui: '03891244-9',
    clientPhone: '+503 7122-8899',
    clientAddress: 'Barrio El Centro, 4a Av. Sur #12, Soyapango',
    principal: 500,
    interestRate: 20,
    interestType: 'fijo',
    totalInterest: 100,
    totalAmountToPay: 600,
    modality: 'diario',
    totalInstallments: 25,
    installmentAmount: 24,
    lastInstallmentAmount: 24,
    startDate: today,
    firstDueDate: today,
    finalDueDate: schedule2.finalDueDate,
    status: 'active',
    balancePending: 600,
    totalPaid: 0,
    notes: 'Cuota de hoy pendiente de cobrar.',
    assignedCollectorId: 'user-collector-1',
    assignedCollectorName: 'Carlos Mendoza',
    createdAt: '2026-03-10T10:00:00Z',
  };

  // Credit 3: Rosa Cándida Flores - Overdue credit with 4 days overdue
  const schedule3 = calculateLoanSchedule({
    principal: 400,
    interestRate: 20,
    interestType: 'fijo',
    modality: 'diario',
    totalInstallments: 20,
    firstDueDate: '2026-03-25',
  });

  const credit3: Credit = {
    id: 'cred-1003',
    creditNumber: 'CR-1003',
    clientId: 'cli-003',
    clientName: 'Rosa Cándida Flores Ortiz',
    clientDui: '01948572-1',
    clientPhone: '+503 7566-3322',
    clientAddress: 'Residencial Santa Teresa, Senda 2 #18, Santa Tecla',
    principal: 400,
    interestRate: 20,
    interestType: 'fijo',
    totalInterest: 80,
    totalAmountToPay: 480,
    modality: 'diario',
    totalInstallments: 20,
    installmentAmount: 24,
    lastInstallmentAmount: 24,
    startDate: '2026-03-20',
    firstDueDate: '2026-03-25',
    finalDueDate: schedule3.finalDueDate,
    status: 'overdue',
    balancePending: 408,
    totalPaid: 72,
    notes: 'Tiene 2 cuotas en mora por atraso de proveedores.',
    assignedCollectorId: 'user-collector-2',
    assignedCollectorName: 'Luis Henríquez',
    createdAt: '2026-03-20T08:30:00Z',
  };

  // Credit 4: Nelson Edgardo Portillo - $200 weekly
  const schedule4 = calculateLoanSchedule({
    principal: 200,
    interestRate: 15,
    interestType: 'fijo',
    modality: 'semanal',
    totalInstallments: 8,
    firstDueDate: today,
  });

  const credit4: Credit = {
    id: 'cred-1004',
    creditNumber: 'CR-1004',
    clientId: 'cli-004',
    clientName: 'Nelson Edgardo Portillo',
    clientDui: '04561239-0',
    clientPhone: '+503 7844-5511',
    clientAddress: 'Calle Principal #89, Apopa',
    principal: 200,
    interestRate: 15,
    interestType: 'fijo',
    totalInterest: 30,
    totalAmountToPay: 230,
    modality: 'semanal',
    totalInstallments: 8,
    installmentAmount: 28.75,
    lastInstallmentAmount: 28.75,
    startDate: today,
    firstDueDate: today,
    finalDueDate: schedule4.finalDueDate,
    status: 'active',
    balancePending: 220,
    totalPaid: 10,
    notes: 'Abono parcial de $10 realizado hoy.',
    assignedCollectorId: 'user-collector-1',
    assignedCollectorName: 'Carlos Mendoza',
    createdAt: '2026-03-15T11:00:00Z',
  };

  // Credit 5: Gladys Marisol Cornejo - Fully paid (Liquidated)
  const credit5: Credit = {
    id: 'cred-1005',
    creditNumber: 'CR-1005',
    clientId: 'cli-005',
    clientName: 'Gladys Marisol Cornejo',
    clientDui: '02874156-5',
    clientPhone: '+503 7622-4411',
    clientAddress: 'Av. Roosevelt Sur #102, San Miguel',
    principal: 600,
    interestRate: 20,
    interestType: 'fijo',
    totalInterest: 120,
    totalAmountToPay: 720,
    modality: 'quincenal',
    totalInstallments: 6,
    installmentAmount: 120,
    lastInstallmentAmount: 120,
    startDate: '2026-01-15',
    firstDueDate: '2026-01-30',
    finalDueDate: '2026-04-15',
    status: 'liquidated',
    balancePending: 0,
    totalPaid: 720,
    notes: 'Crédito cancelado en su totalidad sin mora.',
    assignedCollectorId: 'user-collector-2',
    assignedCollectorName: 'Luis Henríquez',
    createdAt: '2026-01-15T09:00:00Z',
  };

  const credits = [credit1, credit2, credit3, credit4, credit5];

  // Generate installments
  const installments: Installment[] = [];

  // Credit 1 installments
  schedule1.installments.forEach((inst, idx) => {
    const isFirst = idx === 0;
    installments.push({
      id: `inst-1-${inst.installmentNumber}`,
      creditId: 'cred-1001',
      clientId: 'cli-001',
      installmentNumber: inst.installmentNumber,
      dueDate: inst.dueDate,
      scheduledAmount: inst.scheduledAmount,
      paidAmount: isFirst ? inst.scheduledAmount : 0,
      balance: isFirst ? 0 : inst.scheduledAmount,
      status: isFirst ? 'paid' : 'pending',
      daysOverdue: 0,
      lastPaymentDate: isFirst ? today : undefined,
    });
  });

  // Credit 2 installments (First one due today, unpaid)
  schedule2.installments.forEach((inst) => {
    installments.push({
      id: `inst-2-${inst.installmentNumber}`,
      creditId: 'cred-1002',
      clientId: 'cli-002',
      installmentNumber: inst.installmentNumber,
      dueDate: inst.dueDate,
      scheduledAmount: inst.scheduledAmount,
      paidAmount: 0,
      balance: inst.scheduledAmount,
      status: 'pending',
      daysOverdue: 0,
    });
  });

  // Credit 3 installments (Overdue: installments 4 and 5)
  schedule3.installments.forEach((inst, idx) => {
    if (idx < 3) {
      installments.push({
        id: `inst-3-${inst.installmentNumber}`,
        creditId: 'cred-1003',
        clientId: 'cli-003',
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        scheduledAmount: inst.scheduledAmount,
        paidAmount: inst.scheduledAmount,
        balance: 0,
        status: 'paid',
        daysOverdue: 0,
        lastPaymentDate: inst.dueDate,
      });
    } else if (idx === 3) {
      // Overdue installment
      installments.push({
        id: `inst-3-${inst.installmentNumber}`,
        creditId: 'cred-1003',
        clientId: 'cli-003',
        installmentNumber: inst.installmentNumber,
        dueDate: '2026-04-05',
        scheduledAmount: 24,
        paidAmount: 0,
        balance: 24,
        status: 'overdue',
        daysOverdue: 10,
      });
    } else if (idx === 4) {
      // Another overdue installment
      installments.push({
        id: `inst-3-${inst.installmentNumber}`,
        creditId: 'cred-1003',
        clientId: 'cli-003',
        installmentNumber: inst.installmentNumber,
        dueDate: '2026-04-06',
        scheduledAmount: 24,
        paidAmount: 0,
        balance: 24,
        status: 'overdue',
        daysOverdue: 9,
      });
    } else {
      installments.push({
        id: `inst-3-${inst.installmentNumber}`,
        creditId: 'cred-1003',
        clientId: 'cli-003',
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        scheduledAmount: inst.scheduledAmount,
        paidAmount: 0,
        balance: inst.scheduledAmount,
        status: 'pending',
        daysOverdue: 0,
      });
    }
  });

  // Credit 4 installments (Abono parcial on first installment)
  schedule4.installments.forEach((inst, idx) => {
    if (idx === 0) {
      installments.push({
        id: `inst-4-${inst.installmentNumber}`,
        creditId: 'cred-1004',
        clientId: 'cli-004',
        installmentNumber: inst.installmentNumber,
        dueDate: today,
        scheduledAmount: inst.scheduledAmount,
        paidAmount: 10,
        balance: inst.scheduledAmount - 10,
        status: 'partial',
        daysOverdue: 0,
        lastPaymentDate: today,
      });
    } else {
      installments.push({
        id: `inst-4-${inst.installmentNumber}`,
        creditId: 'cred-1004',
        clientId: 'cli-004',
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        scheduledAmount: inst.scheduledAmount,
        paidAmount: 0,
        balance: inst.scheduledAmount,
        status: 'pending',
        daysOverdue: 0,
      });
    }
  });

  // Credit 5 (All 6 installments paid)
  for (let i = 1; i <= 6; i++) {
    installments.push({
      id: `inst-5-${i}`,
      creditId: 'cred-1005',
      clientId: 'cli-005',
      installmentNumber: i,
      dueDate: `2026-0${Math.floor(i / 2) + 1}-15`,
      scheduledAmount: 120,
      paidAmount: 120,
      balance: 0,
      status: 'paid',
      daysOverdue: 0,
      lastPaymentDate: `2026-0${Math.floor(i / 2) + 1}-15`,
    });
  }

  // Initial payments
  const payments: Payment[] = [
    {
      id: 'pay-001',
      receiptNumber: 'REC-2026-0001',
      creditId: 'cred-1001',
      clientId: 'cli-001',
      clientName: 'María Elena Rivas de Campos',
      installmentId: 'inst-1-1',
      installmentNumber: 1,
      date: today,
      time: '08:45',
      scheduledAmount: 15,
      receivedAmount: 15,
      installmentRemainingBalance: 0,
      creditRemainingBalance: 345,
      collectorId: 'user-collector-1',
      collectorName: 'Carlos Mendoza',
      paymentMethod: 'Efectivo',
      notes: 'Pago de cuota 1 completa.',
      isReversed: false,
      createdAt: `${today}T08:45:00Z`,
    },
    {
      id: 'pay-002',
      receiptNumber: 'REC-2026-0002',
      creditId: 'cred-1004',
      clientId: 'cli-004',
      clientName: 'Nelson Edgardo Portillo',
      installmentId: 'inst-4-1',
      installmentNumber: 1,
      date: today,
      time: '10:15',
      scheduledAmount: 28.75,
      receivedAmount: 10,
      installmentRemainingBalance: 18.75,
      creditRemainingBalance: 220,
      collectorId: 'user-collector-1',
      collectorName: 'Carlos Mendoza',
      paymentMethod: 'Efectivo',
      notes: 'Abono parcial por falta de sencillo.',
      isReversed: false,
      createdAt: `${today}T10:15:00Z`,
    },
    {
      id: 'pay-003',
      receiptNumber: 'REC-2026-0003',
      creditId: 'cred-1003',
      clientId: 'cli-003',
      clientName: 'Rosa Cándida Flores Ortiz',
      installmentId: 'inst-3-1',
      installmentNumber: 1,
      date: '2026-03-25',
      time: '11:30',
      scheduledAmount: 24,
      receivedAmount: 24,
      installmentRemainingBalance: 0,
      creditRemainingBalance: 456,
      collectorId: 'user-collector-2',
      collectorName: 'Luis Henríquez',
      paymentMethod: 'Transferencia',
      notes: 'Pago cuota 1 vía transferencia Banco Agrícola.',
      isReversed: false,
      createdAt: '2026-03-25T11:30:00Z',
    },
  ];

  // Reversion request (for testing collector requesting error reversal & admin approving/rejecting)
  const reversionRequests: ReversionRequest[] = [
    {
      id: 'rev-req-001',
      paymentId: 'pay-002',
      receiptNumber: 'REC-2026-0002',
      clientId: 'cli-004',
      clientName: 'Nelson Edgardo Portillo',
      creditId: 'cred-1004',
      amount: 10,
      paymentDate: today,
      requestedById: 'user-collector-1',
      requestedByName: 'Carlos Mendoza',
      reason: 'El cliente entregó billete falso que fue detectado inmediatamente. Se solicita revertir el abono de $10 para que vuelva a figurar el saldo completo.',
      requestedAt: `${today}T10:30:00Z`,
      status: 'pending',
    },
  ];

  // Initial audit logs
  const auditLogs: AuditLog[] = [
    {
      id: 'audit-001',
      timestamp: `${today}T08:00:00Z`,
      userId: 'user-admin-1',
      userName: 'Aarón Pérez (Admin General)',
      userRole: 'admin',
      action: 'INICIO_SESION',
      targetType: 'auth',
      targetId: 'user-admin-1',
      details: 'Inicio de sesión exitoso del administrador principal.',
    },
    {
      id: 'audit-002',
      timestamp: `${today}T08:45:00Z`,
      userId: 'user-collector-1',
      userName: 'Carlos Mendoza',
      userRole: 'collector',
      action: 'REGISTRO_PAGO',
      targetType: 'payment',
      targetId: 'pay-001',
      details: 'Registro de pago cuota 1 de $15.00 para María Elena Rivas (Recibo REC-2026-0001).',
    },
    {
      id: 'audit-003',
      timestamp: `${today}T10:15:00Z`,
      userId: 'user-collector-1',
      userName: 'Carlos Mendoza',
      userRole: 'collector',
      action: 'REGISTRO_ABONO',
      targetType: 'payment',
      targetId: 'pay-002',
      details: 'Registro de abono parcial de $10.00 para Nelson Edgardo Portillo (Recibo REC-2026-0002).',
    },
    {
      id: 'audit-004',
      timestamp: `${today}T10:30:00Z`,
      userId: 'user-collector-1',
      userName: 'Carlos Mendoza',
      userRole: 'collector',
      action: 'SOLICITUD_REVERSION',
      targetType: 'reversion',
      targetId: 'rev-req-001',
      details: 'Solicitud de reversión para recibo REC-2026-0002 ($10.00). Motivo: Billete falso detectado.',
      reason: 'El cliente entregó billete falso que fue detectado inmediatamente.',
    },
  ];

  return {
    clients,
    credits,
    installments,
    payments,
    reversionRequests,
    auditLogs,
  };
}
