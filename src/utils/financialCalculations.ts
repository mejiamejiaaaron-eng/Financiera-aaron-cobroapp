import { Installment, InterestType, PaymentModality } from '../types';
import { calculateDaysOverdue, getNextDueDate } from './dateUtils';

export interface LoanCalculationResult {
  principal: number;
  interestRate: number;
  totalInterest: number;
  totalAmountToPay: number;
  installmentAmount: number;
  installments: Array<{
    installmentNumber: number;
    dueDate: string;
    scheduledAmount: number;
  }>;
  finalDueDate: string;
}

export function formatCurrency(amount: number, symbol = '$'): string {
  const rounded = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Calculates loan schedule, total interest, installment amounts and dates
 */
export function calculateLoanSchedule(params: {
  principal: number;
  interestRate: number; // e.g. 20 for 20%
  interestType: InterestType;
  modality: PaymentModality;
  totalInstallments: number;
  firstDueDate: string;
}): LoanCalculationResult {
  const { principal, interestRate, modality, totalInstallments, firstDueDate } = params;

  if (principal <= 0 || totalInstallments <= 0) {
    return {
      principal: 0,
      interestRate: 0,
      totalInterest: 0,
      totalAmountToPay: 0,
      installmentAmount: 0,
      installments: [],
      finalDueDate: firstDueDate,
    };
  }

  // Calculate total interest: standard microcredit / flat rate
  // totalInterest = principal * (rate / 100)
  const totalInterest = Math.round(principal * (interestRate / 100) * 100) / 100;
  const totalAmountToPay = Math.round((principal + totalInterest) * 100) / 100;
  
  // Standard installment amount rounded to 2 decimals
  const rawInstallment = totalAmountToPay / totalInstallments;
  const standardInstallment = Math.round(rawInstallment * 100) / 100;

  const installments: Array<{
    installmentNumber: number;
    dueDate: string;
    scheduledAmount: number;
  }> = [];

  let currentDate = firstDueDate;
  let accumulated = 0;

  for (let i = 1; i <= totalInstallments; i++) {
    // In the last installment, adjust by penny difference to ensure exact total match
    let currentAmount = standardInstallment;
    if (i === totalInstallments) {
      currentAmount = Math.round((totalAmountToPay - accumulated) * 100) / 100;
    } else {
      accumulated += currentAmount;
    }

    installments.push({
      installmentNumber: i,
      dueDate: currentDate,
      scheduledAmount: currentAmount,
    });

    if (i < totalInstallments) {
      currentDate = getNextDueDate(currentDate, modality, true);
    }
  }

  return {
    principal,
    interestRate,
    totalInterest,
    totalAmountToPay,
    installmentAmount: standardInstallment,
    installments,
    finalDueDate: installments.length > 0 ? installments[installments.length - 1].dueDate : firstDueDate,
  };
}

/**
 * Recalculates installment statuses and overdue days given reference date
 */
export function refreshInstallmentStatus(installment: Installment, referenceDate: string): Installment {
  const daysOverdue = calculateDaysOverdue(installment.dueDate, referenceDate);
  const isPastDue = daysOverdue > 0;
  
  let status = installment.status;
  if (installment.balance <= 0.001) {
    status = 'paid';
  } else if (installment.paidAmount > 0) {
    status = isPastDue ? 'overdue' : 'partial';
  } else if (isPastDue) {
    status = 'overdue';
  } else {
    status = 'pending';
  }

  return {
    ...installment,
    status,
    daysOverdue: status === 'paid' ? 0 : daysOverdue,
  };
}
