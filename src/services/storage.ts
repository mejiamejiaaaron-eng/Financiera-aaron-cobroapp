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
  AssignmentLog,
} from '../types';
import { getElSalvadorDate, getElSalvadorTimeString } from '../utils/dateUtils';
import { LoanCalculator, calculateLoanSchedule, refreshInstallmentStatus } from '../utils/financialCalculations';
import {
  ADMIN_PERMISSIONS,
  COLLECTOR_PERMISSIONS,
  generateInitialData,
  INITIAL_SETTINGS,
  INITIAL_USERS,
} from './seedData';

const STORAGE_KEYS = {
  USERS: 'cobrosapp_users',
  SETTINGS: 'cobrosapp_settings',
  CLIENTS: 'cobrosapp_clients',
  CREDITS: 'cobrosapp_credits',
  INSTALLMENTS: 'cobrosapp_installments',
  PAYMENTS: 'cobrosapp_payments',
  REVERSIONS: 'cobrosapp_reversions',
  AUDIT: 'cobrosapp_audit',
  ASSIGNMENTS: 'cobrosapp_assignments',
  INITIALIZED: 'cobrosapp_initialized_v2',
};

export interface AppDatabase {
  users: User[];
  settings: AppSettings;
  clients: Client[];
  credits: Credit[];
  installments: Installment[];
  payments: Payment[];
  reversionRequests: ReversionRequest[];
  auditLogs: AuditLog[];
  assignmentLogs?: AssignmentLog[];
}

export function loadDatabase(): AppDatabase {
  try {
    const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInit) {
      const initial = generateInitialData();
      saveDatabase({
        users: INITIAL_USERS,
        settings: INITIAL_SETTINGS,
        ...initial,
      });
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      return {
        users: INITIAL_USERS,
        settings: INITIAL_SETTINGS,
        ...initial,
      };
    }

    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]') as User[];
    const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || JSON.stringify(INITIAL_SETTINGS)) as AppSettings;
    const clients = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS) || '[]') as Client[];
    const credits = JSON.parse(localStorage.getItem(STORAGE_KEYS.CREDITS) || '[]') as Credit[];
    const installments = JSON.parse(localStorage.getItem(STORAGE_KEYS.INSTALLMENTS) || '[]') as Installment[];
    const payments = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS) || '[]') as Payment[];
    const reversionRequests = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVERSIONS) || '[]') as ReversionRequest[];
    const auditLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT) || '[]') as AuditLog[];
    const assignmentLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS) || '[]') as AssignmentLog[];

    // Ensure main admin always exists
    const hasAdmin = users.some(u => u.email === 'am0360136@gmail.com');
    if (!hasAdmin) {
      users.unshift(INITIAL_USERS[0]);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    // SECTION 1.3 & 6: Automatic 7-Day Trash Purge Processing
    const nowTime = Date.now();
    let autoPurgedCount = 0;
    const activeAndPurgedClients: Client[] = [];

    for (const client of clients) {
      if (client.inTrash && client.purgeAt && new Date(client.purgeAt).getTime() <= nowTime) {
        // Has expired past 7 days!
        const hasFinances = credits.some(c => c.clientId === client.id) || payments.some(p => p.clientId === client.id);
        if (hasFinances) {
          // SECTION 1.5: Protect financial ledger! Safe archive permanently without destroying debts or receipts
          autoPurgedCount++;
          activeAndPurgedClients.push({
            ...client,
            inTrash: false,
            isArchived: true,
            status: 'archived',
            deletionStatus: 'archived_financial_safety',
            notes: (client.notes || '') + ' [Purga automática: Archivado definitivo por seguridad financiera tras 7 días]',
            updatedAt: new Date().toISOString(),
          });
        } else {
          // Zero finances: permanently purge from records
          autoPurgedCount++;
        }
      } else {
        activeAndPurgedClients.push(client);
      }
    }

    if (autoPurgedCount > 0) {
      auditLogs.unshift({
        id: `audit-${Date.now()}-autopurge`,
        timestamp: new Date().toISOString(),
        userId: 'system-scheduler',
        userName: 'Proceso Automático (Cloud Scheduler)',
        userRole: 'admin',
        action: 'PURGA_AUTOMATICA_PAPELERA_7_DIAS',
        targetType: 'trash',
        targetId: 'trash-scheduler',
        details: `Se procesó la eliminación automática de ${autoPurgedCount} cliente(s) tras cumplir el plazo de 7 días en la papelera, preservando los registros contables y recibos de pago.`,
      });
      // Save changes immediately
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(activeAndPurgedClients));
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
    }

    // Refresh installment overdue statuses against current date
    const today = getElSalvadorDate();
    const updatedInstallments = installments.map(inst => refreshInstallmentStatus(inst, today));

    // Ensure all credits have strict installmentAmount and consistent totals (SSOT)
    const verifiedCredits = credits.map(cred => {
      let installmentAmount = cred.installmentAmount;
      const creditInsts = installments.filter(i => i.creditId === cred.id);
      if ((!installmentAmount || installmentAmount <= 0) && creditInsts.length > 0) {
        installmentAmount = creditInsts[0].scheduledAmount;
      }
      return {
        ...cred,
        installmentAmount: installmentAmount || (cred.totalInstallments > 0 ? Math.round((cred.totalAmountToPay / cred.totalInstallments) * 100) / 100 : 0),
      };
    });

    return {
      users: users.length ? users : INITIAL_USERS,
      settings,
      clients: activeAndPurgedClients,
      credits: verifiedCredits,
      installments: updatedInstallments,
      payments,
      reversionRequests,
      auditLogs,
      assignmentLogs,
    };
  } catch (err) {
    console.error('Error loading database, regenerating fallback', err);
    const initial = generateInitialData();
    return {
      users: INITIAL_USERS,
      settings: INITIAL_SETTINGS,
      ...initial,
    };
  }
}

export function saveDatabase(db: AppDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(db.users));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(db.settings));
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(db.clients));
    localStorage.setItem(STORAGE_KEYS.CREDITS, JSON.stringify(db.credits));
    localStorage.setItem(STORAGE_KEYS.INSTALLMENTS, JSON.stringify(db.installments));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(db.payments));
    localStorage.setItem(STORAGE_KEYS.REVERSIONS, JSON.stringify(db.reversionRequests));
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(db.auditLogs));
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(db.assignmentLogs || []));

    // Real-time broadcast for multi-device / multi-tab synchronization
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cobrosapp_database_updated'));
      try {
        const bc = new BroadcastChannel('cobrosapp_realtime_sync');
        bc.postMessage({ type: 'DB_SYNC', timestamp: Date.now() });
        bc.close();
      } catch {
        // Fallback handled by storage events
      }
    }
  } catch (err) {
    console.error('Failed to save database to localStorage', err);
  }
}

/**
 * Atomic Payment Recording Engine
 */
export function recordPaymentTransaction(
  db: AppDatabase,
  params: {
    creditId: string;
    installmentId: string;
    receivedAmount: number;
    paymentMethod: PaymentMethod;
    notes: string;
    currentUser: User;
    customDate?: string;
    customTime?: string;
  }
): { db: AppDatabase; payment: Payment } {
  const { creditId, installmentId, receivedAmount, paymentMethod, notes, currentUser, customDate, customTime } = params;

  if (receivedAmount <= 0) {
    throw new Error('El importe recibido debe ser mayor a 0');
  }

  const credit = db.credits.find(c => c.id === creditId);
  if (!credit) throw new Error('Crédito no encontrado');

  // Section 1.5: Verify client is not in trash
  const client = db.clients.find(c => c.id === credit.clientId);
  if (client && client.inTrash) {
    throw new Error('Operación bloqueada: Este cliente se encuentra en la papelera. No se admiten nuevos cobros hasta su restauración.');
  }

  const installmentIndex = db.installments.findIndex(i => i.id === installmentId);
  if (installmentIndex === -1) throw new Error('Cuota no encontrada');


  // Validate amount does not exceed total pending balance of the credit
  if (receivedAmount > credit.balancePending + 0.05) {
    throw new Error(`El importe ($${receivedAmount.toFixed(2)}) no puede exceder el saldo total pendiente del crédito ($${credit.balancePending.toFixed(2)})`);
  }

  const today = getElSalvadorDate();
  const time = getElSalvadorTimeString();
  const isAdminUser = currentUser.role === 'admin';
  const finalPaymentDate = (isAdminUser && customDate && customDate.trim()) ? customDate.trim() : today;
  const finalPaymentTime = (isAdminUser && customTime && customTime.trim()) ? customTime.trim() : time;

  // Find all installments of this credit ordered by installment number
  const newInstallments = db.installments.map(i => ({ ...i }));
  const targetCreditInstallments = newInstallments
    .filter(i => i.creditId === creditId)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  const selectedInst = targetCreditInstallments.find(i => i.id === installmentId);
  if (!selectedInst) throw new Error('Cuota no encontrada en el crédito');

  // Queue of installments to apply money:
  // 1. First, the selected installment
  // 2. Next, subsequent unpaid installments (#(n+1), #(n+2), ...)
  // 3. Then, any earlier unpaid installments if any (#1, #2, ...)
  const subsequentUnpaid = targetCreditInstallments.filter(
    i => i.installmentNumber > selectedInst.installmentNumber && i.balance > 0.001
  );
  const earlierUnpaid = targetCreditInstallments.filter(
    i => i.installmentNumber < selectedInst.installmentNumber && i.balance > 0.001
  );

  const applyQueue = [selectedInst, ...subsequentUnpaid, ...earlierUnpaid];

  let remainingMoney = Math.round(receivedAmount * 100) / 100;
  const appliedBreakdown: { installmentId: string; installmentNumber: number; amount: number }[] = [];

  for (const instToPay of applyQueue) {
    if (remainingMoney <= 0.001) break;

    const needed = instToPay.balance;
    const canPay = Math.min(remainingMoney, needed);
    const amountToApply = Math.round(canPay * 100) / 100;

    if (amountToApply > 0) {
      const newPaid = Math.round((instToPay.paidAmount + amountToApply) * 100) / 100;
      const newBal = Math.max(0, Math.round((instToPay.scheduledAmount - newPaid) * 100) / 100);

      instToPay.paidAmount = newPaid;
      instToPay.balance = newBal;
      instToPay.status = newBal <= 0.001 ? 'paid' : 'partial';
      instToPay.lastPaymentDate = finalPaymentDate;
      if (instToPay.status === 'paid') {
        instToPay.daysOverdue = 0;
      }

      appliedBreakdown.push({
        installmentId: instToPay.id,
        installmentNumber: instToPay.installmentNumber,
        amount: amountToApply,
      });

      remainingMoney = Math.round((remainingMoney - amountToApply) * 100) / 100;
    }
  }

  // Absorb any tiny leftover penny rounding into the last affected installment
  if (remainingMoney > 0.001 && appliedBreakdown.length > 0) {
    const lastItem = appliedBreakdown[appliedBreakdown.length - 1];
    const inst = targetCreditInstallments.find(i => i.id === lastItem.installmentId);
    if (inst) {
      inst.paidAmount = Math.round((inst.paidAmount + remainingMoney) * 100) / 100;
      inst.balance = Math.max(0, Math.round((inst.balance - remainingMoney) * 100) / 100);
      lastItem.amount = Math.round((lastItem.amount + remainingMoney) * 100) / 100;
    }
  }

  // Update credit
  const creditIndex = db.credits.findIndex(c => c.id === creditId);
  const updatedCredit = { ...db.credits[creditIndex] };
  updatedCredit.totalPaid = Math.round((updatedCredit.totalPaid + receivedAmount) * 100) / 100;
  updatedCredit.balancePending = Math.max(0, Math.round((updatedCredit.totalAmountToPay - updatedCredit.totalPaid) * 100) / 100);

  if (updatedCredit.balancePending <= 0.001) {
    updatedCredit.status = 'liquidated';
  }

  // Generate Receipt Number
  const nextSeq = db.payments.length + 1;
  const year = new Date().getFullYear();
  const receiptNumber = `REC-${year}-${String(nextSeq).padStart(4, '0')}`;

  const payment: Payment = {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    receiptNumber,
    creditId,
    clientId: credit.clientId,
    clientName: credit.clientName,
    installmentId: selectedInst.id,
    installmentNumber: selectedInst.installmentNumber,
    date: finalPaymentDate,
    time: finalPaymentTime,
    scheduledAmount: selectedInst.scheduledAmount,
    receivedAmount,
    installmentRemainingBalance: selectedInst.balance,
    creditRemainingBalance: updatedCredit.balancePending,
    collectorId: currentUser.id,
    collectorName: currentUser.name,
    paymentMethod,
    notes,
    isReversed: false,
    createdAt: new Date().toISOString(),
    appliedBreakdown,
  };

  // Create Audit Log with multi-installment details if surplus occurred
  const coveredCount = appliedBreakdown.length;
  const breakdownDesc = coveredCount > 1
    ? ` Pago superior a la cuota cubriendo ${coveredCount} cuotas (${appliedBreakdown.map(b => `#${b.installmentNumber}: $${b.amount.toFixed(2)}`).join(', ')}).`
    : '';

  const customTimeDesc = (isAdminUser && (customDate || customTime))
    ? ` [Fecha y Hora personalizadas por Admin: ${finalPaymentDate} a las ${finalPaymentTime}]`
    : '';

  const audit: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toISOString(),
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: selectedInst.balance <= 0.001 ? 'REGISTRO_PAGO_COMPLETO' : 'REGISTRO_ABONO_PARCIAL',
    targetType: 'payment',
    targetId: payment.id,
    details: `${payment.collectorName} registró $${payment.receivedAmount.toFixed(2)} (${payment.paymentMethod}) para cuota #${selectedInst.installmentNumber} de ${credit.clientName}.${breakdownDesc}${customTimeDesc} Recibo: ${receiptNumber}. Saldo pendiente crédito: $${updatedCredit.balancePending.toFixed(2)}.`,
  };

  const newCredits = [...db.credits];
  newCredits[creditIndex] = updatedCredit;

  const updatedDb: AppDatabase = {
    ...db,
    credits: newCredits,
    installments: newInstallments,
    payments: [payment, ...db.payments],
    auditLogs: [audit, ...db.auditLogs],
  };

  saveDatabase(updatedDb);
  return { db: updatedDb, payment };
}

/**
 * Modificar datos de un recibo emitido (Número, Fecha, Hora, Forma de Pago, Cobrador, Observaciones)
 */
export function updatePaymentReceipt(
  db: AppDatabase,
  params: {
    paymentId: string;
    receiptNumber?: string;
    date?: string;
    time?: string;
    paymentMethod?: PaymentMethod;
    notes?: string;
    collectorName?: string;
    currentUser: User;
  }
): { db: AppDatabase; payment: Payment } {
  const { paymentId, receiptNumber, date, time, paymentMethod, notes, collectorName, currentUser } = params;

  const paymentIndex = db.payments.findIndex(p => p.id === paymentId);
  if (paymentIndex === -1) {
    throw new Error('Recibo de pago no encontrado.');
  }

  const existingPayment = db.payments[paymentIndex];

  const updatedPayment: Payment = {
    ...existingPayment,
    receiptNumber: (receiptNumber && receiptNumber.trim()) ? receiptNumber.trim() : existingPayment.receiptNumber,
    date: (date && date.trim()) ? date.trim() : existingPayment.date,
    time: (time && time.trim()) ? time.trim() : existingPayment.time,
    paymentMethod: paymentMethod || existingPayment.paymentMethod,
    notes: notes !== undefined ? notes : existingPayment.notes,
    collectorName: (collectorName && collectorName.trim()) ? collectorName.trim() : existingPayment.collectorName,
  };

  const changes: string[] = [];
  if (receiptNumber && receiptNumber !== existingPayment.receiptNumber) changes.push(`N° Recibo: ${existingPayment.receiptNumber} → ${updatedPayment.receiptNumber}`);
  if (date && date !== existingPayment.date) changes.push(`Fecha: ${existingPayment.date} → ${updatedPayment.date}`);
  if (time && time !== existingPayment.time) changes.push(`Hora: ${existingPayment.time} → ${updatedPayment.time}`);
  if (paymentMethod && paymentMethod !== existingPayment.paymentMethod) changes.push(`Método: ${existingPayment.paymentMethod} → ${updatedPayment.paymentMethod}`);
  if (notes !== undefined && notes !== existingPayment.notes) changes.push(`Notas: "${existingPayment.notes || ''}" → "${updatedPayment.notes}"`);
  if (collectorName && collectorName !== existingPayment.collectorName) changes.push(`Cobrador: ${existingPayment.collectorName} → ${updatedPayment.collectorName}`);

  const audit: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toISOString(),
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'MODIFICACION_RECIBO',
    targetType: 'payment',
    targetId: updatedPayment.id,
    details: `${currentUser.name} modificó el comprobante ${updatedPayment.receiptNumber} (${updatedPayment.clientName}): ${changes.join(', ') || 'Actualización de datos generales del recibo'}.`,
  };

  const updatedPayments = [...db.payments];
  updatedPayments[paymentIndex] = updatedPayment;

  const updatedDb: AppDatabase = {
    ...db,
    payments: updatedPayments,
    auditLogs: [audit, ...db.auditLogs],
  };

  saveDatabase(updatedDb);
  return { db: updatedDb, payment: updatedPayment };
}

/**
 * Reversion Request Creation
 */
export function requestPaymentReversion(
  db: AppDatabase,
  params: {
    paymentId: string;
    reason: string;
    currentUser: User;
  }
): AppDatabase {
  const { paymentId, reason, currentUser } = params;
  if (!reason || reason.trim().length < 5) {
    throw new Error('Debe proporcionar un motivo detallado (mínimo 5 caracteres).');
  }

  const payment = db.payments.find(p => p.id === paymentId);
  if (!payment) throw new Error('Pago no encontrado');
  if (payment.isReversed) throw new Error('Este pago ya ha sido revertido previamente.');

  const existingRequest = db.reversionRequests.find(r => r.paymentId === paymentId && r.status === 'pending');
  if (existingRequest) throw new Error('Ya existe una solicitud pendiente de aprobación para este recibo.');

  const newRequest: ReversionRequest = {
    id: `rev-req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    paymentId,
    receiptNumber: payment.receiptNumber,
    clientId: payment.clientId,
    clientName: payment.clientName,
    creditId: payment.creditId,
    amount: payment.receivedAmount,
    paymentDate: payment.date,
    requestedById: currentUser.id,
    requestedByName: currentUser.name,
    reason: reason.trim(),
    requestedAt: new Date().toISOString(),
    status: 'pending',
  };

  const audit: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toISOString(),
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'SOLICITUD_REVERSION',
    targetType: 'reversion',
    targetId: newRequest.id,
    details: `${currentUser.name} solicitó revertir recibo ${payment.receiptNumber} por $${payment.receivedAmount.toFixed(2)}.`,
    reason: reason.trim(),
  };

  const updatedDb: AppDatabase = {
    ...db,
    reversionRequests: [newRequest, ...db.reversionRequests],
    auditLogs: [audit, ...db.auditLogs],
  };

  saveDatabase(updatedDb);
  return updatedDb;
}

/**
 * Reversion Approval (Admin Only): Atomic balance reversal & ledger update
 */
export function approvePaymentReversion(
  db: AppDatabase,
  params: {
    requestId: string;
    adminNotes: string;
    currentUser: User;
  }
): AppDatabase {
  const { requestId, adminNotes, currentUser } = params;

  if (currentUser.role !== 'admin' && !currentUser.permissions.canApproveReversion) {
    throw new Error('No tiene permisos para aprobar reversiones de pago.');
  }

  const reqIndex = db.reversionRequests.findIndex(r => r.id === requestId);
  if (reqIndex === -1) throw new Error('Solicitud no encontrada');
  const request = { ...db.reversionRequests[reqIndex] };

  if (request.status !== 'pending') {
    throw new Error('Esta solicitud ya fue procesada anteriormente.');
  }

  const paymentIndex = db.payments.findIndex(p => p.id === request.paymentId);
  if (paymentIndex === -1) throw new Error('Pago original no encontrado');
  const payment = { ...db.payments[paymentIndex] };

  if (payment.isReversed) {
    throw new Error('El pago original ya fue revertido con anterioridad.');
  }

  // Update request
  request.status = 'approved';
  request.reviewedById = currentUser.id;
  request.reviewedByName = currentUser.name;
  request.adminNotes = adminNotes || 'Reversión aprobada y ejecutada por el Administrador.';
  request.reviewedAt = new Date().toISOString();

  // Mark payment as reversed
  payment.isReversed = true;
  payment.reversionId = request.id;

  // Restore installment balances
  const newInstallments = [...db.installments];
  const today = getElSalvadorDate();

  if (payment.appliedBreakdown && payment.appliedBreakdown.length > 0) {
    for (const item of payment.appliedBreakdown) {
      const idx = newInstallments.findIndex(i => i.id === item.installmentId);
      if (idx !== -1) {
        const inst = { ...newInstallments[idx] };
        const restoredPaid = Math.max(0, Math.round((inst.paidAmount - item.amount) * 100) / 100);
        const restoredBalance = Math.round((inst.scheduledAmount - restoredPaid) * 100) / 100;
        inst.paidAmount = restoredPaid;
        inst.balance = restoredBalance;
        newInstallments[idx] = refreshInstallmentStatus(inst, today);
      }
    }
  } else {
    const instIndex = db.installments.findIndex(i => i.id === payment.installmentId);
    if (instIndex !== -1) {
      const inst = { ...db.installments[instIndex] };
      const restoredPaid = Math.max(0, Math.round((inst.paidAmount - payment.receivedAmount) * 100) / 100);
      const restoredBalance = Math.round((inst.scheduledAmount - restoredPaid) * 100) / 100;
      
      inst.paidAmount = restoredPaid;
      inst.balance = restoredBalance;

      newInstallments[instIndex] = refreshInstallmentStatus(inst, today);
    }
  }

  // Restore credit balances
  const credIndex = db.credits.findIndex(c => c.id === payment.creditId);
  const newCredits = [...db.credits];

  if (credIndex !== -1) {
    const cred = { ...db.credits[credIndex] };
    cred.totalPaid = Math.max(0, Math.round((cred.totalPaid - payment.receivedAmount) * 100) / 100);
    cred.balancePending = Math.round((cred.totalAmountToPay - cred.totalPaid) * 100) / 100;
    if (cred.status === 'liquidated' && cred.balancePending > 0) {
      cred.status = 'active';
    }
    newCredits[credIndex] = cred;
  }

  const audit: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toISOString(),
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'REVERSION_APROBADA',
    targetType: 'reversion',
    targetId: request.id,
    details: `${currentUser.name} APROBÓ la reversión del recibo ${payment.receiptNumber} por $${payment.receivedAmount.toFixed(2)} para ${payment.clientName}. Se restableció el saldo deudor.`,
    reason: request.reason + (adminNotes ? ` | Nota Admin: ${adminNotes}` : ''),
  };

  const newRequests = [...db.reversionRequests];
  newRequests[reqIndex] = request;

  const newPayments = [...db.payments];
  newPayments[paymentIndex] = payment;

  const updatedDb: AppDatabase = {
    ...db,
    credits: newCredits,
    installments: newInstallments,
    payments: newPayments,
    reversionRequests: newRequests,
    auditLogs: [audit, ...db.auditLogs],
  };

  saveDatabase(updatedDb);
  return updatedDb;
}

/**
 * Reversion Rejection
 */
export function rejectPaymentReversion(
  db: AppDatabase,
  params: {
    requestId: string;
    adminNotes: string;
    currentUser: User;
  }
): AppDatabase {
  const { requestId, adminNotes, currentUser } = params;

  if (currentUser.role !== 'admin' && !currentUser.permissions.canApproveReversion) {
    throw new Error('No tiene permisos para rechazar reversiones de pago.');
  }

  if (!adminNotes || adminNotes.trim().length < 4) {
    throw new Error('Debe escribir un motivo o nota administrativa obligatoria al rechazar la solicitud.');
  }

  const reqIndex = db.reversionRequests.findIndex(r => r.id === requestId);
  if (reqIndex === -1) throw new Error('Solicitud no encontrada');
  const request = { ...db.reversionRequests[reqIndex] };

  request.status = 'rejected';
  request.reviewedById = currentUser.id;
  request.reviewedByName = currentUser.name;
  request.adminNotes = adminNotes.trim();
  request.reviewedAt = new Date().toISOString();

  const audit: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toISOString(),
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'REVERSION_RECHAZADA',
    targetType: 'reversion',
    targetId: request.id,
    details: `${currentUser.name} RECHAZÓ la solicitud de reversión para recibo ${request.receiptNumber}. Motivo: ${adminNotes.trim()}`,
    reason: adminNotes.trim(),
  };

  const newRequests = [...db.reversionRequests];
  newRequests[reqIndex] = request;

  const updatedDb: AppDatabase = {
    ...db,
    reversionRequests: newRequests,
    auditLogs: [audit, ...db.auditLogs],
  };

  saveDatabase(updatedDb);
  return updatedDb;
}

/**
 * Archive Client (Soft-Delete with preservation of financial records)
 */
export function archiveClient(
  db: AppDatabase,
  params: {
    clientId: string;
    reason: string;
    confirmName: string;
    currentUser: User;
  }
): AppDatabase {
  const { clientId, reason, confirmName, currentUser } = params;

  if (currentUser.role !== 'admin' && !currentUser.permissions.canArchiveClients) {
    throw new Error('No tiene autorización para archivar clientes.');
  }

  const client = db.clients.find(c => c.id === clientId);
  if (!client) throw new Error('Cliente no encontrado');

  if (confirmName.trim().toLowerCase() !== client.fullName.trim().toLowerCase()) {
    throw new Error(`El nombre de confirmación no coincide con "${client.fullName}".`);
  }

  if (!reason || reason.trim().length < 5) {
    throw new Error('Debe indicar un motivo válido para archivar el cliente.');
  }

  // Check if client has active pending debt
  const clientCredits = db.credits.filter(c => c.clientId === clientId);
  const pendingDebt = clientCredits.reduce((acc, c) => acc + c.balancePending, 0);

  const updatedClient: Client = {
    ...client,
    isArchived: true,
    archivedReason: reason.trim(),
    archivedAt: new Date().toISOString(),
    archivedBy: currentUser.name,
  };

  const audit: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toISOString(),
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'CLIENTE_ARCHIVADO',
    targetType: 'client',
    targetId: client.id,
    details: `${currentUser.name} archivó al cliente ${client.fullName}.${pendingDebt > 0 ? ` ADVERTENCIA: Conserva saldo pendiente de $${pendingDebt.toFixed(2)}.` : ''}`,
    reason: reason.trim(),
  };

  const newClients = db.clients.map(c => (c.id === clientId ? updatedClient : c));

  const updatedDb: AppDatabase = {
    ...db,
    clients: newClients,
    auditLogs: [audit, ...db.auditLogs],
  };

  saveDatabase(updatedDb);
  return updatedDb;
}

/**
 * Add Client & Credit in a unified flow
 */
export function addClientAndCredit(
  db: AppDatabase,
  params: {
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
      startDate: string;
      firstDueDate: string;
      notes: string;
    };
    currentUser: User;
  }
): { db: AppDatabase; client: Client; credit: Credit } {
  const { clientData, creditData, currentUser } = params;

  if (currentUser.role !== 'admin' && !currentUser.permissions.canAddClientsAndCredits) {
    throw new Error('No tiene permisos para registrar clientes y créditos.');
  }

  if (!clientData.fullName.trim() || !clientData.phone.trim()) {
    throw new Error('El nombre completo y el teléfono del cliente son obligatorios.');
  }

  if (creditData.principal <= 0 || creditData.totalInstallments <= 0) {
    throw new Error('El capital y el número de cuotas deben ser mayores a 0.');
  }

  const assignedCollector = db.users.find(u => u.id === clientData.assignedCollectorId) || currentUser;

  // Create Client
  const clientId = `cli-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const client: Client = {
    id: clientId,
    fullName: clientData.fullName.trim(),
    dui: clientData.dui.trim(),
    phone: clientData.phone.trim(),
    address: clientData.address.trim(),
    personalReferences: clientData.personalReferences.trim(),
    assignedCollectorId: assignedCollector.id,
    assignedCollectorName: assignedCollector.name,
    registerDate: getElSalvadorDate(),
    notes: clientData.notes.trim(),
    isArchived: false,
  };

  // SSOT: Calculate Credit Schedule via centralized LoanCalculator
  // Preserves exact custom installment (e.g. $30.60) or strict flat rate with penny absorption
  const schedule = LoanCalculator.calculate({
    principal: creditData.principal,
    interestRate: creditData.interestRate,
    interestType: creditData.interestType || 'fijo',
    modality: creditData.modality,
    totalInstallments: creditData.totalInstallments,
    firstDueDate: creditData.firstDueDate,
    customInstallmentAmount: creditData.customInstallmentAmount ?? creditData.installmentAmount,
    totalAmountToPay: creditData.totalAmountToPay,
  });

  const nextCreditNum = db.credits.length + 1001;
  const creditId = `cred-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const credit: Credit = {
    id: creditId,
    creditNumber: `CR-${nextCreditNum}`,
    clientId: client.id,
    clientName: client.fullName,
    clientDui: client.dui,
    clientPhone: client.phone,
    clientAddress: client.address,
    principal: schedule.principal,
    interestRate: schedule.interestRate,
    interestType: creditData.interestType || 'fijo',
    totalInterest: schedule.totalInterest,
    totalAmountToPay: schedule.totalAmountToPay,
    modality: creditData.modality,
    totalInstallments: creditData.totalInstallments,
    installmentAmount: schedule.installmentAmount,
    lastInstallmentAmount: schedule.lastInstallmentAmount,
    startDate: creditData.startDate,
    firstDueDate: creditData.firstDueDate,
    finalDueDate: schedule.finalDueDate,
    status: 'active',
    balancePending: schedule.totalAmountToPay,
    totalPaid: 0,
    notes: creditData.notes.trim(),
    assignedCollectorId: assignedCollector.id,
    assignedCollectorName: assignedCollector.name,
    createdAt: new Date().toISOString(),
  };

  // Generate Installment entities with strict penny absorption in the last installment
  const newInstallments: Installment[] = schedule.installments.map(inst => ({
    id: `inst-${creditId}-${inst.installmentNumber}`,
    creditId: credit.id,
    clientId: client.id,
    installmentNumber: inst.installmentNumber,
    dueDate: inst.dueDate,
    scheduledAmount: inst.scheduledAmount,
    paidAmount: 0,
    balance: inst.scheduledAmount,
    status: 'pending',
    daysOverdue: 0,
    isLastInstallment: inst.isLastInstallment,
  }));

  const audit: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toISOString(),
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'REGISTRO_CLIENTE_CREDITO',
    targetType: 'credit',
    targetId: credit.id,
    details: `${currentUser.name} registró al cliente ${client.fullName} y abrió crédito ${credit.creditNumber} ($${credit.principal.toFixed(2)} a ${credit.totalInstallments} cuotas de $${credit.installmentAmount.toFixed(2)} ${credit.modality}).`,
  };

  const updatedDb: AppDatabase = {
    ...db,
    clients: [client, ...db.clients],
    credits: [credit, ...db.credits],
    installments: [...newInstallments, ...db.installments],
    auditLogs: [audit, ...db.auditLogs],
  };

  saveDatabase(updatedDb);
  return { db: updatedDb, client, credit };
}

/**
 * Save settings & branding (Admin only)
 */
export function updateAppSettings(
  db: AppDatabase,
  settings: Partial<AppSettings>,
  currentUser: User
): AppDatabase {
  if (currentUser.role !== 'admin' && !currentUser.permissions.canChangeBranding) {
    throw new Error('Solo el administrador puede modificar la configuración y el logotipo.');
  }

  const updatedSettings: AppSettings = {
    ...db.settings,
    ...settings,
  };

  const audit: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toISOString(),
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'CONFIGURACION_ACTUALIZADA',
    targetType: 'config',
    targetId: 'settings',
    details: `${currentUser.name} actualizó la configuración de la financiera.`,
  };

  const updatedDb: AppDatabase = {
    ...db,
    settings: updatedSettings,
    auditLogs: [audit, ...db.auditLogs],
  };

  saveDatabase(updatedDb);
  return updatedDb;
}

/**
 * Update user permissions / Create user
 */
export function saveUser(
  db: AppDatabase,
  userData: Partial<User> & { name: string; email: string; role: 'admin' | 'collector' },
  currentUser: User
): AppDatabase {
  if (currentUser.role !== 'admin' && !currentUser.permissions.canManageUsers) {
    throw new Error('Solo el administrador principal puede gestionar usuarios y permisos.');
  }

  let newUsers = [...db.users];
  let action = 'USUARIO_CREADO';
  let userId = userData.id;

  const targetEmail = userData.email.trim().toLowerCase();
  const targetUsername = userData.username?.trim().toLowerCase() || targetEmail.split('@')[0];
  const PASSWORDS_STORAGE_KEY = 'cobrosapp_user_passwords_v2';

  // Check unique email and username
  const emailDuplicate = newUsers.find(u => u.id !== userId && u.email.trim().toLowerCase() === targetEmail);
  if (emailDuplicate) {
    throw new Error(`El correo "${targetEmail}" ya está registrado para otro usuario.`);
  }
  if (targetUsername) {
    const userDuplicate = newUsers.find(u => u.id !== userId && u.username?.trim().toLowerCase() === targetUsername);
    if (userDuplicate) {
      throw new Error(`El nombre de usuario "${targetUsername}" ya está registrado para otro usuario.`);
    }
  }

  if (userData.password) {
    try {
      const passwords = JSON.parse(localStorage.getItem(PASSWORDS_STORAGE_KEY) || '{}');
      passwords[targetEmail] = userData.password;
      localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords));
    } catch {
      // Ignore local storage error
    }
  }

  if (userId) {
    // Edit existing user
    action = userData.password ? 'USUARIO_Y_CLAVE_MODIFICADOS' : 'PERMISOS_MODIFICADOS';
    newUsers = newUsers.map(u => {
      if (u.id === userId) {
        // Prevent demoting primary admin if email matches
        const isMaster = u.email === 'am0360136@gmail.com';
        return {
          ...u,
          ...userData,
          username: targetUsername,
          email: isMaster ? u.email : targetEmail,
          password: userData.password || u.password,
          role: isMaster ? 'admin' : userData.role,
          permissions: isMaster ? ADMIN_PERMISSIONS : (userData.permissions || u.permissions),
        };
      }
      return u;
    });
  } else {
    // Create new user
    userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const defaultPerms = userData.role === 'admin' ? ADMIN_PERMISSIONS : COLLECTOR_PERMISSIONS;
    const newUser: User = {
      id: userId,
      email: targetEmail,
      username: targetUsername,
      name: userData.name.trim(),
      role: userData.role,
      phone: userData.phone || '',
      password: userData.password || '',
      active: true,
      permissions: userData.permissions || defaultPerms,
      createdAt: new Date().toISOString(),
      avatarColor: userData.role === 'admin' ? 'bg-blue-600' : 'bg-emerald-600',
    };
    newUsers.push(newUser);
  }

  const audit: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toISOString(),
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action,
    targetType: 'user',
    targetId: userId,
    details: `${currentUser.name} guardó/modificó usuario "${userData.name}" (${targetEmail}) con rol "${userData.role}"${userData.password ? ' y asignó nueva contraseña' : ''}.`,
  };

  const updatedDb: AppDatabase = {
    ...db,
    users: newUsers,
    auditLogs: [audit, ...db.auditLogs],
  };

  saveDatabase(updatedDb);
  return updatedDb;
}

/**
 * Reset database to demo data
 */
export function resetDatabaseToDemo(currentUser: User): AppDatabase {
  if (currentUser.role !== 'admin') {
    throw new Error('Solo el administrador puede restablecer los datos de prueba.');
  }
  const initial = generateInitialData();
  const db: AppDatabase = {
    users: INITIAL_USERS,
    settings: INITIAL_SETTINGS,
    ...initial,
  };
  saveDatabase(db);
  return db;
}

/**
 * Iniciar sistema en blanco: Limpia todos los clientes, préstamos y pagos de prueba
 * dejando la base de datos limpia para el registro de clientes y créditos reales.
 */
export function clearAllDemoData(db: AppDatabase, currentUser: User): AppDatabase {
  if (currentUser.role !== 'admin') {
    throw new Error('Solo el administrador puede limpiar los datos del sistema.');
  }
  const cleanDb: AppDatabase = {
    users: db.users,
    settings: db.settings,
    clients: [],
    credits: [],
    installments: [],
    payments: [],
    reversionRequests: [],
    assignmentLogs: [],
    auditLogs: [
      {
        id: `audit-${Date.now()}-clean`,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'SISTEMA_INICIADO_EN_BLANCO',
        targetType: 'config',
        targetId: 'system',
        details: `${currentUser.name} limpió los datos de prueba. El sistema financiero ha quedado listo y en blanco para operaciones reales.`,
      },
    ],
  };
  saveDatabase(cleanDb);
  return cleanDb;
}

/**
 * =========================================================================
 * SECTION 1: PAPELERA DE CLIENTES (TRASH) & ELIMINACIÓN AUTOMÁTICA
 * =========================================================================
 */

/**
 * Mueve un cliente a la papelera (exclusivo Administrador).
 * Programa su eliminación definitiva para exactamente 7 días después.
 */
export function moveClientToTrash(
  db: AppDatabase,
  params: {
    clientId: string;
    reason?: string;
    currentUser: User;
  }
): AppDatabase {
  const { clientId, reason, currentUser } = params;

  if (currentUser.role !== 'admin' && !currentUser.permissions.canDeleteClients) {
    throw new Error('Permiso denegado: Solo el administrador puede enviar clientes a la papelera.');
  }

  const client = db.clients.find(c => c.id === clientId);
  if (!client) throw new Error('Cliente no encontrado.');

  const clientCredits = db.credits.filter(c => c.clientId === clientId);
  const now = new Date();
  const deletedAt = now.toISOString();
  // 7 calendar days later
  const purgeDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const purgeAt = purgeDate.toISOString();

  const updatedClient: Client = {
    ...client,
    inTrash: true,
    status: 'in_trash',
    deletedAt,
    purgeAt,
    deletedBy: currentUser.name,
    deletionReason: reason ? reason.trim() : 'Retirado por el administrador',
    deletionStatus: 'in_trash',
    updatedAt: deletedAt,
  };

  const audit: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: deletedAt,
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'CLIENTE_MOVIDO_PAPELERA',
    targetType: 'trash',
    targetId: client.id,
    details: `${currentUser.name} movió a la papelera al cliente "${client.fullName}" (${clientCredits.length} créditos asociados). Eliminación programada para: ${purgeDate.toLocaleDateString('es-SV')}.`,
    reason: reason ? reason.trim() : 'Movido a papelera de reciclaje',
  };

  const newClients = db.clients.map(c => (c.id === clientId ? updatedClient : c));

  const updatedDb: AppDatabase = {
    ...db,
    clients: newClients,
    auditLogs: [audit, ...db.auditLogs],
  };

  saveDatabase(updatedDb);
  return updatedDb;
}

/**
 * Restaura un cliente de la papelera dentro de los 7 días.
 * Cancela la purga programada y restaura visibilidad operativa.
 */
export function restoreClientFromTrash(
  db: AppDatabase,
  params: {
    clientId: string;
    currentUser: User;
  }
): AppDatabase {
  const { clientId, currentUser } = params;

  if (currentUser.role !== 'admin') {
    throw new Error('Permiso denegado: Solo el administrador puede restaurar clientes de la papelera.');
  }

  const client = db.clients.find(c => c.id === clientId);
  if (!client) throw new Error('Cliente no encontrado.');

  const now = new Date().toISOString();

  const restoredClient: Client = {
    ...client,
    inTrash: false,
    status: 'active',
    deletedAt: undefined,
    purgeAt: undefined,
    deletedBy: undefined,
    deletionReason: undefined,
    deletionStatus: undefined,
    restoredAt: now,
    restoredBy: currentUser.name,
    updatedAt: now,
  };

  const audit: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: now,
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'CLIENTE_RESTAURADO',
    targetType: 'trash',
    targetId: client.id,
    details: `${currentUser.name} restauró al cliente "${client.fullName}" de la papelera. Se canceló la eliminación programada y se reactivó su visibilidad operativa.`,
  };

  const newClients = db.clients.map(c => (c.id === clientId ? restoredClient : c));

  const updatedDb: AppDatabase = {
    ...db,
    clients: newClients,
    auditLogs: [audit, ...db.auditLogs],
  };

  saveDatabase(updatedDb);
  return updatedDb;
}

/**
 * Eliminación definitiva o Purga Segura con Protección del Historial Financiero (Sección 1.5 & 6)
 */
export function permanentDeleteOrSafePurgeClient(
  db: AppDatabase,
  params: {
    clientId: string;
    currentUser: User;
  }
): AppDatabase {
  const { clientId, currentUser } = params;

  if (currentUser.role !== 'admin') {
    throw new Error('Permiso denegado: Solo el administrador puede autorizar el borrado definitivo.');
  }

  const client = db.clients.find(c => c.id === clientId);
  if (!client) throw new Error('Cliente no encontrado.');

  // Check financial records: credits, payments, installments
  const hasCredits = db.credits.some(c => c.clientId === clientId);
  const hasPayments = db.payments.some(p => p.clientId === clientId);

  const now = new Date().toISOString();

  if (hasCredits || hasPayments) {
    // APLICAR POLÍTICA DE PROTECCIÓN FINANCIERA OBLIGATORIA (Sección 1.5):
    // Jamás borrar registros contables ni recibos existentes. Se archiva de forma definitiva y segura.
    const safelyPurgedClient: Client = {
      ...client,
      inTrash: false,
      isArchived: true,
      status: 'archived',
      deletionStatus: 'archived_financial_safety',
      notes: (client.notes || '') + ' [Archivado permanentemente por protección legal/contable del historial financiero]',
      updatedAt: now,
    };

    const audit: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: now,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'CLIENTE_ARCHIVADO_SEGURIDAD_FINANCIERA',
      targetType: 'trash',
      targetId: client.id,
      details: `${currentUser.name} procesó la purga definitiva de "${client.fullName}". Por poseer créditos/pagos asociados, se preservó íntegramente el historial contable y se archivó permanentemente sin permitir alteración de deudas.`,
    };

    const newClients = db.clients.map(c => (c.id === clientId ? safelyPurgedClient : c));

    const updatedDb: AppDatabase = {
      ...db,
      clients: newClients,
      auditLogs: [audit, ...db.auditLogs],
    };

    saveDatabase(updatedDb);
    return updatedDb;
  } else {
    // Si el cliente no posee créditos ni transacciones (ingresado puramente por error), se remueve de raíz
    const newClients = db.clients.filter(c => c.id !== clientId);

    const audit: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: now,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'CLIENTE_ELIMINADO_DEFINITIVAMENTE',
      targetType: 'trash',
      targetId: client.id,
      details: `${currentUser.name} eliminó definitivamente el perfil del cliente "${client.fullName}" (sin historial financiero asociado).`,
    };

    const updatedDb: AppDatabase = {
      ...db,
      clients: newClients,
      auditLogs: [audit, ...db.auditLogs],
    };

    saveDatabase(updatedDb);
    return updatedDb;
  }
}

/**
 * =========================================================================
 * SECTION 2: ASIGNACIÓN Y REASIGNACIÓN DE CLIENTES A COBRADORES
 * =========================================================================
 */

export function assignClientsToCollector(
  db: AppDatabase,
  params: {
    collectorId: string;
    clientIds: string[];
    currentUser: User;
    reason?: string;
  }
): AppDatabase {
  const { collectorId, clientIds, currentUser, reason } = params;

  if (currentUser.role !== 'admin' && !currentUser.permissions.canManageUsers) {
    throw new Error('Permiso denegado: Solo el administrador puede asignar clientes a los cobradores.');
  }

  const collector = db.users.find(u => u.id === collectorId);
  if (!collector) throw new Error('Cobrador no encontrado.');

  const now = new Date().toISOString();
  const assignmentLogs: AssignmentLog[] = db.assignmentLogs || [];
  const newAuditLogs: AuditLog[] = [...db.auditLogs];

  const updatedClients = db.clients.map(c => {
    if (clientIds.includes(c.id)) {
      const prevId = c.assignedCollectorId || c.assignedTo || 'Sin asignar';
      const prevName = c.assignedCollectorName || 'Sin asignar';

      // Record assignment event if collector changed
      if (prevId !== collector.id) {
        assignmentLogs.unshift({
          id: `asg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          clientId: c.id,
          clientName: c.fullName,
          previousCollectorId: prevId,
          previousCollectorName: prevName,
          newCollectorId: collector.id,
          newCollectorName: collector.name,
          assignedById: currentUser.id,
          assignedByName: currentUser.name,
          assignedAt: now,
          reason,
        });

        newAuditLogs.unshift({
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          timestamp: now,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'CLIENTE_ASIGNADO',
          targetType: 'assignment',
          targetId: c.id,
          details: `${currentUser.name} asignó al cliente "${c.fullName}" al cobrador ${collector.name} (Anterior: ${prevName}).`,
          reason: reason || 'Asignación administrativa de cartera',
        });
      }

      return {
        ...c,
        assignedCollectorId: collector.id,
        assignedCollectorName: collector.name,
        assignedTo: collector.id,
        assignedAt: now,
        assignedBy: currentUser.name,
        updatedAt: now,
      };
    }
    return c;
  });

  // Actualizar también los créditos activos de esos clientes para mantener concordancia
  // NOTA OBLIGATORIA (Sección 2.2): Los recibos y pagos históricos NUNCA cambian su cobrador original.
  const updatedCredits = db.credits.map(credit => {
    if (clientIds.includes(credit.clientId) && credit.status !== 'liquidated') {
      return {
        ...credit,
        assignedCollectorId: collector.id,
        assignedCollectorName: collector.name,
      };
    }
    return credit;
  });

  const updatedDb: AppDatabase = {
    ...db,
    clients: updatedClients,
    credits: updatedCredits,
    assignmentLogs,
    auditLogs: newAuditLogs,
  };

  saveDatabase(updatedDb);
  return updatedDb;
}

/**
 * Reasignar un cliente individual de un cobrador a otro con confirmación
 */
export function reassignSingleClient(
  db: AppDatabase,
  params: {
    clientId: string;
    newCollectorId: string;
    currentUser: User;
    reason?: string;
  }
): AppDatabase {
  return assignClientsToCollector(db, {
    collectorId: params.newCollectorId,
    clientIds: [params.clientId],
    currentUser: params.currentUser,
    reason: params.reason || 'Reasignación operativa de cartera',
  });
}

